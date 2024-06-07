const cors = require('cors');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const sqliteStorage = require('./sqlite-storage');

const app = express();

const validateNameAndEmail = [
    body('name')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Name is required')
        .isAlphanumeric('en-US', { ignore: ' ' })
        .withMessage('Name must contain only letters and spaces'),
    body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail()
];

const PORT = process.env.PORT || 5000;

const db = require('better-sqlite3')('./database.sqlite');

const queries = {
    insertPhoto: db.prepare(
        'INSERT INTO `photos` (`uuid`, `photo`, `created`) VALUES (?, ?, ?)'
    ),

    getPhoto: db.prepare('SELECT `photo` FROM `photos` WHERE `uuid` = ?'),

    getName: db.prepare('SELECT `name` FROM `photos` WHERE `uuid` = ?'),

    updateInfo: db.prepare(
        'UPDATE `photos` SET `name` = ?, `email` = ? WHERE `uuid` = ?'
    )
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
app.post('/upload', upload.single('file'), (req, res, next) => {
    try {
        res.status(200).json({ uuid: req.file.id });
    } catch (e) {
        next(e);
    }
});

app.get('/photo/:uuid', (req, res, next) => {
    try {
        const file = queries.getPhoto.pluck().get(req.params.uuid);

        if (!file) {
            return next();
        }

        res.setHeader('Content-Type', 'image/jpeg');

        /*res.setHeader(
            'Content-disposition',
            'attachment; filename=seabears-shot.jpg'
        );*/

        res.end(file);
    } catch (e) {
        next(e);
    }
});

const formHtml = fs.readFileSync('./form.html', 'utf8');

app.get('/submit/:uuid', (req, res, next) => {
    const { uuid } = req.params;

    const name = queries.getName.pluck().get(uuid);

    if (typeof name !== 'string') {
        return next();
    }

    // don't allow people who already submitted to re-submit
    if (name.length >= 1) {
        return res.redirect(`/photo/${uuid}`);
    }

    res.end(formHtml.replace('$photo_url', `/photo/${uuid}`));
});

app.post(
    '/submit/:uuid',
    express.urlencoded({ extended: false }),
    validateNameAndEmail,
    (req, res, next) => {
        const { uuid } = req.params;

        if (!uuid) {
            return next();
        }

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors);
            return next();
        }

        const existingName = queries.getName.pluck().get(uuid);

        if (existingName) {
            return res.redirect(`/photo/${uuid}`);
        }

        const { name, email } = req.body;

        queries.updateInfo.run(name, email, uuid);

        res.redirect(`/photo/${uuid}`);
    }
);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(404).end('');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
