import { z } from 'zod';
export declare const BriefParsedDeliverableSchema: z.ZodObject<
  {
    type: z.ZodString;
    quantity: z.ZodDefault<z.ZodNumber>;
    platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: string;
    quantity: number;
    description?: string | null | undefined;
    platform?: string | null | undefined;
  },
  {
    type: string;
    description?: string | null | undefined;
    platform?: string | null | undefined;
    quantity?: number | undefined;
  }
>;
export declare const BriefParsedDeadlineSchema: z.ZodObject<
  {
    event: z.ZodString;
    date: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    event: string;
    date: string;
  },
  {
    event: string;
    date: string;
  }
>;
export declare const BriefFtcFlagSchema: z.ZodObject<
  {
    rule: z.ZodString;
    warning: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    rule: string;
    warning: string;
  },
  {
    rule: string;
    warning: string;
  }
>;
export declare const BriefParsedDataSchema: z.ZodObject<
  {
    deliverables: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            type: z.ZodString;
            quantity: z.ZodDefault<z.ZodNumber>;
            platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: string;
            quantity: number;
            description?: string | null | undefined;
            platform?: string | null | undefined;
          },
          {
            type: string;
            description?: string | null | undefined;
            platform?: string | null | undefined;
            quantity?: number | undefined;
          }
        >,
        'many'
      >
    >;
    deadlines: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            event: z.ZodString;
            date: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            event: string;
            date: string;
          },
          {
            event: string;
            date: string;
          }
        >,
        'many'
      >
    >;
    dos: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    donts: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
    ftcFlags: z.ZodDefault<
      z.ZodArray<
        z.ZodObject<
          {
            rule: z.ZodString;
            warning: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            rule: string;
            warning: string;
          },
          {
            rule: string;
            warning: string;
          }
        >,
        'many'
      >
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    deliverables: {
      type: string;
      quantity: number;
      description?: string | null | undefined;
      platform?: string | null | undefined;
    }[];
    deadlines: {
      event: string;
      date: string;
    }[];
    dos: string[];
    donts: string[];
    ftcFlags: {
      rule: string;
      warning: string;
    }[];
  },
  {
    deliverables?:
      | {
          type: string;
          description?: string | null | undefined;
          platform?: string | null | undefined;
          quantity?: number | undefined;
        }[]
      | undefined;
    deadlines?:
      | {
          event: string;
          date: string;
        }[]
      | undefined;
    dos?: string[] | undefined;
    donts?: string[] | undefined;
    ftcFlags?:
      | {
          rule: string;
          warning: string;
        }[]
      | undefined;
  }
>;
export declare const BriefSchema: z.ZodObject<
  {
    id: z.ZodString;
    dealId: z.ZodString;
    fileUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fileKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    parsedData: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            deliverables: z.ZodDefault<
              z.ZodArray<
                z.ZodObject<
                  {
                    type: z.ZodString;
                    quantity: z.ZodDefault<z.ZodNumber>;
                    platform: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    type: string;
                    quantity: number;
                    description?: string | null | undefined;
                    platform?: string | null | undefined;
                  },
                  {
                    type: string;
                    description?: string | null | undefined;
                    platform?: string | null | undefined;
                    quantity?: number | undefined;
                  }
                >,
                'many'
              >
            >;
            deadlines: z.ZodDefault<
              z.ZodArray<
                z.ZodObject<
                  {
                    event: z.ZodString;
                    date: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    event: string;
                    date: string;
                  },
                  {
                    event: string;
                    date: string;
                  }
                >,
                'many'
              >
            >;
            dos: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
            donts: z.ZodDefault<z.ZodArray<z.ZodString, 'many'>>;
            ftcFlags: z.ZodDefault<
              z.ZodArray<
                z.ZodObject<
                  {
                    rule: z.ZodString;
                    warning: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    rule: string;
                    warning: string;
                  },
                  {
                    rule: string;
                    warning: string;
                  }
                >,
                'many'
              >
            >;
          },
          'strip',
          z.ZodTypeAny,
          {
            deliverables: {
              type: string;
              quantity: number;
              description?: string | null | undefined;
              platform?: string | null | undefined;
            }[];
            deadlines: {
              event: string;
              date: string;
            }[];
            dos: string[];
            donts: string[];
            ftcFlags: {
              rule: string;
              warning: string;
            }[];
          },
          {
            deliverables?:
              | {
                  type: string;
                  description?: string | null | undefined;
                  platform?: string | null | undefined;
                  quantity?: number | undefined;
                }[]
              | undefined;
            deadlines?:
              | {
                  event: string;
                  date: string;
                }[]
              | undefined;
            dos?: string[] | undefined;
            donts?: string[] | undefined;
            ftcFlags?:
              | {
                  rule: string;
                  warning: string;
                }[]
              | undefined;
          }
        >
      >
    >;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    dealId: string;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    parsedData?:
      | {
          deliverables: {
            type: string;
            quantity: number;
            description?: string | null | undefined;
            platform?: string | null | undefined;
          }[];
          deadlines: {
            event: string;
            date: string;
          }[];
          dos: string[];
          donts: string[];
          ftcFlags: {
            rule: string;
            warning: string;
          }[];
        }
      | null
      | undefined;
  },
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    dealId: string;
    fileUrl?: string | null | undefined;
    fileKey?: string | null | undefined;
    parsedData?:
      | {
          deliverables?:
            | {
                type: string;
                description?: string | null | undefined;
                platform?: string | null | undefined;
                quantity?: number | undefined;
              }[]
            | undefined;
          deadlines?:
            | {
                event: string;
                date: string;
              }[]
            | undefined;
          dos?: string[] | undefined;
          donts?: string[] | undefined;
          ftcFlags?:
            | {
                rule: string;
                warning: string;
              }[]
            | undefined;
        }
      | null
      | undefined;
  }
>;
export type BriefParsedDataInput = z.infer<typeof BriefParsedDataSchema>;
//# sourceMappingURL=brief.schema.d.ts.map
