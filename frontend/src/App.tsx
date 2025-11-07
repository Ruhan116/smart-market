import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { BottomTabs } from "@/components/BottomTabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Recommendations from "./pages/Recommendations";
import Forecasts from "./pages/Forecasts";
import ForecastDetails from "./pages/ForecastDetails";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Transactions from "./pages/Transactions";
import DataUpload from "./pages/DataUpload";
import TransactionsList from "./pages/TransactionsList";
import AdminDashboard from "./pages/AdminDashboard";
import ReceiptPreview from "./pages/ReceiptPreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const bottomTabs = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Actions', icon: '⚡', path: '/recommendations' },
    { label: 'Forecasts', icon: '📈', path: '/forecasts' },
    { label: 'Products', icon: '📦', path: '/products' },
    { label: 'Customers', icon: '👥', path: '/customers' },
    { label: 'Upload', icon: '📤', path: '/upload' },
  ];

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/home" element={<Home />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/forecasts" element={<Forecasts />} />
            <Route path="/forecasts/:productId" element={<ForecastDetails />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/upload" element={<DataUpload />} />
            <Route path="/transactions/list" element={<TransactionsList />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/receipts/:imageId" element={<ReceiptPreview />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
      {isAuthenticated && <BottomTabs tabs={bottomTabs} />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
