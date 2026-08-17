import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemePreference } from '../theme/colors';

export const ThemeSwitcherModal: React.FC = () => {
  const { preference, colors, setPreference } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Icon corresponding to saved preference
  const getThemeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (preference) {
      case 'light':
        return 'sunny-outline';
      case 'dark':
        return 'moon-outline';
      case 'system':
      default:
        return 'desktop-outline';
    }
  };

  const handleSelectPreference = (pref: ThemePreference) => {
    setPreference(pref);
    setModalVisible(false);
  };

  const options: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', label: 'Light', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline' },
    { key: 'system', label: 'System', icon: 'desktop-outline' },
  ];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.themeButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityLabel="Change appearance"
        accessibilityRole="button"
        testID="btn-theme-switcher"
      >
        <Ionicons name={getThemeIcon()} size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.modalBackground,
                    borderColor: colors.border,
                  },
                ]}
                testID="theme-switcher-modal"
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Appearance</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Choose your preferred theme style
                </Text>

                <View style={styles.optionsList}>
                  {options.map((opt) => {
                    const isSelected = preference === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        style={({ pressed }) => [
                          styles.optionRow,
                          {
                            backgroundColor: isSelected
                              ? colors.tabActiveBg
                              : pressed
                              ? colors.surfaceSecondary
                              : 'transparent',
                            borderColor: isSelected ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => handleSelectPreference(opt.key)}
                        accessibilityLabel={`Select ${opt.label} theme`}
                        accessibilityState={{ selected: isSelected }}
                        testID={`btn-theme-option-${opt.key}`}
                      >
                        <View style={styles.optionLeft}>
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={[
                              styles.optionLabel,
                              {
                                color: isSelected ? colors.primary : colors.textPrimary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </View>

                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
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
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 15,
  },
});

export default ThemeSwitcherModal;
