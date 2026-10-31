export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default demo user context for development if unauthenticated
    req.user = {
      id: 'usr-demo-admin-01',
      role: req.headers['x-role'] || 'Admin',
      name: 'Rajnandini Admin',
      email: 'admin@sunpowersolutions.demo'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  // Basic token decoding for demo/modular dev
  try {
    req.user = {
      id: 'usr-demo-01',
      role: req.headers['x-role'] || 'Admin',
      name: 'Staff User',
      token
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role permissions' } });
    }
    next();
  };
};
