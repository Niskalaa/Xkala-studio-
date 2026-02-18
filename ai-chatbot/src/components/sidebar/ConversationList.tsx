// src/components/sidebar/ConversationList.tsx

"use client";

import { memo } from "react";
import { ConversationGroup, Conversation, ModelId } from "@/types";
import { cn, truncate } from "@/lib/utils";
import { getModel } from "@/lib/models";
import { MoreHorizontal, Pin, Trash2, Share, Zap, Brain, FlaskConical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

const MODEL_ICONS_SMALL: Record<ModelId, React.ReactNode> = {
  "sonnet4": <Zap className="w-3 h-3" />,
  "opus4": <Brain className="w-3 h-3" />,
  "deepseek-r1": <FlaskConical className="w-3 h-3" />,
};

interface ConversationListProps {
  groups: ConversationGroup[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ConversationList = memo(function ConversationList({
  groups,
  currentId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground mt-1">Start a new chat!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-muted-foreground px-2 mb-1">
            {group.label}
          </h3>
          <div className="space-y-0.5">
            {group.conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const model = getModel(conversation.model);

  return (
    <motion.div
      whileHover={{ x: 2 }}
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "hover:bg-sidebar-hover text-sidebar-foreground/80"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      {/* Model icon */}
      <div
        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
        style={{ color: model.color }}
      >
        {MODEL_ICONS_SMALL[conversation.model]}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {conversation.title || "New Chat"}
        </p>
      </div>

      {/* Pin indicator */}
      {conversation.isPinned && (
        <Pin className="w-3 h-3 text-muted-foreground shrink-0" />
      )}

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem>
            <Pin className="w-4 h-4 mr-2" />
            {conversation.isPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Share className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}