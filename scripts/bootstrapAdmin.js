require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/database');

async function bootstrapAdmin() {
  const nim = process.env.INITIAL_ADMIN_NIM?.trim();
  const nama = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const adminNims = (process.env.ADMIN_NIMS || '').split(',').map(value => value.trim());

  if (!nim || !nama || !email || !password) {
    throw new Error('Isi INITIAL_ADMIN_NIM, INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, dan INITIAL_ADMIN_PASSWORD di .env');
  }
  if (password.length < 8) throw new Error('Password admin minimal 8 karakter');
  if (!adminNims.includes(nim)) throw new Error('Tambahkan NIM awal ke ADMIN_NIMS agar role admin dapat dikenali');

  const rows = await prisma.$queryRaw`SELECT COUNT(*) AS user_count FROM \`user\``;
  if (Number(rows[0].user_count) !== 0) {
    throw new Error('Bootstrap hanya berjalan saat tabel user masih kosong');
  }

  await prisma.$executeRaw`
    INSERT INTO \`user\` (nim, nama, email, password)
    VALUES (${nim}, ${nama}, ${email}, ${await bcrypt.hash(password, 12)})
  `;
  console.log(`Akun admin awal berhasil dibuat untuk NIM ${nim}.`);
}

bootstrapAdmin()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
