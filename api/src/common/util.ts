import { BadRequestException } from '@nestjs/common';

export const nowIso = (): string => new Date().toISOString();

export function parseId(value: string, label = 'ID'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestException(`Invalid ${label}`);
  return id;
}
