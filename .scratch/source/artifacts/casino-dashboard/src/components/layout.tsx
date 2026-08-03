import * as React from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "./theme-provider";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Wallet, 
  HandCoins, 
  Gamepad2, 
  Gift, 
  Dices, 
  CreditCard, 
  Sparkles, 
  HelpCircle, 
  MessageCircle, 
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut
} from "lucide-react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Badge } from "./ui/badge";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "./ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MessageSquare, label: "Conversations", path: "/conversations" },
  { icon: Wallet, label: "Deposits", path: "/deposits", badgeKey: "pendingDeposits" as const },
  { icon: HandCoins, label: "Redeems", path: "/redeems", badgeKey: "pendingRedeems" as const },
  { icon: Gamepad2, label: "Game Accounts", path: "/game-accounts", badgeKey: "pendingGameAccounts" as const },
  { icon: Gift, label: "Free Play", path: "/free-play", badgeKey: "pendingFreePlay" as const },
  { icon: Dices, label: "Games", path: "/games" },
  { icon: CreditCard, label: "Payment Methods", path: "/payment-methods" },
  { icon: Sparkles, label: "Bonuses", path: "/bonuses" },
  { icon: HelpCircle, label: "FAQs", path: "/faqs" },
  { icon: MessageCircle, label: "Telegram Buttons", path: "/telegram-buttons" },
  { icon: SettingsIcon, label: "Settings", path: "/settings" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  
  const { data: stats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), refetchInterval: 10000 },
  });

  // Update document title if there are pending items
  React.useEffect(() => {
    if (!stats) return;
    const totalPending = 
      stats.pendingDeposits + 
      stats.pendingRedeems + 
      stats.pendingGameAccounts + 
      stats.pendingFreePlay;
      
    if (totalPending > 0) {
      document.title = `(${totalPending}) Casino Admin`;
      // Play a sound hint theoretically if we tracked changes, but for now just title
    } else {
      document.title = `Casino Admin Dashboard`;
    }
  }, [stats]);

  // Update document title if there are pending items
  React.useEffect(() => {
    if (!stats) return;
    const totalPending = 
      stats.pendingDeposits + 
      stats.pendingRedeems + 
      stats.pendingGameAccounts + 
      stats.pendingFreePlay;
      
    if (totalPending > 0) {
      document.title = `(${totalPending}) Casino Admin`;
      // Play a sound hint theoretically if we tracked changes, but for now just title
    } else {
      document.title = `Casino Admin Dashboard`;
    }
  }, [stats]);

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="offcanvas">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-6 py-3">
            <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
                <Dices size={20} strokeWidth={2.5} />
              </div>
              Casino Admin
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const badgeCount = item.badgeKey && stats ? stats[item.badgeKey] : 0;
            
            return (
              <SidebarMenu key={item.path}>
                <SidebarMenuItem>
                  <Link href={item.path}>
                    <SidebarMenuButton 
                      isActive={isActive} 
                      className="w-full justify-start"
                    >
                      <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      <span className="text-sm">{item.label}</span>
                      {badgeCount > 0 && (
                        <Badge variant={isActive ? "default" : "secondary"} className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center font-mono text-[10px]">
                          {badgeCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            )
          })}
        </SidebarContent>
        
        <SidebarFooter className="px-3">
          <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
            <span>Staff Cockpit</span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
              <LogOut size={14} />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background/50 p-4 md:p-8">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-border bg-background backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground truncate">
              {navItems.find(i => location === i.path || (i.path !== "/" && location.startsWith(i.path)))?.label || "Dashboard"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                JD
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium leading-none">John Doe</span>
                <span className="text-xs text-muted-foreground">Admin</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
