import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullScreen = false,
  message,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-[6px]',
  };

  const displayMessage = message ?? (fullScreen ? 'Loading...' : undefined);

  const spinner = (
    <div
      className={`${sizeClasses[size]} border-solid border-primary border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        {spinner}
        <span className="sr-only">Loading...</span>
        {displayMessage && (
          <p className="text-sm text-muted-foreground">{displayMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-3">
      {spinner}
      <span className="sr-only">Loading...</span>
      {displayMessage && (
        <p className="text-xs text-muted-foreground">{displayMessage}</p>
      )}
    </div>
  );
};
