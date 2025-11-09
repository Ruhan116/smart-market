import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    business_name: '',
    business_type: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const businessTypes = [
    { value: 'retail', label: 'Retail Shop' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'grocery', label: 'Grocery Store' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'clothing', label: 'Clothing Store' },
    { value: 'electronics', label: 'Electronics Shop' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.first_name || !formData.business_name || !formData.business_type) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(formData.email, formData.password, formData.first_name, formData.business_name, formData.business_type);
      toast.success('🎉 Account created! Welcome to SmartMarket!');
      navigate('/home');
    } catch (error: any) {
      // Extract validation errors from backend
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        // Show first validation error
        const firstError = Object.entries(errorData)[0];
        if (firstError) {
          const [field, messages] = firstError as [string, string[]];
          const message = Array.isArray(messages) ? messages[0] : messages;
          toast.error(`${field}: ${message}`);
          return;
        }
      }
      toast.error(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={logo} alt="SmartMarket logo" className="h-10 w-10" />
            <h1 className="text-4xl font-bold text-primary">SmartMarket</h1>
          </div>
          <p className="text-muted-foreground">Start your AI-powered business journey</p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="first_name">Your Name *</Label>
              <Input
                id="first_name"
                type="text"
                placeholder="Enter your name"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min 8 characters
              </p>
            </div>

            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                type="text"
                placeholder="Your shop/business name"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="business_type">Business Type *</Label>
              <Select 
                value={formData.business_type}
                onValueChange={(value) => setFormData({...formData, business_type: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              size="lg"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary font-medium hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
