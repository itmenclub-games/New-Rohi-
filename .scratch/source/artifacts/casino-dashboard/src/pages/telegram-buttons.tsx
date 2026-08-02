import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTelegramButtons, 
  getListTelegramButtonsQueryKey,
  useCreateTelegramButton,
  useUpdateTelegramButton,
  useDeleteTelegramButton
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, Smartphone } from "lucide-react";

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

export default function TelegramButtons() {
  const queryClient = useQueryClient();
  const { data: buttons, isLoading } = useListTelegramButtons({ query: { queryKey: getListTelegramButtonsQueryKey() } });

  const createMutation = useCreateTelegramButton({
    mutation: {
      onSuccess: () => {
        toast.success("Button created successfully");
        queryClient.invalidateQueries({ queryKey: getListTelegramButtonsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const updateMutation = useUpdateTelegramButton({
    mutation: {
      onSuccess: () => {
        toast.success("Button updated successfully");
        queryClient.invalidateQueries({ queryKey: getListTelegramButtonsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteTelegramButton({
    mutation: {
      onSuccess: () => {
        toast.success("Button deleted");
        queryClient.invalidateQueries({ queryKey: getListTelegramButtonsQueryKey() });
      }
    }
  });

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ label: "", action: "", order: 0 });

  const openCreate = () => {
    setEditingId(null);
    const nextOrder = buttons ? buttons.length : 0;
    setFormData({ label: "", action: "", order: nextOrder });
    setFormOpen(true);
  };

  const openEdit = (btn: any) => {
    setEditingId(btn.id);
    setFormData({ label: btn.label, action: btn.action, order: btn.order });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!formData.label || !formData.action) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  // Note: For full drag and drop reordering, we'd use something like @hello-pangea/dnd.
  // Given constraints, we'll keep it simple: order is just a number input for now, 
  // but sorted by it visually. We simulate the visual ordering.
  const sortedButtons = [...(buttons || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bot Menu Buttons</h2>
          <p className="text-muted-foreground">Manage the persistent reply keyboard options in Telegram.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Add Menu Button
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Command / Action</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !sortedButtons || sortedButtons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No buttons configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedButtons.map((btn) => (
                    <TableRow key={btn.id} className={!btn.enabled ? "opacity-60" : ""}>
                      <TableCell>
                        <GripVertical className="text-muted-foreground opacity-50 cursor-move" size={16} />
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{btn.label}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-muted/50">{btn.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{btn.order}</span>
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={btn.enabled} 
                          onCheckedChange={(val) => updateMutation.mutate({ id: btn.id, data: { enabled: val }})}
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(btn)}>
                            <Edit size={16} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              if (window.confirm("Delete this button?")) {
                                deleteMutation.mutate({ id: btn.id });
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

        {/* Telegram Preview */}
        <div className="lg:col-span-1">
          <Card className="border-border shadow-sm sticky top-24 bg-card/50 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-muted p-3 border-b border-border flex items-center justify-center gap-2">
              <Smartphone size={16} />
              <span className="font-semibold text-sm">Telegram Preview</span>
            </div>
            <div className="flex-1 bg-background/50 p-4 relative overflow-hidden flex flex-col justify-end pb-16">
              {/* Fake message */}
              <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-bl-sm max-w-[80%] text-sm shadow-sm mb-4">
                Please choose an option below to continue.
              </div>
              
              {/* Fake Keyboard */}
              <div className="absolute bottom-0 left-0 right-0 bg-muted/30 border-t border-border p-2">
                <div className="grid grid-cols-2 gap-2">
                  {sortedButtons.filter(b => b.enabled).map(btn => (
                    <div key={btn.id} className="bg-card border border-border shadow-sm rounded p-2 text-center text-sm font-medium text-primary cursor-default truncate">
                      {btn.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Button' : 'Add Menu Button'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Button Label (Text shown on keyboard)</Label>
              <Input 
                id="label" 
                placeholder="e.g. 💰 Deposit"
                value={formData.label} 
                onChange={(e) => setFormData({ ...formData, label: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action / Command</Label>
              <Input 
                id="action" 
                placeholder="e.g. /deposit or deposit"
                value={formData.action} 
                onChange={(e) => setFormData({ ...formData, action: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input 
                id="order" 
                type="number"
                value={formData.order} 
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending || !formData.label || !formData.action}>
              Save Button
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
