import { Redirect } from 'expo-router';
import { useAuthContext } from '../src/context/AuthContext';
import LoadingScreen from '../src/components/LoadingScreen';

export default function AppIndex() {
  const { user, profile, isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (user && profile) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}