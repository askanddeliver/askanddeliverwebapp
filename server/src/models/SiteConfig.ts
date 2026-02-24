import mongoose, { Document, Schema } from 'mongoose';

export interface IColorPalette {
  name: string;
  colors: IThemeColors;
  createdAt: Date;
}

export interface IThemeColors {
  brandSage: string;
  brandSageLight: string;
  brandSageDark: string;
  brandCharcoal: string;
  brandCream: string;
  brandCreamDark: string;
  accentWarm: string;
  accentWarmLight: string;
  accentCool: string;
  accentCoolLight: string;
}

export interface ISiteConfig extends Document {
  userId: string;
  colors: IThemeColors;
  palettes: IColorPalette[];
  /** Company info for invoices (Ask and Deliver) */
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ThemeColorsSchema = new Schema<IThemeColors>(
  {
    brandSage: { type: String, default: '#5B7765' },
    brandSageLight: { type: String, default: '#7A9A87' },
    brandSageDark: { type: String, default: '#3D5446' },
    brandCharcoal: { type: String, default: '#2A2A2A' },
    brandCream: { type: String, default: '#F7F5F2' },
    brandCreamDark: { type: String, default: '#EDE9E3' },
    accentWarm: { type: String, default: '#E8A87C' },
    accentWarmLight: { type: String, default: '#F2C9A8' },
    accentCool: { type: String, default: '#6B9BAE' },
    accentCoolLight: { type: String, default: '#9DC0CE' },
  },
  { _id: false }
);

const ColorPaletteSchema = new Schema<IColorPalette>(
  {
    name: { type: String, required: true, trim: true },
    colors: { type: ThemeColorsSchema, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    colors: {
      type: ThemeColorsSchema,
      default: () => ({}),
    },
    palettes: {
      type: [ColorPaletteSchema],
      default: [],
    },
    companyName: { type: String, trim: true },
    companyAddress: { type: String, trim: true },
    companyPhone: { type: String, trim: true },
    companyEmail: { type: String, trim: true, lowercase: true },
  },
  {
    timestamps: true,
  }
);

export const SiteConfig = mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema);
