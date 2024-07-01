const fs = require('fs');

const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const { createCanvas, loadImage } = require('canvas');

const THUMB_SIZE = 100;

async function halveImageBuffer(imageBuffer) {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');

    const image = await loadImage(imageBuffer);

    canvas.width = THUMB_SIZE;
    canvas.height = THUMB_SIZE;

    ctx.drawImage(image, 0, 0, THUMB_SIZE, THUMB_SIZE);

    return canvas.toBuffer('image/jpeg');
}

const db = new Database('/home/zorian/seabears-jul-27/database.sqlite');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Photos');

worksheet.columns = [
    { header: 'Photo', key: 'photo', width: 20 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Created', key: 'created', width: 25 }
];

const stmt = db.prepare('SELECT photo, name, email, created FROM photos');
const rows = stmt.all();

rows.forEach(({ photo, name, email, created }) => {
    const row = worksheet.addRow([
        null,
        name,
        email,
        new Date(created).toLocaleString('en-ca')
    ]);

    row.height = THUMB_SIZE;

    const imageId = workbook.addImage({
        buffer: halveImageBuffer(photo),
        extension: 'jpeg',
    });

    worksheet.addImage(imageId, {
        tl: { col: 0, row: row.number - 1 },
        ext: { width: 100, height: 100 }
    })
});

(async () => {
    await workbook.xlsx.writeFile('photos.xlsx');
    db.close();
})();
