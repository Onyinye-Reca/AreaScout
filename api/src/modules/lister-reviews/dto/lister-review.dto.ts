import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createSchema = z
  .object({
    inspection_id: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).default(''),
  })
  .strict();

const moderateSchema = z.object({ status: z.enum(['published', 'hidden']) }).strict();

export class CreateListerReviewDto extends createZodDto(createSchema) {}
export class ModerateListerReviewDto extends createZodDto(moderateSchema) {}
