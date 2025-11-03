// User & Auth
export interface User {
  id: number;
  email: string;
  first_name: string;
  business_id: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Business
export interface Business {
  id: number;
  name: string;
  type: string;
  stats: {
    products: number;
    customers: number;
    total_revenue: number;
    total_transactions: number;
  };
}

// Transaction
export interface Transaction {
  id: number;
  date: string;
  product_name: string;
  quantity: number;
  amount: number;
  customer_name?: string;
  payment_method?: string;
}

// Product (Inventory)
export interface Product {
  id: number;
  name: string;
  sku: string;
  unit_price: number;
  current_stock: number;
  reorder_point: number;
  is_low_stock: boolean;
  sales_metrics: {
    sales_7d: number;
    sales_30d: number;
    avg_daily: number;
    last_sale: string;
  };
  forecast?: Forecast;
}

// Customer with Churn Analysis
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  purchase_metrics: {
    total_spent: number;
    purchase_count: number;
    last_purchase: string;
    days_since: number;
    avg_value: number;
  };
  churn_analysis: {
    rfm_segment: 'champion' | 'loyal' | 'potential' | 'at_risk' | 'dormant';
    churn_risk_score: number;
    churn_risk_level: 'low' | 'medium' | 'high';
    risk_reason: string;
  };
}

// Forecast
export interface Forecast {
  id: number;
  product_id: number;
  product_name: string;
  forecast_date: string;
  forecast_days: number;
  predicted_demand: Array<{
    date: string;
    quantity: number;
    confidence: number;
  }>;
  summary: {
    total_demand: number;
    avg_daily: number;
    peak_date: string;
    peak_qty: number;
  };
  stockout_risk: {
    will_stockout: boolean;
    days_until_stockout: number;
    confidence: number;
    recommendation: string;
  };
  accuracy: {
    mape: number;
    data_points_used: number;
  };
}

// Cash Flow Forecast
export interface CashFlowForecast {
  forecast: {
    current_balance: number;
    projected_balance: Array<{
      date: string;
      inflows: number;
      outflows: number;
      balance: number;
    }>;
    summary: {
      avg_daily_balance: number;
      min_balance: number;
      max_balance: number;
    };
  };
  risk_analysis: {
    risk_level: 'low' | 'medium' | 'high';
    risk_score: number;
    warning: string;
    critical_date: string;
    critical_threshold: number;
  };
  recommendations: Array<{
    type: string;
    urgency: 'high' | 'medium' | 'low';
    impact: number;
    description: string;
  }>;
}

// Recommendation
export interface Recommendation {
  id: number;
  title: string;
  description: string;
  type: 'reorder' | 'cash_warning' | 'retention' | 'price_optimization';
  urgency: 'high' | 'medium' | 'low';
  priority_score: number;
  action_data: any;
  engagement: {
    is_viewed: boolean;
    viewed_at?: string;
    is_executed: boolean;
    executed_at?: string;
  };
  created_at: string;
}
