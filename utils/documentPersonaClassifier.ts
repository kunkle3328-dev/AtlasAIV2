export function classifyDocumentPersona(text: string) {
  const lower = text.toLowerCase();
  if (/step|guide|tutorial|how to|procedure|instruction/i.test(lower)) return "Instructor";
  if (/story|novel|narrative|fiction|once upon|imagine/i.test(lower)) return "Storyteller";
  if (/warning|important|policy|legal|compliance|critical|caution/i.test(lower)) return "Serious";
  if (/research|study|analysis|paper|data|statistics|technical/i.test(lower)) return "Analyst";
  if (/question|faq|help|support|\?/i.test(lower)) return "Friendly";
  return null;
}