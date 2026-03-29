import { create } from 'zustand';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo from '@react-native-community/netinfo';

import { collectSensorData, shouldCollectData, getCollectionInterval, roundToGrid, validateObservation } from '../utils/sensors';
import { getDeviceIdHash } from '../utils/crypto';
import { submitObservation, getPointsBalance, getNetworkStats } from '../services/api';

const BACKGROUND_TASK = 'atmosnet-background-collection';

interface SensorsState {
  isCollecting: boolean;
  lastObservation: Date | null;
  totalContributions: number;
  currentStreak: number;
  pointsBalance: number;
  error: string | null;
  lastLocation: { lat: number; lng: number; accuracy: number } | null;
  sensorStatus: {
    gps: boolean;
    barometer: boolean;
    battery: number;
    network: boolean;
  };
  
  // Actions
  initializeSensors: () => Promise<void>;
  startCollection: () => Promise<void>;
  stopCollection: () => Promise<void>;
  submitObservation: () => Promise<{ success: boolean; message: string; points?: number }>;
  refreshStats: () => Promise<void>;
  getSensorStatus: () => Promise<void>;
}

export const useSensorsStore = create<SensorsState>((set, get) => ({
  isCollecting: false,
  lastObservation: null,
  totalContributions: 0,
  currentStreak: 0,
  pointsBalance: 0,
  error: null,
  lastLocation: null,
  sensorStatus: {
    gps: false,
    barometer: false,
    battery: 1.0,
    network: false,
  },
  
  initializeSensors: async () => {
    try {
      // Register background task
      TaskManager.defineTask(BACKGROUND_TASK, async () => {
        try {
          const { canCollect, reason } = await shouldCollectData();
          if (!canCollect) {
            console.log('Skipping collection:', reason);
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          const netInfo = await NetInfo.fetch();
          if (!netInfo.isConnected) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          const result = await get().submitObservation();
          return result.success 
            ? BackgroundFetch.BackgroundFetchResult.NewData 
            : BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.error('Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
      
      // Register background fetch
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
          minimumInterval: 5 * 60, // 5 minutes
        });
      } catch (error) {
        console.log('Background fetch registration failed:', error);
      }
      
      // Check sensor availability
      await get().getSensorStatus();
      
      // Try to load previous stats
      await get().refreshStats();
      
    } catch (error) {
      console.error('Initialize sensors error:', error);
      set({ error: 'Failed to initialize sensors' });
    }
  },
  
  getSensorStatus: async () => {
    try {
      const netInfo = await NetInfo.fetch();
      const data = await collectSensorData();
      
      set({
        sensorStatus: {
          gps: !!(data.latitude && data.longitude),
          barometer: !!data.pressure_hpa,
          battery: data.batteryLevel,
          network: !!(netInfo.isConnected),
        },
        lastLocation: data.latitude && data.longitude 
          ? { lat: data.latitude, lng: data.longitude, accuracy: data.accuracy || 0 }
          : get().lastLocation,
      });
    } catch (error) {
      console.error('Sensor status error:', error);
    }
  },
  
  startCollection: async () => {
    const { canCollect, reason } = await shouldCollectData();
    if (!canCollect) {
      set({ error: reason || 'Cannot collect data' });
      return;
    }
    set({ isCollecting: true, error: null });
  },
  
  stopCollection: async () => {
    set({ isCollecting: false });
  },
  
  submitObservation: async () => {
    try {
      // Collect sensor data
      const sensorData = await collectSensorData();
      
      // Validate data quality
      const validation = validateObservation(sensorData);
      if (!validation.valid) {
        console.log('Validation issues:', validation.issues);
        // Still submit, let server decide
      }
      
      // Check if we have required data
      if (!sensorData.pressure_hpa || !sensorData.latitude || !sensorData.longitude) {
        return { 
          success: false, 
          message: 'Missing sensor data. Check GPS and barometer permissions.' 
        };
      }
      
      // Round coordinates for privacy
      const rounded = roundToGrid(sensorData.latitude, sensorData.longitude);
      
      // Get device hash
      const deviceIdHash = await getDeviceIdHash();
      
      // Create observation payload
      const observation = {
        device_id_hash: deviceIdHash,
        timestamp: sensorData.timestamp,
        pressure_hpa: sensorData.pressure_hpa,
        latitude_grid: rounded.lat,
        longitude_grid: rounded.lng,
        altitude_m: sensorData.altitude || undefined,
      };
      
      // Submit to API
      const result = await submitObservation(observation);
      
      set({
        lastObservation: new Date(sensorData.timestamp),
        totalContributions: get().totalContributions + 1,
        pointsBalance: get().pointsBalance + (result.points_awarded || 0),
        lastLocation: { 
          lat: sensorData.latitude, 
          lng: sensorData.longitude, 
          accuracy: sensorData.accuracy || 0 
        },
        error: null,
      });
      
      return { 
        success: true, 
        message: `Observation submitted! Confidence: ${result.confidence_score}%, Tier: ${result.tier}`,
        points: result.points_awarded,
      };
      
    } catch (error: any) {
      console.error('Submit observation error:', error);
      
      let message = 'Failed to submit observation';
      if (error.response?.status === 429) {
        message = 'Rate limited. Please wait 5 minutes between submissions.';
      } else if (error.code === 'NETWORK_ERROR') {
        message = 'Network error. Check your connection.';
      }
      
      set({ error: message });
      return { success: false, message };
    }
  },
  
  refreshStats: async () => {
    try {
      const deviceIdHash = await getDeviceIdHash();
      
      const [balanceResult, statsResult] = await Promise.all([
        getPointsBalance(deviceIdHash).catch(() => null),
        getNetworkStats().catch(() => null),
      ]);
      
      if (balanceResult) {
        set({
          pointsBalance: balanceResult.balance || 0,
          currentStreak: balanceResult.current_streak || 0,
        });
      }
      
    } catch (error) {
      console.error('Refresh stats error:', error);
    }
  },
}));

// Export background task name for registration
export { BACKGROUND_TASK };