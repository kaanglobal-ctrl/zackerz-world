import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Post = {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorFullName: string | null;
  likeCount: number;
  commentCount: number;
};

type Comment = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorFullName: string | null;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});

  const { data: postData, isLoading } = useQuery<{ posts: Post[] }>({ queryKey: ["/api/posts"] });

  const createPost = useMutation({
    mutationFn: async (content: string) => (await apiRequest("POST", "/api/posts", { content })).json(),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Posted to the feed." });
    },
    onError: (e) => toast({ title: "Could not post", description: e instanceof Error ? e.message : "", variant: "destructive" }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/posts/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
  });

  const toggleLike = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/posts/${id}/like`)).json() as Promise<{ liked: boolean }>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/posts"] }),
  });

  const addComment = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) =>
      (await apiRequest("POST", `/api/posts/${id}/comments`, { content })).json(),
    onSuccess: (_data, vars) => {
      setCommentDraft((c) => ({ ...c, [vars.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/posts", vars.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const posts = postData?.posts ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 font-display text-4xl sm:text-5xl">The Feed</h1>

          {/* Composer */}
          <Card className="mb-8 border-border">
            <CardContent className="p-5">
              <Textarea
                placeholder="Share something with the network…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="resize-none border-0 px-0 focus-visible:ring-0"
                data-testid="input-post"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/2000</span>
                <Button
                  size="sm"
                  disabled={!draft.trim() || createPost.isPending}
                  onClick={() => createPost.mutate(draft.trim())}
                  data-testid="button-post-submit"
                >
                  <Send className="mr-2 h-4 w-4" /> Post
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <p className="text-muted-foreground">Loading feed…</p>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="font-display text-xl">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Be the first to share something.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  open={!!openComments[post.id]}
                  commentDraft={commentDraft[post.id] ?? ""}
                  onToggleComments={() => setOpenComments((s) => ({ ...s, [post.id]: !s[post.id] }))}
                  onCommentDraft={(v) => setCommentDraft((c) => ({ ...c, [post.id]: v }))}
                  onLike={() => toggleLike.mutate(post.id)}
                  onComment={() => addComment.mutate({ id: post.id, content: (commentDraft[post.id] ?? "").trim() })}
                  onDelete={() => deletePost.mutate(post.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  open,
  commentDraft,
  onToggleComments,
  onCommentDraft,
  onLike,
  onComment,
  onDelete,
}: {
  post: Post;
  currentUserId?: number;
  open: boolean;
  commentDraft: string;
  onToggleComments: () => void;
  onCommentDraft: (v: string) => void;
  onLike: () => void;
  onComment: () => void;
  onDelete: () => void;
}) {
  const { data } = useQuery<{ comments: Comment[] }>({ queryKey: ["/api/posts", post.id, "comments"], enabled: open });
  const comments = data?.comments ?? [];
  const isAuthor = post.userId === currentUserId;

  return (
    <Card className="border-border" data-testid={`card-post-${post.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium leading-tight">{post.authorFullName || post.authorName}</p>
                <p className="text-xs text-muted-foreground">@{post.authorName} · {timeAgo(post.createdAt)}</p>
              </div>
              {isAuthor && (
                <Button variant="ghost" size="sm" onClick={onDelete} data-testid={`button-delete-post-${post.id}`}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed" data-testid={`text-post-content-${post.id}`}>
              {post.content}
            </p>
            <div className="mt-4 flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onLike} data-testid={`button-like-${post.id}`} className="gap-1.5 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span className="text-xs">{post.likeCount}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleComments} className="gap-1.5 text-muted-foreground" data-testid={`button-comments-${post.id}`}>
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{post.commentCount}</span>
              </Button>
            </div>

            {open && (
              <div className="mt-4 border-t border-border pt-4">
                {comments.length === 0 ? (
                  <p className="mb-3 text-xs text-muted-foreground">No comments yet.</p>
                ) : (
                  <div className="mb-3 space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                            {c.authorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg bg-accent px-3 py-2">
                          <p className="text-xs font-medium">{c.authorFullName || c.authorName} · {timeAgo(c.createdAt)}</p>
                          <p className="text-sm">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a comment…"
                    value={commentDraft}
                    onChange={(e) => onCommentDraft(e.target.value)}
                    rows={1}
                    className="min-h-[40px] resize-none"
                    data-testid={`input-comment-${post.id}`}
                  />
                  <Button
                    size="sm"
                    disabled={!commentDraft.trim()}
                    onClick={onComment}
                    data-testid={`button-comment-submit-${post.id}`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
