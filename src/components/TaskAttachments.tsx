import { useEffect, useRef, useState } from "react";
import { Paperclip, Link2, X, FileText, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TaskAttachment } from "@/types/task";
import { toast } from "sonner";

const BUCKET = "task-attachments";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

interface Props {
  /** Folder segment used inside the user's bucket path. Any stable id works. */
  taskId: string;
  value: TaskAttachment[];
  onChange: (next: TaskAttachment[]) => void;
}

export function TaskAttachments({ taskId, value, onChange }: Props) {
  const attachments = value ?? [];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!userId) {
      toast.error("Sign in to upload attachments");
      return;
    }
    setUploading(true);
    const added: TaskAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 25 MB`);
        continue;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${userId}/${taskId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind: "file",
        path,
        size: file.size,
        contentType: file.type || undefined,
        addedAt: new Date().toISOString(),
      });
    }
    setUploading(false);
    if (added.length) onChange([...attachments, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addLink = () => {
    const raw = window.prompt("Link URL", "https://");
    if (!raw) return;
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const label = window.prompt("Label (optional)", url) || url;
    onChange([
      ...attachments,
      {
        id: crypto.randomUUID(),
        name: label,
        kind: "link",
        path: url,
        addedAt: new Date().toISOString(),
      },
    ]);
  };

  const remove = async (att: TaskAttachment) => {
    if (att.kind === "file") {
      await supabase.storage.from(BUCKET).remove([att.path]).catch(() => {});
    }
    onChange(attachments.filter((a) => a.id !== att.id));
  };

  const open = async (att: TaskAttachment) => {
    if (att.kind === "link") {
      window.open(att.path, "_blank", "noopener,noreferrer");
      return;
    }
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          Upload file
        </button>
        <button
          type="button"
          onClick={addLink}
          className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" /> Add link
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="group flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5"
            >
              <button
                type="button"
                onClick={() => open(att)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left text-xs text-foreground hover:underline"
              >
                {att.kind === "file" ? (
                  <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{att.name}</span>
                {att.kind === "file" && att.size ? (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => remove(att)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}