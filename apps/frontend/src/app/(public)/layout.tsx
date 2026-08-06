import React from 'react';
import PublicLayout from '@/components/PublicLayout';

export default function PublicAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
