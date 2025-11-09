import { User, Business } from '../types/models';

interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  business_name: string;
  business_type: string;
}

// Demo mode - frontend only authentication. Controlled via VITE_DEMO_MODE
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const mockUser: User = {
  id: 1,
  email: 'demo@smartmarket.app',
  first_name: 'Demo User',
  business_id: 1,
};

const mockBusiness: Business = {
  id: 1,
  name: 'Demo Shop',
  type: 'retail',
  stats: {
    products: 24,
    customers: 156,
    total_revenue: 125000,
    total_transactions: 342,
  },
};

export const authService = {
  signup: async (data: SignupRequest) => {
    if (DEMO_MODE) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const user: User = {
        id: 1,
        email: data.email,
        first_name: data.first_name,
        business_id: 1,
      };
      
      localStorage.setItem('demo_user', JSON.stringify(user));
      localStorage.setItem('demo_authenticated', 'true');
      
      return { user, business: mockBusiness };
    }

    // Real API call
    const api = (await import('./api')).default;
    console.log('[authService.signup] Sending signup request with data:', data);
    try {
      const res = await api.post('/auth/register/', data);
      console.log('[authService.signup] Success response:', res.data);
      const payload = res.data;
      const access = payload.access_token || payload.access;
      const refresh = payload.refresh_token || payload.refresh;
      if (access) localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      return payload;
    } catch (error: any) {
      console.error('[authService.signup] Error status:', error.response?.status);
      console.error('[authService.signup] Error data:', JSON.stringify(error.response?.data, null, 2));
      console.error('[authService.signup] Error message:', error.message);
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    if (DEMO_MODE) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Accept any email/password for demo
      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_authenticated', 'true');
      
      return { user: mockUser };
    }

    const api = (await import('./api')).default;
    console.log('[authService.login] Sending login request for:', email);
    try {
      const res = await api.post('/auth/login/', { email, password });
      console.log('[authService.login] Success response:', res.data);
      const payload = res.data;
      const access = payload.access_token || payload.access;
      const refresh = payload.refresh_token || payload.refresh;
      if (access) localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      return payload;
    } catch (error: any) {
      console.error('[authService.login] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_authenticated');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getProfile: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockBusiness;
    }
    const api = (await import('./api')).default;
    console.log('[authService.getProfile] Fetching profile with token:', localStorage.getItem('access_token')?.substring(0, 20) + '...');
    try {
      const res = await api.get('/auth/business/profile/');
      console.log('[authService.getProfile] Success response:', res.data);
      return res.data;
    } catch (error: any) {
      console.error('[authService.getProfile] Error:', error.response?.status, error.response?.data || error.message);
      throw error;
    }
  },

  isAuthenticated: () => {
    return localStorage.getItem('demo_authenticated') === 'true';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('demo_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
