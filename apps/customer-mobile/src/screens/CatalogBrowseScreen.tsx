import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCatalogStore, Category } from '../stores/catalogStore';
import * as storage from '../utils/storage';

export const CatalogBrowseScreen = ({ navigation, route }: any) => {
  const token = route?.params?.token || storage.getAccessToken() || '';
  const { categories, isLoading, error, fetchCategories } = useCatalogStore();

  useEffect(() => {
    fetchCategories(token);
  }, []);

  const renderCategoryCard = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ServiceList', { categoryId: item.id, categoryName: item.name, token })}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{item.name.charAt(0)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.name}</Text>
      {item.description && <Text style={styles.cardSub} numberOfLines={2}>{item.description}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>All Care Services</Text>
      <Text style={styles.headerSubtitle}>Select a category to explore professional services</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b11',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 30,
  },
});
