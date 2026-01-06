import React from "react";
import { VoicePresets } from "../constants/voicePresets";
import { VoicePreset, BrandVoiceProfile } from "../types";
import { updateVoiceMemory } from "../services/voiceMemoryService";
import { VoiceMemoryToggle } from "./VoiceMemoryToggle";
import { VoicePersonaSelector } from "./VoicePersonaSelector";
import { PersonaExportPanel } from "./PersonaExportPanel";
import { VoiceArchetypes, ArchetypeKey } from "../voiceArchetypes";

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
      tooltip: "Modulates fundamental frequency. User overrides take precedence over archetypes." 
    },
    { 
      label: "Pace Calibration", 
      key: "rate", 
      min: 0.5, 
      max: 2.0, 
      step: 0.1, 
      tooltip: "Sets words-per-minute delivery. Archetypes suggest optimal speeds for context." 
    },
    { 
      label: "Acoustic Timbre", 
      key: "timbre", 
      min: -0.5, 
      max: 0.5, 
      step: 0.05, 
      tooltip: "Shifts tonal resonance quality." 
    },
    { 
      label: "Vocal Emphasis", 
      key: "emphasis", 
      min: 0, 
      max: 1.5, 
      step: 0.05, 
      tooltip: "Intensity of stressed syllables. Higher emphasis creates more engaging delivery." 
    },
    { 
      label: "Semantic Pause", 
      key: "pause", 
      min: 0, 
      max: 1000, 
      step: 10, 
      tooltip: "Delay between thought blocks. Executive archetypes typically use longer pauses." 
    },
    { 
      label: "Variability", 
      key: "variability", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Neural variance in pitch/rate. Storytellers require high variability." 
    }
  ];

  const handleSliderChange = (key: string, value: number) => {
    const updated = { ...brandProfile, [key]: value, __manualOverride: true };
    onProfileChange(updated);
    updateVoiceMemory({ profileOverrides: updated });
  };

  const handleArchetypeSelection = (key: ArchetypeKey) => {
    const arch = VoiceArchetypes[key];
    const updated = { 
      ...brandProfile, 
      ...arch, 
      archetype: key, 
      __manualOverride: false // Re-enable auto-logic for the new archetype
    };
    onProfileChange(updated);
    updateVoiceMemory({ profileOverrides: updated });
  };

  const handleReset = () => {
    const defaultProfile: BrandVoiceProfile = {
      tone: 'friendly',
      rate: 1.0,
      pitch: 0,
      timbre: 0,
      emphasis: 0.1,
      pause: 30,
      breathiness: 0.05,
      variability: 0.2,
      __manualOverride: false
    };
    onProfileChange(defaultProfile);
    updateVoiceMemory({ profileOverrides: defaultProfile });
  };

  const activeEmotion = currentEmotion || VoicePresets[selectedPreset]?.emotion || 'neutral';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <VoicePersonaSelector 
        currentProfile={brandProfile} 
        onSelect={(profile: BrandVoiceProfile) => onProfileChange({ ...profile, __manualOverride: true })} 
      />
      
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Voice Archetype</label>
          {brandProfile.archetype && !brandProfile.__manualOverride && (
            <span className="text-[6px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
              Auto-tuned
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(VoiceArchetypes) as ArchetypeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => handleArchetypeSelection(key)}
              className={`flex-1 min-w-[100px] py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${
                brandProfile.archetype === key 
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" 
                  : "glass-dark border-white/5 text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {VoiceArchetypes[key].label}
            </button>
          ))}
        </div>
      </div>

      <PersonaExportPanel />
      
      <VoiceMemoryToggle />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Prosody Matrix Editor</label>
          <button 
            onClick={handleReset}
            className="text-[7px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            Reset Defaults
          </button>
        </div>
        <div className="glass-dark p-4 rounded-[1.5rem] space-y-5 border border-white/10 shadow-inner">
          {sliderConfig.map((s) => (
            <TechnicalTooltip key={s.key} label={s.label} text={s.tooltip}>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={(brandProfile as any)[s.key] ?? 0}
                  onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-[7.5px] font-mono font-bold text-indigo-400 w-10 text-right">
                  {typeof (brandProfile as any)[s.key] === 'number' ? (brandProfile as any)[s.key].toFixed(2) : '0.00'}
                </span>
              </div>
            </TechnicalTooltip>
          ))}
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
          onClick={() => onPreview("Archetype calibration active. Prosody matrix resolved and variability set to dynamic mode.")}
          className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600/40 transition-all active:scale-95 shadow-lg shadow-indigo-500/5"
        >
          Preview Node
        </button>
      </div>
    </div>
  );
};