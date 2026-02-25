import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Palette, Trash2, Check, Plus, X, Building2 } from 'lucide-react';
import { siteConfigApi } from '../services/api';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import type { ThemeColors, ColorPalette } from '../types';

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

interface ColorTier {
  label: string;
  description: string;
  keys: { key: keyof ThemeColors; label: string }[];
}

const COLOR_TIERS: ColorTier[] = [
  {
    label: 'Brand Primary',
    description: 'The signature color used for buttons, links, and key accents across the public site.',
    keys: [
      { key: 'brandSage', label: 'Primary' },
      { key: 'brandSageLight', label: 'Light' },
      { key: 'brandSageDark', label: 'Dark' },
    ],
  },
  {
    label: 'Background',
    description: 'The base background tones that set the overall feel of the site.',
    keys: [
      { key: 'brandCream', label: 'Background' },
      { key: 'brandCreamDark', label: 'Surface' },
    ],
  },
  {
    label: 'Typography',
    description: 'The primary text color used for headings and body copy.',
    keys: [{ key: 'brandCharcoal', label: 'Text Color' }],
  },
  {
    label: 'Accent Warm',
    description: 'Warm accent tones for highlights, badges, and decorative elements.',
    keys: [
      { key: 'accentWarm', label: 'Warm' },
      { key: 'accentWarmLight', label: 'Warm Light' },
    ],
  },
  {
    label: 'Accent Cool',
    description: 'Cool accent tones for secondary highlights and informational elements.',
    keys: [
      { key: 'accentCool', label: 'Cool' },
      { key: 'accentCoolLight', label: 'Cool Light' },
    ],
  },
];

function ColorSwatch({
  color,
  label,
  onChange,
}: {
  color: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [inputValue, setInputValue] = useState(color);

  useEffect(() => {
    setInputValue(color);
  }, [color]);

  const handleHexChange = (val: string) => {
    setInputValue(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="flex items-center gap-3 group">
      <label className="relative cursor-pointer">
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm transition-all group-hover:shadow-md group-hover:scale-105"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setInputValue(e.target.value.toUpperCase());
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleHexChange(e.target.value.toUpperCase())}
          className="text-xs font-mono text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none w-20 py-0.5 transition-colors"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ backgroundColor: colors.brandCream }}
    >
      {/* Simulated nav bar */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: `1px solid ${colors.brandCreamDark}` }}
      >
        <span
          className="text-sm font-bold"
          style={{ color: colors.brandCharcoal }}
        >
          Ask<span style={{ color: colors.brandSage }}>+</span>Deliver
        </span>
        <div className="flex gap-3">
          <span
            className="text-xs"
            style={{ color: colors.brandCharcoal, opacity: 0.6 }}
          >
            Work
          </span>
          <span
            className="text-xs"
            style={{ color: colors.brandCharcoal, opacity: 0.6 }}
          >
            About
          </span>
          <span
            className="text-xs px-2.5 py-0.5 rounded"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.brandCharcoal}`,
              color: colors.brandCharcoal,
              fontSize: '10px',
            }}
          >
            Start a Project
          </span>
        </div>
      </div>

      {/* Hero section */}
      <div className="px-5 py-6">
        <p
          className="text-[10px] font-mono uppercase tracking-widest mb-1"
          style={{ color: colors.brandSageLight, opacity: 0.8 }}
        >
          Creative Collective
        </p>
        <h3
          className="text-lg font-bold leading-tight mb-2"
          style={{ color: colors.brandCharcoal }}
        >
          Ask<span style={{ color: colors.brandSage }}>+</span>Deliver
        </h3>
        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: colors.brandCharcoal, opacity: 0.7 }}
        >
          A creative collective where talented professionals collaborate
          to bring exceptional projects to life.
        </p>
        <div className="flex gap-2">
          <span
            className="text-[10px] px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1"
            style={{
              backgroundColor: colors.brandSage,
              color: '#FFFFFF',
            }}
          >
            View Our Work →
          </span>
          <span
            className="text-[10px] px-3 py-1.5 rounded-md font-medium"
            style={{
              backgroundColor: 'transparent',
              border: `1.5px solid ${colors.brandCharcoal}`,
              color: colors.brandCharcoal,
            }}
          >
            Start a Project
          </span>
        </div>
      </div>

      {/* Accent color showcase */}
      <div
        className="px-5 py-3 flex gap-2"
        style={{ backgroundColor: colors.brandCreamDark }}
      >
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: colors.accentWarm }}
        />
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: colors.accentWarmLight }}
        />
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: colors.accentCool }}
        />
        <div
          className="flex-1 h-2 rounded-full"
          style={{ backgroundColor: colors.accentCoolLight }}
        />
      </div>
    </div>
  );
}

function SiteConfigPage() {
  const { refresh: refreshAdminTheme } = useAdminTheme();
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [savedColors, setSavedColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companySaving, setCompanySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savePaletteOpen, setSavePaletteOpen] = useState(false);
  const [paletteName, setPaletteName] = useState('');

  const hasChanges = JSON.stringify(colors) !== JSON.stringify(savedColors);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await siteConfigApi.get();
      const loadedColors = data.colors || DEFAULT_COLORS;
      setColors(loadedColors);
      setSavedColors(loadedColors);
      setPalettes(data.palettes || []);
      setCompanyName(data.companyName || '');
      setCompanyAddress(data.companyAddress || '');
      setCompanyPhone(data.companyPhone || '');
      setCompanyEmail(data.companyEmail || '');
    } catch {
      // If no config exists, defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const { data } = await siteConfigApi.updateColors(colors);
      const updatedColors = data.colors || colors;
      setSavedColors(updatedColors);
      setColors(updatedColors);
      setPalettes(data.palettes || palettes);
      await refreshAdminTheme();
      showSuccess('Theme colors saved successfully');
    } catch {
      setError('Failed to save colors. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError('');
      const { data } = await siteConfigApi.reset();
      const resetColors = data.colors || DEFAULT_COLORS;
      setColors(resetColors);
      setSavedColors(resetColors);
      setPalettes(data.palettes || palettes);
      await refreshAdminTheme();
      showSuccess('Colors reset to defaults');
    } catch {
      setError('Failed to reset colors. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePalette = async () => {
    if (!paletteName.trim()) return;
    try {
      setError('');
      const { data } = await siteConfigApi.savePalette(paletteName.trim(), colors);
      setPalettes(data.palettes || []);
      setPaletteName('');
      setSavePaletteOpen(false);
      showSuccess(`Palette "${paletteName.trim()}" saved`);
    } catch {
      setError('Failed to save palette. Please try again.');
    }
  };

  const handleLoadPalette = (palette: ColorPalette) => {
    setColors(palette.colors);
    setError('');
  };

  const handleDeletePalette = async (paletteId: string) => {
    try {
      setError('');
      const { data } = await siteConfigApi.deletePalette(paletteId);
      setPalettes(data.palettes || []);
      showSuccess('Palette deleted');
    } catch {
      setError('Failed to delete palette. Please try again.');
    }
  };

  const handleSaveCompany = async () => {
    try {
      setCompanySaving(true);
      setError('');
      await siteConfigApi.updateCompany({
        companyName: companyName.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        companyEmail: companyEmail.trim() || undefined,
      });
      showSuccess('Company information saved');
    } catch {
      setError('Failed to save company information. Please try again.');
    } finally {
      setCompanySaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-96 mb-8" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-xl" />
            <div className="h-64 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Configuration</h1>
          <p className="text-gray-500 mt-1">
            Control the color theme of your public-facing website
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}
      {hasChanges && !success && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm">
          You have unsaved changes. Click "Save Changes" to apply them to the live site.
        </div>
      )}

      {/* Company Information (for invoices) */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This information appears on invoices for client payments (address, phone, email).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input"
              placeholder="Ask and Deliver"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="input"
              placeholder="hello@askanddeliver.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              className="input"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="input min-h-[80px]"
              placeholder="123 Main St, City, State ZIP"
              rows={3}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleSaveCompany}
            disabled={companySaving}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {companySaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Company Info
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color tiers */}
        <div className="lg:col-span-2 space-y-4">
          {COLOR_TIERS.map((tier) => (
            <div key={tier.label} className="card">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {tier.label}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tier.description}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tier.keys.map(({ key, label }) => (
                  <ColorSwatch
                    key={key}
                    color={colors[key]}
                    label={label}
                    onChange={(val) => handleColorChange(key, val)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar: Preview + Palettes */}
        <div className="space-y-4">
          {/* Live Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Live Preview
            </h3>
            <ThemePreview colors={colors} />
          </div>

          {/* Saved Palettes */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-gray-400" />
                Saved Palettes
              </h3>
              <button
                onClick={() => setSavePaletteOpen(true)}
                className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current
              </button>
            </div>

            {/* Save palette form */}
            {savePaletteOpen && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paletteName}
                    onChange={(e) => setPaletteName(e.target.value)}
                    placeholder="Palette name..."
                    className="input text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePalette();
                      if (e.key === 'Escape') {
                        setSavePaletteOpen(false);
                        setPaletteName('');
                      }
                    }}
                  />
                  <button
                    onClick={handleSavePalette}
                    disabled={!paletteName.trim()}
                    className="btn-primary text-xs px-3 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setSavePaletteOpen(false);
                      setPaletteName('');
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Palette list */}
            {palettes.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                No saved palettes yet. Save your current colors to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {palettes.map((palette) => (
                  <div
                    key={palette._id}
                    className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Color dots preview */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[
                        palette.colors.brandSage,
                        palette.colors.brandCream,
                        palette.colors.brandCharcoal,
                        palette.colors.accentWarm,
                        palette.colors.accentCool,
                      ].map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-gray-200"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleLoadPalette(palette)}
                      className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 font-medium truncate"
                      title={`Load "${palette.name}"`}
                    >
                      {palette.name}
                    </button>
                    <button
                      onClick={() => handleDeletePalette(palette._id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
                      title="Delete palette"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full color reference */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Color Reference
            </h3>
            <div className="grid grid-cols-5 gap-1">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div
                    className="w-full aspect-square rounded-md border border-gray-200 mb-1"
                    style={{ backgroundColor: value }}
                  />
                  <p className="text-[9px] font-mono text-gray-400 leading-none">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SiteConfigPage;
