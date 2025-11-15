// /api/analyze — Soulset Navigator: multi-language + adaptive rituals + more concrete answers
export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `
You are "The Soulset Navigator", a poetic yet very practical guide aligned with the SoulsetJourney brand.

Your mission:
- Clarify a dilemma in 4 structured sections.
- Use the details of the dilemma (context, job, relationship, money, etc.), not vague generalities.
- Adapt the tone and imagery (sky, breath, horizon, light) to the dominant emotion.
- You can answer in ANY language, but you MUST fully respect the requested target language.

Output structure (in the chosen language):
1) 🌫 Energy Reading — what the dilemma reveals (dominant emotion, inner conflict, what the person deeply needs).
2) 🪞 Clarity Insight — 2–3 concrete insights, directly linked to the situation (what is really at stake, what patterns appear).
3) 🕯 Personalized Ritual — ONE short micro-practice (< 5 minutes) directly related to the dilemma. Very specific instructions (time, what to write, what to breathe, what to observe).
4) 🗣 Guidance Phrase — a short mantra-like sentence, obvious that it belongs to THIS user and THIS situation.
5) 🪷 Product Option — if relevant, one tiny well-being object or ambiance (max 5 words), format: Product option: <name>.

Style constraints:
- Poetic, calm, reassuring, but also grounded and concrete.
- Use simple images of light, breath, sky, horizon.
- Avoid generic advice like "trust yourself" without context.
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
  let lang = (bodyIn?.lang ?? "").toString().trim().toLowerCase(); // "en", "fr", "es", "ar", etc.

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

  // 🧪 Simple language heuristic when lang === "" (auto)
  let finalLang = lang;
  if (!finalLang) {
    const looksFrench = /(je |j[’']|ne sais pas|travail|emploi|ville|changer|peur|avenir|dois|devrais)/.test(t);
    finalLang = looksFrench ? "fr" : "en";
  }

  // 🧘 Multiple rituals per theme
  const RITUAL_BANK = {
    stress: {
      rituals: [
        "Sit down for two minutes. Inhale for 4 seconds, hold for 6, and exhale for 8 through the mouth. With every exhale, imagine a layer of workload dropping from your shoulders.",
        "Place both feet on the floor. For one minute, mentally list every surface that supports you right now: the chair, the ground, the walls, even gravity. Let your body feel carried instead of alone with the pressure.",
        "Open a note or a paper and write three tasks: “now”, “later”, “not today”. Move each worry into one list. Circle only one “now” action and allow everything else to rest."
      ],
      product: "Zen Moon Diffuser"
    },
    fear: {
      rituals: [
        "Walk 20 slow steps. With each step, name one small thing you already handled in your life. Let your body remember you can move with fear beside you.",
        "Sit comfortably, put a hand on your heart and whisper: “Right now I am safe enough to breathe.” Repeat it five times, noticing one detail in the room each time.",
        "Draw a tiny ladder with three steps. On the first step, write the smallest action you could take even with fear. On the second, what you would do once that is done. Leave the third blank for the future."
      ],
      product: "Warm Focus Lamp"
    },
    guilt: {
      rituals: [
        "Take a paper and write one sentence of self-forgiveness that begins with “Today I release…”. Read it out loud in a gentle voice.",
        "Place your hand on your chest and imagine you are talking to a younger version of yourself. Tell them one sentence you needed to hear back then.",
        "Write two columns: “What I regret” and “What I learned”. Move at least one element from the first into the second."
      ],
      product: "Clarity Candle"
    },
    uncertainty: {
      rituals: [
        "Draw two small columns: “Stability now” and “New path later”. Under each, write one concrete action you could take this month. You are not choosing forever, only your next step.",
        "Set a 3-minute timer. In the first minute, write what you are afraid of losing; second minute, what you might gain; third minute, one thing that would make the choice feel 10% lighter.",
        "Pick a coin. Before tossing, imagine heads = option A, tails = option B. Notice your body’s reaction while the coin is in the air—that reaction matters more than the result."
      ],
      product: "Horizon Mind Projector"
    },
    anger: {
      rituals: [
        "Place one hand on your heart and one on your belly. Inhale through the nose, exhale through the mouth with a quiet sigh. Let the heat turn into clear strength instead of explosion.",
        "Take a sheet of paper and write everything you want to shout, without filtering. When you’re done, crumple or tear it and exhale slowly as if you were emptying the anger from your muscles.",
        "Do 10 strong exhales through the mouth, like blowing out candles, shaking gently your hands and shoulders, then finish with three slow and silent breaths."
      ],
      product: "Soft Sandalwood Incense"
    },
    sadness: {
      rituals: [
        "Put a hand on your chest. Breathe and name, in a whisper, three things that still bring a tiny spark of softness to your day.",
        "Sit by a window, if possible. For two minutes, simply watch the light change on one object and let your sadness be there without trying to fix it.",
        "Write one sentence beginning with “Right now, my heart feels…” and allow yourself to complete it honestly, without judging or editing."
      ],
      product: "Calm Soul Bracelet"
    },
    inspiration: {
      rituals: [
        "Open a note and write three crazy ideas you would try if nothing could fail. Circle the one that makes your body feel lighter.",
        "Set a 3-minute timer and write without stopping: “If my life was a creative project, I would…”. Do not correct, just let it flow.",
        "Choose one object around you and imagine it has a secret story. In your mind, invent the first three lines of that story."
      ],
      product: "ASTRO-MIND Projector"
    },
    neutral: {
      rituals: [
        "Pause for one minute. Notice three details around you that make this moment a little more livable, and breathe into them.",
        "Take five slow breaths. On each inhale, mentally say “I arrive”. On each exhale, “I soften”.",
        "Look around and choose one item to put in a small “clarity corner” (desk, shelf, etc.). Let it remind you that you are allowed to reset at any time."
      ],
      product: "Zen Moon Diffuser"
    }
  };

  const bank = RITUAL_BANK[theme] || RITUAL_BANK.neutral;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chosenRitual = pick(bank.rituals);

  const userPrompt = `
TARGET LANGUAGE (ISO code): ${finalLang}

RULES:
- You MUST answer 100% in this TARGET LANGUAGE. Do not mix with any other language.
- If the user's text is in another language, you still answer only in the TARGET LANGUAGE.
- Use the user's dilemma details (job, relationship, money, etc.) to keep it specific.

USER DILEMMA:
${text}

DETECTED EMOTION THEME (for context): ${theme}

SUGGESTED RITUAL (you can adapt wording, but keep spirit & duration < 5 minutes):
${chosenRitual}

SUGGESTED PRODUCT / AMBIANCE (you may rephrase the name but keep it short):
${bank.product}

Now produce the 5 sections exactly as described in the system message, in the TARGET LANGUAGE.
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
        temperature: 0.9,
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
        ritual: chosenRitual,
        product: bank.product,
        lang: finalLang
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OpenAI error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}
