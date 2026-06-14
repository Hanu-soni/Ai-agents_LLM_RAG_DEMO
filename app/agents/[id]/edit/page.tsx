import { notFound } from "next/navigation";
import { getAgent, listApiKeys } from "@/lib/db/queries";
import { AgentForm } from "@/components/agent-form";
import { ApiKeys } from "@/components/api-keys";

interface Props {
  params: { id: string };
}

export default async function EditAgentPage({ params }: Props) {
  let agent = null;
  let keys: { id: string; label: string; createdAt: string }[] = [];

  try {
    agent = await getAgent(params.id);
    if (agent) {
      const rawKeys = await listApiKeys(params.id);
      keys = rawKeys.map((k) => ({
        id: k.id,
        label: k.label,
        createdAt: k.createdAt.toISOString(),
      }));
    }
  } catch {
    // DB not running in dev
  }

  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Edit — {agent.name}
        </h1>
        <p className="text-sm text-neutral-500">
          Update the agent&apos;s settings. Changes take effect immediately.
        </p>
      </div>

      <AgentForm
        initial={{
          id: agent.id,
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          toolsEnabled: agent.toolsEnabled,
        }}
      />

      <ApiKeys agentId={agent.id} initialKeys={keys} />
    </div>
  );
}
