import Link from "next/link";
import { listAgents } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@prisma/client";

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-500">
            {agent.model}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {agent.description && (
          <p className="text-sm text-neutral-500 line-clamp-2">
            {agent.description}
          </p>
        )}

        {agent.toolsEnabled.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.toolsEnabled.map((t) => (
              <span
                key={t}
                className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Link href={`/agents/${agent.id}/chat`} className="flex-1">
            <Button className="w-full" size="sm">
              Chat
            </Button>
          </Link>
          <Link href={`/agents/${agent.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AgentsPage() {
  // Server component — fetch agents directly from DB
  let agents: Agent[] = [];
  try {
    agents = await listAgents();
  } catch {
    // DB may not be running yet in dev; show empty state
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agents</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Build and manage your custom AI agents.
          </p>
        </div>
        <Link href="/agents/new">
          <Button>+ New agent</Button>
        </Link>
      </div>

      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-2">
            No agents yet
          </h2>
          <p className="text-sm text-neutral-500 mb-6">
            Create your first agent and give it a system prompt, tools, and a knowledge base.
          </p>
          <Link href="/agents/new">
            <Button>Create your first agent</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
