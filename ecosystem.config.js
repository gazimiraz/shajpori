module.exports = {
  apps: [
    {
      name: 'shaj-api',
      cwd: '/home/u123456789/shajpori/apps/api',   // Hostinger username folder
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 4000 },
    },
    {
      name: 'shaj-web',
      cwd: '/home/u123456789/shajpori/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'shaj-admin',
      cwd: '/home/u123456789/shajpori/apps/admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3001 },
    },
  ],
};
