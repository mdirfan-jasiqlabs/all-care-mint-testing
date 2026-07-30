import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useCatalogStore, Category, Service } from '../stores/catalogStore';
import * as storage from '../utils/storage';

// Premium Magnifier Icon made from native Views (No emojis or dependencies)
const SearchIcon = () => (
  <View style={styles.searchIconContainer}>
    <View style={styles.searchIconCircle} />
    <View style={styles.searchIconLine} />
  </View>
);

export const CatalogBrowseScreen = ({ navigation, route }: any) => {
  const token = route?.params?.token || storage.getAccessToken() || '';
  const { 
    categories, 
    servicesByCategory, 
    isLoading, 
    error, 
    isOffline,
    isStale,
    fetchCategories, 
    fetchServicesByCategory 
  } = useCatalogStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<Service[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  useEffect(() => {
    fetchCategories(token);
  }, []);

  // Fetch services for all categories when categories list changes
  useEffect(() => {
    if (categories && categories.length > 0) {
      categories.forEach((cat: Category) => {
        fetchServicesByCategory(cat.id, token);
      });
    }
  }, [categories]);

  // Synchronize cart prices when catalog data is updated/revalidated
  useEffect(() => {
    if (cart.length > 0) {
      const updatedCart = cart.map((cartItem: Service) => {
        const categoryServices = servicesByCategory[cartItem.categoryId] || [];
        const freshService = categoryServices.find((s: Service) => s.id === cartItem.id);
        if (freshService && freshService.fixedPrice !== cartItem.fixedPrice) {
          console.log(`Syncing price for ${cartItem.name}: ${cartItem.fixedPrice} -> ${freshService.fixedPrice}`);
          return { ...cartItem, fixedPrice: freshService.fixedPrice };
        }
        return cartItem;
      });
      
      const priceChanged = updatedCart.some((item: Service, idx: number) => item.fixedPrice !== cart[idx].fixedPrice);
      if (priceChanged) {
        setCart(updatedCart);
      }
    }
  }, [servicesByCategory]);

  // Combine services from store
  const allServices: Service[] = (Object.values(servicesByCategory).flat() as Service[]);

  // Filter based on selected category and search query
  const getSelectedServices = (): Service[] => {
    let services: Service[] = [];
    if (selectedCategory === 'All') {
      const seen = new Set();
      services = allServices.filter((svc: Service) => {
        const duplicate = seen.has(svc.id);
        seen.add(svc.id);
        return !duplicate;
      });
    } else {
      const activeCat = categories.find((c: Category) => c.name === selectedCategory);
      if (activeCat) {
        services = servicesByCategory[activeCat.id] || [];
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter((svc: Service) => 
        svc.name.toLowerCase().includes(query) ||
        (svc.description && svc.description.toLowerCase().includes(query))
      );
    }
    return services;
  };

  const currentServices = getSelectedServices();

  const toggleCart = (svc: Service) => {
    if (cart.some((item: Service) => item.id === svc.id)) {
      setCart(cart.filter((item: Service) => item.id !== svc.id));
    } else {
      setCart([...cart, svc]);
    }
  };

  const getCartTotal = (): number => {
    return cart.reduce((sum: number, item: Service) => sum + parseFloat(item.fixedPrice), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0 || isOffline) return;
    navigation.navigate('BookingSummary', { serviceId: cart[0].id });
  };

  const handleRetry = () => {
    fetchCategories(token);
  };

  const renderServiceCard = ({ item }: { item: Service }) => {
    const inCart = cart.some((cartItem: Service) => cartItem.id === item.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.push('ServiceDetail', { serviceId: item.id })}
        style={styles.serviceCard}
        testID={`service-card-${item.id}`}
        accessibilityLabel={`View details for ${item.name}`}
      >
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.serviceDesc}>{item.description}</Text>
          )}
          {item.estimatedDuration && (
            <Text style={styles.serviceDuration}>Duration: {item.estimatedDuration}</Text>
          )}
          <Text style={styles.servicePrice}>₹{parseInt(item.fixedPrice, 10)}</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => toggleCart(item)}
          style={[
            styles.addButton,
            inCart ? styles.addButtonActive : styles.addButtonInactive
          ]}
          testID={`btn-add-service-${item.id}`}
          accessibilityLabel={`Add ${item.name} to cart`}
        >
          <Text style={[
            styles.addButtonText,
            inCart ? styles.addButtonTextActive : styles.addButtonTextInactive
          ]}>
            {inCart ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSkeletons = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={[1, 2, 3, 4]}
      keyExtractor={(item) => item.toString()}
      contentContainerStyle={styles.categoryScrollContainer}
      renderItem={() => (
        <View style={[styles.categoryPill, styles.categoryPillInactive, { width: 80, opacity: 0.5 }]}>
          <View style={{ width: 40, height: 10, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </View>
      )}
    />
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        {/* Phone Simulated Status Bar Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>
          
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isOffline ? styles.badgeOffline : styles.badgeOnline]}>
              <Text style={[styles.badgeText, isOffline ? styles.badgeTextOffline : styles.badgeTextOnline]}>
                {isOffline ? 'Offline' : 'Online'}
              </Text>
            </View>
            <View style={[styles.badge, isStale ? styles.badgeStale : styles.badgeEtag]}>
              <Text style={[styles.badgeText, isStale ? styles.badgeTextStale : styles.badgeTextEtag]}>
                {isStale ? 'Cached Stale' : 'ETag Validated'}
              </Text>
            </View>
          </View>
        </View>

        {/* Offline Warning Banner */}
        {isOffline && (
          <View style={styles.offlineBanner} testID="offline-banner">
            <Text style={styles.offlineBannerText}>
              You're offline. Showing cached services.
            </Text>
          </View>
        )}

        {/* Premium Search Box */}
        <View style={[
          styles.searchContainer,
          isSearchFocused ? styles.searchContainerFocused : styles.searchContainerBlurred
        ]}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for home services..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {/* Service Categories Chips Section */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>SERVICE CATEGORIES</Text>
        </View>
        
        {isLoading && categories.length === 0 ? (
          renderSkeletons()
        ) : categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText} testID="txt-empty-categories">
              Services coming soon! Check back later.
            </Text>
          </View>
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', name: 'All' }, ...categories]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoryScrollContainer}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.name;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(item.name)}
                  style={[
                    styles.categoryPill,
                    isActive ? styles.categoryPillActive : styles.categoryPillInactive
                  ]}
                  accessibilityLabel={`Category ${item.name}`}
                  testID={item.id === 'all' ? 'category-card-all' : `category-card-${item.id}`}
                >
                  <Text style={[
                    styles.categoryPillText,
                    isActive ? styles.categoryPillTextActive : styles.categoryPillTextInactive
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Active Services List Section Header */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>
            {selectedCategory === 'All' ? 'ALL SERVICES' : `${selectedCategory.toUpperCase()} SERVICES`}
          </Text>
        </View>
      </View>
    );
  };

  if (error && categories.length === 0) {
    const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('connection') || error.toLowerCase().includes('fetch');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} testID="error-message">
            {isNetworkError 
              ? 'Unable to load services. Please check your connection.' 
              : 'Something went wrong. Please try again later.'}
          </Text>
          <TouchableOpacity 
            onPress={handleRetry} 
            style={styles.retryButton}
            testID="btn-retry"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={currentServices}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText} testID="txt-empty-services">
              {selectedCategory === 'All'
                ? `No services found matching "${searchQuery}"`
                : 'No services available in this category yet'}
            </Text>
            {selectedCategory !== 'All' && (
              <TouchableOpacity onPress={() => setSelectedCategory('All')} style={styles.emptyBackButton}>
                <Text style={styles.emptyBackButtonText}>← Back to All</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Sticky Bottom Cart Banner */}
      {cart.length > 0 && (
        <View style={styles.cartBanner}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartLabel}>TOTAL ADDED ITEMS</Text>
            <Text style={styles.cartCountText}>
              {cart.length} {cart.length === 1 ? 'Item' : 'Items'} (₹{getCartTotal()})
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleCheckout} 
            disabled={isOffline}
            style={[
              styles.checkoutButton,
              isOffline ? styles.checkoutButtonDisabled : styles.checkoutButtonEnabled
            ]}
          >
            <Text style={[
              styles.checkoutButtonText,
              isOffline ? styles.checkoutButtonTextDisabled : styles.checkoutButtonTextEnabled
            ]}>
              {isOffline ? 'Offline' : 'Book Now ➔'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 2%)',
  },
  list: {
    flex: 1,
  },
  headerWrapper: {
    marginBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 44 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(9, 11, 17, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeEtag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeStale: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badgeTextOnline: {
    color: '#10b981',
  },
  badgeTextOffline: {
    color: '#ef4444',
  },
  badgeTextEtag: {
    color: '#10b981',
  },
  badgeTextStale: {
    color: '#d97706',
  },
  offlineBanner: {
    backgroundColor: '#d97706',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  searchContainerBlurred: {
    borderColor: '#1e293b',
  },
  searchContainerFocused: {
    borderColor: '#10b981',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 10,
    outlineStyle: 'none' as any,
  },
  searchIconContainer: {
    width: 16,
    height: 16,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#10b981',
    position: 'absolute',
    top: 1,
    left: 1,
  },
  searchIconLine: {
    width: 1.5,
    height: 5,
    backgroundColor: '#10b981',
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  categoryPillActive: {
    backgroundColor: '#10b981',
  },
  categoryPillInactive: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryPillText: {
    fontSize: 12,
  },
  categoryPillTextActive: {
    color: '#020617',
    fontWeight: 'bold',
  },
  categoryPillTextInactive: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  serviceDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  serviceDuration: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  servicePrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 70,
    alignItems: 'center',
  },
  addButtonInactive: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  addButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButtonTextInactive: {
    color: '#10b981',
  },
  addButtonTextActive: {
    color: '#020617',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  emptyBackButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBackButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#090b11',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginVertical: 8,
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: '47%',
    aspectRatio: 1.1,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  skeletonText: {
    width: '60%',
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cartBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
  },
  cartInfo: {
    flexDirection: 'column',
  },
  cartLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#020617',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  cartCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#020617',
    marginTop: 2,
  },
  checkoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutButtonEnabled: {
    backgroundColor: '#020617',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#334155',
  },
  checkoutButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkoutButtonTextEnabled: {
    color: '#ffffff',
  },
  checkoutButtonTextDisabled: {
    color: '#94a3b8',
  },
});
