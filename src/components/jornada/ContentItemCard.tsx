import { Circle, Lock, FileText, Play, HelpCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useState } from "react";

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
  thumbnailUrl?: string;
  onClick: () => void;
}

const MTX_LOGO_GRADIENT = "linear-gradient(to right, #FC9325, #F0562A, #DD2A7B, #C7288B, #8131AF, #515BD4)";
const MTX_VIDEO_BOTTOM_GRADIENT = "linear-gradient(to right, #DD2A7B, #F58529)";
const PLAY_BUTTON_GRADIENT = "linear-gradient(135deg, #DD2A7B, #8131AF)";

export function ContentItemCard({
  type,
  title,
  orderIndex,
  duration,
  isCompleted,
  isLocked,
  questionsCount,
  thumbnailUrl,
  onClick
}: ContentItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
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

  const TypeIconSmall = () => {
    const color = getTypeColor();
    switch (type) {
      case "video": return <Play className="h-3 w-3" style={{ color }} fill={color} />;
      case "quiz": return <HelpCircle className="h-3 w-3" style={{ color }} />;
      case "texto":
      case "text": return <FileText className="h-3 w-3" style={{ color }} />;
      default: return null;
    }
  };

  const TypeIconLarge = () => {
    switch (type) {
      case "video": return <Play className="h-6 w-6 text-white ml-1" fill="white" />;
      case "quiz": return <HelpCircle className="h-6 w-6 text-white" />;
      case "texto":
      case "text": return <FileText className="h-6 w-6 text-white" />;
      default: return null;
    }
  };

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col overflow-hidden transition-all duration-300 border-[1px] border-border bg-card rounded-[16px] group ${
        isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30"
      }`}
      onClick={() => !isLocked && onClick()}
    >
      {/* Thumbnail Area - Force aspect-video to be a nice rectangle (16:9) */}
      <div className="relative aspect-video w-full overflow-hidden shrink-0">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          /* Geometric Background */
          <div className="w-full h-full bg-muted relative overflow-hidden transition-transform duration-700 group-hover:scale-105">
            <div 
              className="absolute inset-0 opacity-20"
              style={{ background: `radial-gradient(circle at center, ${getTypeColor()} 0%, transparent 70%)` }}
            />
            <div className="absolute inset-0 opacity-10">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute top-1/2 left-1/2 w-[200%] h-[1px] bg-white origin-left"
                  style={{ transform: `rotate(${i * 30}deg) translate(-50%, -50%)` }}
                />
              ))}
            </div>
            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="20" cy="30" r="0.5" fill="#FC9325" />
              <circle cx="80" cy="20" r="0.5" fill="#C7288B" />
              <circle cx="50" cy="50" r="0.8" fill="#8131AF" />
              <circle cx="30" cy="70" r="0.5" fill="#DD2A7B" />
              <circle cx="70" cy="80" r="0.5" fill="#F58529" />
              <line x1="20" y1="30" x2="50" y2="50" stroke="#8131AF" strokeWidth="0.1" />
              <line x1="80" y1="20" x2="50" y2="50" stroke="#8131AF" strokeWidth="0.1" />
              <line x1="30" y1="70" x2="50" y2="50" stroke="#8131AF" strokeWidth="0.1" />
              <line x1="70" y1="80" x2="50" y2="50" stroke="#8131AF" strokeWidth="0.1" />
            </svg>
          </div>
        )}

        {/* Central Play/Icon Button */}
        {!isLocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 liquid-glass-btn"
              style={{ 
                background: type === 'video' ? PLAY_BUTTON_GRADIENT : undefined,
                boxShadow: type === 'video' ? '0 0 20px rgba(221,42,123,0.3)' : '0 4px 30px rgba(0, 0, 0, 0.2)'
              }}
            >
              <TypeIconLarge />
            </div>
          </div>
        )}

        {/* Badge (Top Left) */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] px-2 py-0.5 font-bold tracking-wider rounded-md">
            {getTypeLabel()}
          </Badge>
        </div>

        {/* Duration / Info (Bottom Right) */}
        <div className="absolute bottom-3 right-3">
          {type === "quiz" && questionsCount ? (
            <span className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] px-2.5 py-1 rounded-md font-medium">
              {questionsCount} pergs
            </span>
          ) : duration ? (
            <span className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] px-2.5 py-1 rounded-md font-medium">
              {duration}
            </span>
          ) : null}
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3 mb-1">
           <div className="flex flex-col overflow-hidden">
             <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
               <span className="text-[10px] font-bold text-foreground tracking-widest">AULA {itemNumber}</span>
               <TypeIconSmall />
             </div>
             <span className="text-[15px] font-bold text-foreground line-clamp-2 leading-snug" title={title}>{title}</span>
           </div>

           <div className="shrink-0 mt-1">
             {isLocked ? (
               <Lock className="h-4 w-4 text-muted-foreground" />
             ) : isCompleted ? (
               <div 
                 className="h-5 w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(221,42,123,0.3)]"
                 style={{ background: MTX_LOGO_GRADIENT }}
               >
                 <Check className="h-3 w-3 text-white" strokeWidth={3} />
               </div>
             ) : (
               <Circle className="h-5 w-5 text-muted-foreground" />
             )}
           </div>
        </div>
      </div>

      {/* 3px Bottom Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: MTX_VIDEO_BOTTOM_GRADIENT }}
      />
    </Card>
  );
}