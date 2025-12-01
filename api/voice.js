// /api/voice.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, voice = "nova" } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in request body." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set." });
    }

    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,         // ex : alloy, echo, fable, onyx, nova, shimmer
        input: text
      })
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error("OpenAI TTS error:", upstream.status, errorText);
      return res
        .status(upstream.status)
        .json({ error: "OpenAI TTS error", details: errorText });
    }

    const audioBuffer = await upstream.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");
    const dataUrl = "data:audio/mpeg;base64," + base64;

    // On renvoie un JSON simple avec une URL utilisable directement côté front
    res.status(200).json({ audio: dataUrl });
  } catch (err) {
    console.error("TTS internal error:", err);
    res.status(500).json({ error: "Internal TTS error", details: err.message });
  }
}
