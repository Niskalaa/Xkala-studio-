// src/hooks/useDeepSeekChat.ts

"use client";

import { useState, useCallback, useRef } from "react";
import { getIdToken } from "@/lib/firebase";
import { Message } from "@/types";
import { generateId } from "@/lib/utils";

interface UseDeepSeekChatOptions {
  conversationId?: string;
  onFinish?: (thinking: string, answer: string) => void;
  onError?: (error: Error) => void;
}

export function useDeepSeekChat(options: UseDeepSeekChatOptions = {}) {
  const { conversationId, onFinish, onError } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, previousMessages: Array<{ role: string; content: string }> = []) => {
      setIsLoading(true);
      setThinking("");
      setAnswer("");
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const token = await getIdToken();

        const response = await fetch("/api/chat/deepseek", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [
              ...previousMessages,
              { role: "user", content },
            ],
            model: "deepseek-r1",
            conversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to get response");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullThinking = "";
        let fullAnswer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "thinking") {
                  fullThinking += data.content;
                  setThinking(fullThinking);
                } else if (data.type === "answer") {
                  fullAnswer += data.content;
                  setAnswer(fullAnswer);
                } else if (data.type === "done") {
                  fullThinking = data.thinking || fullThinking;
                  fullAnswer = data.answer || fullAnswer;
                  setThinking(fullThinking);
                  setAnswer(fullAnswer);
                  onFinish?.(fullThinking, fullAnswer);
                } else if (data.type === "error") {
                  throw new Error(data.content);
                }
              } catch (e) {
                // Skip non-JSON lines
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled
          return;
        }
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, onFinish, onError]
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setThinking("");
    setAnswer("");
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    sendMessage,
    stop,
    reset,
    thinking,
    answer,
    isLoading,
    error,
  };
}