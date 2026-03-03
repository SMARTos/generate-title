/**
 * Serverless-функция для Vercel (проект generate-title-lib2).
 * По тексту промпта возвращает короткий заголовок через DeepSeek API.
 * CORS включён для запросов из расширения Chrome.
 * Ключ: переменная окружения DEEPSEEK_API_KEY.
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (_) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const text = (body?.text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Missing or empty "text"' });
    return;
  }

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Ты делаешь заголовки для промтов. На вход получаешь текст и должен сделать заголовок для этого промпта (до 4–7 слов), на том же языке, что и текст. Без кавычек и пояснений — только заголовок.Обязательно проверь что на выходе ты получил заголовок не более 7 слов, если нет то исправь до получения нужного результата.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: 'DeepSeek API error', details: err });
      return;
    }

    const data = await response.json();
    const title = data?.choices?.[0]?.message?.content?.trim() || text.slice(0, 50);
    res.status(200).json({ title });
  } catch (e) {
    res.status(500).json({ error: 'Request failed', details: e.message });
  }
}
