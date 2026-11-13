"use client";

import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserData } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "date-fns";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createApiKey, listApiKeys, revokeApiKey } from "./api-key-actions";

interface ApiCreationProps {
  user: UserData;
}

export default function ApiCreation({ user }: ApiCreationProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const dialogVersion = useRef(0);
  const queryClient = useQueryClient();
  const queryKey = ["api-keys", user.id];

  const keys = useQuery({
    queryKey,
    queryFn: () => listApiKeys(),
    enabled: showDialog,
  });

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && keys.error) {
      console.error("Could not load API keys:", keys.error);
    }
  }, [keys.error]);

  const createKey = useMutation({
    mutationFn: async ({
      keyName,
      version,
    }: {
      keyName: string;
      version: number;
    }) => {
      const rawKey = await createApiKey(keyName);
      if (dialogVersion.current === version) {
        setNewKey(rawKey);
        setName("");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  function onOpenChange(open: boolean) {
    if (!open) {
      dialogVersion.current += 1;
      setNewKey(null);
      setCopyMessage(null);
      createKey.reset();
      revokeKey.reset();
    }
    setShowDialog(open);
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewKey(null);
    setCopyMessage(null);
    createKey.mutate({ keyName: name, version: dialogVersion.current });
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopyMessage("Copied.");
    } catch {
      setCopyMessage("Could not copy the key. Please copy it manually.");
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setShowDialog(true)}>
        API keys
      </Button>
      <Dialog open={showDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API keys</DialogTitle>
            <DialogDescription>
              Create and revoke keys for accessing the API.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onCreate} className="space-y-3">
            <Label htmlFor="api-key-name">Key name</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              required
            />
            <LoadingButton type="submit" loading={createKey.isPending}>
              Create key
            </LoadingButton>
            {createKey.isError && (
              <p role="alert" className="text-sm text-destructive">
                {createKey.error.message}
              </p>
            )}
          </form>

          {newKey && (
            <div className="space-y-2 rounded-md border p-3">
              <Label htmlFor="new-api-key">Your new API key</Label>
              <Input id="new-api-key" value={newKey} readOnly />
              <p className="text-sm">
                You won&apos;t be able to see this key again.
              </p>
              <Button type="button" variant="outline" onClick={copyKey}>
                Copy
              </Button>
              {copyMessage && (
                <p role="status" className="text-sm">
                  {copyMessage}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">Your keys</h3>
            {keys.isLoading && <p>Loading API keys...</p>}
            {keys.isError && (
              <p role="alert" className="text-sm text-destructive">
                Could not load API keys. Please try again.
              </p>
            )}
            {revokeKey.isError && (
              <p role="alert" className="text-sm text-destructive">
                {revokeKey.error.message}
              </p>
            )}
            {keys.data?.length === 0 && <p>No API keys yet.</p>}
            {keys.data?.map((key) => (
              <div
                key={key.id}
                className="space-y-1 rounded-md border p-3 text-sm"
              >
                <p className="font-semibold">{key.name}</p>
                <p>Prefix: {key.prefix}</p>
                <p>Created: {formatDate(key.createdAt, "MMM d, yyyy")}</p>
                <p>
                  Last used:{" "}
                  {key.lastUsedAt
                    ? formatDate(key.lastUsedAt, "MMM d, yyyy")
                    : "Never"}
                </p>
                <p>Status: {key.revokedAt ? "Revoked" : "Active"}</p>
                {!key.revokedAt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokeKey.isPending}
                    onClick={() => revokeKey.mutate(key.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
