const config = require('./config/default');
const http= require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaLogger = require('koa-logger');
const mount = require('koa-mount');
const conditional = require('koa-conditional-get');
const etag = require('koa-etag');
const booksRouter= require('./routes/books');
const authorsRouter= require('./routes/authors');
const jsonErrorMiddleware= require('./middlewares/json-error');
const {redisCache}= require('./middlewares/redis-cache');
const responseTime = require('koa-response-time');
const compress = require('koa-compress');
const {logger} = require('./common/logger');

const API_BASE_PATH= "/api";

const app = new Koa();

app.use(compress({
    threshold: config.compress.threshold,
    flush: require('zlib').Z_SYNC_FLUSH
}));

app.use(jsonErrorMiddleware(config.isDevelopment));
app.use(koaLogger((str) => {
    logger.info(str);
}));
app.use(responseTime({hrtime: true}));
app.use(conditional());
app.use(redisCache({ttl: config.cache.defaultTTL}));
app.use(etag());
app.use(koaBody({
    jsonLimit: '100kb',
    enableTypes: ['json']
}));

app.use(mount(`${API_BASE_PATH}/v1`, booksRouter.routes()));
app.use(mount(`${API_BASE_PATH}/v1`, booksRouter.allowedMethods()));

app.use(mount(`${API_BASE_PATH}/v1`, authorsRouter.routes()));
app.use(mount(`${API_BASE_PATH}/v1`, authorsRouter.allowedMethods()));

http.createServer(app.callback()).listen(config.server.port, ()=> {
    const {name, version}= config.app;
    console.log('App [%s@%s] is listening at port %d', name, version, config.server.port);
});

