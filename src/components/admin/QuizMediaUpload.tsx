import { useRef, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QuizMediaPreview } from "@/components/jornada/QuizMediaPreview";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ACCEPT = "image/*,video/*";

export type MediaType = "image" | "video";

interface Props {
  url: string | null;
  type: MediaType | null;
  /** Folder prefix inside the bucket — e.g. `questions/${qid}` */
  pathPrefix: string;
  onChange: (patch: { media_url: string | null; media_type: MediaType | null }) => void | Promise<void>;
  label?: string;
}

/**
 * Admin-only uploader for quiz media (image/video).
 * - Type/size validation client-side.
 * - Storage RLS enforces admin/super_admin server-side.
 */
export function QuizMediaUpload({ url, type, pathPrefix, onChange, label = "Mídia" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Tipo de arquivo inválido. Envie imagem ou vídeo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo excede 50MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${pathPrefix}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("quiz-media")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("quiz-media").getPublicUrl(path);
      await onChange({
        media_url: data.publicUrl,
        media_type: isImage ? "image" : "video",
      });
      toast.success("Mídia enviada");
    } catch (e) {
      toast.error((e as Error).message || "Falha no upload");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await onChange({ media_url: null, media_type: null });
      toast.success("Mídia removida");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Upload className="mr-1 h-3 w-3" />
          )}
          {url ? "Trocar" : "Upload"}
        </Button>
        {url && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={busy}
            onClick={handleRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {url && type && <QuizMediaPreview url={url} type={type} compact />}
    </div>
  );
}
