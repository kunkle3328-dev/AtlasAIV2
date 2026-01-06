import React, { useState } from "react";
import { exportPersonas, importPersonas } from "../services/voicePersonaExport";

export const PersonaExportPanel = () => {
  const [json, setJson] = useState("");
  const [showStatus, setShowStatus] = useState<string | null>(null);

  const handleExport = () => {
    const data = exportPersonas();
    setJson(data);
    setShowStatus("Config exported to field");
    setTimeout(() => setShowStatus(null), 3000);
  };

  const handleImport = () => {
    try {
      if (!json.trim()) return;
      importPersonas(json);
      setShowStatus("Personas imported successfully");
      setTimeout(() => {
        setShowStatus(null);
        window.location.reload(); // Refresh to update all persona selectors
      }, 1500);
    } catch (err) {
      setShowStatus("Import error: Invalid JSON");
      setTimeout(() => setShowStatus(null), 3000);
    }
  };

  return (
    <div className="p-4 rounded-2xl glass-dark border border-white/5 flex flex-col gap-3 animate-in fade-in duration-300 shadow-inner">
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Persona Exchange</span>
        <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">JSON Export / Import Layer</span>
      </div>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={4}
        className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-zinc-300 text-[9px] font-mono outline-none focus:border-indigo-500/30 resize-none no-scrollbar"
        placeholder="Paste persona JSON payload here..."
      />

      <div className="flex gap-2">
        <button 
          onClick={handleExport} 
          className="flex-1 py-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600/20 transition-all active:scale-95"
        >
          Export Node
        </button>
        <button 
          onClick={handleImport} 
          className="flex-1 py-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600/20 transition-all active:scale-95"
        >
          Inject Payload
        </button>
      </div>
      
      {showStatus && (
        <span className={`text-[7px] font-bold uppercase tracking-widest text-center ${showStatus.includes('error') ? 'text-red-400' : 'text-emerald-400'}`}>
          {showStatus}
        </span>
      )}
    </div>
  );
};