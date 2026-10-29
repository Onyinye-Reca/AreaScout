import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateProfileSchema = z
  .object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/, 'Enter a valid phone number') })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const changePasswordSchema = z
  .object({ current_password: z.string().min(1), new_password: z.string().min(10, 'Password must be at least 10 characters') })
  .strict();

const preferencesSchema = z
  .object({ inspection_updates: z.boolean(), messages: z.boolean(), saved_search_alerts: z.boolean(), area_report_updates: z.boolean() })
  .partial()
  .strict();

const deleteAccountSchema = z.object({ password: z.string().min(1) }).strict();

const filtersSchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    type: z.string().trim().min(1).max(60),
    beds: z.number().int().min(0).max(20),
    min_rent: z.number().int().min(0),
    max_rent: z.number().int().min(0),
    verified: z.enum(['1', 'true']),
    area: z.string().trim().min(1).max(60),
    city: z.string().trim().min(1).max(60),
  })
  .partial()
  .strict()
  .refine((f) => Object.keys(f).length > 0, { message: 'Choose at least one filter to save' });

const createSavedSearchSchema = z.object({ name: z.string().trim().min(1).max(80), filters: filtersSchema, alerts: z.boolean().default(true) }).strict();
const updateSavedSearchSchema = z.object({ name: z.string().trim().min(1).max(80), alerts: z.boolean() }).partial().strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
export class PreferencesDto extends createZodDto(preferencesSchema) {}
export class DeleteAccountDto extends createZodDto(deleteAccountSchema) {}
export class CreateSavedSearchDto extends createZodDto(createSavedSearchSchema) {}
export class UpdateSavedSearchDto extends createZodDto(updateSavedSearchSchema) {}
