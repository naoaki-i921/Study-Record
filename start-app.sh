#!/bin/bash

# Study Record 起動スクリプト (Git Bash用)

echo -e "\033[0;36mStarting Docker containers...\033[0m"
cd backend
docker-compose up -d
cd ..

echo -e "\033[0;36mStarting Backend (NestJS)...\033[0m"
# 新しいウィンドウでバックエンドを起動
start "" bash -c "cd backend && npm run start:dev; exec bash"

echo -e "\033[0;36mStarting Frontend (Next.js)...\033[0m"
# 新しいウィンドウでフロントエンドを起動
start "" bash -c "cd frontend && npm run dev; exec bash"

echo -e "\033[0;32mApplication is starting up!\033[0m"
echo -e "\033[0;33mFrontend: http://localhost:3000\033[0m"
echo -e "\033[0;33mBackend:  http://localhost:3001\033[0m"
