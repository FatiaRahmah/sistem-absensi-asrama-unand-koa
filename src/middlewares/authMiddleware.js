const jwt = require('jsonwebtoken');

async function authenticate(ctx, next) {
	if (!process.env.JWT_SECRET) ctx.throw(500, 'JWT_SECRET belum dikonfigurasi di file .env');
	const authorization = ctx.get('authorization');
	const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
	if (!token) ctx.throw(401, 'Silakan login terlebih dahulu');

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		ctx.state.user = { nim: String(payload.nim), role: payload.role };
	} catch {
		ctx.throw(401, 'Sesi login tidak valid atau sudah berakhir');
	}

	await next();
}

module.exports = authenticate;
