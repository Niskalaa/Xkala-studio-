// src/lib/models.ts

import { AIModel, ModelId } from "@/types";

export const AI_MODELS: Record<ModelId, AIModel> = {
  "sonnet4": {
    id: "sonnet4",
    name: "claude-sonnet-4",
    displayName: "Claude Sonnet 4",
    description: "Keseimbangan terbaik antara kecepatan dan kecerdasan. Cocok untuk sebagian besar tugas.",
    bedrockModelId: "us.anthropic.claude-sonnet-4-20250514",
    maxOutputTokens: 64000,
    contextWindow: 200000,
    inputPricePerMToken: 3,
    outputPricePerMToken: 15,
    supportsImages: true,
    supportsThinking: false,
    color: "#D97706",
    icon: "⚡",
  },
  "opus4": {
    id: "opus4",
    name: "claude-opus-4",
    displayName: "Claude Opus 4",
    description: "Model terkuat untuk tugas kompleks, coding, dan analisis mendalam.",
    bedrockModelId: "us.anthropic.claude-opus-4-20250514",
    maxOutputTokens: 32000,
    contextWindow: 200000,
    inputPricePerMToken: 15,
    outputPricePerMToken: 75,
    supportsImages: true,
    supportsThinking: false,
    color: "#7C3AED",
    icon: "🧠",
  },
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "deepseek-r1",
    displayName: "DeepSeek R1",
    description: "Spesialis reasoning dan matematika dengan tampilan proses berpikir.",
    bedrockModelId: "us.deepseek.r1-v1:0",
    maxOutputTokens: 8000,
    contextWindow: 128000,
    inputPricePerMToken: 1.35,
    outputPricePerMToken: 5.40,
    supportsImages: false,
    supportsThinking: true,
    color: "#2563EB",
    icon: "🔬",
  },
};

export const DEFAULT_MODEL: ModelId = "sonnet4";

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful, harmless, and honest AI assistant. You provide clear, accurate, and well-structured responses. When you don't know something, you say so. You can format your responses using Markdown.`;

export function getModel(id: ModelId): AIModel {
  return AI_MODELS[id];
}

export function getModelList(): AIModel[] {
  return Object.values(AI_MODELS);
}