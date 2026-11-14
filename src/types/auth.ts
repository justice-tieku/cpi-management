export type ServiceRole = 'pastor' | 'shepherd';

export interface AuthSession {
  role: ServiceRole;
  branch: string;
  email: string;
  rememberMe: boolean;
  sessionId: string;
}

export interface SanctuaryBranch {
  id: string;
  name: string;
  code: string;
}

