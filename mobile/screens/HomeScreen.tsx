import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getDeviceIdHash } from '../utils/crypto';
import { getPointsBalance } from '../services/api';
import { PointsBalance, NetworkStats } from '../types';
import { useSensorsStore } from '../store/sensorsStore';

export default function HomeScreen() {
  const [deviceIdHash, setDeviceIdHash] = useState('');
  const { submitObservation, isCollecting } = useSensorsStore();
  
  const { data: balance, isLoading, refetch } = useQuery({
    queryKey: ['balance', deviceIdHash],
    queryFn: () => getPointsBalance(deviceIdHash),
    enabled: !!deviceIdHash,
  });

  useEffect(() => {
    getDeviceIdHash().then(setDeviceIdHash);
  }, []);

  const handleManualSubmit = async () => {
    await submitObservation();
    refetch();
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '👍';
    return '⭐';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AtmosNet</Text>
          <Text style={styles.subtitle}>Hyperlocal Weather</Text>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <Ionicons name="wallet-outline" size={24} color="#fff" />
            <Text style={styles.pointsLabel}>AtmosPoints</Text>
          </View>
          <Text style={styles.pointsValue}>{balance?.balance.toLocaleString() || '0'}</Text>
          <View style={styles.pointsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{balance?.total_earned.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{balance?.total_redeemed.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Redeemed</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            <Text style={styles.streakEmoji}>{getStreakEmoji(balance?.current_streak || 0)}</Text>
            <View>
              <Text style={styles.streakValue}>{balance?.current_streak || 0} day streak</Text>
              <Text style={styles.streakLabel}>
                {balance?.contributions_today || 0} contributions today
              </Text>
            </View>
          </View>
          <View style={styles.streakProgress}>
            <View 
              style={[
                styles.streakProgressFill,
                { width: `${Math.min((balance?.contributions_today || 0) / 5 * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.streakHint}>
            {balance?.contributions_today >= 5 
              ? '✓ Daily bonus achieved!' 
              : `Contribute ${5 - (balance?.contributions_today || 0)} more for daily bonus`}
          </Text>
        </View>

        {/* Current Weather */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <Ionicons name="partly-sunny-outline" size={24} color="#f59e0b" />
            <Text style={styles.weatherTitle}>Your Location</Text>
          </View>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherTemp}>--°</Text>
            <Text style={styles.weatherDesc}>Waiting for data...</Text>
          </View>
          <View style={styles.weatherDetails}>
            <View style={styles.weatherDetail}>
              <Ionicons name="water-outline" size={16} color="#6b7280" />
              <Text style={styles.weatherDetailText}>--%</Text>
            </View>
            <View style={styles.weatherDetail}>
              <Ionicons name="speedometer-outline" size={16} color="#6b7280" />
              <Text style={styles.weatherDetailText}>-- hPa</Text>
            </View>
          </View>
        </View>

        {/* Manual Submit */}
        <TouchableOpacity 
          style={[styles.submitButton, isCollecting && styles.submitButtonActive]}
          onPress={handleManualSubmit}
        >
          <Ionicons 
            name={isCollecting ? "sync" : "cloud-upload-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.submitButtonText}>
            {isCollecting ? 'Contributing...' : 'Submit Observation Now'}
          </Text>
        </TouchableOpacity>

        {/* Network Status */}
        <View style={styles.networkCard}>
          <Text style={styles.networkTitle}>Network Status</Text>
          <View style={styles.networkStatus}>
            <View style={[styles.statusDot, styles.statusActive]} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
          <Text style={styles.networkHint}>
            Data collection runs automatically when conditions are met
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  pointsCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: '#2563eb',
    borderRadius: 16,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  pointsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  streakCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  streakLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  streakProgress: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  streakProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  streakHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  weatherCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  weatherMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  weatherDesc: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherDetailText: {
    fontSize: 14,
    color: '#374151',
  },
  submitButton: {
    margin: 16,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonActive: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  networkCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  networkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
  },
  networkHint: {
    fontSize: 12,
    color: '#6b7280',
  },
});
