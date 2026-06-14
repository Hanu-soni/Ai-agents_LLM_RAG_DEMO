import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Knowledge</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Upload documents to give your agents a private knowledge base.
          </p>
        </div>
        <Button>+ Upload document</Button>
      </div>

      {/* Empty state */}
      <Card className="p-12 text-center">
        <CardHeader>
          <div className="text-4xl mb-3">📚</div>
          <CardTitle>No documents yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500 mb-6">
            Upload .txt or .md files and your agents will be able to answer questions from them
            via semantic search.
          </p>
          <Button>Upload your first document</Button>
        </CardContent>
      </Card>
    </div>
  );
}
