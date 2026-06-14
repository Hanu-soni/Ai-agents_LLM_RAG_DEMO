import { notFound } from "next/navigation";
import { getAgent } from "@/lib/db/queries";
import { ChatWindow } from "@/components/chat-window";

interface Props {
  params: { id: string };
}

export default async function ChatPage({ params }: Props) {
  let agent = null;
  try {
    agent = await getAgent(params.id);
  } catch {
    // DB not running — handled below
  }

  if (!agent) notFound();

  return <ChatWindow agentId={agent.id} agentName={agent.name} />;
}
