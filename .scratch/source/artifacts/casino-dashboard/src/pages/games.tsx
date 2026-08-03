import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListGames, 
  getListGamesQueryKey,
  useCreateGame,
  useUpdateGame,
  useDeleteGame,
  useToggleGame
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Link as LinkIcon, Power, PowerOff } from "lucide-react";

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

export default function Games() {
  const queryClient = useQueryClient();
  const { data: games, isLoading } = useListGames({ query: { queryKey: getListGamesQueryKey() } });

  const createMutation = useCreateGame({
    mutation: {
      onSuccess: () => {
        toast.success("Game created successfully");
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const updateMutation = useUpdateGame({
    mutation: {
      onSuccess: () => {
        toast.success("Game updated successfully");
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteGame({
    mutation: {
      onSuccess: () => {
        toast.success("Game deleted");
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      }
    }
  });

  const toggleMutation = useToggleGame({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      }
    }
  });

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", link: "", description: "" });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", link: "", description: "" });
    setFormOpen(true);
  };

  const openEdit = (game: any) => {
    setEditingId(game.id);
    setFormData({ 
      name: game.name, 
      link: game.link || "", 
      description: game.description || "" 
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Games</h2>
          <p className="text-muted-foreground">Manage the games available in the casino.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Add Game
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !games || games.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No games configured. Click Add Game to start.
                  </TableCell>
                </TableRow>
              ) : (
                games.map((game) => (
                  <TableRow key={game.id} className={!game.enabled ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-base">{game.name}</span>
                        {game.link && (
                          <a href={game.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <LinkIcon size={10} /> {game.link}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">{game.description || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={game.enabled} 
                          onCheckedChange={() => toggleMutation.mutate({ id: game.id })}
                          disabled={toggleMutation.isPending}
                        />
                        <Badge variant={game.enabled ? "success" : "secondary"}>
                          {game.enabled ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(game)}>
                          <Edit size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm("Delete this game?")) {
                              deleteMutation.mutate({ id: game.id });
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
            <DialogTitle>{editingId ? 'Edit Game' : 'Add New Game'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Game Name *</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Game URL (Optional)</Label>
              <Input 
                id="link" 
                placeholder="https://..."
                value={formData.link} 
                onChange={(e) => setFormData({ ...formData, link: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending || !formData.name}>
              {editingId ? 'Save Changes' : 'Create Game'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
