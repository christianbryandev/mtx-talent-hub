import { CheckCircle2, Circle, Lock, FileText, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type ContentType = "video" | "quiz" | "text";

interface ContentItemCardProps {
  type: ContentType;
  title: string;
  orderIndex: number;
  duration?: string;
  date?: string;
  isCompleted: boolean;
  isLocked: boolean;
  questionsCount?: number;
  onClick: () => void;
}

export function ContentItemCard({
  type,
  title,
  orderIndex,
  duration,
  date,
  isCompleted,
  isLocked,
  questionsCount,
  onClick
}: ContentItemCardProps) {
  const itemNumber = orderIndex.toString().padStart(2, "0");

  return (
    <Card
      onClick={() => !isLocked && onClick()}
      className={`relative overflow-hidden transition-all border-border/60 p-4 flex items-center gap-4 ${
        isLocked 
          ? "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/30" 
          : "hover:border-primary/40 bg-card active:scale-[0.99] cursor-pointer"
      }`}
    >
      {/* Left Area: Thumbnail/Icon */}
      <div className="shrink-0">
        {type === "video" ? (
          <div className="w-16 h-12 bg-muted/80 rounded flex flex-col items-center justify-center border border-border/40 relative">
            <span className="text-[8px] font-black text-muted-foreground/60 tracking-tighter uppercase leading-none">
              AULA
            </span>
            <span className="text-xl font-black text-foreground/80 leading-none">
              {itemNumber}
            </span>
          </div>
        ) : (
          <div className="w-16 h-12 bg-primary/10 rounded flex items-center justify-center border border-primary/20">
            <FileText className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>

      {/* Middle Area: Content Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-foreground truncate">
          {type === "quiz" && !title.toLowerCase().includes("quiz") ? `Quiz: ${title}` : title}
        </h4>
        
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {type === "quiz" ? (
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-primary/10 text-primary border-none">
              {questionsCount || 5} perguntas · mín. 80%
            </Badge>
          ) : (
            <>
              {duration && (
                <>
                  <span className="text-[11px] text-muted-foreground">
                    {duration}
                  </span>
                  {date && <span className="text-[11px] text-muted-foreground/40">•</span>}
                </>
              )}
              {date && (
                <span className="text-[11px] text-muted-foreground">
                  {date}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Area: Status */}
      <div className="shrink-0 ml-2">
        {isLocked ? (
          <Lock className="h-5 w-5 text-muted-foreground/40" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-500/10" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>
    </Card>
  );
}
