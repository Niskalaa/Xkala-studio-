// src/components/chat/WelcomeScreen.tsx

"use client";

import { motion } from "framer-motion";
import { Bot, Code, BookOpen, Lightbulb, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  {
    icon: <Code className="w-5 h-5" />,
    title: "Write Code",
    prompt: "Write a React custom hook for infinite scrolling with TypeScript",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Explain Concept",
    prompt: "Explain how transformer architecture works in AI, in simple terms",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Brainstorm Ideas",
    prompt: "Give me 10 creative SaaS startup ideas for 2026 with AI integration",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: <PenTool className="w-5 h-5" />,
    title: "Help Me Write",
    prompt: "Help me write a professional email to a client about project delays",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
];

interface WelcomeScreenProps {
  onSuggestionClick: (prompt: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground mb-6"
        >
          <Bot className="w-8 h-8" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
        <p className="text-muted-foreground mb-8">
          Choose a model and start a conversation, or try one of these suggestions:
        </p>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={suggestion.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSuggestionClick(suggestion.prompt)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-left",
                "hover:shadow-md transition-all duration-200",
                "bg-card hover:border-primary/20"
              )}
            >
              <div className={cn("p-2 rounded-lg shrink-0", suggestion.bg, suggestion.color)}>
                {suggestion.icon}
              </div>
              <div>
                <span className="text-sm font-semibold block">{suggestion.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {suggestion.prompt}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}