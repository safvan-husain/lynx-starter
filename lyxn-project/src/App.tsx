import { isSignedIn } from './auth/session';
import { useAuth } from './auth/useAuth';
import { AuthFlow } from './components/AuthFlow';
import { CounterScreen } from './components/CounterScreen';
import { useCounter } from './spacetimedb/useCounter';

export function App() {
  const auth = useAuth();
  const counter = useCounter({
    isSignedIn: isSignedIn(auth),
  });

  if (!isSignedIn(auth)) {
    return <AuthFlow auth={auth} />;
  }

  return <CounterScreen auth={auth} counter={counter} />;
}
