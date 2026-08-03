import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListFreePlayRequests, 
  getListFreePlayRequestsQueryKey,
  useApproveFreePlay,
  useRejectFreePlay,
  ListFreePlayRequestsStatus
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "wouter";
import { ExternalLink, Check, X, Gift } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { RequestMessageBox } from "@/components/request-message-box";

export default function FreePlay() {
  const [status, setStatus] = useState<ListFreePlayRequestsStatus>("pending");
  const queryClient = useQueryClient();
  
  const { data: requests, isLoading } = useListFreePlayRequests(
    { status }, 
    { query: { queryKey: getListFreePlayRequestsQueryKey({ status }) } }
  );

  const approveMutation = useApproveFreePlay({
    mutation: {
      onSuccess: () => {
        toast.success("Free play approved and credited");
        queryClient.invalidateQueries({ queryKey: getListFreePlayRequestsQueryKey() });
        setApproveDialogOpen(false);
      },
      onError: (error: any) => {
        toast.error(`Failed to approve: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const rejectMutation = useRejectFreePlay({
    mutation: {
      onSuccess: () => {
        toast.success("Free play request rejected");
        queryClient.invalidateQueries({ queryKey: getListFreePlayRequestsQueryKey() });
        setRejectDialogOpen(false);
        setRejectReason("");
      },
      onError: (error: any) => {
        toast.error(`Failed to reject: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  // Approve Dialog State
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState<string>("2.00");

  const handleApproveClick = (req: any) => {
    setActiveRequest(req);
    setApproveAmount(req.requestedAmount?.toString() || "2.00");
    setApproveDialogOpen(true);
  };

  const submitApprove = () => {
    if (!activeRequest) return;
    approveMutation.mutate({ 
      id: activeRequest.id, 
      data: { amount: parseFloat(approveAmount) || 2 } 
    });
  };

  // Rejection Dialog State
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectClick = (req: any) => {
    setActiveRequest(req);
    setRejectDialogOpen(true);
  };

  const submitReject = () => {
    if (!activeRequest) return;
    rejectMutation.mutate({ id: activeRequest.id, data: { reason: rejectReason } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Free Play</h2>
          <p className="text-muted-foreground">Manage promotional free play requests.</p>
        </div>
        
        <Tabs value={status} onValueChange={(v) => setStatus(v as ListFreePlayRequestsStatus)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
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
                <TableHead>Req. Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !requests || requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No requests found for this status.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{req.customerName}</span>
                        <Link href={`/conversations?id=${req.conversationId}`}>
                          <span className="text-xs text-primary hover:underline flex items-center gap-1">
                            Chat #{req.conversationId} <ExternalLink size={10} />
                          </span>
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {req.requestedAmount ? `$${req.requestedAmount.toFixed(2)}` : 'Any'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        req.status === 'pending' ? 'warning' :
                        req.status === 'approved' ? 'success' : 'destructive'
                      }>
                        {req.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.status === 'approved' && req.approvedAmount && (
                        <span className="font-bold text-green-500 font-mono flex items-center gap-1">
                          <Gift size={14} /> ${req.approvedAmount.toFixed(2)}
                        </span>
                      )}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={req.rejectionReason}>
                          {req.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {req.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default" 
                              onClick={() => handleApproveClick(req)}
                            >
                              <Check size={16} className="mr-1" /> Grant
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-500 border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                              onClick={() => handleRejectClick(req)}
                            >
                              <X size={16} className="mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        <RequestMessageBox conversationId={req.conversationId} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Free Play</DialogTitle>
            <DialogDescription>
              Specify the amount to credit to {activeRequest?.customerName}'s account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Grant ($)</Label>
              <Input 
                id="amount" 
                type="number"
                step="0.01"
                min="0"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                className="text-lg font-mono font-bold text-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="default" 
              onClick={submitApprove} 
              disabled={approveMutation.isPending || parseFloat(approveAmount) <= 0}
            >
              Grant Bonus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Free Play</DialogTitle>
            <DialogDescription>
              Why are you rejecting this free play request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                placeholder="e.g. You already claimed today's bonus." 
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
