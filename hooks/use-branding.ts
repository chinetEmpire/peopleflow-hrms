'use client';

import { useMemo } from 'react';
import { useTenant } from '@/lib/tenant-context';

/**
 * Convert hex color to HSL string
 */
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '221 80% 24%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Generate darker and lighter variants of a hex color
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Hook that provides dynamic branding CSS variables and the primary color.
 * Injects CSS custom properties on the document root so Tailwind classes
 * can reference them via arbitrary values.
 */
export function useBranding() {
  const { organization } = useTenant();

  const primaryColor = organization?.primary_color || '#032364';

  const cssVariables = useMemo(() => {
    const hsl = hexToHsl(primaryColor);
    const darker = darkenHex(primaryColor, 0.2);
    const darkerHsl = hexToHsl(darker);
    const lighter = darkenHex(primaryColor, -0.1);
    const lighterHsl = hexToHsl(lighter);
    const rgb = hexToRgb(primaryColor);

    return {
      '--brand-primary': primaryColor,
      '--brand-primary-hsl': hsl,
      '--brand-primary-darker': darker,
      '--brand-primary-darker-hsl': darkerHsl,
      '--brand-primary-lighter': lighter,
      '--brand-primary-lighter-hsl': lighterHsl,
      '--brand-primary-rgb': rgb ? `${rgb.r} ${rgb.g} ${rgb.b}` : '3 35 100',
    };
  }, [primaryColor]);

  return {
    primaryColor,
    cssVariables,
    orgName: organization?.display_name || organization?.name || 'HR Platform',
    orgLogo: organization?.logo_url || null,
  };
}
