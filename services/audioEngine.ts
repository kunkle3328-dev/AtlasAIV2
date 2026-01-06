
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AudioEngineType, VoicePreset, BrandVoiceProfile } from '../types';
import { decode, decodeAudioData, encode, sleep } from '../utils/audioUtils';
import { higgsService } from './higgsService';
import { LIVE_MODEL } from '../constants';

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

  public setConfig(preset: VoicePreset, brandProfile: BrandVoiceProfile | null) {
    this.currentPreset = preset;
    this.brandProfile = brandProfile;
  }

  public async speak(chunkText: string, onEngineSwitch: (engine: AudioEngineType) => void): Promise<void> {
    if (this.isGeminiQuotaExceeded) {
      onEngineSwitch('Studio Voice (Higgs)');
      await this.speakWithHiggs(chunkText);
      return;
    }

    try {
      onEngineSwitch('Gemini Live');
      await this.speakWithGeminiLive(chunkText);
    } catch (error: any) {
      const errorMsg = error?.message || '';
      if (error?.status === 429 || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        console.warn("Gemini quota exceeded, switching to Higgs Audio Fallback.");
        this.isGeminiQuotaExceeded = true;
        onEngineSwitch('Studio Voice (Higgs)');
        await this.speakWithHiggs(chunkText);
      } else {
        console.error("Gemini Live error:", error);
        onEngineSwitch('Studio Voice (Higgs)');
        await this.speakWithHiggs(chunkText);
      }
    }
  }

  private async speakWithGeminiLive(text: string): Promise<void> {
    this.initContexts();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const instruction = this.getInstruction();

    return new Promise((resolve, reject) => {
      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: instruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          }
        },
        callbacks: {
          onopen: () => {
            sessionPromise.then(session => {
              session.send({ parts: [{ text: `Synthesize this: ${text}` }] });
            }).catch(reject);
          },
          onmessage: async (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                await this.playAudioBytes(part.inlineData.data);
              }
            }
            if (message.serverContent?.turnComplete) {
              resolve();
            }
          },
          onerror: (e) => reject(e),
          onclose: () => resolve(),
        }
      });
    });
  }

  public async startLiveConversation(
    onTranscription: (text: string, role: 'user' | 'assistant') => void,
    onEngineStatus: (engine: AudioEngineType) => void
  ): Promise<void> {
    this.initContexts();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const instruction = `${this.getInstruction()} You are in a hands-free voice conversation. Use natural micro-pauses. You are interruptible.`;

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
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          
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
        onerror: (e) => console.error("Live Session Error:", e),
        onclose: () => console.log("Live Session Closed"),
      }
    });

    this.activeSessionPromise = sessionPromise;
  }

  private getInstruction() {
    let instruction = "Speak conversationally.";
    if (this.currentPreset === VoicePreset.WARM) instruction = "Speak slowly, warmly, and softly.";
    if (this.currentPreset === VoicePreset.CONFIDENT) instruction = "Speak declaratively with assertive emphasis.";
    if (this.currentPreset === VoicePreset.STORYTELLER) instruction = "Use dramatic pauses and expressive narration.";
    if (this.currentPreset === VoicePreset.INSTRUCTIONAL) instruction = "Speak crisply with clear, logical pacing.";
    if (this.brandProfile) {
      instruction += ` Use a ${this.brandProfile.tone} tone and ${this.brandProfile.pacing} pacing.`;
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
  }

  private async speakWithHiggs(text: string): Promise<void> {
    await higgsService.generateSpeech(text);
    await sleep(250);
  }

  public resetQuota() {
    this.isGeminiQuotaExceeded = false;
  }
}

export const audioEngine = new HybridAudioEngine();
