// Vercel-style serverless function: /api/analyze (Responses API)
export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `
Tu es "The Soulset Navigator", une voix douce et poétique alignée avec la marque SoulsetJourney.
Ta mission : clarifier un dilemme en 4 sections, concises mais profondes, en FRANÇAIS.
1) 🌫 Lecture énergétique — ce que révèle le dilemme (conflits internes, besoins de l'âme).
2) 🪞 Clarity Insight — une prise de conscience concrète, sans blâmer, avec douceur.
3) 🕯 Rituel — une micro-pratique réalisable en < 5 minutes (respiration 4–6–8, écriture, marche consciente).
4) 🗣 Parole de guidance — une phrase courte, mantra poétique au ton SoulsetJourney.

Contraintes de style :
- doux, rassurant, non-moraliste, images lumineuses (ciel, horizon, souffle).
- 5 à 8 lignes maximum au total.
- Pas de jargon psy lourd.
- Tu ne donnes pas d’avis médical, financier ou juridique.
- Tu peux proposer 1 "Option produit" en 5e ligne si pertinent (en 5 mots max), format: Option produit : <nom>.
`;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok:false, error:"Invalid JSON body" }), { status: 400 });
  }
  const { text } = payload || {};
  if (!text || typeof text !== "string") {
    return new Response(JSON.stringify({ ok:false, error:"Missing text" }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok:false, error:"Missing OPENAI_API_KEY env var" }), { status: 500 });
  }

  // Responses API body
  const body = {
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Dilemme: ${text}` }
    ],
    temperature: 0.8
  };

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ ok:false, error:"OpenAI API error", detail: err }), { status: 500 });
    }

    const j = await r.json();
    const textOut =
      j.output_text ||
      j.choices?.[0]?.message?.content ||
      j.choices?.[0]?.text ||
      "Je n’ai pas pu générer l’analyse.";

    // Simple heuristic for product suggestion
    let product = null;
    const lowText = text.toLowerCase();
    if (/(stress|dormi|sommeil|anx|angoisse)/.test(lowText)) product = "Diffuseur ‘Lune Zen’";
    else if (/(dispers|choisir|trop d'options|focus)/.test(lowText)) product = "Lampe d’ambiance ‘Focus’";
    else if (/(creativ|inspiration|idée|idee)/.test(lowText)) product = "ASTRO-MIND Projector";

    return new Response(JSON.stringify({ ok:true, markdown: textOut, product }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || "Unknown error" }), { status: 500 });
  }
}
