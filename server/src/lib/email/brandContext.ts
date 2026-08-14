import { SiteConfig } from '../../models';

export interface WorkspaceEmailBrand {
  companyName: string;
  companyEmail?: string;
  accentColor: string;
}

const DEFAULT_BRAND: WorkspaceEmailBrand = {
  companyName: 'Ask And Deliver',
  accentColor: '#5B7765',
};

export async function loadWorkspaceEmailBrand(
  workspaceOwnerId: string
): Promise<WorkspaceEmailBrand> {
  const config = await SiteConfig.findOne({ userId: workspaceOwnerId })
    .select('companyName companyEmail colors.brandSage')
    .lean();

  if (!config) {
    return { ...DEFAULT_BRAND };
  }

  return {
    companyName: config.companyName?.trim() || DEFAULT_BRAND.companyName,
    companyEmail: config.companyEmail?.trim() || undefined,
    accentColor: config.colors?.brandSage || DEFAULT_BRAND.accentColor,
  };
}
