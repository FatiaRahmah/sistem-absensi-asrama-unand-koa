const Router = require('@koa/router');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const izinController = require('../controllers/izinController');
const presensiController = require('../controllers/presensiController');
const authenticate = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const prisma = require('../config/database');

const router = new Router({ prefix: '/api' });

router.get('/health', async (ctx) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		ctx.body = { message: 'Server dan database MySQL terhubung' };
	} catch {
		ctx.throw(503, 'Database MySQL belum terhubung');
	}
});
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);
router.get('/users', authenticate, allowRoles('admin'), adminController.listUsers);
router.post('/users', authenticate, allowRoles('admin'), adminController.createUser);
router.get('/residents', authenticate, allowRoles('admin', 'fasil'), adminController.listResidents);
router.get('/presensi', authenticate, presensiController.list);
router.post('/presensi', authenticate, allowRoles('penghuni'), presensiController.create);
router.get('/izin', authenticate, izinController.list);
router.post('/izin', authenticate, allowRoles('penghuni'), upload.single('bukti'), izinController.create);
router.patch('/izin/:id/status', authenticate, allowRoles('fasil', 'admin'), izinController.updateStatus);

module.exports = router;
