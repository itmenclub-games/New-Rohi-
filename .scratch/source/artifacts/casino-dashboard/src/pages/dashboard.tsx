import { useState } from "react";
import {
  useGetDashboardStats,
  useGetRecentMessages,
  getGetDashboardStatsQueryKey,
  getGetRecentMessagesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Wallet, HandCoins, Gamepad2, Gift, Activity, Users, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), refetchInterval: 10000 },
  });
  const { data: recentMessages, isLoading: messagesLoading } = useGetRecentMessages({
    query: { queryKey: getGetRecentMessagesQueryKey(), refetchInterval: 10000 },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          <>
            <StatCard 
              title="Pending Deposits" 
              value={stats.pendingDeposits} 
              icon={Wallet} 
              path="/deposits" 
              urgent={stats.pendingDeposits > 0} 
            />
            <StatCard 
              title="Pending Redeems" 
              value={stats.pendingRedeems} 
              icon={HandCoins} 
              path="/redeems" 
              urgent={stats.pendingRedeems > 0} 
            />
            <StatCard 
              title="New Game Accounts" 
              value={stats.pendingGameAccounts} 
              icon={Gamepad2} 
              path="/game-accounts" 
              urgent={stats.pendingGameAccounts > 0} 
            />
            <StatCard 
              title="Free Play Requests" 
              value={stats.pendingFreePlay} 
              icon={Gift} 
              path="/free-play" 
              urgent={stats.pendingFreePlay > 0} 
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Today's Activity</CardTitle>
              <CardDescription>Overview of today's processed requests and conversation volume.</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading || !stats ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Today's Deposits</p>
                    <p className="text-2xl font-bold">{stats.todayDepositsCount}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Today's Redeems</p>
                    <p className="text-2xl font-bold">{stats.todayRedeemsCount}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Active Chats</p>
                    <p className="text-2xl font-bold">{stats.activeConversations}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Staff Handling</p>
                    <p className="text-2xl font-bold text-primary">{stats.staffHandling}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full border-border shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Recent Messages
                </CardTitle>
                <Link href="/conversations" className="text-xs text-primary hover:underline">View All</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
              {messagesLoading || !recentMessages ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                  <Clock className="w-8 h-8 mb-2 opacity-20" />
                  <p>No recent messages.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentMessages.map((msg) => (
                    <Link key={msg.id} href={`/conversations?id=${msg.conversationId}`}>
                      <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                            {msg.senderType === 'bot' ? '🤖 Bot' : msg.senderType === 'staff' ? '👨‍💻 Staff' : msg.customerName}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-2">{msg.text}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  path,
  urgent = false
}: { 
  title: string; 
  value: number; 
  icon: any; 
  path: string;
  urgent?: boolean;
}) {
  return (
    <Link href={path}>
      <Card className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
        urgent 
          ? "bg-primary/10 border-primary/30 hover:border-primary/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]" 
          : "hover:border-primary/30 hover:bg-muted/30"
      }`}>
        {urgent && (
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
            <div className="absolute transform rotate-45 bg-primary text-primary-foreground text-[10px] font-bold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-sm">
              ACTION
            </div>
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl ${urgent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={`text-3xl font-bold mt-1 ${urgent ? "text-primary" : "text-foreground"}`}>
              {value}
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
