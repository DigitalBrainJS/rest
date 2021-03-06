const {mysqlQuery} = require('../asserts/mysql-db');
const sql = require('../utils/sql-template');
const {defineFetchQuery} = require('../utils/define-fetch-query');

const tableName = 'authors';

const fetchQuery = defineFetchQuery(tableName, {
    id: true,
    name: true,
});

const authors = {
    async getAll(offset= 0, limit = 1, options) {
        const query= fetchQuery(offset, limit, options);
        return (await mysqlQuery(query))[0];
    },

    async getId(id, fields){
        const result= (await mysqlQuery(fetchQuery(0, 1, {fields, where: [['id', '=', id]]})))[0];
        return result.length? result[0] : null;
    },

    async insertOne(data) {
        const sqlQuery = sql(tableName, Object.keys(data), Object.values(data))`INSERT ?? (??) VALUES (?)`;
        return (await mysqlQuery(sqlQuery))[0].insertId;
    },

    async updateOne(id, data){
        const sqlQuery = sql(tableName, data, 'id', id)`UPDATE ?? SET ? WHERE ??= ? LIMIT 1`;
        return (await mysqlQuery(sqlQuery))[0].affectedRows > 0;
    }
};

module.exports = authors;
