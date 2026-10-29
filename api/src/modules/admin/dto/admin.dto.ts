import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const moderateReviewSchema = z.object({ status: z.enum(['published', 'rejected']) }).strict();

const updateUserSchema = z.object({ verified: z.boolean().optional(), suspended: z.boolean().optional() }).strict();

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
export class ModerateReviewDto extends createZodDto(moderateReviewSchema) {}
