'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json();

      if (!response.ok) {
        const errorMsg = body?.error?.message || 'Login failed. Please check your credentials.';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Store CSRF token locally for subsequent mutating requests
      const csrfToken = body.data.csrfToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('csrf_token', csrfToken);
      }

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="title-brand" style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            All Care Mint
          </h1>
          <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#94a3b8' }}>
            Admin Console Portal
          </h2>
        </div>

        {error && (
          <div className="alert-error">
            <svg
              style={{ flexShrink: 0 }}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Administrator Email
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="name@allcaremint.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="password-input">
              Secure Password
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <span>Sign In to Console</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
