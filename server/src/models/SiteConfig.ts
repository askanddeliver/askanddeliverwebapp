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
  accentCool: string;
}

export interface IDisciplineTask {
  id: string;
  name: string;
  taskTypeId: string;
  assignableToMember: boolean;
  sortOrder: number;
}

export interface IDisciplineDefinition {
  id: string;
  name: string;
  description?: string;
  assignableToMember: boolean;
  showOnProject: boolean;
  sortOrder: number;
  tasks: IDisciplineTask[];
}

export interface ISiteConfig extends Document {
  userId: string;
  colors: IThemeColors;
  palettes: IColorPalette[];
  disciplines: IDisciplineDefinition[];
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
    accentCool: { type: String, default: '#6B9BAE' },
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

const DisciplineTaskSchema = new Schema<IDisciplineTask>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    taskTypeId: { type: String, required: true },
    assignableToMember: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const DisciplineDefinitionSchema = new Schema<IDisciplineDefinition>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assignableToMember: { type: Boolean, default: true },
    showOnProject: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    tasks: { type: [DisciplineTaskSchema], default: [] },
  },
  { _id: false }
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
    disciplines: {
      type: [DisciplineDefinitionSchema],
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
