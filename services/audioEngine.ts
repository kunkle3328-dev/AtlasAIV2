import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AudioEngineType, VoicePreset, BrandVoiceProfile } from '../types';
import { decode, decodeAudioData, encode, sleep, injectProsody, chunkText } from '../utils/audioUtils';
import { higgsService } from './higgsService';
import { LIVE_MODEL } from '../constants';
import { VoicePresets } from '../constants/voicePresets';

export class HybridAudioEngine {
  private outputAudioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private isGeminiQuotaExceeded: boolean = false;
  private currentPreset: VoicePreset = VoicePreset.NEUTRAL;
  private brandProfile: BrandVoiceProfile | null = null;
  private activeSessionPromise: Promise<any> | null = null;
  private mediaStream: MediaStream | null = null;
  private userName: string = '';
  
  // Public state for tracking
  public currentEmotion: string = 'neutral';

  private initContexts() {
    if (!this.outputAudioContext) {
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);
    }
    if (!this.inputAudioContext) {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
  }

  /**
   * Semantic emotion analyzer.
   * Modulates the base emotion based on linguistic cues.
   */
  private analyzeEmotion(text: string, baseEmotion: string): string {
    const lowerText = text.toLowerCase();
    let emotion = baseEmotion;
    if (/!|\bexcited\b|\bamazing\b|\bwow\b|\bgreat\b/i.test(lowerText)) emotion = "excited";
    else if (/\?|\bcurious\b|\bwonder\b|\breally\b/i.test(lowerText)) emotion = "curious";
    else if (/sorry|apolog|regret|unfortunate/i.test(lowerText)) emotion = "empathetic";
    else if (/warning|caution|critical|urgent|stop/i.test(lowerText)) emotion = "serious";
    else if (/\bha\b|\bfunny\b|\blol\b|laugh/i.test(lowerText)) emotion = "cheerful";
    
    this.currentEmotion = emotion;
    return emotion;
  }

  public setConfig(preset: VoicePreset, brandProfile: BrandVoiceProfile | null, userName: string) {
    this.currentPreset = preset;
    this.brandProfile = brandProfile;
    this.userName = userName;
  }

  /**
   * Centralized speaking pipeline to ensure background persistence.
   */
  public async speakText(
    fullText: string, 
    onEngineSwitch: (engine: AudioEngineType) => void, 
    onChunkUpdate: (index: number, status: 'playing' | 'completed' | 'error') => void
  ): Promise<void> {
    const chunks = chunkText(fullText);
    for (let i = 0; i < chunks.length; i++) {
      onChunkUpdate(i, 'playing');
      try {
        await this.speak(chunks[i], onEngineSwitch);
        onChunkUpdate(i, 'completed');
      } catch (err) {
        onChunkUpdate(i, 'error');
        console.error("Chunk synthesis error:", err);
      }
      // Small buffer between chunks for natural cadence
      await sleep(150);
    }
  }

  public async speak(chunkText: string, onEngineSwitch: (engine: AudioEngineType) => void): Promise<void> {
    const presetData = VoicePresets[this.currentPreset as keyof typeof VoicePresets] || VoicePresets.neutral;
    const dynamicEmotion = this.analyzeEmotion(chunkText, presetData.baseEmotion);
    const prosodyChunk = injectProsody(chunkText, { ...presetData, emotion: dynamicEmotion });

    if (this.isGeminiQuotaExceeded) {
      onEngineSwitch('Studio Voice (Higgs)');
      await this.speakWithHiggs(prosodyChunk);
      return;
    }

    try {
      onEngineSwitch('Gemini Live');
      await this.speakWithGeminiLive(prosodyChunk, dynamicEmotion);
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (error?.status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        this.isGeminiQuotaExceeded = true;
        onEngineSwitch('Studio Voice (Higgs)');
        await this.speakWithHiggs(prosodyChunk);
      } else {
        onEngineSwitch('Studio Voice (Higgs)');
        await this.speakWithHiggs(prosodyChunk);
      }
    }
  }

  private async speakWithHiggs(text: string): Promise<void> {
    await higgsService.generateSpeech(text);
  }

  private async speakWithGeminiLive(prosodyText: string, dynamicEmotion: string): Promise<void> {
    this.initContexts();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const instruction = `${this.getInstruction()} 
    DYNAMIC STATE: Currently expressing with a ${dynamicEmotion} inflection.`;

    const response = await ai.models.generateContent({
      model: LIVE_MODEL,
      contents: [{ parts: [{ text: `Synthesize this with ${dynamicEmotion} nuance: ${prosodyText}` }] }],
      config: {
        systemInstruction: instruction,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      await this.playAudioBytes(base64Audio);
    }
  }

  public async startLiveConversation(
    onTranscription: (text: string, role: 'user' | 'assistant') => void,
    onEngineStatus: (engine: AudioEngineType) => void
  ): Promise<void> {
    this.initContexts();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const instruction = `${this.getInstruction()} 
    IMPORTANT CONVERSATIONAL RULES:
    1. Be highly conversational and natural. Use verbal fillers like "hmm" or "I see" sparingly to sound human.
    2. Adhere strictly to the requested acoustic timbre. 
    3. Dynamically shift your prosody based on the emotional subtext of the conversation.
    4. Since you are in a live stream, always keep your responses brief and focus on the user: ${this.userName || 'Client'}.`;

    const sessionPromise = ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: instruction,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      },
      callbacks: {
        onopen: () => {
          onEngineStatus('Gemini Live');
          const source = this.inputAudioContext!.createMediaStreamSource(this.mediaStream!);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(1024, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createBlob(inputData);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription?.text) {
            onTranscription(message.serverContent.inputTranscription.text, 'user');
          }
          if (message.serverContent?.outputTranscription?.text) {
            onTranscription(message.serverContent.outputTranscription.text, 'assistant');
          }

          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              await this.playAudioBytes(part.inlineData.data);
            }
          }

          if (message.serverContent?.interrupted) {
            this.stopPlayback();
          }
        },
        onerror: (e) => onEngineStatus('Studio Voice (Higgs)'),
        onclose: () => {
          console.log("Session terminated.");
          this.currentEmotion = 'neutral';
        },
      }
    });

    this.activeSessionPromise = sessionPromise;
  }

  private getInstruction() {
    const presetData = VoicePresets[this.currentPreset as keyof typeof VoicePresets] || VoicePresets.neutral;
    const targetName = this.userName || 'Client';
    let instruction = `You are AtlasAI, an elite knowledge concierge. 
    USER IDENTITY: Your client's name is ${targetName}. You must ALWAYS refer to them as ${targetName} throughout the conversation to maintain a personalized elite experience.
    
    FOUNDATIONAL VOCAL STAMP:
    - Pitch Shift: ${presetData.pitch}
    - Speed Rate: ${presetData.rate}
    - Acoustic Timbre: ${presetData.timbre}
    - Baseline Emotion: ${presetData.baseEmotion}
    - Syllabic Emphasis: ${presetData.emphasis}

    Synthesize audio using highly realistic, human cadences. Avoid monotone. Adaptive prosody is mandatory.`;

    if (this.brandProfile) {
      instruction += ` Additionally, ensure a ${this.brandProfile.tone} tone and ${this.brandProfile.pacing} delivery.`;
    }

    return instruction;
  }

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private async playAudioBytes(base64: string) {
    if (!this.outputAudioContext || !this.outputNode) return;
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    const audioBuffer = await decodeAudioData(
      decode(base64),
      this.outputAudioContext,
      24000,
      1
    );
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    source.addEventListener('ended', () => this.sources.delete(source));
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private stopPlayback() {
    for (const source of this.sources) {
      try { source.stop(); } catch(e) {}
    }
    this.sources.clear();
    this.nextStartTime = 0;
    this.currentEmotion = 'neutral';
  }

  public stopAll() {
    this.stopPlayback();
    if (this.activeSessionPromise) {
      this.activeSessionPromise.then(s => s.close());
      this.activeSessionPromise = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentEmotion = 'neutral';
  }
}

export const audioEngine = new HybridAudioEngine();
