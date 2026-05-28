import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não informado.'
    });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({
      message: 'Token inválido.'
    });
  }
}

export function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Acesso negado. Apenas administradores.'
    });
  }

  next();
}