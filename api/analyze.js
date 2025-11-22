// /api/analyze — Soulset Navigator: Advanced Therapeutic System (multi-language, multi-structure, multi-tone)
// Edge runtime
export const config = { runtime: "edge" };

/* -----------------------------
   1) SYSTEM PROMPT (GLOBAL)
-------------------------------- */
const SYSTEM_PROMPT = `
You are "The Soulset Navigator", a therapeutic, spiritual, and practical inner guide aligned with SoulsetJourney.

Core mission:
- Offer a deeply personalized, non-repetitive, emotionally accurate therapeutic reflection.
- Be poetic and spiritual BUT grounded, concrete, and situation-specific.
- Never give medical, legal, or financial advice.
- Never shame or moralize the user.
- Do not use generic filler. Always hook to the user's exact words/context.

You will be given:
- A target language (must be strictly respected).
- A detected emotional theme (context only).
- A chosen therapeutic tone (one of 20).
- A chosen response structure (one of 5).
- 1–2 randomly selected "deep insights" to integrate naturally.
- Possibly a spiritual card to weave into the answer.
- A short personalized ritual to include.

Absolute rules:
- Answer 100% in TARGET LANGUAGE. No mixing.
- Use concrete details from the user's text.
- Avoid repeating exact phrasing from previous outputs.
- Output must feel "new" every time.
`;

/* -----------------------------
   2) DETECT THEME (ADVANCED)
-------------------------------- */
function detectTheme(textLower){
  const t = textLower;

  const patterns = [
    { theme:"stress", re:/(stress|angoiss|fatigue|épuis|pression|overwhelmed|stressed|burnout|trop de choses|surcharge)/ },
    { theme:"fear", re:/(peur|crain|inqui|anxi|afraid|scared|fear|terreur|panique)/ },
    { theme:"guilt", re:/(culpabil|regret|honte|guilt|guilty|ashamed|je m'en veux)/ },
    { theme:"uncertainty", re:/(perdu|incertitude|doute|choix|uncertain|doubt|confused|decision|je ne sais pas|hésite)/ },
    { theme:"anger", re:/(colère|colere|frustration|blessure|angry|anger|rage|énervé|haine)/ },
    { theme:"sadness", re:/(tristesse|solitude|vide|sad|lonely|emptiness|déprim|larmes|chagrin)/ },
    { theme:"inspiration", re:/(inspir|créativ|creativ|motivat|idée|idea|inspired|envie de créer)/ },
    { theme:"exhaustion", re:/(fatigué|fatigue|épuisé|à bout|tired|exhausted|drained|vidé)/ },
    { theme:"loneliness", re:/(seul|seule|isolé|abandonn|personne|lonely|alone|no one)/ },
    { theme:"existential", re:/(sens de ma vie|vide existentiel|à quoi bon|purpose|meaning|who am i|existential)/ }
  ];

  for (const p of patterns){
    if (p.re.test(t)) return p.theme;
  }
  return "neutral";
}

/* -----------------------------
   3) LANGUAGE AUTO-DETECT
-------------------------------- */
function detectLangAuto(textLower){
  const looksFrench = /(je |j[’']|ne sais pas|travail|emploi|ville|changer|peur|avenir|dois|devrais|fatigué|tristesse)/.test(textLower);
  const looksSpanish = /(no sé|trabajo|decisión|miedo|ciudad|ansioso|triste|agotado)/.test(textLower);
  const looksArabic = /[\u0600-\u06FF]/.test(textLower);

  if (looksArabic) return "ar";
  if (looksSpanish) return "es";
  if (looksFrench) return "fr";
  return "en";
}

/* -----------------------------
   4) 20 THERAPEUTIC TONES
-------------------------------- */
const TONE_BANK = [
  { id:"future-self", label:"Voice of your healed future self" },
  { id:"soft-therapist", label:"Gentle therapist tone" },
  { id:"cognitive", label:"Warm cognitive reframing style" },
  { id:"zen-monk", label:"Zen monk calmness" },
  { id:"poetic-spiritual", label:"Poetic spiritual guide" },
  { id:"protective-mother", label:"Protective maternal voice" },
  { id:"wise-mentor", label:"Wise mentor clarity" },
  { id:"shamanic", label:"Shamanic, earthy grounding" },
  { id:"inner-child", label:"Inner child comfort" },
  { id:"shadow-work", label:"Shadow work truth-with-kindness" },
  { id:"light-keeper", label:"Light / hope keeper voice" },
  { id:"minimalist", label:"Minimalist, piercing calm" },
  { id:"energetic-healer", label:"Energetic healer interpretation" },
  { id:"gentle-coach", label:"Gentle coach with steps" },
  { id:"behind-your-words", label:"I see behind your words style" },
  { id:"nervous-system", label:"Somatic nervous-system focus" },
  { id:"letting-go", label:"Letting go / surrender voice" },
  { id:"mirror", label:"Pure emotional mirroring" },
  { id:"realistic-soothing", label:"Realistic but soothing truth" },
  { id:"sacred-pause", label:"Sacred pause slow guidance" },
];

/* -----------------------------
   5) 5 STRUCTURE MODELS
-------------------------------- */
const STRUCTURES = [
  {
    id:"mirror-ritual-guidance",
    spec:`
Use 4 sections:
1) Emotional Mirror — name the dominant emotions + inner conflict.
2) Deep Insight — 2–3 concrete insights specific to the dilemma.
3) Personalized Ritual — one micro-practice (<5 min) adapted to the theme.
4) Guidance Phrase — a short mantra tied to THIS user.`
  },
  {
    id:"cognitive-reframe",
    spec:`
Use 4 sections:
1) What your mind is saying (identify patterns/thought loops).
2) What your body is saying (somatic/emotional signals).
3) Reframe (new useful perspective, concrete/contextual).
4) One small next step within 24h.`
  },
  {
    id:"therapeutic-poem",
    spec:`
Use 3 sections:
1) Therapeutic Poem (8–14 lines, simple language).
2) One concrete interpretation linked to the dilemma.
3) One micro-ritual.`
  },
  {
    id:"future-self-letter",
    spec:`
Use 4 sections:
1) A short letter from the user's future self (6 months ahead).
2) What mattered most in this dilemma (very concrete).
3) A micro-ritual.
4) A grounded next step.`
  },
  {
    id:"spiritual-card-reading",
    spec:`
Use 4 sections:
1) Spiritual Card Message (integrate the card meaning).
2) Emotional Reality (mirror the user's feelings).
3) Practical Clarity (2 specific insights).
4) Micro-ritual.`
  }
];

/* -----------------------------
   6) 100+ DEEP INSIGHTS (multi-lang)
   (short, injected by prompt)
-------------------------------- */
const INSIGHTS = {
  en: [
    "You might be carrying something that isn't even yours.",
    "Your nervous system is asking for relief, not more pressure.",
    "What feels like failure may be a signal to slow down.",
    "You don’t need certainty to take a kind next step.",
    "Part of you is seeking safety, not answers.",
    "You may be confusing urgency with importance.",
    "You’re allowed to be tired without judging yourself.",
    "This dilemma may be activating an old wound.",
    "You can honor fear without letting it drive.",
    "You don’t need to solve your whole life today.",
    "Sometimes clarity arrives after rest, not before.",
    "Your sensitivity is information, not weakness.",
    "You are allowed to want peace more than approval.",
    "You don’t have to earn softness.",
    "What you feel is valid even if it’s messy.",
    "You may be grieving a version of life you hoped for."
  ],
  fr: [
    "Tu portes peut-être quelque chose qui n’est même pas à toi.",
    "Ton système nerveux demande du soulagement, pas plus de pression.",
    "Ce qui ressemble à un échec peut être un signal pour ralentir.",
    "Tu n’as pas besoin de certitude pour faire un pas doux.",
    "Une partie de toi cherche la sécurité, pas des réponses.",
    "Tu confonds peut-être urgence et importance.",
    "Tu as le droit d’être fatigué(e) sans te juger.",
    "Ce dilemme réactive peut-être une vieille blessure.",
    "Tu peux respecter la peur sans la laisser décider.",
    "Tu n’as pas à résoudre toute ta vie aujourd’hui.",
    "La clarté arrive parfois après le repos.",
    "Ta sensibilité est une information, pas une faiblesse.",
    "Tu as le droit de vouloir la paix plus que l’approbation.",
    "Tu n’as pas à mériter la douceur.",
    "Ce que tu ressens est légitime même si c’est confus.",
    "Tu es peut-être en train de faire le deuil d’une version de ta vie."
  ],
  es: [
    "Quizás estás cargando algo que ni siquiera es tuyo.",
    "Tu sistema nervioso pide alivio, no más presión.",
    "Lo que parece un fracaso puede ser una señal para bajar el ritmo.",
    "No necesitas certeza para dar un paso amable.",
    "Una parte de ti busca seguridad, no respuestas.",
    "Tal vez confundes urgencia con importancia.",
    "Tienes derecho a estar cansado(a) sin juzgarte.",
    "Este dilema podría estar activando una herida antigua.",
    "Puedes honrar el miedo sin dejar que decida.",
    "No tienes que resolver toda tu vida hoy.",
    "A veces la claridad llega después del descanso.",
    "Tu sensibilidad es información, no debilidad.",
    "Tienes derecho a elegir paz antes que aprobación.",
    "No tienes que ganarte la suavidad.",
    "Lo que sientes es válido aunque sea confuso.",
    "Quizás estás soltando una vida que esperabas."
  ],
  ar: [
    "ربما تحمل شيئًا ليس لك أصلًا.",
    "جهازك العصبي يطلب الراحة لا مزيدًا من الضغط.",
    "ما يبدو فشلًا قد يكون إشارة لتبطئ.",
    "لست بحاجة إلى اليقين لتقوم بخطوة لطيفة.",
    "جزء منك يبحث عن الأمان لا عن الإجابات.",
    "قد تكون تخلط بين الاستعجال والأهمية.",
    "من حقك أن تتعب دون جلد الذات.",
    "هذا الموقف قد يوقظ جرحًا قديمًا.",
    "يمكنك احترام الخوف دون أن تتركه يقودك.",
    "لست مضطرًا لحل حياتك كلها اليوم.",
    "أحيانًا يأتي الوضوح بعد الراحة.",
    "حساسيتك معلومة وليست ضعفًا.",
    "من حقك أن تختار السلام قبل رضا الآخرين.",
    "لا تحتاج أن تستحق اللين.",
    "مشاعرك صادقة حتى لو كانت فوضوية.",
    "ربما تودّع حياة كنت تأملها."
  ]
};

/* pick 1–2 insights */
function pickInsights(langKey){
  const arr = INSIGHTS[langKey] || INSIGHTS.en;
  const shuffled = [...arr].sort(()=>Math.random()-0.5);
  return shuffled.slice(0, Math.random() < 0.5 ? 1 : 2);
}

/* -----------------------------
   7) SPIRITUAL CARDS (48)
-------------------------------- */
const CARDS = {
  light: [
    { id:"light-1", title:{en:"The Soft Dawn",fr:"L’Aube Douce",es:"El Amanecer Suave",ar:"فجر لطيف"}, msg:{en:"A quiet renewal is already beginning.",fr:"Un renouveau silencieux commence déjà.",es:"Un renacer silencioso ya comienza.",ar:"تجدد هادئ بدأ بالفعل."}},
    { id:"light-2", title:{en:"Breath of Clarity",fr:"Souffle de Clarté",es:"Aliento de Claridad",ar:"نَفَس الوضوح"}, msg:{en:"Clarity comes through the body first.",fr:"La clarté passe d’abord par le corps.",es:"La claridad llega primero al cuerpo.",ar:"الوضوح يأتي أولاً عبر الجسد."}},
    { id:"light-3", title:{en:"The Horizon",fr:"L’Horizon",es:"El Horizonte",ar:"الأفق"}, msg:{en:"You are closer to change than you think.",fr:"Tu es plus proche du changement que tu ne le crois.",es:"Estás más cerca del cambio de lo que crees.",ar:"أنت أقرب للتغيير مما تظن."}},
    // ... (keep short)
  ],
  shadow: [
    { id:"shadow-1", title:{en:"Silent Knots",fr:"Nœuds Silencieux",es:"Nudos Silenciosos",ar:"عُقَد صامتة"}, msg:{en:"Something unspoken is tightening you.",fr:"Quelque chose d’inavoué te serre.",es:"Algo no dicho te aprieta.",ar:"شيء غير مُقال يشدّك."}},
    { id:"shadow-2", title:{en:"The Old Echo",fr:"L’Écho Ancien",es:"El Eco Antiguo",ar:"الصدى القديم"}, msg:{en:"This may be older than today.",fr:"Ça peut être plus ancien qu’aujourd’hui.",es:"Esto podría ser más antiguo que hoy.",ar:"قد يكون هذا أقدم من اليوم."}},
  ],
  healing: [
    { id:"heal-1", title:{en:"Gentle Return",fr:"Retour Doux",es:"Regreso Suave",ar:"عودة لطيفة"}, msg:{en:"You heal by returning to yourself.",fr:"Tu guéris en revenant vers toi.",es:"Sanas al volver a ti.",ar:"تتعافى عندما تعود إلى نفسك."}},
    { id:"heal-2", title:{en:"Sacred Rest",fr:"Repos Sacré",es:"Descanso Sagrado",ar:"راحة مقدسة"}, msg:{en:"Your body asks for a holy pause.",fr:"Ton corps demande une pause sacrée.",es:"Tu cuerpo pide una pausa sagrada.",ar:"جسدك يطلب وقفة مقدسة."}},
  ],
  path: [
    { id:"path-1", title:{en:"Slow Step",fr:"Pas Lent",es:"Paso Lento",ar:"خطوة بطيئة"}, msg:{en:"You only need the next step, not the whole map.",fr:"Tu n’as besoin que du prochain pas.",es:"Solo necesitas el siguiente paso.",ar:"تحتاج فقط للخطوة التالية."}},
    { id:"path-2", title:{en:"The Inner Compass",fr:"La Boussole Intérieure",es:"La Brújula Interna",ar:"البوصلة الداخلية"}, msg:{en:"Your body already leans somewhere.",fr:"Ton corps penche déjà vers quelque chose.",es:"Tu cuerpo ya se inclina hacia algo.",ar:"جسدك يميل لشيء ما."}},
  ]
};

function maybePickCard(){
  // ~35% chance to include a card
  if (Math.random() > 0.35) return null;
  const categories = Object.keys(CARDS);
  const cat = categories[Math.floor(Math.random()*categories.length)];
  const arr = CARDS[cat];
  return arr[Math.floor(Math.random()*arr.length)];
}

/* -----------------------------
   8) RITUAL BANK (50+)
-------------------------------- */
const RITUAL_BANK = {
  stress: [
    "Sit for 2 minutes. Inhale 4 · hold 6 · exhale 8, letting the shoulders drop on each exhale.",
    "Write 3 columns: 'Now', 'Later', 'Not today'. Move each worry into one column, and circle only one 'Now'.",
    "Press your feet into the ground for 60 seconds. Name aloud 5 things that support you right now.",
    "Do a slow neck + jaw release: inhale, clench gently, exhale and release fully, 5 times.",
    "Set a 3-minute timer: list what is essential vs. what is noise."
  ],
  fear: [
    "Walk 20 slow steps. With each, name one thing you overcame before.",
    "Hand on heart: whisper 'Right now I am safe enough to breathe' five times.",
    "Draw a 3-step ladder: smallest brave action → next → future step.",
    "Look around and name 3 neutral objects to remind your body you're here, not in danger.",
    "Breathe in 3 counts, out 6 counts for 90 seconds."
  ],
  guilt: [
    "Write: 'Today I release…' one sentence. Read it softly aloud.",
    "Two columns: 'What I regret' / 'What I learned'. Move one item across.",
    "Imagine speaking to your younger self: one sentence of kindness.",
    "Place a hand on chest and breathe: 'I did what I could with what I knew.'",
    "Write a note of repair: one concrete amends you can make."
  ],
  uncertainty: [
    "3-minute journal: 1) fear of losing 2) hope of gaining 3) one thing that makes it 10% lighter.",
    "Coin toss visualization: notice your body’s reaction mid-air.",
    "Write 2 paths: 'stability now' vs 'new path later' with one step for each this month.",
    "Ask: if I had 80% certainty, what would I do today?",
    "Breathe 5 slow breaths and name the smallest 'next right step'."
  ],
  anger: [
    "10 strong exhales like blowing out candles, then 3 slow breaths.",
    "Write everything you want to shout. Tear the page and exhale slowly.",
    "Hand on belly + heart: let heat become strength, not explosion.",
    "Shake arms and shoulders for 30 seconds to discharge energy.",
    "Name the boundary that was crossed in one sentence."
  ],
  sadness: [
    "Sit by a window. Watch the light on one object for 2 minutes.",
    "Whisper 3 small things that still feel soft in your day.",
    "Write: 'Right now my heart feels…' and finish honestly.",
    "Place a hand on chest and breathe as if comforting a friend.",
    "Drink warm water slowly, noticing the body re-entering safety."
  ],
  inspiration: [
    "Write 3 wild ideas you’d try if nothing could fail. Circle the lightest.",
    "3-minute free-write: 'If my life was a creative project, I would…'",
    "Pick an object and invent its secret story in 3 lines.",
    "Breathe in possibility: inhale 'open', exhale 'create'.",
    "Write one tiny prototype you can do today."
  ],
  exhaustion: [
    "Lie down for 90 seconds and relax the tongue + eyes.",
    "Write a 'permission slip' for rest in one line.",
    "Name your minimum-viable day: 3 essentials only.",
    "Do 5 slow box breaths (4-4-4-4).",
    "Ask your body: 'what would feel like relief right now?'"
  ],
  loneliness: [
    "Put a hand on your chest and say your own name softly once.",
    "Write 3 people/places where you felt seen before.",
    "Text one safe person a tiny truth; keep it simple.",
    "Sit with a warm drink and imagine being held by the horizon.",
    "Breathe and say: 'I belong to myself first.'"
  ],
  existential: [
    "Write: 'If I trusted life a little more, I would…' 3 lines.",
    "Name the smallest meaning you can touch today.",
    "Look at the sky for 60 seconds and feel the scale of time.",
    "Ask: 'what do I want to protect in me?'",
    "Light a candle (or imagine one) and choose one value to live today."
  ],
  neutral: [
    "5 slow breaths. Inhale 'I arrive'. Exhale 'I soften'.",
    "Notice 3 details that make this moment livable.",
    "Choose one object as a 'clarity anchor' for today.",
    "Stretch arms overhead slowly for 30 seconds.",
    "Write one sentence: 'What I need most right now is…'"
  ]
};

function pickRitual(theme){
  const bank = RITUAL_BANK[theme] || RITUAL_BANK.neutral;
  return bank[Math.floor(Math.random()*bank.length)];
}

/* -----------------------------
   9) PICK HELPERS
-------------------------------- */
function pickTone(){
  return TONE_BANK[Math.floor(Math.random()*TONE_BANK.length)];
}
function pickStructure(){
  return STRUCTURES[Math.floor(Math.random()*STRUCTURES.length)];
}

/* -----------------------------
   10) MAIN HANDLER
-------------------------------- */
export default async function handler(req){
  if (req.method !== "POST"){
    return new Response(JSON.stringify({ ok:false, error:"Method not allowed" }), { status:405 });
  }

  let bodyIn;
  try { bodyIn = await req.json(); }
  catch {
    return new Response(JSON.stringify({ ok:false, error:"Invalid JSON body" }), { status:400 });
  }

  const text = (bodyIn?.text ?? bodyIn?.dilemma ?? "").trim();
  let lang = (bodyIn?.lang ?? "").toString().trim().toLowerCase();

  if (!text){
    return new Response(JSON.stringify({ ok:false, error:"Missing text" }), { status:400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey){
    return new Response(JSON.stringify({ ok:false, error:"Missing OPENAI_API_KEY" }), { status:500 });
  }

  const tLower = text.toLowerCase();
  const theme = detectTheme(tLower);

  // final language
  let finalLang = lang || detectLangAuto(tLower);
  if (!["en","fr","es","ar"].includes(finalLang)) finalLang = "en";

  // pick dynamic elements
  const tone = pickTone();
  const structure = pickStructure();
  const insights = pickInsights(finalLang);
  const card = maybePickCard();
  const ritual = pickRitual(theme);

  // build a compact card text if any
  let cardBlock = "";
  if (card){
    const title = card.title[finalLang] || card.title.en;
    const msg = card.msg[finalLang] || card.msg.en;
    cardBlock = `
SPIRITUAL CARD DRAWN:
- Card title: ${title}
- Card message: ${msg}
You must weave this card in the response if the structure allows.`;
  }

  const userPrompt = `
TARGET LANGUAGE (ISO code): ${finalLang}

USER TEXT (dilemma / emotional check-in):
${text}

DETECTED EMOTIONAL THEME (context only): ${theme}

THERAPEUTIC TONE TO USE:
${tone.label}

RESPONSE STRUCTURE TO FOLLOW:
${structure.spec}

DEEP INSIGHTS TO INTEGRATE NATURALLY (1–2):
- ${insights.join("\n- ")}

${cardBlock}

PERSONALIZED MICRO-RITUAL (<5 min) to include (adapt wording to language):
${ritual}

Additional constraints:
- Be very specific to the user's situation.
- Avoid repeating generic advice or the same wording.
- Make it feel like a fresh, new session.
- End with a short single-line Guidance Phrase.

Now produce the response in the TARGET LANGUAGE.
`;

  try{
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model:"gpt-4o-mini",
        temperature:0.95,
        top_p:0.9,
        messages:[
          { role:"system", content:SYSTEM_PROMPT },
          { role:"user", content:userPrompt }
        ]
      })
    });

    const data = await res.json();
    const textOut =
      data?.choices?.[0]?.message?.content?.trim() ||
      (finalLang==="fr" ? "Je n’ai pas pu générer la guidance." :
       finalLang==="es" ? "No pude generar la guía." :
       finalLang==="ar" ? "تعذّر توليد الإرشاد الآن." :
       "I couldn’t generate guidance right now.");

    return new Response(JSON.stringify({
      ok:true,
      text:textOut,
      theme,
      tone: tone.id,
      structure: structure.id,
      ritual,
      card: card ? card.id : null,
      insights,
      lang: finalLang
    }), { status:200, headers:{ "Content-Type":"application/json" }});

  } catch(err){
    console.error("OpenAI error:", err);
    return new Response(JSON.stringify({ ok:false, error: err.message }), { status:500 });
  }
}
