// src/components/chat/ChatInput.tsx

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Send, Square, Paperclip, Mic, 
  ArrowUp, Loader2, Image as ImageIcon 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { inputValue, setInputValue, isStreaming } = useChatStore();
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [inputValue, adjustHeight]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInputValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue, isStreaming, disabled, onSend, setInputValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = inputValue.trim().length > 0 && !disabled;

  return (
    <div className="border-t bg-background px-4 md:px-8 py-4">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "relative flex items-end gap-2 rounded-2xl border bg-background transition-all",
            "shadow-sm",
            isFocused && "ring-2 ring-primary/20 border-primary/30",
            isStreaming && "border-orange-300 dark:border-orange-700"
          )}
        >
          {/* Attachment button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="shrink-0 p-3 pb-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  disabled={isStreaming}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isStreaming 
                ? "Waiting for response..." 
                : "Type your message... (Shift+Enter for new line)"
            }
            disabled={isStreaming || disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent py-3 px-0",
              "text-sm leading-relaxed placeholder:text-muted-foreground",
              "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-[200px] overflow-y-auto"
            )}
          />

          {/* Send / Stop button */}
          <div className="shrink-0 p-2">
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-lg"
                    onClick={onStop}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Button
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all",
                      canSend
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    onClick={handleSend}
                    disabled={!canSend}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center mt-2">
          <p className="text-[11px] text-muted-foreground">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}