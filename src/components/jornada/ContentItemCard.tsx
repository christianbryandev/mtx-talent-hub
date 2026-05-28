import { CheckCircle2, Circle, Lock, FileText, Play, HelpCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type ContentType = "video" | "quiz" | "texto" | "text";

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

const MTX_LOGO_GRADIENT = "linear-gradient(to right, #FC9325, #F0562A, #DD2A7B, #C7288B, #8131AF, #515BD4)";

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

  const getTypeLabel = () => {
    switch (type) {
      case "video": return "VÍDEO";
      case "quiz": return "QUIZ";
      case "texto":
      case "text": return "TEXTO";
      default: return "MÓDULO";
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case "video": return "#DD2A7B";
      case "quiz": return "#FC9325";
      case "texto":
      case "text": return "#8131AF";
      default: return "#888888";
    }
  };

  const TypeIcon = () => {
    const color = getTypeColor();
    switch (type) {
      case "video": return <Play className="h-4 w-4" style={{ color }} fill={color} />;
      case "quiz": return <HelpCircle className="h-4 w-4" style={{ color }} />;
      case "texto":
      case "text": return <FileText className="h-4 w-4" style={{ color }} />;
      default: return null;
    }
  };

  return (
    <Card
      onClick={() => !isLocked && onClick()}
      className={`relative overflow-hidden transition-all border-[1px] border-[rgba(255,255,255,0.07)] p-4 flex items-center gap-4 bg-[#111118] rounded-[12px] ${
        isLocked 
          ? "opacity-60 cursor-not-allowed" 
          : "hover:border-white/20 active:scale-[0.99] cursor-pointer"
      }`}
    >
      {/* Bloco da esquerda (tipo + número) */}
      <div className="shrink-0 flex items-center gap-4 bg-[rgba(255,255,255,0.05)] rounded-[8px] px-[12px] py-[8px]">
        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-[#888888] tracking-[2px] leading-none mb-1">
            {getTypeLabel()}
          </span>
          <span className="text-[18px] font-bold text-white leading-none">
            {itemNumber}
          </span>
        </div>
        <div className="h-8 w-[1px] bg-white/10" />
        <TypeIcon />
      </div>

      {/* Middle Area: Content Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-white truncate">
          {title}
        </h4>
        
        <div className="mt-0.5 flex items-center gap-2">
          {type === "quiz" ? (
            <span className="text-[11px] text-[#888888]">
              {questionsCount || 5} perguntas · mín. 80%
            </span>
          ) : duration ? (
            <span className="text-[11px] text-[#888888]">
              {duration}
            </span>
          ) : null}
        </div>
      </div>

      {/* Right Area: Status */}
      <div className="shrink-0 ml-2">
        {isLocked ? (
          <Lock className="h-5 w-5 text-[#444444]" />
        ) : isCompleted ? (
          <div 
            className="h-6 w-6 rounded-full flex items-center justify-center"
            style={{ background: MTX_LOGO_GRADIENT }}
          >
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
        ) : (
          <Circle className="h-6 w-6 text-[#555555]" />
        )}
      </div>
    </Card>
  );
}
