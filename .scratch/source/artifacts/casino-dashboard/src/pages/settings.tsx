import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetSettings, 
  getGetSettingsQueryKey,
  useUpdateSettings
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Save, Bot, DollarSign, Clock, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast.success("Settings updated successfully");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: (err: any) => {
        toast.error(`Failed to update settings: ${err.message}`);
      }
    }
  });

  const [formData, setFormData] = useState({
    groqApiKey: "",
    aiSystemPrompt: "",
    minDepositAmount: 0,
    minRedeemAmount: 0,
    maxDailyRedeem: 0,
    cashoutBlockedStart: "",
    cashoutBlockedEnd: ""
  });

  // Sync data when loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        groqApiKey: settings.groqApiKey || "",
        aiSystemPrompt: settings.aiSystemPrompt || "",
        minDepositAmount: settings.minDepositAmount,
        minRedeemAmount: settings.minRedeemAmount,
        maxDailyRedeem: settings.maxDailyRedeem,
        cashoutBlockedStart: settings.cashoutBlockedStart,
        cashoutBlockedEnd: settings.cashoutBlockedEnd
      });
    }
  }, [settings]);

  const handleSave = () => {
    const payload: typeof formData & { groqApiKey?: string } = { ...formData };
    // Only send groqApiKey if the user actually typed something new
    if (!payload.groqApiKey) {
      delete (payload as Record<string, unknown>).groqApiKey;
    }
    updateMutation.mutate({ data: payload });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure AI, limits, and operational hours.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">Configure AI, financial limits, and operational hours.</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          <Save size={16} /> Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> AI Configuration
            </CardTitle>
            <CardDescription>Configure the Telegram bot's conversational intelligence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groqApiKey">Groq API Key</Label>
              <Input 
                id="groqApiKey" 
                type="password"
                placeholder={settings?.groqApiKey ? "••••••••••••••••••••••••" : "Enter API Key"}
                value={formData.groqApiKey} 
                onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Leave blank to keep existing key unchanged.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">AI System Prompt</Label>
              <Textarea 
                id="systemPrompt" 
                className="min-h-[200px] font-mono text-sm"
                placeholder="You are a helpful casino assistant..."
                value={formData.aiSystemPrompt} 
                onChange={(e) => setFormData({ ...formData, aiSystemPrompt: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground">Instructions that dictate the bot's personality and rules.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Financial Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" /> Financial Limits
              </CardTitle>
              <CardDescription>Set minimums and maximums for customer requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minDeposit">Min Deposit ($)</Label>
                  <Input 
                    id="minDeposit" 
                    type="number"
                    min="0"
                    value={formData.minDepositAmount} 
                    onChange={(e) => setFormData({ ...formData, minDepositAmount: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minRedeem">Min Redeem ($)</Label>
                  <Input 
                    id="minRedeem" 
                    type="number"
                    min="0"
                    value={formData.minRedeemAmount} 
                    onChange={(e) => setFormData({ ...formData, minRedeemAmount: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="maxDaily">Max Daily Redeem ($)</Label>
                  <Input 
                    id="maxDaily" 
                    type="number"
                    min="0"
                    value={formData.maxDailyRedeem} 
                    onChange={(e) => setFormData({ ...formData, maxDailyRedeem: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Operational Hours
              </CardTitle>
              <CardDescription>Control when certain actions are allowed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-2 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Cashout Blocked Hours</p>
                  <p className="text-foreground/80 mt-1">During this window, customers cannot submit new redeem requests. Format: HH:MM (24h).</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blockStart">Block Start</Label>
                  <Input 
                    id="blockStart" 
                    type="time"
                    value={formData.cashoutBlockedStart} 
                    onChange={(e) => setFormData({ ...formData, cashoutBlockedStart: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blockEnd">Block End</Label>
                  <Input 
                    id="blockEnd" 
                    type="time"
                    value={formData.cashoutBlockedEnd} 
                    onChange={(e) => setFormData({ ...formData, cashoutBlockedEnd: e.target.value })} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
