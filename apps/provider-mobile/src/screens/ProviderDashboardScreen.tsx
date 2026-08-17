import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  FlatList,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, LogOut, ChevronRight, MapPin, ClipboardList } from 'lucide-react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { registerProviderPushToken } from '../services/notificationService';
import NotificationBanner, { triggerInAppNotification } from '../components/NotificationBanner';
import { useProviderTheme } from '../context/ProviderThemeContext';

export default function ProviderDashboardScreen({ navigation }: any) {
  const { colors, resolvedTheme } = useProviderTheme();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const previousJobIds = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchJobs = async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const url = activeTab === 'active'
        ? '/api/v1/providers/me/bookings?page=1&limit=20'
        : '/api/v1/providers/me/bookings/history?page=1&limit=20';

      const data = await apiClient.get(url);

      if (data.success && Array.isArray(data.data)) {
        if (activeTab === 'active') {
          const currentIds = new Set<string>(data.data.map((j: any) => String(j.id)));
          const newlyAssigned = data.data.filter(
            (j: any) => !previousJobIds.current.has(String(j.id))
          );

          if (isInitializedRef.current && newlyAssigned.length > 0) {
            newlyAssigned.forEach((latest: any) => {
              triggerInAppNotification({
                title: '🔔 New Job Assigned!',
                body: `${latest.bookingReference || 'Job'}: ${latest.serviceNameSnapshot || 'Service'} at ${latest.slotLabelSnapshot || ''}`,
                bookingId: latest.id,
              });
            });
          }
          previousJobIds.current = currentIds;
          isInitializedRef.current = true;
        }
        setJobs(data.data);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        storage.clearAccessToken();
        await storage.clearRefreshToken();
        navigation.replace('ProviderLogin');
        return;
      }
      if (!isPolling) showToast('Failed to retrieve jobs.', 'error');
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    registerProviderPushToken();
    fetchJobs();

    // 5-second poll interval for instant in-app assignment notification
    const pollInterval = setInterval(() => {
      fetchJobs(true);
    }, 5000);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchJobs();
    });
    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [activeTab]);

  useEffect(() => {
    const backAction = () => {
      // Return true to prevent default back action (popping stack)
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const handleLogout = async () => {
    const tokenVal = storage.getAccessToken();
    const refresh = await storage.getRefreshToken();

    if (tokenVal) {
      try {
        await apiClient.post('/api/v1/auth/logout', { refreshToken: refresh });
      } catch (e) {
        // ignore logout errors
      }
    }

    storage.clearAccessToken();
    await storage.clearRefreshToken();
    navigation.replace('ProviderLogin');
  };

  const renderJobItem = ({ item }: { item: any }) => {
    // Status colors from theme
    let statusBg = colors.surfaceSecondary;
    let statusColor = colors.textPrimary;
    if (item.status === 'ASSIGNED') { statusBg = colors.statusAssignedBg; statusColor = colors.statusAssignedText; }
    else if (item.status === 'ACCEPTED') { statusBg = colors.statusAcceptedBg; statusColor = colors.statusAcceptedText; }
    else if (item.status === 'ON_THE_WAY') { statusBg = colors.statusOnTheWayBg; statusColor = colors.statusOnTheWayText; }
    else if (item.status === 'STARTED') { statusBg = colors.statusStartedBg; statusColor = colors.statusStartedText; }
    else if (item.status === 'COMPLETED') { statusBg = colors.statusCompletedBg; statusColor = colors.statusCompletedText; }
    else if (item.status === 'CANCELLED') { statusBg = colors.statusCancelledBg; statusColor = colors.statusCancelledText; }

    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ProviderJobDetail', { bookingId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.refText, { color: colors.textMuted }]}>
            {item.bookingReference?.startsWith('ACM-') ? item.bookingReference : `ACM-${item.bookingReference}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardBodyLeft}>
            <Text style={[styles.serviceName, { color: colors.textPrimary }]}>{item.serviceNameSnapshot}</Text>
            <Text style={[styles.dateTime, { color: colors.textSecondary }]}>
              {new Date(item.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' • '}
              {item.slotLabelSnapshot}
            </Text>
            <View style={styles.addressRow}>
              <MapPin size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.address, { color: colors.textMuted }]}>
                {item.addressSnapshot?.label || 'Address'} — {item.addressSnapshot?.city || ''}
              </Text>
            </View>
          </View>

          <View style={styles.viewRow}>
            <Text style={[styles.viewText, { color: colors.primary }]}>Details</Text>
            <ChevronRight size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>

        {/* Partner Console Header Card */}
        <View style={[styles.consoleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.consoleCardTop}>
            <View style={styles.consoleTitleBlock}>
              <Text style={[styles.consoleTitle, { color: colors.textPrimary }]}>Partner Console</Text>
              <Text style={[styles.consoleSubtitle, { color: colors.textSecondary }]}>Manage your service jobs and schedule</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: colors.statusAssignedBg, borderColor: colors.info }]}>
              <Text style={[styles.roleBadgeText, { color: colors.info }]}>PROVIDER PARTNER</Text>
            </View>
          </View>

          <View style={[styles.actionBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity style={[styles.earningsBtn, { backgroundColor: colors.statusAcceptedBg, borderColor: colors.primary }]} onPress={() => navigation.navigate('ProviderEarnings')}>
              <View style={styles.btnLeft}>
                <CreditCard size={15} color={colors.primary} />
                <Text style={[styles.earningsBtnText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                  Earnings
                </Text>
              </View>
              <ChevronRight size={15} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <View style={styles.btnLeft}>
                <LogOut size={15} color="#ef4444" />
                <Text style={styles.logoutText} numberOfLines={1} ellipsizeMode="tail">
                  Sign Out
                </Text>
              </View>
              <ChevronRight size={15} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'active' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'active' ? '#ffffff' : colors.textMuted,
                  fontWeight: activeTab === 'active' ? 'bold' : '600',
                },
              ]}
            >
              Active Jobs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'history' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'history' ? '#ffffff' : colors.textMuted,
                  fontWeight: activeTab === 'history' ? 'bold' : '600',
                },
              ]}
            >
              Job History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            style={styles.scrollContainer}
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ClipboardList size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All Jobs Dispatched</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No pending jobs assigned in this section. Keep app active to receive new bookings.
                </Text>
              </View>
            }
          />
        )}

      </View>
      <NotificationBanner
        onPressBanner={(bookingId) => {
          if (bookingId) {
            navigation.navigate('ProviderJobDetail', { bookingId });
          }
        }}
      />
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
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
  scrollContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
      }
    })
  },
  consoleCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  consoleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  consoleTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  consoleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  consoleSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  actionBox: {
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  btnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  btnIcon: {
    fontSize: 14,
  },
  earningsArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutArrow: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardBodyLeft: {
    flex: 1,
    marginRight: 8,
  },
  refText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateTime: {
    fontSize: 13,
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  address: {
    fontSize: 12,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewText: {
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  earningsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  earningsBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
    flexShrink: 1,
  },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13,
    flexShrink: 1,
  },
});


