import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const body = z.string().trim().min(1, 'Write a message').max(2000);

const startConversationSchema = z
  .object({ listing_id: z.number().int().positive(), message: body })
  .strict();
const sendMessageSchema = z.object({ message: body }).strict();

export class StartConversationDto extends createZodDto(startConversationSchema) {}
export class SendMessageDto extends createZodDto(sendMessageSchema) {}
