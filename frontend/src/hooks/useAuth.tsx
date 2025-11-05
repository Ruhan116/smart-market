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
    const init = async () => {
      try {
        if (import.meta.env.VITE_DEMO_MODE === 'true') {
          if (authService.isAuthenticated()) {
            const currentUser = authService.getCurrentUser();
            setUser(currentUser);
          }
        } else {
          // try to fetch profile from backend using stored tokens
          try {
            const profile = await authService.getProfile();
            // profile is business data; user info is stored in tokens response on login
            setUser((prev) => ({ ...(prev || {}), business: profile } as any));
          } catch (e) {
            // no valid tokens or refresh failed
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[useAuth.login] Starting login for:', email);
    try {
      const res = await authService.login(email, password);
      console.log('[useAuth.login] Login response received:', res);
      // res may contain user info and tokens. After login, fetch profile to get business.
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        const { user: authUser } = res;
        setUser(authUser);
      } else {
        try {
          const profile = await authService.getProfile();
          console.log('[useAuth.login] Profile fetched:', profile);
          setUser((prev) => ({ ...(prev || {}), business: profile } as any));
        } catch (e) {
          console.error('[useAuth.login] Failed to fetch profile after login', e);
          throw e;
        }
      }
    } catch (error) {
      console.error('[useAuth.login] Login failed:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    businessName: string,
    businessType: string
  ) => {
    console.log('[useAuth.signup] Starting signup for:', email);
    try {
      const res = await authService.signup({
        email,
        password,
        first_name: firstName,
        business_name: businessName,
        business_type: businessType,
      });
      console.log('[useAuth.signup] Signup response received:', res);
      if (import.meta.env.VITE_DEMO_MODE === 'true') {
        const { user: authUser } = res;
        setUser(authUser);
      } else {
        try {
          const profile = await authService.getProfile();
          console.log('[useAuth.signup] Profile fetched:', profile);
          setUser((prev) => ({ ...(prev || {}), business: profile } as any));
        } catch (e) {
          console.error('[useAuth.signup] Failed to fetch profile after signup', e);
          throw e;
        }
      }
    } catch (error) {
      console.error('[useAuth.signup] Signup failed:', error);
      throw error;
    }
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
