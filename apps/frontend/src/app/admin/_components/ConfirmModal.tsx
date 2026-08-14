'use client';

import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Deactivate',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Esc key closure and Focus trap
  useEffect(() => {
    if (!isOpen || isLoading) return;

    // Focus Cancel button by default
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }

      if (e.key === 'Tab') {
        const cancelBtn = cancelBtnRef.current;
        const confirmBtn = confirmBtnRef.current;

        if (document.activeElement === cancelBtn && e.shiftKey) {
          e.preventDefault();
          confirmBtn?.focus();
        } else if (document.activeElement === confirmBtn && !e.shiftKey) {
          e.preventDefault();
          cancelBtn?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--admin-modal-backdrop)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={isLoading ? undefined : onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--admin-modal-bg)',
          border: '1px solid var(--admin-border)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          animation: 'cardFadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--admin-text-primary)',
              marginBottom: '10px',
            }}
          >
            {title}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-secondary)', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--admin-border)',
              backgroundColor: 'transparent',
              color: isLoading ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
            {isLoading ? 'Deactivating...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
