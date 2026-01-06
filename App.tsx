import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  VoicePreset, 
  BrandVoiceProfile, 
  AudioEngineType, 
  AudioChunk, 
  Message 
} from './types';
import { Icons, GEMINI_MODEL, VoicePresets } from './constants';
import { chunkText, sleep } from './utils/audioUtils';
import { audioEngine } from './services/audioEngine';

/**
 * Premium Hint Component
 * Provides detailed, high-fidelity context for system calibration.
 */
const SystemHint: React.FC<{ title: string; text: string }> = ({ title, text }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="inline-block ml-1.5 align-middle">
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
          isOpen 
            ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
            : 'border-white/10 text-zinc-600 hover:text-zinc-400 hover:border-white/20'
        }`}
      >
        ?
      </button>
      {isOpen && (
        <div className="absolute left-8 right-8 mt-3 p-4 glass-premium pearlescent border border-white/20 rounded-2xl z-[120] animate-in fade-in slide-in-from-top-2 shadow-2xl backdrop-blur-3xl">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{title}</span>
            <p className="text-[11px] text-zinc-200 font-semibold leading-relaxed tracking-tight">
              {text}
            </p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="mt-3 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('atlas_username') || '');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [activeEngine, setActiveEngine] = useState<AudioEngineType>('Gemini Live');
  const [preset, setPreset] = useState<VoicePreset>(VoicePreset.NEUTRAL);
  const [brandProfile, setBrandProfile] = useState<BrandVoiceProfile>({
    tone: 'friendly',
    pacing: 'measured',
    emphasisStyle: 'subtle'
  });
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, audioChunks, isThinking]);

  useEffect(() => {
    localStorage.setItem('atlas_username', userName);
  }, [userName]);

  const toggleHandsFree = async () => {
    if (isHandsFree) {
      audioEngine.stopAll();
      setIsHandsFree(false);
      setIsSpeaking(false);
    } else {
      setIsHandsFree(true);
      setIsSpeaking(true);
      audioEngine.setConfig(preset, brandProfile);
      try {
        await audioEngine.startLiveConversation(
          (text, role) => {
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              // OPTIMIZED: Append tokens directly. The API sends delta strings.
              // Direct concatenation prevents artificial spaces inside words.
              if (lastMsg && lastMsg.role === role && Date.now() - lastMsg.timestamp < 3000) {
                const updated = [...prev];
                const rawCombined = lastMsg.content + text;
                // Clean extra whitespace but preserve single word separation.
                const cleanedContent = rawCombined.replace(/\s{2,}/g, ' '); 
                
                updated[updated.length - 1] = { 
                  ...lastMsg, 
                  content: cleanedContent 
                };
                return updated;
              }
              return [...prev, { id: `${role}-${Date.now()}`, role, content: text.trimStart(), timestamp: Date.now() }];
            });
          },
          (engine) => setActiveEngine(engine)
        );
      } catch (err) {
        console.error("Link failure:", err);
        setIsHandsFree(false);
        setIsSpeaking(false);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const textToSend = input;
    setInput('');
    setIsThinking(true);
    audioEngine.stopAll();
    setIsHandsFree(false);
    setAudioChunks([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const systemInstruction = `You are AtlasAI v2.1. Deliver elite concierge services. Respond with precision. User name: ${userName || 'client'}.`;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: textToSend,
        config: { systemInstruction, temperature: 0.65 }
      });

      const aiText = response.text || "Communication node stalled.";
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
      await startVoicePipeline(aiText);
    } catch (error) {
      console.error("AI failure:", error);
      setIsThinking(false);
    }
  };

  const startVoicePipeline = async (text: string) => {
    const rawChunks = chunkText(text);
    const initialChunks: AudioChunk[] = rawChunks.map((t, i) => ({
      id: `chunk-${i}`,
      text: t,
      status: 'pending',
      engine: 'Gemini Live'
    }));

    setAudioChunks(initialChunks);
    setIsSpeaking(true);
    audioEngine.setConfig(preset, brandProfile);

    for (let i = 0; i < rawChunks.length; i++) {
      setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'playing' } : c));
      try {
        await audioEngine.speak(rawChunks[i], (engine) => {
          setActiveEngine(engine);
          setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, engine } : c));
        });
        setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'completed' } : c));
      } catch (err) {
        setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'error' } : c));
      }
      await sleep(150); 
    }
    setIsSpeaking(false);
  };

  const handleStop = () => {
    audioEngine.stopAll();
    setIsSpeaking(false);
    setIsHandsFree(false);
    setAudioChunks([]);
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-black relative overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-full h-[60%] bg-indigo-500/5 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-full h-1/2 bg-violet-600/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="flex items-center justify-between px-3 pb-3 glass z-50 rounded-b-[1.5rem] safe-area-pt border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-md opacity-25"></div>
            <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-500 via-indigo-700 to-indigo-950 rounded-lg flex items-center justify-center border border-white/10">
              <span className="font-extrabold text-white text-base tracking-tighter">A</span>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1">
              AtlasAI <span className="text-[6px] font-mono bg-indigo-500/30 text-indigo-100 px-1 py-0.5 rounded-sm border border-indigo-500/20 uppercase tracking-tighter">v2.1</span>
            </h1>
            <div className="flex items-center gap-1 mt-[-1px]">
               <div className={`w-1 h-1 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-800'}`}></div>
               <span className="text-[6px] uppercase tracking-[0.25em] text-zinc-500 font-black">
                 {isSpeaking ? (isHandsFree ? `STREAM` : `LINK`) : 'READY'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleHandsFree} className={`p-1.5 rounded-lg btn-premium border ${isHandsFree ? 'bg-red-600 text-white border-red-400' : 'glass-dark text-zinc-400 border-white/10'}`}>
            {isHandsFree ? <Icons.MicOff className="w-4 h-4" /> : <Icons.Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg glass-dark btn-premium text-zinc-400 border border-white/10">
            <Icons.Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 no-scrollbar relative z-10" ref={scrollRef}>
        {messages.length === 0 && !isHandsFree && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pb-20 animate-in fade-in">
            <div className="relative w-20 h-20 glass-premium rounded-[1.8rem] flex items-center justify-center shadow-lg border border-white/10">
               <Icons.Mic className="w-8 h-8 text-indigo-500/40" />
            </div>
            <div className="space-y-2 px-4">
              <h2 className="text-xl font-black tracking-tight text-white leading-none text-gradient uppercase">Neural Concierge.</h2>
              <p className="text-[7px] text-zinc-600 uppercase tracking-[0.4em]">Ready / {userName || 'Client'}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-[1.2rem] text-[13px] font-bold leading-[1.5] shadow-md border tracking-tight ${
              msg.role === 'user' 
                ? 'bg-[#0a0a0a] border-white/5 text-zinc-300 rounded-tr-none' 
                : 'glass-premium pearlescent border-white/20 text-white rounded-tl-none border-l-2 border-l-indigo-500'
            }`}>
              {msg.content}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 px-2">
              <span className="text-[7px] font-mono font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
                <span className={msg.role === 'assistant' ? 'text-indigo-500' : 'text-zinc-600'}>
                  {msg.role === 'assistant' ? 'AI' : `${userName || 'USER'}`}
                </span>
                <span className="text-zinc-800">•</span>
                <span className="text-zinc-700">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 animate-in fade-in duration-300 px-1">
            <div className="w-6 h-6 glass-dark rounded-md flex items-center justify-center border border-white/10">
              <div className="w-2 h-2 border-[1.5px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.3em]">Processing...</span>
          </div>
        )}

        <div className="h-24"></div>
      </main>

      {!isHandsFree && (
        <div className="absolute bottom-0 inset-x-0 glass z-50 px-3 pt-3 pb-5 rounded-t-[1.5rem] safe-area-pb border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Request...`}
                className="w-full bg-[#0a0a0a]/60 border border-white/10 rounded-[1.2rem] px-4 py-2.5 text-[13px] font-bold outline-none text-white focus:border-indigo-500/30"
              />
            </div>
            <button type="submit" disabled={!input.trim() || isThinking}
              className={`p-2.5 rounded-full border ${!input.trim() || isThinking ? 'bg-zinc-950 border-white/5 text-zinc-900' : 'bg-indigo-600 border-indigo-400 text-white shadow-lg'}`}
            >
              <Icons.Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {isHandsFree && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 safe-area-pb animate-in fade-in">
           <div className="relative w-48 h-48 glass-premium pearlescent rounded-full flex items-center justify-center shadow-xl border-white/20 scale-90">
              <div className="flex gap-1 items-end h-16 mb-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1 bg-indigo-500 rounded-full" 
                    style={{ height: `${30 + Math.random() * 70}%`, animation: `wave 0.5s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }}
                  ></div>
                ))}
              </div>
           </div>
           <div className="mt-6 text-center space-y-2">
              <h3 className="text-xl font-black text-white tracking-tighter uppercase">Neural Aura</h3>
              <p className="text-[7px] text-indigo-400 uppercase tracking-[0.4em] animate-pulse">Session Active</p>
           </div>
           <div className="absolute bottom-10 left-6 right-6">
              <button onClick={toggleHandsFree} className="w-full py-4 bg-red-600/90 text-white rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.4em] shadow-lg">
                Disconnect
              </button>
           </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-end justify-center animate-in fade-in" onClick={() => setShowSettings(false)}>
          <div className="glass-premium pearlescent w-full max-w-lg rounded-t-[2rem] p-6 space-y-6 animate-in slide-in-from-bottom-20 overflow-y-auto no-scrollbar max-h-[85vh] border-t border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white tracking-tighter uppercase">Calibration</h3>
                <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Node Control v2.1.0</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full glass-dark text-zinc-500 hover:text-white transition-colors">&times;</button>
            </div>

            <div className="space-y-6 pb-6 relative">
              
              {/* Identity Calibration */}
              <section className="space-y-2.5">
                <div className="flex items-center px-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Identity Link</label>
                  <SystemHint 
                    title="User Identification" 
                    text="Synchronizes your chosen identifier with the LLM's context window. This allows the concierge to refer to you by name during vocal turns, enhancing the personalization layer of the bimodal experience." 
                  />
                </div>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Access Name..."
                   className="w-full bg-[#050505]/60 border border-white/10 rounded-[1rem] py-3.5 px-5 text-white text-[12px] font-black outline-none focus:border-indigo-500/30 transition-all"
                />
              </section>

              {/* Behavioral Archetype */}
              <section className="space-y-3">
                <div className="flex items-center px-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Behavioral Core</label>
                  <SystemHint 
                    title="Persona Archetype" 
                    text="Modulates the fundamental persona logic. Each preset recalibrates the model's vocabulary complexity, empathy weighting, and response length to match the selected archetype's conversational goals." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(VoicePreset).map((p, idx, arr) => (
                    <button key={p} onClick={() => setPreset(p)}
                      className={`px-2 py-2.5 rounded-[0.8rem] text-[9px] font-black border uppercase tracking-[0.1em] transition-all relative overflow-hidden ${
                        preset === p ? 'bg-indigo-600 border-indigo-400 text-white scale-105 z-10 shadow-lg' : 'glass-dark border-white/10 text-zinc-600'
                      } ${idx === arr.length - 1 ? 'col-span-2' : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </section>

              {/* Aura Modulation Matrix */}
              <section className="space-y-4">
                <div className="flex items-center px-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">Aura Modulation</label>
                  <SystemHint 
                    title="Vocal Prosody Matrix" 
                    text="Adjusts the emotive cadence and prosodic intensity of the speech engine. These parameters influence the pitch variance, syllable duration, and rhythmic emphasis of synthesized output." 
                  />
                </div>
                <div className="glass-dark p-5 rounded-[1.2rem] space-y-5 border border-white/10 shadow-inner">
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.15em]">Tone Profile</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['friendly', 'formal', 'authoritative'].map((t: any) => (
                        <button key={t} onClick={() => setBrandProfile({...brandProfile, tone: t})}
                          className={`py-2 rounded-md text-[7px] font-black uppercase tracking-tight border transition-all ${
                            brandProfile.tone === t 
                              ? 'bg-white text-black border-white shadow-xl scale-110' 
                              : 'bg-black/40 text-zinc-700 border-white/5'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.15em] px-1">Pacing Protocol</span>
                      <div className="relative">
                        <select value={brandProfile.pacing} onChange={(e) => setBrandProfile({...brandProfile, pacing: e.target.value as any})}
                          className="w-full bg-black/60 border border-white/10 rounded-[0.8rem] py-2.5 px-3 text-[8px] font-black uppercase tracking-widest text-zinc-300 outline-none appearance-none"
                        >
                          <option value="measured">Measured (Refined)</option>
                          <option value="fast">Dynamic (Rapid)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700 text-[10px]">▼</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.15em] px-1">Prosody Focus</span>
                      <div className="relative">
                        <select value={brandProfile.emphasisStyle} onChange={(e) => setBrandProfile({...brandProfile, emphasisStyle: e.target.value as any})}
                          className="w-full bg-black/60 border border-white/10 rounded-[0.8rem] py-2.5 px-3 text-[8px] font-black uppercase tracking-widest text-zinc-300 outline-none appearance-none"
                        >
                          <option value="subtle">Refined (Subtle)</option>
                          <option value="assertive">Assertive (Impact)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700 text-[10px]">▼</div>
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              <button onClick={() => setShowSettings(false)} className="w-full py-4.5 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.6em] border border-indigo-400/50 shadow-2xl active:scale-95 transition-transform">
                Apply Calibration
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.2; }
          50% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
