import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/root.types';
import { registerCustomerPushToken } from '../services/notificationService';
import { useCatalogStore, Category, Service } from '../stores/catalogStore';
import * as storage from '../utils/storage';
import HeroCarousel from '../components/HeroCarousel';
import BottomNavBar from '../components/BottomNavBar';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Icon helper to map category names to appropriate vector icons
const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
  const name = categoryName.toLowerCase();
  if (name.includes('clean')) return 'sparkles-outline';
  if (name.includes('ac') || name.includes('air') || name.includes('cooling')) return 'snow-outline';
  if (name.includes('plumb')) return 'water-outline';
  if (name.includes('paint')) return 'color-palette-outline';
  if (name.includes('elder') || name.includes('senior')) return 'heart-outline';
  if (name.includes('baby') || name.includes('child') || name.includes('kid')) return 'happy-outline';
  if (name.includes('cook') || name.includes('meal') || name.includes('food')) return 'restaurant-outline';
  if (name.includes('appliance') || name.includes('repair')) return 'build-outline';
  if (name.includes('wellness') || name.includes('therapy') || name.includes('health')) return 'fitness-outline';
  if (name.includes('electric')) return 'flash-outline';
  return 'grid-outline';
};

// Fallback short description if data doesn't provide one
const getCategoryFallbackDesc = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('clean')) return 'Professional home cleaning and deep hygiene';
  if (name.includes('ac')) return 'Professional AC repair and servicing';
  if (name.includes('plumb')) return 'Expert plumbing repairs & installations';
  if (name.includes('paint')) return 'Professional home wall painting & decor';
  if (name.includes('elder')) return 'Compassionate care for your loved ones';
  if (name.includes('baby')) return 'Trusted care for your little ones';
  if (name.includes('cook')) return 'Hygienic & tasty home-cooked meals';
  if (name.includes('appliance')) return 'Expert repair & installation service';
  if (name.includes('wellness')) return 'Stay healthy with expert therapists';
  return 'Quality service by verified professionals';
};

export default function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const token = storage.getAccessToken() || '';

  const {
    categories,
    servicesByCategory,
    isLoading,
    error,
    isOffline,
    isStale,
    fetchCategories,
    fetchServicesByCategory,
  } = useCatalogStore();

  useEffect(() => {
    registerCustomerPushToken();
    fetchCategories(token);
  }, []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      categories.forEach((cat: Category) => {
        fetchServicesByCategory(cat.id, token);
      });
    }
  }, [categories]);

  // Determine grid columns dynamically based on screen width
  const numColumns = width >= 420 ? 3 : 2;
  const gridGap = 12;
  const containerPadding = 16;
  const cardWidth = (width - containerPadding * 2 - gridGap * (numColumns - 1)) / numColumns;

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CatalogBrowse', { token });
  };

  const handleViewAll = () => {
    navigation.navigate('CatalogBrowse', { token });
  };

  const handleNotificationPress = () => {
    navigation.navigate('NotificationSettings');
  };

  const handleBookNow = (categoryName?: string) => {
    navigation.navigate('CatalogBrowse', { token });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#060b13" />

      {/* Main Container */}
      <View style={styles.container}>
        {/* TOP HEADER */}
        <View style={styles.headerRow} testID="dashboard-header">
          <Text style={styles.headerTitle}>Dashboard</Text>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotificationPress}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
            testID="btn-notifications-header"
          >
            <Ionicons name="notifications-outline" size={22} color="#f8fafc" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* OFFLINE / STALE BADGE */}
        {(isOffline || isStale) && (
          <View style={styles.offlineBanner}>
            <Ionicons name="wifi-outline" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={styles.offlineText}>
              {isOffline ? 'You are offline. Showing cached catalog.' : 'Catalog data is cached.'}
            </Text>
          </View>
        )}

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HERO CAROUSEL */}
          <HeroCarousel onPressCTA={handleBookNow} />

          {/* SERVICE CATEGORIES SECTION */}
          <View style={styles.sectionContainer} testID="service-categories-section">
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Service Categories</Text>
              <TouchableOpacity
                onPress={handleViewAll}
                activeOpacity={0.7}
                accessibilityLabel="View All Services"
                testID="btn-view-all-categories"
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* CATEGORIES LOADING STATE */}
            {isLoading && categories.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            )}

            {/* CATEGORIES ERROR STATE */}
            {error && categories.length === 0 && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => fetchCategories(token)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* CATEGORIES GRID */}
            <View style={styles.gridContainer}>
              {categories.map((cat: Category) => {
                const iconName = getCategoryIcon(cat.name);
                const services: Service[] = servicesByCategory[cat.id] || [];

                // Calculate min starting price if services exist
                let minPriceText: string | null = null;
                if (services.length > 0) {
                  const prices = services
                    .map((s) => parseFloat(s.fixedPrice))
                    .filter((p) => !isNaN(p) && p > 0);
                  if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    minPriceText = `₹${Math.round(minPrice)}`;
                  }
                }

                const desc = cat.description || getCategoryFallbackDesc(cat.name);

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, { width: cardWidth }]}
                    onPress={() => handleCategoryPress(cat)}
                    activeOpacity={0.75}
                    accessibilityLabel={`Category ${cat.name}`}
                    testID={`category-card-${cat.id}`}
                  >
                    {/* Icon container */}
                    <View style={styles.categoryIconBox}>
                      <Ionicons name={iconName} size={22} color="#10b981" />
                    </View>

                    {/* Category Title */}
                    <Text style={styles.categoryTitle} numberOfLines={1}>
                      {cat.name}
                    </Text>

                    {/* Short Description */}
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {desc}
                    </Text>

                    {/* Bottom row: Price + Arrow */}
                    <View style={styles.categoryFooter}>
                      <View style={styles.priceRow}>
                        {minPriceText ? (
                          <>
                            <Text style={styles.priceValue}>{minPriceText}</Text>
                            <Text style={styles.priceSuffix}> onwards</Text>
                          </>
                        ) : (
                          <Text style={styles.priceSuffix}>Explore</Text>
                        )}
                      </View>

                      <View style={styles.arrowCircle}>
                        <Ionicons name="arrow-forward" size={13} color="#94a3b8" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* VERIFIED & TRUSTED PROFESSIONALS CARD */}
          <TouchableOpacity
            style={styles.trustCard}
            onPress={handleViewAll}
            activeOpacity={0.8}
            accessibilityLabel="Verified & Trusted Professionals"
            testID="card-verified-professionals"
          >
            <View style={styles.trustIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            </View>

            <View style={styles.trustTextContainer}>
              <Text style={styles.trustTitle}>Verified & Trusted Professionals</Text>
              <Text style={styles.trustSubtitle}>
                All our partners are background verified for your safety and peace of mind.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#64748b" style={styles.trustArrow} />
          </TouchableOpacity>
        </ScrollView>

        {/* BOTTOM NAVIGATION BAR */}
        <BottomNavBar activeTab="Home" navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#060b13',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#060b13',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#131b2e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0d1527',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#0d1527',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  offlineText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 13,
  },
  errorContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 155,
  },
  categoryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 11.5,
    color: '#94a3b8',
    lineHeight: 15,
    marginBottom: 12,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
    marginRight: 4,
  },
  priceValue: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },
  priceSuffix: {
    color: '#64748b',
    fontSize: 11,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustCard: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  trustSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  trustArrow: {
    marginLeft: 8,
  },
});
