import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { siteConfigApi } from '../services/api';
import type { ThemeColors } from '../types';

const DEFAULT_COLORS: ThemeColors = {
  brandSage: '#5B7765',
  brandSageLight: '#7A9A87',
  brandSageDark: '#3D5446',
  brandCharcoal: '#2A2A2A',
  brandCream: '#F7F5F2',
  brandCreamDark: '#EDE9E3',
  accentWarm: '#E8A87C',
  accentWarmLight: '#F2C9A8',
  accentCool: '#6B9BAE',
  accentCoolLight: '#9DC0CE',
};

interface AdminThemeContextValue {
  colors: ThemeColors;
  isLoaded: boolean;
  refresh: () => Promise<void>;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

/** Apply theme colors as CSS variables on the admin root for global UI elements */
function applyAdminThemeVars(colors: ThemeColors, root: HTMLElement) {
  // Mirror brand vars so admin-theme CSS and components can use them
  root.style.setProperty('--brand-sage', colors.brandSage);
  root.style.setProperty('--brand-sage-light', colors.brandSageLight);
  root.style.setProperty('--brand-sage-dark', colors.brandSageDark);
  // Primary = brandSage; map to --primary-* for Tailwind primary-* classes
  root.style.setProperty('--primary-50', hexToRgbMix(colors.brandSage, 0.08));
  root.style.setProperty('--primary-100', hexToRgbMix(colors.brandSage, 0.15));
  root.style.setProperty('--primary-200', hexToRgbMix(colors.brandSage, 0.3));
  root.style.setProperty('--primary-300', hexToRgbMix(colors.brandSage, 0.5));
  root.style.setProperty('--primary-400', hexToRgbMix(colors.brandSage, 0.7));
  root.style.setProperty('--primary-500', colors.brandSageLight);
  root.style.setProperty('--primary-600', colors.brandSage);
  root.style.setProperty('--primary-700', colors.brandSageDark);
  root.style.setProperty('--primary-800', darken(colors.brandSageDark, 0.1));
  root.style.setProperty('--primary-900', darken(colors.brandSageDark, 0.2));
  root.style.setProperty('--admin-primary', colors.brandSage);
  root.style.setProperty('--admin-primary-light', colors.brandSageLight);
  root.style.setProperty('--admin-primary-dark', colors.brandSageDark);
  root.style.setProperty('--admin-cream', colors.brandCream);
  root.style.setProperty('--admin-cream-dark', colors.brandCreamDark);
  root.style.setProperty('--admin-charcoal', colors.brandCharcoal);
}

/** Mix hex color with white at given ratio (0–1 = amount of base color) */
function hexToRgbMix(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const wr = 255;
  const wg = 255;
  const wb = 255;
  const nr = Math.round(r * ratio + wr * (1 - ratio));
  const ng = Math.round(g * ratio + wg * (1 - ratio));
  const nb = Math.round(b * ratio + wb * (1 - ratio));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

interface AdminThemeProviderProps {
  children: ReactNode;
}

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);

  const applyToTarget = useCallback((c: ThemeColors) => {
    if (internalRef.current) {
      applyAdminThemeVars(c, internalRef.current);
    }
  }, []);

  const fetchAndApply = useCallback(async () => {
    try {
      const { data } = await siteConfigApi.get();
      const c = data.colors || DEFAULT_COLORS;
      setColors(c);
      applyToTarget(c);
    } catch {
      applyToTarget(DEFAULT_COLORS);
      setColors(DEFAULT_COLORS);
    } finally {
      setIsLoaded(true);
    }
  }, [applyToTarget]);

  // Apply defaults immediately so admin has palette hues before fetch
  useEffect(() => {
    applyToTarget(DEFAULT_COLORS);
  }, [applyToTarget]);

  useEffect(() => {
    fetchAndApply();
  }, [fetchAndApply]);

  const refresh = useCallback(async () => {
    await fetchAndApply();
  }, [fetchAndApply]);

  const value: AdminThemeContextValue = {
    colors,
    isLoaded,
    refresh,
  };

  return (
    <AdminThemeContext.Provider value={value}>
      <div ref={internalRef} data-admin-theme className="min-h-screen flex flex-col">
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }
  return ctx;
}
