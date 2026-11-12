/**
 * Subtitle converter utilities — all processing happens client-side.
 *
 * Supported formats:
 *   - SRT (SubRip):   1\n00:00:01,000 --> 00:00:04,000\nHello\n\n
 *   - VTT (WebVTT):   WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello\n\n
 *   - TXT (plain):    Plain text file (one subtitle block per heuristic chunk)
 */

export function srtToVtt(srtContent: string): string {
  // Remove empty lines at start/end
  let content = srtContent.trim();

  // Add WebVTT header
  let vtt = 'WEBVTT\n\n';

  // Replace SRT timestamp format: 00:00:01,000 --> 00:00:04,000
  // with VTT format: 00:00:01.000 --> 00:00:04.000
  const lines = content.split('\n');
  for (const line of lines) {
    // Detect SRT timestamp line (contains --> and comma milliseconds)
    if (line.includes('-->') && line.includes(',')) {
      vtt += line.replace(/,/g, '.') + '\n';
    } else if (line.trim() === '' || /^\d+$/.test(line.trim())) {
      // Skip SRT cue numbers and blank lines (VTT uses them optionally but we add our own spacing)
      if (line.trim() === '') {
        vtt += '\n';
      }
      // Skip numeric cue identifiers
    } else {
      vtt += line + '\n';
    }
  }

  return vtt.trim() + '\n';
}

export function vttToSrt(vttContent: string): string {
  let content = vttContent.trim();

  // Remove WEBVTT header and any metadata lines after it (but before first timestamp)
  const headerEnd = content.indexOf('-->');
  if (headerEnd === -1) return content; // Not valid VTT

  // Find the first timestamp line and keep everything from there
  const firstTimestampLine = content.slice(0, headerEnd).lastIndexOf('\n');
  const bodyStart = firstTimestampLine >= 0 ? firstTimestampLine + 1 : 0;
  let body = content.slice(bodyStart);

  // Replace VTT timestamps: 00:00:01.000 --> 00:00:04.000
  // with SRT: 00:00:01,000 --> 00:00:04,000
  const lines = body.split('\n');
  let srt = '';
  let cueCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('-->') && line.includes('.')) {
      cueCounter++;
      srt += cueCounter + '\n';
      srt += line.replace(/\./g, ',') + '\n';
    } else if (line.includes('-->')) {
      // Already has comma style, just add cue number
      cueCounter++;
      srt += cueCounter + '\n';
      srt += line + '\n';
    } else if (line.trim() === '' && i > 0 && lines[i - 1].trim() === '') {
      // Skip consecutive blank lines
      continue;
    } else {
      srt += line + '\n';
    }
  }

  return srt.trim() + '\n';
}

export function txtToSrt(textContent: string): string {
  const text = textContent.trim();
  if (!text) return '';

  // Split by double newlines to detect paragraphs/segments
  const segments = text.split(/\n\s*\n/).filter(s => s.trim());

  if (segments.length === 0) {
    // Single block: create one subtitle
    return generateSrtFromText(text);
  }

  // Multiple segments: each becomes a subtitle block
  return segments
    .map((segment, index) => generateSrtFromText(segment, index))
    .filter(Boolean)
    .join('\n');
}

function generateSrtFromText(text: string, index: number = 0): string {
  const cleanText = text.trim();
  if (!cleanText) return '';

  // Estimate reading time: ~15 chars per second, minimum 2 seconds
  const estimatedDuration = Math.max(2, Math.ceil(cleanText.length / 15));
  const startSeconds = index * estimatedDuration;
  const endSeconds = startSeconds + estimatedDuration;

  const startTime = formatSrtTime(startSeconds);
  const endTime = formatSrtTime(endSeconds);

  return `${index + 1}\n${startTime} --> ${endTime}\n${cleanText}\n`;
}

function formatSrtTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor((totalSeconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

function pad(num: number, length: number = 2): string {
  return String(num).padStart(length, '0');
}

export function detectSubtitleFormat(content: string): 'srt' | 'vtt' | 'txt' {
  const trimmed = content.trim();

  // Check for WEBVTT header
  if (trimmed.startsWith('WEBVTT')) return 'vtt';

  // Check for SRT pattern: number, then timestamp with comma milliseconds
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const firstLine = lines[0];
    const secondLine = lines[1];
    if (/^\d+$/.test(firstLine) && secondLine.includes('-->') && secondLine.includes(',')) {
      return 'srt';
    }
  }

  // Fallback: plain text
  return 'txt';
}
