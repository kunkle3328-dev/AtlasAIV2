import React, { useState, useEffect } from 'react';
import { AtlasLogo } from './AtlasLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  "Initializing Neural Core...",
  "Calibrating Prosody Matrix...",
  "Synchronizing Synaptic Handshake...",
  "Optimizing Bimodal Interaction Layer...",
  "Establishing Secure Link...",
  "AtlasAI Ready."
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 3200; // 3.2s cinematic intro

    const update = () => {
      const elapsed = Date.now() - start;
      const nextProgress = Math.min(100, (elapsed / duration) * 100);
      
      setProgress(nextProgress);
      
      const msgIdx = Math.min(
        STATUS_MESSAGES.length - 1,
        Math.floor((nextProgress / 100) * STATUS_MESSAGES.length)
      );
      setStatusIdx(msgIdx);

      if (elapsed < duration) {
        requestAnimationFrame(update);
      } else {
        setTimeout(() => setFadeOut(true), 400);
        setTimeout(onComplete, 1200);
      }
    };

    requestAnimationFrame(update);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-1000 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background Cinematic Bokeh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo Container */}
        <div className={`transition-all duration-1000 transform ${progress > 10 ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`}>
          <AtlasLogo size={120} />
        </div>

        {/* Cinematic Content Box */}
        <div className="mt-12 flex flex-col items-center space-y-8 w-64">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase text-gradient">
              AtlasAI <span className="text-indigo-500">v2.1</span>
            </h1>
            <div className="h-4 overflow-hidden">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.4em] animate-in slide-in-from-bottom-2 duration-300">
                {STATUS_MESSAGES[statusIdx]}
              </p>
            </div>
          </div>

          {/* Frosted Loading Track */}
          <div className="w-full h-1 glass-dark rounded-full overflow-hidden border border-white/5 relative">
            <div 
              className="absolute inset-y-0 left-0 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>

          <div className="flex flex-col items-center opacity-40">
            <span className="text-[6px] font-mono text-zinc-600 uppercase tracking-[0.2em]">Neural Encryption Active</span>
            <div className="flex gap-1 mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-zinc-800 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
