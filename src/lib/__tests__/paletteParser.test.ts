import { describe, it, expect } from 'vitest';
import {
  hexToColor,
  parseHexFile,
  parseGPL,
  parsePAL,
  parsePaletteFile,
} from '../paletteParser';

describe('hexToColor', () => {
  it('parses with leading #', () => {
    expect(hexToColor('#ff8800')).toEqual({ r: 255, g: 136, b: 0, hex: '#ff8800' });
  });

  it('parses without leading #', () => {
    expect(hexToColor('00ff00')).toEqual({ r: 0, g: 255, b: 0, hex: '#00ff00' });
  });
});

describe('parseHexFile', () => {
  it('reads one hex per line', () => {
    const colors = parseHexFile('ff0000\n00ff00\n0000ff');
    expect(colors).toHaveLength(3);
    expect(colors[0].hex).toBe('#ff0000');
    expect(colors[2].hex).toBe('#0000ff');
  });

  it('ignores invalid lines', () => {
    const colors = parseHexFile('ff0000\n# comment\nnot-a-hex\n00ff00');
    expect(colors).toHaveLength(2);
  });

  it('trims whitespace', () => {
    const colors = parseHexFile('  ff0000  \n  00ff00  ');
    expect(colors).toHaveLength(2);
  });
});

describe('parseGPL', () => {
  it('reads R G B triplets', () => {
    const content = `GIMP Palette
Name: Test
Columns: 4
#
255   0   0 red
  0 255   0 green
  0   0 255 blue`;
    const colors = parseGPL(content);
    expect(colors).toHaveLength(3);
    expect(colors[0]).toMatchObject({ r: 255, g: 0, b: 0, hex: '#ff0000' });
    expect(colors[1]).toMatchObject({ r: 0, g: 255, b: 0 });
  });
});

describe('parsePAL', () => {
  it('reads JASC-PAL', () => {
    const content = `JASC-PAL
0100
3
255 0 0
0 255 0
0 0 255`;
    const colors = parsePAL(content);
    expect(colors).toHaveLength(3);
    expect(colors[0].hex).toBe('#ff0000');
  });

  it('falls back to GPL parser for unknown format', () => {
    const colors = parsePAL('255 0 0\n0 255 0');
    expect(colors).toHaveLength(2);
  });
});

describe('parsePaletteFile', () => {
  it('routes by extension', () => {
    const hex = parsePaletteFile('p.hex', 'ff0000\n00ff00');
    const gpl = parsePaletteFile('p.gpl', '255 0 0 red');
    const pal = parsePaletteFile('p.pal', 'JASC-PAL\n0100\n1\n255 0 0');
    expect(hex).toHaveLength(2);
    expect(gpl).toHaveLength(1);
    expect(pal).toHaveLength(1);
  });

  it('defaults to hex parser for unknown extension', () => {
    expect(parsePaletteFile('palette.txt', 'ff0000')).toHaveLength(1);
  });
});
