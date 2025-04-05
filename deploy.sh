#!/bin/bash

# Загружаем переменные из .env файла
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
else
    echo ".env file not found!"
    exit 1
fi

# Проверка наличия папки dist
if [ ! -d "$LOCAL_DIST" ]; then
    echo "Directory $LOCAL_DIST does not exist!"
    exit 1
fi

# Отправка файлов на сервер
lftp -u $FTP_USER,$FTP_PASSWORD ftp://$FTP_HOST:$FTP_PORT -e "mirror -R ./$LOCAL_DIST $FTP_PATH$PROJECT_NAME; quit"

echo "Deployment complete."
