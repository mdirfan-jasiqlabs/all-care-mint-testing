'use client';

import React, { useState } from 'react';
import SectionContainer from './SectionContainer';
import DownloadAppCard from './DownloadAppCard';
import TopIconWrapper from './TopIconWrapper';
import GradientHeading from './GradientHeading';
import PrimaryCTAButton from './PrimaryCTAButton';
import PlayStoreButton from './PlayStoreButton';

export interface DownloadAppSectionProps {
  onShowToast?: (title: string, desc: string, icon?: string) => void;
  titlePrefix?: string;
  titleHighlight?: string;
  description?: string;
  primaryButtonLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const DownloadAppSection: React.FC<DownloadAppSectionProps> = ({
  onShowToast,
  titlePrefix = 'Book a Service — Download the',
  titleHighlight = 'Customer App',
  description = 'Get instant access to vetted local service professionals on Android.',
  primaryButtonLabel = 'Download Customer App',
  disabled = false,
  className = '',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrimaryDownload = () => {
    if (disabled || isDownloading) return;
    setIsDownloading(true);

    if (onShowToast) {
      onShowToast(
        'Downloading Customer App',
        'Initiating APK download for All care mint Customer Mobile Application.',
        '📲'
      );
    }

    setTimeout(() => {
      setIsDownloading(false);
      // Simulate file download trigger
      const link = document.createElement('a');
      link.href = '#';
      link.setAttribute('download', 'all-care-mint-customer.apk');
      document.body.appendChild(link);
      document.body.removeChild(link);
    }, 1500);
  };

  const handlePlayStoreClick = () => {
    if (onShowToast) {
      onShowToast(
        'Google Play Store',
        'Redirecting to Google Play Store listing for All care mint Customer App.',
        '▶️'
      );
    }
  };

  return (
    <SectionContainer className={className}>
      <DownloadAppCard>
        {/* Top Centered Smartphone Download Icon Badge */}
        <TopIconWrapper />

        {/* Main Section Heading */}
        <GradientHeading titlePrefix={titlePrefix} titleHighlight={titleHighlight} />

        {/* Subtitle Description */}
        <div className="max-w-[620px] mx-auto">
          <p className="text-slate-300/90 text-xs sm:text-sm md:text-base leading-relaxed font-normal">
            {description}
          </p>
        </div>

        {/* Dual Action CTAs: Primary Filled Button & Secondary Google Play Badge */}
        <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none mx-auto">
          {/* Primary Download Button */}
          <PrimaryCTAButton
            label={primaryButtonLabel}
            onClick={handlePrimaryDownload}
            isLoading={isDownloading}
            disabled={disabled}
            className="w-full sm:w-auto min-w-[210px]"
          />

          {/* Secondary Google Play Badge Button */}
          <PlayStoreButton
            onClick={handlePlayStoreClick}
            className="w-full sm:w-auto min-w-[190px]"
          />
        </div>
      </DownloadAppCard>
    </SectionContainer>
  );
};

export default DownloadAppSection;
