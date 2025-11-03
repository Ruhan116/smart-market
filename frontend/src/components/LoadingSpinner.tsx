import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div 
      className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {spinner}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
