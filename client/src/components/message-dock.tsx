import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useMessageDock } from "@/hooks/use-message-dock";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AttachmentView } from "@/components/attachment-view";
import { Send, X, MessagesSquare, Inbox, Paperclip, Loader2 } from "lucide-react";

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

export default function MessageDock() {
  const { user } = useAuth();
  const { isOpen, activeId, setActiveId, closeDock } = useMessageDock();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; mime: string; dataUrl: string } | null>(null);

  const { data: convData } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
    refetchInterval: 8000,
  });
  const conversations = convData?.conversations ?? [];

  const { data: threadData } = useQuery<{ messages: Message[]; partner: Partner }>({
    queryKey: ["/api/messages", activeId],
    enabled: !!user && activeId != null,
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
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (e) =>
      toast({ title: "Could not send", description: e instanceof Error ? e.message : "", variant: "destructive" }),
  });

  const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Max 2.5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPendingFile({ name: file.name, mime: file.type || "application/octet-stream", dataUrl });
    };
    reader.onerror = () => toast({ title: "Could not read file", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const onSend = () => {
    if (!activeId) return;
    if (!draft.trim() && !pendingFile) return;
    send.mutate({ partnerId: activeId, content: draft.trim(), attachment: pendingFile ?? undefined });
    setDraft("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!user || !isOpen) return null;

  const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={closeDock}
        data-testid="dock-backdrop"
      />
      {/* Dock panel */}
      <aside
        className="fixed left-0 top-0 z-50 flex h-screen w-[92vw] max-w-[380px] flex-col border-r border-border bg-card shadow-2xl"
        data-testid="message-dock"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-muted-foreground" />
            <span className="font-display text-lg">Messages</span>
            {totalUnread > 0 && (
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                {totalUnread}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeDock} aria-label="Close messages">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Conversation list */}
          <div className={`flex w-full flex-col border-r border-border sm:w-[42%] sm:min-w-[120px] ${activeId ? "hidden sm:flex" : "flex"}`}>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center">
                  <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No conversations yet.</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Start one from the directory.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.partnerId}
                    onClick={() => setActiveId(c.partnerId)}
                    className={`flex w-full items-center gap-2 border-b border-border px-2.5 py-2.5 text-left transition-colors hover:bg-accent ${activeId === c.partnerId ? "bg-accent" : ""}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-muted text-[10px] text-foreground">
                        {c.partnerName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-xs font-medium">{c.partnerFullName || c.partnerName}</p>
                        {c.unread > 0 && (
                          <span className="flex-shrink-0 rounded-full bg-foreground px-1 py-0.5 text-[9px] font-medium text-background">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{c.lastContent}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread */}
          <div className={`flex flex-1 flex-col ${activeId ? "flex" : "hidden sm:flex"}`}>
            {activeId == null || !partner ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <MessagesSquare className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-display text-base">Select a conversation</p>
                <p className="mt-1 text-xs text-muted-foreground">Pick a member to start chatting.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 sm:hidden" onClick={() => setActiveId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-[11px] text-foreground">
                      {partner.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{partner.fullName || partner.username}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{partner.username}</p>
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.length === 0 ? (
                    <p className="mt-4 text-center text-xs text-muted-foreground">No messages yet. Say hello.</p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.senderId === user?.id;
                      const hasAttachment = !!m.attachmentPath;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-muted text-foreground ring-1 ring-border" : "bg-accent text-accent-foreground"}`}>
                            {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                            {hasAttachment && (
                              <div className={m.content ? "mt-1" : ""}>
                                <AttachmentView messageId={m.id} attachment={m} />
                              </div>
                            )}
                            <p className={`mt-0.5 text-[9px] ${mine ? "text-muted-foreground" : "text-muted-foreground"}`}>
                              {timeShort(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-border p-2.5">
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
                    data-testid="input-dock-file"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Attach file"
                    data-testid="button-dock-attach"
                  >
                    {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Input
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
                    className="h-9 text-sm"
                    data-testid="input-dock-message"
                  />
                  <Button onClick={onSend} disabled={(!draft.trim() && !pendingFile) || send.isPending} size="icon" variant="outline" className="h-9 w-9 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
