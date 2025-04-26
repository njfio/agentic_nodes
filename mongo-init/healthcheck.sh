#!/bin/bash
set -e

# Wait for MongoDB to be ready
mongosh --eval "db.adminCommand('ping')"

# Exit with success
exit 0
