import { useRef, useState } from "react";
import { cn, getRuntimeIcon } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Loading01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/lib/api";

interface AvatarUploadProps {
  agentId: string;
  avatarUrl?: string;
  name: string;
  runtimeId?: string;
  size?: "sm" | "md" | "lg";
  onUploaded?: (avatarUrl: string) => void;
}

const sizeMap = {
  sm: "size-7",
  md: "size-12",
  lg: "size-20",
};

const iconSizeMap = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

export function AvatarUpload({
  agentId,
  avatarUrl,
  name,
  runtimeId,
  size = "md",
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      const updated = await api.uploadAgentAvatar(agentId, file);
      onUploaded?.(updated.avatarUrl || "");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group relative shrink-0 rounded-lg overflow-hidden transition-opacity",
        sizeMap[size],
        !avatarUrl && "bg-primary/10 flex items-center justify-center",
        uploading && "opacity-60 cursor-wait",
        !uploading && "cursor-pointer",
      )}
      title="Upload avatar"
      disabled={uploading}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="size-full object-cover" />
      ) : getRuntimeIcon({ id: runtimeId, name }) ? (
        <img src={getRuntimeIcon({ id: runtimeId, name })!} alt={name} className="size-full p-1" />
      ) : (
        <span
          className={cn(
            "text-xs font-bold text-primary",
            size === "sm" ? "text-[10px]" : size === "lg" ? "text-lg" : "",
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity",
          !uploading && "group-hover:opacity-100",
          uploading && "opacity-100",
        )}
      >
        {uploading ? (
          <HugeiconsIcon
            icon={Loading01Icon}
            className={cn(iconSizeMap[size], "text-background animate-spin")}
          />
        ) : (
          <HugeiconsIcon icon={Camera01Icon} className={cn(iconSizeMap[size], "text-background")} />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
