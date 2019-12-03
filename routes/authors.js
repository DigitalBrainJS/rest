const KoaRouter = require('koa-router');
const Joi = require('@hapi/joi');
const authors = require('../controllers/authors');
const accept = require('../middlewares/accept');
const {parseOrderExp, parseArray, parseWhereExp} = require('../helpers/parsers');

const DEFAULT_ENTRIES_COUNT = 20;
const MAX_ENTRIES_COUNT = 1000;

const router = new KoaRouter({
    prefix: '/authors'
});

const idValidator = Joi.number().integer().min(1);

const knownFields = ['id', 'name'];

const bookValidator = {
    id: idValidator,
    name: Joi.string().max(128, 'utf8').required(),
};

router
    .post('/',
        accept.query(null, null, {allowUnknown: false}),
        accept.type('json'),
        accept.body(Joi.object({...bookValidator, id: Joi.any().forbidden()}).required()),
        authors.insertAuthor
    )
    .patch('/:id',
        accept.query(null, null, {allowUnknown: false}),
        accept.type('json'),
        accept.body(Joi.object({...bookValidator, id: Joi.any().forbidden()}).required()),
        authors.updateAuthor
    )
    .get('/:id',
        accept.query({
                fields: Joi.array().items(Joi.string().valid(...knownFields))
            }, {
                fields: parseArray
            },
            {allowUnknown: false}),
        accept.path({
            id: idValidator
        }),
        authors.getId
    )
    .get('/',
        accept.query({
            fields: Joi.any(),
            where: Joi.any(),
            order: Joi.any(),
            offset: Joi.number().integer(),
            limit: Joi.number().integer().max(MAX_ENTRIES_COUNT).default(DEFAULT_ENTRIES_COUNT)
        }, {
            fields: parseArray,
            where: parseWhereExp,
            order: parseOrderExp,
        }, {allowUnknown: false}),
        authors.getAll);

module.exports = router;
