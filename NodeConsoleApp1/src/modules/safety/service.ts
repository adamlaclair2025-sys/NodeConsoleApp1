import { config } from '@/config';

export interface QuickExitPayload {
  title: string;
  description: string;
  destination: string;
  supports: string[];
  note: string;
}

export function buildQuickExitPayload(destination = config.safety?.quickExitUrl || 'https://www.google.com'): QuickExitPayload {
  return {
    title: 'Quick Exit',
    description: 'Leave the current experience quickly and open a neutral destination.',
    destination,
    supports: ['instant redirect', 'pause media', 'hide sensitive content', 'keyboard accessible'],
    note: 'This action does not erase browser history, device history, or downloaded files.',
  };
}
