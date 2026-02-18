// src/components/chat/TypingIndicator.tsx

"use client";

import { motion } from "framer-motion";
import { getModel } from "@/lib/models";
import { useChatStore } from "@/stores/chatStore";
import { Zap, Brain, FlaskConical } from "lucide-react";
import { ModelId } from "@/types";

const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  "sonnet4": <Zap className="w-3.5 h-3.5" />,
  "opus4": <Brain className="w-3.5 h-3.5" />,
  "deepseek-r1": <FlaskConical className="w-3.5 h-3.5" />,
};

export function TypingIndicator() {
  const { currentModel } = useChatStore();
  const model = getModel(currentModel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-4 px-4 md:px-8 py-6"
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: model.color }}
      >
        {MODEL_ICONS[model.id]}
      </div>

      {/* Typing dots */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: model.color }}
              animate={{
                scale: [0.6, 1, 0.6],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {model.displayName} is thinking...
        </span>
      </div>
    </motion.div>
  );
}