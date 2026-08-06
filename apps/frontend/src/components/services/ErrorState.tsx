'use client';

import React from 'react';

export interface ErrorStateProps {
  onRetry: () => void;
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  onRetry,
  message = 'Unable to connect to service catalog API. Please try again.',
}) => {
  return (
    <div
      role="alert"
      className="bg-rose-950/20 border border-rose-500/30 rounded-[22px] p-8 sm:p-10 text-center max-w-md mx-auto space-y-4 backdrop-blur-xl shadow-lg"
    >
      <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">Connection Error</h3>
        <p className="text-xs text-rose-300/90 leading-relaxed max-w-sm mx-auto">{message}</p>
      </div>

      <div className="pt-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 bg-rose-500 hover:bg-rose-400 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Retry Loading</span>
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
