import { CheckCircle2, Circle, Lock, FileText, Play, HelpCircle, Check, Copy, Camera } from "lucide-react";
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
  thumbnailUrl?: string | null;
  isAdmin?: boolean;
  onClick: () => void;
  onUploadThumbnail?: (file: File) => void;
  onDuplicate?: () => void;
}

const MTX_LOGO_GRADIENT = "linear-gradient(to right, #FC9325, #F0562A, #DD2A7B, #C7288B, #8131AF, #515BD4)";
const MTX_VIDEO_BOTTOM_GRADIENT = "linear-gradient(to right, #DD2A7B, #F58529)";
const PLAY_BUTTON_GRADIENT = "linear-gradient(135deg, #DD2A7B, #8131AF)";

export function ContentItemCard({
  type,
  title,
  orderIndex,
  duration,
  date,
  isCompleted,
  isLocked,
  questionsCount,
  thumbnailUrl,
  isAdmin,
  onClick,
  onUploadThumbnail,
  onDuplicate
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

  if (type === "video") {
    return (
      <Card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative overflow-hidden transition-all border-[1px] border-[rgba(255,255,255,0.07)] bg-[#111118] rounded-[12px] group ${
          isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
        onClick={() => !isLocked && onClick()}
      >
        {/* Large Thumbnail Area */}
        <div className="relative aspect-video w-full overflow-hidden">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            /* Geometric Background */
            <div className="w-full h-full bg-[#0a0a0f] relative overflow-hidden">
              {/* Radial gradient background */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{ 
                  background: `radial-gradient(circle at center, #8131AF 0%, transparent 70%)` 
                }}
              />
              
              {/* Radiating lines simulation with CSS */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute top-1/2 left-1/2 w-[200%] h-[1px] bg-white origin-left"
                    style={{ transform: `rotate(${i * 30}deg) translate(-50%, -50%)` }}
                  />
                ))}
              </div>

              {/* Connected dots simulation */}
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

              {/* Particles */}
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full opacity-10 animate-pulse"
                    style={{ 
                      top: `${Math.random() * 100}%`, 
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Central Play Button */}
          {!isLocked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(221,42,123,0.3)] transition-transform group-hover:scale-110"
                style={{ background: PLAY_BUTTON_GRADIENT }}
              >
                <Play className="h-7 w-7 text-white ml-1" fill="white" />
              </div>
            </div>
          )}

          {/* Badge "VÍDEO" (Top Left) */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] px-2 py-0.5 font-bold tracking-wider">
              VÍDEO
            </Badge>
          </div>

          {/* Duration (Bottom Right) */}
          {duration && (
            <div className="absolute bottom-4 right-4">
              <span className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                {duration}
              </span>
            </div>
          )}

          {/* Admin Tools Overlay */}
          {isAdmin && isHovered && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-4 z-10" onClick={(e) => e.stopPropagation()}>
              <label className="cursor-pointer p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20">
                <Camera className="h-6 w-6 text-white" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUploadThumbnail) onUploadThumbnail(file);
                  }}
                />
              </label>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDuplicate) onDuplicate();
                }}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
              >
                <Copy className="h-6 w-6 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Progress/Status Area */}
        <div className="p-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] rounded-[6px] px-[8px] py-[4px]">
                <span className="text-[14px] font-bold text-white leading-none">
                  {itemNumber}
                </span>
                <div className="h-4 w-[1px] bg-white/10" />
                <Play className="h-3 w-3 text-[#DD2A7B]" fill="#DD2A7B" />
             </div>
             <span className="text-[11px] font-medium text-white/50 tracking-wide">ASSISTIR VÍDEO</span>
          </div>

          <div className="shrink-0">
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
        </div>

        {/* 3px Bottom Bar */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: MTX_VIDEO_BOTTOM_GRADIENT }}
        />
      </Card>
    );
  }

  return (
    <Card
      onClick={() => !isLocked && onClick()}
      className={`relative overflow-hidden transition-all border-[1px] border-[rgba(255,255,255,0.07)] p-4 flex items-center gap-4 bg-[#111118] rounded-[12px] group ${
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
      <div className="shrink-0 ml-2 relative flex items-center gap-2">
        {isAdmin && (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               if (onDuplicate) onDuplicate();
             }}
             className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 mr-2"
           >
             <Copy className="h-4 w-4 text-white" />
           </button>
        )}

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