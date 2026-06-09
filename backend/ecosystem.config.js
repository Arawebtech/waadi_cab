module.exports = {
  apps: [
    {
      name: 'wadi-cab-backend',
      script: 'server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Environment variables
      env_file: '.env',
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // PM2 specific
      pmx: true,
      source_map_support: true,
      
      // Error handling
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      merge_logs: true,
      
      // Cron restart (optional - restart daily at 2 AM)
      cron_restart: '0 2 * * *'
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/wadi-cab-backend.git',
      path: '/var/www/wadi-cab-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 