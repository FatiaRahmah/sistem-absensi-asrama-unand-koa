function allowRoles(...roles) {
	return async (ctx, next) => {
		if (!roles.includes(ctx.state.user.role)) ctx.throw(403, 'Anda tidak memiliki akses');
		await next();
	};
}

module.exports = allowRoles;
