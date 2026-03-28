import { SHA256 } from 'crypto-es';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'atmosnet_device_id';
const SALT = 'atmosnet_v1_2024';

/**
 * Get or create a persistent device ID
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate new device ID
    deviceId = generateDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}_${random}_${generateRandomString(16)}`;
}

/**
 * Generate random string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Hash device ID for server communication
 * Returns 64-character hex string (SHA-256)
 */
export async function getDeviceIdHash(): Promise<string> {
  const deviceId = await getDeviceId();
  // Hash with salt: SHA256(salt + device_id)
  return SHA256(SALT + deviceId).toString();
}

/**
 * Round GPS coordinates to 500m grid
 * At equator: 1 degree ≈ 111km, so 500m ≈ 0.0045 degrees
 * We use 4 decimal places which gives ~11m precision, 
 * then round to nearest 500m (0.0045 degrees)
 */
export function roundToGrid(coordinate: number): number {
  const gridSize = 0.0045; // ~500m at equator
  return Math.round(coordinate / gridSize) * gridSize;
}

/**
 * Round coordinates to privacy-preserving grid
 */
export function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: roundToGrid(lat),
    lng: roundToGrid(lng)
  };
}
