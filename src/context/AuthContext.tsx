import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface User {
  _id: string;
  email: string;
  role: 'student' | 'sensei' | 'club_admin' | 'guardian';
  profileId?: string;
  createdAt: number;
  updatedAt: number;
}

interface Profile {
  _id: string;
  name: string;
  danKyuGrade: string;
  clubId: string;
  sport: 'kendo' | 'iaido' | 'jodo' | 'naginata';
  userId: string;
  createdAt: number;
  updatedAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  currentUserEmail: string | null;
  setCurrentUserEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  
  // Query current user data when email is set
  // Query current user data when email is set
  const currentUserData = useQuery(
    api.auth.getCurrentUser as any,
    currentUserEmail ? { email: currentUserEmail } : "skip"
  );

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUserData !== undefined) {
      if (currentUserData) {
        setUser(currentUserData.user);
        setProfile(currentUserData.profile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    }
  }, [currentUserData]);

  useEffect(() => {
    // Check for stored user session on app start
    // In a real app, you'd check AsyncStorage or similar
    setIsLoading(false);
  }, []);

  const signIn = async (email: string) => {
    setCurrentUserEmail(email);
    // In a real implementation, you'd handle passkey authentication here
    // For now, we'll just set the email to query the user
  };

  const signOut = () => {
    setCurrentUserEmail(null);
    setUser(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    signIn,
    signOut,
    currentUserEmail,
    setCurrentUserEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}