import { kv } from '@vercel/kv';

export default async function handler(req, res) {

  if (req.method === "POST") {
    const { text, name } = req.body;

    if (text && name) {
      await kv.rpush("chat_messages", JSON.stringify({
        text,
        name,
        time: Date.now()
      }));

      const length = await kv.llen("chat_messages");
      if (length > 100) await kv.lpop("chat_messages");
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    const raw = await kv.lrange("chat_messages", 0, -1);
    const messages = raw.map(m => JSON.parse(m));
    return res.status(200).json({ messages });
  }

  res.status(405).end();
}
