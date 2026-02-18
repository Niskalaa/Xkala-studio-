// src/components/chat/ChatWindow.tsx (UPDATED with DeepSeek R1)

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "ai/react";
import { useChatStore } from "@/stores/chatStore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useDeepSeekChat } from "@/hooks/useDeepSeekChat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";
import { getModel } from "@/lib/models";
import { getIdToken, createConversation } from "@/lib/firebase";
import { generateId } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { Message } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ChatWindowProps {
  conversationId?: string;
  initialMessages?: Message[];
}

export function ChatWindow({ conversationId, initialMessages = [] }: ChatWindowProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, firebaseUser } = useAuthContext();
  const {
    currentModel,
    setCurrentConversation,
    setIsStreaming,
  } = useChatStore();

  const model = getModel(currentModel);
  const isDeepSeek = currentModel === "deepseek-r1";

  // Local state for combined message display
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(conversationId);

  // ============================================================
  // STANDARD CHAT (Claude Sonnet 4 & Opus 4)
  // ============================================================
  const {
    messages: aiMessages,
    isLoading: aiLoading,
    stop: aiStop,
    reload: aiReload,
    append: aiAppend,
    setMessages: setAiMessages,
  } = useChat({
    api: "/api/chat",
    id: activeConversationId,
    initialMessages: !isDeepSeek
      ? initialMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }))
      : [],
    body: {
      model: currentModel,
      conversationId: activeConversationId,
    },
    onFinish: () => {
      setIsStreaming(false);
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setIsStreaming(false);
    },
  });

  // ============================================================
  // DEEPSEEK R1 CHAT (with thinking)
  // ============================================================
  const {
    sendMessage: deepseekSend,
    stop: deepseekStop,
    thinking: deepseekThinking,
    answer: deepseekAnswer,
    isLoading: deepseekLoading,
    reset: deepseekReset,
  } = useDeepSeekChat({
    conversationId: activeConversationId,
    onFinish: (thinking, answer) => {
      // Add completed message to local messages
      const assistantMsg: Message = {
        id: generateId(),
        conversationId: activeConversationId || "",
        role: "assistant",
        content: answer,
        thinking: thinking || undefined,
        model: "deepseek-r1",
        isStreaming: false,
        createdAt: new Date(),
      };
      setLocalMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(false);
    },
    onError: (err) => {
      toast.error("DeepSeek R1 error: " + err.message);
      setIsStreaming(false);
    },
  });

  // Determine which loading state to use
  const isLoading = isDeepSeek ? deepseekLoading : aiLoading;

  // Update streaming state
  useEffect(() => {
    setIsStreaming(isLoading);
  }, [isLoading, setIsStreaming]);

  // Set current conversation
  useEffect(() => {
    setActiveConversationId(conversationId);
    setCurrentConversation(conversationId || null);
  }, [conversationId, setCurrentConversation]);

  // Sync initial messages
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages, localMessages, deepseekThinking, deepseekAnswer, isLoading]);

  // ============================================================
  // HANDLE SEND MESSAGE
  // ============================================================
  const handleSend = useCallback(
    async (content: string) => {
      if (!firebaseUser) {
        toast.error("Please sign in to chat");
        return;
      }

      let convId = activeConversationId;

      // Create new conversation if needed
      if (!convId) {
        try {
          convId = await createConversation(
            firebaseUser.uid,
            currentModel,
            content.substring(0, 50)
          );
          setActiveConversationId(convId);
          router.push(`/c/${convId}`);
        } catch {
          toast.error("Failed to create conversation");
          return;
        }
      }

      // Add user message to local display
      const userMsg: Message = {
        id: generateId(),
        conversationId: convId,
        role: "user",
        content,
        model: currentModel,
        isStreaming: false,
        createdAt: new Date(),
      };

      if (isDeepSeek) {
        // DeepSeek R1 path
        setLocalMessages((prev) => [...prev, userMsg]);
        const previousMessages = localMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        deepseekSend(content, previousMessages);
      } else {
        // Claude path (via Vercel AI SDK useChat)
        const token = await getIdToken();
        aiAppend(
          { role: "user", content },
          {
            options: {
              headers: { Authorization: `Bearer ${token}` },
              body: {
                model: currentModel,
                conversationId: convId,
              },
            },
          }
        );
      }
    },
    [
      firebaseUser,
      activeConversationId,
      currentModel,
      isDeepSeek,
      localMessages,
      deepseekSend,
      aiAppend,
      router,
    ]
  );

  // ============================================================
  // HANDLE STOP
  // ============================================================
  const handleStop = useCallback(() => {
    if (isDeepSeek) {
      deepseekStop();
    } else {
      aiStop();
    }
  }, [isDeepSeek, deepseekStop, aiStop]);

  // ============================================================
  // HANDLE REGENERATE
  // ============================================================
  const handleRegenerate = useCallback(async () => {
    if (isDeepSeek) {
      // Remove last assistant message and resend
      setLocalMessages((prev) => {
        const filtered = prev.slice(0, -1);
        const lastUserMsg = [...filtered].reverse().find((m) => m.role === "user");
        if (lastUserMsg) {
          const previousMessages = filtered
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content }));
          deepseekSend(lastUserMsg.content, previousMessages);
        }
        return filtered;
      });
    } else {
      const token = await getIdToken();
      aiReload({
        options: {
          headers: { Authorization: `Bearer ${token}` },
          body: {
            model: currentModel,
            conversationId: activeConversationId,
          },
        },
      });
    }
  }, [isDeepSeek, currentModel, activeConversationId, deepseekSend, aiReload]);

  // ============================================================
  // BUILD DISPLAY MESSAGES
  // ============================================================
  const displayMessages: Message[] = isDeepSeek
    ? [
        ...localMessages,
        // Add streaming assistant message for DeepSeek
        ...(deepseekLoading
          ? [
              {
                id: "streaming-deepseek",
                conversationId: activeConversationId || "",
                role: "assistant" as const,
                content: deepseekAnswer,
                thinking: deepseekThinking,
                model: "deepseek-r1" as const,
                isStreaming: true,
                createdAt: new Date(),
              },
            ]
          : []),
      ]
    : aiMessages.map((msg, index) => ({
        id: msg.id,
        conversationId: activeConversationId || "",
        role: msg.role as Message["role"],
        content: msg.content,
        model: currentModel,
        isStreaming: aiLoading && index === aiMessages.length - 1 && msg.role === "assistant",
        createdAt: new Date(),
      }));

  const hasMessages = displayMessages.length > 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b bg-background/80 backdrop-blur-sm">
        <ModelSelector />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activeConversationId && (
            <span>{displayMessages.length} messages</span>
          )}
          {isDeepSeek && (
            <span className="text-blue-500 font-medium">Reasoning Mode</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        {hasMessages ? (
          <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              {displayMessages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRegenerate={
                    msg.role === "assistant" &&
                    index === displayMessages.length - 1 &&
                    !isLoading
                      ? handleRegenerate
                      : undefined
                  }
                  onFeedback={(feedback) => {
                    toast.success(
                      feedback === "good"
                        ? "Thanks for the feedback!"
                        : "We'll improve"
                    );
                  }}
                />
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading &&
                  displayMessages[displayMessages.length - 1]?.role === "user" && (
                    <TypingIndicator />
                  )}
              </AnimatePresence>
            </div>
            <div className="h-4" />
          </div>
        ) : (
          <WelcomeScreen onSuggestionClick={handleSend} />
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} onStop={handleStop} />
    </div>
  );
}