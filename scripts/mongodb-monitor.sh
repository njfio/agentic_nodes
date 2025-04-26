#!/bin/bash
# MongoDB Monitoring Script

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

# Function to check MongoDB connection
check_connection() {
  echo "Checking MongoDB connection..."
  mongosh \
    --host $MONGO_HOST \
    --port $MONGO_PORT \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --eval "db.adminCommand('ping')" \
    $MONGO_DB
  
  if [ $? -eq 0 ]; then
    echo "MongoDB connection successful."
    return 0
  else
    echo "MongoDB connection failed!"
    return 1
  fi
}

# Function to get MongoDB server status
get_server_status() {
  echo "Getting MongoDB server status..."
  mongosh \
    --host $MONGO_HOST \
    --port $MONGO_PORT \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --eval "db.serverStatus()" \
    $MONGO_DB
}

# Function to get database statistics
get_db_stats() {
  echo "Getting database statistics for $MONGO_DB..."
  mongosh \
    --host $MONGO_HOST \
    --port $MONGO_PORT \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --eval "db.stats()" \
    $MONGO_DB
}

# Function to get collection statistics
get_collection_stats() {
  echo "Getting collection statistics for $MONGO_DB..."
  mongosh \
    --host $MONGO_HOST \
    --port $MONGO_PORT \
    --username $MONGO_USERNAME \
    --password $MONGO_PASSWORD \
    --authenticationDatabase admin \
    --eval "db.getCollectionNames().forEach(function(collection) { print('Collection: ' + collection); printjson(db[collection].stats()); })" \
    $MONGO_DB
}

# Main function
main() {
  echo "MongoDB Monitoring Script"
  echo "=========================="
  echo "Host: $MONGO_HOST:$MONGO_PORT"
  echo "Database: $MONGO_DB"
  echo "=========================="
  
  # Check connection first
  check_connection
  if [ $? -ne 0 ]; then
    echo "Exiting due to connection failure."
    exit 1
  fi
  
  # Parse command line arguments
  case "$1" in
    "status")
      get_server_status
      ;;
    "dbstats")
      get_db_stats
      ;;
    "collections")
      get_collection_stats
      ;;
    *)
      echo "Usage: $0 [status|dbstats|collections]"
      echo "  status      - Show MongoDB server status"
      echo "  dbstats     - Show database statistics"
      echo "  collections - Show collection statistics"
      ;;
  esac
}

# Run main function
main "$@"
