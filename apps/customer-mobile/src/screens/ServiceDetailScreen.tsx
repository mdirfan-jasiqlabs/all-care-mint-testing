import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCatalogStore, Service, Category } from '../stores/catalogStore';
import * as storage from '../utils/storage';
import { useTheme } from '../theme/ThemeContext';
import { getServiceFallbackImage, getServiceCategoryIcon } from '../utils/serviceFallbackImage';

export const ServiceDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { serviceId } = route.params || {};
  const token = storage.getAccessToken() || '';
  
  const { fetchServiceById, categories, isOffline } = useCatalogStore();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const topInsetPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 10);

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      try {
        const details = await fetchServiceById(serviceId, token);
        if (isMounted) {
          setService(details);
        }
      } catch (err) {
        console.error('Error fetching service details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [serviceId, token]);

  const handleBookNow = () => {
    if (isOffline || !service) return;
    navigation.navigate('BookingSummary', { serviceId: service.id });
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CatalogBrowse');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading service details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Header Bar for error view */}
        <View style={[
          styles.headerBar,
          {
            backgroundColor: colors.headerBackground,
            borderBottomColor: colors.headerBorder,
            paddingTop: topInsetPadding,
          }
        ]}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backPill, { backgroundColor: isLight ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.16)' }]}
            accessibilityLabel="Back to services"
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backPillText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Service Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>Service not found.</Text>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.errorBackButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.errorBackButtonText, { color: colors.primaryForeground }]}>Browse All Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const category = categories.find((c: Category) => c.id === service.categoryId);
  const categoryName = category?.name || null;
  const heroImageSource = imageFailed
    ? getServiceFallbackImage(null, null)
    : getServiceFallbackImage(service, categoryName);

  const iconName = getServiceCategoryIcon(service, categoryName);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle={isLight ? 'dark-content' : 'light-content'} backgroundColor={colors.headerBackground} />
      
      {/* 1. TOP NAVIGATION BAR */}
      <View style={[
        styles.headerBar,
        {
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.headerBorder,
          paddingTop: topInsetPadding,
        }
      ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backPill, { backgroundColor: isLight ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.16)' }]}
          accessibilityLabel="Back to catalog"
          testID="btn-back"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backPillText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Service Details</Text>
        
        {/* Right side spacer for top navigation balance */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. HERO SERVICE IMAGE SECTION */}
        <View style={styles.heroWrapper}>
          <View style={[styles.heroCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Image
              source={heroImageSource}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
            
            {/* Subtle Gradient & Badge Overlay */}
            <View style={styles.heroOverlay} />
            <View style={styles.badgeContainer}>
              <View style={[styles.heroBadge, { backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(13, 21, 39, 0.92)' }]}>
                <Ionicons name="star" size={14} color="#f59e0b" style={styles.starIcon} />
                <Text style={[styles.heroBadgeText, { color: isLight ? '#0f172a' : '#10b981' }]}>
                  ALL CARE MINT SERVICE
                </Text>
                <Ionicons name="star" size={14} color="#f59e0b" style={styles.starIcon} />
              </View>
            </View>
          </View>
        </View>

        {/* 3. SERVICE INFORMATION CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.serviceHeaderRow}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name={iconName as any} size={28} color={colors.primary} />
            </View>

            <View style={styles.serviceTitleCol}>
              <Text style={[styles.serviceName, { color: colors.textPrimary }]} testID="txt-service-detail-name">
                {service.name}
              </Text>

              <Text style={[styles.servicePrice, { color: colors.primary }]} testID="txt-service-detail-price">
                ₹{parseInt(service.fixedPrice, 10)}
              </Text>

              {service.estimatedDuration && (
                <View style={styles.durationChipRow}>
                  <View style={[styles.durationBadge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} style={styles.clockIcon} />
                    <Text style={[styles.durationBadgeText, { color: colors.primary }]}>
                      {service.estimatedDuration}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Trust & Benefit Indicators Row */}
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <View style={[styles.trustIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>Verified Experts</Text>
            </View>

            <View style={styles.trustItem}>
              <View style={[styles.trustIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                <Ionicons name="pricetag" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>Transparent Pricing</Text>
            </View>

            <View style={styles.trustItem}>
              <View style={[styles.trustIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>On-Time Service</Text>
            </View>

            <View style={styles.trustItem}>
              <View style={[styles.trustIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                <Ionicons name="thumbs-up" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.textSecondary }]}>Instant Booking</Text>
            </View>
          </View>
        </View>

        {/* 4. DESCRIPTION CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Description</Text>
          </View>

          <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} testID="txt-service-detail-desc">
            {service.description || 'No description available for this service.'}
          </Text>
        </View>

      </ScrollView>

      {/* 5. STICKY BOTTOM BOOK NOW ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleBookNow}
          disabled={isOffline}
          style={[
            styles.bookButton,
            isOffline
              ? { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }
              : { backgroundColor: colors.primary },
          ]}
          testID="btn-book-now"
          accessibilityLabel="Book Now"
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.bookButtonText,
              { color: isOffline ? colors.textMuted : colors.primaryForeground },
            ]}
          >
            {isOffline ? 'Offline — Booking Disabled' : 'Book Now'}
          </Text>
          {!isOffline && (
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} style={styles.ctaArrowIcon} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // Header Bar
  headerBar: {
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 64,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 110, // Ensure bottom content is never obscured by sticky CTA
  },

  // Hero Section
  heroWrapper: {
    marginBottom: 16,
  },
  heroCard: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginHorizontal: 6,
  },
  starIcon: {
    marginTop: -1,
  },

  // Cards
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceTitleCol: {
    flex: 1,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  durationChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  clockIcon: {
    marginRight: 5,
  },
  durationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  // Trust Indicators
  trustGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  trustIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  trustLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Description Section
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  serviceDesc: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '400',
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBackButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorBackButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Sticky Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bookButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ctaArrowIcon: {
    marginLeft: 8,
  },
});
