const config = require('../config/default');
const mysql = require('mysql2/promise');
const argv = require('minimist')(process.argv.slice(2));

const booksMock = require('./asserts/books.json');
const authorMock = require('./asserts/authors.json');

const {count: booksCountRequired= 100000, batch: batchSize = 5000} = argv;
const authorsCount = authorMock.objects.length;

const now = Date.now();
const startTimeStamp = new Date(1500, 0, 0).getTime();

const randomStr = () => Math.random().toString(36).substring(7);
const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min));
const peekRandom = (arr) => arr[randomInt(0, arr.length)];

const synonyms = ['Incredible', 'Unbelievable', 'Super', 'Cool', 'Breathtaking', 'Killing', 'Fabulous'];
const synonyms2 = ['description', 'narration', 'story', 'depiction'];

const generateBookEntry = (title) => {
    return [
        title,
        `${peekRandom(synonyms)} ${peekRandom(synonyms2)} for book "${title}"`,
        1 + Math.floor(Math.random() * authorsCount),
        new Date(randomInt(startTimeStamp, now)),
        `${randomStr()}.jpg`
    ]
};

(async () => {
    const pool = await mysql.createPool({
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        waitForConnections: true,
        multipleStatements: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        await pool.query(`CREATE DATABASE IF NOT EXISTS ${config.mysql.db}`);
        await pool.query(`use ${config.mysql.db}`);
        await pool.query(`
        ALTER TABLE books
        DROP FOREIGN KEY FK_books_author;
        DROP TABLE authors;
        DROP TABLE books;
        `);
    } catch (e) {
        console.log(e.message);
    }

    await pool.query(`       
        CREATE TABLE authors (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, 
            name varchar(50) NOT NULL,
            PRIMARY KEY (id)
        )               
        ENGINE = INNODB,
        CHARACTER SET utf8mb4,
        COLLATE utf8mb4_0900_ai_ci;        
        CREATE TABLE books (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            author bigint(20) UNSIGNED NOT NULL,
            description varchar(255) DEFAULT '',
            date date DEFAULT NULL,
            image varchar(255) DEFAULT NULL,       
            PRIMARY KEY (id),
            CONSTRAINT FK_books_author FOREIGN KEY (author) REFERENCES authors (id) ON DELETE CASCADE
        )
        ENGINE = INNODB,
        CHARACTER SET utf8mb4,
        COLLATE utf8mb4_0900_ai_ci;     
    `);

    //skipping UNIQUE(title, author) - it's too hard to generate unique dummy data

    let queryResult = await pool.query(`INSERT INTO authors (name) VALUES ?`, [authorMock.objects.map(({name}) => {
        return [name];
    })]);

    console.log(`Inserted ${queryResult[0].affectedRows} authors records`);

    let bookCounter = 0;

    const insertBooks = (entries) => {
        bookCounter += entries.length;
        return pool.query(`INSERT INTO books (title, description, author, date, image) VALUES ?`, [entries]);
    };

    await insertBooks(booksMock.objects.map(({title}) => generateBookEntry(title)));

    while (bookCounter < booksCountRequired) {
        const books = Array(batchSize);
        for (let i = 0; i < batchSize; i++) {
            books[i] = generateBookEntry(`${peekRandom(synonyms)} title (${randomStr()})`)
        }
        await insertBooks(books);
        console.log(`Generated ${bookCounter} books from ${booksCountRequired}`);
    }

    pool.end();
    console.log('Done.');
})().catch(() => process.exit(1));






