require('dotenv').config();
const Koa = require('koa');
const prisma = require('./config/database');

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(async (ctx) => {
  ctx.body = { message: 'Server jalan, cek koneksi DB di terminal' };
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