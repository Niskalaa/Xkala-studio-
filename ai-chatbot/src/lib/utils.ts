// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Conversation, ConversationGroup } from "@/types";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: localeId });
}

// Group conversations by time period
export function groupConversations(conversations: Conversation[]): ConversationGroup[] {
  const groups: ConversationGroup[] = [];
  
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const last7Days: Conversation[] = [];
  const last30Days: Conversation[] = [];
  const older: Conversation[] = [];
  const pinned: Conversation[] = [];

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  // Sort by updatedAt descending
  const sorted = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  for (const conv of sorted) {
    if (conv.isPinned) {
      pinned.push(conv);
    } else if (isToday(conv.updatedAt)) {
      today.push(conv);
    } else if (isYesterday(conv.updatedAt)) {
      yesterday.push(conv);
    } else if (isAfter(conv.updatedAt, sevenDaysAgo)) {
      last7Days.push(conv);
    } else if (isAfter(conv.updatedAt, thirtyDaysAgo)) {
      last30Days.push(conv);
    } else {
      older.push(conv);
    }
  }

  if (pinned.length > 0) groups.push({ label: "📌 Pinned", conversations: pinned });
  if (today.length > 0) groups.push({ label: "Hari Ini", conversations: today });
  if (yesterday.length > 0) groups.push({ label: "Kemarin", conversations: yesterday });
  if (last7Days.length > 0) groups.push({ label: "7 Hari Terakhir", conversations: last7Days });
  if (last30Days.length > 0) groups.push({ label: "30 Hari Terakhir", conversations: last30Days });
  if (older.length > 0) groups.push({ label: "Lebih Lama", conversations: older });

  return groups;
}

// Generate a temporary ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Format token count
export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

// Calculate cost estimate
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number
): number {
  return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Extract title from first message
export function extractTitle(message: string): string {
  const cleaned = message.replace(/[#*`]/g, "").trim();
  const firstLine = cleaned.split("\n")[0];
  return truncate(firstLine, 50);
}