export function buildEmotionHeatmap(chunks: any[]) {
  return chunks.map((c, i) => ({
    index: i,
    emotion: c.emotion || 'neutral',
    intensity:
      c.profile?.emphasis ??
      c.profile?.pitch ??
      0.3
  }));
}