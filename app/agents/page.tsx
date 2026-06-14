import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agents</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Build and manage your custom AI agents.
          </p>
        </div>
        <Button>+ New agent</Button>
      </div>

      {/* Empty state */}
      <Card className="p-12 text-center">
        <CardHeader>
          <div className="text-4xl mb-3">🤖</div>
          <CardTitle>No agents yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 mb-6">
            Create your first agent and give it a system prompt, tools, and a knowledge base.
          </p>
          <Button>Create your first agent</Button>
        </CardContent>
      </Card>
    </div>
  );
}
