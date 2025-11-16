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
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405 }
    );
  }

  let bodyIn;
  try {
    bodyIn = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      { status: 400 }
    );
  }

  const text = (bodyIn?.text ?? bodyIn?.dilemma ?? "").trim();
  let lang = (bodyIn?.lang ?? "").toString().trim().toLowerCase(); // "en", "fr", "es", "ar", etc.

  if (!text) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing text" }),
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY" }),
      { status: 500 }
    );
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

  // 🧘 Rich ritual bank (20 per theme)
  const RITUAL_BANK = {
    stress: {
      rituals: [
        "Inhale 4 seconds, hold 2, exhale 6. Repeat 6 times while dropping your shoulders each exhale.",
        "Place your hands on your chest. Whisper: “I soften here.” Breathe into your palms.",
        "Sit and count 5 objects around you that feel safe or neutral.",
        "Close your eyes and imagine a warm towel on the back of your neck for 30 seconds.",
        "Write 3 things you don’t need to finish today and cross them out slowly.",
        "Stand up, shake your hands for 10 seconds, breathe out like fog.",
        "Place both feet on the floor. Imagine roots going into the ground.",
        "Touch something cold (metal, glass) and breathe until your breath stabilizes.",
        "Look at one point in the room and breathe slowly until your eyes relax.",
        "Stretch your neck left/right for 10 seconds each side.",
        "Do 3 cycles of box breathing: 4–4–4–4.",
        "Place your hand on your belly and breathe until it rises naturally.",
        "Slowly trace the outline of your dominant hand with a finger.",
        "Name out loud: 3 things you hear, 2 things you see, 1 thing you feel.",
        "Write one sentence starting with “Right now, what matters most is…”",
        "Lean forward slightly, exhale deeply, let your back round.",
        "Rub your palms together until warm and place on your face.",
        "Look upward slightly and breathe as if you were watching the sky.",
        "Set a 1-minute timer and breathe only through your nose.",
        "Say softly: “I release pressure with each exhale.”"
      ],
      product: "Zen Moon Diffuser"
    },
    fear: {
      rituals: [
        "Put a hand on your heart and say: “I am safe enough in this moment.”",
        "Walk 10 steps very slowly, feeling each foot touching the ground.",
        "Write a sentence starting with: “If fear was a friend, it would say…”",
        "Imagine a soft glowing light surrounding your chest for 30 seconds.",
        "Name 5 things that are stable in your life today.",
        "Do 5 long exhales through the mouth.",
        "Hold something heavy (book, mug) and breathe into the weight.",
        "Touch your thumb to each finger slowly as you breathe.",
        "Write down the fear, then rewrite it as a question.",
        "Sit and imagine placing the fear on a shelf behind you.",
        "Ask yourself: “What is fear trying to protect?”",
        "Picture yourself talking to your younger self with kindness.",
        "Press your feet into the ground for 5 seconds, release.",
        "Lightly tap your sternum with your fingertips for 20 seconds.",
        "Whisper: “Fear is not the decision maker.”",
        "Look gently around the room, naming what's real and present.",
        "Imagine exhaling the fear as grey smoke.",
        "Put both hands behind your back and open the chest.",
        "Breathe with the rhythm: inhale 3, exhale 5 for 1 minute.",
        "Visualize placing your fear inside a balloon and letting it float up."
      ],
      product: "Warm Focus Lamp"
    },
    guilt: {
      rituals: [
        "Write one sentence beginning with: “Today I release…”",
        "Put a hand on your chest and imagine speaking to your younger self.",
        "Write two columns: “What happened” vs “What I learned”.",
        "Exhale slowly 5 times while relaxing your jaw.",
        "Whisper: “I am allowed to be human.”",
        "Imagine placing the guilt on a cloud drifting away.",
        "Place a warm hand over your throat and breathe softly.",
        "Write one apology to yourself.",
        "Imagine yourself being forgiven by a future version of you.",
        "Touch something textured and breathe into the sensation.",
        "Write the smallest repair action possible.",
        "Name one value you acted from, even imperfectly.",
        "Put both hands over your heart and hum softly for 10 seconds.",
        "Say: “I can grow without punishing myself.”",
        "Relax the muscles around your eyes and breathe.",
        "Write one thing you did right today.",
        "Tap your chest gently with fingertips for grounding.",
        "Say the sentence: “I’m trying, and that matters.”",
        "Visualize letting go of a heavy bag you’ve been carrying.",
        "Sit still and imagine a gentle hand on your back."
      ],
      product: "Clarity Candle"
    },
    uncertainty: {
      rituals: [
        "Write two columns: “What I fear losing” vs “What I could gain”.",
        "Set a 2-minute timer and write without stopping.",
        "Flip a coin and notice your reaction before it lands.",
        "Write the smallest next step (not the whole decision).",
        "Breathe with the rhythm: inhale 4, exhale 6.",
        "Look at one object and imagine it giving you clarity.",
        "Write: “If I chose calm first, I would…”",
        "Imagine a horizon slowly becoming clear.",
        "Put a hand on your belly and breathe into stability.",
        "Say: “I only need the next step, not the full map.”",
        "Write 3 outcomes, best/neutral/worst.",
        "Walk in the room imagining stepping on stones of clarity.",
        "Set a 1-minute timer: list options without judging.",
        "Imagine talking to a future self who already knows the answer.",
        "Cross your arms gently and breathe into the back body.",
        "Name one thing you are certain about today.",
        "Touch something steady (table, wall) while breathing.",
        "Visualize placing the decision inside a bowl of light.",
        "Whisper: “The path will reveal itself.”",
        "Look around and find 3 straight lines (symbol of direction)."
      ],
      product: "Horizon Mind Projector"
    },
    anger: {
      rituals: [
        "Exhale through the mouth 10 times like blowing out candles.",
        "Shake your arms for 10 seconds and breathe.",
        "Write everything you want to shout, then crumple the paper.",
        "Put your hand on your chest and breathe slow and deep.",
        "Place a cold object on your wrist for grounding.",
        "Say: “This feeling is movement, not danger.”",
        "Walk fast in place for 10 seconds.",
        "Open your chest by pulling shoulders back and breathing.",
        "Look upward slightly and breathe slowly.",
        "Squeeze your fists for 5 seconds, release.",
        "Write the real hurt beneath the anger.",
        "Tap your feet firmly on the ground.",
        "Hum a low note to release tension.",
        "Imagine steam rising from your shoulders.",
        "Say: “I can choose my response.”",
        "Stretch your neck side to side for 10 seconds.",
        "Place one hand on your belly and breathe into it.",
        "Imagine giving your anger a safe container.",
        "Touch something rough and breathe into the sensation.",
        "Do 5 slow breaths with long exhales."
      ],
      product: "Soft Sandalwood Incense"
    },
    sadness: {
      rituals: [
        "Place your hand on your heart and say: “I’m here with you.”",
        "Sit by a window and focus on light for one minute.",
        "Write the sentence “Right now, my heart feels…” without correcting.",
        "Hold something soft (fabric, pillow) and breathe slowly.",
        "Put a warm hand on your cheek and breathe into it.",
        "List 3 things that bring a tiny spark, even if small.",
        "Imagine your sadness as a color and watch it slowly fade.",
        "Drink a small sip of water consciously and breathe.",
        "Close your eyes and visualize someone who would hold space for you.",
        "Stretch your arms forward and round your back gently.",
        "Let your shoulders drop while exhaling through the mouth.",
        "Write one gentle sentence to yourself in future tense.",
        "Slowly rub your hands together and over your forearms.",
        "Imagine placing your sadness in a small jar, without judgment.",
        "Put your feet on the floor, breathe into your legs.",
        "Listen to a calming sound for 20 seconds in the room.",
        "Squeeze your hands into fists for 5 seconds, then release.",
        "Say: “Sadness is allowed, and I’m still safe.”",
        "Circle your wrists gently for 10 seconds.",
        "Sit upright and imagine a small candle inside your chest."
      ],
      product: "Calm Soul Bracelet"
    },
    inspiration: {
      rituals: [
        "Write 3 wild ideas without judging.",
        "Imagine a small spark in your chest growing brighter.",
        "Write: “If failure didn’t exist, I would…”",
        "Look at a random object and invent a story about it.",
        "Close your eyes and imagine your future self smiling.",
        "Write one creative move you can do in 2 minutes.",
        "Listen to the nearest sound and follow its rhythm.",
        "Imagine a sunrise behind your forehead.",
        "Write a sentence that begins with: “I’m curious about…”",
        "Stretch your arms upward and breathe into expansion.",
        "Walk slowly as if discovering a new planet.",
        "Pick one color in the room and observe it carefully.",
        "Write 3 micro-steps for your next idea.",
        "Imagine breathing in golden light.",
        "Whisper: “I am open to what wants to emerge.”",
        "Rotate your shoulders backward 10 times.",
        "Describe your current mood in 3 words.",
        "Draw one line on paper, turn it into something new.",
        "Name one thing that excites your body right now.",
        "Look out the window for 10 seconds and breathe."
      ],
      product: "ASTRO-MIND Projector"
    },
    neutral: {
      rituals: [
        "Pause and name 3 neutral things around you.",
        "Take 5 slow breaths with hand on belly.",
        "Look around and find one item that feels grounding.",
        "Write a sentence beginning with “Right now, I arrive.”",
        "Place a warm hand on your chest and breathe.",
        "Look at your hands for 10 seconds with curiosity.",
        "Drink a sip of water consciously.",
        "Relax your jaw and exhale loudly.",
        "Trace a small circle with your finger on the table.",
        "Stretch both arms forward and breathe.",
        "Name one intention for the next hour.",
        "Imagine a soft green glow around your body.",
        "Rub your hands and place them on your eyes.",
        "Do 3 slow shoulder rolls backward.",
        "List 3 small things that feel okay today.",
        "Sit up straight and breathe into your spine.",
        "Notice the temperature of the air on your skin.",
        "Touch something with a texture and explore it.",
        "Say softly: “I reset now.”",
        "Imagine your thoughts as leaves passing on a river."
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
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
}
