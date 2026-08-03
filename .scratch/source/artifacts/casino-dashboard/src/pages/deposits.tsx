import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListDeposits, 
  getListDepositsQueryKey,
  useApproveDeposit,
  useRejectDeposit,
  useCompleteDeposit,
  ListDepositsStatus,
  useListPaymentMethods,
  getListPaymentMethodsQueryKey,
  useSendPaymentTag,
  DepositRequest,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "wouter";
import { ExternalLink, Check, X, CheckCircle2, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequestMessageBox } from "@/components/request-message-box";

export default function Deposits() {
  const [status, setStatus] = useState<ListDepositsStatus>("pending");
  const queryClient = useQueryClient();
  
  const { data: deposits, isLoading } = useListDeposits(
    { status }, 
    { query: { queryKey: getListDepositsQueryKey({ status }) } }
  );
  const { data: methods } = useListPaymentMethods({
    query: { queryKey: getListPaymentMethodsQueryKey() },
  });

  const approveMutation = useApproveDeposit({
    mutation: {
      onSuccess: () => {
        toast.success("Deposit approved successfully");
        queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
      },
      onError: (error: any) => {
        toast.error(`Failed to approve: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const rejectMutation = useRejectDeposit({
    mutation: {
      onSuccess: () => {
        toast.success("Deposit rejected");
        queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
        setRejectDialogOpen(false);
        setRejectReason("");
      },
      onError: (error: any) => {
        toast.error(`Failed to reject: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const completeMutation = useCompleteDeposit({
    mutation: {
      onSuccess: () => {
        toast.success("Deposit marked as completed");
        queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
      },
      onError: (error: any) => {
        toast.error(`Failed to complete: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<DepositRequest | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");

  const openPaymentDialog = (deposit: DepositRequest) => {
    setActiveDeposit(deposit);
    const matchingMethod = methods?.find((method) => method.name === deposit.paymentMethod);
    setSelectedMethodId(matchingMethod ? String(matchingMethod.id) : "");
    setSelectedTagId("");
    setPaymentDialogOpen(true);
  };

  const selectedMethod = methods?.find((method) => String(method.id) === selectedMethodId);
  const sendPaymentTagMutation = useSendPaymentTag({
    mutation: {
      onSuccess: () => {
        toast.success("Payment details sent to customer");
        queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
        setPaymentDialogOpen(false);
        setActiveDeposit(null);
        setSelectedMethodId("");
        setSelectedTagId("");
      },
      onError: (error: any) => {
        toast.error(`Failed to send payment details: ${error?.message || "Unknown error"}`);
      },
    },
  });

  const submitPaymentTag = () => {
    if (!activeDeposit || !selectedTagId || !selectedMethodId) return;
    sendPaymentTagMutation.mutate({
      id: Number(selectedMethodId),
      data: {
        tagId: Number(selectedTagId),
        conversationId: activeDeposit.conversationId,
        depositId: activeDeposit.id,
      },
    });
  };

  // Rejection Dialog State
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectClick = (id: number) => {
    setRejectId(id);
    setRejectDialogOpen(true);
  };

  const submitReject = () => {
    if (rejectId === null) return;
    rejectMutation.mutate({ id: rejectId, data: { reason: rejectReason } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deposits</h2>
          <p className="text-muted-foreground">Manage customer deposit requests.</p>
        </div>
        
        <Tabs value={status} onValueChange={(v) => setStatus(v as ListDepositsStatus)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !deposits || deposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No deposits found for this status.
                  </TableCell>
                </TableRow>
              ) : (
                deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{deposit.customerName}</span>
                        <Link href={`/conversations?id=${deposit.conversationId}`}>
                          <span className="text-xs text-primary hover:underline flex items-center gap-1">
                            Chat #{deposit.conversationId} <ExternalLink size={10} />
                          </span>
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {deposit.amount != null
                        ? `$${deposit.amount.toFixed(2)}`
                        : <span className="text-muted-foreground">Waiting for amount</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{deposit.paymentMethod || 'Unknown'}</span>
                        {deposit.screenshotUrl && (
                          <div className="relative inline-block group">
                            <img 
                              src={deposit.screenshotUrl} 
                              alt="Payment receipt" 
                              className="h-12 w-auto rounded border border-border object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => {
                                window.open(deposit.screenshotUrl, '_blank', 'noopener,noreferrer');
                              }}
                              onError={(e) => {
                                // If image fails to load, show fallback link
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLAnchorElement;
                                if (fallback) fallback.style.display = 'inline-flex';
                              }}
                            />
                            <a 
                              href={deposit.screenshotUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 ml-2"
                              style={{ display: 'none' }} // Hidden by default, shown if image fails
                            >
                              View Receipt <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                                // Find the next sibling which should be the fallback link
                                const fallback = target.nextElementSibling as HTMLAnchorElement;
                                if (fallback) fallback.style.display = 'inline-flex';
                              }}
                            />
                            <a 
                              href={deposit.screenshotUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 ml-2"
                              style={{ display: 'none' }} // Hidden by default, shown if image fails
                            >
                              View Receipt <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                        {deposit.details && (
                          <span className="text-xs text-muted-foreground max-w-[220px] truncate" title={deposit.details}>
                            Note: {deposit.details}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(deposit.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        deposit.status === 'pending' ? 'warning' :
                        deposit.status === 'approved' ? 'info' :
                        deposit.status === 'completed' ? 'success' : 'destructive'
                      }>
                        {deposit.status.toUpperCase()}
                      </Badge>
                      {deposit.status === 'rejected' && deposit.rejectionReason && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={deposit.rejectionReason}>
                          {deposit.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {deposit.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-500 border-green-500/20 hover:bg-green-500/10 hover:text-green-600"
                              onClick={() => approveMutation.mutate({ id: deposit.id })}
                              disabled={approveMutation.isPending}
                            >
                              <Check size={16} className="mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                              onClick={() => handleRejectClick(deposit.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X size={16} className="mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {deposit.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                            onClick={() => openPaymentDialog(deposit)}
                          >
                            <Send size={14} className="mr-1" /> Send payment details
                          </Button>
                        )}
                        {deposit.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => completeMutation.mutate({ id: deposit.id })}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle2 size={16} className="mr-1" /> Complete
                          </Button>
                        )}
                        <RequestMessageBox conversationId={deposit.conversationId} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this deposit? Provide a reason for the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                placeholder="e.g. Invalid receipt, amount mismatch, etc." 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={rejectMutation.isPending}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send payment details</DialogTitle>
            <DialogDescription>
              Choose any enabled payment method and one of its tags for {activeDeposit?.customerName}.
              This will be sent to the same Telegram conversation and logged in Conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={selectedMethodId}
                onValueChange={(value) => {
                  setSelectedMethodId(value);
                  setSelectedTagId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {(methods ?? []).filter((method) => method.enabled).map((method) => (
                    <SelectItem key={method.id} value={String(method.id)}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment tag/account</Label>
              <Select value={selectedTagId} onValueChange={setSelectedTagId} disabled={!selectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag/account..." />
                </SelectTrigger>
                <SelectContent>
                  {(selectedMethod?.tags ?? []).map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.label} — {tag.accountDetails}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMethod && selectedMethod.tags.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This method has no tags configured yet. Add one from Payment Methods.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={submitPaymentTag}
              disabled={sendPaymentTagMutation.isPending || !selectedTagId}
            >
              <Send size={15} className="mr-2" /> Send to customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
