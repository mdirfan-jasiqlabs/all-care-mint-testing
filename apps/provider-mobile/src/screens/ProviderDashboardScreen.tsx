import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  FlatList,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import * as storage from '../utils/storage';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';

export default function ProviderDashboardScreen({ navigation }: any) {
  const token = storage.getAccessToken() || '';
  const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://localhost:3000');

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const url = activeTab === 'active' 
        ? `${baseUrl}/api/v1/providers/me/bookings?page=1&limit=20`
        : `${baseUrl}/api/v1/providers/me/bookings/history?page=1&limit=20`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          storage.clearAccessToken();
          await storage.clearRefreshToken();
          navigation.replace('ProviderLogin');
          return;
        }
        throw new Error('Failed to load jobs list.');
      }

      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (err) {
      showToast('Failed to retrieve jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Refresh list on focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchJobs();
    });
    return unsubscribe;
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
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenVal}`,
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch (e) {
        // ignore logout errors
      }
    }

    storage.clearAccessToken();
    await storage.clearRefreshToken();
    navigation.replace('ProviderLogin');
  };

  const renderJobItem = ({ item }: { item: any }) => {
    // Status colors
    let statusBg = 'rgba(255,255,255,0.08)';
    let statusColor = '#fff';
    if (item.status === 'ASSIGNED') { statusBg = 'rgba(59, 130, 246, 0.15)'; statusColor = '#3b82f6'; }
    else if (item.status === 'ACCEPTED') { statusBg = 'rgba(16, 185, 129, 0.15)'; statusColor = '#10b981'; }
    else if (item.status === 'ON_THE_WAY') { statusBg = 'rgba(251, 191, 36, 0.15)'; statusColor = '#fbbf24'; }
    else if (item.status === 'STARTED') { statusBg = 'rgba(168, 85, 247, 0.15)'; statusColor = '#a855f7'; }
    else if (item.status === 'COMPLETED') { statusBg = 'rgba(16, 185, 129, 0.2)'; statusColor = '#10b981'; }
    else if (item.status === 'CANCELLED') { statusBg = 'rgba(239, 68, 68, 0.15)'; statusColor = '#ef4444'; }

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.navigate('ProviderJobDetail', { bookingId: item.id })}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.refText}>ACM-{item.bookingReference}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusBg }
              ]}
            >
              <Text style={{ color: statusColor, fontSize: 10, fontWeight: 'bold' }}>
                {item.status}
              </Text>
            </View>
          </View>

          <Text style={styles.serviceName}>{item.serviceNameSnapshot}</Text>
          <Text style={styles.dateTime}>
            {new Date(item.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' • '}
            {item.slotLabelSnapshot}
          </Text>
          <Text style={styles.address}>
            📍 {item.addressSnapshot.label} — {item.addressSnapshot.city}
          </Text>
        </View>
        <Text style={styles.viewText}>Details →</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>Partner Console</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>PROVIDER PARTNER</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Manage your service jobs and schedule</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.earningsBtn} onPress={() => navigation.navigate('ProviderEarnings')}>
              <Text style={styles.earningsBtnText}>💰 Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Job History</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            style={styles.scrollContainer}
            data={jobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={styles.emptyTitle}>All Jobs Dispatched</Text>
                <Text style={styles.emptyText}>No pending jobs assigned in this section. Keep app active to receive new bookings.</Text>
              </View>
            }
          />
        )}

      </View>
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
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
    padding: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'android' ? 24 : 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  jobCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  refText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
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
    color: '#ffffff',
  },
  dateTime: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 4,
  },
  address: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  viewText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: 'hsl(210, 40%, 98%)',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  roleBadge: {
    backgroundColor: 'hsl(204, 80%, 10%)',
    borderWidth: 1,
    borderColor: 'hsl(204, 60%, 20%)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: 'hsl(199, 89%, 60%)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  earningsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  earningsBtnText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
});

