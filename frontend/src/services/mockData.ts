import { Recommendation, Forecast, Product, Customer, Transaction } from '../types/models';

// Mock recommendations
export const mockRecommendations: Recommendation[] = [
  {
    id: 1,
    title: 'Reorder Rice (25kg bags)',
    description: 'Stock will run out in 3 days based on current sales trend. Recommended reorder: 50 bags.',
    type: 'reorder',
    urgency: 'high',
    priority_score: 95,
    action_data: { product_id: 1, quantity: 50 },
    engagement: { is_viewed: false, is_executed: false },
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Contact At-Risk Customers',
    description: '5 customers haven\'t purchased in 60+ days. Send promotional message to re-engage them.',
    type: 'retention',
    urgency: 'medium',
    priority_score: 72,
    action_data: { customer_count: 5 },
    engagement: { is_viewed: false, is_executed: false },
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Cash Flow Warning',
    description: 'Balance projected to drop below ৳5,000 in 12 days. Consider reducing expenses or accelerating collections.',
    type: 'cash_warning',
    urgency: 'high',
    priority_score: 88,
    action_data: { days_until_critical: 12 },
    engagement: { is_viewed: false, is_executed: false },
    created_at: new Date().toISOString(),
  },
];

// Mock forecasts
export const mockForecasts: Forecast[] = [
  {
    id: 1,
    product_id: 1,
    product_name: 'Rice 25kg',
    forecast_date: new Date().toISOString(),
    forecast_days: 7,
    predicted_demand: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      quantity: Math.floor(8 + Math.random() * 4),
      confidence: 0.85 + Math.random() * 0.1,
    })),
    summary: {
      total_demand: 65,
      avg_daily: 9.3,
      peak_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      peak_qty: 12,
    },
    stockout_risk: {
      will_stockout: true,
      days_until_stockout: 3,
      confidence: 0.88,
      recommendation: 'Order 50 bags immediately to avoid stockout',
    },
    accuracy: {
      mape: 12.5,
      data_points_used: 90,
    },
  },
  {
    id: 2,
    product_id: 2,
    product_name: 'Cooking Oil 5L',
    forecast_date: new Date().toISOString(),
    forecast_days: 7,
    predicted_demand: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      quantity: Math.floor(5 + Math.random() * 3),
      confidence: 0.82 + Math.random() * 0.1,
    })),
    summary: {
      total_demand: 42,
      avg_daily: 6.0,
      peak_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      peak_qty: 8,
    },
    stockout_risk: {
      will_stockout: false,
      days_until_stockout: 15,
      confidence: 0.75,
      recommendation: 'Stock level is safe for next 2 weeks',
    },
    accuracy: {
      mape: 15.2,
      data_points_used: 85,
    },
  },
];

// Mock products
export const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Rice 25kg',
    sku: 'RICE-25',
    unit_price: 1800,
    current_stock: 28,
    reorder_point: 50,
    is_low_stock: true,
    sales_metrics: {
      sales_7d: 65,
      sales_30d: 285,
      avg_daily: 9.5,
      last_sale: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 2,
    name: 'Cooking Oil 5L',
    sku: 'OIL-5L',
    unit_price: 850,
    current_stock: 85,
    reorder_point: 40,
    is_low_stock: false,
    sales_metrics: {
      sales_7d: 42,
      sales_30d: 178,
      avg_daily: 5.9,
      last_sale: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: 3,
    name: 'Sugar 1kg',
    sku: 'SUGAR-1',
    unit_price: 65,
    current_stock: 145,
    reorder_point: 100,
    is_low_stock: false,
    sales_metrics: {
      sales_7d: 98,
      sales_30d: 425,
      avg_daily: 14.2,
      last_sale: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  },
];

// Mock customers
export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Fatima Rahman',
    phone: '+880 1712-345678',
    purchase_metrics: {
      total_spent: 25600,
      purchase_count: 48,
      last_purchase: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      days_since: 2,
      avg_value: 533,
    },
    churn_analysis: {
      rfm_segment: 'champion',
      churn_risk_score: 8,
      churn_risk_level: 'low',
      risk_reason: 'Frequent purchases, high value, recent activity',
    },
  },
  {
    id: '2',
    name: 'Karim Ahmed',
    phone: '+880 1813-456789',
    purchase_metrics: {
      total_spent: 8900,
      purchase_count: 15,
      last_purchase: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
      days_since: 65,
      avg_value: 593,
    },
    churn_analysis: {
      rfm_segment: 'at_risk',
      churn_risk_score: 78,
      churn_risk_level: 'high',
      risk_reason: 'No purchase in 65 days, previously regular customer',
    },
  },
  {
    id: '3',
    name: 'Nadia Hossain',
    phone: '+880 1915-567890',
    purchase_metrics: {
      total_spent: 12400,
      purchase_count: 22,
      last_purchase: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      days_since: 8,
      avg_value: 564,
    },
    churn_analysis: {
      rfm_segment: 'loyal',
      churn_risk_score: 22,
      churn_risk_level: 'low',
      risk_reason: 'Consistent purchase pattern, good recency',
    },
  },
];

// Mock transactions
export const mockTransactions: Transaction[] = Array.from({ length: 50 }, (_, i) => {
  const products = ['Rice 25kg', 'Cooking Oil 5L', 'Sugar 1kg', 'Flour 10kg', 'Lentils 2kg'];
  const customers = ['Fatima Rahman', 'Karim Ahmed', 'Nadia Hossain', 'Walk-in Customer'];
  const payments = ['Cash', 'bKash', 'Nagad', 'Card'];
  
  const daysAgo = Math.floor(i / 2);
  const product = products[Math.floor(Math.random() * products.length)];
  const quantity = Math.floor(1 + Math.random() * 5);
  const unitPrice = product.includes('Rice') ? 1800 : 
                    product.includes('Oil') ? 850 :
                    product.includes('Sugar') ? 65 :
                    product.includes('Flour') ? 550 : 120;
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const amount = quantity * unitPrice;
  
  return {
    transaction_id: `mock-${i + 1}`,
    product_id: `mock-product-${Math.floor(Math.random() * 5)}`,
    product_name: product,
    customer_id: i % 4 === 0 ? null : `mock-customer-${i}`,
    customer_name: i % 4 === 0 ? null : customers[Math.floor(Math.random() * customers.length)],
    date: createdAt.toISOString().split('T')[0],
    time: createdAt.toISOString().split('T')[1].slice(0, 8),
    quantity,
    unit_price: unitPrice,
    amount,
    payment_method: payments[Math.floor(Math.random() * payments.length)].toLowerCase(),
    notes: null,
    created_at: createdAt.toISOString(),
  };
});
