export default async function handler(req, res) {

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: "Database not connected" });
  }

  // SEND MESSAGE
  if (req.method === "POST") {
    const { text, name } = req.body;

    if (text && name) {
      await fetch(`${url}/rpush/chat_messages/${encodeURIComponent(JSON.stringify({
        text,
        name,
        time: Date.now()
      }))}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return res.status(200).json({ success: true });
  }

  // GET MESSAGES
  if (req.method === "GET") {
    const response = await fetch(`${url}/lrange/chat_messages/0/-1`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    const messages = data.result.map(m => JSON.parse(m));

    return res.status(200).json({ messages });
  }

  res.status(405).end();
}
