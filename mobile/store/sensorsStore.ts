import { create } from 'zustand';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Alert } from 'react-native';

import { collectSensorData, shouldCollectData, getCollectionInterval } from '../utils/sensors';
import { getDeviceIdHash, roundCoordinates } from '../utils/crypto';
import { submitObservation } from '../services/api';
import NetInfo from '@react-native-community/netinfo';

const BACKGROUND_TASK = 'atmosnet-background-collection';

interface SensorsState {
  isCollecting: boolean;
  lastObservation: Date | null;
  totalContributions: number;
  error: string | null;
  
  // Actions
  initializeSensors: () => Promise<void>;
  startCollection: () => Promise<void>;
  stopCollection: () => Promise<void>;
  submitObservation: () => Promise<void>;
}

export const useSensorsStore = create<SensorsState>((set, get) => ({
  isCollecting: false,
  lastObservation: null,
  totalContributions: 0,
  error: null,
  
  initializeSensors: async () => {
    // Register background task
    TaskManager.defineTask(BACKGROUND_TASK, async () => {
      try {
        const shouldCollect = await shouldCollectData();
        if (!shouldCollect) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
        
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected || !netInfo.isWifiEnabled) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
        
        await get().submitObservation();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    
    // Register for background fetch
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
        minimumInterval: 5 * 60, // 5 minutes
      });
    } catch (error) {
      console.log('Background fetch registration:', error);
    }
  },
  
  startCollection: async () => {
    set({ isCollecting: true });
  },
  
  stopCollection: async () => {
    set({ isCollecting: false });
  },
  
  submitObservation: async () => {
    try {
      const sensorData = await collectSensorData();
      
      // Check if we have required data
      if (!sensorData.pressure_hpa || !sensorData.latitude || !sensorData.longitude) {
        console.log('Missing sensor data, skipping submission');
        return;
      }
      
      // Check battery
      if (sensorData.batteryLevel < 0.20) {
        console.log('Battery too low, skipping submission');
        return;
      }
      
      // Round coordinates to grid
      const rounded = roundCoordinates(sensorData.latitude, sensorData.longitude);
      
      // Get device hash
      const deviceIdHash = await getDeviceIdHash();
      
      // Create observation
      const observation = {
        device_id_hash: deviceIdHash,
        timestamp: new Date().toISOString(),
        pressure_hpa: sensorData.pressure_hpa,
        latitude_grid: rounded.lat,
        longitude_grid: rounded.lng,
        altitude_m: sensorData.altitude || undefined,
      };
      
      // Submit to API
      await submitObservation(observation);
      
      set({
        lastObservation: new Date(),
        totalContributions: get().totalContributions + 1,
        error: null,
      });
      
    } catch (error) {
      console.error('Failed to submit observation:', error);
      set({ error: 'Failed to submit observation' });
    }
  },
}));
