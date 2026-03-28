export interface Observation {
  device_id_hash: string;
  timestamp: string;
  pressure_hpa: number;
  latitude_grid: number;
  longitude_grid: number;
  altitude_m?: number;
}

export interface ObservationResponse {
  id: string;
  device_id_hash: string;
  timestamp: string;
  pressure_hpa: number;
  latitude_grid: number;
  longitude_grid: number;
  altitude_m?: number;
  confidence_score?: number;
  tier?: string;
  points_awarded: number;
  created_at: string;
}

export interface PointsBalance {
  device_id_hash: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  current_streak: number;
  contributions_today: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
}

export interface NetworkStats {
  observations_24h: number;
  unique_devices_24h: number;
  validated_observations_24h: number;
  validation_rate: number;
}

export interface GridCell {
  lat: number;
  lng: number;
  pressure_hpa: number;
  observations_count: number;
}
