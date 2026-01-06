import React, { useState } from "react";
import { updateVoiceMemory, loadVoiceMemory } from "../services/voiceMemoryService";

export const VoiceMemoryToggle = () => {
  const memory = loadVoiceMemory() || { enabled: true, autoTuneEmotion: true };
  const [enabled, setEnabled] = useState(memory.enabled !== false);
  const [autoTune, setAutoTune] = useState(memory.autoTuneEmotion !== false);

  const handleToggleMemory = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnabled(e.target.checked);
    updateVoiceMemory({ enabled: e.target.checked });
  };

  const handleToggleAutoTune = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoTune(e.target.checked);
    updateVoiceMemory({ autoTuneEmotion: e.target.checked });
  };

  return (
    <div className="p-4 rounded-2xl glass-dark border border-white/5 flex flex-col gap-3 animate-in fade-in duration-300 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Voice Persistence</span>
          <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">Store Node Preference</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={handleToggleMemory} className="sr-only peer" />
          <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Emotion Auto-Tune</span>
          <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">Adaptive Acoustic Tuning</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={autoTune} onChange={handleToggleAutoTune} className="sr-only peer" />
          <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>
    </div>
  );
};