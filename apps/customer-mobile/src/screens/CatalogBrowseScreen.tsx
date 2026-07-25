import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Platform,
  Alert,
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
  const { categories, servicesByCategory, isLoading, error, fetchCategories, fetchServices } = useCatalogStore();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Service[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    fetchCategories(token);
  }, []);

  // Fetch services for all categories when categories list changes
  useEffect(() => {
    if (categories && categories.length > 0) {
      categories.forEach((cat) => {
        fetchServices(cat.id, token);
      });
    }
  }, [categories]);

  // Combine services from store
  const allServices = Object.values(servicesByCategory).flat();

  // Filter based on selected category and search query
  const getSelectedServices = () => {
    let services: Service[] = [];
    if (selectedCategory === 'All') {
      const seen = new Set();
      services = allServices.filter(svc => {
        const duplicate = seen.has(svc.id);
        seen.add(svc.id);
        return !duplicate;
      });
    } else {
      const activeCat = categories.find(c => c.name === selectedCategory);
      if (activeCat) {
        services = servicesByCategory[activeCat.id] || [];
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter(svc => 
        svc.name.toLowerCase().includes(query) ||
        (svc.description && svc.description.toLowerCase().includes(query))
      );
    }
    return services;
  };

  const currentServices = getSelectedServices();

  const toggleCart = (svc: Service) => {
    if (cart.some(item => item.id === svc.id)) {
      setCart(cart.filter(item => item.id !== svc.id));
    } else {
      setCart([...cart, svc]);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.fixedPrice), 0);
  };

  const handleCheckout = () => {
    Alert.alert(
      "Success",
      `Redirecting Customer to Bookings Lifecycle View (/booking/checkout) with total price ₹${getCartTotal()}`,
      [{ text: "OK", onPress: () => setCart([]) }]
    );
  };

  const renderServiceCard = ({ item }: { item: Service }) => {
    const inCart = cart.some(cartItem => cartItem.id === item.id);
    return (
      <View style={styles.serviceCard}>
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
        >
          <Text style={[
            styles.addButtonText,
            inCart ? styles.addButtonTextActive : styles.addButtonTextInactive
          ]}>
            {inCart ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        {/* Phone Simulated Status Bar Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←  9:41</Text>
          </TouchableOpacity>
          
          <View style={styles.badgeRow}>
            <View style={[styles.badge, styles.badgeOnline]}>
              <Text style={[styles.badgeText, styles.badgeTextOnline]}>Online</Text>
            </View>
            <View style={[styles.badge, styles.badgeEtag]}>
              <Text style={[styles.badgeText, styles.badgeTextEtag]}>ETag Match</Text>
            </View>
          </View>
        </View>

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
        
        <View style={styles.sliderWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesSlider}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory('All')}
              style={[
                styles.categoryPill,
                selectedCategory === 'All' ? styles.categoryPillActive : styles.categoryPillInactive
              ]}
            >
              <Text style={[
                styles.categoryPillText,
                selectedCategory === 'All' ? styles.categoryPillTextActive : styles.categoryPillTextInactive
              ]}>All</Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.name)}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.name ? styles.categoryPillActive : styles.categoryPillInactive
                ]}
              >
                <Text style={[
                  styles.categoryPillText,
                  selectedCategory === cat.name ? styles.categoryPillTextActive : styles.categoryPillTextInactive
                ]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active Services List Section Header */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>
            {selectedCategory === 'All' ? 'ALL SERVICES' : `${selectedCategory.toUpperCase()} SERVICES`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={currentServices}
          renderItem={renderServiceCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No services found matching "{searchQuery}"</Text>
          }
        />
      )}

      {/* Sticky Bottom Cart Banner */}
      {cart.length > 0 && (
        <View style={styles.cartBanner}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartLabel}>TOTAL ADDED ITEMS</Text>
            <Text style={styles.cartCountText}>
              {cart.length} {cart.length === 1 ? 'Item' : 'Items'} (₹{getCartTotal()})
            </Text>
          </View>
          <TouchableOpacity onPress={handleCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Book Now ➔</Text>
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
    ...Platform.select({
      web: {
        position: 'absolute' as any,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%' as any,
        overflow: 'hidden' as any,
      }
    })
  },
  list: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
      }
    })
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    marginBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
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
    backgroundColor: '#1e293b',
  },
  badgeEtag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  badgeTextOnline: {
    color: '#94a3b8',
  },
  badgeTextEtag: {
    color: '#10b981',
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
  sliderWrapper: {
    marginVertical: 8,
  },
  categoriesSlider: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#10b981',
  },
  categoryPillInactive: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryPillTextActive: {
    color: '#090b11',
  },
  categoryPillTextInactive: {
    color: '#94a3b8',
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
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
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
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
