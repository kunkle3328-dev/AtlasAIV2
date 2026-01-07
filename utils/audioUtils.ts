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
 * Injects advanced humanization metadata.
 */
export function injectProsody(chunk: string, matrix: any): string {
  const adv = matrix.advanced || {};
  const hLevel = adv.humanizationLevel || 0;
  
  // Calculate micro-deviations for realism
  const microPitch = hLevel * (Math.random() * 0.06 - 0.03);
  const microRate = hLevel * (Math.random() * 0.1 - 0.05);

  return `<prosody 
    pitch="${(parseFloat(matrix.pitch) + microPitch).toFixed(3)}" 
    rate="${(parseFloat(matrix.rate) + microRate).toFixed(3)}" 
    timbre="${matrix.timbre}" 
    emphasis="${matrix.emphasis}" 
    variability="${(parseFloat(matrix.variability || 0.2) + (hLevel * 0.4)).toFixed(2)}"
    prosodyVariance="${(parseFloat(matrix.prosodyVariance || 0.2) + (hLevel * 0.5)).toFixed(2)}"
    vocalTension="${matrix.vocalTension || 0}"
    emotion="${matrix.emotion || 'neutral'}"
    breathiness="${(parseFloat(matrix.breathiness || 0) + (hLevel * 0.1)).toFixed(2)}"
    pause="${matrix.pause || 0}"
    humanization="${hLevel.toFixed(2)}"
    intent="${matrix.intent || 'neutral'}">
      ${chunk}
  </prosody>`;
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));