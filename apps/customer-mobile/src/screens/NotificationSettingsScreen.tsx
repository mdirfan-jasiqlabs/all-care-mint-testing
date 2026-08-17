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
import { useTheme } from '../theme/ThemeContext';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NotificationSettings'>;

interface Props {
  navigation: NavigationProp;
}

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backArrow, { color: colors.textPrimary }]}>‹</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications Settings</Text>
        </TouchableOpacity>
        <View style={[styles.onlineBadge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
          <Text style={[styles.onlineBadgeText, { color: colors.primary }]}>Online</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {toastMessage ? (
          <View style={[styles.toastContainer, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
            <Text style={[styles.toastText, { color: colors.primary }]}>{toastMessage}</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
            validationError ? { borderColor: colors.danger } : null,
          ]}
        >
          {/* Master Switch */}
          <View style={styles.row}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Enable Push Notifications</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Register device for real-time updates</Text>
            </View>
            <Switch
              value={masterPushEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Departure Alerts */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, { color: masterPushEnabled ? colors.textPrimary : colors.textMuted }]}>
                Provider Departure Alerts
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Alert when specialist departs to site</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={departureAlerts}
              onValueChange={setDepartureAlerts}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Job Assignments */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, { color: masterPushEnabled ? colors.textPrimary : colors.textMuted }]}>
                Manual Job Assignments
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Alert partners of booking allocations</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={jobAssignments}
              onValueChange={setJobAssignments}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Promotions & Offers */}
          <View style={styles.subRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.rowTitle, { color: masterPushEnabled ? colors.textPrimary : colors.textMuted }]}>
                Promotions & Offers
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>Marketing discount offer updates</Text>
            </View>
            <Switch
              disabled={!masterPushEnabled}
              value={promotions}
              onValueChange={setPromotions}
              trackColor={{ false: colors.inputBorder, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {validationError ? (
            <Text style={[styles.errorMsg, { color: colors.danger }]}>{validationError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    marginRight: 8,
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    padding: 20,
  },
  toastContainer: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
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
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rowSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  errorMsg: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  saveBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

