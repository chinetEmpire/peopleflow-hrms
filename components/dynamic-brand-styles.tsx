'use client';

import { useBranding } from '@/hooks/use-branding';

/**
 * Injects dynamic CSS custom properties based on the organization's primary color.
 * This component must be rendered inside AuthProvider and TenantProvider.
 */
export function DynamicBrandStyles() {
  const { cssVariables } = useBranding();

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${Object.entries(cssVariables)
          .map(([key, value]) => `${key}: ${value};`)
          .join(' ')} }`,
      }}
    />
  );
}
