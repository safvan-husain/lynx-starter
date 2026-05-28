import { useAuth } from './auth/useAuth';
import { AuthFlow } from './components/AuthFlow';
import { CounterScreen } from './components/CounterScreen';
import { useCounter } from './spacetimedb/useCounter';
import { useSpacetimeConnection } from './spacetimedb/useSpacetimeConnection';

export function App() {
  const spacetime = useSpacetimeConnection();
  const auth = useAuth(spacetime);
  const counter = useCounter({
    connection: spacetime.connection,
    connectionStatus: spacetime.status,
    isSignedIn: auth.status === 'signedIn',
  });

  if (auth.status !== 'signedIn' || !auth.user) {
    return <AuthFlow auth={auth} spacetime={spacetime} />;
  }

  return (
    <CounterScreen
      auth={auth}
      counter={counter}
      spacetime={spacetime}
    />
  );
}
