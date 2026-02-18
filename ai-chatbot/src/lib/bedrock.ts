// src/lib/bedrock.ts

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { ModelId } from "@/types";

// ============================================================
// BEDROCK PROVIDER INITIALIZATION
// ============================================================

// Create the Amazon Bedrock provider instance
// Uses cross-region inference profiles for higher availability
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-west-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  // Optional: session token for temporary credentials
  // sessionToken: process.env.AWS_SESSION_TOKEN,
});

// ============================================================
// MODEL ID MAPPING
// ============================================================

// Cross-Region Inference Profiles (us.* prefix)
// These automatically route to available capacity across US regions
const BEDROCK_MODEL_MAP: Record<ModelId, string> = {
  "sonnet4": "us.anthropic.claude-sonnet-4-20250514",
  "opus4": "us.anthropic.claude-opus-4-20250514",
  "deepseek-r1": "us.deepseek.r1-v1:0",
};

// ============================================================
// MODEL CONFIGURATION
// ============================================================

interface ModelConfig {
  maxTokens: number;
  temperature: number;
  topP: number;
  stopSequences?: string[];
  // DeepSeek R1 specific
  supportsThinking: boolean;
}

const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  "sonnet4": {
    maxTokens: 8192,       // Default, can be up to 64K
    temperature: 0.7,
    topP: 0.95,
    supportsThinking: false,
  },
  "opus4": {
    maxTokens: 8192,       // Default, can be up to 32K
    temperature: 0.7,
    topP: 0.95,
    supportsThinking: false,
  },
  "deepseek-r1": {
    maxTokens: 8000,
    temperature: 0.6,      // R1 works better with lower temp
    topP: 0.95,
    supportsThinking: true,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get the Bedrock model instance for Vercel AI SDK
 */
export function getBedrockModel(modelId: ModelId) {
  const bedrockModelId = BEDROCK_MODEL_MAP[modelId];
  if (!bedrockModelId) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return bedrock(bedrockModelId);
}

/**
 * Get model configuration
 */
export function getModelConfig(modelId: ModelId): ModelConfig {
  const config = MODEL_CONFIGS[modelId];
  if (!config) {
    throw new Error(`Unknown model config: ${modelId}`);
  }
  return config;
}

/**
 * Get Bedrock model ID string
 */
export function getBedrockModelId(modelId: ModelId): string {
  return BEDROCK_MODEL_MAP[modelId];
}

/**
 * Validate if a model ID is valid
 */
export function isValidModel(modelId: string): modelId is ModelId {
  return modelId in BEDROCK_MODEL_MAP;
}

// Export the base bedrock provider
export { bedrock };