import { notFound } from "next/navigation";
import { getAgent } from "@/lib/db/queries";

interface Props {
  params: { id: string };
}

export default async function ChatPage({ params }: Props) {
  let agent = null;
  try {
    agent = await getAgent(params.id);
  } catch {
    // DB not running in dev
  }

  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <div className="text-4xl mb-3">💬</div>
      <h1 className="text-xl font-bold text-neutral-900 mb-2">{agent.name}</h1>
      <p className="text-sm text-neutral-500">
        Chat interface coming in Phase 6. Agent is ready with model{" "}
        <span className="font-mono">{agent.model}</span> and tools:{" "}
        {agent.toolsEnabled.length > 0
          ? agent.toolsEnabled.join(", ")
          : "none"}
        .
      </p>
    </div>
  );
}
