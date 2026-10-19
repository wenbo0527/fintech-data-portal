module.exports = {
  apps: [{
    name: 'dex-app',
    script: 'npx',
    args: 'vite preview --port 8003 --host',
    cwd: __dirname,
    interpreter: 'none',
    autorestart: false,
    watch: false
  }]
}
