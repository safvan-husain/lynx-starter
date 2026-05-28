export type AppRole = 'student' | 'parent' | 'teacher' | 'admin';

export type AuthUser = {
  username: string;
  role: AppRole;
};

export type AuthStatus = 'signedOut' | 'signingIn' | 'registering' | 'signedIn';
