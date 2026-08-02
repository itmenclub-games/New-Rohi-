import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetConversationQueryKey,
  getListConversationsQueryKey,
  useSendStaffMessage,
} from "@workspace/api-client-react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type RequestMessageBoxProps = {
  conversationId: number;
  placeholder?: string;
  allowInformationRequest?: boolean;
};

export function RequestMessageBox({
  conversationId,
  placeholder = "Optional: send a note or ask the customer for more details...",
  allowInformationRequest = false,
}: RequestMessageBoxProps) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useSendStaffMessage({
    mutation: {
      onSuccess: () => {
        setText("");
        toast.success("Message sent to customer");
        queryClient.invalidateQueries({
          queryKey: getGetConversationQueryKey(conversationId),
        });
        queryClient.invalidateQueries({
          queryKey: getListConversationsQueryKey(),
        });
      },
      onError: (error: any) => {
        toast.error(`Failed to send message: ${error?.message || "Unknown error"}`);
      },
    },
  });

  const send = (requestInformation: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    mutation.mutate({
      id: conversationId,
      data: {
        text: requestInformation
          ? `Staff needs more information before continuing:\n${trimmed}`
          : trimmed,
      },
    });
  };

  return (
    <div className="mt-2 space-y-2 min-w-[240px]">
      <Textarea
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className="text-xs resize-none"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {allowInformationRequest && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => send(true)}
            disabled={mutation.isPending || !text.trim()}
          >
            Request Information
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => send(false)}
          disabled={mutation.isPending || !text.trim()}
        >
          <Send size={13} className="mr-1" />
          Send
        </Button>
      </div>
    </div>
  );
}