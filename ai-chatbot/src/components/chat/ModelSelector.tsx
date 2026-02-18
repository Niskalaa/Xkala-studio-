// src/components/chat/ModelSelector.tsx

"use client";

import { useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { getModelList, getModel } from "@/lib/models";
import { ModelId } from "@/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Zap, Brain, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  "sonnet4": <Zap className="w-4 h-4" />,
  "opus4": <Brain className="w-4 h-4" />,
  "deepseek-r1": <FlaskConical className="w-4 h-4" />,
};

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const { currentModel, setCurrentModel, isStreaming } = useChatStore();
  const selected = getModel(currentModel);
  const models = getModelList();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={isStreaming}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl",
            "border bg-background hover:bg-muted/50 transition-all",
            "text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: selected.color }}
          />
          <span>{selected.displayName}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-2"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-1">
          {models.map((model) => (
            <motion.button
              key={model.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setCurrentModel(model.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors",
                currentModel === model.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
                style={{ backgroundColor: `${model.color}15`, color: model.color }}
              >
                {MODEL_ICONS[model.id]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{model.displayName}</span>
                  {model.supportsThinking && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Reasoning
                    </Badge>
                  )}
                  {model.supportsImages && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Vision
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {model.description}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span>Context: {(model.contextWindow / 1000).toFixed(0)}K</span>
                  <span>•</span>
                  <span>Output: {(model.maxOutputTokens / 1000).toFixed(0)}K</span>
                </div>
              </div>

              {/* Check */}
              <AnimatePresence>
                {currentModel === model.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}