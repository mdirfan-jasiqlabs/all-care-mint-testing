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
import { ArrowLeft, RotateCw, Briefcase } from 'lucide-react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { useProviderTheme } from '../context/ProviderThemeContext';
import { ThemeHeaderButton } from '../components/ThemeHeaderButton';

interface JobEarning {
  booking_id: string;
  booking_reference: string;
  service_name: string;
  amount: number;
  completed_at: string;
}

export default function ProviderEarningsScreen({ navigation }: any) {
  const { colors, resolvedTheme } = useProviderTheme();
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
    <View style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.jobHeader}>
        <Text style={[styles.serviceName, { color: colors.textPrimary }]} numberOfLines={2} ellipsizeMode="tail">
          {item.service_name}
        </Text>
        <Text style={[styles.amountText, { color: colors.primary }]}>+₹{item.amount.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.jobFooter}>
        <Text style={[styles.refText, { color: colors.textMuted }]}>Ref: {item.booking_reference}</Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />

      {/* Title Bar */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Earnings Summary</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => fetchEarnings()} style={[styles.refreshButton, { backgroundColor: colors.statusAcceptedBg }]}>
            <RotateCw size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
          </TouchableOpacity>
          <ThemeHeaderButton style={styles.themeBtn} />
        </View>
      </View>

      {/* Earnings Summary Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
        <Text style={[styles.heroAmount, { color: colors.primary }]}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
        <View style={[styles.badgeContainer, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Completed Jobs</Text>
        </View>
      </View>

      {/* Completed Jobs Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Job Earnings Breakdown</Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{jobs.length} Jobs</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading earnings breakdown...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to Load Earnings</Text>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => fetchEarnings()}>
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Briefcase size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Completed Job Earnings</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
              tintColor={colors.primary}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 32) + 12 : 14,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshText: {
    fontWeight: '600',
    fontSize: 12,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 0,
  },
  heroCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
  },
  badgeContainer: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
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
  },
  sectionCount: {
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginRight: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
});

