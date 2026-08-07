'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SectionHeader from './SectionHeader';
import GridContainer from './GridContainer';
import CategoryCard, { CategoryData } from './CategoryCard';
import CategoryGridSkeleton from '@/components/ui/skeleton/CategoryGridSkeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import MotionStagger from '@/components/motion/MotionStagger';
import MotionCard from '@/components/motion/MotionCard';

export interface ExploreServicesSectionProps {
  onShowToast?: (title: string, desc: string, icon?: string) => void;
  className?: string;
}

// Pixel-perfect fallback categories matching reference UI exactly
const defaultCategories: CategoryData[] = [
  {
    id: 'cat-cleaning',
    name: 'Cleaning',
    description: 'Professional home cleaning and deep cleaning services',
    isActive: true,
  },
  {
    id: 'cat-ac-repair',
    name: 'AC Repair',
    description: 'Professional AC repair and service',
    isActive: true,
  },
  {
    id: 'cat-plumbing',
    name: 'Plumbing',
    description: 'Expert plumbing repairs and installation services',
    isActive: true,
  },
  {
    id: 'cat-painting',
    name: 'Painting',
    description: 'Professional home wall painting services',
    isActive: true,
  },
];

export const ExploreServicesSection: React.FC<ExploreServicesSectionProps> = ({
  onShowToast,
  className = '',
}) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      let fetchSuccess = false;
      let loadedData: CategoryData[] = [];

      // Try Public Categories Endpoint
      try {
        const res = await fetch(`${apiBase}/api/v1/public/categories`, {
          headers: { 'Accept': 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json;
          if (Array.isArray(list) && list.length > 0) {
            loadedData = list;
            fetchSuccess = true;
          }
        }
      } catch {
        // Fallback to secondary catalog categories endpoint if public endpoint throws
      }

      if (!fetchSuccess) {
        try {
          const res = await fetch(`${apiBase}/api/v1/catalog/categories`, {
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const json = await res.json();
            const list = json.data || json;
            if (Array.isArray(list) && list.length > 0) {
              loadedData = list;
              fetchSuccess = true;
            }
          }
        } catch {
          // Ignored
        }
      }

      if (fetchSuccess && loadedData.length > 0) {
        // Filter only active categories
        const activeOnly = loadedData.filter((item) => item.isActive !== false);
        setCategories(activeOnly.length > 0 ? activeOnly : defaultCategories);
      } else {
        // Use high quality fallback categories if API backend is unpopulated or offline
        setCategories(defaultCategories);
      }

      if (isManualRefresh && onShowToast) {
        onShowToast('Categories Refreshed', 'Public service categories updated successfully.', '🔄');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to service catalog API.');
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoize category list to optimize render performance
  const activeCategoriesList = useMemo(() => {
    return categories.filter((cat) => cat.isActive !== false);
  }, [categories]);

  return (
    <section
      id="services"
      aria-labelledby="service-categories-heading"
      className={`py-3 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-5 sm:space-y-6 ${className}`}
    >
      {/* SECTION HEADER */}
      <SectionHeader
        code="PG-WEB-003"
        badgeLabel="CATALOG BROWSER"
        titlePrefix="Service"
        titleHighlight="Categories"
        subtitleLine1="Browse active service categories available on All Care Mint."
        subtitleLine2="Book instantly inside our Customer Mobile App."
        onRefresh={() => fetchCategories(true)}
        isRefreshing={refreshing}
      />

      {/* CATEGORY GRID CONTAINER / STATES */}
      <div className="relative min-h-[300px]">
        {/* Loading Skeleton State */}
        {loading && <CategoryGridSkeleton count={4} />}

        {/* Error State */}
        {!loading && error && activeCategoriesList.length === 0 && (
          <ErrorState onRetry={() => fetchCategories(false)} message={error} />
        )}

        {/* Empty State */}
        {!loading && !error && activeCategoriesList.length === 0 && (
          <EmptyState onRefresh={() => fetchCategories(true)} />
        )}

        {/* Category Grid Display */}
        {!loading && activeCategoriesList.length > 0 && (
          <MotionStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
            {activeCategoriesList.map((category) => (
              <MotionCard key={category.id}>
                <CategoryCard category={category} />
              </MotionCard>
            ))}
          </MotionStagger>
        )}
      </div>
    </section>
  );
};

export default ExploreServicesSection;
