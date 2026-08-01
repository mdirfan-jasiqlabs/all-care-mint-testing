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

export default function SlotSelectionScreen({ navigation, route }: any) {
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
        style={[styles.datePill, isSelected ? styles.datePillActive : styles.datePillInactive]}
        onPress={() => setSelectedDate(item)}
      >
        <Text style={[styles.dayNameText, isSelected ? styles.textActive : styles.textInactive]}>
          {dayName}
        </Text>
        <Text style={[styles.dayNumText, isSelected ? styles.textActive : styles.textInactive]}>
          {dayNum}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSlotItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.slotCard,
        !item.isAvailable && styles.slotCardDisabled,
      ]}
      disabled={!item.isAvailable || submitting}
      onPress={() => handleSelectSlot(item.id)}
    >
      <Text style={[styles.slotLabel, !item.isAvailable && styles.textDisabled]}>
        {item.label}
      </Text>
      <Text
        style={[
          styles.slotStatus,
          item.isAvailable ? styles.slotStatusAvailable : styles.slotStatusUnavailable,
        ]}
      >
        {item.isAvailable ? 'Available →' : 'Booked/Locked'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Booking Slot</Text>
        <Text style={styles.subtitle}>Choose your preferred date and time slot</Text>
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
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={styles.scrollContainer}
          data={slots}
          keyExtractor={(item) => item.id}
          renderItem={renderSlotItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No slots available for this date.</Text>
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
    backgroundColor: 'hsl(224, 71%, 4%)',
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
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
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
  datePillActive: {
    backgroundColor: '#10b981',
  },
  datePillInactive: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
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
  textActive: {
    color: '#090b11',
  },
  textInactive: {
    color: '#94a3b8',
  },
  listContent: {
    paddingBottom: 24,
  },
  slotCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotCardDisabled: {
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
    borderColor: 'rgba(255,255,255,0.03)',
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  textDisabled: {
    color: '#64748b',
  },
  slotStatus: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  slotStatusAvailable: {
    color: '#10b981',
  },
  slotStatusUnavailable: {
    color: '#475569',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
