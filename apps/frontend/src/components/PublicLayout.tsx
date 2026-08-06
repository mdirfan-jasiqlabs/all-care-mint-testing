import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#060a12] text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col justify-between">{children}</main>
      <Footer />
    </div>
  );
}
