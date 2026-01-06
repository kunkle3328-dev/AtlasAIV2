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
              // Smarter merging logic to fix "sear ch" word splitting
              if (lastMsg && lastMsg.role === role && Date.now() - lastMsg.timestamp < 3500) {
                const updated = [...prev];
                const lastContent = lastMsg.content;
                const newText = text;
                
                // Logic: Only add a space if both the existing text ends in a word char 
                // AND the new text starts with a word char.
                // Also ensures we don't double space.
                const lastChar = lastContent.slice(-1);
                const firstChar = newText.charAt(0);
                const needsSpace = /[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar);
                
                const merged = needsSpace ? `${lastContent} ${newText}` : `${lastContent}${newText}`;
                
                updated[updated.length - 1] = { 
                  ...lastMsg, 
                  content: merged.replace(/\s+/g, ' ') 
                };
                return updated;
              }
              return [...prev, { id: `${role}-${Date.now()}`, role, content: text, timestamp: Date.now() }];
            });
          },
          (engine) => setActiveEngine(engine)
        );
      } catch (err) {
        console.error("Link error:", err);
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
      const systemInstruction = `You are AtlasAI v2.1. Deliver elite concierge services. Respond with precision, depth, and context. Be concise (2-4 sentences). User name: ${userName || 'client'}.`;
      
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

      {/* Header - Shrunk for Mobile */}
      <header className="flex items-center justify-between px-4 pb-4 glass z-50 rounded-b-[2rem] safe-area-pt border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-30"></div>
            <div className="relative w-9 h-9 bg-gradient-to-br from-indigo-500 via-indigo-700 to-indigo-950 rounded-xl flex items-center justify-center border border-white/10">
              <span className="font-extrabold text-white text-lg tracking-tighter">A</span>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              AtlasAI <span className="text-[7px] font-mono bg-indigo-500/40 text-indigo-100 px-1.5 py-0.5 rounded-md border border-indigo-500/20 uppercase tracking-tighter">v2.1</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0">
               <div className={`w-1 h-1 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse glow-indigo' : 'bg-zinc-800'}`}></div>
               <span className="text-[7px] uppercase tracking-[0.3em] text-zinc-500 font-black">
                 {isSpeaking ? (isHandsFree ? `STREAM` : `LINK`) : 'READY'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleHandsFree} className={`p-2 rounded-xl btn-premium border shadow-lg ${isHandsFree ? 'bg-red-600 text-white border-red-400 glow-red' : 'glass-dark text-zinc-300 border-white/10'}`}>
            {isHandsFree ? <Icons.MicOff className="w-4.5 h-4.5" /> : <Icons.Mic className="w-4.5 h-4.5" />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl glass-dark btn-premium text-zinc-300 border border-white/10 shadow-lg">
            <Icons.Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Shrunk for Mobile */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar relative z-10" ref={scrollRef}>
        {messages.length === 0 && !isHandsFree && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pb-20 animate-in fade-in duration-1000">
            <div className="relative">
              <div className="absolute inset-[-40px] bg-indigo-500 blur-[80px] opacity-10"></div>
              <div className="relative w-24 h-24 glass-premium rounded-[2rem] flex items-center justify-center shadow-xl border border-white/10 group overflow-hidden">
                 <div className="scanner-line !h-0.5 opacity-30"></div>
                 <Icons.Mic className="w-10 h-10 text-indigo-500/40" />
              </div>
            </div>
            <div className="space-y-3 px-4">
              <h2 className="text-2xl font-black tracking-tight text-white leading-none text-gradient uppercase">Neural<br/>Concierge.</h2>
              <p className="text-[8px] text-zinc-600 max-w-[200px] mx-auto leading-relaxed font-black uppercase tracking-[0.4em] opacity-80">Sync established / identity verified</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
            <div className={`max-w-[85%] px-4 py-3.5 rounded-[1.5rem] text-[14px] font-semibold leading-[1.55] shadow-lg border tracking-tight ${
              msg.role === 'user' 
                ? 'bg-[#0a0a0a] border-white/5 text-zinc-200 rounded-tr-none shadow-inner' 
                : 'glass-premium pearlescent border-white/20 text-white rounded-tl-none border-l-2 border-l-indigo-400'
            }`}>
              {msg.content}
            </div>
            <div className="flex items-center gap-2 mt-2 px-2">
              <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <span className={msg.role === 'assistant' ? 'text-indigo-400' : 'text-zinc-500'}>
                  {msg.role === 'assistant' ? 'AI NODE' : `${userName || 'USER'}`}
                </span>
                <span className="text-zinc-800">/</span>
                <span className="text-zinc-700">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-3 animate-in fade-in duration-300 px-1">
            <div className="relative w-8 h-8 glass-dark rounded-lg flex items-center justify-center border border-white/10">
              <div className="w-3 h-3 border-[1.5px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.4em]">Neural Pathing...</span>
          </div>
        )}

        <div className="h-32"></div>
      </main>

      {/* Floating UI - Shrunk */}
      {audioChunks.length > 0 && isSpeaking && !isHandsFree && (
        <div className="absolute bottom-24 left-4 right-4 z-40 animate-in slide-in-from-bottom-8">
          <div className="glass-premium pearlescent rounded-[1.5rem] p-4 border border-white/25 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
                  <div className="relative w-1.5 h-1.5 bg-indigo-500 rounded-full glow-indigo"></div>
                </div>
                <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">{activeEngine}</span>
              </div>
              <button onClick={handleStop} className="p-1.5 glass-dark rounded-full btn-premium border border-white/20">
                <Icons.Stop className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
            <div className="flex gap-1 h-1 px-0.5">
              {audioChunks.map((c) => (
                <div key={c.id} className={`flex-1 rounded-full transition-all duration-700 ${
                    c.status === 'completed' ? 'bg-indigo-500/10' : 
                    c.status === 'playing' ? 'bg-indigo-500 scale-y-[1.8] glow-indigo' : 
                    'bg-zinc-900'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hands-Free - Shrunk */}
      {isHandsFree && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 safe-area-pb animate-in fade-in">
           <div className="relative w-full max-w-xs aspect-square flex items-center justify-center scale-75">
              <div className="absolute inset-8 border border-white/5 rounded-full animate-orbit"></div>
              <div className="relative w-48 h-48 glass-premium pearlescent rounded-full flex items-center justify-center shadow-xl border-white/20">
                 <div className="flex gap-1.5 items-end h-20 mb-3">
                   {[...Array(10)].map((_, i) => (
                     <div key={i} className="w-1.5 bg-indigo-500 rounded-full glow-indigo" 
                       style={{ height: `${30 + Math.random() * 70}%`, animation: `wave 0.5s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}
                     ></div>
                   ))}
                 </div>
              </div>
           </div>
           <div className="mt-8 text-center space-y-3">
              <h3 className="text-2xl font-black text-white tracking-tighter text-gradient uppercase">Neural Aura</h3>
              <p className="text-[8px] text-indigo-400 uppercase font-black tracking-[0.5em] animate-pulse">Session active / hands-free</p>
           </div>
           <div className="absolute bottom-12 left-6 right-6">
              <button onClick={toggleHandsFree} className="w-full py-5 bg-red-600/90 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.5em] btn-premium shadow-lg">
                Terminate Link
              </button>
           </div>
        </div>
      )}

      {/* Input Module - Shrunk for Mobile */}
      {!isHandsFree && (
        <div className="absolute bottom-0 inset-x-0 glass z-50 px-4 pt-4 pb-6 rounded-t-[2rem] safe-area-pb border-t border-white/10">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Request synthesis...`}
                className="w-full bg-[#0a0a0a]/60 border border-white/10 rounded-[1.5rem] px-5 py-3.5 text-[14px] font-bold outline-none focus:border-indigo-500/40 text-white"
              />
            </div>
            <button type="submit" disabled={!input.trim() || isThinking}
              className={`p-3.5 rounded-full btn-premium border ${!input.trim() || isThinking ? 'bg-zinc-950 border-white/5 text-zinc-900' : 'bg-indigo-600 border-indigo-400 text-white shadow-lg'}`}
            >
              <Icons.Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* Settings Panel - Detailed Hints */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex items-end justify-center animate-in fade-in" onClick={() => setShowSettings(false)}>
          <div className="glass-premium pearlescent w-full max-w-lg rounded-t-[2.5rem] p-8 space-y-8 animate-in slide-in-from-bottom-20 overflow-y-auto no-scrollbar max-h-[90vh] border-t border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white tracking-tighter text-gradient uppercase">Calibration</h3>
                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.4em]">Link Control v2.1.0</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full glass-dark text-zinc-400 border border-white/10 hover:text-white">&times;</button>
            </div>

            <div className="space-y-8 pb-10">
              <section className="space-y-3">
                <div className="px-1 space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Identity Link</label>
                  <p className="text-[7px] text-zinc-700 font-bold uppercase tracking-widest italic leading-tight">Authenticates your personal profile for a more humanized bimodal experience.</p>
                </div>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Personal ID..."
                   className="w-full bg-[#050505]/60 border border-white/10 rounded-[1.2rem] py-4 px-6 text-white text-[13px] font-black placeholder:text-zinc-900 outline-none"
                />
              </section>

              <section className="space-y-4">
                <div className="px-1 space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Behavioral Core</label>
                  <p className="text-[7px] text-zinc-700 font-bold uppercase tracking-widest italic leading-tight">Configures the underlying linguistic and empathetic processing archetype.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(VoicePreset).map((p, idx, arr) => (
                    <button key={p} onClick={() => setPreset(p)}
                      className={`px-3 py-3 rounded-[1.2rem] text-[10px] font-black border uppercase tracking-[0.1em] transition-all relative overflow-hidden ${
                        preset === p ? 'bg-indigo-600 border-indigo-400 text-white scale-105' : 'glass-dark border-white/10 text-zinc-600'
                      } ${idx === arr.length - 1 ? 'col-span-2' : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-[1.5rem] p-4">
                   <p className="text-[9px] text-zinc-500 leading-relaxed font-bold">
                     <span className="text-indigo-500/60 mr-2 uppercase">Core Status:</span>
                     {VoicePresets[preset as keyof typeof VoicePresets]}
                   </p>
                </div>
              </section>

              <section className="space-y-5">
                <div className="px-1 space-y-1">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Aura Calibration</label>
                  <p className="text-[7px] text-zinc-700 font-bold uppercase tracking-widest italic leading-tight">Fine-tunes the rhythmic prosody and affective intensity of output turns.</p>
                </div>
                <div className="glass-dark p-5 rounded-[2rem] space-y-6 border border-white/10">
                  <div className="space-y-3">
                    <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] block px-1">Tone Matrix</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['friendly', 'formal', 'authoritative'].map((t: any) => (
                        <button key={t} onClick={() => setBrandProfile({...brandProfile, tone: t})}
                          className={`py-2.5 rounded-lg text-[7px] font-black uppercase tracking-tight border shadow-sm ${
                            brandProfile.tone === t ? 'bg-white text-black border-white scale-110' : 'bg-black/40 text-zinc-700 border-white/5'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] px-1">Pacing Protocol</span>
                      <select value={brandProfile.pacing} onChange={(e) => setBrandProfile({...brandProfile, pacing: e.target.value as any})}
                        className="w-full bg-black/60 border border-white/10 rounded-[1rem] py-3.5 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-300 outline-none"
                      >
                        <option value="measured">Measured (Default)</option>
                        <option value="fast">Dynamic (Rapid)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.2em] px-1">Prosody Focus</span>
                      <select value={brandProfile.emphasisStyle} onChange={(e) => setBrandProfile({...brandProfile, emphasisStyle: e.target.value as any})}
                        className="w-full bg-black/60 border border-white/10 rounded-[1rem] py-3.5 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-300 outline-none"
                      >
                        <option value="subtle">Refined (Subtle)</option>
                        <option value="assertive">Assertive (Impact)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <button onClick={() => setShowSettings(false)} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.6em] btn-premium shadow-lg border border-indigo-400/50">
                Commit Calibration
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