export interface BuiltinPalette {
  name: string;
  slug: string;
  description: string;
  colors: string[];
}

export const BUILTIN_PALETTES: BuiltinPalette[] = [
  {
    name: 'PSX Horror (16)',
    slug: 'psx-horror',
    description: 'Silent Hill / Resident Evil style',
    colors: [
      '#0a0a0a', '#1c1410', '#2d1f14', '#3d2b1a',
      '#4e3720', '#5f4226', '#704e2d', '#816034',
      '#927b4d', '#a39566', '#b4af80', '#c5c89a',
      '#d6e2b4', '#e7fbce', '#8b7355', '#6b5a42',
    ],
  },
  {
    name: 'PSX RPG (16)',
    slug: 'psx-rpg',
    description: 'Final Fantasy VII / Chrono Cross style',
    colors: [
      '#0f0f23', '#1a1a3e', '#2d1b69', '#4a2c8a',
      '#6b3fa0', '#8b5fb0', '#a080c0', '#b8a0d0',
      '#d0c0e0', '#e8e0f0', '#2d5a1a', '#4a8a2c',
      '#6bb040', '#8cd060', '#b0e880', '#d0f0a0',
    ],
  },
  {
    name: 'PSX Minimal (8)',
    slug: 'psx-minimal',
    description: '8 ultra-limited colors',
    colors: [
      '#0d0d0d', '#4a4a4a', '#8a8a8a', '#c0c0c0',
      '#8b2500', '#2e5a1a', '#1a3a6b', '#c0a030',
    ],
  },
  {
    name: 'PSX Warm (16)',
    slug: 'psx-warm',
    description: 'Warm tones, sunset vibes',
    colors: [
      '#1a0a0a', '#2d1410', '#4a1a0a', '#6b2a10',
      '#8b3a1a', '#a04a2a', '#b06040', '#c08060',
      '#d0a080', '#e0c0a0', '#f0e0c0', '#f0d090',
      '#e0a060', '#c07030', '#a04010', '#601000',
    ],
  },
  {
    name: 'PSX Cool (16)',
    slug: 'psx-cool',
    description: 'Cool blues and cyans',
    colors: [
      '#0a0a1a', '#0a1020', '#0a1a30', '#0a2a4a',
      '#0a3a6a', '#1a4a8a', '#2a5aaa', '#4070c0',
      '#6090d0', '#80b0e0', '#a0d0f0', '#c0e0f0',
      '#0a3a3a', '#1a5a5a', '#2a7a7a', '#4a9a9a',
    ],
  },
  {
    name: 'GameBoy (4)',
    slug: 'gameboy',
    description: 'Classic GameBoy green palette',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  {
    name: 'Sweetie 16',
    slug: 'sweetie-16',
    description: 'Popular 16-color pixel art palette',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57',
      '#ffcd75', '#a7f070', '#38b764', '#257179',
      '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
    ],
  },
  {
    name: 'ENDESGA 32',
    slug: 'endesga-32',
    description: '32-color versatile palette',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672',
      '#b86f50', '#733e39', '#3e2731', '#a22633',
      '#e43b44', '#f77622', '#feae34', '#fee761',
      '#63c74d', '#3e8948', '#265c42', '#193c3e',
      '#124e89', '#0099db', '#2ce8f5', '#ffffff',
      '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c',
      '#b55088', '#f6757a', '#e8b796', '#c28569',
    ],
  },
];
