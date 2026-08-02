import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPaymentMethods, 
  getListPaymentMethodsQueryKey,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  useTogglePaymentMethod,
  useAddPaymentTag,
  useDeletePaymentTag,
  useSendPaymentTag,
  useListPaymentMethodRequests,
  getListPaymentMethodRequestsQueryKey,
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Tag, Send } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestMessageBox } from "@/components/request-message-box";

export default function PaymentMethods() {
  const queryClient = useQueryClient();
  const { data: methods, isLoading } = useListPaymentMethods({ query: { queryKey: getListPaymentMethodsQueryKey() } });
  const { data: methodRequests, isLoading: requestsLoading } = useListPaymentMethodRequests(
    { status: "pending" },
    { query: { queryKey: getListPaymentMethodRequestsQueryKey({ status: "pending" }), refetchInterval: 10000 } },
  );

  const createMutation = useCreatePaymentMethod({
    mutation: {
      onSuccess: () => {
        toast.success("Payment method created");
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const updateMutation = useUpdatePaymentMethod({
    mutation: {
      onSuccess: () => {
        toast.success("Payment method updated");
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const deleteMutation = useDeletePaymentMethod({
    mutation: {
      onSuccess: () => {
        toast.success("Payment method deleted");
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
      }
    }
  });

  const toggleMutation = useTogglePaymentMethod({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
      }
    }
  });

  // Method Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "" });
    setFormOpen(true);
  };

  const openEdit = (method: any) => {
    setEditingId(method.id);
    setFormData({ name: method.name });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!formData.name) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  // Tag Form State
  const addTagMutation = useAddPaymentTag({
    mutation: {
      onSuccess: () => {
        toast.success("Tag added");
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
        setTagFormOpen(false);
      }
    }
  });

  const deleteTagMutation = useDeletePaymentTag({
    mutation: {
      onSuccess: () => {
        toast.success("Tag removed");
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
      }
    }
  });

  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [activeMethodId, setActiveMethodId] = useState<number | null>(null);
  const [tagData, setTagData] = useState({ label: "", accountDetails: "" });

  const openAddTag = (methodId: number) => {
    setActiveMethodId(methodId);
    setTagData({ label: "", accountDetails: "" });
    setTagFormOpen(true);
  };

  const submitTag = () => {
    if (!activeMethodId || !tagData.label || !tagData.accountDetails) return;
    addTagMutation.mutate({ id: activeMethodId, data: tagData });
  };

  // Send Tag State
  const { data: conversations } = useListConversations(
    undefined,
    {
      query: {
        queryKey: getListConversationsQueryKey(),
        enabled: true,
      },
    }
  );
  const staffConversations = conversations?.filter((conv) => conv.status !== "resolved") ?? [];
  
  const sendTagMutation = useSendPaymentTag({
    mutation: {
      onSuccess: () => {
        toast.success("Payment details sent to customer");
        setSendFormOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey() });
      }
    }
  });

  const [sendingRequestTag, setSendingRequestTag] = useState<
    Record<number, { methodId: number; tagId: string }>
  >({});

  const submitRequestTag = (request: NonNullable<typeof methodRequests>[number]) => {
    const selection = sendingRequestTag[request.id];
    if (!selection?.tagId) return;

    sendTagMutation.mutate({
      id: request.paymentMethodId,
      data: {
        tagId: Number(selection.tagId),
        conversationId: request.conversationId,
        requestId: request.id,
      },
    });
  };

  const [sendFormOpen, setSendFormOpen] = useState(false);
  const [sendingTagId, setSendingTagId] = useState<number | null>(null);
  const [sendingMethodId, setSendingMethodId] = useState<number | null>(null);
  const [sendToConversationId, setSendToConversationId] = useState<string>("");

  const openSendTag = (tagId: number, methodId: number) => {
    setSendingTagId(tagId);
    setSendingMethodId(methodId);
    setSendToConversationId("");
    setSendFormOpen(true);
  };

  const submitSendTag = () => {
    if (!sendingTagId || !sendingMethodId || !sendToConversationId) return;
    sendTagMutation.mutate({ 
      id: sendingMethodId,
      data: { tagId: sendingTagId, conversationId: parseInt(sendToConversationId) } 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Methods</h2>
          <p className="text-muted-foreground">Manage deposit methods and their account tags (CashApp, Crypto, etc.).</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Add Method
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Customer Payment Method Requests</span>
            <Badge variant="secondary">{methodRequests?.length ?? 0} pending</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customers select a method from Telegram here. Send the matching account tag from this queue.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {requestsLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !methodRequests?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No pending payment method requests.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {methodRequests.map((request) => {
                const method = methods?.find((candidate) => candidate.id === request.paymentMethodId);
                return (
                  <div key={request.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1.5fr] lg:items-start">
                    <div>
                      <p className="font-medium">{request.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Telegram {request.customerTelegramId} · Request #{request.id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{request.paymentMethodName}</p>
                      <p className="text-xs text-muted-foreground">Conversation #{request.conversationId}</p>
                      {!method && (
                        <p className="text-xs text-destructive mt-1">This method was removed; review the conversation.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={sendingRequestTag[request.id]?.tagId ?? ""}
                          onValueChange={(tagId) =>
                            setSendingRequestTag((current) => ({
                              ...current,
                              [request.id]: { methodId: method?.id ?? 0, tagId },
                            }))
                          }
                          disabled={!method}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a tag to send..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(method?.tags ?? []).map((tag) => (
                              <SelectItem key={tag.id} value={String(tag.id)}>
                                {tag.label} — {tag.accountDetails}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => submitRequestTag(request)}
                          disabled={!sendingRequestTag[request.id]?.tagId || sendTagMutation.isPending}
                        >
                          <Send size={14} className="mr-1" /> Send
                        </Button>
                      </div>
                      {!method?.tags.length && method && (
                        <p className="text-xs text-muted-foreground">No tags configured for this method.</p>
                      )}
                      <RequestMessageBox conversationId={request.conversationId} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !methods || methods.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No payment methods configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {methods.map((method) => (
            <Card key={method.id} className={`border-border shadow-sm ${!method.enabled ? 'opacity-70' : ''}`}>
              <CardHeader className="pb-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">{method.name}</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={method.enabled} 
                      onCheckedChange={() => toggleMutation.mutate({ id: method.id })}
                    />
                    <span className="text-xs font-medium text-muted-foreground">{method.enabled ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="flex gap-1 border-l border-border pl-3">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(method)}>
                      <Edit size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => {
                      if (window.confirm("Delete entire payment method?")) {
                        deleteMutation.mutate({ id: method.id });
                      }
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Account Tags</h4>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddTag(method.id)}>
                    <Plus size={12} className="mr-1" /> Add Tag
                  </Button>
                </div>
                
                {method.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-md border border-dashed border-border">
                    No account tags. Add a tag (e.g., $Cashtag) to use this method.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {method.tags.map((tag) => (
                      <div key={tag.id} className="p-3 bg-background border border-border rounded-md group hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{tag.label}</Badge>
                            <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-blue-500" title="Send to customer" onClick={() => openSendTag(tag.id, method.id)}>
                              <Send size={12} className="mr-1" /> Send
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" title="Delete tag" onClick={() => {
                              if(window.confirm("Delete this tag?")) deleteTagMutation.mutate({ id: method.id, tagId: tag.id });
                            }}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-mono break-all">{tag.accountDetails}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Method Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Method Name (e.g. CashApp, Bitcoin)</Label>
            <Input 
              id="name" 
              className="mt-2"
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending || !formData.name}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagFormOpen} onOpenChange={setTagFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account Tag</DialogTitle>
            <DialogDescription>Add specific receiving accounts for this method.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Tag Label (e.g. $Cashtag 1, BTC Wallet A)</Label>
              <Input 
                id="label" 
                value={tagData.label} 
                onChange={(e) => setTagData({ ...tagData, label: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Account Details (Address/Tag)</Label>
              <Input 
                id="details" 
                value={tagData.accountDetails} 
                onChange={(e) => setTagData({ ...tagData, accountDetails: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagFormOpen(false)}>Cancel</Button>
            <Button onClick={submitTag} disabled={addTagMutation.isPending || !tagData.label || !tagData.accountDetails}>
              Add Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Tag Dialog */}
      <Dialog open={sendFormOpen} onOpenChange={setSendFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Tag to Customer</DialogTitle>
            <DialogDescription>Send this payment info directly to an open conversation.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Conversation</Label>
              <Select value={sendToConversationId} onValueChange={setSendToConversationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an open chat..." />
                </SelectTrigger>
                <SelectContent>
                  {staffConversations.length === 0 ? (
                    <SelectItem value="none" disabled>No active conversations</SelectItem>
                  ) : (
                    staffConversations.map(conv => (
                      <SelectItem key={conv.id} value={conv.id.toString()}>
                        {conv.customerName} (ID: {conv.id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendFormOpen(false)}>Cancel</Button>
            <Button onClick={submitSendTag} disabled={sendTagMutation.isPending || !sendToConversationId || sendToConversationId === "none"}>
              <Send size={16} className="mr-2" /> Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
