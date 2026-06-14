"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiKeyRow {
  id: string;
  label: string;
  createdAt: string;
}

interface ApiKeysProps {
  agentId: string;
  initialKeys: ApiKeyRow[];
}

export function ApiKeys({ agentId, initialKeys }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setNewKey(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "default" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate key.");
        return;
      }
      setNewKey(data.key as string);
      setKeys((prev) => [
        { id: data.id as string, label: data.label as string, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setLabel("");
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(keyId: string) {
    await fetch(`/api/agents/${agentId}/keys?keyId=${keyId}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-neutral-500">
          Generate a key to invoke this agent from your own code via{" "}
          <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">
            POST /api/v1/agents/{agentId}/invoke
          </code>
          . Keys are shown <strong>once</strong> — store them safely.
        </p>

        {/* Generator */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="key-label">Label (optional)</Label>
            <Input
              id="key-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. production"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate key"}
            </Button>
          </div>
        </div>

        {/* Newly generated key — shown once */}
        {newKey && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-medium text-green-800">
              ✓ Key generated — copy it now. It won&apos;t be shown again.
            </p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono break-all text-neutral-900">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(newKey)}
              >
                Copy
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Existing keys list */}
        {keys.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Active keys
            </p>
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-neutral-800">{k.label}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(k.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 italic">No active keys yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
