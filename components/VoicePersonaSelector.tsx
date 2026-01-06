import React, { useState, useEffect } from "react";
import {
  loadPersonas,
  savePersona,
  deletePersona
} from "../services/voicePersonaService";
import { Icons } from "../constants";

export const VoicePersonaSelector = ({ currentProfile, onSelect }: any) => {
  const [personas, setPersonas] = useState(loadPersonas());
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    savePersona(name.trim(), currentProfile);
    setPersonas(loadPersonas());
    setName("");
    setShowSave(false);
  };

  const handleRemove = (pName: string) => {
    deletePersona(pName);
    setPersonas(loadPersonas());
  };

  return (
    <div className="flex flex-col gap-3 p-3 glass-dark rounded-2xl border border-white/5 animate-in fade-in">
      <div className="flex items-center justify-between px-1">
        <label className="text-[7.5px] font-black text-zinc-500 uppercase tracking-[0.2em]">Neural Personas</label>
        <button 
          onClick={() => setShowSave(!showSave)}
          className="text-[7px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
        >
          {showSave ? "CANCEL" : "NEW_PERSONA"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.keys(personas).length === 0 && !showSave && (
          <span className="text-[8px] text-zinc-700 uppercase font-bold italic px-1">No saved personas found...</span>
        )}
        {Object.keys(personas).map(p => (
          <div key={p} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(personas[p])}
              className="px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-tight hover:bg-indigo-600/20 transition-all"
            >
              {p}
            </button>
            <button onClick={() => handleRemove(p)} className="p-1 text-zinc-800 hover:text-red-500 transition-colors text-xs">&times;</button>
          </div>
        ))}
      </div>

      {showSave && (
        <div className="flex gap-2 animate-in slide-in-from-top-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Persona name..."
            className="flex-1 bg-black/40 border border-white/5 rounded-xl py-2 px-3 text-white text-[10px] outline-none focus:border-indigo-500/30"
          />
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-indigo-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest active:scale-95 transition-transform"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};