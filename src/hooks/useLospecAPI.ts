import { useState, useCallback } from 'react';
import type { PaletteColor, LospecPaletteResponse } from '@/types';

const LOSPEC_API = 'https://lospec.com/palette-list';

export function useLospecAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPalette = useCallback(async (input: string): Promise<PaletteColor[] | null> => {
    if (!input.trim()) {
      setError('Enter a palette name or Lospec URL');
      return null;
    }

    // Extract slug from full URL or use as-is
    let slug = input.trim();
    const urlMatch = slug.match(/lospec\.com\/palette-list\/([a-z0-9-]+)/i);
    if (urlMatch) {
      slug = urlMatch[1];
    }
    // Also strip leading/trailing slashes
    slug = slug.replace(/^\/+|\/+$/g, '');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${LOSPEC_API}/${slug}.json`);

      if (!response.ok) {
        throw new Error('Palette not found');
      }

      const data: LospecPaletteResponse = await response.json();

      return data.colors.map((hex) => ({
        hex: `#${hex}`,
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch palette');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchPalette, loading, error };
}
