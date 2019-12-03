const config = require('../config/default');
const redis = require('redis');
const bluebird= require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const redisClient= redis.createClient(config.redis);

module.exports= {
    redisClient
};
