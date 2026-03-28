import axios from 'axios';
import { Observation, PointsBalance, Transaction, NetworkStats } from '../types';

// API base URL - configurable for different environments
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Submit a weather observation
 */
export async function submitObservation(observation: Observation): Promise<{ id: string }> {
  const response = await api.post('/v1/observations/', observation);
  return response.data;
}

/**
 * Get recent observations for a device
 */
export async function getRecentObservations(
  deviceIdHash: string,
  limit: number = 10
): Promise<Observation[]> {
  const response = await api.get(`/v1/observations/${deviceIdHash}/recent?limit=${limit}`);
  return response.data;
}

/**
 * Get network-wide statistics
 */
export async function getNetworkStats(): Promise<NetworkStats> {
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
): Promise<Transaction[]> {
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

export default api;
