// src/components/chat/ThinkingBlock.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ thinking, isStreaming = false }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking && !isStreaming) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mb-3"
    >
      <div className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden bg-blue-50/50 dark:bg-blue-950/20">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 text-blue-500" />
          )}
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {isStreaming ? "Thinking..." : "Thought process"}
          </span>
          {!isStreaming && (
            <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">
              ({thinking.split("\n").length} steps)
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-blue-500 ml-auto transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>

        {/* Content - collapsible */}
        <AnimatePresence>
          {(expanded || isStreaming) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 border-t border-blue-200 dark:border-blue-800">
                <div className="mt-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs leading-relaxed text-blue-800 dark:text-blue-200 whitespace-pre-wrap font-mono">
                    {thinking}
                    {isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                    )}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}