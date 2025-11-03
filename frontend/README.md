# SmartMarket - AI Business Intelligence Platform

SmartMarket is an AI-powered business intelligence platform designed for Bangladesh SMEs. Get demand forecasts, cash flow projections, customer churn analysis, and actionable recommendations—all from your smartphone.

## Features

- 🔐 **Authentication**: Secure login and signup with JWT tokens
- 📊 **Dashboard**: Real-time business metrics and insights
- ⚡ **AI Recommendations**: Actionable suggestions for inventory, cash flow, and customer retention
- 📈 **Demand Forecasts**: 7/14/30-day demand predictions with stockout risk analysis
- 💰 **Cash Flow Management**: 30-day cash flow projections with risk assessment
- 📦 **Inventory Management**: Track stock levels, sales trends, and reorder alerts
- 👥 **Customer Analysis**: RFM segmentation and churn risk predictions
- 💳 **Transaction History**: Complete sales records and analytics
- 🌐 **Bilingual Support**: Switch between English and Bangla (বাংলা)
- 📱 **Mobile-First Design**: Optimized for smartphones, tablets, and desktops
- ♿ **Accessibility**: WCAG AA compliant for all users

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: React Hooks, TanStack Query
- **Routing**: React Router v6
- **API Client**: Axios with JWT auto-refresh
- **Charts**: Recharts (for forecasts and cash flow)
- **Notifications**: Sonner toast
- **i18n**: React i18next (Bangla/English)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (Django REST API)

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd smartmarket-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your API URL:
```
VITE_API_URL=http://localhost:8000/api
```

5. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   ├── Navbar.tsx    # Top navigation
│   ├── BottomTabs.tsx # Mobile bottom navigation
│   └── ...
├── pages/            # Page components
│   ├── Login.tsx     # Authentication
│   ├── Home.tsx      # Dashboard
│   ├── Recommendations.tsx
│   ├── Forecasts.tsx
│   └── ...
├── services/         # API services
│   ├── api.ts        # Axios client
│   └── auth.ts       # Authentication
├── hooks/            # Custom React hooks
│   └── useAuth.ts    # Auth state management
├── types/            # TypeScript types
│   └── models.ts     # Data models
└── App.tsx           # App root with routing
```

## Design System

### Colors
- **Primary (Growth Green)**: #10B981 - Success, money, growth
- **Destructive (Urgent Red)**: #EF4444 - Urgent actions, high risk
- **Warning (Caution Amber)**: #F59E0B - Medium risk, warnings
- **Accent (Trust Blue)**: #3B82F6 - Information, trust
- **Muted (Neutral Gray)**: #6B7280 - Secondary text

### Typography
- Headings: Inter/System fonts
- Bangla: Noto Sans Bengali
- Responsive scaling with mobile-first approach

### Spacing
- 8px grid system (8, 16, 24, 32, 48, 64)
- Consistent padding and margins

### Accessibility
- 4.5:1 contrast ratio (WCAG AA)
- Keyboard navigation support
- Screen reader friendly
- Touch targets minimum 48x48px

## API Integration

The app expects a Django REST API backend with the following endpoints:

- `POST /auth/register` - User signup
- `POST /auth/login` - User login
- `POST /auth/token/refresh` - Token refresh
- `GET /business/profile` - Business stats
- `GET /recommendations` - AI recommendations
- `POST /recommendations/{id}/execute` - Execute recommendation
- `GET /forecasts` - Demand forecasts
- `GET /products` - Product inventory
- `GET /customers` - Customer analysis
- `GET /transactions` - Transaction history

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with one click

### Manual Build

```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Performance Targets

- Page load < 3 seconds (3G)
- Time to interactive < 3 seconds
- Lighthouse score > 80
- Bundle size < 100KB gzipped

## License

MIT License

## Contact

For support or questions, contact: support@smartmarket.app
