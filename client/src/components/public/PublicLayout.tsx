import { ReactNode, useEffect } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import { siteConfigPublicApi } from '../../services/api';
import type { ThemeColors } from '../../types';

const CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  brandSage: '--brand-sage',
  brandSageLight: '--brand-sage-light',
  brandSageDark: '--brand-sage-dark',
  brandCharcoal: '--brand-charcoal',
  brandCream: '--brand-cream',
  brandCreamDark: '--brand-cream-dark',
  accentWarm: '--accent-warm',
  accentWarmLight: '--accent-warm-light',
  accentCool: '--accent-cool',
  accentCoolLight: '--accent-cool-light',
};

function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = colors[key as keyof ThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

interface PublicLayoutProps {
  children: ReactNode;
}

function PublicLayout({ children }: PublicLayoutProps) {
  useEffect(() => {
    siteConfigPublicApi
      .getColors()
      .then(({ data }) => applyThemeColors(data))
      .catch(() => {
        // Defaults from CSS are fine as fallback
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
