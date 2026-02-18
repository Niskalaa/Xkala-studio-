// src/lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser 
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ============================================================
// AUTH FUNCTIONS
// ============================================================
export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithub() {
  return signInWithPopup(auth, githubProvider);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ============================================================
// FIRESTORE - USER FUNCTIONS
// ============================================================
export async function createUserProfile(user: FirebaseUser) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      photoURL: user.photoURL,
      plan: "free",
      preferences: {
        defaultModel: "sonnet4",
        theme: "system",
        systemPrompt: "",
        sendWithEnter: true,
        showTokenCount: true,
        fontSize: "md",
      },
      usage: {
        totalTokens: 0,
        monthlyTokens: 0,
        monthlyLimit: 1_000_000, // 1M tokens free tier
        lastReset: serverTimestamp(),
      },
      createdAt: serverTimestamp(),
    });
  }
  
  return userRef;
}

export async function getUserProfile(userId: string) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return null;
  
  const data = userSnap.data();
  return {
    id: userSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    usage: {
      ...data.usage,
      lastReset: (data.usage?.lastReset as Timestamp)?.toDate() || new Date(),
    },
  };
}

export async function updateUserPreferences(
  userId: string, 
  preferences: Partial<DocumentData>
) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    [`preferences`]: preferences,
  });
}

// ============================================================
// FIRESTORE - CONVERSATION FUNCTIONS
// ============================================================
export async function createConversation(
  userId: string, 
  model: string, 
  title: string = "New Chat"
) {
  const convRef = await addDoc(
    collection(db, "users", userId, "conversations"),
    {
      title,
      model,
      lastMessage: "",
      messageCount: 0,
      isPinned: false,
      tags: [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }
  );
  return convRef.id;
}

export function subscribeToConversations(
  userId: string,
  callback: (conversations: DocumentData[]) => void
) {
  const q = query(
    collection(db, "users", userId, "conversations"),
    orderBy("updatedAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const conversations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        ...data,
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      };
    });
    callback(conversations);
  });
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  data: Partial<DocumentData>
) {
  const convRef = doc(db, "users", userId, "conversations", conversationId);
  await updateDoc(convRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteConversation(userId: string, conversationId: string) {
  // Delete all messages first
  const messagesRef = collection(
    db, "users", userId, "conversations", conversationId, "messages"
  );
  const messagesSnap = await getDocs(messagesRef);
  
  const deletePromises = messagesSnap.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Then delete conversation
  const convRef = doc(db, "users", userId, "conversations", conversationId);
  await deleteDoc(convRef);
}

// ============================================================
// FIRESTORE - MESSAGE FUNCTIONS
// ============================================================
export async function addMessage(
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
  const msgRef = await addDoc(
    collection(db, "users", userId, "conversations", conversationId, "messages"),
    {
      ...message,
      feedback: null,
      attachments: [],
      createdAt: serverTimestamp(),
    }
  );

  // Update conversation metadata
  await updateConversation(userId, conversationId, {
    lastMessage: message.content.substring(0, 100),
    messageCount: message.role === "user" ? undefined : undefined, // Will increment in backend
  });

  return msgRef.id;
}

export function subscribeToMessages(
  userId: string,
  conversationId: string,
  callback: (messages: DocumentData[]) => void
) {
  const q = query(
    collection(db, "users", userId, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      };
    });
    callback(messages);
  });
}

export async function updateMessageFeedback(
  userId: string,
  conversationId: string,
  messageId: string,
  feedback: "good" | "bad" | null
) {
  const msgRef = doc(
    db, "users", userId, "conversations", conversationId, "messages", messageId
  );
  await updateDoc(msgRef, { feedback });
}

// Exports
export { app, auth, db };
export type { FirebaseUser };