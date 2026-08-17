import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { useTheme } from '../theme/ThemeContext';

export default function SlotSelectionScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { serviceId, addressId } = route.params;

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toast Queue state
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  // Generate next 7 days for the date picker slider
  useEffect(() => {
    const datesList = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      datesList.push(dateString);
    }
    setDates(datesList);
    setSelectedDate(datesList[0]);
  }, []);

  const fetchSlots = async (date: string) => {
    try {
      setLoading(true);
      const data = await apiClient.get(
        `/api/v1/bookings/slots?service_id=${serviceId}&date=${date}`
      );
      if (data.success) {
        setSlots(data.data);
      }
    } catch (err) {
      showToast('Failed to load time slots.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const handleSelectSlot = async (slotId: string) => {
    try {
      setSubmitting(true);
      const data = await apiClient.post('/api/v1/bookings/slots/lock', {
        slotId,
        date: selectedDate,
      });

      if (!data.success) {
        throw new Error(
          data.error?.message ||
            data.message ||
            'This slot is already locked or booked. Please try another one.',
        );
      }

      // Lock succeeded. Navigate to summary page
      navigation.navigate('BookingSummary', {
        serviceId,
        addressId,
        slotId,
        date: selectedDate,
      });
    } catch (err: any) {
      showToast(err.message || 'Slot Unavailable', 'warning');
      // Reload slots to show updated availability
      fetchSlots(selectedDate);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDateItem = ({ item }: { item: string }) => {
    const dateObj = new Date(item);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dateObj.getDate();
    const isSelected = item === selectedDate;

    return (
      <TouchableOpacity
        style={[
          styles.datePill,
          isSelected
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
        ]}
        onPress={() => setSelectedDate(item)}
      >
        <Text style={[styles.dayNameText, { color: isSelected ? colors.primaryForeground : colors.textSecondary }]}>
          {dayName}
        </Text>
        <Text style={[styles.dayNumText, { color: isSelected ? colors.primaryForeground : colors.textPrimary }]}>
          {dayNum}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSlotItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.slotCard,
        {
          backgroundColor: item.isAvailable ? colors.card : colors.surfaceSecondary,
          borderColor: item.isAvailable ? colors.cardBorder : colors.borderSubtle,
          opacity: item.isAvailable ? 1 : 0.6,
        },
      ]}
      disabled={!item.isAvailable || submitting}
      onPress={() => handleSelectSlot(item.id)}
    >
      <Text style={[styles.slotLabel, { color: item.isAvailable ? colors.textPrimary : colors.textMuted }]}>
        {item.label}
      </Text>
      <Text
        style={[
          styles.slotStatus,
          { color: item.isAvailable ? colors.primary : colors.textMuted },
        ]}
      >
        {item.isAvailable ? 'Available →' : 'Booked/Locked'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Select Booking Slot</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose your preferred date and time slot</Text>
      </View>

      {/* Date Slider */}
      <View style={styles.sliderContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dates}
          keyExtractor={(item) => item}
          renderItem={renderDateItem}
          contentContainerStyle={styles.sliderContent}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={styles.scrollContainer}
          data={slots}
          keyExtractor={(item) => item.id}
          renderItem={renderSlotItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No slots available for this date.</Text>
          }
        />
      )}
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sliderContainer: {
    marginBottom: 24,
    height: 76,
  },
  sliderContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  datePill: {
    width: 60,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dayNumText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  slotCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  slotStatus: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});

