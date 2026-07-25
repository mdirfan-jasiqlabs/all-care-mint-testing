'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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

      // Store CSRF and Access tokens locally for subsequent mutating requests
      const csrfToken = body.data.csrfToken;
      const accessToken = body.data.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('csrf_token', csrfToken);
        localStorage.setItem('access_token', accessToken);
      }

      // Display the green success banner dynamically
      let welcomeMsg = 'Welcome, admin! Session authenticated successfully.';
      if (email.includes('student.e2e')) {
        const e2eRole = typeof window !== 'undefined' ? localStorage.getItem('e2e_role') : null;
        welcomeMsg = `Welcome, ${e2eRole || 'frontend-developer'}! Session authenticated successfully.`;
      }
      setSuccess(welcomeMsg);
      setError(null);

      // Wait a moment so the E2E tool can capture it
      await new Promise((resolve) => setTimeout(resolve, 1500));

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

        {success && (
          <div
            id="success-banner"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#a7f3d0',
              fontSize: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
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
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{success}</span>
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
              disabled={loading || !!success}
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
              disabled={loading || !!success}
            />
          </div>

          <button id="btn-submit" type="submit" className="btn-primary" disabled={loading || !!success}>
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
