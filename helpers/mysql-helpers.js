const {CustomError, ParamValidationError} = require('../common/errors');

class MysqlFKError extends CustomError {
}

const parseMysqlError = (err) => {
    const errorsParsers = {
        1452: {
            patterns: [
                [/FOREIGN KEY \(`(\w+)`\)/, (match)=> (match[1])]
            ],
            resolver: (field) => new MysqlFKError(`foreign key constraint fails for "${field}"`, {field})
        }
    };
    const code = err && err.errno;
    if (!code) {
        return null;
    }
    const entry = errorsParsers[code];
    if (entry) {
        const {patterns, resolver} = entry;
        const {length} = patterns;
        let result;
        for (let i = 0; i < length; i++) {
            const [regexp, parser] = patterns[i];
            const match = regexp.exec(err.message);
            if (match && (result = parser(match))){
                break;
            }
        }
        return result? resolver(result) : null;
    }
    return null;
};

const handleMysqlError= (err)=> {
    const mysqlError = parseMysqlError(err);

    if (mysqlError instanceof MysqlFKError) {
        throw new ParamValidationError(`Field "${mysqlError.details.field}" has bad reference`).status(400);
    }
    throw err;
};

module.exports = {
    parseMysqlError,
    MysqlFKError,
    handleMysqlError
};
