'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  fixedPrice: number | string;
  estimatedDuration: string | null;
  isActive: boolean;
}

function CatalogServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') || '';
  const categoryName = searchParams.get('categoryName') || 'Services';

  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<Service[]>([]);

  useEffect(() => {
    if (!categoryId) return;

    const fetchServices = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        const res = await fetch(`http://localhost:3000/api/v1/catalog/categories/${categoryId}/services`, {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load services (${res.status})`);
        }

        const body = await res.json();
        if (body.success) {
          setServices(body.data);
          setFilteredServices(body.data);
        } else {
          throw new Error(body.message || 'Failed to fetch services');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [categoryId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      setFilteredServices(services);
    } else {
      setFilteredServices(
        services.filter((svc) =>
          svc.name.toLowerCase().includes(cleanQuery) ||
          (svc.description && svc.description.toLowerCase().includes(cleanQuery))
        )
      );
    }
  };

  const addToCart = (svc: Service) => {
    setCart((prevCart) => {
      // Check if already in cart to avoid duplicates (per spec BR-001-001)
      if (prevCart.find((item) => item.id === svc.id)) {
        return prevCart;
      }
      return [...prevCart, svc];
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = typeof item.fixedPrice === 'string' ? parseFloat(item.fixedPrice) : item.fixedPrice;
      return sum + (price || 0);
    }, 0);
  };

  const handleCheckout = () => {
    alert(`Successfully checked out! Total amount: ₹${getCartTotal()}`);
    setCart([]);
  };

  const formatPrice = (priceVal: number | string) => {
    const numericPrice = typeof priceVal === 'string' ? parseFloat(priceVal) : priceVal;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(numericPrice);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(224, 71%, 4%)', color: '#f8fafc', padding: '40px 24px 100px 24px', position: 'relative' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Back navigation */}
        <button
          onClick={() => router.push('/catalog/categories')}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: '#10b981',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ➔ Back to Categories
        </button>

        {/* Header */}
        <div>
          <h1 className="title-brand" style={{ fontSize: '28px', marginBottom: '6px', color: '#fff', fontWeight: 800 }}>
            {categoryName} Services
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Book professional services at fixed rates
          </p>
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative' }}>
          <input
            id="search-bar"
            type="text"
            placeholder="Search within this category..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'hsl(217, 32%, 12%)',
              border: '1px solid hsl(217, 32%, 17%)',
              borderRadius: '12px',
              padding: '12px 16px 12px 40px',
              fontSize: '14px',
              color: '#fff',
              outline: 'none',
            }}
          />
          <svg
            style={{ position: 'absolute', left: '14px', top: '14px', color: '#64748b' }}
            width="16"
            height="16"
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

        {/* Service Cards List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  height: '110px',
                  borderRadius: '16px',
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="alert-error" style={{ textAlign: 'center' }}>
            <span>{error}</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            No services matched "{searchQuery}".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredServices.map((svc) => {
              const inCart = !!cart.find((item) => item.id === svc.id);
              return (
                <div
                  key={svc.id}
                  className="service-card"
                  style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.7)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                      {svc.name}
                    </h3>
                    {svc.description && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                        {svc.description}
                      </p>
                    )}
                    {svc.estimatedDuration && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ⏱ {svc.estimatedDuration}
                      </span>
                    )}
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                      {formatPrice(svc.fixedPrice)}
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(svc)}
                    disabled={inCart}
                    style={{
                      backgroundColor: inCart ? 'rgba(16, 185, 129, 0.15)' : 'hsl(150, 84%, 40%)',
                      color: inCart ? '#10b981' : 'hsl(210, 40%, 98%)',
                      border: inCart ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: inCart ? 'default' : 'pointer',
                      minWidth: '90px',
                      textAlign: 'center',
                    }}
                  >
                    {inCart ? 'Added' : 'Book Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Cart Banner */}
      {cart.length > 0 && (
        <div
          id="cart-banner"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#10b981',
            color: 'hsl(224, 71%, 4%)',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.3)',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px', opacity: 0.8 }}>
              Total Added Items
            </span>
            <span id="cart-count" style={{ fontSize: '15px', fontWeight: '800' }}>
              {cart.length} {cart.length === 1 ? 'Item' : 'Items'} ({formatPrice(getCartTotal())})
            </span>
          </div>
          <button
            onClick={handleCheckout}
            style={{
              backgroundColor: 'hsl(224, 71%, 4%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Confirm Booking
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogServicesPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Services...</div>}>
      <CatalogServicesContent />
    </Suspense>
  );
}
