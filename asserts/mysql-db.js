const {mysql: {host, user, password, db}} = require('../config/default');
const mysql= require('mysql2/promise');
const {logger, colorize} = require('../common/logger');
const {benchmark}= require('../utils/utils');
const chalk= require('chalk');

const pool= mysql.createPool({
    host,
    user,
    password,
    database: db,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports= {
    db: pool,

    mysqlQuery: async(sql)=>{
        const timestamp= process.hrtime();
        const result= await pool.query(sql);
        logger.debug(colorize((str)=> chalk.magenta(str))`Sql query [${((benchmark(timestamp)/1000000).toFixed(2))} ms] (${sql})`);
        return result;
    }
};
