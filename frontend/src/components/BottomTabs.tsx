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
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden z-50 shadow-lg"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-shrink-0 flex flex-col items-center justify-center py-3 px-4 text-center text-xs font-medium transition-colors min-w-max border-b-2 ${
                isActive
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="text-lg" role="img" aria-label={tab.label}>{tab.icon}</div>
              <div className="truncate mt-1 max-w-[60px]">{tab.label}</div>
            </button>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </nav>
  );
};
