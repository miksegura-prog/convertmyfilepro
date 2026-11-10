import lamejs from 'lamejs';

export interface ConvertAudioOptions {
  bitrate?: 128 | 192 | 256 | 320;
  onProgress?: (progress: number) => void;
}

/**
 * Decodes any browser-supported audio file (WAV, OGG, AAC, MP4 audio, etc.)
 * and encodes it to standard compressed MP3 using lamejs.
 * 100% in-browser, single-threaded, without COOP/COEP headers.
 */
export const convertAudioToMp3 = async (
  file: File,
  options: ConvertAudioOptions = {}
): Promise<Blob> => {
  const { bitrate = 128, onProgress } = options;

  onProgress?.(5);

  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(15);

  // Decode audio data using browser's native Web Audio API
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }

  onProgress?.(30);

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samplesLength = audioBuffer.length;

  // Lamejs Mp3Encoder
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);
  const mp3Data: Uint8Array[] = [];

  // Convert Float32Array channel samples to Int16Array (-32768 to 32767)
  const leftFloat = audioBuffer.getChannelData(0);
  const rightFloat = numChannels > 1 ? audioBuffer.getChannelData(1) : leftFloat;

  const sampleBlockSize = 1152;
  const totalBlocks = Math.ceil(samplesLength / sampleBlockSize);

  const leftChunk = new Int16Array(sampleBlockSize);
  const rightChunk = new Int16Array(sampleBlockSize);

  for (let i = 0; i < samplesLength; i += sampleBlockSize) {
    const chunkLength = Math.min(sampleBlockSize, samplesLength - i);

    for (let j = 0; j < chunkLength; j++) {
      const idx = i + j;
      // Clamp values between -1 and 1 and scale to Int16
      const sL = Math.max(-1, Math.min(1, leftFloat[idx]));
      leftChunk[j] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

      if (numChannels > 1) {
        const sR = Math.max(-1, Math.min(1, rightFloat[idx]));
        rightChunk[j] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
      }
    }

    // Fill remaining chunk with 0 if it's the last block
    if (chunkLength < sampleBlockSize) {
      for (let j = chunkLength; j < sampleBlockSize; j++) {
        leftChunk[j] = 0;
        rightChunk[j] = 0;
      }
    }

    const mp3buf = numChannels > 1
      ? mp3encoder.encodeBuffer(leftChunk, rightChunk)
      : mp3encoder.encodeBuffer(leftChunk);

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (onProgress && i % (sampleBlockSize * 10) === 0) {
      const currentBlock = Math.floor(i / sampleBlockSize);
      const pct = 30 + Math.round((currentBlock / totalBlocks) * 65);
      onProgress(Math.min(95, pct));
    }
  }

  const mp3bufEnd = mp3encoder.flush();
  if (mp3bufEnd.length > 0) {
    mp3Data.push(new Uint8Array(mp3bufEnd));
  }

  onProgress?.(100);

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
};
