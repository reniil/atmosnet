#!/bin/bash
# AtmosNet Local Development Script
# Runs backend without Docker

echo "🌤️  AtmosNet Local Development"
echo "================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

echo "✅ Python version: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv backend/venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source backend/venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r backend/requirements.txt

# Create local SQLite database for quick testing (optional, no PostGIS needed for basic tests)
echo "📊 Setting up database..."

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"
    export DATABASE_URL="postgresql://atmosnet:atmosnet@localhost:5432/atmosnet"
else
    echo "⚠️  PostgreSQL not found. Using SQLite for quick testing..."
    export DATABASE_URL="sqlite:///./atmosnet.db"
fi

# Set other environment variables
export REDIS_URL="redis://localhost:6379/0"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
export ENVIRONMENT="development"
export DEBUG="true"
export SECRET_KEY="local-dev-key-change-in-production"

echo ""
echo "🚀 Starting AtmosNet Backend..."
echo "================================"
echo "API will be available at: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
