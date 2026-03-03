/**
 * Serverless-функция для Vercel (проект generate-title-lib2).
 * По тексту промпта возвращает короткий заголовок через DeepSeek API.
 * CORS включён для запросов из расширения Chrome.
 * Ключ: переменная окружения DEEPSEEK_API_KEY.
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

/** Максимум символов текста для генерации заголовка (лимит запроса к API) */
const MAX_TEXT_LENGTH = 4000;

function truncateText(s) {
  const t = (s || '').trim();
  if (t.length <= MAX_TEXT_LENGTH) return t;
  const cut = t.slice(0, MAX_TEXT_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

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

  let text = (body?.text || '').trim();
  if (!text) {
    res.status(400).json({ error: 'Missing or empty "text"' });
    return;
  }
  text = truncateText(text);

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
            content: `Ты генерируешь только заголовок для текста. Правила строго:
1. Выведи ОДНУ короткую фразу (4–8 слов) — название/заголовок к тексту, на том же языке.
2. НЕ переписывай, НЕ копируй и НЕ повторяй текст пользователя. НЕ давай сам текст, инструкции или развёрнутый ответ — только заголовок.
3. Формат ответа: одна строка, без кавычек, без точки в конце, без пояснений.`,
          },
          { role: 'user', content: text },
        ],
        max_tokens: 50,
        temperature: 0.2,
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
