import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListFaqs, 
  getListFaqsQueryKey,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Faqs() {
  const queryClient = useQueryClient();
  const { data: faqs, isLoading } = useListFaqs(undefined, {
    query: { queryKey: getListFaqsQueryKey() },
  });

  const createMutation = useCreateFaq({
    mutation: {
      onSuccess: () => {
        toast.success("FAQ created");
        queryClient.invalidateQueries({ queryKey: getListFaqsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const updateMutation = useUpdateFaq({
    mutation: {
      onSuccess: () => {
        toast.success("FAQ updated");
        queryClient.invalidateQueries({ queryKey: getListFaqsQueryKey() });
        setFormOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteFaq({
    mutation: {
      onSuccess: () => {
        toast.success("FAQ deleted");
        queryClient.invalidateQueries({ queryKey: getListFaqsQueryKey() });
      }
    }
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ category: "", question: "", answer: "" });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ category: "General", question: "", answer: "" });
    setFormOpen(true);
  };

  const openEdit = (faq: any) => {
    setEditingId(faq.id);
    setFormData({ category: faq.category, question: faq.question, answer: faq.answer });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!formData.question || !formData.answer) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  // Group by category
  const groupedFaqs = faqs?.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bot FAQs</h2>
          <p className="text-muted-foreground">Manage automatic answers the bot can provide to common questions.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={16} /> Add FAQ
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !faqs || faqs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No FAQs defined.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFaqs || {}).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </Badge>
                <div className="h-px bg-border flex-1"></div>
              </div>
              <Accordion type="multiple" className="w-full">
                {items.map(faq => (
                  <AccordionItem key={faq.id} value={faq.id.toString()} className="border border-border bg-card mb-2 rounded-lg overflow-hidden px-4">
                    <div className="flex items-center">
                      <AccordionTrigger className="hover:no-underline py-4 font-semibold text-left flex-1">
                        {faq.question}
                      </AccordionTrigger>
                      <div className="flex gap-1 ml-4 z-10">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(faq); }}>
                          <Edit size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm("Delete this FAQ?")) deleteMutation.mutate({ id: faq.id });
                        }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent className="text-muted-foreground whitespace-pre-wrap pt-0 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input 
                id="category" 
                placeholder="e.g. Deposits, General, Games"
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input 
                id="question" 
                value={formData.question} 
                onChange={(e) => setFormData({ ...formData, question: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea 
                id="answer" 
                className="h-32"
                value={formData.answer} 
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={createMutation.isPending || updateMutation.isPending || !formData.question || !formData.answer}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
