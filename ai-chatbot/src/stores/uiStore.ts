// src/stores/uiStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarWidth: number;
  
  // Modals
  settingsOpen: boolean;
  modelSelectorOpen: boolean;
  deleteDialogOpen: boolean;
  deleteTargetId: string | null;
  
  // Search
  searchQuery: string;
  searchOpen: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setModelSelectorOpen: (open: boolean) => void;
  setDeleteDialog: (open: boolean, targetId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarWidth: 280,
      settingsOpen: false,
      modelSelectorOpen: false,
      deleteDialogOpen: false,
      deleteTargetId: null,
      searchQuery: "",
      searchOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setModelSelectorOpen: (open) => set({ modelSelectorOpen: open }),
      setDeleteDialog: (open, targetId = null) =>
        set({ deleteDialogOpen: open, deleteTargetId: targetId }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
);