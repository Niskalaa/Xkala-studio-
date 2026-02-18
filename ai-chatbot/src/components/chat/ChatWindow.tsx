// src/components/chat/ChatWindow.tsx

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChat } from "ai/react";
import { useChatStore } from "@/stores/chatStore";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ModelSelector } from "./ModelSelector";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeScreen } from "./WelcomeScreen";
import { getModel } from "@/lib/models";
import { getIdToken, addMessage, updateConversation, createConversation } from "@/lib/firebase";
import { generateId } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  // Vercel AI SDK useChat hook
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    reload,
    error,
    append,
  } = useChat({
    api: "/api/chat",
    id: conversationId,
    initialMessages: initialMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    body: {
      model: currentModel,
      conversationId,
    },
    headers: {
      "Content-Type": "application/json",
    },
    onResponse: async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || "Failed to get AI response");
      }
    },
    onFinish: async (message) => {
      // Save to Firestore after stream completes
      if (firebaseUser && conversationId) {
        try {
          await addMessage(firebaseUser.uid, conversationId, {
            role: "assistant",
            content: message.content,
            model: currentModel,
          });
        } catch (err) {
          console.error("Failed to save message:", err);
        }
      }
      setIsStreaming(false);
    },
    onError: (err) => {
      toast.error("Error: " + err.message);
      setIsStreaming(false);
    },
  });

  // Update streaming state
  useEffect(() => {
    setIsStreaming(isLoading);
  }, [isLoading, setIsStreaming]);

  // Set current conversation
  useEffect(() => {
    setCurrentConversation(conversationId || null);
  }, [conversationId, setCurrentConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle send message
  const handleSend = useCallback(
    async (content: string) => {
      if (!firebaseUser) {
        toast.error("Please sign in to chat");
        return;
      }

      let activeConversationId = conversationId;

      // Create new conversation if none exists
      if (!activeConversationId) {
        try {
          activeConversationId = await createConversation(
            firebaseUser.uid,
            currentModel,
            content.substring(0, 50)
          );
          router.push(`/c/${activeConversationId}`);
        } catch (err) {
          toast.error("Failed to create conversation");
          return;
        }
      }

      // Save user message to Firestore
      try {
        await addMessage(firebaseUser.uid, activeConversationId, {
          role: "user",
          content,
        });
      } catch (err) {
        console.error("Failed to save user message:", err);
      }

      // Get auth token for API
      const token = await getIdToken();

      // Send to AI via useChat
      append(
        {
          role: "user",
          content,
        },
        {
          options: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: {
              model: currentModel,
              conversationId: activeConversationId,
            },
          },
        }
      );
    },
    [firebaseUser, conversationId, currentModel, append, router]
  );

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    const token = await getIdToken();
    reload({
      options: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          model: currentModel,
          conversationId,
        },
      },
    });
  }, [currentModel, conversationId, reload]);

  // Show error
  useEffect(() => {
    if (error) {
      toast.error("Chat error: " + error.message);
    }
  }, [error]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Model Selector */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b">
        <ModelSelector />
        {conversationId && (
          <span className="text-xs text-muted-foreground">
            {messages.length} messages
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {hasMessages ? (
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={{
                    id: msg.id,
                    conversationId: conversationId || "",
                    role: msg.role as Message["role"],
                    content: msg.content,
                    model: currentModel,
                    isStreaming:
                      isLoading &&
                      index === messages.length - 1 &&
                      msg.role === "assistant",
                    createdAt: new Date(),
                  }}
                  onRegenerate={
                    msg.role === "assistant" && index === messages.length - 1
                      ? handleRegenerate
                      : undefined
                  }
                  onFeedback={(feedback) => {
                    // TODO: Save feedback to Firestore
                    toast.success(
                      feedback === "good" ? "Thanks for the feedback!" : "We'll improve"
                    );
                  }}
                />
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <TypingIndicator />
                )}
              </AnimatePresence>
            </div>
            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        ) : (
          <WelcomeScreen onSuggestionClick={handleSend} />
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSend={handleSend}
        onStop={stop}
      />
    </div>
  );
}