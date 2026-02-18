// src/types/index.ts

// ============================================================
// MODEL TYPES
// ============================================================
export type ModelId = "sonnet4" | "opus4" | "deepseek-r1";

export interface AIModel {
  id: ModelId;
  name: string;
  displayName: string;
  description: string;
  bedrockModelId: string;
  maxOutputTokens: number;
  contextWindow: number;
  inputPricePerMToken: number;
  outputPricePerMToken: number;
  supportsImages: boolean;
  supportsThinking: boolean;
  color: string;
  icon: string;
}

// ============================================================
// MESSAGE TYPES
// ============================================================
export type MessageRole = "user" | "assistant" | "system";

export interface Attachment {
  id: string;
  type: "image" | "file";
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  thinking?: string; // For DeepSeek R1 reasoning
  model?: ModelId;
  tokens?: TokenUsage;
  attachments?: Attachment[];
  feedback?: "good" | "bad" | null;
  isStreaming?: boolean;
  createdAt: Date;
}

// ============================================================
// CONVERSATION TYPES
// ============================================================
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: ModelId;
  lastMessage: string;
  messageCount: number;
  isPinned: boolean;
  tags: string[];
  updatedAt: Date;
  createdAt: Date;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}

// ============================================================
// USER TYPES
// ============================================================
export type UserPlan = "free" | "pro" | "enterprise";

export interface UserPreferences {
  defaultModel: ModelId;
  theme: "light" | "dark" | "system";
  systemPrompt: string;
  sendWithEnter: boolean;
  showTokenCount: boolean;
  fontSize: "sm" | "md" | "lg";
}

export interface UserUsage {
  totalTokens: number;
  monthlyTokens: number;
  monthlyLimit: number;
  lastReset: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  plan: UserPlan;
  preferences: UserPreferences;
  usage: UserUsage;
  createdAt: Date;
}

// ============================================================
// API TYPES
// ============================================================
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  model: ModelId;
  conversationId?: string;
  systemPrompt?: string;
}

export interface APIError {
  error: string;
  code: string;
  status: number;
}