const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const typescript = require("typescript");

const root = path.resolve(__dirname, "..");

function loadTypeScript(file, dependencies = {}) {
  const filename = path.join(root, ...file);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (name) =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  new Function("require", "module", "exports", compiled)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

const apiKey = loadTypeScript(["src", "lib", "apiKey.ts"]);

function makeFixture() {
  const rows = [];
  const session = { user: { id: "user-1" }, valid: true };
  const postQueries = [];
  let nextId = 0;
  let lock = Promise.resolve();
  let lockCount = 0;
  let posts = [];

  const model = {
    async count({ where }) {
      return rows.filter(
        (row) =>
          row.userId === where.userId && row.revokedAt === where.revokedAt,
      ).length;
    },
    async create({ data, select }) {
      assert.deepEqual(select, { id: true });
      assert.deepEqual(Object.keys(data).sort(), [
        "keyHash",
        "name",
        "prefix",
        "userId",
      ]);
      const row = {
        id: `key-${++nextId}`,
        ...data,
        createdAt: new Date(Date.now() + nextId),
        lastUsedAt: null,
        revokedAt: null,
      };
      rows.push(row);
      return { id: row.id };
    },
    async findMany({ where, select, orderBy }) {
      assert.deepEqual(orderBy, { createdAt: "desc" });
      return rows
        .filter((row) => row.userId === where.userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((row) =>
          Object.fromEntries(
            Object.entries(select)
              .filter(([, included]) => included)
              .map(([field]) => [field, row[field]]),
          ),
        );
    },
    async findUnique({ where, select }) {
      assert.equal(select.keyHash, undefined);
      const row = rows.find((item) => item.keyHash === where.keyHash);
      return row
        ? { id: row.id, revokedAt: row.revokedAt, user: { id: row.userId } }
        : null;
    },
    async updateMany({ where, data }) {
      const matches = rows.filter((row) =>
        Object.entries(where).every(([field, value]) => row[field] === value),
      );
      for (const row of matches) Object.assign(row, data);
      return { count: matches.length };
    },
  };

  const prisma = {
    apiKey: model,
    post: {
      async findMany(query) {
        postQueries.push(query);
        const start = query.cursor
          ? posts.findIndex((post) => post.id === query.cursor.id)
          : 0;
        return start < 0 ? [] : posts.slice(start, start + query.take);
      },
    },
    async $transaction(callback) {
      let release;
      const tx = {
        apiKey: model,
        session: {
          async findUnique({ where }) {
            if (!session.valid || where.id !== `session-${session.user.id}`) {
              return null;
            }
            return {
              userId: session.user.id,
              expiresAt: new Date(Date.now() + 60_000),
            };
          },
        },
        async $queryRaw(_strings, userId) {
          assert.equal(userId, session.user.id);
          const previous = lock;
          lock = new Promise((resolve) => {
            release = resolve;
          });
          await previous;
          lockCount += 1;
        },
      };
      try {
        return await callback(tx);
      } finally {
        if (release) release();
      }
    },
  };

  const dependencies = {
    "@/lib/apiKey": apiKey,
    "@/lib/auth": {
      validateRequest: async () => ({
        user: session.user,
        session: session.user ? { id: `session-${session.user.id}` } : null,
      }),
    },
    "@/lib/prisma": prisma,
  };
  const actions = loadTypeScript(
    ["src", "app", "(main)", "users", "[username]", "api-key-actions.ts"],
    dependencies,
  );
  const auth = loadTypeScript(["src", "lib", "requireApiKey.ts"], dependencies);
  const route = loadTypeScript(
    ["src", "app", "api", "v1", "post", "route.ts"],
    {
      ...dependencies,
      "@/lib/requireApiKey": auth,
    },
  );

  function request(url, authorization) {
    return {
      nextUrl: new URL(url, "http://localhost"),
      headers: new Headers(authorization ? { authorization } : {}),
    };
  }

  return {
    rows,
    session,
    prisma,
    actions,
    route,
    request,
    postQueries,
    setPosts(value) {
      posts = value;
    },
    get lockCount() {
      return lockCount;
    },
  };
}

test("generates random, correctly formatted keys and SHA-256 hashes", () => {
  const first = apiKey.generateApiKey();
  const second = apiKey.generateApiKey();
  assert.match(first.rawKey, /^sm_live_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.rawKey, second.rawKey);
  assert.equal(first.prefix, first.rawKey.slice(0, 12));
  assert.equal(
    first.keyHash,
    createHash("sha256").update(first.rawKey).digest("hex"),
  );
  assert.equal(apiKey.hashApiKey(first.rawKey), first.keyHash);
});

test("each action rejects unauthenticated callers and validates names", async () => {
  const fixture = makeFixture();
  fixture.session.user = null;
  await assert.rejects(fixture.actions.createApiKey("name"), /Unauthorized/);
  await assert.rejects(fixture.actions.listApiKeys(), /Unauthorized/);
  await assert.rejects(fixture.actions.revokeApiKey("key-1"), /Unauthorized/);
  fixture.session.user = { id: "user-1" };
  for (const name of ["", "   ", "a".repeat(51), null]) {
    await assert.rejects(fixture.actions.createApiKey(name), /Key name/);
  }
  assert.equal(fixture.rows.length, 0);
  await fixture.actions.createApiKey("a".repeat(50));
  assert.equal(fixture.rows[0].name.length, 50);
});

test("refuses key creation if the session is invalidated after validation", async () => {
  const fixture = makeFixture();
  fixture.session.valid = false;
  await assert.rejects(fixture.actions.createApiKey("name"), /Unauthorized/);
  assert.equal(fixture.lockCount, 1);
  assert.equal(fixture.rows.length, 0);
});

test("stores only hashes and exposes only the current user's safe fields", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("  first  ");
  assert.equal(fixture.rows[0].name, "first");
  assert.equal(fixture.rows[0].keyHash, apiKey.hashApiKey(rawKey));
  assert.ok(!Object.values(fixture.rows[0]).includes(rawKey));
  fixture.session.user = { id: "user-2" };
  await fixture.actions.createApiKey("second");
  const otherKey = fixture.rows[1];
  fixture.session.user = { id: "user-1" };
  const listed = await fixture.actions.listApiKeys();
  assert.equal(listed.length, 1);
  assert.deepEqual(Object.keys(listed[0]).sort(), [
    "createdAt",
    "id",
    "lastUsedAt",
    "name",
    "prefix",
    "revokedAt",
  ]);
  await assert.rejects(fixture.actions.revokeApiKey(otherKey.id), /not found/);
  assert.equal(otherKey.revokedAt, null);
});

test("enforces five active keys even for concurrent creation and allows replacement", async () => {
  const fixture = makeFixture();
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, (_, index) =>
      fixture.actions.createApiKey(`key ${index}`),
    ),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    5,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.match(rejected.reason.message, /at most 5/);
  assert.equal(fixture.lockCount, 6);
  assert.equal(fixture.rows.length, 5);
  await fixture.actions.revokeApiKey(fixture.rows[0].id);
  await fixture.actions.createApiKey("replacement");
  assert.equal(fixture.rows.filter((row) => !row.revokedAt).length, 5);
});

test("rejects missing, malformed, wrong, and revoked credentials before fetching posts", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("test");
  const headers = [
    undefined,
    "Bearer",
    "Basic abc",
    "Bearer wrong",
    `Bearer sm_live_${"A".repeat(43)}`,
    `Bearer ${rawKey} extra`,
  ];
  for (const header of headers) {
    const response = await fixture.route.GET(
      fixture.request("/api/v1/post", header),
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  }
  await fixture.actions.revokeApiKey(fixture.rows[0].id);
  const revoked = await fixture.route.GET(
    fixture.request("/api/v1/post", `Bearer ${rawKey}`),
  );
  assert.equal(revoked.status, 401);
  assert.deepEqual(await revoked.json(), { error: "Unauthorized" });
  assert.equal(fixture.postQueries.length, 0);
  assert.equal(fixture.rows[0].lastUsedAt, null);
});

test("authorizes a valid key, records usage, and keeps pagination and response shape", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("test");
  fixture.setPosts([
    { id: "post-1", content: "one" },
    { id: "post-2", content: "two" },
    { id: "post-3", content: "three" },
  ]);
  const auth = `Bearer ${rawKey}`;
  const first = await fixture.route.GET(
    fixture.request("/api/v1/post?limit=2", auth),
  );
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), {
    data: [
      { id: "post-1", content: "one" },
      { id: "post-2", content: "two" },
    ],
    nextCursor: "post-3",
  });
  assert.ok(fixture.rows[0].lastUsedAt instanceof Date);
  const second = await fixture.route.GET(
    fixture.request("/api/v1/post?limit=2&cursor=post-3", auth),
  );
  assert.deepEqual(await second.json(), {
    data: [{ id: "post-3", content: "three" }],
    nextCursor: null,
  });
  assert.equal(fixture.postQueries[0].take, 3);
  assert.deepEqual(fixture.postQueries[0].select, {
    id: true,
    content: true,
    createdAt: true,
    user: {
      select: { username: true, displayName: true, avatarUrl: true },
    },
    attachments: { select: { url: true, type: true } },
    _count: { select: { likes: true, comments: true } },
  });
  assert.deepEqual(fixture.postQueries[1].cursor, { id: "post-3" });
});

test("bounds pagination even for unusual or malicious limit values", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("test");
  for (const [limit, take] of [
    ["0", 11],
    ["-1", 11],
    ["1.5", 11],
    ["Infinity", 11],
    ["not-a-number", 11],
    ["999999999", 51],
    ["1", 2],
  ]) {
    const response = await fixture.route.GET(
      fixture.request(`/api/v1/post?limit=${limit}`, `Bearer ${rawKey}`),
    );
    assert.equal(response.status, 200);
    assert.equal(fixture.postQueries.at(-1).take, take);
  }
});

test("rejects a key revoked between lookup and usage update", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("test");
  fixture.prisma.apiKey.updateMany = async () => ({ count: 0 });
  const response = await fixture.route.GET(
    fixture.request("/api/v1/post", `Bearer ${rawKey}`),
  );
  assert.equal(response.status, 401);
  assert.equal(fixture.postQueries.length, 0);
});

test("returns a generic error if the database fails", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("test");
  fixture.prisma.post.findMany = async () => {
    throw new Error("database detail");
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await fixture.route.GET(
      fixture.request("/api/v1/post", `Bearer ${rawKey}`),
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
  } finally {
    console.error = originalError;
  }
});

test("serves the authorization contract over HTTP with isolated data", async () => {
  const fixture = makeFixture();
  const rawKey = await fixture.actions.createApiKey("http test");
  fixture.setPosts([{ id: "post-1", content: "test" }]);
  const server = http.createServer(async (req, res) => {
    try {
      const request = fixture.request(req.url, req.headers.authorization);
      const response = await fixture.route.GET(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/v1/post`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal(
      (
        await fetch(url, {
          headers: { Authorization: `Bearer sm_live_${"A".repeat(43)}` },
        })
      ).status,
      401,
    );
    const authorized = await fetch(url, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), {
      data: [{ id: "post-1", content: "test" }],
      nextCursor: null,
    });
    await fixture.actions.revokeApiKey(fixture.rows[0].id);
    assert.equal(
      (await fetch(url, { headers: { Authorization: `Bearer ${rawKey}` } }))
        .status,
      401,
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("password reset revokes the owner's active API keys in the same transaction", async () => {
  let transaction;
  const operation = (name) => (args) => ({ name, args });
  const prisma = {
    passwordResetToken: {
      findUnique: async () => ({
        id: "reset-1",
        userId: "user-1",
        tokenHash: "test-hash",
        expiresAt: new Date(Date.now() + 60_000),
      }),
      delete: operation("deleteToken"),
    },
    user: { update: operation("updatePassword") },
    session: { deleteMany: operation("deleteSessions") },
    apiKey: { updateMany: operation("revokeApiKeys") },
    async $transaction(operations) {
      transaction = operations;
    },
  };
  const reset = loadTypeScript(
    ["src", "app", "(auth)", "reset-password", "action.ts"],
    {
      "@/lib/auth": {
        lucia: {
          createSession: async () => ({ id: "new-session" }),
          createSessionCookie: () => ({
            name: "session",
            value: "test",
            attributes: {},
          }),
        },
      },
      "@/lib/prisma": prisma,
      "@/lib/validation": { resetPasswordSchema: { parse: (data) => data } },
      "@node-rs/argon2": {
        verify: async () => true,
        hash: async () => "password-hash",
      },
      "next/dist/client/components/redirect": { isRedirectError: () => false },
      "next/headers": { cookies: () => ({ set() {} }) },
      "next/navigation": { redirect: () => "redirected" },
    },
  );
  assert.equal(
    await reset.resetPassword("reset-1.secret", { password: "example" }),
    "redirected",
  );
  assert.deepEqual(
    transaction.map((item) => item.name),
    ["updatePassword", "deleteToken", "deleteSessions", "revokeApiKeys"],
  );
  assert.deepEqual(transaction[3].args.where, {
    userId: "user-1",
    revokedAt: null,
  });
  assert.ok(transaction[3].args.data.revokedAt instanceof Date);
});
