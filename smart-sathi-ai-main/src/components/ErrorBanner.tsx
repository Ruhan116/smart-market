import React from 'react';
import { Button } from './ui/button';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div 
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 my-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label="Error">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-destructive mb-1">Error</h3>
          <p className="text-sm text-destructive/90">{message}</p>
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              size="sm"
              className="mt-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
