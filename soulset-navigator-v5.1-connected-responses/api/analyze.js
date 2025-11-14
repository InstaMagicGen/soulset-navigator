// /api/analyze — Soulset Navigator: multi-language + adaptive rituals
export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `
You are "The Soulset Navigator", a poetic, gentle guide aligned with the SoulsetJourney brand.

Your mission:
- Clarify a dilemma in 4 structured sections.
- Adapt the tone and imagery (sky, breath, horizon, light) to the dominant emotion.
- You can answer in ANY language.
  - If a target language is given (like "en", "fr", "es", "ar"), you MUST answer fully in that language only.
  - If no language is given, answer in the same language as the user's dilemma.

Expected structure (in the chosen language):
1) 🌫 Energy Reading — what the dilemma reveals (dominant emotion, inner conflict)
2) 🪞 Clarity Insight — a concrete, kind awareness
3) 🕯 Personalized Ritual — a short micro-practice suited to this situation (< 5 minutes)
4) 🗣 Guidance Phrase — a short mantra-like sentence, SoulsetJourney tone
5) 🪷 Product Option — if relevant, a tiny well-being object or ambiance (max 5 words), format: Product option: <name>

Style constraints:
- Poetic, calm, reassuring. Simple images of light, breath, sky, horizon.
- 5 to 8 lines total.
- Never give medical, legal or financial advice.
`;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
  }

  let bodyIn;
  try {
    bodyIn = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), { status: 400 });
  }

  const text = (bodyIn?.text ?? bodyIn?.dilemma ?? "").trim();
  const lang = (bodyIn?.lang ?? "").toString().trim().toLowerCase(); // "en", "fr", "es", "ar", etc.

  if (!text) {
    return new Response(JSON.stringify({ ok: false, error: "Missing text" }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }), { status: 500 });
  }

  // 🔍 Emotion detection (FR + EN keywords)
  let theme = "neutral";
  const t = text.toLowerCase();

  if (/(stress|angoiss|fatigue|épuis|pression|overwhelmed|stressed|burnout)/.test(t)) theme = "stress";
  else if (/(peur|crain|inqui|anxi|afraid|scared|fear)/.test(t)) theme = "fear";
  else if (/(culpabil|regret|honte|guilt|guilty|ashamed)/.test(t)) theme = "guilt";
  else if (/(perdu|incertitude|doute|choix|uncertain|doubt|confused|decision)/.test(t)) theme = "uncertainty";
  else if (/(colère|colere|frustration|blessure|angry|anger|rage)/.test(t)) theme = "anger";
  else if (/(tristesse|solitude|vide|sad|lonely|emptiness)/.test(t)) theme = "sadness";
  else if (/(inspir|créativ|creativ|motivat|idée|idea|inspired)/.test(t)) theme = "inspiration";

  // 🧘 Base rituals & product (in English, model will adapt to language)
  const RITUALS = {
    stress: {
      ritual: "Close your eyes and breathe slowly: inhale 4 seconds, hold 6, exhale 8. Feel the weight leaving with your breath.",
      product: "Zen Moon Diffuser"
    },
    fear: {
      ritual: "Take 20 slow steps in silence. Each step is proof that you can move forward even with fear beside you.",
      product: "Warm Focus Lamp"
    },
    guilt: {
      ritual: "Write one sentence of forgiveness to yourself. Read it softly, as if you were talking to a younger you.",
      product: "Clarity Candle"
    },
    uncertainty: {
      ritual: "Close your eyes and imagine a calm horizon. Whisper: “I choose peace before the answer.”",
      product: "Horizon Mind Projector"
    },
    anger: {
      ritual: "Place your hand on your heart. Inhale through the nose, exhale through the mouth. Let tension melt into warm strength.",
      product: "Soft Sandalwood Incense"
    },
    sadness: {
      ritual: "Place one hand on your chest and one on your belly. Breathe and repeat: “I am allowed to feel.”",
      product: "Calm Soul Bracelet"
    },
    inspiration: {
      ritual: "Take a notebook. Write down the first three ideas that come, without judging them. They already carry your light.",
      product: "ASTRO-MIND Projector"
    },
    neutral: {
      ritual: "Notice three details around you that bring you a little peace, and gently anchor yourself in this moment.",
      product: "Zen Moon Diffuser"
    }
  };

  const base = RITUALS[theme] || RITUALS.neutral;

  const userPrompt = `
Target language: ${lang || "auto (same as the user's dilemma language)"}.

USER DILEMMA:
${text}

DETECTED EMOTION THEME (for you to use as context, but you can refine it): ${theme}

SUGGESTED RITUAL (you can adapt wording, but keep the spirit and duration under 5 minutes):
${base.ritual}

SUGGESTED PRODUCT / AMBIANCE (you may rephrase the name but keep it short):
${base.product}

You MUST:
- Answer ONLY in the target language above, if it is not empty.
- If target language is "auto", detect and use the user's language.
- Follow exactly the structure described in the system message.
`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.95, // more variety
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await res.json();

    const textOut =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I couldn’t generate guidance right now.";

    return new Response(
      JSON.stringify({
        ok: true,
        text: textOut,
        theme,
        ritual: base.ritual,
        product: base.product,
        lang: lang || "auto"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OpenAI error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}
