export function autoTuneByEmotion(
  emotion: string,
  baseProfile: any
) {
  const tuned = { ...baseProfile };

  switch (emotion) {
    case "excited":
      tuned.rate = clamp((baseProfile.rate ?? 1) + 0.15, 0.5, 2);
      tuned.pitch = clamp((baseProfile.pitch ?? 0) + 0.15, -1, 1);
      tuned.emphasis = clamp((baseProfile.emphasis ?? 0) + 0.1, 0, 0.5);
      break;

    case "empathetic":
      tuned.rate = clamp((baseProfile.rate ?? 1) - 0.1, 0.5, 2);
      tuned.pitch = clamp((baseProfile.pitch ?? 0) - 0.05, -1, 1);
      tuned.breathiness = clamp((baseProfile.breathiness ?? 0) + 0.05, 0, 0.3);
      break;

    case "serious":
      tuned.rate = clamp((baseProfile.rate ?? 1) - 0.05, 0.5, 2);
      tuned.emphasis = clamp((baseProfile.emphasis ?? 0) + 0.05, 0, 0.5);
      break;

    case "curious":
      tuned.pitch = clamp((baseProfile.pitch ?? 0) + 0.05, -1, 1);
      break;

    default:
      break;
  }

  return tuned;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}