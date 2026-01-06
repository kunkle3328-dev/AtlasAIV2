
import React, { useState } from "react";
import { VoicePresets } from "../constants/voicePresets";
import { VoicePreset } from "../types";

interface VoiceControlsProps {
  onPresetChange?: (presetKey: VoicePreset) => void;
  currentEmotion?: string;
  isSpeaking?: boolean;
  selectedPreset: VoicePreset;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({ 
  onPresetChange, 
  currentEmotion, 
  isSpeaking,
  selectedPreset 
}) => {
  return (
    <div className="mx-4 mt-2 mb-4 p-4 rounded-[1.5rem] glass-premium pearlescent border border-white/20 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Voice Archetype</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] font-black text-white tracking-tight capitalize">
              {selectedPreset}
            </span>
            {isSpeaking && (
              <div className="flex gap-0.5 items-center h-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-0.5 bg-indigo-500 rounded-full animate-pulse" 
                    style={{ height: '100%', animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Current Aura</span>
          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-1 animate-pulse">
            {currentEmotion || VoicePresets[selectedPreset].baseEmotion}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(VoicePresets) as VoicePreset[]).map((key) => (
          <button
            key={key}
            onClick={() => onPresetChange?.(key)}
            className={`flex-1 min-w-[70px] py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${
              selectedPreset === key 
                ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" 
                : "glass-dark border-white/5 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
};
