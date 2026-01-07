import React from 'react';

export const AtlasLogo: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Orbital Ring */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite]"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="0.5"
          strokeDasharray="10 20"
          className="opacity-40"
        />
      </svg>

      {/* Main Neural Logo */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-[80%] h-[80%] drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
      >
        <path
          d="M50 10L15 85H30L50 40L70 85H85L50 10Z"
          fill="url(#atlas-gradient)"
          className="animate-pulse"
        />
        <circle cx="50" cy="55" r="12" fill="url(#core-gradient)" />
        <path
          d="M40 55H60M50 45V65"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="opacity-80"
        />
        
        <defs>
          <linearGradient id="atlas-gradient" x1="50" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="core-gradient" x1="50" y1="43" x2="50" y2="67" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="1" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.5" stopColor="white" stopOpacity="0.2" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Background Glow */}
      <div className="absolute inset-2 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
    </div>
  );
};
