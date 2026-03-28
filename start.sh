#!/bin/bash
# API Flow Tester 실행 스크립트

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 포트 8000 사용 중인 프로세스 종료
lsof -ti:8000 | xargs kill -9 2>/dev/null

echo "Starting backend (port 8000)..."
cd "$ROOT_DIR/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting frontend (port 5173)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Servers running:"
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
