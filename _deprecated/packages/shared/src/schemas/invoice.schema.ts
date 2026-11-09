import { z } from 'zod';

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'DISPUTED',
]);

export const InvoiceLineItemSchema = z.object({
  id: z.string().cuid(),
  invoiceId: z.string().cuid(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  deliverableId: z.string().cuid().nullable().optional(),
});

export const InvoiceSchema = z.object({
  id: z.string().cuid(),
  invoiceNumber: z.string().min(1).max(50),
  creatorId: z.string().cuid(),
  dealId: z.string().cuid().nullable().optional(),
  brandName: z.string().min(1).max(255),
  brandEmail: z.string().email(),
  brandAddress: z.string().max(1000).nullable().optional(),
  status: InvoiceStatusSchema.default('DRAFT'),
  lineItems: z.array(InvoiceLineItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).nullable().optional(),
  taxAmount: z.number().nonnegative().nullable().optional(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  issuedAt: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  paidAmount: z.number().nonnegative().nullable().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  termsAndConditions: z.string().max(5000).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateInvoiceSchema = InvoiceSchema.omit({
  id: true,
  invoiceNumber: true,
  createdAt: true,
  updatedAt: true,
  lineItems: true,
}).extend({
  lineItems: z
    .array(
      InvoiceLineItemSchema.omit({ id: true, invoiceId: true, totalPrice: true }).extend({
        totalPrice: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial();
