import { AgentForm } from "@/components/agent-form";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">New agent</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Give your agent a name, system prompt, and choose which tools it can use.
      </p>
      <AgentForm />
    </div>
  );
}
