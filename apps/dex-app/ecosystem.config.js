module.exports = {
  apps: [{
    name: 'dex-app',
    script: 'npx',
    args: 'serve -l 8003 -s dist',
    cwd: __dirname,
    interpreter: 'none',
    autorestart: false,
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
