import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useCatalogStore, Service } from '../stores/catalogStore';
import * as storage from '../utils/storage';
import { useTheme } from '../theme/ThemeContext';

export const ServiceDetailScreen = ({ navigation, route }: any) => {
  const { colors } = useTheme();
  const { serviceId } = route.params || {};
  const token = storage.getAccessToken() || '';
  
  const { fetchServiceById, isOffline } = useCatalogStore();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const details = await fetchServiceById(serviceId, token);
        setService(details);
      } catch (err) {
        console.error('Error fetching service details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [serviceId]);

  const handleBookNow = () => {
    if (isOffline || !service) return;
    navigation.navigate('BookingSummary', { serviceId: service.id });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Service not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Premium placeholder image */}
        <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={[styles.imagePlaceholder, { borderColor: colors.border }]}>
            <Text style={[styles.imagePlaceholderText, { color: colors.primary }]}>⭐ ALL CARE MINT PREMIUM SERVICE ⭐</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={[styles.serviceName, { color: colors.textPrimary }]} testID="txt-service-detail-name">
            {service.name}
          </Text>
          
          <Text style={[styles.servicePrice, { color: colors.primary }]} testID="txt-service-detail-price">
            ₹{parseInt(service.fixedPrice, 10)}
          </Text>

          {service.estimatedDuration && (
            <View style={styles.badgeRow}>
              <View style={[styles.durationBadge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
                <Text style={[styles.durationBadgeText, { color: colors.primary }]}>🕒 {service.estimatedDuration}</Text>
              </View>
            </View>
          )}

          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[styles.serviceDesc, { color: colors.textSecondary }]} testID="txt-service-detail-desc">
            {service.description || 'No description available for this service.'}
          </Text>
        </View>
      </ScrollView>

      {/* Full-width sticky bottom button */}
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
        >
          <Text
            style={[
              styles.bookButtonText,
              { color: isOffline ? colors.textMuted : colors.primaryForeground },
            ]}
          >
            {isOffline ? 'Offline — Booking Disabled' : 'Book Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  detailsContainer: {
    padding: 20,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  durationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  durationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  bookButton: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

