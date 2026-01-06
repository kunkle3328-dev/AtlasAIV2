import React from "react";
import { VoicePresets } from "../constants/voicePresets";
import { VoicePreset, BrandVoiceProfile, AudioEngineType } from "../types";
import { audioEngine } from "../services/audioEngine";

interface VoiceConsoleProps {
  selectedPreset: VoicePreset;
  brandProfile: BrandVoiceProfile;
  onPresetChange: (preset: VoicePreset) => void;
  onProfileChange: (profile: BrandVoiceProfile) => void;
  currentEmotion: string;
  isSpeaking: boolean;
  onPreview: (text: string) => void;
}

const TechnicalTooltip: React.FC<{ label: string; text: string; children: React.ReactNode }> = ({ label, text, children }) => {
  return (
    <div className="group relative flex flex-col gap-1.5">
      <div className="flex justify-between items-center px-1">
        <label className="text-[7px] text-zinc-500 font-black uppercase tracking-widest cursor-help flex items-center gap-1">
          {label}
          <span className="opacity-40">(?)</span>
        </label>
        <div className="absolute bottom-full left-0 mb-3 w-64 p-3 glass-premium pearlescent border border-white/20 rounded-xl text-[10px] text-zinc-200 hidden group-hover:block z-[100] pointer-events-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-2">
            <p className="font-semibold leading-relaxed">{text}</p>
          </div>
          <div className="absolute top-full left-4 border-8 border-transparent border-t-white/10"></div>
        </div>
      </div>
      {children}
    </div>
  );
};

export const VoiceConsole: React.FC<VoiceConsoleProps> = ({
  selectedPreset,
  brandProfile,
  onPresetChange,
  onProfileChange,
  currentEmotion,
  isSpeaking,
  onPreview
}) => {
  const sliderConfig = [
    { 
      label: "Pitch Matrix", 
      key: "pitch", 
      min: -1, 
      max: 1, 
      step: 0.05, 
      tooltip: "Modulates fundamental frequency. [Suggested: -0.15] - Why: Slight negative values add authoritative 'gravitas' and reduce synthetic tininess, while positive values project youthful energy." 
    },
    { 
      label: "Pace Calibration", 
      key: "rate", 
      min: 0.5, 
      max: 2.0, 
      step: 0.1, 
      tooltip: "Sets words-per-minute delivery. [Suggested: 1.05] - Why: A minor speed boost (5%) simulates high-intelligence processing and proactive assistance without sacrificing comprehension." 
    },
    { 
      label: "Acoustic Timbre", 
      key: "timbre", 
      min: -0.5, 
      max: 0.5, 
      step: 0.05, 
      tooltip: "Shifts tonal resonance quality. [Suggested: 0.10] - Why: Positive timbre increases 'warmth' and 'softness', neutralizing the metallic edge often present in purely digital synthesis." 
    },
    { 
      label: "Vocal Emphasis", 
      key: "emphasis", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Intensity of stressed syllables. [Suggested: 0.25] - Why: Higher emphasis creates a more engaging, dynamic speaker that avoids the 'monotone' fatigue of standard assistants." 
    },
    { 
      label: "Breathiness", 
      key: "breathiness", 
      min: 0, 
      max: 0.3, 
      step: 0.01, 
      tooltip: "Introduces soft airflow texture. [Suggested: 0.08] - Why: Mimics human respiration. Small amounts of air make the voice feel more grounded, intimate, and less physically impossible." 
    },
    { 
      label: "Semantic Pause", 
      key: "pause", 
      min: 0, 
      max: 500, 
      step: 10, 
      tooltip: "Delay between thought blocks. [Suggested: 60ms] - Why: Short pauses allow the listener to process information during transitions, mimicking the natural micro-rests in human cognition." 
    }
  ];

  const handleSliderChange = (key: string, value: number) => {
    onProfileChange({ ...brandProfile, [key]: value });
  };

  const activeEmotion = currentEmotion || VoicePresets[selectedPreset]?.baseEmotion || 'neutral';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-3">
        <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Archetype Selection</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(VoicePresets) as VoicePreset[]).map((key) => (
            <button
              key={key}
              onClick={() => onPresetChange(key)}
              className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${
                selectedPreset === key 
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" 
                  : "glass-dark border-white/5 text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Prosody Matrix Editor (Live)</label>
        <div className="glass-dark p-4 rounded-[1.5rem] space-y-5 border border-white/10 shadow-inner">
          {sliderConfig.map((s) => (
            <TechnicalTooltip key={s.key} label={s.label} text={s.tooltip}>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(brandProfile as any)[s.key] ?? (VoicePresets[selectedPreset] as any)[s.key] ?? 0}
                  onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-[7.5px] font-mono font-bold text-indigo-400 w-8 text-right">
                  {typeof (brandProfile as any)[s.key] === 'number' ? (brandProfile as any)[s.key].toFixed(2) : '0.00'}
                </span>
              </div>
            </TechnicalTooltip>
          ))}

          <TechnicalTooltip label="Base Affect" text="The primary emotional foundation. [Suggested: Empathetic] - Why: Provides a caring baseline that prevents technical responses from feeling cold or dismissive.">
            <select
              value={brandProfile.emotion || VoicePresets[selectedPreset].baseEmotion}
              onChange={(e) => onProfileChange({...brandProfile, emotion: e.target.value})}
              className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white text-[9px] font-black uppercase outline-none focus:border-indigo-500/30"
            >
              {["neutral","warm","confident","storytelling","instructional","friendly","empathetic","excited","curious"].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </TechnicalTooltip>
        </div>
      </div>

      <div className="flex items-center justify-between glass-dark p-3 rounded-2xl border border-white/5">
        <div className="flex flex-col">
          <span className="text-[7px] text-zinc-500 font-black uppercase tracking-[0.2em]">Active Aura</span>
          <span className={`text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-0.5 ${isSpeaking ? 'animate-pulse' : ''}`}>
            {activeEmotion}
          </span>
        </div>
        <button 
          onClick={() => onPreview("System calibration check. Assessing vocal timbre and emotional resonance with live parameter adjustment active.")}
          className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600/40 transition-all active:scale-95"
        >
          Preview Node
        </button>
      </div>
    </div>
  );
};