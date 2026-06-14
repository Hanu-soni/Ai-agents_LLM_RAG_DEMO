"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
  { value: "gpt-4o", label: "GPT-4o (most capable)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const TOOLS = [
  {
    name: "knowledge_search",
    label: "Knowledge Search",
    description: "Search uploaded documents using semantic similarity",
  },
  {
    name: "calculator",
    label: "Calculator",
    description: "Evaluate arithmetic expressions",
  },
  {
    name: "current_time",
    label: "Current Time",
    description: "Look up the current UTC date and time",
  },
];

interface AgentFormProps {
  /** Pre-filled values when editing an existing agent */
  initial?: {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    model: string;
    toolsEnabled: string[];
  };
}

export function AgentForm({ initial }: AgentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    initial?.systemPrompt ?? "You are a helpful assistant."
  );
  const [model, setModel] = useState(initial?.model ?? "gpt-4o-mini");
  const [toolsEnabled, setToolsEnabled] = useState<string[]>(
    initial?.toolsEnabled ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleTool(toolName: string) {
    setToolsEnabled((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = { name, description, systemPrompt, model, toolsEnabled };
    const url = isEdit ? `/api/agents/${initial!.id}` : "/api/agents";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push("/agents");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Agent name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support Bot"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="systemPrompt">
            Instructions for the agent — sets its personality, rules, and focus
          </Label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant specialised in..."
            className="min-h-[160px] font-mono text-xs"
            required
          />
          <p className="mt-1.5 text-xs text-neutral-400">
            {systemPrompt.length} / 4000 characters
          </p>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TOOLS.map((tool) => {
            const enabled = toolsEnabled.includes(tool.name);
            return (
              <button
                key={tool.name}
                type="button"
                onClick={() => toggleTool(tool.name)}
                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  enabled
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                {/* Toggle indicator */}
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    enabled
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-neutral-300"
                  }`}
                >
                  {enabled && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {tool.label}
                  </p>
                  <p className="text-xs text-neutral-500">{tool.description}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create agent"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/agents")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
