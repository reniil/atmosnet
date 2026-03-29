-- Add IP Location and Debug Log tables
-- Run this in Supabase SQL Editor

-- IP Locations table (for signup/registration)
CREATE TABLE IF NOT EXISTS ip_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    latitude FLOAT,
    longitude FLOAT,
    city VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(100),
    user_agent TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_locations_device ON ip_locations(device_id_hash);
CREATE INDEX IF NOT EXISTS idx_ip_locations_coords ON ip_locations(latitude, longitude);

-- Debug Logs table (for troubleshooting)
CREATE TABLE IF NOT EXISTS debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id_hash VARCHAR(64),
    endpoint VARCHAR(100) NOT NULL,
    request_data TEXT,
    response_data TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debug_logs_device ON debug_logs(device_id_hash);
CREATE INDEX IF NOT EXISTS idx_debug_logs_endpoint ON debug_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp);

-- Enable RLS
ALTER TABLE ip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow all (for development)
CREATE POLICY "Allow all" ON ip_locations FOR ALL USING (true);
CREATE POLICY "Allow all" ON debug_logs FOR ALL USING (true);

-- Verify
SELECT 'ip_locations' as table_name, COUNT(*) as count FROM ip_locations
UNION ALL
SELECT 'debug_logs', COUNT(*) FROM debug_logs;