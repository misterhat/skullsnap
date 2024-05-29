const cors = require('cors');
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();

const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
    destination: function (req, file, done) {
        done(null, './uploads/');
    },
    filename: function (req, file, done) {
        done(null, `${uuidv4()}.jpg`);
    }
});

const upload = multer({ storage });

app.use(
    cors({
        origin: ['http://localhost:3000', 'http://172.30.6.158:3000'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
    })
);

app.use(express.static('uploads'));

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        res.status(200).json({ file: req.file.filename });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
