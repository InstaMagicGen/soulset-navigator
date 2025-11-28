// /api/analyze.js — Soulset Navigator: Therapeutic Human Voice (Edge runtime)
export const config = { runtime: "edge" };

/* -----------------------------
   1) SIMPLE THEME DETECTION
-------------------------------- */
function detectTheme(textLower){
  const t = textLower;

  if (/(col[eè]re|énervé|enerve|frustration|rage|angry|anger|furious)/.test(t)) {
    return "anger";
  }
  if (/(peur|crain|inqui|anxi|afraid|scared|fear|panique)/.test(t)) {
    return "fear";
  }
  if (/(tristesse|triste|solitude|vide|chagrin|larmes|sad|lonely|emptiness)/.test(t)) {
    return "sadness";
  }
  if (/(stress|angoiss|fatigue|épuis|pression|overwhelmed|stressed|burnout|trop de choses)/.test(t)) {
    return "stress";
  }
  if (/(perdu|incertitude|doute|choix|uncertain|doubt|confused|je ne sais pas|hésite|decision)/.test(t)) {
    return "uncertainty";
  }
  if (/(inspir|créativ|motivat|idée|idea|inspired|envie de créer)/.test(t)) {
    return "inspiration";
  }
  return "neutral";
}

/* -----------------------------
   2) LANGUAGE AUTO-DETECT
-------------------------------- */
function detectLangAuto(textLower){
  const looksFrench = /( je | j[’']|ne sais pas|travail|emploi|ville|changer|peur|avenir|dois|devrais|fatigué|tristesse)/.test(textLower);
  const looksSpanish = /(no sé|trabajo|decisión|miedo|ciudad|ansioso|triste|agotado)/.test(textLower);
  const looksArabic = /[\u0600-\u06FF]/.test(textLower);

  if (looksArabic) return "ar";
  if (looksSpanish) return "es";
  if (looksFrench) return "fr";
  return "en";
}

/* -----------------------------
   3) SYSTEM PROMPT = THÉRAPEUTE HUMAIN CALME
-------------------------------- */
const SYSTEM_PROMPT = `
You are "Soulset", a calm human-like therapeutic guide talking one-on-one with a person.
You NEVER say you are an AI, model, chatbot or assistant.
You speak like a real, warm, grounded human therapist: soft, slow, clear, present.

Core style:
- You sound like a calm therapist + slightly soulful presence (aligned with SoulsetJourney).
- You validate the person's emotions first, before giving any suggestion.
- You don't minimize their pain. You don't rush to solutions.
- You talk in short paragraphs (1–3 sentences each), not long essays.
- You avoid lists, bullet points, headings. Just natural speech.
- You avoid clinical jargon (no "cognitive distortion", "pathology", etc.).
- You never diagnose. You never mention diseases or disorders.
- No disclaimers like "I cannot replace a therapist" unless there is explicit self-harm or danger.

Soft spiritual tone:
- You can gently mention inner space, nervous system, inner voice, ground, breath, horizon, sunset.
- But you NEVER talk about angels, energies, magic, astrology, manifesting, crystals, etc.
- You stay anchored, simple, kind, like a grounded meditation/therapy guide.

Conversation guidelines:
- First: reflect what you sense emotionally (e.g., "I can hear how heavy this feels...").
- Second: normalize and validate (e.g., "It makes sense you feel this, given what you live.").
- Third: invite them to precise one small aspect or scene.
- Fourth: offer ONE small, doable micro-step (breath, self-talk, boundary, reflection question).
- Always end with ONE short, open question to keep the dialogue flowing.

Emotion handling:
- If there's anger: validate the anger clearly, don't jump immediately to relaxation/stretching.
- If there's sadness: slow down, give permission to feel, mention gentleness.
- If there's stress/overwhelm: normalize, then offer ONE concrete micro-step.
- If there's shame/self-blame: speak very softly, remove judgment, emphasize worth.
- If there's confusion/uncertainty: acknowledge not knowing, focus on "next tiny step".

Language:
- You always respond entirely in the target language ("en", "fr", "es", "ar").
- If target is "auto", detect the main language of the user text and respond in that.
- The tone must fit the language (no weird literal translations).

OUTPUT FORMAT (MANDATORY):
You MUST respond in EXACT JSON with this shape:

{
  "reply": "<string – the therapeutic answer, in the user's language>",
  "theme": "<one of: stress, fear, sadness, anger, uncertainty, inspiration, neutral>"
}

- The "reply" is what will be spoken aloud and displayed.
- The "theme" helps select a soft product and ritual.
- If you are unsure of the theme, use "neutral".
`;

/* -----------------------------
   4) MAIN EDGE HANDLER
-------------------------------- */
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawText = (body?.text ?? body?.dilemma ?? "").toString().trim();
  let lang = (body?.lang ?? "").toString().trim().toLowerCase();

  if (!rawText) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing text" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const tLower = rawText.toLowerCase();
  const detectedTheme = detectTheme(tLower);

  let finalLang = lang || detectLangAuto(tLower);
  if (!["en", "fr", "es", "ar"].includes(finalLang)) finalLang = "en";

  // Ce bloc est envoyé comme "user" au modèle
  const userPayload = {
    text: rawText,
    target_language: finalLang,         // "en" | "fr" | "es" | "ar"
    detected_theme: detectedTheme,      // context only
    mode: "writing_and_voice_dialogue", // écrit + voix
    context: "Soulset Navigator session in front of a sunset video"
  };

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.9,
        top_p: 0.9,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(userPayload)
          }
        ]
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("OpenAI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: "AI request failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Missing content from OpenAI");
      return new Response(
        JSON.stringify({ ok: false, error: "Empty AI response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e, content);
      return new Response(
        JSON.stringify({ ok: false, error: "Bad AI JSON" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    const themeRaw = typeof parsed.theme === "string"
      ? parsed.theme.toLowerCase().trim()
      : "neutral";

    const allowedThemes = [
      "stress",
      "fear",
      "sadness",
      "anger",
      "uncertainty",
      "inspiration",
      "neutral"
    ];
    const theme = allowedThemes.includes(themeRaw) ? themeRaw : "neutral";

    if (!reply) {
      return new Response(
        JSON.stringify({ ok: false, error: "Empty therapeutic reply" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ⚠️ IMPORTANT : format attendu par ton frontend
    //   ok  +  text  +  theme
    return new Response(
      JSON.stringify({
        ok: true,
        text: reply,     // <== utilisé dans index.html
        theme            // <== utilisé pour l’affiliation + Sunset
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Analyze handler error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
