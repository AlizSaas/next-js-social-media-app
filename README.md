This is the starting code for this tutorial.

**IMPORTANT**: After cloning the repo, open the command line inside the project and run `npm i --legacy-peer-deps`.

## API keys

On your own profile, open **API keys** to create or revoke a key. Names must
contain 1–50 characters, and each user may have at most five active keys.
Copy a new key immediately: the application stores only its SHA-256 hash and
cannot show the key again. Treat the key like a password.
Resetting your password also revokes all your active API keys.

The post endpoint requires `Authorization: Bearer <key>`. For example, in
PowerShell with the app running locally:

```powershell
# No key: 401
curl.exe -i http://localhost:3000/api/v1/post

# Wrong key: 401
curl.exe -i -H "Authorization: Bearer $($('sm_live_' + ('A' * 43)))" http://localhost:3000/api/v1/post

# Paste a key created on your profile: 200 with data and nextCursor
$env:BUGBOOK_API_KEY = Read-Host "Paste your API key"
curl.exe -i -H "Authorization: Bearer $env:BUGBOOK_API_KEY" http://localhost:3000/api/v1/post

# Revoke that key in your profile, then run the same request: 401
curl.exe -i -H "Authorization: Bearer $env:BUGBOOK_API_KEY" http://localhost:3000/api/v1/post
Remove-Item Env:\BUGBOOK_API_KEY
```

Keep keys out of source control, logs, screenshots, and shell history. Use HTTPS
when sending them over a network.
The application does not implement request-rate limiting for this endpoint;
configure appropriate rate limits at your reverse proxy or WAF before deploying.

Run `npm run test:api-keys` for isolated tests of authorization, key ownership,
the five-key limit, and pagination. The tests use an in-memory database mock and
do not modify the configured PostgreSQL database. To check the five-key limit
manually, create five active keys and try to create a sixth; revoke one to make
room. With two accounts, each profile should list only its own keys.

To check the database without displaying hashes, query only their format:

```sql
SELECT "name", "prefix",
       (length("keyHash") = 64 AND "keyHash" ~ '^[0-9a-f]{64}$') AS hash_is_sha256
FROM "api_keys";
```
