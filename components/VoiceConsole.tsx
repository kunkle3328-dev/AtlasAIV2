import React from "react";
import { VoicePresets } from "../constants/voicePresets";
import { VoicePreset, BrandVoiceProfile, AdvancedVoiceConfig } from "../types";
import { updateVoiceMemory } from "../services/voiceMemoryService";
import { VoiceMemoryToggle } from "./VoiceMemoryToggle";
import { VoicePersonaSelector } from "./VoicePersonaSelector";
import { PersonaExportPanel } from "./PersonaExportPanel";
import { VoiceArchetypes, ArchetypeKey } from "../voiceArchetypes";
import { MasterPresets } from "../voice/MasterVoicePreset";

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
    <div className="group relative flex flex-col gap-1.5 opacity-100">
      <div className="flex justify-between items-center px-1">
        <label className="text-[7px] text-zinc-500 font-black uppercase tracking-widest cursor-help flex items-center gap-1">
          {label}
          <span className="opacity-40">(?)</span>
        </label>
        <div className="absolute bottom-full left-0 mb-3 w-72 p-4 glass-premium pearlescent border border-white/20 rounded-xl text-[10px] text-zinc-200 hidden group-hover:block z-[100] pointer-events-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-2">
            <p className="font-semibold leading-relaxed tracking-tight">{text}</p>
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
  const coreSliderConfig = [
    { 
      label: "Pitch Matrix", 
      key: "pitch", 
      min: -1, 
      max: 1, 
      step: 0.05, 
      tooltip: "Calibrates the fundamental frequency (F0) of the speech engine. High values increase perceived youthful energy and enthusiasm, while low values project authoritative gravitas and analytical weight. [Suggested: 0.10 for professional clarity; -0.20 for executive depth]" 
    },
    { 
      label: "Pace Calibration", 
      key: "rate", 
      min: 0.5, 
      max: 2.0, 
      step: 0.05, 
      tooltip: "Governs temporal density and word-per-minute (WPM) throughput. Accelerated rates suggest urgency or cognitive high-performance; decelerated rates improve comprehension for instructional or technical data readouts. [Suggested: 0.95 for analytical narration; 1.15 for high-energy interaction]" 
    },
    { 
      label: "Acoustic Timbre", 
      key: "timbre", 
      min: -0.5, 
      max: 0.5, 
      step: 0.05, 
      tooltip: "Adjusts spectral resonance and harmonic richness. Shifts the vocal output between 'bright' (metallic/clear) and 'dark' (warm/muffled) qualities to alter brand perception. [Suggested: 0.15 for friendly engagement; -0.10 for serious briefings]" 
    },
    { 
      label: "Vocal Emphasis", 
      key: "emphasis", 
      min: 0, 
      max: 1.5, 
      step: 0.05, 
      tooltip: "Modulates prosodic stress patterns on significant tokens. Higher intensity creates a more persuasive, 'selling' tone by accentuating semantic keywords within the sentence. [Suggested: 0.80 for standard dialogue; 1.20 for dynamic storytelling]" 
    },
    { 
      label: "Breathiness", 
      key: "breathiness", 
      min: 0, 
      max: 0.4, 
      step: 0.01, 
      tooltip: "Injects stochastic aspiration into the vocal stream. Simulates natural airflow and lung capacity to reduce 'digital hardness' and increase perceived human proximity. [Suggested: 0.05 for clear utility use; 0.20 for intimate or empathetic personas]" 
    }
  ];

  const behaviorSliderConfig = [
    { 
      label: "Vocal Tension", 
      key: "vocalTension", 
      min: -0.5, 
      max: 0.5, 
      step: 0.05, 
      tooltip: "Simulates physiological laryngeal constriction. Increased tension conveys stress, urgency, or extreme excitement; negative values promote a relaxed, 'flow-state' and non-judgmental delivery. [Suggested: -0.15 for supportive coaching; 0.20 for urgent security alerts]" 
    },
    { 
      label: "Prosody Variance", 
      key: "prosodyVariance", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Defines the melodic excursion and contour range of the sentence. High variance avoids 'robotic' monotone by introducing significant pitch shifts across phrases. [Suggested: 0.45 for natural conversation; 0.15 for technical data readouts]" 
    },
    { 
      label: "Micro-Variability", 
      key: "variability", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Introduces jitter and shimmer artifacts to the rhythmic timing. Mimics human speech inconsistencies and micro-hesitations to break repetitive digital patterns. [Suggested: 0.25 for standard realism; 0.60 for highly expressive narrative roles]" 
    },
    { 
      label: "Barge-In Sensitivity", 
      key: "bargeInSensitivity", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Configures the neural threshold for detecting user interruptions during duplex audio streaming. High sensitivity permits fluid turn-taking even in noisy environments. [Suggested: 0.75 for fast-paced Q&A; 0.40 for long-form lectures]" 
    }
  ];

  const advancedSliderConfig = [
    { 
      label: "Neural Realism", 
      key: "humanizationLevel", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Controls the recursive feedback loop intensity of the Humanization Scorer. Higher levels permit the AI to autonomously self-correct its prosody based on real-time semantic intent. [Suggested: 0.60 for elite concierge; 0.20 for basic utility tasks]" 
    },
    { 
      label: "Conversational Warmth", 
      key: "conversationalWarmth", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Applies subtle spectral EQ shifts and temporal softening for increased emotional intimacy. Optimizes 'trust' frequency bands within the vocal spectrum. [Suggested: 0.50 for customer service; 0.85 for therapeutic guidance]" 
    },
    { 
      label: "Expressive Stability", 
      key: "stabilityVsExpressiveness", 
      min: 0, 
      max: 1.0, 
      step: 0.05, 
      tooltip: "Manages the tradeoff between consistent tonal identity and situational emotional range. High stability ensures brand voice consistency; high expressiveness enables theatrical range. [Suggested: 0.70 for corporate identity; 0.35 for dramatic storytelling]" 
    }
  ];

  const handleMasterPresetChange = (masterId: string) => {
    const updated = { ...brandProfile, masterPresetId: masterId, __manualOverride: false };
    onProfileChange(updated);
    updateVoiceMemory({ profileOverrides: updated });
  };

  const handleSliderChange = (key: string, value: number) => {
    const updated = { ...brandProfile, [key]: value, __manualOverride: true };
    onProfileChange(updated);
    updateVoiceMemory({ profileOverrides: updated });
  };

  const handleAdvancedSliderChange = (key: keyof AdvancedVoiceConfig, value: number) => {
    const updated = { 
      ...brandProfile, 
      advanced: { ...brandProfile.advanced, [key]: value },
      __manualOverride: true 
    };
    onProfileChange(updated);
    updateVoiceMemory({ profileOverrides: updated });
  };

  const handleArchetypeSelection = (key: ArchetypeKey) => {
    const arch = VoiceArchetypes[key];
    const updated = { 
      ...brandProfile, 
      ...arch, 
      archetype: key, 
      __manualOverride: false 
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
      vocalTension: 0,
      prosodyVariance: 0.2,
      bargeInSensitivity: 0.5,
      variability: 0.2,
      masterPresetId: 'calm_professional',
      __manualOverride: false,
      advanced: {
        humanizationLevel: 0.4,
        breathRealism: true,
        conversationalWarmth: 0.5,
        stabilityVsExpressiveness: 0.5
      }
    };
    onProfileChange(defaultProfile);
    updateVoiceMemory({ profileOverrides: defaultProfile });
  };

  const activeEmotion = currentEmotion || VoicePresets[selectedPreset]?.emotion || 'neutral';
  const lastReport = brandProfile.lastReport;

  const sliderStyle = "flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:bg-zinc-700 transition-colors";
  const emeraldSliderStyle = "flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:bg-zinc-700 transition-colors";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 opacity-100">
      
      {/* 1. Global Persistence & Toggles */}
      <VoiceMemoryToggle />

      {/* 2. Neural Realism Diagnostic (If Active) */}
      {lastReport && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[7.5px] font-black text-emerald-400 uppercase tracking-[0.2em]">Neural Realism Diagnostic</label>
            <span className={`text-[10px] font-mono font-bold ${lastReport.score > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Q_SCORE: {lastReport.score}%
            </span>
          </div>
          <div className="bg-[#0c0c0c] p-4 rounded-[1.5rem] border border-emerald-500/20 shadow-inner space-y-3 opacity-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-zinc-500 font-black uppercase tracking-widest">Pitch Diversity</span>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${lastReport.metrics.pitchVariance}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[6px] text-zinc-500 font-black uppercase tracking-widest">Pause Balance</span>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${lastReport.metrics.pauseNaturalness}%` }}></div>
                </div>
              </div>
            </div>
            
            {lastReport.adjustmentsApplied.length > 0 && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-[6px] text-emerald-500/60 font-black uppercase tracking-widest block mb-1">Self-Correction Active:</span>
                <div className="flex flex-wrap gap-1">
                  {lastReport.adjustmentsApplied.map((adj, i) => (
                    <span key={i} className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                      {adj}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Master Realism Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-indigo-400 uppercase tracking-[0.2em]">Master Realism Core</label>
        </div>
        <div className="flex flex-col gap-2">
          {Object.values(MasterPresets).map((master) => (
            <button
              key={master.id}
              onClick={() => handleMasterPresetChange(master.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                brandProfile.masterPresetId === master.id 
                  ? "bg-indigo-600/20 border-indigo-500/50 shadow-lg" 
                  : "bg-[#080808]/40 border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${brandProfile.masterPresetId === master.id ? 'text-white' : 'text-zinc-400'}`}>
                  {master.displayName}
                </span>
                {brandProfile.masterPresetId === master.id && (
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[8px] text-zinc-500 font-bold leading-relaxed">{master.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Manual Prosody Overrides */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Manual Prosody Overrides</label>
          <button onClick={handleReset} className="text-[7px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">RESET NODE</button>
        </div>
        <div className="bg-[#0a0a0a] p-5 rounded-[1.5rem] space-y-5 border border-white/5 shadow-inner opacity-100">
          {coreSliderConfig.map((s) => (
            <TechnicalTooltip key={s.key} label={s.label} text={s.tooltip}>
              <div className="flex items-center gap-4">
                <input type="range" min={s.min} max={s.max} step={s.step} value={(brandProfile as any)[s.key] ?? 0} onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))} className={sliderStyle} />
                <span className="text-[8px] font-mono font-bold text-indigo-400 w-10 text-right">{(brandProfile as any)[s.key]?.toFixed(2) || '0.00'}</span>
              </div>
            </TechnicalTooltip>
          ))}
        </div>
      </div>

      {/* 5. Behavioral Calibration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Behavioral Calibration</label>
        </div>
        <div className="bg-[#0a0a0a] p-5 rounded-[1.5rem] space-y-5 border border-white/5 shadow-inner opacity-100">
          {behaviorSliderConfig.map((s) => (
            <TechnicalTooltip key={s.key} label={s.label} text={s.tooltip}>
              <div className="flex items-center gap-4">
                <input type="range" min={s.min} max={s.max} step={s.step} value={(brandProfile as any)[s.key] ?? 0} onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))} className={sliderStyle} />
                <span className="text-[8px] font-mono font-bold text-indigo-400 w-10 text-right">{(brandProfile as any)[s.key]?.toFixed(2) || '0.00'}</span>
              </div>
            </TechnicalTooltip>
          ))}
        </div>
      </div>

      {/* 6. Advanced Neural Calibration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Advanced Neural Calibration</label>
        </div>
        <div className="bg-[#0a0a0a] p-5 rounded-[1.5rem] space-y-5 border border-white/5 shadow-inner opacity-100">
          {advancedSliderConfig.map((s) => (
            <TechnicalTooltip key={s.key} label={s.label} text={s.tooltip}>
              <div className="flex items-center gap-4">
                <input type="range" min={s.min} max={s.max} step={s.step} value={(brandProfile.advanced as any)?.[s.key] ?? 0.5} onChange={(e) => handleAdvancedSliderChange(s.key as any, parseFloat(e.target.value))} className={emeraldSliderStyle} />
                <span className="text-[8px] font-mono font-bold text-emerald-400 w-10 text-right">{(brandProfile.advanced as any)?.[s.key]?.toFixed(2) || '0.50'}</span>
              </div>
            </TechnicalTooltip>
          ))}
        </div>
      </div>

      {/* 7. Archetypes & Personas */}
      <div className="space-y-6">
        <VoicePersonaSelector currentProfile={brandProfile} onSelect={(profile: BrandVoiceProfile) => onProfileChange({ ...profile, __manualOverride: true })} />
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Archetype Quick-Load</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VoiceArchetypes) as ArchetypeKey[]).map((key) => (
              <button key={key} onClick={() => handleArchetypeSelection(key)} className={`flex-1 min-w-[100px] py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter border transition-all active:scale-95 ${brandProfile.archetype === key ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" : "bg-[#080808]/60 border-white/5 text-zinc-600 hover:text-zinc-400"}`}>
                {VoiceArchetypes[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Export/Import */}
      <PersonaExportPanel />

      {/* 9. Preview & State */}
      <div className="flex items-center justify-between bg-[#080808]/60 p-3 rounded-2xl border border-white/5 mt-2 opacity-100">
        <div className="flex flex-col">
          <span className="text-[7px] text-zinc-500 font-black uppercase tracking-[0.2em]">Active Aura</span>
          <span className={`text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-0.5 ${isSpeaking ? 'animate-pulse' : ''}`}>
            {activeEmotion}
          </span>
        </div>
        <button onClick={() => onPreview("System parameters recalibrated. System architecture optimized for high-fidelity bimodal synthesis. Analysis complete.")} className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600/40 transition-all active:scale-95 shadow-lg shadow-indigo-500/5">
          PREVIEW NODE
        </button>
      </div>
    </div>
  );
};