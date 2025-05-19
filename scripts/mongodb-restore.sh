#!/bin/bash
# MongoDB Restore Script

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set default values if not provided in environment
MONGO_USERNAME=${MONGO_USERNAME:-multimodal_admin}
MONGO_PASSWORD=${MONGO_PASSWORD:-multimodal_password_secure123}
MONGO_HOST=${MONGO_HOST:-localhost}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_DB=${MONGO_DB:-multimodal-ai-agent}
BACKUP_DIR=${BACKUP_DIR:-./backups}

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Error: No backup file specified."
  echo "Usage: $0 <backup_filename>"
  echo "Available backups:"
  ls -1 $BACKUP_DIR/${MONGO_DB}_*.gz 2>/dev/null
  exit 1
fi

BACKUP_PATH="$1"

# If only filename is provided, prepend the backup directory
if [[ ! "$BACKUP_PATH" = /* ]] && [[ ! "$BACKUP_PATH" = ./* ]]; then
  BACKUP_PATH="${BACKUP_DIR}/${BACKUP_PATH}"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_PATH" ]; then
  echo "Error: Backup file not found: $BACKUP_PATH"
  exit 1
fi

echo "Starting MongoDB restore..."
echo "Database: $MONGO_DB"
echo "Backup file: $BACKUP_PATH"

# Confirm before proceeding
read -p "This will overwrite the existing database. Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

# Run mongorestore command
mongorestore \
  --host $MONGO_HOST \
  --port $MONGO_PORT \
  --username $MONGO_USERNAME \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --db $MONGO_DB \
  --gzip \
  --archive=$BACKUP_PATH \
  --drop

# Check if restore was successful
if [ $? -eq 0 ]; then
  echo "Restore completed successfully from: $BACKUP_PATH"
else
  echo "Restore failed!"
  exit 1
fi

echo "Restore process completed."
