import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createInspectionSchema = z
  .object({
    listing_id: z.number().int().positive(),
    requested_at: z.iso.datetime({ message: 'Use an RFC 3339 date and time' }),
    note: z.string().trim().max(1000).default(''),
  })
  .strict();

const updateInspectionSchema = z
  .object({
    status: z.enum(['confirmed', 'declined', 'new_time', 'cancelled']),
    requested_at: z.iso.datetime().optional(),
    owner_note: z.string().trim().max(1000).optional(),
  })
  .strict();

export class CreateInspectionDto extends createZodDto(createInspectionSchema) {}
export class UpdateInspectionDto extends createZodDto(updateInspectionSchema) {}
