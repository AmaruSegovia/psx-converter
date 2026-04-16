import type { PaletteColor } from '@/types';

export function hexToColor(hex: string): PaletteColor {
  const clean = hex.replace('#', '');
  return {
    hex: `#${clean}`,
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function parseHexFile(content: string): PaletteColor[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[0-9a-fA-F]{6}$/.test(line))
    .map(hex => hexToColor(hex));
}

export function parseGPL(content: string): PaletteColor[] {
  const colors: PaletteColor[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colors.push({ r, g, b, hex });
    }
  }

  return colors;
}

export function parsePAL(content: string): PaletteColor[] {
  const lines = content.split('\n').map(l => l.trim());

  // JASC-PAL format
  if (lines[0] === 'JASC-PAL') {
    const count = parseInt(lines[2]);
    const colors: PaletteColor[] = [];
    for (let i = 3; i < 3 + count && i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length >= 3) {
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colors.push({ r, g, b, hex });
      }
    }
    return colors;
  }

  // Fallback: try line-by-line RGB
  return parseGPL(content);
}

export function parsePaletteFile(filename: string, content: string): PaletteColor[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'hex': return parseHexFile(content);
    case 'gpl': return parseGPL(content);
    case 'pal': return parsePAL(content);
    default: return parseHexFile(content);
  }
}

// --- Palette export ---

function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPaletteHex(colors: PaletteColor[], filename = 'palette.hex') {
  const content = colors.map(c => c.hex.slice(1).toLowerCase()).join('\n');
  downloadText(content, filename);
}

export function exportPaletteGPL(colors: PaletteColor[], name = 'PSX', filename = 'palette.gpl') {
  const header = `GIMP Palette\nName: ${name}\nColumns: 8\n#\n`;
  const body = colors
    .map((c, i) =>
      `${String(c.r).padStart(3)} ${String(c.g).padStart(3)} ${String(c.b).padStart(3)} color${i + 1}`
    )
    .join('\n');
  downloadText(header + body, filename);
}

export function exportPaletteJSON(colors: PaletteColor[], filename = 'palette.json') {
  const content = JSON.stringify(
    colors.map(c => ({ r: c.r, g: c.g, b: c.b, hex: c.hex })),
    null,
    2
  );
  downloadText(content, filename, 'application/json');
}
