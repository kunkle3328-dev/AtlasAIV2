export function detectNarrationMode(text: string) {
  const lower = text.toLowerCase();
  if (/step|instruction|how to|firstly|secondly|finally|guide/i.test(lower)) return "instructional";
  if (/story|imagine|once upon|long ago|chapter|narrative/i.test(lower)) return "storyteller";
  if (/warning|important|note|caution|critical|serious/i.test(lower)) return "serious";
  if (/\?/g.test(lower) || /wonder|query|ask|question/i.test(lower)) return "curious";
  if (/excited|amazing|wow|incredible|great/i.test(lower)) return "excited";
  return "neutral";
}