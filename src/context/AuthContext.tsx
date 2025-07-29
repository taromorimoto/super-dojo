import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  signUp: (email: string, role: 'student' | 'sensei' | 'club_admin' | 'guardian') => Promise<void>;
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
  const currentUserData = useQuery(
    api.auth.getCurrentUser as any,
    currentUserEmail ? { email: currentUserEmail } : "skip"
  );

  // Mutation for creating new users
  const createUserMutation = useMutation(api.auth.createUser);

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
    const loadStoredAuth = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) {
          setCurrentUserEmail(storedEmail);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const signIn = async (email: string) => {
    setCurrentUserEmail(email);
    // Store the email for persistence
    try {
      await AsyncStorage.setItem('userEmail', email);
    } catch (error) {
      console.error('Error storing user email:', error);
    }
  };

  const signUp = async (email: string, role: 'student' | 'sensei' | 'club_admin' | 'guardian') => {
    try {
      await createUserMutation({ email, role });
      // After creating the user, sign them in
      setCurrentUserEmail(email);
      // Store the email for persistence
      await AsyncStorage.setItem('userEmail', email);
    } catch (error) {
      throw error; // Re-throw to let the calling component handle it
    }
  };

  const signOut = () => {
    setCurrentUserEmail(null);
    setUser(null);
    setProfile(null);
    // Remove stored email
    AsyncStorage.removeItem('userEmail').catch(error => {
      console.error('Error removing stored user email:', error);
    });
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    signIn,
    signUp,
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