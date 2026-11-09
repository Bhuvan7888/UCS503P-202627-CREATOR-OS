'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BriefSchema =
  exports.BriefParsedDataSchema =
  exports.BriefFtcFlagSchema =
  exports.BriefParsedDeadlineSchema =
  exports.BriefParsedDeliverableSchema =
    void 0;
const zod_1 = require('zod');
exports.BriefParsedDeliverableSchema = zod_1.z.object({
  type: zod_1.z.string(),
  quantity: zod_1.z.number().int().positive().default(1),
  platform: zod_1.z.string().nullable().optional(),
  description: zod_1.z.string().nullable().optional(),
});
exports.BriefParsedDeadlineSchema = zod_1.z.object({
  event: zod_1.z.string(),
  date: zod_1.z.string(),
});
exports.BriefFtcFlagSchema = zod_1.z.object({
  rule: zod_1.z.string(),
  warning: zod_1.z.string(),
});
exports.BriefParsedDataSchema = zod_1.z.object({
  deliverables: zod_1.z.array(exports.BriefParsedDeliverableSchema).default([]),
  deadlines: zod_1.z.array(exports.BriefParsedDeadlineSchema).default([]),
  dos: zod_1.z.array(zod_1.z.string()).default([]),
  donts: zod_1.z.array(zod_1.z.string()).default([]),
  ftcFlags: zod_1.z.array(exports.BriefFtcFlagSchema).default([]),
});
exports.BriefSchema = zod_1.z.object({
  id: zod_1.z.string().cuid(),
  dealId: zod_1.z.string().cuid(),
  fileUrl: zod_1.z.string().url().nullable().optional(),
  fileKey: zod_1.z.string().nullable().optional(),
  parsedData: exports.BriefParsedDataSchema.nullable().optional(),
  createdAt: zod_1.z.coerce.date(),
  updatedAt: zod_1.z.coerce.date(),
});
//# sourceMappingURL=brief.schema.js.map
