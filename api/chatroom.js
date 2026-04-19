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

  // ===== SEND MESSAGE =====
  if (req.method === "POST") {
    const { text, name } = req.body;

    // basic filter
    const banned = ["badword1","badword2"];
    if (banned.some(w => text.toLowerCase().includes(w))) {
      return res.status(400).json({ error: "Blocked word" });
    }

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

  // ===== GET MESSAGES =====
  if (req.method === "GET") {
    const raw = await redis.lRange("chat_messages", 0, -1);
    const messages = raw.map(m => JSON.parse(m));

    return res.status(200).json({ messages });
  }

  // ===== ONLINE USERS =====
  if (req.method === "PUT") {
    const { name } = req.body;

    if (name) {
      await redis.sAdd("online_users", name);
      await redis.expire("online_users", 10); // auto-remove inactive
    }

    const users = await redis.sMembers("online_users");
    return res.status(200).json({ users });
  }

  // ===== ADMIN CLEAR CHAT =====
  if (req.method === "DELETE") {
    await redis.del("chat_messages");
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
