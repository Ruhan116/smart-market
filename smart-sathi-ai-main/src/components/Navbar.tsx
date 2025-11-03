import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

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
      <div className="flex items-center gap-3">
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
