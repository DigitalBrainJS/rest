const KoaRouter = require('koa-router');
const Joi = require('@hapi/joi');
const books = require('../controllers/books');
const accept = require('../middlewares/accept');
const {parseOrderExp, parseArray, parseWhereExp} = require('../helpers/parsers');

const DEFAULT_ENTRIES_COUNT = 20;
const MAX_ENTRIES_COUNT = 1000;

const router = new KoaRouter({
    prefix: '/books'
});

const idValidator = Joi.number().integer().min(1);

const knownFields = ['id', 'title', 'description', 'author', 'author_name', 'image', 'date'];

const bookValidator = {
    id: idValidator,
    author: idValidator.required(),
    title: Joi.string().max(128, 'utf8').required(),
    description: Joi.string().max(255, 'utf8').empty(''),
    image: Joi.string().max(255, 'utf8'),
    date: Joi.date(),
};

router
    .post('/',
        accept.query(null, null, {allowUnknown: false}),
        accept.type('json'),
        accept.body(Joi.object({
            ...bookValidator,
            id: Joi.any().forbidden()
        }).required()),
        books.insertBook
    )
    .patch('/:id',
        accept.query(null, null, {allowUnknown: false}),
        accept.type('json'),
        accept.body(Joi.object({
            ...bookValidator,
            id: Joi.any().forbidden()
        }).required()),
        books.updateBook
    )
    .get('/:id',
        accept.query({
            fields: Joi.array().items(Joi.string().valid(...knownFields))
        }, {
            fields: parseArray
        }, {allowUnknown: false}),
        accept.path({
            id: idValidator
        }),
        books.getId
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
            },
            {allowUnknown: false}
        ),
        books.getAll);

module.exports = router;
