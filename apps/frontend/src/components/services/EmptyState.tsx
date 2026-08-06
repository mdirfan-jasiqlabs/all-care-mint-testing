'use client';

import React from 'react';

export interface EmptyStateProps {
  onRefresh?: () => void;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onRefresh,
  message = 'There are currently no active service categories available.',
}) => {
  return (
    <div className="bg-[#060d19]/90 border border-emerald-500/20 rounded-[22px] p-10 sm:p-14 text-center max-w-lg mx-auto space-y-4 backdrop-blur-xl shadow-lg">
      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">No Categories Found</h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">{message}</p>
      </div>

      {onRefresh && (
        <div className="pt-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Catalog</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
