
import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { VoicePreset, AudioEngineType } from '../types';

export function useHybridAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');

  useEffect(() => {
    // Poll for changes or use a more reactive listener if the engine supported it.
    // For simplicity with the existing singleton, we'll sync state on an interval 
    // and provide a manual trigger for immediate updates.
    const interval = setInterval(() => {
      // In a real app, audioEngine would emit events.
      // We'll peek at the internal state if we exposed it, 
      // but for now we'll rely on the speakText wrapper to manage this local state.
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const speakText = useCallback(async (text: string, preset: VoicePreset, onEngineSwitch?: (engine: AudioEngineType) => void) => {
    setIsSpeaking(true);
    // Simple emotion analysis duplicated here for UI reactivity if needed, 
    // or we can let the engine handle it.
    try {
      await audioEngine.speak(text, (engine) => {
        onEngineSwitch?.(engine);
      });
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stopAll = useCallback(() => {
    audioEngine.stopAll();
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    currentEmotion,
    speakText,
    stopAll
  };
}
