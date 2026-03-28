#!/bin/bash
PORT="${1:-3000}"
cd /home/ralph/.openclaw/workspace/atmosnet/backend
source venv/bin/activate
export DATABASE_URL="sqlite+aiosqlite:///./atmosnet_simple.db"
export ENVIRONMENT="development"
export DEBUG="true"
export PYTHONPATH=/home/ralph/.openclaw/workspace/atmosnet/backend:$PYTHONPATH
python3 -c "from app.main_simple import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=\$PORT)" &
echo "Server on port \$PORT"
sleep 2
curl -s http://localhost:\$PORT/health/
