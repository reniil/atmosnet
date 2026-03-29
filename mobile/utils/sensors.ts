import { Barometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { DeviceMotion } from 'expo-sensors';

export interface SensorData {
  pressure_hpa: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null; // GPS accuracy in meters
  isMoving: boolean;
  batteryLevel: number;
  timestamp: string;
}

/**
 * Check if barometer is available
 */
export async function isBarometerAvailable(): Promise<boolean> {
  return await Barometer.isAvailableAsync();
}

/**
 * Get current barometric pressure with better accuracy
 */
export async function getPressure(): Promise<{ value: number | null; accuracy: number }> {
  try {
    // Try to get pressure with highest accuracy
    return new Promise((resolve) => {
      let subscription: { remove: () => void } | null = null;
      let readings: number[] = [];
      
      const timeout = setTimeout(() => {
        if (subscription) subscription.remove();
        const avg = readings.length > 0 
          ? readings.reduce((a, b) => a + b, 0) / readings.length 
          : null;
        resolve({ value: avg, accuracy: readings.length });
      }, 3000); // Collect for 3 seconds
      
      subscription = Barometer.watchPressureAsync((data) => {
        readings.push(data.pressure);
        if (readings.length >= 5) {
          clearTimeout(timeout);
          subscription?.remove();
          const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
          resolve({ value: avg, accuracy: readings.length });
        }
      });
    });
  } catch (error) {
    console.error('Barometer error:', error);
    return { value: null, accuracy: 0 };
  }
}

/**
 * Request all required permissions
 */
export async function requestAllPermissions(): Promise<{
  location: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
}> {
  // Request foreground location
  const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
  const locationGranted = locationStatus === 'granted';
  
  // Request background location
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  const backgroundLocationGranted = backgroundStatus === 'granted';
  
  return {
    location: locationGranted,
    backgroundLocation: backgroundLocationGranted,
    notifications: true, // Notifications are auto-granted in Expo
  };
}

/**
 * Get current location with HIGH accuracy for weather data
 */
export async function getCurrentLocation(): Promise<{
  location: Location.LocationObject | null;
  accuracy: number;
  provider: string;
}> {
  try {
    // Check if location services are enabled
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      console.warn('Location services disabled');
      return { location: null, accuracy: 0, provider: 'none' };
    }
    
    // Get last known location first (faster)
    const lastLocation = await Location.getLastKnownPositionAsync({});
    
    // Request high accuracy current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
      mayRequestStoreUsageKitPermission: true,
    });
    
    // Determine provider
    let provider = 'unknown';
    if (location.mocked) provider = 'mock';
    else if (location.accuracy && location.accuracy < 10) provider = 'GPS';
    else if (location.accuracy && location.accuracy < 50) provider = 'GPS+Network';
    else provider = 'Network';
    
    return {
      location,
      accuracy: location.accuracy || 0,
      provider,
    };
  } catch (error) {
    console.error('Location error:', error);
    
    // Try last known location as fallback
    const lastLocation = await Location.getLastKnownPositionAsync({});
    if (lastLocation) {
      return { location: lastLocation, accuracy: 100, provider: 'last-known' };
    }
    
    return { location: null, accuracy: 0, provider: 'none' };
  }
}

/**
 * Round coordinates to grid cell (~500m precision for privacy)
 */
export function roundToGrid(lat: number, lng: number, precision: number = 3): {
  lat: number;
  lng: number;
} {
  const factor = Math.pow(10, precision);
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
}

/**
 * Calculate approximate altitude from pressure
 * Uses standard atmosphere model
 */
export function calculateAltitude(pressure_hpa: number, seaLevelPressure: number = 1013.25): number {
  // Barometric formula
  const altitude = 44330 * (1 - Math.pow(pressure_hpa / seaLevelPressure, 0.1903));
  return Math.round(altitude * 10) / 10; // Round to 1 decimal
}

/**
 * Get current battery level
 */
export async function getBatteryLevel(): Promise<number> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? level : 1.0;
  } catch {
    return 1.0;
  }
}

/**
 * Check if device is stationary or moving
 */
export async function isDeviceMoving(): Promise<boolean> {
  try {
    const motion = await DeviceMotion.getCurrentMotionAsync();
    if (motion && motion.acceleration) {
      const magnitude = Math.sqrt(
        Math.pow(motion.acceleration.x || 0, 2) +
        Math.pow(motion.acceleration.y || 0, 2) +
        Math.pow(motion.acceleration.z || 0, 2)
      );
      // Device is moving if acceleration varies significantly from gravity (9.8)
      const deviation = Math.abs(magnitude - 9.8);
      return deviation > 2.0; // Moving threshold
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Collect all sensor data for observation
 */
export async function collectSensorData(): Promise<SensorData> {
  const [pressureData, locationData, batteryLevel] = await Promise.all([
    getPressure(),
    getCurrentLocation(),
    getBatteryLevel(),
  ]);
  
  const isMoving = await isDeviceMoving();
  
  return {
    pressure_hpa: pressureData.value,
    latitude: locationData.location?.coords.latitude || null,
    longitude: locationData.location?.coords.longitude || null,
    altitude: locationData.location?.coords.altitude || null,
    accuracy: locationData.accuracy,
    isMoving,
    batteryLevel,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if conditions are suitable for data collection
 */
export async function shouldCollectData(): Promise<{
  canCollect: boolean;
  reason?: string;
}> {
  // Check battery
  const batteryLevel = await getBatteryLevel();
  if (batteryLevel < 0.20) {
    return { canCollect: false, reason: 'Battery below 20%' };
  }
  
  // Check if device is in low power mode
  const lowPowerMode = await Battery.isLowPowerModeEnabledAsync();
  if (lowPowerMode) {
    return { canCollect: false, reason: 'Low power mode enabled' };
  }
  
  // Check location permissions
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { canCollect: false, reason: 'Location permission denied' };
  }
  
  return { canCollect: true };
}

/**
 * Get optimal collection interval based on movement and conditions
 */
export function getCollectionInterval(isMoving: boolean, accuracy: number): number {
  // Higher accuracy = longer interval (less frequent updates needed)
  // Moving = shorter interval (more dynamic conditions)
  
  if (isMoving) {
    return 3 * 60 * 1000; // 3 minutes when moving
  }
  
  if (accuracy < 10) {
    return 15 * 60 * 1000; // 15 minutes stationary, high accuracy
  }
  
  return 10 * 60 * 1000; // 10 minutes stationary, lower accuracy
}

/**
 * Validate observation data quality
 */
export function validateObservation(data: SensorData): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!data.pressure_hpa || data.pressure_hpa < 800 || data.pressure_hpa > 1100) {
    issues.push('Invalid pressure reading');
  }
  
  if (!data.latitude || !data.longitude) {
    issues.push('Missing location');
  }
  
  if (data.accuracy && data.accuracy > 100) {
    issues.push(`Low GPS accuracy: ${data.accuracy}m`);
  }
  
  if (data.batteryLevel < 0.15) {
    issues.push('Critical battery level');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}