'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CreateBrandPortalTokenSchema =
  exports.BrandPortalTokenSchema =
  exports.PortalPermissionSchema =
    void 0;
const zod_1 = require('zod');
exports.PortalPermissionSchema = zod_1.z.enum([
  'VIEW_DELIVERABLES',
  'VIEW_PERFORMANCE',
  'VIEW_INVOICES',
  'APPROVE_CONTENT',
  'DOWNLOAD_ASSETS',
]);
exports.BrandPortalTokenSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  creatorId: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid().nullable().optional(),
  token: zod_1.z.string().min(32),
  brandName: zod_1.z.string().min(1).max(255),
  brandEmail: zod_1.z.string().email(),
  permissions: zod_1.z.array(exports.PortalPermissionSchema).min(1),
  expiresAt: zod_1.z.coerce.date(),
  lastAccessedAt: zod_1.z.coerce.date().nullable().optional(),
  accessCount: zod_1.z.number().int().nonnegative().default(0),
  isRevoked: zod_1.z.boolean().default(false),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.CreateBrandPortalTokenSchema = exports.BrandPortalTokenSchema.omit({
  id: true,
  token: true,
  lastAccessedAt: true,
  accessCount: true,
  isRevoked: true,
  createdAt: true,
  updatedAt: true,
});
//# sourceMappingURL=brand-portal.schema.js.map
