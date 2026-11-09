import { z } from 'zod';

export const PortalPermissionSchema = z.enum([
  'VIEW_DELIVERABLES',
  'VIEW_PERFORMANCE',
  'VIEW_INVOICES',
  'APPROVE_CONTENT',
  'DOWNLOAD_ASSETS',
]);

export const BrandPortalTokenSchema = z.object({
  id: z.string().cuid(),
  creatorId: z.string().cuid(),
  dealId: z.string().cuid().nullable().optional(),
  token: z.string().min(32),
  brandName: z.string().min(1).max(255),
  brandEmail: z.string().email(),
  permissions: z.array(PortalPermissionSchema).min(1),
  expiresAt: z.coerce.date(),
  lastAccessedAt: z.coerce.date().nullable().optional(),
  accessCount: z.number().int().nonnegative().default(0),
  isRevoked: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateBrandPortalTokenSchema = BrandPortalTokenSchema.omit({
  id: true,
  token: true,
  lastAccessedAt: true,
  accessCount: true,
  isRevoked: true,
  createdAt: true,
  updatedAt: true,
});
