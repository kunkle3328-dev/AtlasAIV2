import { loadPersonas, savePersonas } from "./voicePersonaService";

export function exportPersonas() {
  const data = loadPersonas();
  return JSON.stringify(data, null, 2);
}

export function importPersonas(json: string) {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) throw new Error("Invalid format");
    savePersonas(parsed);
    return parsed;
  } catch (err) {
    console.error("Import failed:", err);
    throw err;
  }
}