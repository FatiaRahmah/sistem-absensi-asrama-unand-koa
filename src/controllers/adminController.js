const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { roleFor } = require('./authController');

function mapUser(row) {
	return {
		id: row.nim,
		nim_nip: row.nim,
		nama: row.nama,
		email: row.email,
		role: roleFor(row.nim),
		kamar: row.kamar_id === null ? null : {
			id: row.kamar_id,
			no_kamar: row.no_kamar,
			lantai: row.lantai,
			gedung: { nama_gedung: row.nama_gedung }
		}
	};
}

async function fetchUsers() {
	const rows = await prisma.$queryRaw`
		SELECT u.nim, u.nama, u.email, u.kamar_id,
		       k.no_kamar, k.lantai, g.nama AS nama_gedung
		FROM \`user\` u
		LEFT JOIN kamar k ON k.id = u.kamar_id
		LEFT JOIN gedung g ON g.id = k.gedung_id
		ORDER BY u.nama
	`;
	return rows.map(mapUser);
}

async function listUsers(ctx) {
	const users = await fetchUsers();
	ctx.body = { users: ctx.query.role ? users.filter(user => user.role === ctx.query.role) : users };
}

async function listResidents(ctx) {
	ctx.body = { users: (await fetchUsers()).filter(user => user.role === 'penghuni') };
}

async function createUser(ctx) {
	const { nim_nip, nama, email, password, role, id_kamar } = ctx.request.body || {};
	if (!nim_nip || !nama || !email || !password || !role) {
		ctx.throw(400, 'NIM, nama, email, password, dan role wajib diisi');
	}
	if (role !== 'penghuni') {
		ctx.throw(400, 'Role admin/fasilitator tidak tersimpan pada ERD; daftarkan NIM di ADMIN_NIMS atau FACILITATOR_NIMS');
	}
	if (password.length < 8) ctx.throw(400, 'Password minimal 8 karakter');

	await prisma.$executeRaw`
		INSERT INTO \`user\` (nim, nama, email, password, kamar_id)
		VALUES (${nim_nip}, ${nama}, ${email}, ${await bcrypt.hash(password, 12)}, ${id_kamar ? Number(id_kamar) : null})
	`;
	const [user] = await prisma.$queryRaw`
		SELECT u.nim, u.nama, u.email, u.kamar_id,
		       k.no_kamar, k.lantai, g.nama AS nama_gedung
		FROM \`user\` u
		LEFT JOIN kamar k ON k.id = u.kamar_id
		LEFT JOIN gedung g ON g.id = k.gedung_id
		WHERE u.nim = ${nim_nip}
		LIMIT 1
	`;
	ctx.status = 201;
	ctx.body = { user: mapUser(user) };
}

module.exports = { listUsers, listResidents, createUser };
