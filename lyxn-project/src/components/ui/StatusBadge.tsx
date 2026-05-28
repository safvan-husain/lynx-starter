import { colors, radius, spacing, typography } from '../../design/tokens';

export type StatusBadgeTone = 'success' | 'warning' | 'error' | 'info';

type StatusBadgeProps = {
  label: string;
  tone: StatusBadgeTone;
};

const TONE_STYLES: Record<
  StatusBadgeTone,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  success: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(22, 163, 74, 0.28)',
    color: colors.success,
  },
  warning: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderColor: 'rgba(217, 119, 6, 0.28)',
    color: colors.warning,
  },
  error: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: 'rgba(220, 38, 38, 0.28)',
    color: colors.error,
  },
  info: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: 'rgba(2, 132, 199, 0.28)',
    color: colors.info,
  },
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <view
      style={{
        paddingLeft: spacing.sm,
        paddingRight: spacing.sm,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: toneStyle.backgroundColor,
        borderWidth: '1px',
        borderColor: toneStyle.borderColor,
      }}
    >
      <text
        style={{
          fontFamily: typography.labelSm.fontFamily,
          fontSize: typography.labelSm.fontSize,
          lineHeight: typography.labelSm.lineHeight,
          fontWeight: typography.labelSm.fontWeight,
          color: toneStyle.color,
        }}
      >
        {label}
      </text>
    </view>
  );
}
