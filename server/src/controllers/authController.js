import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection.js';

export function register(req, res) {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'Nome, email e senha são obrigatórios.'
    });
  }

  const userExists = db.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
  `).get(email);

  if (userExists) {
    return res.status(400).json({
      message: 'Este email já está cadastrado.'
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const insert = db.prepare(`
    INSERT INTO users (name, email, password, phone)
    VALUES (?, ?, ?, ?)
  `);

  const result = insert.run(
    name,
    email,
    hashedPassword,
    phone || null
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Usuário cadastrado com sucesso.'
  });
}

export function login(req, res) {
  const { email, password } = req.body;

  const user = db.prepare(`
    SELECT *
    FROM users
    WHERE email = ?
  `).get(email);

  if (!user) {
    return res.status(401).json({
      message: 'Email ou senha inválidos.'
    });
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password);

  if (!passwordIsValid) {
    return res.status(401).json({
      message: 'Email ou senha inválidos.'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d'
    }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
}