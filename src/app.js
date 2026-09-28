require('dotenv').config();
const path = require('path');
const serve = require('koa-static');
const Koa = require('koa');
const prisma = require('./config/database');

const app = new Koa();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from /public
app.use(serve(path.join(__dirname, '../public')));

app.use(async (ctx, next) => {
  if (ctx.path === '/api/health') {
    ctx.body = { message: 'Server jalan, cek koneksi DB di terminal' };
  } else {
    await next();
  }
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Berhasil konek ke database absensi_unand');
  } catch (err) {
    console.error('❌ Gagal konek ke database:', err.message);
  }
}

testConnection();

app.listen(PORT, () => {
  console.log(`🚀 Server Koa berjalan di http://localhost:${PORT}`);
});