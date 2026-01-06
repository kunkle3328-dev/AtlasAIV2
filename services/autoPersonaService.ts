import { loadPersonas } from "./voicePersonaService";
import { classifyDocumentPersona } from "../utils/documentPersonaClassifier";

export function resolvePersonaForDocument(text: string) {
  const personas = loadPersonas();
  const suggested = classifyDocumentPersona(text);
  if (!suggested) return null;
  
  // Personas are stored as name: profile. We check case-insensitivity as well.
  const personaKeys = Object.keys(personas);
  const matchedKey = personaKeys.find(k => k.toLowerCase() === suggested.toLowerCase());
  
  return matchedKey ? personas[matchedKey] : null;
}