import { colors, radius, typography } from '../../design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  disabled?: boolean;
  grow?: boolean;
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
};

const VARIANT_STYLES: Record<
  ButtonVariant,
  { backgroundColor: string; borderColor: string; borderWidth: string; color: string }
> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: '0px',
    color: colors.textOnPrimary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderDefault,
    borderWidth: '1px',
    color: colors.textPrimary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: '0px',
    color: colors.textLink,
  },
};

const DISABLED_STYLE = {
  backgroundColor: colors.secondary,
  borderColor: colors.borderDefault,
  borderWidth: '1px',
  color: colors.textTertiary,
};

export function Button({
  disabled = false,
  grow = true,
  label,
  onPress,
  variant = 'primary',
}: ButtonProps) {
  const active = VARIANT_STYLES[variant];
  const visual = disabled ? DISABLED_STYLE : active;

  return (
    <view
      bindtap={disabled ? undefined : onPress}
      style={{
        flexGrow: grow ? 1 : 0,
        flexShrink: grow ? 1 : 0,
        flexBasis: grow ? '0%' : 'auto',
        height: '44px',
        minHeight: '44px',
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: visual.backgroundColor,
        borderWidth: visual.borderWidth,
        borderColor: visual.borderColor,
        marginRight: grow ? '0px' : '0px',
      }}
    >
      <text
        style={{
          fontFamily: typography.bodyMd.fontFamily,
          fontSize: typography.bodyMd.fontSize,
          lineHeight: typography.bodyMd.lineHeight,
          fontWeight: disabled ? '400' : typography.bodyMd.fontWeight,
          color: visual.color,
        }}
      >
        {label}
      </text>
    </view>
  );
}
