import { useCounter, type CounterConnectionStatus } from '../spacetimedb';
import { colors, radius, spacing, typography } from '../design/tokens';
import { Button } from './ui/Button';
import { StatusBadge, type StatusBadgeTone } from './ui/StatusBadge';

const CONNECTION_BADGE: Record<
  CounterConnectionStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  connecting: { label: 'Connecting', tone: 'info' },
  connected: { label: 'Connected', tone: 'success' },
  failed: { label: 'Offline', tone: 'error' },
};

export function CounterScreen() {
  const {
    counterValue,
    errorMessage,
    isMutating,
    retry,
    decrement,
    increment,
    status,
  } = useCounter();

  const connectionBadge = CONNECTION_BADGE[status];
  const canMutate = status === 'connected' && !isMutating;

  return (
    <view
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: spacing.xxl,
        paddingLeft: spacing.md,
        paddingRight: spacing.md,
        paddingBottom: spacing.xl,
      }}
    >
      <view
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.lg,
        }}
      >
        <view style={{ flexGrow: 1, flexShrink: 1, marginRight: spacing.md }}>
          <text
            style={{
              fontFamily: typography.headingLg.fontFamily,
              fontSize: typography.headingLg.fontSize,
              lineHeight: typography.headingLg.lineHeight,
              fontWeight: typography.headingLg.fontWeight,
              color: colors.textPrimary,
            }}
          >
            Shared Counter
          </text>
          <text
            style={{
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              fontWeight: typography.bodyMd.fontWeight,
              color: colors.textSecondary,
              marginTop: spacing.xs,
            }}
          >
            Live value stored in SpacetimeDB and synced across clients.
          </text>
        </view>
        <StatusBadge label={connectionBadge.label} tone={connectionBadge.tone} />
      </view>

      {errorMessage ? (
        <view
          style={{
            marginBottom: spacing.md,
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: '1px',
            borderColor: colors.error,
          }}
        >
          <text
            style={{
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              lineHeight: typography.bodyMd.lineHeight,
              fontWeight: typography.bodyMd.fontWeight,
              color: colors.error,
            }}
          >
            {errorMessage}
          </text>
        </view>
      ) : null}

      {status === 'failed' ? (
        <view style={{ marginBottom: spacing.md }}>
          <Button
            grow={false}
            label="Retry connection"
            onPress={retry}
            variant="ghost"
          />
        </view>
      ) : null}

      <view
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: '1px',
          borderColor: colors.borderDefault,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <text
          style={{
            fontFamily: typography.labelMd.fontFamily,
            fontSize: typography.labelMd.fontSize,
            lineHeight: typography.labelMd.lineHeight,
            fontWeight: typography.labelMd.fontWeight,
            color: colors.textTertiary,
          }}
        >
          Persisted value
        </text>
        <text
          style={{
            fontFamily: typography.displayLg.fontFamily,
            fontSize: typography.displayLg.fontSize,
            lineHeight: typography.displayLg.lineHeight,
            fontWeight: typography.displayLg.fontWeight,
            color: colors.textPrimary,
            marginTop: spacing.sm,
          }}
        >
          {counterValue}
        </text>
        <text
          style={{
            fontFamily: typography.bodySm.fontFamily,
            fontSize: typography.bodySm.fontSize,
            lineHeight: typography.bodySm.lineHeight,
            fontWeight: typography.bodySm.fontWeight,
            color: colors.textSecondary,
            marginTop: spacing.sm,
          }}
        >
          {status === 'connected'
            ? 'Updates sync automatically while you stay connected.'
            : 'Connect to SpacetimeDB to load and update this count.'}
        </text>
      </view>

      <view
        style={{
          backgroundColor: colors.primarySubtle,
          borderRadius: radius.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <text
          style={{
            fontFamily: typography.labelMd.fontFamily,
            fontSize: typography.labelMd.fontSize,
            lineHeight: typography.labelMd.lineHeight,
            fontWeight: typography.labelMd.fontWeight,
            color: colors.primary,
          }}
        >
          School Soft · Design preview
        </text>
        <text
          style={{
            fontFamily: typography.bodySm.fontFamily,
            fontSize: typography.bodySm.fontSize,
            lineHeight: typography.bodySm.lineHeight,
            fontWeight: typography.bodySm.fontWeight,
            color: colors.textSecondary,
            marginTop: spacing.xs,
          }}
        >
          Indigo + slate tokens, flat cards, and 44px touch targets from
          DESIGN.md.
        </text>
      </view>

      <view style={{ flexDirection: 'row' }}>
        <view style={{ flexGrow: 1, flexShrink: 1, marginRight: spacing.sm }}>
          <Button
            disabled={!canMutate}
            grow={true}
            label="Decrease"
            onPress={decrement}
            variant="secondary"
          />
        </view>
        <view style={{ flexGrow: 1, flexShrink: 1 }}>
          <Button
            disabled={!canMutate}
            grow={true}
            label="Increase"
            onPress={increment}
            variant="primary"
          />
        </view>
      </view>
    </view>
  );
}
