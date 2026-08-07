'use client';

import React from 'react';

export default function PartnerBenefitsSection() {
  const benefits = [
    {
      id: 'job-opportunities',
      title: 'Local Job Opportunities',
      description: 'Get matched with service requests from verified customers in your area.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V4.5a2.25 2.25 0 00-2.25-2.25h-3a2.25 2.25 0 00-2.25 2.25v1.644m9 0c1.066.07 2.127.178 3.175.326M8.25 6.319c1.048-.148 2.109-.256 3.175-.326" />
        </svg>
      ),
    },
    {
      id: 'flexible-hours',
      title: 'Flexible Working Hours',
      description: 'Accept jobs that fit your schedule and work on your terms.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'reliable-payouts',
      title: 'Reliable Payouts',
      description: 'Clear and transparent payout tracking for completed services.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a2.5 2.5 0 00-2.5-2.5H10a2.5 2.5 0 000 5h4a2.5 2.5 0 010 5h-3.5A2.5 2.5 0 018 14.5M12 6v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="partner-benefits-heading" className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dark Elevated Outer Container */}
        <div className="bg-[#070b16]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl">
          
          {/* Section Header */}
          <div className="text-center space-y-3 mb-10">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest inline-block border-b border-emerald-500/30 pb-1">
              WHY PARTNER WITH US
            </span>
            <h2 id="partner-benefits-heading" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Grow Your Service Business
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
              We provide the platform, customers, and support so you can focus on what you do best.
            </p>
          </div>

          {/* 3 Equal Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 border border-slate-900 hover:border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between items-center"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-md">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
