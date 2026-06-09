# 🚀 Wadi Cab Backend - VPS Deployment Guide

This guide will help you deploy your Node.js backend application on a VPS using PM2.

## 📋 Prerequisites

- **VPS with Ubuntu 20.04+ or CentOS 7+**
- **SSH access to your VPS**
- **Domain name (optional but recommended)**
- **Git repository with your code**

## 🛠️ Step 1: VPS Setup

### 1.1 Connect to your VPS
```bash
ssh root@your-vps-ip
```

### 1.2 Update system packages
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.3 Install Node.js and npm
```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.4 Install PM2 globally
```bash
npm install -g pm2
```

### 1.5 Install MongoDB (if not using cloud database)
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 1.6 Install Nginx (for reverse proxy)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 📁 Step 2: Application Setup

### 2.1 Clone your repository
```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
git clone https://github.com/yourusername/wadi-cab-backend.git
cd wadi-cab-backend
```

### 2.2 Install dependencies
```bash
npm install
```

### 2.3 Create environment file
```bash
# Create .env file
nano .env
```

Add your environment variables:
```env
# Server Configuration
NODE_ENV=production
PORT=4001

# Database
MONGODB_URI=mongodb://192.168.1.8:27017/wadi_cab
# OR for cloud database:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wadi_cab

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# PayU Configuration
PAYU_KEY=your-payu-key
PAYU_SALT=your-payu-salt
PAYU_SUCCESS_URL=https://yourdomain.com/api/payment/success
PAYU_FAILURE_URL=https://yourdomain.com/api/payment/failure

```

### 2.4 Create logs directory
```bash
mkdir -p logs
```

## 🚀 Step 3: Deploy with PM2

### 3.1 Make deployment script executable
```bash
chmod +x deploy.sh
```

### 3.2 Run deployment
```bash
# For production
./deploy.sh production

# For staging/development
./deploy.sh staging
```

### 3.3 Verify deployment
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs wadi-cab-backend

# Monitor application
pm2 monit
```

## 🌐 Step 4: Nginx Configuration

### 4.1 Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/wadi-cab-backend
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (replace with your certificate paths)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Proxy to Node.js application
    location / {
        proxy_pass https://api.waadi.in;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass https://api.waadi.in/health;
        access_log off;
    }
}
```

### 4.2 Enable the site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/wadi-cab-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 Step 5: SSL Certificate (Let's Encrypt)

### 5.1 Install Certbot
```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 5.3 Auto-renewal
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Step 6: Monitoring and Maintenance

### 6.1 PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs wadi-cab-backend

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart wadi-cab-backend

# Stop application
pm2 stop wadi-cab-backend

# Delete application
pm2 delete wadi-cab-backend

# Save current PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 6.2 Log Management
```bash
# View application logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log

# View PM2 logs
pm2 logs wadi-cab-backend --lines 100
```

### 6.3 Database Backup (if using local MongoDB)
```bash
# Create backup script
nano /var/www/wadi-cab-backend/backup.sh
```

Add this content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --db wadi_cab --out $BACKUP_DIR/backup_$DATE
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

Make it executable:
```bash
chmod +x backup.sh
```

### 6.4 Setup automatic backups
```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /var/www/wadi-cab-backend/backup.sh
```

## 🔧 Step 7: Troubleshooting

### 7.1 Common Issues

**Application not starting:**
```bash
# Check logs
pm2 logs wadi-cab-backend

# Check if port is in use
netstat -tulpn | grep :4001

# Check environment variables
pm2 env wadi-cab-backend
```

**Nginx issues:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test Nginx configuration
sudo nginx -t
```

**Database connection issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### 7.2 Performance Monitoring
```bash
# Install monitoring tools
npm install -g pm2-server-monit

# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor memory usage
free -h
```

## 📈 Step 8: Scaling

### 8.1 Load Balancer Setup
If you need to scale across multiple servers, consider using:
- **HAProxy** for load balancing
- **Redis** for session storage
- **Multiple PM2 instances** across servers

### 8.2 Database Scaling
- **MongoDB Atlas** for cloud database
- **MongoDB Replica Set** for high availability
- **MongoDB Sharding** for horizontal scaling

## 🔄 Step 9: Updates and Maintenance

### 9.1 Update Application
```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart application
pm2 restart wadi-cab-backend
```

### 9.2 System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services if needed
sudo systemctl restart nginx
sudo systemctl restart mongod
```

## 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs wadi-cab-backend`
2. Verify environment variables: `pm2 env wadi-cab-backend`
3. Test the application locally first
4. Check system resources: `htop`, `df -h`, `free -h`

## 🎯 Quick Deployment Checklist

- [ ] VPS setup with Node.js and PM2
- [ ] MongoDB installed and running
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Environment variables configured
- [ ] Application deployed with PM2
- [ ] Logs directory created
- [ ] Backup script configured
- [ ] Monitoring setup
- [ ] Domain pointing to VPS IP

Your application should now be running on your VPS with PM2! 🚀 