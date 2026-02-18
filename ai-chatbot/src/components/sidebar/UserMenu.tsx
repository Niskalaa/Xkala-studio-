// src/components/sidebar/UserMenu.tsx

"use client";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { useUIStore } from "@/stores/uiStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Moon, Sun, Monitor, User } from "lucide-react";
import { useTheme } from "next-themes";

export function UserMenu() {
  const { user, logout } = useAuthContext();
  const { setSettingsOpen } = useUIStore();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-sidebar-hover transition-colors text-left">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback className="text-xs">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Theme Selection */}
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Theme</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                theme === "light" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                theme === "dark" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors ${
                theme === "system" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Auto
            </button>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}