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
} from 'react-native';

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

  const API_BASE = 'http://localhost:3000/api/v1';

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/providers/me/earnings`);
      const json = await res.json();
      if (json.success && json.data) {
        setTotalEarnings(json.data.total_earnings_inr || 0);
        setJobs(json.data.jobs || []);
      }
    } catch (e) {
      console.error('Failed to fetch provider earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const renderJobItem = ({ item }: { item: JobEarning }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.serviceName}>{item.service_name}</Text>
        <Text style={styles.amountText}>+₹{item.amount}</Text>
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
        <Text style={styles.headerTitle}>Earnings Summary</Text>
        <TouchableOpacity onPress={fetchEarnings} style={styles.refreshButton}>
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
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No completed job earnings found.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.booking_id}
          renderItem={renderJobItem}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 20,
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
    margin: 20,
    padding: 24,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10b981',
  },
  badgeContainer: {
    marginTop: 12,
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
    paddingHorizontal: 20,
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
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
