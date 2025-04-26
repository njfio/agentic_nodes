#!/bin/bash
# MongoDB Backup Script

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

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${MONGO_DB}_${TIMESTAMP}.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

echo "Starting MongoDB backup..."
echo "Database: $MONGO_DB"
echo "Backup file: $BACKUP_PATH"

# Run mongodump command
mongodump \
  --host $MONGO_HOST \
  --port $MONGO_PORT \
  --username $MONGO_USERNAME \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --db $MONGO_DB \
  --gzip \
  --archive=$BACKUP_PATH

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_PATH"
  echo "Backup size: $(du -h $BACKUP_PATH | cut -f1)"
else
  echo "Backup failed!"
  exit 1
fi

# Clean up old backups (keep last 5)
echo "Cleaning up old backups..."
ls -t $BACKUP_DIR/${MONGO_DB}_*.gz | tail -n +6 | xargs -r rm

echo "Backup process completed."
