const config= require('../config/default');
const {createLogger, format, transports} = require('winston');
const strip = require('strip-ansi');
const chalk = require('chalk');
const moment = require('moment');
const {combine} = format;
const LOGS_DIR = config.logs.path;

const logger = createLogger({
    //level: 'info',
    format: combine(
        format.timestamp(),
        format.simple(),
    ),
    transports: [
        new transports.File({
            filename: LOGS_DIR + '/default.log', format: format.printf(({timestamp, level, message}) => {
                return `[${moment(timestamp).format("YYYY-MM-DD HH:mm:ss")}] [${level}]: ${strip(message + '')}`;
            })
        }),
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        level: 'silly',
        format: format.combine(
            format.timestamp(),
            //format.colorize(),
            format.simple(),
            format.printf(msg => {
                let {level, message, timestamp} = msg;

                switch (level) {
                    case 'error':
                        level = chalk.red.bold(level);
                        message = chalk.red(message);
                        break;
                    case 'warn':
                        level = chalk.red(level);
                        message = chalk.red(message);
                        break;
                    case 'info':
                        level = chalk.yellow(level);
                        break;
                    case 'debug':
                        level = chalk.magenta(level);
                        break;
                }

                return `${chalk.blue(moment(timestamp).format("HH:mm:ss"))} - [${level}]: ${message}`;
            })
        )
    }));
}

const colorize = (fn = (value) => chalk.green.bold(value)) => {
    return (str, ...vars) => {
        const result = [];
        const {length} = vars;
        str.forEach((str, index) => {
            result.push(str);
            if (index < length) {
                result.push(fn(vars[index], index));
            }
        });
        return result.join('');
    };
};

module.exports = {colorize, logger};
