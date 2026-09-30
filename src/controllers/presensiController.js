const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = require('../config/database');

async function list(ctx) {
	const records = await prisma.$queryRaw`
		SELECT p.id, p.nim, p.tanggal, TIME_FORMAT(p.jam, '%H:%i:%s') AS jam,
		       p.waktu, p.lat, p.long, p.foto_wajah, p.status, p.keterangan,
		       u.nama, u.email, u.kamar_id, k.no_kamar, k.lantai, g.nama AS nama_gedung
		FROM presensi p
		JOIN \`user\` u ON u.nim = p.nim
		LEFT JOIN kamar k ON k.id = u.kamar_id
		LEFT JOIN gedung g ON g.id = k.gedung_id
		ORDER BY p.tanggal DESC, p.waktu DESC
	`;
	const visibleRecords = ctx.state.user.role === 'penghuni'
		? records.filter(record => record.nim === ctx.state.user.nim)
		: records;
	const mappedRecords = visibleRecords.map(record => {
		const session = record.keterangan?.match(/Sesi:\s*(subuh|malam)/i)?.[1]?.toLowerCase()
			|| (record.jam >= '18:00:00' ? 'malam' : 'subuh');
		return {
			id: record.id,
			nim: record.nim,
			jenis_presensi: session,
			tanggal: record.tanggal,
			waktu_presensi: record.waktu,
			lat: Number(record.lat),
			long: Number(record.long),
			foto_wajah: record.foto_wajah,
			status: record.status,
			keterangan: record.keterangan,
			user: {
				id: record.nim,
				nim_nip: record.nim,
				nama: record.nama,
				email: record.email,
				kamar: record.kamar_id === null ? null : {
					no_kamar: record.no_kamar,
					lantai: record.lantai,
					gedung: { nama_gedung: record.nama_gedung }
				}
			}
		};
	});
	ctx.body = { records: mappedRecords };
}

async function create(ctx) {
	const { jenis_presensi, lat, long, foto } = ctx.request.body || {};
	if (!['subuh', 'malam'].includes(jenis_presensi)) ctx.throw(400, 'Sesi presensi tidak valid');
	if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(long))) {
		ctx.throw(400, 'Lokasi perangkat wajib diizinkan');
	}
	const imageMatch = typeof foto === 'string' && foto.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+=*)$/);
	if (!imageMatch) ctx.throw(400, 'Bukti foto tidak valid');

	const now = new Date();
	const minutes = now.getHours() * 60 + now.getMinutes();
	const inSession = jenis_presensi === 'subuh'
		? minutes >= 240 && minutes <= 360
		: minutes >= 1080 && minutes <= 1230;
	if (!inSession) ctx.throw(400, 'Presensi hanya dapat dikirim pada jadwal sesi yang aktif');

	const today = now.toLocaleDateString('sv-SE');
	const clock = now.toTimeString().slice(0, 8);
	const existing = await prisma.$queryRaw`
		SELECT id FROM presensi
		WHERE nim = ${ctx.state.user.nim} AND tanggal = ${today}
		  AND ((${jenis_presensi} = 'subuh' AND jam BETWEEN '04:00:00' AND '06:00:00')
		    OR (${jenis_presensi} = 'malam' AND jam BETWEEN '18:00:00' AND '20:30:00'))
		LIMIT 1
	`;
	if (existing.length) ctx.throw(409, 'Anda sudah mengirim presensi untuk sesi ini');

	const uploadDir = path.join(__dirname, '../../uploads/foto_wajah');
	await fs.mkdir(uploadDir, { recursive: true });
	const filename = `${randomUUID()}.${imageMatch[1] === 'png' ? 'png' : 'jpg'}`;
	const photoPath = path.join(uploadDir, filename);
	await fs.writeFile(photoPath, Buffer.from(imageMatch[2], 'base64'));

	try {
		await prisma.$executeRaw`
			INSERT INTO presensi (nim, tanggal, jam, waktu, lat, \`long\`, foto_wajah, status, keterangan)
			VALUES (${ctx.state.user.nim}, ${today}, ${clock}, ${now}, ${Number(lat)}, ${Number(long)},
			        ${`/uploads/foto_wajah/${filename}`}, 'hadir', ${`Sesi: ${jenis_presensi}`})
		`;
		ctx.status = 201;
		ctx.body = { record: { id: null, nim: ctx.state.user.nim, tanggal: today, jam: clock, status: 'hadir' } };
	} catch (error) {
		await fs.unlink(photoPath).catch(() => {});
		throw error;
	}
}

module.exports = { list, create };
