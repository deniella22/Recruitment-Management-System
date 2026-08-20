import React from 'react';
import { AuthScreen } from './AuthScreen';
import { User as UserType, SystemSettings } from '../types';

interface Props {
  onSuccess: (user: UserType, token: string, isNewAccount?: boolean) => void;
  onResetAccounts?: () => void;
  systemSettings?: SystemSettings;
}

export const LoginForm: React.FC<Props> = (props) => {
  return <AuthScreen {...props} />;
};
export { AuthScreen };
