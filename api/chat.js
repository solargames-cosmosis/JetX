export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message } = req.body;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    const reply = data?.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply: reply || "No response from model"
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
