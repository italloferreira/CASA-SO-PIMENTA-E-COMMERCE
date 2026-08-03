import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.csp_admin_token) {
    token = req.cookies.csp_admin_token;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2) token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Token não informado.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: 'Sessão expirada. Faça login novamente.',
      session_expired: true
    });
  }
}

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Acesso negado. Apenas administradores.'
    });
  }

  next();
}

export function optionalAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.csp_admin_token) {
    token = req.cookies.csp_admin_token;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2) token = parts[1];
    }
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    // Token inválido ou expirado — apenas segue sem autenticação
  }

  next();
}

