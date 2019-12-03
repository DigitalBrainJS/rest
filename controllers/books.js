const books = require('../models/books');
const {ValidationError} = require('../common/errors');
const {logger} = require('../common/logger');
const {handleMysqlError}= require('../helpers/mysql-helpers');

module.exports = {
    async getAll(ctx) {
        if(await ctx.requestQueryCache()) return;

        const {query} = ctx;

        let {
            offset,
            limit,
            fields,
            order,
            where
        } = query;

        try {
            ctx.body = await books.getAll(offset, limit, {
                fields,
                order,
                where
            });

            ctx.cacheOptions = {
                entityCache: !fields && {model: 'book', ttl: 3600},
                queryCache: {ttl: 15}
            };
        } catch (err) {
            if (err instanceof ValidationError) {
                return ctx.throw(400, err);
            }
            throw err;
        }
    },

    async getId(ctx) {
        const {id} = ctx.params;

        if (await ctx.requestEntityCache('book', id)) {
            return;
        }

        const book = await books.getId(id, ctx.query.fields);

        ctx.cacheOptions = {
            entity: {model: 'book'}
        };

        if (book) {
            ctx.body = book;
        } else {
            ctx.throw(404);
        }
    },

    async insertBook(ctx) {
        const {body} = ctx.request;

        try {
            const id = await books.insertOne(body);
            const bookPath= ctx.mountPath + ctx.path +'/' + id;
            logger.debug(`Book ${JSON.stringify(body)} #${id} inserted at path ${bookPath}`);
            ctx.set('Location', bookPath);
            ctx.status = 201;
            ctx.body = '';
        } catch (err) {
            handleMysqlError(err);
        }
    },

    async updateBook(ctx) {
        const {body} = ctx.request;
        const {id}= ctx.params;

        try {
            const isOK = await books.updateOne(id, body);
            logger.debug(`Update book ${JSON.stringify(body)} #${id}`);
            ctx.status = isOK? 200 : 404;
            ctx.body = '';
            isOK && ctx.invalidateEntityCache('book', id);
        } catch (err) {
            handleMysqlError(err);
        }
    }
};
