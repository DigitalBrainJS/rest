const Joi = require('@hapi/joi');
const {
    QueryValidationError,
    BodyValidationError,
    PathValidationError
} = require('../common/errors');

const bindSchemaLabels = (schema) => {
    const copy = {};
    Object.entries(schema).forEach(([param, validator]) => copy[param] = validator.label(param));
    return copy;
};

const makeValidator = (schema, ErrorClass) => {
    if (!schema || typeof schema !== 'object') {
        throw TypeError('query schema should be an object');
    }

    schema = bindSchemaLabels(schema);

    return (object) => {
        Object.entries(schema).forEach(([param, validator]) => {
            try {
                object[param] = Joi.attempt(object[param], validator)
            } catch (err) {
                throw ErrorClass.fromJoiError(err).setDetails({param}).status(400, true);
            }
        });
    }
};

module.exports = {
    type: (contentType = 'json', responseContentType = 'json') => async (ctx, next) => {
        if (ctx.method === 'GET' || ctx.is(contentType)) {
            await next();
        } else {
            ctx.throw(415, `only ${contentType} type is acceptable`);
        }

        responseContentType && ctx.assert(ctx.request.accepts(responseContentType), 406);
    },

    query: (schema, normalizations, {allowUnknown = true} = {}) => {
        const validate = schema && makeValidator(schema, QueryValidationError);

        return async (ctx, next) => {
            normalizations && Object.entries(ctx.query).forEach(([param, rawValue]) => {
                const parser = normalizations[param];
                if (parser) {
                    if (typeof parser !== 'function') {
                        throw Error('parser must be a function');
                    }
                    ctx.query[param] = parser(rawValue);
                }
            });

            schema && validate(ctx.query);

            !allowUnknown && Object.keys(ctx.query).forEach(param => {
                if (!schema || !Object.hasOwnProperty.call(schema, param)) {
                    throw new QueryValidationError(`Unknown query param "${param}"`, {queryParam: param})
                        .status(400);
                }
            });

            await next();
        }
    },

    path: (schema) => {
        const validate = makeValidator(schema, PathValidationError);

        return async (ctx, next) => {
            validate(ctx.params);
            await next();
        }
    },

    body: (joiSchema) => {
        if (!joiSchema || !Joi.isSchema(joiSchema)) {
            throw TypeError('body schema should be a Joi object');
        }

        return async (ctx, next) => {
            try {
                Object.assign(ctx.request.body, Joi.attempt(ctx.request.body, joiSchema));
            } catch (err) {
                throw BodyValidationError.fromJoiError(err).status(400);
            }
            await next();
        }
    }
};
