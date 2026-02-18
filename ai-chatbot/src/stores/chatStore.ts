// src/stores/chatStore.ts

import { create } from "zustand";
import { ModelId, Message, Conversation } from "@/types";
import { DEFAULT_MODEL } from "@/lib/models";

interface ChatState {
  // Current conversation
  currentConversationId: string | null;
  currentModel: ModelId;
  conversations: Conversation[];
  messages: Message[];
  
  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamingThinking: string;
  
  // Input state
  inputValue: string;
  
  // Actions
  setCurrentConversation: (id: string | null) => void;
  setCurrentModel: (model: ModelId) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  setStreamingThinking: (thinking: string) => void;
  setInputValue: (value: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  currentModel: DEFAULT_MODEL,
  conversations: [],
  messages: [],
  isStreaming: false,
  streamingContent: "",
  streamingThinking: "",
  inputValue: "",

  setCurrentConversation: (id) => set({ currentConversationId: id }),
  
  setCurrentModel: (model) => set({ currentModel: model }),
  
  setConversations: (conversations) => set({ conversations }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
  
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  
  setStreamingThinking: (streamingThinking) => set({ streamingThinking }),
  
  setInputValue: (inputValue) => set({ inputValue }),
  
  reset: () =>
    set({
      currentConversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      streamingThinking: "",
      inputValue: "",
    }),
}));