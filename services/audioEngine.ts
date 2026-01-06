import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AudioEngineType, VoicePreset, BrandVoiceProfile } from '../types';
import { decode, decodeAudioData, encode, sleep, chunkText, injectProsody } from '../utils/audioUtils';
import { higgsService } from './higgsService';
import { LIVE_MODEL, VoicePresets } from '../constants/voicePresets';
import { autoTuneByEmotion } from "../utils/emotionAutoTuner";
import { loadVoiceMemory } from "./voiceMemoryService";
import { detectNarrationMode } from "../utils/autoNarrator";
import { resolvePersonaForDocument } from "./autoPersonaService";
import { VoiceArchetypes } from "../voiceArchetypes";

export interface ChunkMetadata {
  emotion: string;
  engine: AudioEngineType;
  profile?: BrandVoiceProfile;
}

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
    breathiness: 0,
    variability: 0.2
  };
  private activeSessionPromise: Promise<any> | null = null;
  private mediaStream: MediaStream | null = null;
  private userName: string = '';
  
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
   * Prosody Matrix Resolution Layer (v2.7 Patch)
   * Preset -> Archetype -> Persona -> User Override
   */
  private resolveFinalVoiceProfile(textContext?: string, detectedEmotion?: string): BrandVoiceProfile {
    const basePreset = VoicePresets[this.currentPreset as keyof typeof VoicePresets] || VoicePresets.neutral;
    const voiceMemory = loadVoiceMemory();

    // Start with the base preset as authority for structure
    let matrix: any = {
      tone: basePreset.tone,
      rate: basePreset.rate,
      pitch: basePreset.pitch,
      timbre: basePreset.timbre,
      emphasis: basePreset.emphasis,
      pause: basePreset.pause,
      breathiness: basePreset.breathiness,
      emotion: basePreset.emotion,
      variability: 0.2
    };

    // Layer Archetype
    if (this.brandProfile.archetype && (VoiceArchetypes as any)[this.brandProfile.archetype]) {
      const arch = (VoiceArchetypes as any)[this.brandProfile.archetype];
      Object.assign(matrix, arch);
    }

    // Apply Persona Switching logic if not manually pinned
    if (!this.brandProfile.__manualOverride && textContext) {
      const autoPersona = resolvePersonaForDocument(textContext);
      if (autoPersona) {
        Object.assign(matrix, autoPersona);
      }
    }

    // Apply User Profile values (Individual manual control)
    Object.entries(this.brandProfile).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'archetype') {
        matrix[k] = v;
      }
    });

    // Final Voice Memory overrides (Global persistence)
    if (voiceMemory?.enabled !== false && voiceMemory?.profileOverrides) {
      Object.entries(voiceMemory.profileOverrides).forEach(([k, v]) => {
        if (v !== null && v !== undefined) (matrix as any)[k] = v;
      });
    }

    // Emotional Auto-tuning (Dynamic)
    if (voiceMemory?.autoTuneEmotion !== false && detectedEmotion) {
      matrix = autoTuneByEmotion(detectedEmotion, matrix);
    }

    return matrix;
  }

  public getMergedPreset() {
    return this.resolveFinalVoiceProfile();
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
        console.error("Chunk synthesis error:", err);
      }
      
      if (profile.pause > 0) {
        await sleep(profile.pause);
      } else {
        await sleep(150);
      }
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
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          this.outputAudioContext,
          24000,
          1,
        );
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
  }

  public async startLiveConversation(
    onTranscript: (text: string, role: 'user' | 'assistant') => void,
    onEngineSwitch: (engine: AudioEngineType) => void
  ): Promise<void> {
    await this.initContexts();
    if (!this.inputAudioContext || !this.outputAudioContext || !this.outputNode) return;

    this.stopAll();
    onEngineSwitch('Gemini Live');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    this.activeSessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      callbacks: {
        onopen: () => {
          const source = this.inputAudioContext!.createMediaStreamSource(this.mediaStream!);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
            
            this.activeSessionPromise?.then(session => {
              session.sendRealtimeInput({ 
                media: {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000'
                }
              });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext && this.outputNode) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext, 24000, 1);
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.addEventListener('ended', () => this.sources.delete(source));
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            this.sources.forEach(s => { try { s.stop(); } catch(e){} });
            this.sources.clear();
            this.nextStartTime = 0;
          }

          if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
          }
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription) onTranscript(currentInputTranscription, 'user');
            if (currentOutputTranscription) onTranscript(currentOutputTranscription, 'assistant');
            currentInputTranscription = '';
            currentOutputTranscription = '';
          }
        },
        onerror: (e) => console.error("Live session error:", e),
        onclose: () => console.log("Live session closed")
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: `You are AtlasAI v2.6. Respond as a concierge for ${this.userName}.`
      }
    });

    await this.activeSessionPromise;
  }
}

export const audioEngine = new HybridAudioEngine();