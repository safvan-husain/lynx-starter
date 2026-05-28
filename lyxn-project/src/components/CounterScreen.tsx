import { useCounter, type CounterConnectionStatus } from '../spacetimedb';

const STATUS_STYLES: Record<
  CounterConnectionStatus,
  { backgroundColor: string; borderColor: string; textColor: string; label: string }
> = {
  connecting: {
    backgroundColor: '#fff0d6',
    borderColor: '#f3b561',
    textColor: '#8a4b00',
    label: 'Connecting',
  },
  connected: {
    backgroundColor: '#dff5ea',
    borderColor: '#5ab98b',
    textColor: '#165a3d',
    label: 'Connected',
  },
  failed: {
    backgroundColor: '#fbe1de',
    borderColor: '#de7d73',
    textColor: '#7a2218',
    label: 'Failed',
  },
};

type FloatingActionButtonProps = {
  align: 'left' | 'right';
  disabled?: boolean;
  label: string;
  onPress: () => void;
  backgroundColor: string;
};

function FloatingActionButton({
  align,
  disabled = false,
  label,
  onPress,
  backgroundColor,
}: FloatingActionButtonProps) {
  return (
    <view
      bindtap={disabled ? undefined : onPress}
      style={{
        position: 'absolute',
        bottom: '32px',
        [align]: '24px',
        width: '74px',
        height: '74px',
        borderRadius: '37px',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        opacity: disabled ? 0.45 : 1,
        borderWidth: '1px',
        borderColor: 'rgba(15, 23, 42, 0.12)',
      }}
    >
      <text
        style={{
          fontSize: '34px',
          lineHeight: '34px',
          fontWeight: '700',
          color: '#fffdf7',
        }}
      >
        {label}
      </text>
    </view>
  );
}

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

  const statusStyle = STATUS_STYLES[status];
  const canMutate = status === 'connected' && !isMutating;

  return (
    <view
      style={{
        flex: 1,
        backgroundColor: '#f6efe4',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <view
        style={{
          position: 'absolute',
          top: '-90px',
          right: '-70px',
          width: '240px',
          height: '240px',
          borderRadius: '120px',
          backgroundColor: 'rgba(78, 161, 129, 0.16)',
        }}
      />
      <view
        style={{
          position: 'absolute',
          bottom: '120px',
          left: '-85px',
          width: '220px',
          height: '220px',
          borderRadius: '110px',
          backgroundColor: 'rgba(210, 111, 78, 0.14)',
        }}
      />

      <view
        style={{
          paddingTop: '32px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '12px',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <view style={{ maxWidth: '70%' }}>
          <text
            style={{
              fontSize: '28px',
              lineHeight: '32px',
              fontWeight: '800',
              color: '#1f2937',
            }}
          >
            Shared Counter
          </text>
          <text
            style={{
              marginTop: '6px',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6b7280',
            }}
          >
            Persists in SpacetimeDB and syncs across connected clients.
          </text>
        </view>

        <view
          style={{
            paddingLeft: '12px',
            paddingRight: '12px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderRadius: '999px',
            backgroundColor: statusStyle.backgroundColor,
            borderWidth: '1px',
            borderColor: statusStyle.borderColor,
          }}
        >
          <text
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: statusStyle.textColor,
            }}
          >
            {statusStyle.label}
          </text>
        </view>
      </view>

      {errorMessage ? (
        <view
          style={{
            marginLeft: '24px',
            marginRight: '24px',
            marginTop: '4px',
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingTop: '12px',
            paddingBottom: '12px',
            borderRadius: '18px',
            backgroundColor: '#fff7f5',
            borderWidth: '1px',
            borderColor: '#ebbbb4',
          }}
        >
          <text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#8b3528',
            }}
          >
            {errorMessage}
          </text>
        </view>
      ) : null}

      {status === 'failed' ? (
        <view
          bindtap={retry}
          style={{
            alignSelf: 'flex-start',
            marginLeft: '24px',
            marginRight: '24px',
            marginTop: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '10px',
            paddingBottom: '10px',
            borderRadius: '999px',
            backgroundColor: '#22313f',
          }}
        >
          <text
            style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#f8fafc',
            }}
          >
            Retry Connection
          </text>
        </view>
      ) : null}

      <view
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '96px',
        }}
      >
        <view
          style={{
            minWidth: '240px',
            paddingLeft: '28px',
            paddingRight: '28px',
            paddingTop: '32px',
            paddingBottom: '32px',
            borderRadius: '28px',
            backgroundColor: 'rgba(255, 252, 247, 0.82)',
            borderWidth: '1px',
            borderColor: 'rgba(31, 41, 55, 0.08)',
            alignItems: 'center',
          }}
        >
          <text
            style={{
              fontSize: '13px',
              letterSpacing: '1px',
              color: '#8c6a4f',
              textTransform: 'uppercase',
            }}
          >
            Persisted Value
          </text>
          <text
            style={{
              marginTop: '12px',
              fontSize: '96px',
              lineHeight: '104px',
              fontWeight: '800',
              color: '#1f2937',
            }}
          >
            {counterValue}
          </text>
          <text
            style={{
              marginTop: '10px',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            {status === 'connected'
              ? 'Ready for live updates.'
              : 'Waiting for the database connection.'}
          </text>
        </view>
      </view>

      <FloatingActionButton
        align="left"
        backgroundColor="#d26f4e"
        disabled={!canMutate}
        label="−"
        onPress={decrement}
      />
      <FloatingActionButton
        align="right"
        backgroundColor="#41856d"
        disabled={!canMutate}
        label="+"
        onPress={increment}
      />
    </view>
  );
}
