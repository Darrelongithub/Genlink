import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DepartmentRole } from "@/lib/ops/departments";
import { weekTag } from "@/lib/ops/week";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
];

interface Props {
  department: DepartmentRole;
  weekStarting: string;
  value: { url: string; name: string } | null;
  onChange: (v: { url: string; name: string } | null) => void;
  disabled?: boolean;
}

export default function AttachmentUpload({ department, weekStarting, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large (10 MB max).");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only PDF, DOCX, JPG, or PNG allowed.");
      return;
    }
    setUploading(true);
    try {
      const path = `${department}/${weekTag(weekStarting)}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("ops-attachments").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      onChange({ url: path, name: file.name });
      toast.success("Attachment uploaded.");
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
          <Paperclip className="w-4 h-4 text-[#0D2B55]" />
          <span className="flex-1 truncate">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-[#0D2B55]/60 hover:text-[#D33232]"
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          className="border-dashed border-[#0D2B55]/30"
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
          {uploading ? "Uploading…" : "Attach file (PDF, DOCX, JPG, PNG · max 10 MB)"}
        </Button>
      )}
    </div>
  );
}

/** Signed download URL helper. */
export async function getSignedUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from("ops-attachments").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}