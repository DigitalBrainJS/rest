const mysql = require('mysql2/promise');
const Joi = require('@hapi/joi');
const sql = require('./sql-template');
const {logger, colorize}= require('../common/logger');

const {
    ValidationError,
    FieldIdentifierError,
    FieldValidationError,
    OperatorValidationError,
    ParamValidationError
} = require('../common/errors');

const schema = Joi.object({
    fields: Joi.array(),
    order: Joi.object(),
    where: Joi.array(),
    offset: Joi.number().integer(),
    limit: Joi.number().integer().min(1),
    tableName: Joi.string(),
    queryCacheSize: Joi.number().integer().min(0)
}).unknown();


const assertFieldIdentifier = (identifier) => {
    if (typeof identifier !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        throw new FieldIdentifierError(`Invalid field identifier "${identifier}"`, {identifier})
    }
};

const operators = {
    'like': 'LIKE',
    'eq': '=',
    '': '=',
    '=': '=',
    'gt': '>',
    'lt': '<',
    '!=': '!=',
    '<>': '!='
};

const combine= (table, field)=> table + '.' + field;

function defineFetchQuery(table, definedFields, {queryCacheSize = 100} = {}) {
    const mainTable = table.trim();

    Joi.assert({
        mainTable,
        definedFields,
        queryCacheSize
    }, schema);

    const computedFields = {};
    const foreignTables = {};
    const typesMap= {};

    Object.entries(definedFields).forEach(([publicFieldName, entry]) => {
        let {field = publicFieldName, ref, table = mainTable, type} = typeof entry === 'object' ? entry : {};
        assertFieldIdentifier(publicFieldName);
        field !== publicFieldName && assertFieldIdentifier(field);

        if(table!==mainTable){
            if(!ref){
                throw new ValidationError(`invalid foreign table reference`, {field, ref, table});
            }
            if(!foreignTables[table]){
                foreignTables[table]= {
                    joinExp: sql(table, combine(mainTable, ref[0]), combine(table, ref[1]))`JOIN ?? ON ??=??`
                };
            }
        }
        computedFields[publicFieldName] = {
            sqlField: combine(table, field),
            selectExp: sql(table, field, publicFieldName)`??.??${field !== publicFieldName && ' as ??'}`,
            table,
            ref
        };
        typesMap[publicFieldName]= type;
    });

    const queryCache = [];

    const assertField = (field) => {
        if (!Object.hasOwnProperty.call(definedFields, field)) {
            assertFieldIdentifier(field);
            throw new FieldValidationError(`Unknown field '${field}'`, {field});
        }
    };

    return (offset, limit, options = {}) => {
        if (typeof options !== 'object') {
            throw TypeError('options must be an object');
        }
        const {fields, order, where} = options;
        const query = {
            mainTable,
            fields,
            order,
            where,
            offset: offset * 1,
            limit: limit * 1,
        };

        const buildQuery = () => {
            Joi.assert(query, schema);
            let selectedFields;
            if (fields && fields.length) {
                fields.forEach(assertField);
                selectedFields = fields;
            } else {
                selectedFields = Object.keys(definedFields);
            }
            query.offset > 0 && !query.limit && (query.limit = 1);
            const selectedTables= {};

            const fieldsExpression = selectedFields.map(field => {
                assertField(field);
                const {table, selectExp}= computedFields[field];
                selectedTables[table]= true;
                return selectExp;
            }).join(', ');

            const joinExpression = Object.keys(selectedTables).map((table) => {
                const entry= foreignTables[table];
                return entry && entry.joinExp;
            }).filter(Boolean).join(' ');

            if(query.offset < 0){
                if(!query.order){
                    query.order= {id: true};
                }else {
                    query.order['id'] = true;
                }
            }

            const orderExpression = query.order && sql()`ORDER BY ${
                Object.entries(query.order).map(([field, order= true]) => {
                    assertField(field);
                    return sql(field)`?? ${order ? 'ASC' : 'DESC'}`
                }).join(', ')
            }`;

            const whereExpression = query.where && sql()`WHERE ${
                query.where.map((rawExpression, index, arr) => {
                    if (!Array.isArray(rawExpression)) {
                        throw TypeError('Where expression member must be an array');
                    }
                    let [field, operator, value, orJoinOperator] = rawExpression;
                    assertField(field);
                    const type= typesMap[field];
                    if(type){
                        try {
                            value = Joi.attempt(value, type);
                        }catch(err){
                            throw FieldValidationError.fromJoiError(
                                err, (details)=> ({value: details.context.value, field})
                            );
                        }
                    }
                    const sqlOperator = operators[operator.trim().toLowerCase()];
                    if (!sqlOperator) {
                        throw new OperatorValidationError(`Unknown operator '${operator}'`, {operator});
                    }
                    const expression = [mysql.escapeId(computedFields[field].sqlField), sqlOperator, mysql.escape(value)];
                    index < arr.length - 1 && expression.push(orJoinOperator ? 'OR' : 'AND');
                    return expression.join(' ');
                }).join(' ')
            }`;

            if (query.offset < 0) {
                return sql()`SELECT * FROM (SELECT ${fieldsExpression} FROM ${mainTable} ${joinExpression} ORDER BY id DESC ${[
                    whereExpression,
                    sql(Math.abs(query.offset))`LIMIT ?`
                ]}) sub ${[
                    orderExpression,
                    query.limit && sql(query.limit)`LIMIT ?`
                ]}`;
            } else {
                return sql(mainTable)`SELECT ${fieldsExpression} FROM ?? ${[
                    joinExpression,
                    whereExpression,
                    orderExpression,
                    (query.offset || query.limit) && sql(query.offset, query.limit)`LIMIT ?, ?`,
                ]}`;
            }
        };

        if (queryCacheSize) {
            const currentQuery = {
                offset, limit, fields, order, where
            };

            const queryId= JSON.stringify(currentQuery);
            const cachedQuery = queryCache.find(([id]) => queryId===id);

            if (cachedQuery) {
                logger.debug(colorize()`Sql query built (from cache): ${cachedQuery[1]}`);
                return cachedQuery[1];
            }
            const querySql = buildQuery();
            queryCache.unshift([queryId, querySql]);
            queryCache.length > queryCacheSize && (queryCache.length = queryCacheSize);
            logger.debug(colorize()`Sql query built: ${querySql}`);
            return querySql;
        }

        return buildQuery();
    };
}

module.exports = {
    defineFetchQuery,
    ParamValidationError,
    OperatorValidationError
};
