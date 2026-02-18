// src/components/sidebar/Sidebar.tsx

"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useChatStore } from "@/stores/chatStore";
import { useUIStore } from "@/stores/uiStore";
import { subscribeToConversations, deleteConversation } from "@/lib/firebase";
import { ConversationList } from "./ConversationList";
import { UserMenu } from "./UserMenu";
import { cn, groupConversations } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Search, PanelLeftClose, PanelLeft, Settings, Bot 
} from "lucide-react";
import { Conversation } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { firebaseUser } = useAuthContext();
  const { conversations, setConversations, currentConversationId } = useChatStore();
  const {
    sidebarOpen,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
    deleteDialogOpen,
    deleteTargetId,
    setDeleteDialog,
    setSettingsOpen,
  } = useUIStore();

  // Subscribe to conversations from Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = subscribeToConversations(
      firebaseUser.uid,
      (convs) => {
        setConversations(convs as Conversation[]);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, setConversations]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(
    (conv) =>
      !searchQuery ||
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = groupConversations(filteredConversations);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle select conversation
  const handleSelectConversation = useCallback(
    (convId: string) => {
      router.push(`/c/${convId}`);
    },
    [router]
  );

  // Handle delete conversation
  const handleDeleteConversation = useCallback(async () => {
    if (!firebaseUser || !deleteTargetId) return;
    
    try {
      await deleteConversation(firebaseUser.uid, deleteTargetId);
      toast.success("Conversation deleted");
      
      // If we deleted the current conversation, navigate to home
      if (deleteTargetId === currentConversationId) {
        router.push("/");
      }
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setDeleteDialog(false);
    }
  }, [firebaseUser, deleteTargetId, currentConversationId, setDeleteDialog, router]);

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full bg-sidebar border-r flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                <span className="font-bold text-sm">AI Chat</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleSidebar}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="px-3 pb-2">
              <Button
                onClick={handleNewChat}
                className="w-full justify-start gap-2 h-10"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Search */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-3 pb-2 overflow-hidden"
                >
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 text-sm bg-muted/50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                <ConversationList
                  groups={groupedConversations}
                  currentId={currentConversationId}
                  onSelect={handleSelectConversation}
                  onDelete={(id) => setDeleteDialog(true, id)}
                />
              </div>
            </ScrollArea>

            <Separator />

            {/* Bottom - User & Settings */}
            <div className="p-3">
              <UserMenu />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-3 left-3 z-50"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSidebar}
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => setDeleteDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConversation}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}