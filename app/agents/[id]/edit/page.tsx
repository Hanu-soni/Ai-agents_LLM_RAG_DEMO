import { notFound } from "next/navigation";
import { getAgent } from "@/lib/db/queries";
import { AgentForm } from "@/components/agent-form";

interface Props {
  params: { id: string };
}

export default async function EditAgentPage({ params }: Props) {
  let agent = null;
  try {
    agent = await getAgent(params.id);
  } catch {
    // DB not running in dev — fall through to notFound
  }

  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">
        Edit — {agent.name}
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        Update the agent&apos;s settings. Changes take effect immediately.
      </p>
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
    </div>
  );
}
