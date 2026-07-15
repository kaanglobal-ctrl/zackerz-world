import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Download, FileText, Loader2 } from "lucide-react";

export type Attachment = {
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
};

type Signed = { url: string; name: string | null; mime: string | null };

function isImage(mime: string | null | undefined): boolean {
  if (!mime) return false;
  if (mime === "image/svg+xml") return false; // render svg as a download (XSS-safe)
  return mime.startsWith("image/");
}

/**
 * Renders a message attachment. Fetches a short-lived signed URL from the
 * authenticated, access-checked API route, then shows images inline or a
 * download link for everything else.
 */
export function AttachmentView({ messageId, attachment }: { messageId: number; attachment: Attachment }) {
  const [signed, setSigned] = useState<Signed | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await (await apiRequest("GET", `/api/messages/${messageId}/attachment`)).json();
        if (!cancelled) setSigned(data as Signed);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [messageId]);

  if (error) {
    return <span className="text-xs text-muted-foreground">Could not load attachment</span>;
  }
  if (!signed) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </span>
    );
  }

  if (isImage(signed.mime)) {
    // eslint-disable-next-line jsx-a11y/img-redundant-alt
    return (
      <a href={signed.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={signed.url}
          alt={signed.name ?? "attachment"}
          className="mt-1 max-h-48 max-w-[220px] rounded-lg border border-border object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={signed.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex max-w-[240px] items-center gap-2 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{signed.name ?? "attachment"}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}
