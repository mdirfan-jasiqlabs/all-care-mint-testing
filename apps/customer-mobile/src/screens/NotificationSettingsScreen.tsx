import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NotificationSettings'>;

interface Props {
  navigation: NavigationProp;
}

export default function NotificationSettingsScreen({ navigation }: Props) {
  const [masterPushEnabled, setMasterPushEnabled] = useState(true);
  const [departureAlerts, setDepartureAlerts] = useState(true);
  const [jobAssignments, setJobAssignments] = useState(true);
  const [promotions, setPromotions] = useState(false);

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const handleMasterToggle = (value: boolean) => {
    setMasterPushEnabled(value);
    setValidationError('');
    setToastMessage('');
    if (!value) {
      setDepartureAlerts(false);
      setJobAssignments(false);
      setPromotions(false);
    } else {
      setDepartureAlerts(true);
      setJobAssignments(true);
    }
  };

  const handleSave = () => {
    setToastMessage('');
    if (!masterPushEnabled) {
      setValidationError('Push registration required. Please enable push notifications.');
      return;
    }

    setValidationError('');
    setSaving(true);

    setTimeout(() => {
      setSaving(false);
      setToastMessage('✅ Notification preferences synchronized successfully.');
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.headerTitle}>Notifications Settings</Text>
        </TouchableOpacity>
        <View style={styles.onlineBadge}>
          <Text style={styles.onlineBadgeText}>Online</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {toastMessage ? (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            validationError ? styles.cardError : null,
          ]}
        >
          {/* Master Switch */}
          <View style={styles.row}>
            <View style={styles.textContainer}>
              <Text style={styles.rowTitle}>Enable Push Notifications</Text>
              <Text style={styles.rowSubtitle}>Register device for real-time updates</Text>
            </View>
            <Switch
              value={masterPushEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: 'hsl(217, 32%, 17%)', true: 'hsl(150, 84%, 40%)' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.divider} />

          {/* Departure Alerts */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, !masterPushEnabled && styles.disabledText]}>
                Provider Departure Alerts
              </Text>
              <Text style={styles.rowSubtitle}>Alert when specialist departs to site</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={departureAlerts}
              onValueChange={setDepartureAlerts}
              trackColor={{ false: 'hsl(217, 32%, 17%)', true: 'hsl(150, 84%, 40%)' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Job Assignments */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, !masterPushEnabled && styles.disabledText]}>
                Manual Job Assignments
              </Text>
              <Text style={styles.rowSubtitle}>Alert partners of booking allocations</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={jobAssignments}
              onValueChange={setJobAssignments}
              trackColor={{ false: 'hsl(217, 32%, 17%)', true: 'hsl(150, 84%, 40%)' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Promotions & Offers */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, !masterPushEnabled && styles.disabledText]}>
                Promotions & Offers
              </Text>
              <Text style={styles.rowSubtitle}>Marketing discount offer updates</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={promotions}
              onValueChange={setPromotions}
              trackColor={{ false: 'hsl(217, 32%, 17%)', true: 'hsl(150, 84%, 40%)' }}
              thumbColor="#ffffff"
            />
          </View>

          {validationError ? (
            <Text style={styles.errorMsg}>{validationError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="hsl(224, 71%, 4%)" />
          ) : (
            <Text style={styles.saveBtnText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'hsl(217, 32%, 15%)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: 'hsl(210, 40%, 98%)',
    marginRight: 8,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    padding: 20,
  },
  toastContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  toastText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    marginBottom: 24,
  },
  cardError: {
    borderColor: 'hsl(350, 84%, 55%)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'hsl(217, 32%, 17%)',
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
  },
  disabledText: {
    color: 'hsl(215, 20%, 45%)',
  },
  rowSubtitle: {
    fontSize: 11,
    color: 'hsl(215, 20%, 65%)',
    marginTop: 2,
  },
  errorMsg: {
    color: 'hsl(350, 84%, 55%)',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: 'hsl(150, 84%, 40%)',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'hsl(224, 71%, 4%)',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
