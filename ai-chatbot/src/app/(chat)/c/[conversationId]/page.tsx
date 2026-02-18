// src/app/(chat)/c/[conversationId]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { subscribeToMessages } from "@/lib/firebase";
import { Message } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentData } from "firebase/firestore";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { firebaseUser } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser || !conversationId) return;

    const unsubscribe = subscribeToMessages(
      firebaseUser.uid,
      conversationId,
      (msgs: DocumentData[]) => {
        setMessages(msgs as Message[]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, conversationId]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-8 py-3 border-b">
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={messages}
    />
  );
}