import React from "react";
import { EmotionHeatmap } from "./EmotionHeatmap";

interface VoiceSessionPanelProps {
  audioChunks: any[];
}

export const VoiceSessionPanel: React.FC<VoiceSessionPanelProps> = ({ audioChunks }) => {
  if (!audioChunks || audioChunks.length === 0) return null;

  return (
    <div className="mx-4 mb-4">
      <EmotionHeatmap chunks={audioChunks} />
    </div>
  );
};