import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { User } from '../types/models';
import { authService } from '../services/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, businessName: string, businessType: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from authService (demo mode or persisted)
    if (authService.isAuthenticated()) {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: authUser } = await authService.login(email, password);
    setUser(authUser);
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    businessName: string,
    businessType: string
  ) => {
    const { user: authUser } = await authService.signup({
      email,
      password,
      first_name: firstName,
      business_name: businessName,
      business_type: businessType,
    });
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export default useAuth;
