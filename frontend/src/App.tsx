import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { BottomTabs } from "@/components/BottomTabs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import SplashScreen from "@/components/SplashScreen";
import { LanguageProvider } from "@/context/LanguageContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Recommendations from "./pages/Recommendations";
import Forecasts from "./pages/Forecasts";
import ForecastDetails from "./pages/ForecastDetails";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Transactions from "./pages/Transactions";
import Inventory from "./pages/Inventory";
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
    { label: 'Inventory', icon: '📊', path: '/inventory' },
    { label: 'Forecasts', icon: '📈', path: '/forecasts' },
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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/home" element={<Home />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/inventory" element={<Inventory />} />
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

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              {showSplash ? <SplashScreen /> : <AppContent />}
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
