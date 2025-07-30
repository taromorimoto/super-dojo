import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from '../../convex/_generated/api';

interface User {
  _id: string;
  email: string;
  name?: string;
}

interface Profile {
  _id: string;
  name: string;
  danKyuGrade: string;
  clubId?: string;
  sport: 'kendo' | 'iaido' | 'jodo' | 'naginata';
  userId: string;
  userEmail: string;
  createdAt: number;
  updatedAt: number;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
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
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  // Get current user data using the new getCurrentUser function
  const currentUserData = useQuery(api.auth.getCurrentUser);

  const isLoading = currentUserData === undefined;
  const isAuthenticated = !!currentUserData?.user;
  const user = currentUserData?.user || null;
  const profile = currentUserData?.profile || null;

  const signIn = async (email: string, password: string) => {
    await convexSignIn("password", { email, password, flow: "signIn" });
  };

  const signUp = async (email: string, password: string, name: string) => {
    await convexSignIn("password", { email, password, name, flow: "signUp" });
  };

  const signOut = async () => {
    await convexSignOut();
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}