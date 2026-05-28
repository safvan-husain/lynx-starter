import { useState } from '@lynx-js/react';
import { colors, radius, spacing, typography } from '../design/tokens';
import type { UseAuthReturn } from '../auth/useAuth';
import type { UseSpacetimeConnectionReturn } from '../spacetimedb/useSpacetimeConnection';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';

type AuthScreenProps = {
  auth: UseAuthReturn;
  onCreateAccount: () => void;
  spacetime: UseSpacetimeConnectionReturn;
};

const DEV_ACCOUNTS = [
  { label: 'Admin', username: 'admin', password: 'admin123' },
  { label: 'Teacher', username: 'teacher', password: 'teacher123' },
  { label: 'Student', username: 'student', password: 'student123' },
  { label: 'Parent', username: 'parent', password: 'parent123' },
] as const;

export function AuthScreen({ auth, onCreateAccount, spacetime }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const connectionTone =
    spacetime.status === 'connected'
      ? 'success'
      : spacetime.status === 'failed'
        ? 'error'
        : 'info';

  const connectionLabel =
    spacetime.status === 'connected'
      ? 'Database connected'
      : spacetime.status === 'failed'
        ? 'Database offline'
        : 'Connecting…';

  const isSigningIn = auth.status === 'signingIn';
  const canSubmit =
    spacetime.status === 'connected' && !isSigningIn && username.trim().length > 0;

  const handleSignIn = () => {
    void auth.signIn(username, password);
  };

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
      <text
        style={{
          fontFamily: typography.headingLg.fontFamily,
          fontSize: typography.headingLg.fontSize,
          lineHeight: typography.headingLg.lineHeight,
          fontWeight: typography.headingLg.fontWeight,
          color: colors.textPrimary,
        }}
      >
        School Soft
      </text>
      <text
        style={{
          fontFamily: typography.bodyMd.fontFamily,
          fontSize: typography.bodyMd.fontSize,
          lineHeight: typography.bodyMd.lineHeight,
          fontWeight: typography.bodyMd.fontWeight,
          color: colors.textSecondary,
          marginTop: spacing.xs,
          marginBottom: spacing.lg,
        }}
      >
        Sign in with your school username and password.
      </text>

      <view
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        }}
      >
        <StatusBadge label={connectionLabel} tone={connectionTone} />
        {spacetime.status === 'failed' ? (
          <view style={{ marginLeft: spacing.sm }}>
            <Button grow={false} label="Retry DB" onPress={spacetime.retry} variant="ghost" />
          </view>
        ) : null}
      </view>

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
          marginBottom: spacing.md,
        }}
      >
        <text
          style={{
            fontFamily: typography.labelMd.fontFamily,
            fontSize: typography.labelMd.fontSize,
            lineHeight: typography.labelMd.lineHeight,
            fontWeight: typography.labelMd.fontWeight,
            color: colors.textTertiary,
            marginBottom: spacing.xs,
          }}
        >
          Username
        </text>
        <input
          placeholder="school username"
          style={{
            width: '100%',
            height: '44px',
            fontSize: typography.bodyMd.fontSize,
            color: colors.textPrimary,
            marginBottom: spacing.md,
          }}
          bindinput={(event: { detail?: { value?: string } }) => {
            setUsername(event.detail?.value ?? '');
          }}
        />

        <text
          style={{
            fontFamily: typography.labelMd.fontFamily,
            fontSize: typography.labelMd.fontSize,
            lineHeight: typography.labelMd.lineHeight,
            fontWeight: typography.labelMd.fontWeight,
            color: colors.textTertiary,
            marginBottom: spacing.xs,
          }}
        >
          Password
        </text>
        <input
          type="password"
          placeholder="password"
          style={{
            width: '100%',
            height: '44px',
            fontSize: typography.bodyMd.fontSize,
            color: colors.textPrimary,
          }}
          bindinput={(event: { detail?: { value?: string } }) => {
            setPassword(event.detail?.value ?? '');
          }}
          bindconfirm={handleSignIn}
        />
      </view>

      {auth.errorMessage || spacetime.errorMessage ? (
        <view
          style={{
            marginBottom: spacing.md,
            paddingLeft: spacing.md,
            paddingRight: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
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
              color: colors.error,
            }}
          >
            {auth.errorMessage ?? spacetime.errorMessage}
          </text>
        </view>
      ) : null}

      <Button
        disabled={!canSubmit}
        grow={true}
        label={isSigningIn ? 'Signing in…' : 'Sign in'}
        onPress={handleSignIn}
        variant="primary"
      />

      <view style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Button
          disabled={isSigningIn}
          grow={false}
          label="Create account"
          onPress={onCreateAccount}
          variant="ghost"
        />
      </view>

      <view style={{ marginTop: spacing.lg }}>
        <text
          style={{
            fontFamily: typography.labelMd.fontFamily,
            fontSize: typography.labelMd.fontSize,
            lineHeight: typography.labelMd.lineHeight,
            fontWeight: typography.labelMd.fontWeight,
            color: colors.textTertiary,
            marginBottom: spacing.sm,
          }}
        >
          Dev quick sign-in
        </text>
        <view style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DEV_ACCOUNTS.map((account, index) => (
            <view
              key={account.username}
              style={{
                width: '48%',
                marginRight: index % 2 === 0 ? spacing.sm : '0px',
                marginBottom: spacing.sm,
              }}
            >
              <Button
                disabled={!canSubmit}
                grow={true}
                label={account.label}
                onPress={() => {
                  void auth.signIn(account.username, account.password);
                }}
                variant="secondary"
              />
            </view>
          ))}
        </view>
      </view>
    </view>
  );
}
