import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  label: string;
  icon: string;
  path: string;
}

interface BottomTabsProps {
  tabs: Tab[];
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ tabs }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 grid gap-1 md:hidden z-50 shadow-lg"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`py-2 px-1 text-center text-xs font-medium rounded-lg transition-colors ${
              isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="text-lg mb-1" role="img" aria-label={tab.label}>{tab.icon}</div>
            <div className="truncate">{tab.label}</div>
          </button>
        );
      })}
    </nav>
  );
};
