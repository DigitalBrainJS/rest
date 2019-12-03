const createError = require('http-errors');
const {logger} = require('../common/logger');

module.exports = (isDevelopment, logErrors= true) => async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.log(err);
        const status= ctx.status = err.status || 500;
        const {name, expose, ...details} = err;
        const errorData = expose || isDevelopment || status===400? {message: err.message, ...details} : createError(status);

        if(logErrors){
            logger[status===500? 'error' : 'warn'](
                `${name}: ${err.message} (${JSON.stringify(details)}). Client: ${ctx.request.ip} (${ctx.request.get('User-Agent')})`
            )
        }
        ctx.type = 'json';
        ctx.body = JSON.stringify({name, status: ctx.status, ...errorData});
        ctx.app.emit('error', err, ctx);
    }
};
