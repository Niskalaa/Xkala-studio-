// src/app/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // User is logged in - the (chat) layout will handle showing the chat
        // This page IS the new chat page under (chat) layout
        // We need to redirect to (chat) group
      } else {
        router.push("/login");
      }
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-pulse">
          <Bot className="w-12 h-12 text-primary" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  // If authenticated, show chat layout
  // This is handled by the (chat) route group
  // We'll redirect there
  if (isAuthenticated) {
    router.push("/");
  }

  return null;
}