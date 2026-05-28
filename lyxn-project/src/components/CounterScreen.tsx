import {
  canMutateCounter,
  canResetCounter,
  roleLabel,
} from '../auth/roles';
import type { UseAuthReturn } from '../auth/useAuth';
import { colors, radius, spacing, typography } from '../design/tokens';
import type { UseCounterReturn } from '../spacetimedb/useCounter';
import type { UseSpacetimeConnectionReturn } from '../spacetimedb/useSpacetimeConnection';
import { Button } from './ui/Button';
import { StatusBadge, type StatusBadgeTone } from './ui/StatusBadge';

type CounterScreenProps = {
  auth: UseAuthReturn;
  counter: UseCounterReturn;
  spacetime: UseSpacetimeConnectionReturn;
};

const COUNTER_STATUS_BADGE: Record<
  UseCounterReturn['status'],
  { label: string; tone: StatusBadgeTone }
> = {
  idle: { label: 'Waiting', tone: 'info' },
  ready: { label: 'Live', tone: 'success' },
  failed: { label: 'Error', tone: 'error' },
};

export function CounterScreen({
  auth,
  counter,
  spacetime,
}: CounterScreenProps) {
  const user = auth.user!;
  const counterBadge = COUNTER_STATUS_BADGE[counter.status];
  const allowMutate =
    canMutateCounter(user.role) &&
    counter.status === 'ready' &&
    spacetime.status === 'connected' &&
    !counter.isMutating;
  const allowReset =
    canResetCounter(user.role) &&
    counter.status === 'ready' &&
    spacetime.status === 'connected' &&
    !counter.isMutating;

  const errorMessage = counter.errorMessage ?? spacetime.errorMessage;

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
            Signed in as {user.username} ({roleLabel(user.role)}).
          </text>
        </view>
        <StatusBadge label={counterBadge.label} tone={counterBadge.tone} />
      </view>

      <view
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <StatusBadge
          label={spacetime.status === 'connected' ? 'Connected' : 'Offline'}
          tone={spacetime.status === 'connected' ? 'success' : 'error'}
        />
        <Button
          grow={false}
          label="Sign out"
          onPress={() => {
            void auth.signOut();
          }}
          variant="ghost"
        />
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
          {counter.counterValue}
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
          {canMutateCounter(user.role)
            ? 'You can update this shared counter.'
            : 'Your role can view this counter only.'}
        </text>
      </view>

      <view style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
        <view style={{ flexGrow: 1, flexShrink: 1, marginRight: spacing.sm }}>
          <Button
            disabled={!allowMutate}
            grow={true}
            label="Decrease"
            onPress={counter.decrement}
            variant="secondary"
          />
        </view>
        <view style={{ flexGrow: 1, flexShrink: 1 }}>
          <Button
            disabled={!allowMutate}
            grow={true}
            label="Increase"
            onPress={counter.increment}
            variant="primary"
          />
        </view>
      </view>

      {canResetCounter(user.role) ? (
        <Button
          disabled={!allowReset}
          grow={true}
          label="Reset counter"
          onPress={counter.reset}
          variant="secondary"
        />
      ) : null}
    </view>
  );
}
