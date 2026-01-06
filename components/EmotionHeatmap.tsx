import React from "react";
import { buildEmotionHeatmap } from "../utils/emotionHeatmap";

export const EmotionHeatmap = ({ chunks }: { chunks: any[] }) => {
  if (!chunks || chunks.length === 0) return null;
  const data = buildEmotionHeatmap(chunks);

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case "excited": return "#f97316"; // Orange
      case "empathetic": return "#60a5fa"; // Blue
      case "serious": return "#a1a1aa"; // Zinc
      case "curious": return "#fbbf24"; // Amber
      case "instructional": return "#34d399"; // Emerald
      case "storytelling": return "#c084fc"; // Purple
      default: return "#6366f1"; // Indigo
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 glass-dark rounded-2xl border border-white/5 shadow-inner animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[7px] text-zinc-500 font-black uppercase tracking-[0.2em]">Emotion Pulse</span>
        <span className="text-[6px] text-indigo-400 font-mono">LIVE_HEATMAP_V1</span>
      </div>
      <div className="flex gap-0.5 h-3 overflow-x-auto no-scrollbar items-end">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-2 rounded-t-[2px] transition-all duration-500 ease-out"
            style={{
              height: `${Math.max(20, (Math.abs(d.intensity) + 0.5) * 100)}%`,
              backgroundColor: getEmotionColor(d.emotion),
              opacity: d.index === data.length - 1 ? 1 : 0.6
            }}
            title={`${d.emotion} intensity`}
          />
        ))}
      </div>
    </div>
  );
};