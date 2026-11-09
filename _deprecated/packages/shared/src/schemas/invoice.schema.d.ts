import { z } from 'zod';
export declare const InvoiceStatusSchema: z.ZodEnum<
  ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED']
>;
export declare const InvoiceLineItemSchema: z.ZodObject<
  {
    id: z.ZodString;
    invoiceId: z.ZodString;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    totalPrice: z.ZodNumber;
    deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    description: string;
    quantity: number;
    invoiceId: string;
    unitPrice: number;
    totalPrice: number;
    deliverableId?: string | null | undefined;
  },
  {
    id: string;
    description: string;
    quantity: number;
    invoiceId: string;
    unitPrice: number;
    totalPrice: number;
    deliverableId?: string | null | undefined;
  }
>;
export declare const InvoiceSchema: z.ZodObject<
  {
    id: z.ZodString;
    invoiceNumber: z.ZodString;
    creatorId: z.ZodString;
    dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    brandName: z.ZodString;
    brandEmail: z.ZodString;
    brandAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodDefault<
      z.ZodEnum<
        ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED']
      >
    >;
    lineItems: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          invoiceId: z.ZodString;
          description: z.ZodString;
          quantity: z.ZodNumber;
          unitPrice: z.ZodNumber;
          totalPrice: z.ZodNumber;
          deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          id: string;
          description: string;
          quantity: number;
          invoiceId: string;
          unitPrice: number;
          totalPrice: number;
          deliverableId?: string | null | undefined;
        },
        {
          id: string;
          description: string;
          quantity: number;
          invoiceId: string;
          unitPrice: number;
          totalPrice: number;
          deliverableId?: string | null | undefined;
        }
      >,
      'many'
    >;
    subtotal: z.ZodNumber;
    taxRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    taxAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalAmount: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    issuedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    paidAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    paidAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    stripePaymentIntentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    termsAndConditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    currency: string;
    brandName: string;
    brandEmail: string;
    creatorId: string;
    status:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE';
    invoiceNumber: string;
    lineItems: {
      id: string;
      description: string;
      quantity: number;
      invoiceId: string;
      unitPrice: number;
      totalPrice: number;
      deliverableId?: string | null | undefined;
    }[];
    subtotal: number;
    totalAmount: number;
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  },
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    brandName: string;
    brandEmail: string;
    creatorId: string;
    invoiceNumber: string;
    lineItems: {
      id: string;
      description: string;
      quantity: number;
      invoiceId: string;
      unitPrice: number;
      totalPrice: number;
      deliverableId?: string | null | undefined;
    }[];
    subtotal: number;
    totalAmount: number;
    currency?: string | undefined;
    dealId?: string | null | undefined;
    status?:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE'
      | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  }
>;
export declare const CreateInvoiceSchema: z.ZodObject<
  Omit<
    {
      id: z.ZodString;
      invoiceNumber: z.ZodString;
      creatorId: z.ZodString;
      dealId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      brandName: z.ZodString;
      brandEmail: z.ZodString;
      brandAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      status: z.ZodDefault<
        z.ZodEnum<
          ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED']
        >
      >;
      lineItems: z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            invoiceId: z.ZodString;
            description: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodNumber;
            totalPrice: z.ZodNumber;
            deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            id: string;
            description: string;
            quantity: number;
            invoiceId: string;
            unitPrice: number;
            totalPrice: number;
            deliverableId?: string | null | undefined;
          },
          {
            id: string;
            description: string;
            quantity: number;
            invoiceId: string;
            unitPrice: number;
            totalPrice: number;
            deliverableId?: string | null | undefined;
          }
        >,
        'many'
      >;
      subtotal: z.ZodNumber;
      taxRate: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      taxAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      totalAmount: z.ZodNumber;
      currency: z.ZodDefault<z.ZodString>;
      issuedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      dueDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      paidAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
      paidAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      stripePaymentIntentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      termsAndConditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      createdAt: z.ZodDate;
      updatedAt: z.ZodDate;
    },
    'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'lineItems'
  > & {
    lineItems: z.ZodArray<
      z.ZodObject<
        Omit<
          {
            id: z.ZodString;
            invoiceId: z.ZodString;
            description: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodNumber;
            totalPrice: z.ZodNumber;
            deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          'id' | 'invoiceId' | 'totalPrice'
        > & {
          totalPrice: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          description: string;
          quantity: number;
          unitPrice: number;
          totalPrice?: number | undefined;
          deliverableId?: string | null | undefined;
        },
        {
          description: string;
          quantity: number;
          unitPrice: number;
          totalPrice?: number | undefined;
          deliverableId?: string | null | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    currency: string;
    brandName: string;
    brandEmail: string;
    creatorId: string;
    status:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE';
    lineItems: {
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice?: number | undefined;
      deliverableId?: string | null | undefined;
    }[];
    subtotal: number;
    totalAmount: number;
    dealId?: string | null | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  },
  {
    brandName: string;
    brandEmail: string;
    creatorId: string;
    lineItems: {
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice?: number | undefined;
      deliverableId?: string | null | undefined;
    }[];
    subtotal: number;
    totalAmount: number;
    currency?: string | undefined;
    dealId?: string | null | undefined;
    status?:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE'
      | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  }
>;
export declare const UpdateInvoiceSchema: z.ZodObject<
  {
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    brandName: z.ZodOptional<z.ZodString>;
    brandEmail: z.ZodOptional<z.ZodString>;
    dealId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    creatorId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<
      z.ZodDefault<
        z.ZodEnum<
          ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED']
        >
      >
    >;
    notes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    brandAddress: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    subtotal: z.ZodOptional<z.ZodNumber>;
    taxRate: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    taxAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    totalAmount: z.ZodOptional<z.ZodNumber>;
    issuedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    paidAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    paidAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    stripePaymentIntentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    termsAndConditions: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    lineItems: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          Omit<
            {
              id: z.ZodString;
              invoiceId: z.ZodString;
              description: z.ZodString;
              quantity: z.ZodNumber;
              unitPrice: z.ZodNumber;
              totalPrice: z.ZodNumber;
              deliverableId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            },
            'id' | 'invoiceId' | 'totalPrice'
          > & {
            totalPrice: z.ZodOptional<z.ZodNumber>;
          },
          'strip',
          z.ZodTypeAny,
          {
            description: string;
            quantity: number;
            unitPrice: number;
            totalPrice?: number | undefined;
            deliverableId?: string | null | undefined;
          },
          {
            description: string;
            quantity: number;
            unitPrice: number;
            totalPrice?: number | undefined;
            deliverableId?: string | null | undefined;
          }
        >,
        'many'
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    currency?: string | undefined;
    brandName?: string | undefined;
    brandEmail?: string | undefined;
    dealId?: string | null | undefined;
    creatorId?: string | undefined;
    status?:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE'
      | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    lineItems?:
      | {
          description: string;
          quantity: number;
          unitPrice: number;
          totalPrice?: number | undefined;
          deliverableId?: string | null | undefined;
        }[]
      | undefined;
    subtotal?: number | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    totalAmount?: number | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  },
  {
    currency?: string | undefined;
    brandName?: string | undefined;
    brandEmail?: string | undefined;
    dealId?: string | null | undefined;
    creatorId?: string | undefined;
    status?:
      | 'DRAFT'
      | 'CANCELLED'
      | 'DISPUTED'
      | 'SENT'
      | 'VIEWED'
      | 'PARTIALLY_PAID'
      | 'PAID'
      | 'OVERDUE'
      | undefined;
    notes?: string | null | undefined;
    dueDate?: Date | null | undefined;
    brandAddress?: string | null | undefined;
    lineItems?:
      | {
          description: string;
          quantity: number;
          unitPrice: number;
          totalPrice?: number | undefined;
          deliverableId?: string | null | undefined;
        }[]
      | undefined;
    subtotal?: number | undefined;
    taxRate?: number | null | undefined;
    taxAmount?: number | null | undefined;
    totalAmount?: number | undefined;
    issuedAt?: Date | null | undefined;
    paidAt?: Date | null | undefined;
    paidAmount?: number | null | undefined;
    stripePaymentIntentId?: string | null | undefined;
    termsAndConditions?: string | null | undefined;
  }
>;
//# sourceMappingURL=invoice.schema.d.ts.map
