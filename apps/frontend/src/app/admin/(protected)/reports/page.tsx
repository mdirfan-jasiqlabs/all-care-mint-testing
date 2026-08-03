'use client';

import React, { useState, useEffect } from 'react';

interface ReportItem {
  date: string;
  booking_id: string;
  booking_reference: string;
  customer_name: string;
  service_name: string;
  amount_inr: number;
  payment_method: string;
  status: string;
}

export default function AdminReportsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [type, setType] = useState<string>('revenue');
  const [dateFrom, setDateFrom] = useState<string>(thirtyDaysAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(now.toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateDates = (from: string, to: string): boolean => {
    const dFrom = new Date(from);
    const dTo = new Date(to);

    if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
      setErrorMsg('Please select valid start and end dates.');
      return false;
    }
    if (dTo < dFrom) {
      setErrorMsg('End date cannot be earlier than start date.');
      return false;
    }

    const diffDays = Math.ceil((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      setErrorMsg('Date range cannot exceed 90 days.');
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const fetchReport = async () => {
    if (!validateDates(dateFrom, dateTo)) return;

    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;

      const res = await fetch(
        `/api/v1/admin/reports?type=${type}&date_from=${dateFrom}&date_to=${dateTo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Failed to fetch report data');
      }

      const json = await res.json();
      setReportData(json.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [type, dateFrom, dateTo]);

  const handleExportCsv = async () => {
    if (!validateDates(dateFrom, dateTo)) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;

      const res = await fetch(
        `/api/v1/admin/reports?type=${type}&format=csv&date_from=${dateFrom}&date_to=${dateTo}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Failed to export CSV file.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `report-${type}-${dateFrom}-${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export CSV file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>
          Operational Analytics & Reports
        </h2>
        <p style={{ color: '#64748b' }}>
          Generate revenue reports, booking ledgers, and download CSV exports for operator auditing.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>Report Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <option value="revenue">Revenue & Settlements Report</option>
            <option value="booking">Bookings Ledger Report</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>Start Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>End Date (Max 90 days)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExportCsv}
            disabled={loading || !!errorMsg}
            style={{
              background: loading || !!errorMsg ? '#334155' : '#10b981',
              color: '#020617',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading || !!errorMsg ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#f87171',
            fontSize: '14px',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Report Table View */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
            Report Results ({reportData.length} entries)
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '32px', color: '#64748b', textAlign: 'center' }}>
            Processing aggregation query...
          </div>
        ) : reportData.length === 0 ? (
          <div style={{ padding: '32px', color: '#64748b', textAlign: 'center' }}>
            No record entries found for selected range ({dateFrom} to {dateTo}).
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Booking ID</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Service</th>
                  <th style={{ padding: '12px 16px' }}>Amount (INR)</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr
                    key={row.booking_id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{row.date}</td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 600 }}>
                      {row.booking_reference || row.booking_id.substring(0, 8)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc' }}>{row.customer_name}</td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{row.service_name}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>
                      ₹{row.amount_inr?.toLocaleString() ?? 0}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{row.payment_method}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background:
                            row.status === 'COMPLETED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color: row.status === 'COMPLETED' ? '#34d399' : '#facc15',
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
