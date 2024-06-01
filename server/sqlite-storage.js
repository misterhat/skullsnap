const streamToBuffer = require('stream-to-buffer');
const { v4: uuidv4 } = require('uuid');

class SqliteStorage {
    constructor({ insert, remove }) {
        this.insert = insert;
        this.remove = remove;
    }

    _handleFile(req, file, done) {
        const that = this;

        try {
            streamToBuffer(file.stream, (err, buffer) => {
                if (err) {
                    return done(err);
                }

                const id = uuidv4();

                that.insert.run(id, buffer, new Date().getTime());

                done(null, { id });
            });
        } catch (e) {
            done(e);
        }
    }

    _removeFile(req, file, done) {
        done();
    }
}

module.exports = (opts) => new SqliteStorage(opts);
