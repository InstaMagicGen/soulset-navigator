// /api/analyze — Soulset Emotional Companion: therapeutic-style guidance
export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `
You are "The Soulset Companion", an emotionally attuned, therapeutic-style guide aligned with the SoulsetJourney brand.

Your role:
- You are NOT a doctor, NOT a psychotherapist, and you do NOT diagnose.
- You are a gentle emotional companion that helps people:
  - put words on what they feel,
  - understand what might be underneath,
  - find tiny next steps and micro-practices,
  - cultivate self-compassion and grounding.

Very important SAFETY rules:
- If the user mentions self-harm, suicide, wanting to die, hurting others, or any acute crisis:
  - Do NOT give instructions on how to self-harm or harm others.
  - Do NOT minimize or romanticize their pain.
  - Do:
    - Validate their feelings (“this sounds really heavy / painful”).
    - Encourage them strongly to reach out to a trusted person (friend, family, local professional).
    - Suggest contacting emergency or crisis hotlines in their country if they are in immediate danger.
    - Keep your guidance simple, stabilizing, and focused on safety and grounding.
- Never give medical, legal, or financial advice.
- Never claim to replace professional therapy or medical treatment.
- Avoid labels like “disorder”, “diagnosis”, or “illness”. You can talk instead about “patterns”, “reactions”, “nervous system”, “emotional load”.

General style:
- Warm, calm, grounded. You sound like a very gentle therapist/coach, not like a robot.
- You mirror the user’s words with respect (no judgment).
- You use simple images of breath, body sensations, light, horizon, and space.
- You stay concrete and specific to THEIR situation, not generic motivational quotes.

You can answer in ANY language, but you MUST fully respect the requested target language.

OUTPUT STRUCTURE (in the chosen language):

1) 🪞 Emotional Mirror —
   - Briefly name what they seem to be feeling (1–3 main emotional tones).
   - Validate that this reaction makes sense given what they described.
   - Use “you” in a gentle and respectful way, not blaming.

2) 💡 What seems to matter underneath —
   - 2–3 short insights about possible needs, fears, or values behind their feelings.
   - Connect directly to details from their message (context, relationships, work, money, identity, etc.).
   - Keep it humble: use language like “it might be that…”, “it could be that…”.

3) 🧘 Micro-practices (under 5 minutes) —
   - Offer 1 to 3 very small practices they can try right now or later.
   - At least one practice should involve the body or breath (grounding, somatic awareness).
   - Another practice can involve journaling, self-talk, or a gentle boundary.
   - Each practice should be:
     - short (1–5 minutes),
     - clearly explained in steps,
     - realistic even when the person is tired or overwhelmed.

4) 🌱 Gentle next step —
   - One suggestion for a tiny next step in their real life, related to the situation.
   - It could be: having a small honest conversation, writing a message, resting, planning a task, asking for help, etc.
   - Emphasize that they can go slowly and that there is no “perfect” way.

5) 🛟 Care reminder —
   - Always end with a short reminder that this is not therapy and that it can be powerful to talk to a real human professional or trusted person.
   - If the message sounded very heavy or desperate, gently emphasize reaching out for real-time support or emergency help.

Tone constraints:
- Poetic, calm, reassuring, but also grounded and concrete.
- Avoid spiritual bypassing (don’t erase pain with “love and light” clichés).
- Use short paragraphs and clear headings so it feels easy to read, even when overwhelmed.
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

  // 🔍 Emotion theme detection (FR + EN keywords, reused)
  let theme = "neutral";
  const t = text.toLowerCase();

  if (/(stress|angoiss|fatigue|épuis|epuis|pression|overwhelmed|stressed|burnout)/.test(t)) theme = "stress";
  else if (/(peur|crain|inqui|anxi|afraid|scared|fear|terrif)/.test(t)) theme = "fear";
  else if (/(culpabil|regret|honte|guilt|guilty|ashamed)/.test(t)) theme = "guilt";
  else if (/(perdu|incertitude|doute|choix|uncertain|doubt|confused|decision)/.test(t)) theme = "uncertainty";
  else if (/(colère|colere|frustration|blessure|angry|anger|rage)/.test(t)) theme = "anger";
  else if (/(tristesse|solitude|vide|sad|lonely|emptiness|déprim|deprim)/.test(t)) theme = "sadness";
  else if (/(inspir|créativ|creativ|motivat|idée|idea|inspired|excited)/.test(t)) theme = "inspiration";

  // 🧪 Simple language heuristic when lang === "" (auto)
  let finalLang = lang;
  if (!finalLang) {
    const looksFrench = /(je |j[’']|ne sais pas|travail|emploi|ville|changer|peur|avenir|dois|devrais|ressens|sentiment)/.test(t);
    const looksSpanish = /(yo |no sé|trabajo|ciudad|miedo|futuro|debería)/.test(t);
    const looksArabic = /(انا|أشعر|مشاعر|خائف|قلق|حزين)/.test(t);
    if (looksFrench) finalLang = "fr";
    else if (looksSpanish) finalLang = "es";
    else if (looksArabic) finalLang = "ar";
    else finalLang = "en";
  }

  // 🌱 Therapeutic micro-practices bank (we still use it as inspiration)
  const RITUAL_BANK = {
    stress: {
      practices: [
        "Sit down and feel the support under your body. For one minute, let your shoulders drop a little on each exhale. You don't need to fix the stress, just let your body know it can soften 2%.",
        "Place both feet on the floor. For 60 seconds, gently press your toes and heels into the ground and imagine the floor taking 5% of your load.",
        "Open a page (paper or notes app) and create three tiny boxes: “Now”, “Later”, “Not today”. Move each worry into one box. Circle only one “Now” item."
      ]
    },
    fear: {
      practices: [
        "Place one hand on your chest, one on your belly. Say quietly: “Right now I am here, I am breathing.” Repeat this sentence 5 times while noticing three details in the room.",
        "Walk 10 slow steps. With each step, name something you have already survived or handled in your life, even a small thing.",
        "Draw a small ladder with three steps. On the first step, write one action you could take even with fear. On the second, what you could do after that. Leave the third blank for later."
      ]
    },
    guilt: {
      practices: [
        "Write one sentence starting with: “Today I forgive myself a little for…”. Read it back in a very gentle voice, as if you were talking to a younger you.",
        "Place your hand on your heart and imagine talking to a friend who did the same thing. What would you tell them? Whisper that same sentence to yourself.",
        "On a page, create two columns: “What happened” and “What I learned”. Move at least one item from the first column into the second."
      ]
    },
    uncertainty: {
      practices: [
        "Set a 3-minute timer. Minute 1: write what you are afraid of losing. Minute 2: what you might gain. Minute 3: what would make the situation 10% more bearable, not perfect.",
        "Draw two little boxes: “Take space” and “Stay where I am”. Under each, write one very small action you could try this month, without committing forever.",
        "Take a coin. Before tossing, imagine heads = option A, tails = option B. Notice how your body feels *while* the coin is in the air. That reaction is information."
      ]
    },
    anger: {
      practices: [
        "Do 10 strong exhales through the mouth, like blowing out candles, while gently shaking your hands and shoulders. Then place a hand on your chest and feel your heartbeat slowing down.",
        "Take a sheet of paper and write everything you would like to shout, uncensored. When you are done, crumple or tear the paper and exhale slowly.",
        "Press your feet into the ground and imagine sending the heat from your body down into the floor. Let the strength of the anger become clarity instead of explosion."
      ]
    },
    sadness: {
      practices: [
        "Sit near a window if possible. For two minutes, just watch how the light changes on one object, and allow the sadness to be there without trying to fix it.",
        "Put a hand on your chest and whisper: “Right now my heart feels…” and finish the sentence honestly, without judging it.",
        "Choose one very soft action for yourself: a glass of water, stretching your back, or looking at something beautiful for 30 seconds. Let it be enough for now."
      ]
    },
    inspiration: {
      practices: [
        "Open a note and write three ideas you would try if you were allowed to be imperfect. Circle the one that makes your body feel a little lighter.",
        "Set a 3-minute timer and write without stopping: “If I followed my curiosity, I would…” Do not correct or evaluate, just let it flow.",
        "Pick one object around you and imagine it is a symbol of your next chapter. Write one sentence that starts with: “This object reminds me that…”"
      ]
    },
    neutral: {
      practices: [
        "For one minute, feel the contact points between your body and what you are sitting or standing on. Let your breath get 5% slower, nothing dramatic.",
        "Take five slow breaths. On each inhale think: “I arrive”. On each exhale: “I soften”.",
        "Create a small “clarity corner”: choose one item (a book, a stone, a photo) and place it somewhere you can see. Let it remind you that you are allowed to pause."
      ]
    }
  };

  const bank = RITUAL_BANK[theme] || RITUAL_BANK.neutral;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chosenPractice = pick(bank.practices);

  const userPrompt = `
TARGET LANGUAGE (ISO code): ${finalLang}

RULES:
- You MUST answer 100% in this TARGET LANGUAGE. Do not mix languages.
- If the user's text is in another language, you still answer only in the TARGET LANGUAGE.
- Use the user's own words and context so it feels very specific to them.

USER MESSAGE (feelings / situation):
${text}

DETECTED EMOTION THEME (for context): ${theme}

SUGGESTED MICRO-PRACTICE YOU MAY ADAPT (keep duration < 5 minutes, adapt wording to TARGET LANGUAGE):
${chosenPractice}

Now, following the SYSTEM PROMPT, produce the 5 sections:

1) 🪞 Emotional Mirror
2) 💡 What seems to matter underneath
3) 🧘 Micro-practices (1–3, under 5 minutes each)
4) 🌱 Gentle next step
5) 🛟 Care reminder

Use clear headings and short paragraphs so it feels easy to read even when overwhelmed.
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
        practice: chosenPractice,
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
