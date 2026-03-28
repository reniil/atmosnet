import { Barometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { DeviceMotion } from 'expo-sensors';

export interface SensorData {
  pressure_hpa: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  isMoving: boolean;
  batteryLevel: number;
}

/**
 * Check if barometer is available
 */
export async function isBarometerAvailable(): Promise<boolean> {
  return await Barometer.isAvailableAsync();
}

/**
 * Get current barometric pressure
 */
export async function getPressure(): Promise<number | null> {
  try {
    const data = await Barometer.getCurrentPressureAsync?.() || await Barometer.watchPressureAsync(() => {});
    // @ts-ignore
    return data?.pressure || null;
  } catch {
    return null;
  }
}

/**
 * Request location permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }
  
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return backgroundStatus === 'granted';
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return location;
  } catch {
    return null;
  }
}

/**
 * Get current battery level
 */
export async function getBatteryLevel(): Promise<number> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level || 1.0;
  } catch {
    return 1.0;
  }
}

/**
 * Check if device is moving
 * Uses accelerometer data
 */
export async function isDeviceMoving(): Promise<boolean> {
  try {
    const motion = await DeviceMotion.getCurrentMotionAsync?.();
    if (motion && motion.acceleration) {
      const magnitude = Math.sqrt(
        Math.pow(motion.acceleration.x || 0, 2) +
        Math.pow(motion.acceleration.y || 0, 2) +
        Math.pow(motion.acceleration.z || 0, 2)
      );
      // Threshold for movement detection
      return magnitude > 0.5;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Collect all sensor data
 */
export async function collectSensorData(): Promise<SensorData> {
  const [pressure, location, batteryLevel] = await Promise.all([
    getPressure(),
    getCurrentLocation(),
    getBatteryLevel()
  ]);
  
  const isMoving = await isDeviceMoving();
  
  return {
    pressure_hpa: pressure,
    latitude: location?.coords.latitude || null,
    longitude: location?.coords.longitude || null,
    altitude: location?.coords.altitude || null,
    isMoving,
    batteryLevel
  };
}

/**
 * Check if we should collect data based on battery and conditions
 */
export async function shouldCollectData(): Promise<boolean> {
  const batteryLevel = await getBatteryLevel();
  
  // Stop if battery below 20%
  if (batteryLevel < 0.20) {
    return false;
  }
  
  return true;
}

/**
 * Get collection interval based on movement
 */
export function getCollectionInterval(isMoving: boolean): number {
  // Poll every 15 minutes when stationary, 5 minutes when moving
  return isMoving ? 5 * 60 * 1000 : 15 * 60 * 1000;
}
