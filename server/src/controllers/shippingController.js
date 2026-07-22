import { pool } from '../database/connection.js';
import { selectBox } from '../config/boxes.js';
import { getAccessToken } from './melhorEnvioController.js';
import crypto from 'crypto';

const MELHOR_ENVIO_API = process.env.MELHOR_ENVIO_ENV === 'production'
  ? 'https://api.melhorenvio.com'
  : 'https://sandbox.melhorenvio.com.br';

const ORIGIN_CEP = (process.env.ORIGIN_CEP || '').replace(/\D/g, '');
const CACHE_DURATION_MS = 15 * 60 * 1000;
const CACHE_MAX_SIZE = 500;

const DEFAULT_WEIGHT_LIGHT = 0.1;
const DEFAULT_WEIGHT_HEAVY = 0.3;
const LIGHT_CATEGORIES = ['farinhas', 'castanhas', 'temperos'];

function getDefaultWeight(categorySlug) {
  if (categorySlug && LIGHT_CATEGORIES.includes(categorySlug.toLowerCase())) {
    return DEFAULT_WEIGHT_LIGHT;
  }
  return DEFAULT_WEIGHT_HEAVY;
}

const freightCache = new Map();

function getCacheKey(cep) {
  return cep.replace(/\D/g, '');
}

function getFromCache(cep) {
  const key = getCacheKey(cep);
  const entry = freightCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION_MS) {
    return entry.data;
  }
  freightCache.delete(key);
  return null;
}

function setCache(cep, data) {
  if (freightCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = freightCache.keys().next().value;
    freightCache.delete(oldestKey);
  }
  const key = getCacheKey(cep);
  freightCache.set(key, { data, timestamp: Date.now() });
}

export async function calculateShipping(req, res) {
  try {
    const { cep: rawCep, cart } = req.body || {};

    if (!rawCep) {
      return res.status(400).json({ message: 'CEP é obrigatório.' });
    }

    const destCep = rawCep.replace(/\D/g, '');
    if (destCep.length !== 8) {
      return res.status(400).json({ message: 'CEP inválido.' });
    }

    if (!ORIGIN_CEP || ORIGIN_CEP.length !== 8) {
      return res.status(500).json({ message: 'CEP de origem não configurado.' });
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ message: 'Melhor Envio não conectado. Vincule a integração em Configurações.' });
    }

    let totalWeight = 0;

    if (cart && cart.length > 0) {
      for (const item of cart) {
        let unitWeight = 0;
        if (item.product_id) {
          const result = await pool.query(`
            SELECT p.weight, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.id = $1
          `, [item.product_id]);
          if (result.rows[0]) {
            const stored = Number(result.rows[0].weight) || 0;
            unitWeight = stored > 0 ? stored : getDefaultWeight(result.rows[0].category_slug);
          }
        } else if (item.kit_id) {
          const kitItems = await pool.query(`
            SELECT p.weight, c.slug as category_slug, ki.quantity
            FROM kit_items ki
            JOIN products p ON p.id = ki.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE ki.kit_id = $1
          `, [item.kit_id]);
          for (const ki of kitItems.rows) {
            const stored = Number(ki.weight) || 0;
            unitWeight += (stored > 0 ? stored : getDefaultWeight(ki.category_slug)) * (Number(ki.quantity) || 1);
          }
        }
        totalWeight += unitWeight * (item.quantity || 1);
      }
    }

    const cached = getFromCache(destCep);
    if (cached && cached.services) {
      const box = selectBox(totalWeight);
      const response = {
        success: true,
        services: cached.services,
        selected_box: { name: box.name || box.id, price: 0 },
        box_id: box.id,
        box_price: 0,
        box_width: box.width,
        box_height: box.height,
        box_length: box.length,
        total_weight: totalWeight
      };
      return res.json(response);
    }

    const box = selectBox(totalWeight);

    const requestId = crypto.randomUUID();

    const meResponse = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'CasaSoPimenta (casasopimenta@gmail.com)'
      },
      body: JSON.stringify({
        from: { postal_code: ORIGIN_CEP },
        to: { postal_code: destCep },
        package: {
          width: box.width,
          height: box.height,
          length: box.length,
          weight: Math.max(totalWeight, 0.1)
        },
        options: {
          receipt: false,
          own_hand: false
        },
        services: '1,2'
      })
    });

    if (!meResponse.ok) {
      const errData = await meResponse.json().catch(() => ({}));
      console.error('Melhor Envio error:', JSON.stringify(errData));

      if (meResponse.status === 422) {
        return res.status(400).json({ message: 'CEP de destino não atendido pelos Correios.' });
      }

      return res.status(502).json({ message: 'Erro ao consultar frete. Tente novamente.' });
    }

    const meData = await meResponse.json();

    const correctionsOptions = [];

    for (const service of meData) {
      if (service.error) continue;

      const name = (service.name || service.company?.name || '').toLowerCase();

      if (name.includes('pac') || service.id === 1) {
        correctionsOptions.push({
          service: 'PAC',
          name: service.name || 'PAC',
          price: Number(service.price),
          delivery_time: Number(service.delivery_time) || 0,
          company: service.company?.name || 'Correios'
        });
      } else if (name.includes('sedex') || service.id === 2) {
        correctionsOptions.push({
          service: 'SEDEX',
          name: service.name || 'SEDEX',
          price: Number(service.price),
          delivery_time: Number(service.delivery_time) || 0,
          company: service.company?.name || 'Correios'
        });
      }
    }

    const result = {
      success: true,
      services: correctionsOptions,
      selected_box: { name: box.name || box.id, price: 0 },
      box_id: box.id,
      box_price: 0,
      box_width: box.width,
      box_height: box.height,
      box_length: box.length,
      total_weight: totalWeight
    };

    setCache(destCep, { services: correctionsOptions, selected_box: result.selected_box });
    res.json(result);
  } catch (err) {
    console.error('Erro calculateShipping:', err);
    res.status(500).json({ message: 'Erro ao calcular frete.' });
  }
}
