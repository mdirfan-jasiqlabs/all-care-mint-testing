'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div style={{ width: '100%' }}>
      {/* Table Skeleton Header */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`sh-${i}`}
            style={{
              flex: 1,
              height: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              marginRight: i === columns - 1 ? 0 : '16px',
              borderRadius: '4px',
            }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`sr-${rowIndex}`}
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            padding: '16px 0',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`sc-${rowIndex}-${colIndex}`}
              style={{
                flex: 1,
                marginRight: colIndex === columns - 1 ? 0 : '16px',
              }}
            >
              <div
                style={{
                  height: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '4px',
                  width: colIndex === 0 ? '70%' : colIndex === 1 ? '50%' : '80%',
                  animation: 'shimmer 1.5s infinite linear',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
