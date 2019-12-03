const mysql = require('mysql2/promise');

const sql = (...inserts) => (strings, ...values) => {
    const {length} = values;
    return mysql.format(strings.map((str, i) => {
        const value = values[i];
        return str + (i < length ? (Array.isArray(value) ?
                value.map(member => typeof member === 'string' ? member : '').filter(Boolean).join(' ') :  value || '')
                : ''
        );
    }).join(''), inserts);
};

module.exports= sql;
