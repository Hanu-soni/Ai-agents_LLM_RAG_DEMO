import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Build Custom Agents",
    description:
      "Give each agent a system prompt, choose its model, and enable exactly the tools it needs.",
    icon: "🤖",
  },
  {
    title: "Private Knowledge Base (RAG)",
    description:
      "Upload documents and let your agents answer questions grounded in your own data via pgvector semantic search.",
    icon: "📚",
  },
  {
    title: "Tool-Calling Loop",
    description:
      "Agents autonomously call tools — knowledge search, calculator, time — and loop until they have a final answer.",
    icon: "⚙️",
  },
  {
    title: "Public API",
    description:
      "Expose any agent over a REST API with per-agent API keys. Build products on top of your agents.",
    icon: "🔌",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600 mb-6">
          Open-source · Next.js + pgvector + OpenAI
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl">
          Build AI agents with a{" "}
          <span className="text-indigo-600">private knowledge base</span>
        </h1>
        <p className="mt-6 text-lg text-neutral-500 max-w-2xl mx-auto">
          Agent Forge lets you create custom tool-using AI agents, feed them your own documents
          via RAG, chat with them in real time, and expose them to the world through a simple API.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/agents">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/api-docs">
            <Button size="lg" variant="outline">
              View API docs
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-semibold text-neutral-800 mb-12">
            Everything you need to ship an agentic AI product
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <Card key={f.title} className="p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-neutral-900 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-500">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stack callout */}
      <section className="py-16 px-6 text-center">
        <p className="text-sm text-neutral-400 font-mono">
          Next.js 14 · TypeScript · Tailwind · OpenAI · pgvector · Prisma · Docker
        </p>
      </section>
    </div>
  );
}
