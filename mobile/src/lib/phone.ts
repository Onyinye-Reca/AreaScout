import { Linking } from 'react-native';

/** Digits only, with a Nigerian leading 0 turned into the 234 country code (what WhatsApp links need). */
export function whatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
}

export const callNumber = (raw: string) => Linking.openURL(`tel:${raw.replace(/[^\d+]/g, '')}`);
export const openWhatsApp = (raw: string, text: string) =>
  Linking.openURL(`https://wa.me/${whatsappNumber(raw)}?text=${encodeURIComponent(text)}`);
