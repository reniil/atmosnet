import axios from 'axios';
import { Observation, PointsBalance, Transaction, NetworkStats } from '../types';

// Production API URL
const API_BASE_URL = 'https://atmosnet-backend.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[API] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('[API] No response received:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Submit a weather observation to the network
 */
export async function submitObservation(observation: Observation): Promise<{
  id: string;
  confidence_score: number;
  tier: string;
  points_awarded: number;
}> {
  const response = await api.post('/v1/observations/', observation);
  return response.data;
}

/**
 * Get recent observations for a device
 */
export async function getRecentObservations(
  deviceIdHash: string,
  limit: number = 10
): Promise<{ observations: Observation[] }> {
  const response = await api.get(`/v1/observations/${deviceIdHash}/recent?limit=${limit}`);
  return response.data;
}

/**
 * Get network-wide statistics
 */
export async function getNetworkStats(): Promise<{
  total_observations_24h: number;
  active_devices: number;
  average_confidence: number;
  tier_breakdown: { A: number; B: number; C: number };
}> {
  const response = await api.get('/v1/observations/stats/network');
  return response.data;
}

/**
 * Get points balance for a device
 */
export async function getPointsBalance(deviceIdHash: string): Promise<PointsBalance> {
  const response = await api.get(`/v1/rewards/balance/${deviceIdHash}`);
  return response.data;
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
  deviceIdHash: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: Transaction[] }> {
  const response = await api.get(`/v1/rewards/${deviceIdHash}/history?limit=${limit}&offset=${offset}`);
  return response.data;
}

/**
 * Redeem points
 */
export async function redeemPoints(
  deviceIdHash: string,
  pointsAmount: number,
  rewardType: string,
  rewardDetails?: string
): Promise<{ id: string }> {
  const response = await api.post('/v1/rewards/redeem', {
    device_id_hash: deviceIdHash,
    points_amount: pointsAmount,
    reward_type: rewardType,
    reward_details: rewardDetails,
  });
  return response.data;
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await api.get('/health/');
  return response.data;
}

/**
 * Get current weather for a location (uses OpenWeatherMap or mock data)
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<{
  temperature: number;
  humidity: number;
  pressure: number;
  description: string;
  icon: string;
  wind_speed: number;
  feels_like: number;
  visibility: number;
  uv_index: number;
}> {
  // For now, return mock data since we don't have OpenWeatherMap integrated
  // In production, you would call OpenWeatherMap API here
  return {
    temperature: 28 + Math.random() * 4,
    humidity: 60 + Math.random() * 20,
    pressure: 1010 + Math.random() * 10,
    description: 'Partly Cloudy',
    icon: '02d',
    wind_speed: 10 + Math.random() * 10,
    feels_like: 30 + Math.random() * 4,
    visibility: 8 + Math.random() * 4,
    uv_index: 6 + Math.random() * 4,
  };
}

export default api;