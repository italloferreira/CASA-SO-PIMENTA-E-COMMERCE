import { pool } from '../database/connection.js';

export async function getSettings(req, res) {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(function (row) {
      settings[row.key] = row.value;
    });
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar configurações.' });
  }
}

export async function updateSettings(req, res) {
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Envie um objeto com as configurações.' });
    }

    const keys = Object.keys(data);

    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma configuração enviada.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const key of keys) {
        await client.query(`
          INSERT INTO settings (key, value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (key)
          DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
        `, [key, String(data[key])]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const result = await pool.query('SELECT key, value FROM settings');
    const settings = {};
    result.rows.forEach(function (row) {
      settings[row.key] = row.value;
    });

    res.json({ success: true, settings });
  } catch (err) {
    console.error('Erro ao atualizar configurações:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar configurações.' });
  }
}
