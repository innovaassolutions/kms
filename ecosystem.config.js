module.exports = {
  apps: [
    {
      name: 'kms-server',
      script: 'npm',
      args: 'run start',
      cwd: '/opt/bitnami/projects/innovaas/kms',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: 'logs/kms-error.log',
      out_file: 'logs/kms-out.log',
      log_file: 'logs/kms-combined.log',
      time: true
    },
    {
      name: 'kms-auto-process',
      script: 'scripts/auto-process-daemon.js',
      cwd: '/opt/bitnami/projects/innovaas/kms',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        BACKGROUND_PROCESS_API_KEY: 'FEpI5/mT/tr9HvEi9GYZuepYm060srcAd2zrltb2ZP8=',
        API_URL: 'http://localhost:3001'
      },
      env_production: {
        NODE_ENV: 'production',
        BACKGROUND_PROCESS_API_KEY: 'FEpI5/mT/tr9HvEi9GYZuepYm060srcAd2zrltb2ZP8=',
        API_URL: 'http://localhost:3001'
      },
      error_file: 'logs/auto-process-error.log',
      out_file: 'logs/auto-process-out.log',
      log_file: 'logs/auto-process-combined.log',
      time: true
    }
  ]
};