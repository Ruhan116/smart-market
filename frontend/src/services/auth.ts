import { User, Business } from '../types/models';

interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  business_name: string;
  business_type: string;
}

// Demo mode - frontend only authentication
const DEMO_MODE = true;

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
    
    // Real API call would go here
    throw new Error('Backend API not configured');
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
    
    // Real API call would go here
    throw new Error('Backend API not configured');
  },

  logout: () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_authenticated');
  },

  getProfile: async () => {
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockBusiness;
    }
    
    throw new Error('Backend API not configured');
  },

  isAuthenticated: () => {
    return localStorage.getItem('demo_authenticated') === 'true';
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('demo_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
