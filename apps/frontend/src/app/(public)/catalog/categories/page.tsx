'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import CategoryGridSkeleton from '@/components/ui/skeleton/CategoryGridSkeleton';

interface Category {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function CatalogCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const body = await apiClient.get('/api/v1/catalog/categories');
        if (body.success) {
          setCategories(body.data);
          setFilteredCategories(body.data);
        } else {
          throw new Error(body.message || 'Failed to fetch categories');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(
        categories.filter((cat) =>
          cat.name.toLowerCase().includes(cleanQuery) ||
          (cat.description && cat.description.toLowerCase().includes(cleanQuery))
        )
      );
    }
  };

  const handleCategoryClick = (cat: Category) => {
    router.push(`/catalog/services?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(224, 71%, 4%)', color: '#f8fafc', padding: '40px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="title-brand" style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.5px', color: '#fff', fontWeight: 800 }}>
            All Care Services
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Select a category to explore professional services
          </p>
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative' }}>
          <input
            id="search-bar"
            type="text"
            placeholder="Search for home services..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'hsl(217, 32%, 12%)',
              border: '1px solid hsl(217, 32%, 17%)',
              borderRadius: '12px',
              padding: '14px 16px 14px 44px',
              fontSize: '14px',
              color: '#fff',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          <svg
            style={{ position: 'absolute', left: '16px', top: '16px', color: '#64748b' }}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <CategoryGridSkeleton count={4} />
        ) : error ? (
          <div className="alert-error" style={{ textAlign: 'center' }}>
            <span>{error}</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            No categories matched "{searchQuery}".
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="category-card hover:scale-[1.02] transition-all"
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.7)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cat.iconUrl ? (
                    <img src={cat.iconUrl} alt="" style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                      {cat.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
