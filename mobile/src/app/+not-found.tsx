import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

/**
 * Catches any address that has no screen for the current user. Screens are guarded by sign-in
 * state, so "/" doesn't exist when signed out and "/welcome" doesn't exist when signed in;
 * both cases land here and are sent to the right starting screen.
 */
export default function NotFound() {
  const { user } = useAuth();
  return <Redirect href={user ? '/' : '/welcome'} />;
}
