"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: { tool: string; done: boolean }[];
  streaming: boolean;
}

interface ChatWindowProps {
  agentId: string;
  agentName: string;
}

function ToolIndicator({ tool, done }: { tool: string; done: boolean }) {
  const label: Record<string, string> = {
    knowledge_search: "Searching knowledge",
    calculator: "Calculating",
    current_time: "Getting time",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium w-fit transition-colors",
        done
          ? "bg-neutral-100 text-neutral-400"
          : "bg-indigo-50 text-indigo-600"
      )}
    >
      {!done && (
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
        </span>
      )}
      {done ? "✓" : ""} {label[tool] ?? tool}
      {!done ? "…" : ""}
    </div>
  );
}

function ChatBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Tool indicators — shown above the assistant bubble */}
        {!isUser && msg.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1 mb-1">
            {msg.toolCalls.map((tc, i) => (
              <ToolIndicator key={i} tool={tc.tool} done={tc.done} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        {(msg.content || msg.streaming) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm",
              isUser
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-neutral-100 text-neutral-900 rounded-tl-sm"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-800 prose-pre:text-neutral-100 prose-code:bg-neutral-200 prose-code:px-1 prose-code:rounded prose-code:text-xs">
                <ReactMarkdown>{msg.content || " "}</ReactMarkdown>
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-neutral-400 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatWindow({ agentId, agentName }: ChatWindowProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep scroll pinned to the bottom while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build the history array sent to the API (only committed messages)
  function buildHistory(): HistoryMessage[] {
    return messages
      .filter((m) => !m.streaming && m.content)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      toolCalls: [],
      streaming: false,
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      toolCalls: [],
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: text,
          history: buildHistory(),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const raw = line.slice(5).trim();
          if (raw === "[DONE]") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, streaming: false } : m
              )
            );
            break;
          }

          try {
            const event = JSON.parse(raw) as {
              type: string;
              content?: string;
              tool?: string;
              output?: string;
              message?: string;
            };

            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantId) return m;

                if (event.type === "token") {
                  return { ...m, content: m.content + (event.content ?? "") };
                }
                if (event.type === "tool_start") {
                  return {
                    ...m,
                    toolCalls: [
                      ...m.toolCalls,
                      { tool: event.tool ?? "tool", done: false },
                    ],
                  };
                }
                if (event.type === "tool_end") {
                  return {
                    ...m,
                    toolCalls: m.toolCalls.map((tc) =>
                      tc.tool === event.tool && !tc.done
                        ? { ...tc, done: true }
                        : tc
                    ),
                  };
                }
                if (event.type === "error") {
                  return {
                    ...m,
                    content: `⚠️ ${event.message}`,
                    streaming: false,
                  };
                }
                return m;
              })
            );
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}`,
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="border-b border-neutral-200 px-6 py-3 flex items-center gap-2 bg-white">
        <span className="text-lg">💬</span>
        <span className="font-semibold text-neutral-900">{agentName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-neutral-400">
            <span className="text-4xl">🤖</span>
            <p className="text-sm">
              Start the conversation — {agentName} is ready.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            disabled={isStreaming}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={isStreaming || !input.trim()}>
            {isStreaming ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}
