import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Heatmap, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import * as Location from 'expo-location';
import { getNetworkStats } from '../services/api';
import { NetworkStats } from '../types';

// Mock heatmap data - in production this would come from the API
const MOCK_HEATMAP_DATA = [
  { latitude: 6.5244, longitude: 3.3792, weight: 1 },
  { latitude: 6.5244, longitude: 3.3792, weight: 1 },
  { latitude: 6.5244, longitude: 3.3792, weight: 1 },
  { latitude: 6.5250, longitude: 3.3800, weight: 0.8 },
  { latitude: 6.5230, longitude: 3.3780, weight: 0.6 },
  { latitude: 6.5260, longitude: 3.3820, weight: 0.7 },
];

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
      
      try {
        const networkStats = await getNetworkStats();
        setStats(networkStats);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
      
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading network map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Network Coverage</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.observations_24h?.toLocaleString() || '--'}</Text>
            <Text style={styles.statLabel}>24h Observations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats?.unique_devices_24h?.toLocaleString() || '--'}</Text>
            <Text style={styles.statLabel}>Active Devices</Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Heatmap overlay showing observation density */}
            {MOCK_HEATMAP_DATA.map((point, index) => (
              <Circle
                key={index}
                center={{ latitude: point.latitude, longitude: point.longitude }}
                radius={500}
                fillColor={`rgba(37, 99, 235, ${point.weight * 0.3})`}
                strokeColor={`rgba(37, 99, 235, ${point.weight})`}
                strokeWidth={2}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.noLocation}>
            <Ionicons name="location-off-outline" size={64} color="#9ca3af" />
            <Text style={styles.noLocationText}>Location access required</Text>
            <Text style={styles.noLocationSubtext}>
              Enable location to see network coverage in your area
            </Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Coverage Density</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb', opacity: 0.8 }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb', opacity: 0.5 }]} />
            <Text style={styles.legendText}>Medium</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb', opacity: 0.2 }]} />
            <Text style={styles.legendText}>Low</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  map: {
    flex: 1,
  },
  noLocation: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noLocationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noLocationSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  legend: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
