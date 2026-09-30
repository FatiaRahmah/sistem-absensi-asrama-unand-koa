const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('@koa/multer');

const destination = path.join(__dirname, '../../uploads/bukti_izin');
fs.mkdirSync(destination, { recursive: true });

const storage = multer.diskStorage({
	destination(_req, _file, callback) {
		callback(null, destination);
	},
	filename(_req, file, callback) {
		const extension = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' }[file.mimetype];
		callback(null, `${Date.now()}-${randomUUID()}${extension}`);
	}
});

module.exports = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter(_req, file, callback) {
		const accepted = ['application/pdf', 'image/jpeg', 'image/png'];
		if (!accepted.includes(file.mimetype)) {
			const error = new Error('Format bukti harus PDF, JPG, atau PNG');
			error.status = 400;
			return callback(error);
		}
		callback(null, true);
	}
});
