import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const reportListingSchema = z
  .object({
    reason: z.enum(['inaccurate', 'scam', 'unavailable', 'duplicate', 'other']),
    details: z.string().trim().max(2000).default(''),
  })
  .strict();

const updateReportSchema = z
  .object({
    status: z.enum(['reviewing', 'resolved', 'dismissed']),
    resolution: z.string().trim().max(2000).default(''),
  })
  .strict();

const resolveListingSchema = z
  .object({
    action: z.enum(['remove_and_suspend', 'remove', 'request_info', 'dismiss']),
    note: z.string().trim().max(2000).default(''),
  })
  .strict();

export class ResolveListingDto extends createZodDto(resolveListingSchema) {}
export class ReportListingDto extends createZodDto(reportListingSchema) {}
export class UpdateReportDto extends createZodDto(updateReportSchema) {}
