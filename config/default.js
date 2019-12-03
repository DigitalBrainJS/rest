const _package = require('package')(module);

module.exports = {
    app: {
        name: _package.name,
        version: _package.version
    },
    server: {
        port: process.env.NODE_APP_INSTANCE || 3000,
    },
    mysql: {
        host: "127.0.0.1",
        user: "root",
        password: "",
        db: "test"
    },
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0
    },
    cache: {
        cacheKeyBase: `${_package.name}:cache:`,
        defaultTTL: 10,
    },
    isDevelopment: process.env.NODE_ENV !=='production',
    logs: {
        path: './logs'
    },
    compress:{
        threshold: 2048
    }
};
