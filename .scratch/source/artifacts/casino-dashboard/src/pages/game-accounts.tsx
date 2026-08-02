import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListGameAccountRequests, 
  getListGameAccountRequestsQueryKey,
  useFulfillGameAccountRequest,
  useRejectGameAccountRequest,
  ListGameAccountRequestsStatus
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "wouter";
import { ExternalLink, Check, X, CheckCircle2, Copy } from "lucide-react";

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

export default function GameAccounts() {
  const [status, setStatus] = useState<ListGameAccountRequestsStatus>("pending");
  const queryClient = useQueryClient();
  
  const { data: requests, isLoading } = useListGameAccountRequests(
    { status }, 
    { query: { queryKey: getListGameAccountRequestsQueryKey({ status }) } }
  );

  const fulfillMutation = useFulfillGameAccountRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Game account credentials sent to customer");
        queryClient.invalidateQueries({ queryKey: getListGameAccountRequestsQueryKey() });
        setFulfillDialogOpen(false);
        setCredentials({ username: "", password: "", gameLink: "" });
      },
      onError: (error: any) => {
        toast.error(`Failed to fulfill: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  const rejectMutation = useRejectGameAccountRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Account request rejected");
        queryClient.invalidateQueries({ queryKey: getListGameAccountRequestsQueryKey() });
        setRejectDialogOpen(false);
        setRejectReason("");
      },
      onError: (error: any) => {
        toast.error(`Failed to reject: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  // Fulfill Dialog State
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    gameLink: ""
  });

  const handleFulfillClick = (req: any) => {
    setActiveRequest(req);
    // Auto-fill link if the request has it (which it shouldn't ideally from request, but just in case)
    setCredentials({ 
      username: "", 
      password: "", 
      gameLink: req.gameLink || "https://" 
    });
    setFulfillDialogOpen(true);
  };

  const submitFulfill = () => {
    if (!activeRequest) return;
    fulfillMutation.mutate({ 
      id: activeRequest.id, 
      data: credentials 
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
          <h2 className="text-2xl font-bold tracking-tight">Game Accounts</h2>
          <p className="text-muted-foreground">Provision requested game accounts for customers.</p>
        </div>
        
        <Tabs value={status} onValueChange={(v) => setStatus(v as ListGameAccountRequestsStatus)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
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
                <TableHead>Requested Game</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
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
                    <TableCell>
                      <span className="font-bold text-primary">{req.gameName}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        req.status === 'pending' ? 'warning' :
                        req.status === 'fulfilled' ? 'success' : 'destructive'
                      }>
                        {req.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.status === 'fulfilled' && req.credentialsUsername && (
                        <div className="text-xs space-y-1 bg-muted p-2 rounded-md">
                          <p><strong>U:</strong> <span className="font-mono">{req.credentialsUsername}</span></p>
                          <p><strong>P:</strong> <span className="font-mono">{req.credentialsPassword}</span></p>
                        </div>
                      )}
                      {req.status === 'rejected' && req.rejectionReason && (
                        <p className="text-xs text-muted-foreground" title={req.rejectionReason}>
                          Reason: {req.rejectionReason}
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
                              onClick={() => handleFulfillClick(req)}
                            >
                              <Check size={16} className="mr-1" /> Fulfill
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

      <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Game Account</DialogTitle>
            <DialogDescription>
              Create the account on {activeRequest?.gameName} platform and provide credentials to send to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gameLink">Platform/Game Link</Label>
              <Input 
                id="gameLink" 
                placeholder="https://..." 
                value={credentials.gameLink}
                onChange={(e) => setCredentials({ ...credentials, gameLink: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  autoComplete="off"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    autoComplete="off"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="bg-primary/10 text-primary-foreground p-3 rounded-md border border-primary/20 text-sm mt-4">
              <p className="font-semibold text-primary mb-1">Preview Message to Customer:</p>
              <p className="text-foreground/80 font-mono text-xs">
                Your {activeRequest?.gameName} account is ready!<br/>
                Link: {credentials.gameLink || "..."}<br/>
                Username: {credentials.username || "..."}<br/>
                Password: {credentials.password || "..."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="default" 
              onClick={submitFulfill} 
              disabled={fulfillMutation.isPending || !credentials.username || !credentials.password}
            >
              Send Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Why are you rejecting this account request?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason" 
                placeholder="e.g. Account limit reached, need deposit first, etc." 
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
