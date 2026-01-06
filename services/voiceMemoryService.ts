const STORAGE_KEY = "atlas_voice_memory";

export function loadVoiceMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVoiceMemory(memory: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function updateVoiceMemory(partial: any) {
  const existing = loadVoiceMemory() || {};
  const merged = { ...existing, ...partial };
  saveVoiceMemory(merged);
  return merged;
}