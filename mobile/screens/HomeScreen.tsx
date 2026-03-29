import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getDeviceIdHash } from '../utils/crypto';
import { getPointsBalance, getNetworkStats } from '../services/api';
import { useSensorsStore } from '../store/sensorsStore';
import { collectSensorData, shouldCollectData, isBarometerAvailable } from '../utils/sensors';

export default function HomeScreen() {
  const [deviceIdHash, setDeviceIdHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sensorReady, setSensorReady] = useState(false);
  const [currentData, setCurrentData] = useState<{
    pressure: number | null;
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    battery: number;
    provider: string;
  } | null>(null);
  
  const { 
    submitObservation, 
    isCollecting, 
    totalContributions, 
    lastObservation,
    pointsBalance,
    currentStreak,
    sensorStatus,
    refreshStats,
  } = useSensorsStore();

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    const hash = await getDeviceIdHash();
    setDeviceIdHash(hash);
    await refreshStats();
    await checkSensors();
  };

  const checkSensors = async () => {
    try {
      const data = await collectSensorData();
      const canCollect = await shouldCollectData();
      setCurrentData({
        pressure: data.pressure_hpa,
        lat: data.latitude,
        lng: data.longitude,
        accuracy: data.accuracy,
        battery: data.batteryLevel,
        provider: data.accuracy && data.accuracy < 10 ? 'GPS' : data.accuracy && data.accuracy < 50 ? 'GPS+Network' : 'Network',
      });
      setSensorReady(canCollect.canCollect && !!data.pressure_hpa && !!data.latitude);
    } catch (error) {
      console.error('Sensor check error:', error);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitObservation();
      
      if (result.success) {
        Alert.alert(
          '✅ Observation Submitted!',
          `${result.message}\n\n+${result.points} AtmosPoints!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        Alert.alert('⚠️ Submission Failed', result.message);
      }
      
      await checkSensors();
      await refreshStats();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit observation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationAccuracyColor = (accuracy: number | null) => {
    if (!accuracy) return '#6b7280';
    if (accuracy < 10) return '#10b981';
    if (accuracy < 50) return '#f59e0b';
    return '#ef4444';
  };

  const getLocationAccuracyText = (accuracy: number | null) => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 10) return 'Excellent';
    if (accuracy < 50) return 'Good';
    if (accuracy < 100) return 'Fair';
    return 'Poor';
  };

  const formatCoordinate = (value: number | null, type: 'lat' | 'lng') => {
    if (value === null) return '--';
    const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${Math.abs(value).toFixed(6)}° ${direction}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isSubmitting} onRefresh={checkSensors} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AtmosNet</Text>
          <Text style={styles.subtitle}>Hyperlocal Weather Network</Text>
        </View>

        {/* Sensor Status */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color="#2563eb" />
            <Text style={styles.sensorTitle}>Sensor Status</Text>
          </View>
          <View style={styles.sensorGrid}>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, { backgroundColor: sensorStatus.gps ? '#10b981' : '#ef4444' }]} />
              <Text style={styles.sensorLabel}>GPS</Text>
            </View>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, { backgroundColor: sensorStatus.barometer ? '#10b981' : '#ef4444' }]} />
              <Text style={styles.sensorLabel}>Barometer</Text>
            </View>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, { backgroundColor: sensorStatus.battery > 0.2 ? '#10b981' : '#ef4444' }]} />
              <Text style={styles.sensorLabel}>Battery</Text>
            </View>
            <View style={styles.sensorItem}>
              <View style={[styles.sensorDot, { backgroundColor: sensorStatus.network ? '#10b981' : '#ef4444' }]} />
              <Text style={styles.sensorLabel}>Network</Text>
            </View>
          </View>
        </View>

        {/* Current Location & Weather */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <Ionicons name="location-outline" size={20} color="#2563eb" />
            <Text style={styles.weatherTitle}>Your Location</Text>
            <View style={[styles.accuracyBadge, { backgroundColor: getLocationAccuracyColor(currentData?.accuracy || null) }]}>
              <Text style={styles.accuracyText}>{getLocationAccuracyText(currentData?.accuracy || null)}</Text>
            </View>
          </View>
          
          <View style={styles.locationInfo}>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Latitude:</Text>
              <Text style={styles.coordValue}>{formatCoordinate(currentData?.lat || null, 'lat')}</Text>
            </View>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Longitude:</Text>
              <Text style={styles.coordValue}>{formatCoordinate(currentData?.lng || null, 'lng')}</Text>
            </View>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>GPS Accuracy:</Text>
              <Text style={styles.coordValue}>{currentData?.accuracy ? `±${currentData.accuracy.toFixed(0)}m` : '--'}</Text>
            </View>
            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>Provider:</Text>
              <Text style={styles.coordValue}>{currentData?.provider || '--'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.weatherData}>
            <View style={styles.weatherItem}>
              <Ionicons name="speedometer-outline" size={24} color="#6b7280" />
              <Text style={styles.weatherValue}>{currentData?.pressure ? `${currentData.pressure.toFixed(1)} hPa` : '-- hPa'}</Text>
              <Text style={styles.weatherLabel}>Pressure</Text>
            </View>
            <View style={styles.weatherItem}>
              <Ionicons name="battery-full-outline" size={24} color="#6b7280" />
              <Text style={styles.weatherValue}>{currentData?.battery ? `${Math.round(currentData.battery * 100)}%` : '--%'}</Text>
              <Text style={styles.weatherLabel}>Battery</Text>
            </View>
          </View>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <Ionicons name="wallet-outline" size={24} color="#fff" />
            <Text style={styles.pointsLabel}>AtmosPoints</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          </View>
          <Text style={styles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
          <Text style={styles.contributionsText}>
            {totalContributions} observations • Last: {lastObservation ? new Date(lastObservation).toLocaleTimeString() : 'Never'}
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!sensorReady || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleManualSubmit}
          disabled={!sensorReady || isSubmitting}
        >
          <Ionicons 
            name={isSubmitting ? "sync" : "cloud-upload-outline"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Observation'}
          </Text>
        </TouchableOpacity>

        {!sensorReady && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Enable location and barometer permissions to submit observations
            </Text>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Your phone's barometer and GPS collect weather data</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Data is validated against other nearby observations</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>Earn AtmosPoints for accurate, validated data</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 24, paddingBottom: 16, backgroundColor: '#2563eb' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  
  sensorCard: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sensorTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 8 },
  sensorGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  sensorItem: { alignItems: 'center' },
  sensorDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
  sensorLabel: { fontSize: 12, color: '#6b7280' },
  
  weatherCard: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  weatherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  weatherTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1, marginLeft: 8 },
  accuracyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  accuracyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  locationInfo: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 },
  coordRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  coordLabel: { fontSize: 14, color: '#6b7280' },
  coordValue: { fontSize: 14, fontWeight: '600', color: '#1f2937', fontFamily: 'monospace' },
  
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  
  weatherData: { flexDirection: 'row', justifyContent: 'space-around' },
  weatherItem: { alignItems: 'center' },
  weatherValue: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 4 },
  weatherLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  
  pointsCard: { margin: 16, padding: 20, backgroundColor: '#2563eb', borderRadius: 12 },
  pointsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 8, flex: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  streakEmoji: { fontSize: 14 },
  streakText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  pointsValue: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  contributionsText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  
  submitButton: { margin: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12 },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  warningCard: { margin: 16, marginTop: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', padding: 12, borderRadius: 8 },
  warningText: { color: '#92400e', fontSize: 14, marginLeft: 8, flex: 1 },
  
  infoCard: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  infoStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  stepText: { flex: 1, fontSize: 14, color: '#4b5563' },
});