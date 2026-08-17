import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  View,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Sun, Moon, Monitor, Check, X } from 'lucide-react-native';
import { useProviderTheme } from '../context/ProviderThemeContext';
import { ProviderThemePreference } from '../utils/storage';

export const ThemeHeaderButton: React.FC<{ style?: any }> = ({ style }) => {
  const { preference, resolvedTheme, colors, setPreference } = useProviderTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const renderPreferenceIcon = (pref: ProviderThemePreference) => {
    switch (pref) {
      case 'light':
        return <Sun size={20} color={colors.textPrimary} />;
      case 'dark':
        return <Moon size={20} color={colors.textPrimary} />;
      case 'system':
      default:
        return <Monitor size={20} color={colors.textPrimary} />;
    }
  };

  const handleSelect = (pref: ProviderThemePreference) => {
    setPreference(pref);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, style]}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Change appearance"
        accessibilityRole="button"
        accessibilityHint="Opens theme selector modal for Light, Dark, or System mode"
        activeOpacity={0.7}
      >
        {renderPreferenceIcon(preference)}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: colors.backdrop }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalCard, { backgroundColor: colors.modalSurface, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Appearance</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                    accessibilityLabel="Close appearance selector"
                  >
                    <X size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsList}>
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { borderColor: preference === 'light' ? colors.primary : colors.border },
                      preference === 'light' && { backgroundColor: resolvedTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' },
                    ]}
                    onPress={() => handleSelect('light')}
                    accessibilityLabel="Light theme"
                    accessibilityState={{ selected: preference === 'light' }}
                  >
                    <View style={styles.optionLeft}>
                      <Sun size={22} color={colors.textPrimary} />
                      <View>
                        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Light</Text>
                        <Text style={[styles.optionSublabel, { color: colors.textMuted }]}>Always use light theme</Text>
                      </View>
                    </View>
                    {preference === 'light' && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { borderColor: preference === 'dark' ? colors.primary : colors.border },
                      preference === 'dark' && { backgroundColor: resolvedTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' },
                    ]}
                    onPress={() => handleSelect('dark')}
                    accessibilityLabel="Dark theme"
                    accessibilityState={{ selected: preference === 'dark' }}
                  >
                    <View style={styles.optionLeft}>
                      <Moon size={22} color={colors.textPrimary} />
                      <View>
                        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Dark</Text>
                        <Text style={[styles.optionSublabel, { color: colors.textMuted }]}>Always use dark theme</Text>
                      </View>
                    </View>
                    {preference === 'dark' && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      { borderColor: preference === 'system' ? colors.primary : colors.border },
                      preference === 'system' && { backgroundColor: resolvedTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' },
                    ]}
                    onPress={() => handleSelect('system')}
                    accessibilityLabel="System theme"
                    accessibilityState={{ selected: preference === 'system' }}
                  >
                    <View style={styles.optionLeft}>
                      <Monitor size={22} color={colors.textPrimary} />
                      <View>
                        <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>System</Text>
                        <Text style={[styles.optionSublabel, { color: colors.textMuted }]}>Follow device appearance</Text>
                      </View>
                    </View>
                    {preference === 'system' && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 16 : 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 6,
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSublabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

