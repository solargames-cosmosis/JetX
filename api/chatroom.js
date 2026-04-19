import { createClient } from "redis";

let client;

async function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL
    });
    await client.connect();
  }
  return client;
}

export default async function handler(req, res) {
  const redis = await getClient();

  // SEND MESSAGE
  if (req.method === "POST") {
    const { text, name } = req.body;

    if (text && name) {
      await redis.rPush(
        "chat_messages",
        JSON.stringify({
          text,
          name,
          time: Date.now()
        })
      );
    }

    return res.status(200).json({ success: true });
  }

  // GET MESSAGES
  if (req.method === "GET") {
    const raw = await redis.lRange("chat_messages", 0, -1);
    const messages = raw.map(m => JSON.parse(m));

    return res.status(200).json({ messages });
  }

  res.status(405).end();
}
