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
import BottomNavBar from '../components/BottomNavBar';
import { useTheme } from '../theme/ThemeContext';
import { getServiceFallbackImage } from '../utils/serviceFallbackImage';

// Premium Magnifier Icon made from native Views (No emojis or dependencies)
const SearchIcon = () => (
  <View style={styles.searchIconContainer}>
    <View style={styles.searchIconCircle} />
    <View style={styles.searchIconLine} />
  </View>
);

export const CatalogBrowseScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
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
    const serviceIds = cart.map((item: Service) => item.id);
    navigation.navigate('BookingSummary', {
      serviceId: cart[0].id,
      serviceIds,
    });
  };

  const handleRetry = () => {
    fetchCategories(token);
  };

  const renderServiceCard = ({ item }: { item: Service }) => {
    const inCart = cart.some((cartItem: Service) => cartItem.id === item.id);
    const category = categories.find((c: Category) => c.id === item.categoryId);
    const serviceImageSource = getServiceFallbackImage(item, category?.name);

    return (
      <TouchableOpacity
        onPress={() => navigation.push('ServiceDetail', { serviceId: item.id })}
        style={[
          styles.serviceCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
        ]}
        testID={`service-card-${item.id}`}
        accessibilityLabel={`View details for ${item.name}`}
      >
        <Image
          source={serviceImageSource}
          style={styles.serviceThumbnail}
          resizeMode="cover"
        />

        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceName, { color: colors.textPrimary }]}>{item.name}</Text>
          {item.description && (
            <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
          )}
          {item.estimatedDuration && (
            <Text style={[styles.serviceDuration, { color: colors.textMuted }]}>Duration: {item.estimatedDuration}</Text>
          )}
          <Text style={[styles.servicePrice, { color: colors.primary }]}>₹{parseInt(item.fixedPrice, 10)}</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => toggleCart(item)}
          style={[
            styles.addButton,
            inCart
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.tabActiveBg, borderColor: colors.border },
          ]}
          testID={`btn-add-service-${item.id}`}
          accessibilityLabel={`Add ${item.name} to cart`}
        >
          <Text
            style={[
              styles.addButtonText,
              { color: inCart ? '#ffffff' : colors.primary },
            ]}
          >
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
        <View style={[styles.categoryPill, { backgroundColor: colors.surfaceSecondary, width: 80, opacity: 0.5 }]}>
          <View style={{ width: 40, height: 10, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
      )}
    />
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerWrapper}>

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
          {
            backgroundColor: colors.inputBackground,
            borderColor: isSearchFocused ? colors.primary : colors.inputBorder,
          },
        ]}>
          <SearchIcon />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText }]}
            placeholder="Search for home services..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {/* Service Categories Chips Section */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>SERVICE CATEGORIES</Text>
        </View>
        
        {isLoading && categories.length === 0 ? (
          renderSkeletons()
        ) : categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]} testID="txt-empty-categories">
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
                    isActive
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
                  ]}
                  accessibilityLabel={`Category ${item.name}`}
                  testID={item.id === 'all' ? 'category-card-all' : `category-card-${item.id}`}
                >
                  <Text style={[
                    styles.categoryPillText,
                    isActive ? { color: '#ffffff', fontWeight: 'bold' } : { color: colors.textSecondary, fontWeight: '600' }
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
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
            {selectedCategory === 'All' ? 'ALL SERVICES' : `${selectedCategory.toUpperCase()} SERVICES`}
          </Text>
        </View>
      </View>
    );
  };

  if (error && categories.length === 0) {
    const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('connection') || error.toLowerCase().includes('fetch');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText} testID="error-message">
            {isNetworkError 
              ? 'Unable to load services. Please check your connection.' 
              : 'Something went wrong. Please try again later.'}
          </Text>
          <TouchableOpacity 
            onPress={handleRetry} 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            testID="btn-retry"
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.list}
        data={currentServices}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]} testID="txt-empty-services">
              {selectedCategory === 'All'
                ? `No services found matching "${searchQuery}"`
                : 'No services available in this category yet'}
            </Text>
            {selectedCategory !== 'All' && (
              <TouchableOpacity onPress={() => setSelectedCategory('All')} style={[styles.emptyBackButton, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.emptyBackButtonText, { color: colors.textPrimary }]}>← Back to All</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Sticky Bottom Cart Banner */}
      {cart.length > 0 && (
        <View style={[styles.cartBanner, { backgroundColor: colors.primary }]} testID="cart-banner">
          <View style={styles.cartInfo}>
            <Text style={styles.cartLabel}>TOTAL ADDED ITEMS</Text>
            <Text style={styles.cartCountText} testID="cart-count">
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
            testID="btn-book-now-bottom"
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
      <BottomNavBar activeTab="Services" navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
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
    borderWidth: 1.5,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
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
  categoryPillText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 120,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  serviceThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  serviceDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  serviceDuration: {
    fontSize: 11,
    marginTop: 4,
  },
  servicePrice: {
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
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  emptyBackButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBackButtonText: {
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartBanner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 64,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 100,
    elevation: 100,
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

