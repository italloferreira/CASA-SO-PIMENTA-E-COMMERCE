import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection.js';

export async function register(req, res) {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'Nome, email e senha são obrigatórios.'
    });
  }

  const userExists = await pool.query(`
    SELECT id FROM users WHERE email = $1
  `, [email]);

  if (userExists.rows.length > 0) {
    return res.status(400).json({
      message: 'Este email já está cadastrado.'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(`
    INSERT INTO users (name, email, password, phone)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [
    name,
    email,
    hashedPassword,
    phone || null
  ]);

  res.status(201).json({
    id: result.rows[0].id,
    message: 'Usuário cadastrado com sucesso.'
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const result = await pool.query(`
    SELECT * FROM users WHERE email = $1
  `, [email]);

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({
      message: 'Email ou senha inválidos.'
    });
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);

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
      cep: user.cep,
      address: user.address,
      city: user.city,
      state: user.state,
      role: user.role
    }
  });
}

export async function getProfile(req, res) {
  const { id } = req.user;

  const result = await pool.query(`
    SELECT id, name, email, phone, cep, address, city, state, role, created_at
    FROM users WHERE id = $1
  `, [id]);

  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({
      message: 'Usuário não encontrado.'
    });
  }

  res.json(user);
}

export async function updateProfile(req, res) {
  const { id } = req.user;
  const { name, phone, cep, address, city, state } = req.body;

  if (!name) {
    return res.status(400).json({
      message: 'Nome é obrigatório.'
    });
  }

  const result = await pool.query(`
    UPDATE users
    SET name = $1, phone = $2, cep = $3, address = $4, city = $5,
        state = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING id, name, email, phone, cep, address, city, state, role
  `, [
    name,
    phone || null,
    cep || null,
    address || null,
    city || null,
    state || null,
    id
  ]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: 'Usuário não encontrado.'
    });
  }

  const updatedUser = result.rows[0];

  res.json({
    message: 'Perfil atualizado com sucesso.',
    user: updatedUser
  });
}
