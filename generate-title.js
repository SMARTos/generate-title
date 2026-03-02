/**
 * Serverless: по тексту промпта возвращает короткий заголовок через DeepSeek API.
 * В настройках деплоя задайте переменную DEEPSEEK_API_KEY (ваш ключ).
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req, res) {
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
            content: 'Ты помощник. На вход получаешь текст. Ответь одним коротким заголовком (до 6–8 слов), на том же языке, что и текст. Без кавычек и пояснений — только заголовок.',
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