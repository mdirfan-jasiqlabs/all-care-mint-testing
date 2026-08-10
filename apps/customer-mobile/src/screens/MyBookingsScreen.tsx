import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import NotificationBanner, { triggerInAppNotification } from '../components/NotificationBanner';
import BottomNavBar from '../components/BottomNavBar';

export default function MyBookingsScreen({ navigation, route }: any) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  const isFocused = useIsFocused();

  const previousStatuses = useRef<Map<string, string>>(new Map());

  // Fetch bookings based on activeTab
  const fetchBookings = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);

      const [currentRes, historyRes] = await Promise.all([
        apiClient.get(`/api/v1/bookings?filter=current&page=1&limit=50`).catch(() => null),
        apiClient.get(`/api/v1/bookings?filter=history&page=1&limit=50`).catch(() => null),
      ]);

      const currentList = currentRes?.success && Array.isArray(currentRes.data) ? currentRes.data : [];
      const historyList = historyRes?.success && Array.isArray(historyRes.data) ? historyRes.data : [];
      const allBookings = [...currentList, ...historyList];

      allBookings.forEach((b: any) => {
        const prevStatus = previousStatuses.current.get(b.id);
        if (prevStatus && prevStatus !== b.status) {
          let title = 'Booking Update';
          let body = `${b.bookingReference}: Status changed to ${b.status}`;

          if (b.status === 'ASSIGNED') {
            title = '🎉 Provider Assigned!';
            body = `A provider has been assigned for ${b.serviceNameSnapshot || 'your service'}.`;
          } else if (b.status === 'ACCEPTED') {
            title = '✅ Booking Accepted';
            body = `Provider has accepted your booking (${b.bookingReference}).`;
          } else if (b.status === 'ON_THE_WAY') {
            title = '🚗 Provider On The Way';
            body = `Your provider is on the way for ${b.serviceNameSnapshot}.`;
          } else if (b.status === 'STARTED') {
            title = '🛠️ Service Started';
            body = `Your service (${b.serviceNameSnapshot}) has started.`;
          } else if (b.status === 'COMPLETED') {
            title = '⭐ Service Completed!';
            body = `Your booking is completed. Please tap to leave a review!`;
          } else if (b.status === 'CANCELLED') {
            title = '❌ Booking Cancelled';
            body = `Booking ${b.bookingReference} has been cancelled.`;
          }

          triggerInAppNotification({
            title,
            body,
            bookingId: b.id,
          });
        }
        previousStatuses.current.set(b.id, b.status);
      });

      setBookings(activeTab === 'current' ? currentList : historyList);
    } catch (err) {
      if (!isPolling) console.error('Error fetching bookings:', err);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  // Fetch when screen is focused or tab changes, plus 5s poll interval
  useEffect(() => {
    fetchBookings();

    const pollInterval = setInterval(() => {
      fetchBookings(true);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isFocused, activeTab]);

  // Handle route params for toast notifications
  useEffect(() => {
    if (route.params?.toastMessage) {
      setToastMessage(route.params.toastMessage);
      
      // Clear route params so it doesn't show again
      navigation.setParams({ toastMessage: undefined });

      // Animate toast in
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }
  }, [route.params?.toastMessage]);

  const renderBadge = (status: string) => {
    let bgStyle = styles.badgePending;
    let textStyle = styles.badgeTextPending;

    switch (status) {
      case 'CANCELLED':
        bgStyle = styles.badgeCancelled;
        textStyle = styles.badgeTextCancelled;
        break;
      case 'COMPLETED':
        bgStyle = styles.badgeCompleted;
        textStyle = styles.badgeTextCompleted;
        break;
      case 'ASSIGNED':
      case 'ACCEPTED':
        bgStyle = styles.badgeAssigned;
        textStyle = styles.badgeTextAssigned;
        break;
      case 'ON_THE_WAY':
      case 'STARTED':
        bgStyle = styles.badgeProgress;
        textStyle = styles.badgeTextProgress;
        break;
    }

    return (
      <View style={[styles.badge, bgStyle]}>
        <Text style={[styles.badgeText, textStyle]}>{status}</Text>
      </View>
    );
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.slotDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.referenceText}>{item.bookingReference}</Text>
          {renderBadge(item.status)}
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.serviceText}>{item.serviceNameSnapshot}</Text>
          <Text style={styles.priceText}>₹{parseFloat(item.servicePriceSnapshot).toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            📅 {formattedDate} • {item.slotLabelSnapshot}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Tab Controls */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.activeTabButton]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
              Current Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Bookings */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="hsl(150, 84%, 40%)" />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No bookings found in this section.</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBookingItem}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </View>
      <NotificationBanner
        onPressBanner={(bookingId) => {
          if (bookingId) {
            navigation.navigate('BookingDetail', { bookingId });
          }
        }}
      />
      <BottomNavBar activeTab="MyBookings" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'hsl(222, 47%, 8%)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: 'hsl(150, 84%, 40%)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'hsl(215, 20%, 65%)',
  },
  activeTabText: {
    color: 'hsl(210, 40%, 98%)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'hsl(215, 20%, 65%)',
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    flex: 1,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'hsl(150, 84%, 45%)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: 'hsl(215, 20%, 65%)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgePending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  badgeTextPending: {
    color: '#fbbf24',
  },
  badgeAssigned: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  badgeTextAssigned: {
    color: '#60a5fa',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeTextCompleted: {
    color: '#34d399',
  },
  badgeCancelled: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeTextCancelled: {
    color: '#9ca3af',
  },
  badgeProgress: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  badgeTextProgress: {
    color: '#a78bfa',
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'hsl(222, 47%, 18%)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: 'hsl(150, 84%, 40%)',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      }
    })
  },
  toastText: {
    color: 'hsl(210, 40%, 98%)',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
