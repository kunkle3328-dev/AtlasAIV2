
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  VoicePreset, 
  BrandVoiceProfile, 
  AudioEngineType, 
  AudioChunk, 
  Message 
} from './types';
import { Icons, GEMINI_MODEL } from './constants';
import { chunkText, sleep } from './utils/audioUtils';
import { audioEngine } from './services/audioEngine';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [activeEngine, setActiveEngine] = useState<AudioEngineType>('Gemini Live');
  const [preset, setPreset] = useState<VoicePreset>(VoicePreset.NEUTRAL);
  const [brandProfile, setBrandProfile] = useState<BrandVoiceProfile | null>(null);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptionRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, audioChunks, isThinking]);

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
            // Append or update transcription messages
            const id = `live-${role}-${Date.now()}`;
            setMessages(prev => {
              // Simple grouping of transcriptions to avoid message spam
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === role && Date.now() - lastMsg.timestamp < 3000) {
                return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + " " + text }];
              }
              return [...prev, { id, role, content: text, timestamp: Date.now() }];
            });
          },
          (engine) => setActiveEngine(engine)
        );
      } catch (err) {
        console.error("Failed to start hands-free session:", err);
        setIsHandsFree(false);
        setIsSpeaking(false);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
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
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: textToSend,
        config: {
          systemInstruction: "You are AtlasAI, a professional knowledge concierge. Use context and continuity. Be concise (2-5 sentences).",
          temperature: 0.7,
        }
      });

      const aiText = response.text || "I apologize, I encountered an issue generating a response.";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);

      await startVoicePipeline(aiText);
    } catch (error) {
      console.error("Assistant generation error:", error);
      setIsThinking(false);
    }
  };

  const startVoicePipeline = async (text: string) => {
    const chunks = chunkText(text);
    const initialChunks: AudioChunk[] = chunks.map((t, i) => ({
      id: `chunk-${i}`,
      text: t,
      status: 'pending',
      engine: 'Gemini Live'
    }));

    setAudioChunks(initialChunks);
    setIsSpeaking(true);
    audioEngine.setConfig(preset, brandProfile);

    for (let i = 0; i < initialChunks.length; i++) {
      setAudioChunks(prev => prev.map((c, idx) => 
        idx === i ? { ...c, status: 'playing' } : c
      ));

      try {
        await audioEngine.speak(initialChunks[i].text, (engine) => {
          setActiveEngine(engine);
          setAudioChunks(prev => prev.map((c, idx) => 
            idx === i ? { ...c, engine } : c
          ));
        });

        setAudioChunks(prev => prev.map((c, idx) => 
          idx === i ? { ...c, status: 'completed' } : c
        ));
      } catch (err) {
        console.error(`Chunk ${i} audio error:`, err);
        setAudioChunks(prev => prev.map((c, idx) => 
          idx === i ? { ...c, status: 'error' } : c
        ));
      }
      
      await sleep(200); // Natural chunk transition
    }
    
    setIsSpeaking(false);
  };

  const handleStop = () => {
    audioEngine.stopAll();
    setIsSpeaking(false);
    setIsHandsFree(false);
    setAudioChunks(prev => prev.map(c => 
      c.status === 'playing' || c.status === 'pending' ? { ...c, status: 'completed' } : c
    ));
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto border-x border-white/5 bg-[#0a0a0a] overflow-hidden text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0d0d0d]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 transform rotate-3">
            <span className="font-black text-white text-xl">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AtlasAI <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-1 uppercase border border-indigo-500/20">Studio</span></h1>
            <div className="flex items-center gap-2 mt-0.5">
               <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`}></div>
               <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                 {isSpeaking ? (isHandsFree ? `Hands-Free: ${activeEngine}` : `Streaming: ${activeEngine}`) : 'Ready'}
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleHandsFree}
            className={`p-3 rounded-2xl transition-all border shadow-lg ${
              isHandsFree 
              ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-500/10' 
              : 'hover:bg-white/5 text-zinc-400 border-white/5 hover:border-white/10'
            }`}
            aria-label={isHandsFree ? "Stop Voice Mode" : "Start Voice Mode"}
          >
            {isHandsFree ? <Icons.MicOff className="w-5 h-5" /> : <Icons.Mic className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-2xl hover:bg-white/5 text-zinc-400 border border-white/5 hover:border-white/10 transition-colors"
          >
            <Icons.Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 relative scroll-smooth" ref={scrollRef}>
        {messages.length === 0 && !isHandsFree && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative w-24 h-24 bg-zinc-900 border border-white/10 rounded-[2.5rem] flex items-center justify-center">
                 <Icons.Mic className="w-10 h-10 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">Knowledge Awaits.</h2>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">Toggle the microphone for hands-free conversation or send a prompt below.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[90%] md:max-w-[75%] px-6 py-4 rounded-[2rem] text-[15px] leading-relaxed shadow-xl border ${
              msg.role === 'user' 
                ? 'bg-zinc-800 border-white/5 text-zinc-100 rounded-tr-none' 
                : 'bg-zinc-900/50 border-white/10 text-zinc-300 rounded-tl-none backdrop-blur-sm'
            }`}>
              {msg.content}
            </div>
            <div className="flex items-center gap-2 mt-2 px-3">
              <span className="text-[10px] font-mono text-zinc-600 uppercase">
                {msg.role} &bull; {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
              <div className="w-5 h-5 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <span className="text-xs text-zinc-500 font-medium tracking-wide animate-pulse">Analyzing context...</span>
          </div>
        )}

        {/* Playback Progress Overlay */}
        {audioChunks.length > 0 && isSpeaking && !isHandsFree && (
          <div className="sticky bottom-6 left-0 right-0 z-40 px-2 animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="bg-[#1a1a1a]/95 border border-white/10 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                    <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Live Playback</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${activeEngine === 'Gemini Live' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                      {activeEngine}
                    </span>
                  </div>
                  <button onClick={handleStop} className="group p-2 hover:bg-red-500/10 rounded-full transition-colors" title="Abort playback">
                    <Icons.Stop className="w-5 h-5 text-red-500/70 group-hover:text-red-400 transition-colors" />
                  </button>
               </div>
               <div className="flex gap-1.5 h-1 items-end">
                  {audioChunks.map((chunk, i) => (
                    <div 
                      key={chunk.id}
                      className={`h-full flex-1 rounded-full transition-all duration-700 ${
                        chunk.status === 'completed' ? 'bg-indigo-600 opacity-40' : 
                        chunk.status === 'playing' ? 'bg-indigo-400 scale-y-[3] shadow-[0_0_15px_rgba(129,140,248,0.5)]' :
                        chunk.status === 'error' ? 'bg-red-500' : 'bg-zinc-800'
                      }`}
                    />
                  ))}
               </div>
               <div className="mt-5 text-xs text-zinc-400 font-medium line-clamp-1 italic text-center px-4">
                  "{audioChunks.find(c => c.status === 'playing')?.text || 'Synthesizing voice...'}"
               </div>
             </div>
          </div>
        )}

        {/* Hands-Free Visualizer */}
        {isHandsFree && (
          <div className="sticky bottom-6 w-full bg-indigo-600/10 border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-10 duration-500 flex flex-col items-center">
            <div className="flex items-center gap-6 mb-8">
              <div className="flex gap-1.5 h-12 items-center">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                    style={{ 
                      height: `${20 + Math.random() * 80}%`, 
                      animationDuration: `${0.6 + Math.random()}s`,
                      animationDelay: `${i * 0.05}s` 
                    }}
                  ></div>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white tracking-tight">Listening...</span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">Hands-Free Active</span>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={toggleHandsFree}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 active:scale-95"
              >
                End Session
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-[#121212] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Engine Config</h3>
                <p className="text-xs text-zinc-500 font-medium">Customize Atlas voice behavior</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">&times;</button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">Voice Preset</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(VoicePreset).map(p => (
                    <button
                      key={p}
                      onClick={() => setPreset(p)}
                      className={`px-4 py-3.5 rounded-2xl text-xs font-bold border transition-all ${
                        preset === p 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' 
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => { audioEngine.resetQuota(); setShowSettings(false); }}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-colors"
                >
                  Reset Quota
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Bar */}
      {!isHandsFree && (
        <footer className="p-4 md:p-6 border-t border-white/5 bg-[#0d0d0d] bg-opacity-90 backdrop-blur-2xl">
          <form onSubmit={handleSend} className="relative flex items-center gap-4 max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the Atlas concierge..."
              className="flex-1 bg-zinc-900 border border-white/10 rounded-3xl px-6 py-5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-zinc-600 shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className={`p-5 rounded-3xl transition-all shadow-2xl flex items-center justify-center ${
                !input.trim() || isThinking 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-indigo-600/40'
              }`}
            >
              <Icons.Mic className={`w-6 h-6 ${isThinking ? 'animate-pulse' : ''}`} />
            </button>
          </form>
          <div className="flex justify-center gap-6 mt-4">
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Hybrid V2 Engine</span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">End-to-End Encryption</span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Studio Fallback Ready</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
