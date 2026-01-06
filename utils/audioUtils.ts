export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Splits text into semantic chunks for natural prosody.
 */
export function chunkText(text: string, maxLength = 250): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+(?:\s|$)/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + s).length > maxLength && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

/**
 * Injects detailed prosody markup for the synthesis engine to interpret.
 */
export function injectProsody(chunk: string, preset: any): string {
  return `<prosody 
    pitch="${preset.pitch}" 
    rate="${preset.rate}" 
    timbre="${preset.timbre}" 
    emphasis="${preset.emphasis}" 
    emotion="${preset.emotion || preset.baseEmotion}"
    breathiness="${preset.breathiness || 0}"
    pause="${preset.pause || 0}">
      ${chunk}
  </prosody>`;
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));