/**
 * tradeX design tokens — single source of truth.
 * Mirrored into CSS variables in tokens.css and Tailwind preset in tailwind.preset.ts.
 */

export const colors = {
  brand: {
    'orange-50': '#FFF4EC',
    'orange-100': '#FFE3CC',
    'orange-300': '#FFB27A',
    'orange-500': '#FF6B2C', // primary — the "X"
    'orange-600': '#EA580C',
    'orange-700': '#C2410C',
    'orange-900': '#7C2D12',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    400: '#A1A1AA',
    500: '#71717A',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
  semantic: {
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
} as const;

export const spacing = {
  0: '0',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const elevation = {
  0: 'none',
  1: '0 1px 2px rgba(0, 0, 0, 0.05)',
  2: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  3: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  4: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
} as const;

export const motion = {
  duration: {
    instant: '0ms',
    fast: '120ms',
    base: '200ms',
    slow: '320ms',
    slower: '480ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

export const typography = {
  fontFamily: {
    ui: "'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif",
    display: "'Geist', 'Inter Variable', 'Inter', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
    hindi: "'Hind', 'Noto Sans Devanagari', sans-serif",
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
} as const;

export const tokens = {
  colors,
  spacing,
  radius,
  elevation,
  motion,
  typography,
} as const;

export type Tokens = typeof tokens;
