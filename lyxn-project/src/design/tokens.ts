/** School Soft design tokens — see repo DESIGN.md */

export const px = (value: number) => `${value}px`;

export const colors = {
  primary: '#4F46E5',
  primarySubtle: '#EEF2FF',
  secondary: '#F1F5F9',
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',
  textLink: '#4F46E5',
  textOnPrimary: '#FFFFFF',
  borderDefault: '#E2E8F0',
  borderStrong: '#CBD5E1',
  borderFocus: '#6366F1',
  iconPrimary: '#334155',
  iconSecondary: '#64748B',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',
} as const;

export const spacing = {
  xs: px(4),
  sm: px(8),
  md: px(16),
  lg: px(24),
  xl: px(32),
  xxl: px(48),
} as const;

export const radius = {
  sm: px(4),
  md: px(8),
  lg: px(16),
  full: px(9999),
} as const;

export const fontFamily = 'Poppins';

export const typography = {
  displayLg: {
    fontFamily,
    fontSize: px(32),
    fontWeight: '600' as const,
    lineHeight: px(38),
  },
  headingLg: {
    fontFamily,
    fontSize: px(24),
    fontWeight: '600' as const,
    lineHeight: px(29),
  },
  headingMd: {
    fontFamily,
    fontSize: px(20),
    fontWeight: '600' as const,
    lineHeight: px(24),
  },
  headingSm: {
    fontFamily,
    fontSize: px(18),
    fontWeight: '500' as const,
    lineHeight: px(25),
  },
  bodyLg: {
    fontFamily,
    fontSize: px(16),
    fontWeight: '400' as const,
    lineHeight: px(22),
  },
  bodyMd: {
    fontFamily,
    fontSize: px(14),
    fontWeight: '400' as const,
    lineHeight: px(20),
  },
  bodySm: {
    fontFamily,
    fontSize: px(12),
    fontWeight: '400' as const,
    lineHeight: px(17),
  },
  labelMd: {
    fontFamily,
    fontSize: px(12),
    fontWeight: '500' as const,
    lineHeight: px(17),
  },
  labelSm: {
    fontFamily,
    fontSize: px(11),
    fontWeight: '500' as const,
    lineHeight: px(15),
  },
};
