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

export const ServiceDetailScreen = ({ navigation, route }: any) => {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Service not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Premium placeholder image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>⭐ ALL CARE MINT PREMIUM SERVICE ⭐</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.serviceName} testID="txt-service-detail-name">
            {service.name}
          </Text>
          
          <Text style={styles.servicePrice} testID="txt-service-detail-price">
            ₹{parseInt(service.fixedPrice, 10)}
          </Text>

          {service.estimatedDuration && (
            <View style={styles.badgeRow}>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>🕒 {service.estimatedDuration}</Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.serviceDesc} testID="txt-service-detail-desc">
            {service.description || 'No description available for this service.'}
          </Text>
        </View>
      </ScrollView>

      {/* Full-width sticky bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleBookNow}
          disabled={isOffline}
          style={[
            styles.bookButton,
            isOffline ? styles.bookButtonDisabled : styles.bookButtonEnabled
          ]}
          testID="btn-book-now"
          accessibilityLabel="Book Now"
        >
          <Text style={[
            styles.bookButtonText,
            isOffline ? styles.bookButtonTextDisabled : styles.bookButtonTextEnabled
          ]}>
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
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: 'hsl(222, 47%, 11%)',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imagePlaceholderText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  detailsContainer: {
    padding: 20,
  },
  serviceName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  servicePrice: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  durationBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  durationBadgeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceDesc: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'hsl(224, 71%, 4%)',
    borderTopWidth: 1,
    borderTopColor: 'hsl(217, 32%, 17%)',
  },
  bookButton: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonEnabled: {
    backgroundColor: '#10b981',
  },
  bookButtonDisabled: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookButtonTextEnabled: {
    color: '#090b11',
  },
  bookButtonTextDisabled: {
    color: '#64748b',
  },
});
