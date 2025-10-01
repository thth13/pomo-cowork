#!/bin/bash

# Помодоро таймер - скрипт для запуска

echo "🍅 Запуск Pomodo Timer..."

# Проверяем, установлены ли зависимости
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

# Проверяем, создана ли база данных
if [ ! -f "prisma/dev.db" ]; then
    echo "🗃️ Создаем базу данных..."
    npx prisma generate
    npx prisma db push
fi

# Создаем .env файл если его нет
if [ ! -f ".env" ]; then
    echo "⚙️ Создаем .env файл..."
    cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="pomodo-secret-key-$(date +%s)"
WS_PORT=3001
EOF
fi

echo "🚀 Запускаем серверы..."

# Запускаем WebSocket сервер в фоне
npm run dev:server &
WS_PID=$!

# Ждем 2 секунды для запуска WebSocket сервера
sleep 2

# Запускаем Next.js
echo "✅ WebSocket сервер запущен (PID: $WS_PID)"
echo "🌐 Запускаем веб-приложение на http://localhost:3000"

npm run dev

# Если Next.js завершился, останавливаем WebSocket сервер
kill $WS_PID 2>/dev/null
