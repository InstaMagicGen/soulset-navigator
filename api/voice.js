// /api/voice.js
export default async function handler(req, res) {
  try {
    const { text, voice = "nova" } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in request body." });
    }

    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,      // ex : alloy, echo, fable, onyx, nova, shimmer
        input: text
      })
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return res
        .status(upstream.status)
        .json({ error: "OpenAI TTS error", details: errorText });
    }

    const audioBuffer = await upstream.arrayBuffer();
    const nodeBuffer = Buffer.from(audioBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(nodeBuffer);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "Internal TTS error" });
  }
}
