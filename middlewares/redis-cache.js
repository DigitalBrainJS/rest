const {redisClient} = require('../asserts/redis-client');
const config = require('../config/default');
const {logger, colorize} = require('../common/logger');
const calculateEtag = require('etag');
const chalk = require('chalk');
const {benchmark} = require('../utils/utils');
const {cacheKeyBase} = config.cache;

const saveEntry = async (key, data, ttl) => {
    await redisClient.hmsetAsync(key, data);

    if (ttl > 0) {
        await redisClient.expireAsync(key, ttl);
    }
};

const getEntry = async (key) => {
    return redisClient.hgetallAsync(key);
};

const cacheEntity = async (modelName, entity, {ttl} = {}) => {
    const cacheKey = `${cacheKeyBase}:${modelName}:`;
    const pushEntity = (entity) => {
        const {id} = entity;
        if (!id) {
            throw Error(`Entity id key "${id}" is missing`)
        }
        const data = JSON.stringify(entity);
        ttl ? redisClient.setexAsync(cacheKey + id, ttl, data) : redisClient.setAsync(cacheKey + id, data);
    };

    if (Array.isArray(entity)) {
        logger.debug(`Cache entity ${modelName}(${entity.map(({id}) => id).join(', ')})`);
        entity.forEach(pushEntity)
    } else {
        logger.debug(`Cache entity ${modelName}`);
        pushEntity(entity);
    }
};

const getEntityCache = async (modelName, id) => {
    const entry = await redisClient.getAsync(`${cacheKeyBase}:${modelName}:${id}`);
    return entry !== null ? JSON.parse(entry) : null;
};

const invalidateEntityCache = async (modelName, id, key = 'id') => {
    return redisClient.delAsync(`${cacheKeyBase}:${modelName}:${key}:${id}`)
};

const redisCache = ({ttl: defaultTTL = 60} = {}) => async (ctx, next) => {
    const {method, path} = ctx;
    const rawQueryString = ctx.req.url;

    if (method === 'GET') {
        ctx.requestQueryCache = async () => {
            const queryCacheKey = cacheKeyBase + ':query:' + rawQueryString;
            const timestamp = process.hrtime();
            const cacheEntry = await getEntry(queryCacheKey);

            if (cacheEntry) {
                ctx.response.etag = cacheEntry.etag;
                const time = `${((benchmark(timestamp) / 1000000).toFixed(2))} ms`;
                logger.debug(`Found [${time}] cached entry for query [${rawQueryString}] (${cacheEntry.etag})`);
                ctx.body = cacheEntry.body;
                ctx.type= 'json';
                return true;
            }
            return false;
        };

        ctx.requestEntityCache = async (modelName, id) => {
            const timestamp = process.hrtime();
            const entity = await getEntityCache(modelName, id);

            if (entity) {
                const time = `${((benchmark(timestamp) / 1000000).toFixed(2))} ms`;
                logger.debug(colorize()`Found [${time}] cached entity for [${modelName}#${id}]`);
                ctx.body = entity;
                return true;
            } else {
                logger.debug(colorize((value) => chalk.red.bold.underline(value))`Entity cache is missing for ${modelName}#${id}`);
            }

            return false;
        };

        ctx.invalidateEntityCache = invalidateEntityCache;

        await next();

        const {
            entityCache,
            queryCache
        } = ctx.cacheOptions || {};

        if (queryCache) {
            if (typeof queryCache !== 'object') {
                throw TypeError(`queryCache should be an object`);
            }

            const {ttl = defaultTTL} = queryCache;
            const json = JSON.stringify(ctx.body);
            const queryCacheKey = cacheKeyBase + ':query:' + rawQueryString;
            saveEntry(queryCacheKey, {
                body: json,
                timestamp: Date.now(),
                etag: calculateEtag(json),
                query: rawQueryString
            }, ttl).catch(err => logger.error(`Query cache error: ${err}`));
        }

        if (entityCache) {
            if (typeof entityCache !== 'object') {
                throw TypeError(`entityCache must be an object`);
            }

            let {
                model,
                ttl = defaultTTL
            } = entityCache;

            if (typeof model !== 'string' || !(model = model.trim())) {
                throw Error(`entityCache.model is required to cache entity at path ${path}`);
            }

            if (ttl !== undefined) {
                if (typeof ttl !== 'number' || ttl < 0) {
                    throw Error(`entityCache.model is required to cache entity at path ${path}`);
                }
            }

            if (ctx.response.type === 'application/json') {
                const {body} = ctx;
                if (typeof body === 'object') {
                    cacheEntity(model, body, {ttl}).catch((err) => logger.error(`Caching error: ${err}`));
                } else {
                    throw Error(`Object type response required to cache entity at "${path}"`);
                }
            }
        }
        return;
    }

    await next();
};

module.exports = {
    redisCache
};
