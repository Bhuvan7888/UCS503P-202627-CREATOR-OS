export type PortalPermission =
  | 'VIEW_DELIVERABLES'
  | 'VIEW_PERFORMANCE'
  | 'VIEW_INVOICES'
  | 'APPROVE_CONTENT'
  | 'DOWNLOAD_ASSETS';
export interface BrandPortalToken {
  id: string;
  creatorId: string;
  dealId?: string | null;
  token: string;
  brandName: string;
  brandEmail: string;
  permissions: PortalPermission[];
  expiresAt: Date;
  lastAccessedAt?: Date | null;
  accessCount: number;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=brand-portal.d.ts.map
