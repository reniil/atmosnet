-- Create AtmosNet tables
-- Run this after enabling extensions

-- Observations table (raw data from devices)
CREATE TABLE IF NOT EXISTS observations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    pressure_hpa FLOAT NOT NULL,
    latitude_grid FLOAT NOT NULL,
    longitude_grid FLOAT NOT NULL,
    altitude_m FLOAT,
    location GEOGRAPHY(POINT, 4326),  -- PostGIS point
    confidence_score FLOAT,
    tier VARCHAR(1),
    validated_at TIMESTAMPTZ,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for observations
CREATE INDEX IF NOT EXISTS idx_observations_device ON observations(device_id_hash);
CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp);
CREATE INDEX IF NOT EXISTS idx_observations_location ON observations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_observations_tier ON observations(tier) WHERE tier IS NOT NULL;

-- Validated observations table
CREATE TABLE IF NOT EXISTS validated_observations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
    device_id_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    pressure_hpa FLOAT NOT NULL,
    pressure_corrected_hpa FLOAT NOT NULL,
    latitude_grid FLOAT NOT NULL,
    longitude_grid FLOAT NOT NULL,
    altitude_m FLOAT,
    location GEOGRAPHY(POINT, 4326),
    confidence_score FLOAT NOT NULL,
    tier VARCHAR(1) NOT NULL,
    api_comparison_diff_hpa FLOAT,
    nearby_observations_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for validated observations
CREATE INDEX IF NOT EXISTS idx_validated_device ON validated_observations(device_id_hash);
CREATE INDEX IF NOT EXISTS idx_validated_timestamp ON validated_observations(timestamp);
CREATE INDEX IF NOT EXISTS idx_validated_location ON validated_observations USING GIST(location);

-- Forecast grids table
CREATE TABLE IF NOT EXISTS forecast_grids (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    latitude_grid FLOAT NOT NULL,
    longitude_grid FLOAT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    pressure_hpa FLOAT NOT NULL,
    temperature_c FLOAT,
    humidity_percent FLOAT,
    device_data_weight FLOAT NOT NULL,
    api_data_weight FLOAT NOT NULL,
    observations_count INTEGER NOT NULL DEFAULT 0,
    tier_a_count INTEGER NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for forecast grids
CREATE INDEX IF NOT EXISTS idx_forecast_location ON forecast_grids USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_forecast_calculated ON forecast_grids(calculated_at);
CREATE INDEX IF NOT EXISTS idx_forecast_expires ON forecast_grids(expires_at);

-- Accounts table (AtmosPoints ledger)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    device_id_hash VARCHAR(64) NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_contribution_date TIMESTAMPTZ,
    contributions_today INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_device ON accounts(device_id_hash);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    reward_type VARCHAR(64) NOT NULL,
    reward_details TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_account ON redemptions(account_id);

-- Enterprise API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    tier VARCHAR(32) NOT NULL, -- 'free', 'standard', 'pro'
    company_name VARCHAR(255),
    email VARCHAR(255),
    rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,
    current_usage_today INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE validated_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Create policies (basic - adjust as needed)
-- For now, allow all operations (implement proper policies later)
CREATE POLICY "Allow all" ON observations FOR ALL USING (true);
CREATE POLICY "Allow all" ON validated_observations FOR ALL USING (true);
CREATE POLICY "Allow all" ON forecast_grids FOR ALL USING (true);
CREATE POLICY "Allow all" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all" ON redemptions FOR ALL USING (true);

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('observations', 'validated_observations', 'forecast_grids', 
                   'accounts', 'transactions', 'redemptions', 'api_keys')
ORDER BY table_name;
