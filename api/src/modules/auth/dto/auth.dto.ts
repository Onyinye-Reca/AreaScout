import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const registerSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().default(''),
    role: z.enum(['tenant', 'landlord', 'agent']).default('tenant'),
    password: z.string().min(10, 'Password must be at least 10 characters'),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase(),
    password: z.string().min(1),
  })
  .strict();

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() }).strict();
const resetSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    code: z.string().trim().regex(/^\d{8}$/, 'Enter the 8-digit code from the email'),
    new_password: z.string().min(10, 'Password must be at least 10 characters'),
  })
  .strict();

export class ForgotPasswordDto extends createZodDto(forgotSchema) {}
export class ResetPasswordDto extends createZodDto(resetSchema) {}
export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
