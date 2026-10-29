import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const rating = z.number().int().min(1).max(5).optional();

const createAreaReviewSchema = z
  .object({
    area: z.string().trim().min(1),
    power: rating,
    flooding: rating,
    security: rating,
    water: rating,
    transport: rating,
    internet: rating,
    comment: z.string().trim().min(10, 'Tell others a little more (10+ characters)').max(2000),
  })
  .strict()
  .refine(
    (v) => [v.power, v.flooding, v.security, v.water, v.transport, v.internet].some((r) => r != null),
    { message: 'Rate at least one condition', path: ['power'] },
  );

export class CreateAreaReviewDto extends createZodDto(createAreaReviewSchema) {}
