import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListBonuses, 
  getListBonusesQueryKey,
  useCreateBonus,
  useUpdateBonus,
  useDeleteBonus,
  useToggleBonus
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Bonuses() {
  const queryClient = useQueryClient();
  const { data: bonuses, isLoading } = useListBonuses({ query: { queryKey: getListBonusesQueryKey() } });

  const createMutation = useCreateBonus({
    mutation: {
      onSuccess: () => {
        toast.success("Bonus created successfully");
        queryClient.invalidateQueries({ queryKey: getListBonusesQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const updateMutation = useUpdateBonus({
    mutation: {
      onSuccess: () => {
        toast.success("Bonus updated successfully");
        queryClient.invalidateQueries({ queryKey: getListBonusesQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteBonus({
    mutation: {
      onSuccess: () => {
        toast.success("Bonus deleted");
        queryClient.invalidateQueries({ queryKey: getListBonusesQueryKey() });
      }
    }
  });

  const toggleMutation = useToggleBonus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBonusesQueryKey() });
      }
    }
  });

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    minDeposit: "", 
    percentage: "" 
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", minDeposit: "", percentage: "" });
    setFormOpen(true);
  };

  const openEdit = (bonus: any) => {
    setEditingId(bonus.id);
    setFormData({ 
      name: bonus.name, 
      description: bonus.description || "", 
      minDeposit: bonus.minDeposit?.toString() || "", 
      percentage: bonus.percentage?.toString() || "" 
    });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!formData.name) return;
    
    const payload = {
      name: formData.name,
      description: formData.description,
      minDeposit: formData.minDeposit ? parseFloat(formData.minDeposit) : undefined,
      percentage: formData.percentage ? parseFloat(formData.percentage) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bonuses & Promos</h2>
          <p className="text-muted-foreground">Manage deposit bonuses and promotional offers.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Add Bonus
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bonus Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Req. Deposit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !bonuses || bonuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No bonuses configured. Click Add Bonus to start.
                  </TableCell>
                </TableRow>
              ) : (
                bonuses.map((bonus) => (
                  <TableRow key={bonus.id} className={!bonus.enabled ? "opacity-60" : ""}>
                    <TableCell>
                      <span className="font-bold text-base text-primary">{bonus.name}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{bonus.description || "-"}</p>
                      {bonus.percentage && (
                        <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                          {bonus.percentage}% Match
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {bonus.minDeposit ? `$${bonus.minDeposit}` : 'None'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={bonus.enabled} 
                          onCheckedChange={() => toggleMutation.mutate({ id: bonus.id })}
                          disabled={toggleMutation.isPending}
                        />
                        <Badge variant={bonus.enabled ? "success" : "secondary"}>
                          {bonus.enabled ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(bonus)}>
                          <Edit size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm("Delete this bonus?")) {
                              deleteMutation.mutate({ id: bonus.id });
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Bonus' : 'Add New Bonus'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bonus Name *</Label>
              <Input 
                id="name" 
                placeholder="e.g. 100% First Deposit"
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percentage">Match Percentage (%)</Label>
                <Input 
                  id="percentage" 
                  type="number"
                  placeholder="e.g. 50"
                  value={formData.percentage} 
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDeposit">Min Deposit ($)</Label>
                <Input 
                  id="minDeposit" 
                  type="number"
                  placeholder="e.g. 20"
                  value={formData.minDeposit} 
                  onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description / Rules (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Rollover requirements, max cashout, etc."
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending || !formData.name}>
              {editingId ? 'Save Changes' : 'Create Bonus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
