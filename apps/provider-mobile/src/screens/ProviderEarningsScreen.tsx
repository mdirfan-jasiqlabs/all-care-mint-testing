import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';

interface JobEarning {
  booking_id: string;
  booking_reference: string;
  service_name: string;
  amount: number;
  completed_at: string;
}

export default function ProviderEarningsScreen({ navigation }: any) {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [jobs, setJobs] = useState<JobEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const token = storage.getAccessToken();
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      navigation.replace('ProviderLogin');
      return;
    }

    try {
      const json = await apiClient.get('/api/v1/providers/me/earnings');
      const earningsData = json.data || json;
      if (typeof earningsData.total_earnings_inr === 'number') {
        setTotalEarnings(earningsData.total_earnings_inr);
        setJobs(earningsData.jobs || []);
      } else {
        throw new Error('Invalid earnings data payload');
      }
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) {
        storage.clearAccessToken();
        await storage.clearRefreshToken();
        navigation.replace('ProviderLogin');
        return;
      }
      console.error('Failed to fetch provider earnings:', e);
      setError(e.message || 'Failed to load earnings summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const renderJobItem = ({ item }: { item: JobEarning }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.serviceName} numberOfLines={2} ellipsizeMode="tail">
          {item.service_name}
        </Text>
        <Text style={styles.amountText}>+₹{item.amount.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.jobFooter}>
        <Text style={styles.refText}>Ref: {item.booking_reference}</Text>
        <Text style={styles.dateText}>
          {new Date(item.completed_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Title Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings Summary</Text>
        <TouchableOpacity onPress={() => fetchEarnings()} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings Summary Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Earnings</Text>
        <Text style={styles.heroAmount}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Completed Jobs</Text>
        </View>
      </View>

      {/* Completed Jobs Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Job Earnings Breakdown</Text>
        <Text style={styles.sectionCount}>{jobs.length} Jobs</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading earnings breakdown...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Earnings</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchEarnings()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>💼</Text>
          <Text style={styles.emptyTitle}>No Completed Job Earnings</Text>
          <Text style={styles.emptyText}>
            You currently have no completed bookings. Completed job earnings will be summarized here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.booking_id}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEarnings(true)}
              tintColor="#10b981"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) + 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
  },
  refreshText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
  heroCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#10b981',
  },
  badgeContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  jobCard: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginRight: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: {
    fontSize: 12,
    color: '#64748b',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
