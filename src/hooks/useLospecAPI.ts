import { useState, useCallback } from 'react';
import type { PaletteColor, LospecPaletteResponse } from '@/types';

const LOSPEC_API = 'https://lospec.com/palette-list';

export type LospecErrorCode =
  | 'empty'
  | 'notFound'
  | 'server'
  | 'network'
  | 'format'
  | 'unknown';

export function useLospecAPI() {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<LospecErrorCode | null>(null);

  const fetchPalette = useCallback(async (input: string): Promise<PaletteColor[] | null> => {
    if (!input.trim()) {
      setErrorCode('empty');
      return null;
    }

    let slug = input.trim();
    const urlMatch = slug.match(/lospec\.com\/palette-list\/([a-z0-9-]+)/i);
    if (urlMatch) slug = urlMatch[1];
    slug = slug.replace(/^\/+|\/+$/g, '');

    setLoading(true);
    setErrorCode(null);

    try {
      let response: Response;
      try {
        response = await fetch(`${LOSPEC_API}/${slug}.json`);
      } catch {
        // fetch only rejects on network errors / CORS / offline
        setErrorCode('network');
        return null;
      }

      if (response.status === 404) {
        setErrorCode('notFound');
        return null;
      }
      if (!response.ok) {
        setErrorCode('server');
        return null;
      }

      let data: LospecPaletteResponse;
      try {
        data = await response.json();
      } catch {
        setErrorCode('format');
        return null;
      }

      if (!data || !Array.isArray(data.colors) || data.colors.length === 0) {
        setErrorCode('format');
        return null;
      }

      return data.colors.map((hex) => ({
        hex: `#${hex}`,
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }));
    } catch {
      setErrorCode('unknown');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchPalette, loading, errorCode };
}
