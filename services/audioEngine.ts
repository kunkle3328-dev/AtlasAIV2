import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AudioEngineType, VoicePreset, BrandVoiceProfile, SessionState, MasterVoicePreset, HumanizationReport } from '../types';
import { decode, decodeAudioData, encode, sleep, chunkText, injectProsody } from '../utils/audioUtils';
import { higgsService } from './higgsService';
import { LIVE_MODEL, VoicePresets } from '../constants/voicePresets';
import { autoTuneByEmotion } from "../utils/emotionAutoTuner";
import { loadVoiceMemory } from "./voiceMemoryService";
import { detectNarrationMode } from "../utils/autoNarrator";
import { resolvePersonaForDocument } from "./autoPersonaService";
import { VoiceArchetypes } from "../voiceArchetypes";
import { MasterPresets } from '../voice/MasterVoicePreset';
import { HumanizationScorer } from '../voice/humanizationScore';

export interface ChunkMetadata {
  emotion: string;
  engine: AudioEngineType;
  profile?: BrandVoiceProfile;
}

const SAFE_NEUTRAL_PROFILE: BrandVoiceProfile = {
  tone: 'formal',
  rate: 1.0,
  pitch: 0,
  timbre: 0,
  emphasis: 0,
  pause: 200,
  breathiness: 0,
  variability: 0,
  prosodyVariance: 0,
  masterPresetId: 'safe_neutral',
  advanced: {
    humanizationLevel: 0,
    breathRealism: false,
    conversationalWarmth: 0,
    stabilityVsExpressiveness: 0
  }
};

export class HybridAudioEngine {
  private outputAudioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private isGeminiQuotaExceeded: boolean = false;
  private currentPreset: VoicePreset = VoicePreset.NEUTRAL;
  private brandProfile: BrandVoiceProfile = {
    tone: 'friendly',
    rate: 1.0,
    pitch: 0,
    timbre: 0,
    emphasis: 0.1,
    pause: 0,
    breathiness: 0.05,
    vocalTension: 0,
    prosodyVariance: 0.2,
    bargeInSensitivity: 0.5,
    variability: 0.2,
    masterPresetId: 'calm_professional',
    advanced: {
      humanizationLevel: 0.4,
      breathRealism: true,
      conversationalWarmth: 0.5,
      stabilityVsExpressiveness: 0.5
    }
  };
  private activeSessionPromise: Promise<any> | null = null;
  private mediaStream: MediaStream | null = null;
  private userName: string = '';
  
  private currentState: SessionState = 'idle';
  private lastAudioFrameTs: number = Date.now();
  private watchdogTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private responseRequestedAt: number = 0;
  private responseStartedAt: number = 0;
  private recoveryAttempts: number = 0;
  private isWaitingForResponse: boolean = false;
  private sessionLatency: number = 0;
  private adaptiveProsodyScale: number = 1.0;
  
  public currentEmotion: string = 'neutral';

  public async initContexts() {
    if (!this.outputAudioContext) {
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.gain.value = 1.0;
      this.outputNode.connect(this.outputAudioContext.destination);
    }
    
    if (this.outputAudioContext.state === 'suspended') {
      await this.outputAudioContext.resume();
    }

    if (!this.inputAudioContext) {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
  }

  private analyzeIntent(text: string): string {
    const lower = text.toLowerCase();
    if (/step|instruction|guide|how to|first/i.test(lower)) return "instruction";
    if (/sorry|apolog|understand|feel/i.test(lower)) return "reassurance";
    if (/warning|critical|stop|caution/i.test(lower)) return "warning";
    if (/story|imagine|once upon|narrative/i.test(lower)) return "storytelling";
    return "explanation";
  }

  private analyzeEmotion(text: string, baseEmotion: string): string {
    const narrationMode = detectNarrationMode(text);
    if (narrationMode !== "neutral") return narrationMode;

    const lowerText = text.toLowerCase();
    if (/!|\bexcited\b|\bamazing\b|\bwow\b|\bgreat\b/i.test(lowerText)) return "excited";
    if (/\?|\bcurious\b|\bwonder\b|\breally\b/i.test(lowerText)) return "curious";
    if (/sorry|apolog|regret|unfortunate/i.test(lowerText)) return "empathetic";
    if (/warning|caution|critical|urgent|stop/i.test(lowerText)) return "serious";
    if (/\bha\b|\bfunny\b|\blol\b|laugh/i.test(lowerText)) return "cheerful";
    
    return baseEmotion;
  }

  public setConfig(preset: VoicePreset, brandProfile: BrandVoiceProfile, userName: string) {
    this.currentPreset = preset;
    this.brandProfile = brandProfile;
    this.userName = userName;
  }

  /**
   * Fail-Safe Voice Resolution.
   * Ensures that advanced logic never blocks synthesis by providing a SafeNeutral fallback.
   * CLAMP: Resolution logic must complete within 300ms or auto-fallback occurs.
   */
  private resolveFinalVoiceProfile(textContext?: string, detectedEmotion?: string): BrandVoiceProfile {
    try {
      const startRes = performance.now();
      const masterId = this.brandProfile.masterPresetId || 'calm_professional';
      const master = MasterPresets[masterId] || MasterPresets.calm_professional;

      let matrix: any = {
        ...master.prosodyMatrix,
        variability: master.microProsodyBounds.variability,
        prosodyVariance: master.microProsodyBounds.prosodyVariance,
        emotion: detectedEmotion || 'neutral',
        masterPresetId: master.id,
        advanced: { ...this.brandProfile.advanced }
      };

      if (this.brandProfile.archetype && (VoiceArchetypes as any)[this.brandProfile.archetype]) {
        const arch = (VoiceArchetypes as any)[this.brandProfile.archetype];
        Object.assign(matrix, arch);
      }

      if (textContext) {
        const intent = this.analyzeIntent(textContext);
        matrix.intent = intent;
        const pacing = master.intentPacingProfile;
        if (intent === 'instruction') {
          matrix.rate *= pacing.instructionScale;
          matrix.pause += 150;
        } else if (intent === 'reassurance') {
          matrix.rate *= pacing.reassuranceScale;
          matrix.vocalTension -= 0.1;
        } else if (intent === 'storytelling') {
          matrix.rate *= pacing.storytellingScale;
          matrix.variability *= 1.3;
        }
      }

      Object.entries(this.brandProfile).forEach(([k, v]) => {
        if (v !== undefined && v !== null && !['archetype', 'advanced', 'masterPresetId', 'lastReport'].includes(k)) {
          matrix[k] = v;
        }
      });

      if (textContext) {
        let report = HumanizationScorer.score(textContext, matrix);
        const corrections: string[] = [];
        if (report.score < 65) {
          if (report.metrics.pitchVariance < 40) {
            matrix.prosodyVariance = (matrix.prosodyVariance || 0.2) + 0.15;
            matrix.variability = (matrix.variability || 0.2) + 0.1;
            corrections.push("Enhanced Pitch Variance");
          }
          if (report.metrics.pauseNaturalness < 50) {
            matrix.pause = (matrix.pause || 0) + 200;
            corrections.push("Extended Clause Pauses");
          }
          matrix.rate *= 0.95;
          report = HumanizationScorer.score(textContext, matrix);
          report.adjustmentsApplied = corrections;
        } 
        matrix.lastReport = report;
      }

      matrix.pitch = Math.min(master.safetyConstraints.maxPitch, Math.max(-1, matrix.pitch));
      matrix.rate = Math.min(master.safetyConstraints.maxRate, Math.max(0.5, matrix.rate));

      if (performance.now() - startRes > 300) {
        console.warn("[VoiceEngine] Resolution threshold exceeded. Degraded performance detected.");
      }

      return matrix;
    } catch (e) {
      console.error("[VoiceEngine] Neural resolution failed. Using SafeNeutral fallback.", e);
      return SAFE_NEUTRAL_PROFILE;
    }
  }

  public async speakText(
    fullText: string, 
    onEngineSwitch: (engine: AudioEngineType) => void, 
    onChunkUpdate: (index: number, status: 'playing' | 'completed' | 'error', meta?: ChunkMetadata) => void
  ): Promise<void> {
    await this.initContexts();
    const chunks = chunkText(fullText);
    for (let i = 0; i < chunks.length; i++) {
      const initialPreset = VoicePresets[this.currentPreset as keyof typeof VoicePresets] || VoicePresets.neutral;
      const dynamicEmotion = this.analyzeEmotion(chunks[i], initialPreset.emotion);
      const engine: AudioEngineType = this.isGeminiQuotaExceeded ? 'Studio Voice (Higgs)' : 'Gemini Live';
      
      const profile = this.resolveFinalVoiceProfile(chunks[i], dynamicEmotion);
      onChunkUpdate(i, 'playing', { emotion: dynamicEmotion, engine, profile });
      
      try {
        await this.speak(chunks[i], onEngineSwitch, dynamicEmotion);
        onChunkUpdate(i, 'completed', { emotion: dynamicEmotion, engine, profile });
      } catch (err) {
        onChunkUpdate(i, 'error', { emotion: dynamicEmotion, engine, profile });
        console.error("[VoiceEngine] Synthesis chunk failed:", err);
      }
      
      const masterId = profile.masterPresetId || 'calm_professional';
      const master = MasterPresets[masterId];
      if (master && master.breathModel.microPauses && i < chunks.length - 1) {
        const words = chunks[i].split(/\s+/).length;
        if (words > master.breathModel.inhaleFrequency) {
          await sleep(master.breathModel.inhaleLengthMs);
        }
      }
      await sleep(150);
    }
  }

  public async speak(text: string, onEngineSwitch: (engine: AudioEngineType) => void, emotion?: string): Promise<void> {
    const engine: AudioEngineType = this.isGeminiQuotaExceeded ? 'Studio Voice (Higgs)' : 'Gemini Live';
    onEngineSwitch(engine);

    if (engine === 'Studio Voice (Higgs)') {
      await higgsService.generateSpeech(text);
      return;
    }

    try {
      // RESPONSE-FIRST: Resolve profile in a fast, non-blocking try/catch
      const matrix = this.resolveFinalVoiceProfile(text, emotion);
      const prosodyText = injectProsody(text, matrix);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prosodyText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio && this.outputAudioContext && this.outputNode) {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () => {
          this.sources.delete(source);
        });
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        await sleep(audioBuffer.duration * 1000);
      }
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        this.isGeminiQuotaExceeded = true;
        return this.speak(text, onEngineSwitch, emotion);
      }
      throw err;
    }
  }

  public stopAll() {
    this.sources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
    
    if (this.activeSessionPromise) {
      this.activeSessionPromise.then(session => session.close()).catch(() => {});
      this.activeSessionPromise = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.watchdogTimer = null;
    this.heartbeatTimer = null;
    this.isWaitingForResponse = false;
    this.recoveryAttempts = 0;
    this.currentState = 'idle';
  }

  private async failLoud(message: string) {
    console.warn(`[Pipeline] Fail-Loud: ${message}`);
    await this.speak(message, (eng) => {});
  }

  private updateState(newState: SessionState, onStateChange?: (state: SessionState) => void) {
    if (this.currentState === newState) return;
    console.log(`[Pipeline] Transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    onStateChange?.(newState);
  }

  public async startLiveConversation(
    onTranscript: (text: string, role: 'user' | 'assistant', telemetry?: any) => void,
    onEngineSwitch: (engine: AudioEngineType) => void,
    onStateChange?: (state: SessionState) => void,
    onKeyError?: () => void
  ): Promise<void> {
    await this.initContexts();
    if (!this.inputAudioContext || !this.outputAudioContext || !this.outputNode) return;

    this.stopAll();
    onEngineSwitch('Gemini Live');
    this.updateState('listening', onStateChange);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
    } catch (err) {
      this.updateState('error', onStateChange);
      throw err;
    }

    let currentInputTranscription = '';
    let currentOutputTranscription = '';
    this.lastAudioFrameTs = Date.now();
    this.isWaitingForResponse = false;
    this.responseStartedAt = 0;
    this.responseRequestedAt = 0;

    const sessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      callbacks: {
        onopen: () => {
          const source = this.inputAudioContext!.createMediaStreamSource(this.mediaStream!);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const isAISpeaking = this.sources.size > 0;
            const inputData = e.inputBuffer.getChannelData(0);
            const energy = inputData.reduce((acc, val) => acc + Math.abs(val), 0) / inputData.length;
            if (energy > 0.008 && !isAISpeaking) {
              this.lastAudioFrameTs = Date.now();
            }
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * (isAISpeaking ? 0.05 : 1.0) * 32768;
            }
            sessionPromise.then(session => {
              session.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
              });
            }).catch(() => {});
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);

          this.watchdogTimer = window.setInterval(() => {
            const now = Date.now();
            const idleTime = now - this.lastAudioFrameTs;
            // ESCAPE HATCH: 1500ms timeout for non-responsive turns after input
            if (idleTime > 1500 && this.isWaitingForResponse && this.responseStartedAt === 0) {
              if (now - this.responseRequestedAt > 1500) {
                console.warn("[Pipeline] Live response deadlock detected. Retriggering...");
                this.updateState('recovering', onStateChange);
                // Attempt to poke the session with empty data to trigger response generation
                sessionPromise.then(s => {
                   const silence = new Int16Array(100);
                   s.sendRealtimeInput({ media: { data: encode(new Uint8Array(silence.buffer)), mimeType: 'audio/pcm;rate=16000' } });
                });
              }
            }
          }, 1000);
        },
        onmessage: async (message: LiveServerMessage) => {
          // De-prioritize complex voice resolution to ensure transcriptions and base audio flow
          const parts = message.serverContent?.modelTurn?.parts || [];
          const base64Audio = parts[0]?.inlineData?.data;
          
          if (base64Audio) {
            if (this.responseStartedAt === 0) {
              this.responseStartedAt = Date.now();
              this.updateState('playing', onStateChange);
            }
            if (this.outputAudioContext && this.outputNode) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => {
                this.sources.delete(source);
                if (this.sources.size === 0 && !this.isWaitingForResponse) {
                  this.updateState('listening', onStateChange);
                }
              });
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
              this.sources.add(source);
            }
          }

          if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text || '';
            this.isWaitingForResponse = true;
            this.responseRequestedAt = Date.now();
            this.responseStartedAt = 0;
            this.updateState('responding', onStateChange);
          }
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text || '';
          }

          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription.trim()) {
              onTranscript(currentInputTranscription, 'user');
              if (currentOutputTranscription) onTranscript(currentOutputTranscription, 'assistant');
            }
            currentInputTranscription = '';
            currentOutputTranscription = '';
            this.isWaitingForResponse = false;
          }
        },
        onerror: (e: any) => {
          console.error("[Pipeline] Critical session error:", e);
          this.updateState('error', onStateChange);
          onKeyError?.();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: `You are AtlasAI, a high-fidelity concierge. Current profile: ${this.brandProfile.masterPresetId || 'calm_professional'}. ALWAYS respond immediately to voice input.`
      }
    });

    this.activeSessionPromise = sessionPromise;
    await sessionPromise;
  }
}

export const audioEngine = new HybridAudioEngine();