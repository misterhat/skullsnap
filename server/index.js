const cors = require('cors');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const sqliteStorage = require('./sqlite-storage');

const app = express();

const PORT = process.env.PORT || 5000;

const db = require('better-sqlite3')('./database.sqlite');

const queries = {
    insertPhoto: db.prepare(
        'INSERT INTO `photos` (`uuid`, `photo`, `created`) VALUES (?, ?, ?)'
    ),

    getPhoto: db.prepare('SELECT `photo` FROM `photos` WHERE `uuid` = ?')
};

const upload = multer({
    storage: sqliteStorage({
        insert: queries.insertPhoto,
        remove: null
    })
});

app.use(
    cors({
        origin: ['http://localhost:3000', 'http://172.30.6.158:3000'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
    })
);

app.use(express.static('public'));

// TODO make sure this is limited with a key or something
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        res.status(200).json({ file: req.file.filename });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/photo/:uuid', (req, res) => {});

const formHtml = fs.readFileSync('./form.html', 'utf8');

app.get('/submit/:uuid', (req, res) => {
    res.end(formHtml);
});

app.post('/submit/:uuid', (req, res) => {
    res.end();
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
