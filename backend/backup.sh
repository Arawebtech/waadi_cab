#!/bin/bash

# Wadi Cab Backend - Backup Script
# This script creates backups of the database and application files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="/var/backups/wadi-cab"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

print_status "Starting backup process..."

# 1. Database Backup (if MongoDB is local)
if command -v mongodump &> /dev/null; then
    print_status "Creating database backup..."
    
    # Create database backup
    mongodump --db wadi_cab --out $BACKUP_DIR/db_backup_$DATE
    
    # Compress database backup
    tar -czf $BACKUP_DIR/db_backup_$DATE.tar.gz -C $BACKUP_DIR db_backup_$DATE
    
    # Remove uncompressed backup
    rm -rf $BACKUP_DIR/db_backup_$DATE
    
    print_success "Database backup created: db_backup_$DATE.tar.gz"
else
    print_warning "MongoDB not found locally. Skipping database backup."
    print_status "If using cloud database, ensure you have backup strategy in place."
fi

# 2. Application Files Backup
print_status "Creating application files backup..."

# Create application backup (excluding node_modules, logs, etc.)
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='whatsapp-sessions' \
    --exclude='tokens' \
    -C /var/www wadi-cab-backend

print_success "Application backup created: app_backup_$DATE.tar.gz"

# 3. Environment Configuration Backup
print_status "Creating environment configuration backup..."

# Backup .env file (if exists)
if [ -f ".env" ]; then
    cp .env $BACKUP_DIR/env_backup_$DATE
    print_success "Environment backup created: env_backup_$DATE"
else
    print_warning ".env file not found. Skipping environment backup."
fi

# 4. PM2 Configuration Backup
print_status "Creating PM2 configuration backup..."

# Save PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 $BACKUP_DIR/pm2_backup_$DATE.json 2>/dev/null || true

print_success "PM2 configuration backup created: pm2_backup_$DATE.json"

# 5. Logs Backup (optional)
print_status "Creating logs backup..."

# Backup recent logs
if [ -d "logs" ]; then
    tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz logs/
    print_success "Logs backup created: logs_backup_$DATE.tar.gz"
else
    print_warning "Logs directory not found. Skipping logs backup."
fi

# 6. Cleanup old backups
print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."

find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.json" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +$RETENTION_DAYS -delete

print_success "Old backups cleaned up"

# 7. Create backup summary
BACKUP_SUMMARY="$BACKUP_DIR/backup_summary_$DATE.txt"
{
    echo "=== Wadi Cab Backend Backup Summary ==="
    echo "Date: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    echo "Files created:"
    ls -la $BACKUP_DIR/*$DATE* 2>/dev/null || echo "No backup files found"
    echo ""
    echo "Total backup size:"
    du -sh $BACKUP_DIR/*$DATE* 2>/dev/null || echo "No backup files found"
    echo ""
    echo "Available backups:"
    ls -la $BACKUP_DIR/ | grep -E "\.(tar\.gz|json)$" || echo "No backup files found"
} > $BACKUP_SUMMARY

print_success "Backup summary created: backup_summary_$DATE.txt"

# 8. Display backup information
echo ""
print_success "Backup completed successfully!"
echo ""
echo "Backup Location: $BACKUP_DIR"
echo "Backup Date: $DATE"
echo ""
echo "Files created:"
ls -la $BACKUP_DIR/*$DATE* 2>/dev/null || echo "No backup files found"
echo ""
echo "Total size:"
du -sh $BACKUP_DIR/*$DATE* 2>/dev/null || echo "No backup files found"

# 9. Optional: Upload to cloud storage (uncomment if needed)
# print_status "Uploading backup to cloud storage..."
# # Example for AWS S3 (uncomment and configure)
# # aws s3 cp $BACKUP_DIR/*$DATE* s3://your-backup-bucket/wadi-cab-backend/
# # Example for Google Cloud Storage (uncomment and configure)
# # gsutil cp $BACKUP_DIR/*$DATE* gs://your-backup-bucket/wadi-cab-backend/

print_success "Backup process completed!" 