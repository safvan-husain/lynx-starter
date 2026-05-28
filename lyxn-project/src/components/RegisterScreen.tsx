import { useState } from '@lynx-js/react';
import { getCapabilities } from '../auth/capabilities';
import {
  getConnectionStatusPresentation,
  isConnectionReady,
} from '../auth/session';
import type { AppRole } from '../auth/types';
import type { UseAuthReturn } from '../auth/useAuth';
import { colors, radius, spacing, typography } from '../design/tokens';
import { useSpacetimeConnection } from '../spacetimedb/useSpacetimeConnection';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';

type RegisterScreenProps = {
  auth: UseAuthReturn;
  onBack: () => void;
};

const REGISTER_ROLES: AppRole[] = ['student', 'parent', 'teacher'];

export function RegisterScreen({ auth, onBack }: RegisterScreenProps) {
  const spacetime = useSpacetimeConnection();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('student');

  const { label: connectionLabel, tone: connectionTone } =
    getConnectionStatusPresentation(spacetime);

  const isRegistering = auth.status === 'registering';
  const canSubmit =
    isConnectionReady(spacetime) &&
    !isRegistering &&
    username.trim().length >= 3 &&
    password.length >= 6;

  const handleRegister = () => {
    void auth.register(username, password, role);
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
        Create account
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
        Choose a username, password, and your role at school.
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
            <Button
              grow={false}
              label="Retry DB"
              onPress={spacetime.retry}
              variant="ghost"
            />
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
          placeholder="at least 3 characters"
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
          placeholder="at least 6 characters"
          style={{
            width: '100%',
            height: '44px',
            fontSize: typography.bodyMd.fontSize,
            color: colors.textPrimary,
            marginBottom: spacing.md,
          }}
          bindinput={(event: { detail?: { value?: string } }) => {
            setPassword(event.detail?.value ?? '');
          }}
        />

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
          Role
        </text>
        <view style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {REGISTER_ROLES.map((option, index) => {
            const selected = role === option;
            return (
              <view
                key={option}
                style={{
                  width: '48%',
                  marginRight: index % 2 === 0 ? spacing.sm : '0px',
                  marginBottom: spacing.sm,
                }}
              >
                <Button
                  grow={true}
                  label={getCapabilities(option).roleLabel}
                  onPress={() => setRole(option)}
                  variant={selected ? 'primary' : 'secondary'}
                />
              </view>
            );
          })}
        </view>
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
        label={isRegistering ? 'Creating account…' : 'Create account'}
        onPress={handleRegister}
        variant="primary"
      />

      <view style={{ marginTop: spacing.md, alignItems: 'center' }}>
        <Button
          disabled={isRegistering}
          grow={false}
          label="Back to sign in"
          onPress={onBack}
          variant="ghost"
        />
      </view>
    </view>
  );
}
