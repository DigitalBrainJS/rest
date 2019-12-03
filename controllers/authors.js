const authors = require('../models/authors');
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
            ctx.body = await authors.getAll(offset, limit, {
                fields,
                order,
                where
            });

            ctx.cacheOptions = {
                entity: !fields && {model: 'author'}
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

        if (await ctx.requestEntityCache('author', id)) {
            return;
        }

        const author = await authors.getId(id, ctx.query.fields);

        ctx.cacheOptions = {
            entity: {model: 'author'}
        };

        if (author) {
            ctx.body = author;
        } else {
            ctx.throw(404);
        }
    },

    async insertAuthor(ctx) {
        const {body} = ctx.request;

        try {
            const id = await authors.insertOne(body);
            const authorPath= ctx.mountPath + ctx.path +'/' + id;
            logger.debug(`Author ${JSON.stringify(body)} #${id} inserted at path ${authorPath}`);
            ctx.set('Location', authorPath);
            ctx.status = 201;
            ctx.body = '';
        } catch (err) {
            handleMysqlError(err);
        }
    },

    async updateAuthor(ctx) {
        const {body} = ctx.request;
        const {id}= ctx.params;

        try {
            const isOK = await authors.updateOne(id, body);
            logger.debug(`Update author ${JSON.stringify(body)} #${id}`);
            ctx.status = isOK? 200 : 404;
            ctx.body = '';
            isOK && ctx.invalidateEntityCache('author', id);
        } catch (err) {
            handleMysqlError(err);
        }
    }
};
