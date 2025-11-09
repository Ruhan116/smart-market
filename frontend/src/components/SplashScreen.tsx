import React from 'react';
import logo from '@/assets/logo.png';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 text-center">
      <div className="flex items-center gap-4 mb-6 animate-splash-fade-in">
        <img src={logo} alt="SmartMarket logo" className="h-16 w-16 drop-shadow-lg" />
        <h1 className="text-4xl font-bold text-primary tracking-tight">SmartMarket</h1>
      </div>
      <p
        className="text-sm text-muted-foreground max-w-sm animate-splash-fade-in"
        style={{ animationDelay: '120ms' }}
      >
        Empowering Bangladeshi SMEs with intelligent insights.
      </p>
      <div
        className="mt-8 flex items-center gap-6 uppercase text-sm tracking-[0.6em] text-muted-foreground animate-splash-fade-up"
        style={{ animationDelay: '220ms' }}
      >
        <span>Foresight</span>
        <span>Clarity</span>
        <span>Momentum</span>
      </div>
    </div>
  );
};

export default SplashScreen;
