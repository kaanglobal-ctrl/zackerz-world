import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, MessagesSquare, Inbox, Paperclip, Loader2, X } from "lucide-react";
import { AttachmentView } from "@/components/attachment-view";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";

type Conversation = {
  partnerId: number;
  partnerName: string;
  partnerFullName: string | null;
  lastContent: string;
  lastAt: string;
  unread: number;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  createdAt: string;
  readAt: string | null;
};

type Partner = { id: number; username: string; fullName: string | null };

function timeShort(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams<{ partnerId?: string }>();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; mime: string; dataUrl: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: convData } = useQuery<{ conversations: Conversation[] }>({ queryKey: ["/api/messages/conversations"], refetchInterval: 8000 });

  const conversations = convData?.conversations ?? [];

  // Open conversation from route param (/messages/:partnerId)
  useEffect(() => {
    if (params.partnerId) setActiveId(parseInt(params.partnerId, 10));
  }, [params.partnerId]);

  const { data: threadData } = useQuery<{ messages: Message[]; partner: Partner }>({
    queryKey: ["/api/messages", activeId],
    enabled: activeId != null,
    refetchInterval: 5000,
  });

  const partner = threadData?.partner;
  const messages = threadData?.messages ?? [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

  const send = useMutation({
    mutationFn: async ({ partnerId, content, attachment }: { partnerId: number; content: string; attachment?: { name: string; mime: string; dataUrl: string } }) =>
      (await apiRequest("POST", `/api/messages/${partnerId}`, { content, attachment })).json(),
    onSuccess: () => {
      setDraft("");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (e) => toast({ title: "Could not send", description: e instanceof Error ? e.message : "", variant: "destructive" }),
  });

  const MAX_FILE_BYTES = 2.5 * 1024 * 1024;
  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Max 2.5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingFile({ name: file.name, mime: file.type || "application/octet-stream", dataUrl: String(reader.result || "") });
    reader.onerror = () => toast({ title: "Could not read file", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const onSend = () => {
    if (!activeId) return;
    if (!draft.trim() && !pendingFile) return;
    send.mutate({ partnerId: activeId, content: draft.trim(), attachment: pendingFile ?? undefined });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h1 className="mb-6 font-display text-4xl sm:text-5xl">Messages</h1>

          <div className="grid h-[70vh] gap-0 overflow-hidden rounded-lg border border-border md:grid-cols-[300px_1fr]">
            {/* Conversation list */}
            <div className={`flex flex-col border-r border-border ${activeId ? "hidden md:flex" : "flex"}`}>
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inbox</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <Inbox className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Start one from the directory.</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.partnerId}
                      onClick={() => setActiveId(c.partnerId)}
                      className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent ${activeId === c.partnerId ? "bg-accent" : ""}`}
                      data-testid={`button-conv-${c.partnerId}`}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-xs text-foreground">
                          {c.partnerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.partnerFullName || c.partnerName}</p>
                          {c.unread > 0 && (
                            <span className="flex-shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">{c.unread}</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{c.lastContent}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Thread */}
            <div className={`flex flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
              {activeId == null || !partner ? (
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <MessagesSquare className="mb-3 h-9 w-9 text-muted-foreground" />
                  <p className="font-display text-xl">Select a conversation</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pick a member from the directory to start a chat.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActiveId(null)} data-testid="button-back-conversations">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-xs text-foreground">
                        {partner.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-tight" data-testid="text-thread-partner">{partner.fullName || partner.username}</p>
                      <p className="text-xs text-muted-foreground">@{partner.username}</p>
                    </div>
                  </div>

                  <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="container-thread">
                    {messages.length === 0 ? (
                      <p className="mt-4 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
                    ) : (
                      messages.map((m) => {
                        const mine = m.senderId === user?.id;
                        const hasAttachment = !!m.attachmentPath;
                        return (
                          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-muted text-foreground ring-1 ring-border" : "bg-accent text-accent-foreground"}`} data-testid={`text-message-${m.id}`}>
                              {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                              {hasAttachment && (
                                <div className={m.content ? "mt-1" : ""}>
                                  <AttachmentView messageId={m.id} attachment={m} />
                                </div>
                              )}
                              <p className={`mt-1 text-[10px] text-muted-foreground`}>{timeShort(m.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-border p-3">
                    {pendingFile && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-foreground">{pendingFile.name}</span>
                        <button
                          type="button"
                          onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      data-testid="input-file"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Attach file"
                      data-testid="button-attach"
                    >
                      {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </Button>
                    <Input
                      placeholder="Type a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
                      data-testid="input-message"
                    />
                    <Button onClick={onSend} disabled={(!draft.trim() && !pendingFile) || send.isPending} variant="outline" data-testid="button-send-message">
                      <Send className="h-4 w-4" />
                    </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
