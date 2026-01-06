const STORAGE_KEY = "atlas_voice_personas";

export function loadPersonas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePersonas(personas: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
}

export function savePersona(name: string, config: any) {
  const personas = loadPersonas();
  personas[name] = config;
  savePersonas(personas);
}

export function deletePersona(name: string) {
  const personas = loadPersonas();
  delete personas[name];
  savePersonas(personas);
}