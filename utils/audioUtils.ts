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

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 * Updated with strict byte-offset handling to prevent desynchronization in raw binary streams.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = data.buffer;
  const offset = data.byteOffset;
  const length = data.byteLength;
  
  const dataInt16 = new Int16Array(buffer, offset, length / 2);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
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
 * Injects resolved Prosody Matrix values into a SSML-like markup.
 * Accepts the final resolved matrix authority.
 */
export function injectProsody(chunk: string, matrix: any): string {
  // Precision normalization of values for synthesis interpretation
  return `<prosody 
    pitch="${matrix.pitch}" 
    rate="${matrix.rate}" 
    timbre="${matrix.timbre}" 
    emphasis="${matrix.emphasis}" 
    variability="${matrix.variability || 0.2}"
    emotion="${matrix.emotion || 'neutral'}"
    breathiness="${matrix.breathiness || 0}"
    pause="${matrix.pause || 0}">
      ${chunk}
  </prosody>`;
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));