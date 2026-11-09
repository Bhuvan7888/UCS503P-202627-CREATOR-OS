'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.UpdateInvoiceSchema =
  exports.CreateInvoiceSchema =
  exports.InvoiceSchema =
  exports.InvoiceLineItemSchema =
  exports.InvoiceStatusSchema =
    void 0;
const zod_1 = require('zod');
exports.InvoiceStatusSchema = zod_1.z.enum([
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'DISPUTED',
]);
exports.InvoiceLineItemSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  invoiceId: zod_1.z.string().cuid(),
  description: zod_1.z.string().min(1).max(500),
  quantity: zod_1.z.number().positive(),
  unitPrice: zod_1.z.number().nonnegative(),
  totalPrice: zod_1.z.number().nonnegative(),
  deliverableId: zod_1.z.string().cuid().nullable().optional(),
});
exports.InvoiceSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  invoiceNumber: zod_1.z.string().min(1).max(50),
  creatorId: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid().nullable().optional(),
  brandName: zod_1.z.string().min(1).max(255),
  brandEmail: zod_1.z.string().email(),
  brandAddress: zod_1.z.string().max(1000).nullable().optional(),
  status: exports.InvoiceStatusSchema.default('DRAFT'),
  lineItems: zod_1.z.array(exports.InvoiceLineItemSchema).min(1),
  subtotal: zod_1.z.number().nonnegative(),
  taxRate: zod_1.z.number().min(0).max(100).nullable().optional(),
  taxAmount: zod_1.z.number().nonnegative().nullable().optional(),
  totalAmount: zod_1.z.number().nonnegative(),
  currency: zod_1.z.string().length(3).default('USD'),
  issuedAt: zod_1.z.coerce.date().nullable().optional(),
  dueDate: zod_1.z.coerce.date().nullable().optional(),
  paidAt: zod_1.z.coerce.date().nullable().optional(),
  paidAmount: zod_1.z.number().nonnegative().nullable().optional(),
  stripePaymentIntentId: zod_1.z.string().nullable().optional(),
  notes: zod_1.z.string().max(2000).nullable().optional(),
  termsAndConditions: zod_1.z.string().max(5000).nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
exports.CreateInvoiceSchema = exports.InvoiceSchema.omit({
  id: true,
  invoiceNumber: true,
  createdAt: true,
  updatedAt: true,
  lineItems: true,
}).extend({
  lineItems: zod_1.z
    .array(
      exports.InvoiceLineItemSchema.omit({ id: true, invoiceId: true, totalPrice: true }).extend({
        totalPrice: zod_1.z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});
exports.UpdateInvoiceSchema = exports.CreateInvoiceSchema.partial();
//# sourceMappingURL=invoice.schema.js.map
