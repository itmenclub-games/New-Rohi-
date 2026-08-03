import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListRedeems, 
  getListRedeemsQueryKey,
  useApproveRedeem,
  useRejectRedeem,
  useCompleteRedeem,
  ListRedeemsStatus,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "wouter";
import { ExternalLink, Check, X, CheckCircle2 } from "lucide-react";

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
import { RequestMessageBox } from "@/components/request-message-box";

export default function Redeems() {
  const [status, setStatus] = useState<ListRedeemsStatus>("pending");
  const queryClient = useQueryClient();
  
  const { data: redeems, isLoading } = useListRedeems(
    { status }, 
    { query: { queryKey: getListRedeemsQueryKey({ status }) } }
  );

  const approveMutation = useApproveRedeem({
    mutation: {
      onSuccess: () => {
        toast.success("Redeem approved successfully");
        queryClient.invalidateQueries({ queryKey: getListRedeemsQueryKey() });
      },
      onError: (error: any) => {
        toast.error(`Failed to approve: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const rejectMutation = useRejectRedeem({
    mutation: {
      onSuccess: () => {
        toast.success("Redeem rejected");
        queryClient.invalidateQueries({ queryKey: getListRedeemsQueryKey() });
        setRejectDialogOpen(false);
        setRejectReason("");
      },
      onError: (error: any) => {
        toast.error(`Failed to reject: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const completeMutation = useCompleteRedeem({
    mutation: {
      onSuccess: () => {
        toast.success("Redeem marked as completed");
        queryClient.invalidateQueries({ queryKey: getListRedeemsQueryKey() });
      },
      onError: (error: any) => {
        toast.error(`Failed to complete: ${error?.message || 'Unknown error'}`);
      }
    }
  });

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
          <h2 className="text-2xl font-bold tracking-tight">Redeems</h2>
          <p className="text-muted-foreground">Manage customer cashout requests.</p>
        </div>
        
        <Tabs value={status} onValueChange={(v) => setStatus(v as ListRedeemsStatus)}>
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
                <TableHead>Game</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Dest. Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !redeems || redeems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No redeems found for this status.
                  </TableCell>
                </TableRow>
              ) : (
                redeems.map((redeem) => (
                  <TableRow key={redeem.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{redeem.customerName}</span>
                        <Link href={`/conversations?id=${redeem.conversationId}`}>
                          <span className="text-xs text-primary hover:underline flex items-center gap-1">
                            Chat #{redeem.conversationId} <ExternalLink size={10} />
                          </span>
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {redeem.gameName || "Not specified"}
                    </TableCell>
                    <TableCell className="font-mono font-medium text-amber-500">
                      {redeem.amount != null
                        ? `$${redeem.amount.toFixed(2)}`
                        : <span className="text-muted-foreground">Not requested</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{redeem.paymentMethod || 'Unknown'}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm font-mono truncate" title={redeem.paymentDetails || ''}>
                        {redeem.paymentDetails || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(redeem.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        redeem.status === 'pending' ? 'warning' :
                        redeem.status === 'approved' ? 'info' :
                        redeem.status === 'completed' ? 'success' : 'destructive'
                      }>
                        {redeem.status.toUpperCase()}
                      </Badge>
                      {redeem.status === 'rejected' && redeem.rejectionReason && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={redeem.rejectionReason}>
                          {redeem.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {redeem.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-500 border-green-500/20 hover:bg-green-500/10 hover:text-green-600"
                              onClick={() => approveMutation.mutate({ id: redeem.id })}
                              disabled={approveMutation.isPending}
                            >
                              <Check size={16} className="mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                              onClick={() => handleRejectClick(redeem.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X size={16} className="mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {redeem.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => completeMutation.mutate({ id: redeem.id })}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle2 size={16} className="mr-1" /> Complete
                          </Button>
                        )}
                        <RequestMessageBox
                          conversationId={redeem.conversationId}
                          allowInformationRequest={redeem.status === "pending"}
                        />
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
            <DialogTitle>Reject Redeem</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this redeem request? Provide a reason for the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                placeholder="e.g. Account not verified, suspected fraud, below minimum." 
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
    </div>
  );
}
