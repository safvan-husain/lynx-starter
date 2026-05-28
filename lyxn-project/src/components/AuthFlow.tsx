import { useState } from '@lynx-js/react';
import type { UseAuthReturn } from '../auth/useAuth';
import { AuthScreen } from './AuthScreen';
import { RegisterScreen } from './RegisterScreen';

type AuthView = 'signIn' | 'register';

type AuthFlowProps = {
  auth: UseAuthReturn;
};

export function AuthFlow({ auth }: AuthFlowProps) {
  const [view, setView] = useState<AuthView>('signIn');

  const goToRegister = () => {
    auth.clearError();
    setView('register');
  };

  const goToSignIn = () => {
    auth.clearError();
    setView('signIn');
  };

  if (view === 'register') {
    return <RegisterScreen auth={auth} onBack={goToSignIn} />;
  }

  return <AuthScreen auth={auth} onCreateAccount={goToRegister} />;
}
