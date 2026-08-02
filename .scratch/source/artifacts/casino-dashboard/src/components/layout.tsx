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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col transition-colors duration-300">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
              <Dices size={20} strokeWidth={2.5} />
            </div>
            Casino Admin
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const badgeCount = item.badgeKey && stats ? stats[item.badgeKey] : 0;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`
                  flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-200 group
                  ${isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}
                `}>
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <Badge variant={isActive ? "default" : "secondary"} className="h-5 min-w-5 px-1.5 flex items-center justify-center font-mono text-[10px]">
                      {badgeCount}
                    </Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center justify-between px-2 text-sm text-sidebar-foreground/60">
            <span>Staff Cockpit</span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
              <LogOut size={14} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background/50">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-border bg-background backdrop-blur-sm z-10 sticky top-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {navItems.find(i => location === i.path || (i.path !== "/" && location.startsWith(i.path)))?.label || "Dashboard"}
          </h1>
          
          <div className="flex items-center gap-4">
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
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">John Doe</span>
                <span className="text-xs text-muted-foreground">Admin</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
