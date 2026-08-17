import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type TabName = 'Home' | 'Services' | 'MyBookings' | 'Profile';

interface BottomNavBarProps {
  activeTab: TabName;
  navigation: any;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, navigation }) => {
  const { colors } = useTheme();

  const handleTabPress = (tab: TabName) => {
    if (tab === activeTab) return;

    switch (tab) {
      case 'Home':
        navigation.navigate('Home');
        break;
      case 'Services':
        navigation.navigate('CatalogBrowse');
        break;
      case 'MyBookings':
        navigation.navigate('MyBookings');
        break;
      case 'Profile':
        navigation.navigate('Profile');
        break;
    }
  };

  const tabs: { name: TabName; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
    {
      name: 'Home',
      label: 'Home',
      activeIcon: 'home',
      inactiveIcon: 'home-outline',
    },
    {
      name: 'Services',
      label: 'Services',
      activeIcon: 'grid',
      inactiveIcon: 'grid-outline',
    },
    {
      name: 'MyBookings',
      label: 'My Bookings',
      activeIcon: 'calendar',
      inactiveIcon: 'calendar-outline',
    },
    {
      name: 'Profile',
      label: 'Profile',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.navBackground,
          borderTopColor: colors.navBorder,
        },
      ]}
      testID="bottom-navigation-bar"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const iconName = isActive ? tab.activeIcon : tab.inactiveIcon;
        const color = isActive ? colors.tabActive : colors.tabInactive;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab`}
            testID={`tab-${tab.name.toLowerCase()}`}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && { backgroundColor: colors.tabActiveBg },
              ]}
            >
              <Ionicons name={iconName} size={22} color={color} />
            </View>
            <Text style={[styles.tabLabel, { color }, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 44,
  },
  iconContainer: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  activeTabLabel: {
    fontWeight: '700',
  },
});

export default BottomNavBar;

