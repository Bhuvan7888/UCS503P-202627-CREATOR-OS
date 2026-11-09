export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'DISPUTED';
export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliverableId?: string | null;
}
export interface Invoice {
  id: string;
  invoiceNumber: string;
  creatorId: string;
  dealId?: string | null;
  brandName: string;
  brandEmail: string;
  brandAddress?: string | null;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  totalAmount: number;
  currency: string;
  issuedAt?: Date | null;
  dueDate?: Date | null;
  paidAt?: Date | null;
  paidAmount?: number | null;
  stripePaymentIntentId?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=invoice.d.ts.map
