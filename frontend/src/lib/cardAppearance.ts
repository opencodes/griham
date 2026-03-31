import type { Card } from './api';

const bankGradientMap: Record<string, string> = {
  hdfc: 'bg-gradient-to-br from-blue-600 to-indigo-700',
  icici: 'bg-gradient-to-br from-orange-500 to-rose-700',
  sbi: 'bg-gradient-to-br from-sky-600 to-cyan-500',
  axis: 'bg-gradient-to-br from-red-600 to-rose-700',
  kotak: 'bg-gradient-to-br from-emerald-600 to-teal-700',
  yes: 'bg-gradient-to-br from-lime-600 to-green-700',
  pnb: 'bg-gradient-to-br from-amber-500 to-orange-700',
  indusind: 'bg-gradient-to-br from-purple-600 to-fuchsia-700',
  baroda: 'bg-gradient-to-br from-red-600 to-orange-600',
  canara: 'bg-gradient-to-br from-blue-500 to-sky-700',
  idfc: 'bg-gradient-to-br from-rose-600 to-pink-700',
  federal: 'bg-gradient-to-br from-slate-600 to-zinc-700',
  rbl: 'bg-gradient-to-br from-fuchsia-600 to-purple-700',
  hsbc: 'bg-gradient-to-br from-red-600 to-pink-700',
  citi: 'bg-gradient-to-br from-sky-600 to-blue-700',
  amex: 'bg-gradient-to-br from-emerald-600 to-green-700'
};

const cardGradients = [
  'bg-gradient-to-br from-blue-600 to-cyan-700',
  'bg-gradient-to-br from-emerald-600 to-teal-700',
  'bg-gradient-to-br from-amber-500 to-orange-700',
  'bg-gradient-to-br from-rose-600 to-pink-700',
  'bg-gradient-to-br from-indigo-600 to-sky-700',
  'bg-gradient-to-br from-lime-600 to-green-700',
  'bg-gradient-to-br from-fuchsia-600 to-purple-700',
  'bg-gradient-to-br from-slate-600 to-zinc-700'
];

export const CARD_COLOR_PRESETS = [
  '#1d4ed8',
  '#0f766e',
  '#c2410c',
  '#be123c',
  '#4338ca',
  '#166534',
  '#7c3aed',
  '#334155'
];

const normalizeBankName = (value: string) =>
  value
    .toLowerCase()
    .replace(/bank/g, '')
    .replace(/[^a-z0-9]/g, '');

export function getCardGradient(bankName: string | undefined, cardType: Card['card_type']) {
  const name = bankName?.trim();
  if (!name) {
    return cardType === 'credit'
      ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
      : 'bg-gradient-to-br from-blue-600 to-cyan-700';
  }

  const normalized = normalizeBankName(name);
  for (const [key, gradient] of Object.entries(bankGradientMap)) {
    if (normalized.includes(key)) return gradient;
  }

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % cardGradients.length;
  }
  return cardGradients[hash];
}

export function getCardSurfaceProps(card: Pick<Card, 'bank_name' | 'card_type' | 'background_color'>) {
  const backgroundColor = card.background_color?.trim();
  if (backgroundColor) {
    return {
      className: '',
      style: { backgroundColor }
    };
  }

  return {
    className: getCardGradient(card.bank_name, card.card_type),
    style: undefined
  };
}
