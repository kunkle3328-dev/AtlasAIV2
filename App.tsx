
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
import { chunkText, sleep, injectProsody } from './utils/audioUtils';
import { audioEngine } from './services/audioEngine';

/**
 * Premium Technical Tooltip
 * Provides deep architectural context for system calibration.
 */
const TechnicalTooltip: React.FC<{ title: string; text: string; children: React.ReactNode }> = ({ title, text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          ref={tooltipRef}
          className="absolute z-[200] bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 glass-premium pearlescent border border-white/20 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{title}</span>
            <p className="text-[11px] text-zinc-200 font-semibold leading-relaxed tracking-tight">
              {text}
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/10"></div>
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
              // FIXED: Append tokens directly to avoid word-splitting spaces
              if (lastMsg && lastMsg.role === role && Date.now() - lastMsg.timestamp < 3000) {
                const updated = [...prev];
                // Direct join to preserve word continuity (e.g., "ena" + "bled" = "enabled")
                const newContent = lastMsg.content + text;
                updated[updated.length - 1] = { 
                  ...lastMsg, 
                  content: newContent.replace(/\s{2,}/g, ' ') // Collapse accidental double spaces but keep words intact
                };
                return updated;
              }
              return [...prev, { id: `${role}-${Date.now()}`, role, content: text.trimStart(), timestamp: Date.now() }];
            });
          },
          (engine) => setActiveEngine(engine)
        );
      } catch (err) {
        console.error("Session failed:", err);
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
      const systemInstruction = `You are AtlasAI v2.1. Deliver elite concierge services. Respond with precision. User: ${userName || 'Client'}.`;
      
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: textToSend,
        config: { systemInstruction, temperature: 0.7 }
      });

      const aiText = response.text || "Neural connection interrupted.";
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
      console.error("AI node error:", error);
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
        const textToSpeak = injectProsody(rawChunks[i], brandProfile);
        await audioEngine.speak(textToSpeak, (engine) => {
          setActiveEngine(engine);
          setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, engine } : c));
        });
        setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'completed' } : c));
      } catch (err) {
        setAudioChunks(prev => prev.map((c, idx) => idx === i ? { ...c, status: 'error' } : c));
      }
      await sleep(100); 
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
          <TechnicalTooltip title="Bimodal Session" text="Toggles the real-time hands-free communication node. Utilizes the Gemini 2.5 Flash Native Audio model for ultra-low latency interaction.">
            <button onClick={toggleHandsFree} className={`p-1.5 rounded-lg btn-premium border ${isHandsFree ? 'bg-red-600 text-white border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'glass-dark text-zinc-400 border-white/10'}`}>
              {isHandsFree ? <Icons.MicOff className="w-4 h-4" /> : <Icons.Mic className="w-4 h-4" />}
            </button>
          </TechnicalTooltip>
          <TechnicalTooltip title="System Core" text="Access the neural calibration parameters. Modify behavioral archetypes and vocal prosody matrices.">
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg glass-dark btn-premium text-zinc-400 border border-white/10">
              <Icons.Settings className="w-4 h-4" />
            </button>
          </TechnicalTooltip>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar relative z-10" ref={scrollRef}>
        {messages.length === 0 && !isHandsFree && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pb-20 animate-in fade-in">
            <div className="relative w-16 h-16 glass-premium rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
               <Icons.Mic className="w-7 h-7 text-indigo-500/30" />
            </div>
            <div className="space-y-1.5 px-4">
              <h2 className="text-xl font-black tracking-tight text-white leading-none text-gradient uppercase">Neural Sync.</h2>
              <p className="text-[7px] text-zinc-600 uppercase tracking-[0.4em]">Awaiting Instruction / {userName || 'Global'}</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-[1rem] text-[12.5px] font-bold leading-[1.45] shadow-md border tracking-tight ${
              msg.role === 'user' 
                ? 'bg-[#0c0c0c] border-white/5 text-zinc-300 rounded-tr-none' 
                : 'glass-premium pearlescent border-white/20 text-white rounded-tl-none border-l-2 border-l-indigo-500'
            }`}>
              {msg.content}
            </div>
            <div className="flex items-center gap-1 mt-1 px-1.5">
              <span className="text-[6.5px] font-mono font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
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
            <div className="w-5 h-5 glass-dark rounded-md flex items-center justify-center border border-white/10">
              <div className="w-1.5 h-1.5 border-[1.5px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-[6.5px] text-zinc-600 font-black uppercase tracking-[0.3em]">Synapsing...</span>
          </div>
        )}

        <div className="h-20"></div>
      </main>

      {!isHandsFree && (
        <div className="absolute bottom-0 inset-x-0 glass z-50 px-3 pt-3 pb-4 rounded-t-[1.2rem] safe-area-pb border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Request synthesis...`}
                className="w-full bg-[#080808]/60 border border-white/10 rounded-[1rem] px-4 py-2 text-[12.5px] font-bold outline-none text-white focus:border-indigo-500/20 transition-colors"
              />
            </div>
            <button type="submit" disabled={!input.trim() || isThinking}
              className={`p-2 rounded-full border transition-all ${!input.trim() || isThinking ? 'bg-zinc-950 border-white/5 text-zinc-900' : 'bg-indigo-600 border-indigo-400 text-white shadow-lg active:scale-90'}`}
            >
              <Icons.Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {isHandsFree && (
        <div className="absolute inset-0 z-[60] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 safe-area-pb animate-in fade-in">
           <div className="relative w-40 h-40 glass-premium pearlescent rounded-full flex items-center justify-center shadow-xl border-white/20 scale-90">
              <div className="flex gap-1 items-end h-14 mb-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                    style={{ height: `${30 + Math.random() * 70}%`, animation: `wave 0.4s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}
                  ></div>
                ))}
              </div>
           </div>
           <div className="mt-5 text-center space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tighter uppercase">Aura Active</h3>
              <p className="text-[6.5px] text-indigo-400 uppercase tracking-[0.4em] animate-pulse">Neural Capture Enabled</p>
           </div>
           <div className="absolute bottom-10 left-8 right-8">
              <button onClick={toggleHandsFree} className="w-full py-4 bg-red-600/90 text-white rounded-[1.2rem] text-[8.5px] font-black uppercase tracking-[0.4em] shadow-lg active:scale-95 transition-all">
                Terminate Link
              </button>
           </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-end justify-center animate-in fade-in" onClick={() => setShowSettings(false)}>
          <div className="glass-premium pearlescent w-full max-w-lg rounded-t-[1.8rem] p-5 space-y-5 animate-in slide-in-from-bottom-20 overflow-y-auto no-scrollbar max-h-[85vh] border-t border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-base font-black text-white tracking-tighter uppercase">Calibration</h3>
                <p className="text-[6px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Node V2.1.0-Patch</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-full glass-dark text-zinc-500 hover:text-white transition-colors">&times;</button>
            </div>

            <div className="space-y-5 pb-4">
              <section className="space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Identity Node</label>
                  <TechnicalTooltip title="Profile Link" text="Synchronizes your identifier across all modal layers. Ensures the concierge maintains conversational continuity and addresses you correctly.">
                    <span className="text-indigo-500/40 text-[9px] cursor-help font-black">(?)</span>
                  </TechnicalTooltip>
                </div>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Node Access Name..."
                   className="w-full bg-[#050505]/60 border border-white/10 rounded-[0.8rem] py-3 px-4 text-white text-[11px] font-black outline-none focus:border-indigo-500/30 transition-all"
                />
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Behavioral Archetype</label>
                  <TechnicalTooltip title="LLM Persona" text="Switches the foundational personality matrix. Recalibrates empathy, verbosity, and reasoning style.">
                    <span className="text-indigo-500/40 text-[9px] cursor-help font-black">(?)</span>
                  </TechnicalTooltip>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(VoicePreset).map((p, idx, arr) => (
                    <TechnicalTooltip key={idx} title={p.toUpperCase()} text={VoicePresets[p as keyof typeof VoicePresets]}>
                      <button onClick={() => setPreset(p)}
                        className={`w-full px-2 py-2 rounded-[0.6rem] text-[8px] font-black border uppercase tracking-[0.1em] transition-all ${
                          preset === p ? 'bg-indigo-600 border-indigo-400 text-white scale-105 z-10' : 'glass-dark border-white/10 text-zinc-600'
                        } ${idx === arr.length - 1 ? 'col-span-2' : ''}`}
                      >
                        {p}
                      </button>
                    </TechnicalTooltip>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Prosody Modulation</label>
                  <TechnicalTooltip title="Aura Matrix" text="Controls the fine-grained acoustics of the synthesis engine. Affects pacing, pitch variance, and syllabic emphasis.">
                    <span className="text-indigo-500/40 text-[9px] cursor-help font-black">(?)</span>
                  </TechnicalTooltip>
                </div>
                <div className="glass-dark p-3.5 rounded-[1rem] space-y-4 border border-white/10">
                  <div className="space-y-2">
                    <span className="text-[6.5px] text-zinc-600 font-black uppercase px-1">Tone Matrix</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['friendly', 'formal', 'authoritative'].map((t: any) => (
                        <TechnicalTooltip key={t} title={t.toUpperCase()} text={`Recalibrates vocal acoustics for a ${t} presence.`}>
                          <button onClick={() => setBrandProfile({...brandProfile, tone: t})}
                            className={`w-full py-2 rounded-md text-[6.5px] font-black uppercase tracking-tight border ${
                              brandProfile.tone === t ? 'bg-white text-black border-white' : 'bg-black/40 text-zinc-700 border-white/5'
                            }`}
                          >
                            {t}
                          </button>
                        </TechnicalTooltip>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[6.5px] text-zinc-600 font-black uppercase px-1">Pacing</span>
                      <TechnicalTooltip title="Temporal Node" text="Adjusts tokens-per-second output.">
                        <select value={brandProfile.pacing} onChange={(e) => setBrandProfile({...brandProfile, pacing: e.target.value as any})}
                          className="w-full bg-black/60 border border-white/10 rounded-[0.6rem] py-2 px-2 text-[7px] font-black uppercase text-zinc-300 outline-none"
                        >
                          <option value="measured">Measured</option>
                          <option value="fast">Rapid</option>
                        </select>
                      </TechnicalTooltip>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[6.5px] text-zinc-600 font-black uppercase px-1">Emphasis</span>
                      <TechnicalTooltip title="Syllabic Focus" text="Determines the magnitude of vocal spikes.">
                        <select value={brandProfile.emphasisStyle} onChange={(e) => setBrandProfile({...brandProfile, emphasisStyle: e.target.value as any})}
                          className="w-full bg-black/60 border border-white/10 rounded-[0.6rem] py-2 px-2 text-[7px] font-black uppercase text-zinc-300 outline-none"
                        >
                          <option value="subtle">Refined</option>
                          <option value="assertive">Assertive</option>
                        </select>
                      </TechnicalTooltip>
                    </div>
                  </div>
                </div>
              </section>

              <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-indigo-600 text-white rounded-[1.2rem] text-[9px] font-black uppercase tracking-[0.5em] border border-indigo-400/50 active:scale-95 transition-all shadow-xl">
                Sync Calibration
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
