// src/lib/firebase-admin.ts

import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Construct service account from env vars
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
  // Handle escaped newlines in private key
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
};

// Initialize Firebase Admin (singleton)
const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

// Export admin services
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

// ============================================================
// AUTH VERIFICATION
// ============================================================
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

// ============================================================
// USER OPERATIONS (Server-side)
// ============================================================
export async function getServerUserProfile(userId: string) {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  return { id: userDoc.id, ...userDoc.data() };
}

export async function updateServerUserUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number
) {
  const totalTokens = inputTokens + outputTokens;
  const userRef = adminDb.collection("users").doc(userId);

  await userRef.update({
    "usage.totalTokens": FieldValue.increment(totalTokens),
    "usage.monthlyTokens": FieldValue.increment(totalTokens),
  });
}

export async function checkUserQuota(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const data = userDoc.data()!;
  const usage = data.usage || {};
  const monthlyTokens = usage.monthlyTokens || 0;
  const monthlyLimit = usage.monthlyLimit || 1_000_000; // Default 1M

  // Check if monthly reset is needed
  const lastReset = usage.lastReset?.toDate() || new Date(0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (lastReset < monthStart) {
    // Reset monthly counter
    await adminDb
      .collection("users")
      .doc(userId)
      .update({
        "usage.monthlyTokens": 0,
        "usage.lastReset": FieldValue.serverTimestamp(),
      });
    return { allowed: true, remaining: monthlyLimit, limit: monthlyLimit };
  }

  const remaining = monthlyLimit - monthlyTokens;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: monthlyLimit,
  };
}

// ============================================================
// CONVERSATION OPERATIONS (Server-side)
// ============================================================
export async function serverCreateConversation(
  userId: string,
  data: {
    title: string;
    model: string;
  }
) {
  const convRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("conversations")
    .add({
      title: data.title,
      model: data.model,
      lastMessage: "",
      messageCount: 0,
      isPinned: false,
      tags: [],
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

  return convRef.id;
}

export async function serverGetConversation(userId: string, conversationId: string) {
  const convDoc = await adminDb
    .collection("users")
    .doc(userId)
    .collection("conversations")
    .doc(conversationId)
    .get();

  if (!convDoc.exists) return null;
  return { id: convDoc.id, ...convDoc.data() };
}

export async function serverUpdateConversation(
  userId: string,
  conversationId: string,
  data: Record<string, unknown>
) {
  await adminDb
    .collection("users")
    .doc(userId)
    .collection("conversations")
    .doc(conversationId)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

// ============================================================
// MESSAGE OPERATIONS (Server-side)
// ============================================================
export async function serverAddMessage(
  userId: string,
  conversationId: string,
  message: {
    role: string;
    content: string;
    thinking?: string;
    model?: string;
    tokens?: { input: number; output: number; total: number };
  }
) {
  const msgRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .add({
      ...message,
      feedback: null,
      attachments: [],
      createdAt: FieldValue.serverTimestamp(),
    });

  // Update conversation metadata
  await serverUpdateConversation(userId, conversationId, {
    lastMessage: message.content.substring(0, 100),
    messageCount: FieldValue.increment(1),
  });

  return msgRef.id;
}

export async function serverGetMessages(
  userId: string,
  conversationId: string,
  limitCount: number = 50
) {
  const snapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function serverGenerateTitle(
  userId: string,
  conversationId: string,
  firstMessage: string
) {
  // Simple title extraction (first 50 chars)
  // In production, you could use AI to generate a title
  const title =
    firstMessage.length > 50
      ? firstMessage.substring(0, 50) + "..."
      : firstMessage;

  await serverUpdateConversation(userId, conversationId, { title });
  return title;
}

// Exports
export { adminAuth, adminDb, FieldValue };