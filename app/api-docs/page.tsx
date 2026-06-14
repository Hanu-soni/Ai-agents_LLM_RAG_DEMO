import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const endpoint = {
  method: "POST",
  path: "/api/v1/agents/:id/invoke",
  description: "Run an agent and get a response. Requires a per-agent API key.",
};

const curlExample = `curl -X POST https://your-domain.com/api/v1/agents/<AGENT_ID>/invoke \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "What are the key points in my documents?"}'`;

const responseExample = `{
  "output": "Based on your documents, the key points are...",
  "toolCalls": [
    { "tool": "knowledge_search", "input": "key points", "chunks": 3 }
  ]
}`;

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Public API</h1>
      <p className="text-sm text-neutral-500 mb-10">
        Invoke any agent programmatically using a per-agent API key.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-700">
              {endpoint.method}
            </span>
            <CardTitle className="font-mono text-base">{endpoint.path}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 mb-6">{endpoint.description}</p>

          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Example request
          </h3>
          <pre className="rounded-lg bg-neutral-900 text-neutral-100 text-xs p-4 overflow-x-auto mb-6">
            {curlExample}
          </pre>

          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Example response
          </h3>
          <pre className="rounded-lg bg-neutral-900 text-neutral-100 text-xs p-4 overflow-x-auto">
            {responseExample}
          </pre>
        </CardContent>
      </Card>

      <p className="text-xs text-neutral-400">
        Generate an API key from the agent settings page. Keys are shown once and stored as a
        hash — keep them safe.
      </p>
    </div>
  );
}
