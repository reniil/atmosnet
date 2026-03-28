-- Enable required extensions in Supabase
-- Run this in Supabase SQL Editor (https://alakazqcztizcbmewfre.supabase.co/project/sql)

-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp');
