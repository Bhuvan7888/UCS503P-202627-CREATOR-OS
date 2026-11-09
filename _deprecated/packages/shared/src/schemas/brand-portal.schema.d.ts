import { z } from 'zod';
export declare const PortalPermissionSchema: z.ZodEnum<
  ['VIEW_DELIVERABLES', 'VIEW_PERFORMANCE', 'VIEW_INVOICES', 'APPROVE_CONTENT', 'DOWNLOAD_ASSETS']
>;
export declare const BrandPortalTokenSchema: z.ZodObject<
  {
    id: z.ZodString;
    creatorId: z.ZodString;
    dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    token: z.ZodString;
    brandName: z.ZodString;
    brandEmail: z.ZodString;
    permissions: z.ZodArray<
      z.ZodEnum<
        [
          'VIEW_DELIVERABLES',
          'VIEW_PERFORMANCE',
          'VIEW_INVOICES',
          'APPROVE_CONTENT',
          'DOWNLOAD_ASSETS',
        ]
      >,
      'many'
    >;
    expiresAt: z.ZodDate;
    lastAccessedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    accessCount: z.ZodDefault<z.ZodNumber>;
    isRevoked: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    token: string;
    expiresAt: Date;
    isRevoked: boolean;
    brandName: string;
    brandEmail: string;
    permissions: (
      | 'VIEW_DELIVERABLES'
      | 'VIEW_PERFORMANCE'
      | 'VIEW_INVOICES'
      | 'APPROVE_CONTENT'
      | 'DOWNLOAD_ASSETS'
    )[];
    creatorId: string;
    accessCount: number;
    dealId?: string | null | undefined;
    lastAccessedAt?: Date | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    token: string;
    expiresAt: Date;
    brandName: string;
    brandEmail: string;
    permissions: (
      | 'VIEW_DELIVERABLES'
      | 'VIEW_PERFORMANCE'
      | 'VIEW_INVOICES'
      | 'APPROVE_CONTENT'
      | 'DOWNLOAD_ASSETS'
    )[];
    creatorId: string;
    isRevoked?: boolean | undefined;
    dealId?: string | null | undefined;
    lastAccessedAt?: Date | null | undefined;
    accessCount?: number | undefined;
  }
>;
export declare const CreateBrandPortalTokenSchema: z.ZodObject<
  Omit<
    {
      id: z.ZodString;
      creatorId: z.ZodString;
      dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      token: z.ZodString;
      brandName: z.ZodString;
      brandEmail: z.ZodString;
      permissions: z.ZodArray<
        z.ZodEnum<
          [
            'VIEW_DELIVERABLES',
            'VIEW_PERFORMANCE',
            'VIEW_INVOICES',
            'APPROVE_CONTENT',
            'DOWNLOAD_ASSETS',
          ]
        >,
        'many'
      >;
      expiresAt: z.ZodDate;
      lastAccessedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      accessCount: z.ZodDefault<z.ZodNumber>;
      isRevoked: z.ZodDefault<z.ZodBoolean>;
      createdAt: z.ZodDate;
      updatedAt: z.ZodDate;
    },
    'id' | 'createdAt' | 'updatedAt' | 'token' | 'isRevoked' | 'lastAccessedAt' | 'accessCount'
  >,
  'strip',
  z.ZodTypeAny,
  {
    expiresAt: Date;
    brandName: string;
    brandEmail: string;
    permissions: (
      | 'VIEW_DELIVERABLES'
      | 'VIEW_PERFORMANCE'
      | 'VIEW_INVOICES'
      | 'APPROVE_CONTENT'
      | 'DOWNLOAD_ASSETS'
    )[];
    creatorId: string;
    dealId?: string | null | undefined;
  },
  {
    expiresAt: Date;
    brandName: string;
    brandEmail: string;
    permissions: (
      | 'VIEW_DELIVERABLES'
      | 'VIEW_PERFORMANCE'
      | 'VIEW_INVOICES'
      | 'APPROVE_CONTENT'
      | 'DOWNLOAD_ASSETS'
    )[];
    creatorId: string;
    dealId?: string | null | undefined;
  }
>;
//# sourceMappingURL=brand-portal.schema.d.ts.map
