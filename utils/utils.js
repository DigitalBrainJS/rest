const crypto = require('crypto');

const NS_PER_SEC = 1e9;

const stripQuotes = (str) => str && str.replace(/^"|"$/g, '');

const calcSHA1 = (str) => crypto.createHash('sha1').update(str).digest('hex');

module.exports= {
    benchmark: (timestamp)=>{
        const time= process.hrtime(timestamp);
        return time[0] * NS_PER_SEC + time[1]
    },

    calcSHA1,
    stripQuotes
};
