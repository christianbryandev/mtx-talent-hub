interface Props {
  url: string;
  type: "image" | "video";
  compact?: boolean;
}

/**
 * Render-only preview of quiz media.
 * Used both in the admin editor and the user-facing QuizCard.
 */
export function QuizMediaPreview({ url, type, compact = false }: Props) {
  const maxH = compact ? "max-h-40" : "max-h-72";
  if (type === "image") {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`${maxH} rounded-md border object-contain bg-muted/30`}
      />
    );
  }
  return (
    <video
      src={url}
      controls
      preload="metadata"
      className={`${maxH} w-full rounded-md border bg-black`}
    />
  );
}
