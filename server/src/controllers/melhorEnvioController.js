import { pool } from '../database/connection.js';

const ME_API = process.env.MELHOR_ENVIO_ENV === 'production'
  ? 'https://api.melhorenvio.com'
  : 'https://sandbox.melhorenvio.com.br';

const CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID;
const CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET;
const REDIRECT_URI = process.env.MELHOR_ENVIO_REDIRECT_URI;
const SCOPES = 'shipping-calculate';

export function getAuthUrl(req, res) {
  const state = Math.random().toString(36).substring(2);
  const url = `${ME_API}/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${state}&scope=${SCOPES}`;
  res.json({ success: true, url });
}

export async function handleCallback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Código de autorização não recebido.' });
  }

  try {
    const meResponse = await fetch(`${ME_API}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CasaSoPimenta (casasopimenta@gmail.com)'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      })
    });

    const data = await meResponse.json();

    if (!meResponse.ok || !data.access_token) {
      console.error('Melhor Envio token error:', JSON.stringify(data));
      return res.redirect('/site/pages/admin/configuracoes/index.html?me_status=error');
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await pool.query(`
      INSERT INTO integrations (provider, access_token, refresh_token, expires_at, token_type, scopes, updated_at)
      VALUES ('melhor_envio', $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (provider)
      DO UPDATE SET
        access_token = $1,
        refresh_token = $2,
        expires_at = $3,
        token_type = $4,
        scopes = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [data.access_token, data.refresh_token || null, expiresAt, data.token_type || 'Bearer', SCOPES]);

    return res.redirect('/site/pages/admin/configuracoes/index.html?me_status=connected');
  } catch (err) {
    console.error('Erro no callback Melhor Envio:', err);
    return res.redirect('/site/pages/admin/configuracoes/index.html?me_status=error');
  }
}

export async function getStatus(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM integrations WHERE provider = 'melhor_envio'"
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, connected: false });
    }

    const integration = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(integration.expires_at);
    const isExpired = expiresAt <= now;
    const expiresInDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      connected: true,
      expired: isExpired,
      expires_in_days: expiresInDays,
      scopes: integration.scopes,
      updated_at: integration.updated_at
    });
  } catch (err) {
    console.error('Erro ao verificar status Melhor Envio:', err);
    res.status(500).json({ message: 'Erro ao verificar status.' });
  }
}

export async function disconnect(req, res) {
  try {
    await pool.query("DELETE FROM integrations WHERE provider = 'melhor_envio'");
    res.json({ success: true, message: 'Integração desvinculada.' });
  } catch (err) {
    console.error('Erro ao desvincular Melhor Envio:', err);
    res.status(500).json({ message: 'Erro ao desvincular.' });
  }
}

export async function getAccessToken() {
  const result = await pool.query(
    "SELECT * FROM integrations WHERE provider = 'melhor_envio'"
  );

  if (result.rows.length === 0) return null;

  const integration = result.rows[0];
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);
  const BUFFER_MS = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > BUFFER_MS) {
    return integration.access_token;
  }

  if (!integration.refresh_token) return null;

  try {
    const meResponse = await fetch(`${ME_API}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CasaSoPimenta (casasopimenta@gmail.com)'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: integration.refresh_token
      })
    });

    const data = await meResponse.json();

    if (!meResponse.ok || !data.access_token) {
      console.error('Erro ao renovar token Melhor Envio:', JSON.stringify(data));
      return null;
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    await pool.query(`
      UPDATE integrations
      SET access_token = $1,
          refresh_token = $2,
          expires_at = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE provider = 'melhor_envio'
    `, [data.access_token, data.refresh_token || integration.refresh_token, newExpiresAt]);

    return data.access_token;
  } catch (err) {
    console.error('Erro ao renovar token Melhor Envio:', err);
    return null;
  }
}
