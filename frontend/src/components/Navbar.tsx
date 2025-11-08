import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLanguageToggle = () => {
    const newLang = language === 'bn' ? 'en' : 'bn';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.documentElement.lang = newLang;
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-card border-b border-border px-4 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm">
      <button
        onClick={() => navigate('/home')}
        className="text-xl font-bold text-primary flex items-center gap-2"
        aria-label="SmartMarket Home"
      >
        <span>📊</span>
        <span>SmartMarket</span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Access Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors font-medium flex items-center gap-1"
            aria-label="Quick access menu"
            aria-expanded={menuOpen}
          >
            ⚙️ Menu
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Data Management
              </div>
              <button
                onClick={() => handleNavigation('/upload')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span>📤</span> CSV & Receipt Upload
              </button>
              <button
                onClick={() => handleNavigation('/transactions/list')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span>📋</span> Advanced Transactions
              </button>

              <div className="border-t border-border my-1"></div>

              {user?.is_staff && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                    Staff Tools
                  </div>
                  <button
                    onClick={() => handleNavigation('/admin/dashboard')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span> Admin Dashboard
                  </button>
                  <div className="border-t border-border my-1"></div>
                </>
              )}

              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Analytics
              </div>
              <button
                onClick={() => handleNavigation('/products')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span>📦</span> Products
              </button>
              <button
                onClick={() => handleNavigation('/customers')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span>👥</span> Customers
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLanguageToggle}
          className="text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
          aria-label={`Switch to ${language === 'bn' ? 'English' : 'Bangla'}`}
        >
          {language === 'bn' ? 'EN' : 'বাংলা'}
        </button>

        {user && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user.first_name}</span>
            <button
              onClick={handleLogout}
              className="text-destructive hover:text-destructive/80 font-medium px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
