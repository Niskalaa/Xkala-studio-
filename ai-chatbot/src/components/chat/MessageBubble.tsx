// src/components/chat/MessageBubble.tsx

"use client";

import { memo, useState } from "react";
import { Message, ModelId } from "@/types";
import { getModel } from "@/lib/models";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { ThinkingBlock } from "./ThinkingBlock";
import { cn, copyToClipboard, formatRelativeTime, formatTokens } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Copy, Check, ThumbsUp, ThumbsDown, RotateCw, 
  MoreHorizontal, User, Bot, Zap, Brain, FlaskConical 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useAuthContext } from "@/components/providers/AuthProvider";

const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  "sonnet4": <Zap className="w-3.5 h-3.5" />,
  "opus4": <Brain className="w-3.5 h-3.5" />,
  "deepseek-r1": <FlaskConical className="w-3.5 h-3.5" />,
};

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (feedback: "good" | "bad" | null) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRegenerate,
  onFeedback,
}: MessageBubbleProps) {
  const { user } = useAuthContext();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const model = message.model ? getModel(message.model) : null;

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group flex gap-4 px-4 md:px-8 py-6",
        isUser ? "bg-chat-user" : "bg-chat-assistant"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: model?.color || "#6B7280" }}
          >
            {model ? MODEL_ICONS[model.id] : <Bot className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? (user?.displayName || "You") : (model?.displayName || "AI")}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.createdAt)}
          </span>
          {message.tokens && (
            <span className="text-xs text-muted-foreground">
              • {formatTokens(message.tokens.total)} tokens
            </span>
          )}
        </div>

        {/* Thinking Block (DeepSeek R1) */}
        {message.thinking && (
          <ThinkingBlock
            thinking={message.thinking}
            isStreaming={message.isStreaming}
          />
        )}

        {/* Message Content */}
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}

        {/* Streaming cursor */}
        {message.isStreaming && !message.thinking && (
          <span className="inline-block w-2 h-5 bg-foreground/70 animate-pulse" />
        )}

        {/* Action Buttons (assistant only) */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>

            <button
              onClick={() => onFeedback?.("good")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                message.feedback === "good"
                  ? "text-green-500 bg-green-50 dark:bg-green-950"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onFeedback?.("bad")}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                message.feedback === "bad"
                  ? "text-red-500 bg-red-50 dark:bg-red-950"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleCopy}>
                  Copy as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem>Share message</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
});