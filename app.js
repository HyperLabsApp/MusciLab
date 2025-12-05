// Palette (anche in CSS) e logica della chat guidata

const palette = {
  orange: "#eb6631",
  blue: "#0068b2",
  sky: "#5bc4ff",
};

const BASE_QUESTIONS = [
  `🎄 Che cosa ti piace di più del Natale?`,
  `💫 Vuoi che nella canzone ci sia un personaggio speciale?`,
  `🎸 Dove si svolge la storia della tua canzone (nel bosco, a casa, al Polo Nord, a scuola…)?`,
  `🎵 Che cosa succede nella canzone? Mi racconti un momento speciale.`,
  `📜 Quali emozioni vuoi trasmettere? Che ne dici di allegria? O magari sorpresa? Meglio magia?`,
  `🗣️ C’è una frase o una parola che ti piacerebbe ripetere nel ritornello?`,
  `🪄 Vuoi che la canzone insegni qualcosa? Ad esempio, essere gentili, condividere, aiutare gli altri?`,
  `🔔 Preferisci una musica veloce o lenta?`,
  `🌟 Quali strumenti ti piacciono di più per una canzone di Natale?`,
  `🎁 Che musica ti piace di più?`
];
const MUSICLAB_QUESTIONS_ORDER = [1,2,6,8,9,10];
const MUSICLAB_VIDEOS_ORDER = null;
function _parseOrder(s) {
  let arr;
  if (Array.isArray(s)) arr = s;
  else arr = String(s || "").split(/[\s,;]+/).map(x => parseInt(x, 10));
  arr = (arr || []).filter(n => Number.isFinite(n) && n >= 1 && n <= 10);
  const seen = new Set();
  const out = [];
  for (const n of arr) { if (!seen.has(n)) { seen.add(n); out.push(n); } }
  return out;
}
const _defaultOrder = Array.from({ length: BASE_QUESTIONS.length }, (_, i) => i + 1);
const QUESTIONS_ORDER = _parseOrder(MUSICLAB_QUESTIONS_ORDER) || _defaultOrder;
const avatars = Array.from({ length: QUESTIONS_ORDER.length }, (_, i) => {
  const id = i + 1;
  const baseId = QUESTIONS_ORDER[i];
  const videoBaseId = Array.isArray(MUSICLAB_VIDEOS_ORDER) && MUSICLAB_VIDEOS_ORDER.length > i ? MUSICLAB_VIDEOS_ORDER[i] : baseId;
  return {
    id,
    name: "DoReMilla",
    initial: "DM",
    video: `Avatar_${videoBaseId}.mp4`,
    question: BASE_QUESTIONS[baseId - 1],
    baseId: baseId
  };
});

let currentIndex = 0;
let waitingForUser = false;
const answers = [];
let otpAttempts = 0;
let otpTimerId = null;
let otpVerifiedAt = null;
let questionTimerId = null;
const BASE_CATEGORIES = [
  "Ispirazione",
  "Protagonista",
  "Ambientazione",
  "Evento",
  "Emozione",
  "Frase/Ritornello",
  "Messaggio",
  "Ritmo",
  "Strumenti",
  "Stile",
];
const FLOW_CATEGORIES = QUESTIONS_ORDER.map(id => BASE_CATEGORIES[id - 1]);

// Riferimenti DOM
const messagesEl = document.getElementById("messages");
const chatEl = document.querySelector(".chat");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const speakBtn = document.getElementById("speakBtn");
const speakHint = document.getElementById("speakHint");
const speakIconPath = speakBtn ? speakBtn.querySelector(".mic-icon path") : null;
const MIC_D = "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 8v-3h-2v3h2z";
const STOP_D = "M6 6h12v12H6z";
const avatarCircle = document.getElementById("avatarCircle");
const avatarName = document.getElementById("avatarName");
const typingEl = document.getElementById("typing");
const emailGate = document.getElementById("emailGate");
const avatarVideo = document.getElementById("avatarVideo");
const avatarVideoContainer = document.getElementById("avatarVideoContainer");
const avatarImageContainer = document.getElementById("avatarImageContainer");
const avatarImage = document.getElementById("avatarImage");
const emailInput = document.getElementById("emailInput");
const emailConfirmBtn = document.getElementById("emailConfirmBtn");
const emailError = document.getElementById("emailError");
const emailCodeInput = document.getElementById("emailCodeInput");
const gdprPanel = document.getElementById("gdprPanel");
const gdprCloseBtn = document.getElementById("gdprCloseBtn");
const codiciFileInput = document.getElementById("codiciFileInput");
const uploadCodiciBtn = document.getElementById("uploadCodiciBtn");
const otpGate = document.getElementById("otpGate");
const otpInput = document.getElementById("otpInput");
const otpConfirmBtn = document.getElementById("otpConfirmBtn");
const otpError = document.getElementById("otpError");
const otpEmailInput = document.getElementById("otpEmailInput");
const otpResendBtn = document.getElementById("otpResendBtn");
// Speech Recognition setup
let recognition = null;
let isRecognizing = false;
let forceEnableSend = false; // abilita Invia dopo stop esplicito
let stoppedByUser = false; // traccia se lo stop è stato richiesto dall'utente
let recognitionBuffer = "";
let userEmail = "";
let userAccessCode = "";
let userPhone = "";
let userConsentOTP = "";
let gatePhase = null;
let avatarAudioEnabled = false;
let avatarVideoAllowed = false;
let suggestionsEl = null;
let switchingVideo = false;
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const FORBIDDEN_WORDS = [
  "cazzo","cazzata","incazzato","merda","merdoso","stronzo","stronza","stronzata","vaffanculo","fanculo","coglione","coglioni","palle","rottura di palle","bastardo","bastarda","puttana","troia","zoccola","mignotta","bagascia","baldracca","scrofa","vacca","figlio di puttana","fottiti","fottere","fottuto","porca","porco","madonna","dio","cristo","gesù","santo","mannaggia","cacchio","cavolo","culo","culone","chiappe","sedere","pisciare","cagare","piscia","cacca","puzzone",
  "uccidere","ucciso","ammazzare","ammazzato","omicidio","assassinio","assassino","morte","morto","morire","cadavere","salma","seppellire","tomba","funerale","bara","cimitero","sangue","sanguinare","dissanguato","ferita","ferito","taglio","squartare","mutilare","picchiare","botte","pugni","schiaffi","calci","rissa","violenza","tortura","soffrire","dolore","agonia","suicidio","suicidarsi","impiccato","veleno","avvelenato","pistola","fucile","arma","armi","coltello","pugnale","lama","spada","bomba","esplosione","granata","missile","guerra","battaglia","soldato","terrorista","terrorismo","attentato","strage","massacro","genocidio","sparare","sparatoria",
  "sesso","sessuale","fare l'amore","scopare","chiavare","trombare","pene","pisello","vagina","patata","fica","figa","seno","tette","capezzoli","nudo","nuda","nudità","spogliarsi","intimo","mutande","reggiseno","orgasmo","godere","eiaculare","sperma","preservativo","contraccettivo","vergine","verginita","prostituta","prostituzione","pimp","maniaco","pedofilo","stupro","violentare","abuso","molestia","porno","pornografia","hard","erotico","eccitante","arrapato","rapimento",
  "droga","drogarsi","drogato","tossico","tossicodipendente","spacciatore","cocaina","coca","eroina","marijuana","maria","erba","hashish","canna","spinello","fumare","fumo","sigaretta","sigaro","tabacco","nicotina","svapare","alcol","alcolico","ubriaco","sbronzo","brillo","vino","birra","vodka","whisky","liquore","grappa","barcollare","vomitare","overdose","siringa","ago","pasticca","anfetamina",
  "stupido","scemo","cretino","imbecille","idiota","ritardato","handicappato","mongoloide","spastico","down","pazzo","matto","folle","schifoso","brutto","ciccione","grasso","obeso","anoressico","nano","storipio","negro","nigger","sporco","ladro","zingaro","rom","ebreo","frocio","finocchio","ricchione","gay","lesbica","trans","travestito",
  "diavolo","demone","satana","lucifero","inferno","dannato","maledetto","maledizione","stregoneria","vudù","zombie","vampiro","lupo mannaro","fantasma","spettro","mostro","incubo","paura","terrore","buio","rapire","rubare","ladro","prigione","galera","carcere","polizia"
];
function shouldFilterNow() { return !gatePhase; }
function sanitizeForbidden(text) {
  if (!shouldFilterNow()) return text;
  let out = text || "";
  for (const w of FORBIDDEN_WORDS) {
    const re = new RegExp("\\b" + escapeRegExp(w) + "\\b", "gi");
    out = out.replace(re, "");
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}
function containsForbidden(text) {
  if (!shouldFilterNow()) return false;
  const t = text || "";
  for (const w of FORBIDDEN_WORDS) {
    const re = new RegExp("\\b" + escapeRegExp(w) + "\\b", "i");
    if (re.test(t)) return true;
  }
  return false;
}
const introLines = [
  "Ci siamo! Adesso puoi creare la tua canzone. Rispondi alle 6 domande, scegliendo tra le proposte oppure consiglia tu quello che vorresti ascoltare nel testo della canzone."
];
//const introLines = [
//  "Ehi tu! 🎁\nSì, proprio tu che ami il Natale! ✨\nHai mai pensato… di creare la tua canzone di Natale?\nUna canzone tutta tua, piena di emozioni, suoni e magia? 🎶\nBene! Oggi diventi tu il compositore del Natale! 😍\nIo ti farò dieci domande super speciali… e con le tue risposte, creeremo insieme la canzone più magica dell’anno!\nPronto? 3… 2… 1… via! 🌟"
//];
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.lang = "it-IT";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecognizing = true;
    if (speakBtn) {
      speakBtn.classList.add("recording");
      const labelEl = speakBtn.querySelector(".speak-label");
      if (labelEl) labelEl.textContent = "Stop";
      if (speakIconPath) speakIconPath.setAttribute("d", STOP_D);
    }
    if (speakHint) speakHint.style.display = "none";
    if (speakBtn) speakBtn.style.display = "inline-flex";
    recognitionBuffer = "";
    // Evita conflitti di input durante la dettatura
    userInput.disabled = true;
    sendBtn.disabled = true; // invia abilitato solo quando c'è testo
    // finché stiamo riconoscendo, non forziamo Invia
    forceEnableSend = false;
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += t + " ";
      else interimText = t;
    }
    const finalClean = sanitizeForbidden(finalText.trim());
    const norm = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();
    if (finalClean) {
      if (!norm(recognitionBuffer).endsWith(norm(finalClean))) {
        recognitionBuffer = (recognitionBuffer + " " + finalClean).trim();
      }
    }
    const combined = (recognitionBuffer + (interimText ? " " + interimText : "")).trim();
    userInput.value = combined;
    autoResize();
    updateSendDisabled();
  };

  recognition.onerror = (event) => {
    if (speakBtn) {
      speakBtn.classList.remove("recording");
      const labelEl = speakBtn.querySelector(".speak-label");
      if (labelEl) labelEl.textContent = "Parla";
      if (speakIconPath) speakIconPath.setAttribute("d", MIC_D);
    }
    isRecognizing = false;
    userInput.disabled = true;
    updateSendDisabled();
    if (speakBtn) speakBtn.style.display = "inline-flex";
    const err = event && event.error ? event.error : "unknown";
    let msg = "Si è verificato un errore nella dettatura vocale.";
    if (err === "not-allowed") msg = "Permesso microfono negato. Concedi l'accesso al microfono nel browser.";
    else if (err === "no-speech") msg = "Non ho rilevato parlato. Prova a parlare più vicino al microfono.";
    else if (err === "audio-capture") msg = "Nessun microfono rilevato. Controlla le impostazioni audio del sistema.";
    else if (err === "network") msg = "Errore di rete del servizio di riconoscimento. Riprova tra poco.";
    renderMessage(msg, "avatar", { id: 99, name: "Assistente", initial: "ML" });

    if (speakHint) {
      if (err === "not-allowed") {
        speakHint.textContent = "Consenti il microfono nelle impostazioni del browser";
        speakHint.style.display = "inline";
      } else if (err === "audio-capture") {
        speakHint.textContent = "Controlla che un microfono sia collegato/attivo";
        speakHint.style.display = "inline";
      }
    }
  };

  recognition.onend = () => {
    if (stoppedByUser) {
      isRecognizing = false;
      if (speakBtn) {
        speakBtn.classList.remove("recording");
        const labelEl = speakBtn.querySelector(".speak-label");
        if (labelEl) labelEl.textContent = "Parla";
        if (speakIconPath) speakIconPath.setAttribute("d", MIC_D);
      }
      userInput.disabled = false;
      if (speakBtn) speakBtn.style.display = "inline-flex";
      userInput.value = recognitionBuffer.trim();
      autoResize();
      if (waitingForUser) {
        forceEnableSend = true;
        sendBtn.disabled = false;
      } else {
        updateSendDisabled();
      }
      stoppedByUser = false;
    } else {
      try {
        isRecognizing = true;
        if (speakBtn) {
          speakBtn.classList.add("recording");
          const labelEl = speakBtn.querySelector(".speak-label");
          if (labelEl) labelEl.textContent = "Stop";
          if (speakIconPath) speakIconPath.setAttribute("d", STOP_D);
        }
        recognition.start();
      } catch (_) {}
    }
  };
}
if (!SpeechRec && speakBtn) {
  speakBtn.disabled = true;
  const labelEl = speakBtn.querySelector(".speak-label");
  if (labelEl) labelEl.textContent = "Non supportato";
  speakBtn.title = "La dettatura vocale non è supportata dal tuo browser. Usa Chrome o Edge.";
}

function getAvatarColor(idx) {
  // Alterna i tre colori della palette
  const mod = idx % 3;
  if (mod === 0) return palette.sky;
  if (mod === 1) return palette.blue;
  return palette.orange;
}
function getAvatarColorRGBA(idx, a) {
  const mod = idx % 3;
  if (mod === 0) return `rgba(91,196,255,${a})`;
  if (mod === 1) return `rgba(0,104,178,${a})`;
  return `rgba(235,102,49,${a})`;
}

function updateHeaderAvatar(av) {
  // Aggiorna testo/nome
  avatarCircle.textContent = av.initial;
  avatarCircle.style.background = getAvatarColor(av.id);
  avatarName.textContent = av.name;

  // Prova a caricare e riprodurre il video
  if (avatarVideo) {
    switchingVideo = true;
    try {
      avatarVideo.pause();
    } catch (_) {}
    try {
      avatarVideo.removeAttribute("src");
      avatarVideo.load();
    } catch (_) {}
    // Precarica sempre il video per evitare blocchi all'avvio
    avatarVideo.src = av.video;
    avatarVideo.preload = "auto";
    if (!avatarVideoAllowed) {
      if (avatarImageContainer) avatarImageContainer.classList.remove("is-hidden");
      if (avatarVideoContainer) avatarVideoContainer.classList.add("is-hidden");
      avatarCircle.style.display = "none";
      if (avatarImage) avatarImage.src = "avatar.png";
    } else {
      if (avatarImageContainer) avatarImageContainer.classList.add("is-hidden");
      if (avatarVideoContainer) avatarVideoContainer.classList.add("is-hidden");
      avatarCircle.style.display = "none";
      avatarVideo.currentTime = 0;
      avatarVideo.loop = false;
      avatarVideo.muted = !avatarAudioEnabled;
    }

    const showVideo = () => {
      if (avatarVideoAllowed) {
        if (avatarVideoContainer) avatarVideoContainer.classList.remove("is-hidden");
        if (avatarImageContainer) avatarImageContainer.classList.add("is-hidden");
        avatarCircle.style.display = "none";
      }
    };

    const showCircle = () => {
      if (avatarVideoContainer) avatarVideoContainer.classList.add("is-hidden");
      avatarCircle.style.display = "grid";
      if (avatarImageContainer) avatarImageContainer.classList.remove("is-hidden");
    };

    const canplayHandler = () => {
      showVideo();
      try { avatarVideo.currentTime = 0; } catch (_) {}
      avatarVideo.play().catch(() => {});
      switchingVideo = false;
    };
    avatarVideo.addEventListener("canplaythrough", canplayHandler, { once: true });
    avatarVideo.addEventListener("canplay", canplayHandler, { once: true });
    avatarVideo.onended = () => {
      if (avatarImageContainer) avatarImageContainer.classList.remove("is-hidden");
      if (avatarVideoContainer) avatarVideoContainer.classList.add("is-hidden");
    };

    avatarVideo.onerror = () => {
      showCircle();
    };

    avatarVideo.load();
  }
}

function showTyping(show = true) {
  typingEl.style.display = show ? "block" : "none";
  if (show) {
    setTimeout(scrollToBottom, 0);
  } else {
    setTimeout(scrollToBottom, 0);
  }
}


function scrollToBottom() {
  try {
    if (chatEl && typeof chatEl.scrollTo === "function") {
      chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
    } else if (chatEl) {
      chatEl.scrollTop = chatEl.scrollHeight;
    }
    const last = (chatEl && chatEl.lastElementChild) ? chatEl.lastElementChild : messagesEl.lastElementChild;
    if (last && typeof last.scrollIntoView === "function") last.scrollIntoView({ block: "end", behavior: "smooth" });
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  } catch (_) {
    try { window.scrollTo(0, document.documentElement.scrollHeight); } catch (_) {}
  }
}

function startCountdown(seconds) {
  let s = Math.max(1, seconds | 0);
  const total = s;
  const bubble = document.createElement("div");
  bubble.className = "message avatar";
  const textEl = document.createElement("div");
  textEl.style.fontWeight = "600";
  textEl.style.transform = "scale(1)";
  textEl.style.transition = "transform 250ms ease";
  textEl.textContent = `Ricarico tra ${s}s`;
  const barWrap = document.createElement("div");
  barWrap.style.height = "18px";
  barWrap.style.background = "#eee";
  barWrap.style.borderRadius = "9px";
  barWrap.style.overflow = "hidden";
  barWrap.style.marginTop = "10px";
  const bar = document.createElement("div");
  bar.style.height = "100%";
  bar.style.width = "100%";
  bar.style.background = "linear-gradient(90deg,#e53935,#fb8c00)";
  bar.style.transition = "width 1000ms linear";
  barWrap.appendChild(bar);
  const meta = document.createElement("div");
  meta.className = "bubble-meta";
  const tiny = document.createElement("div");
  tiny.className = "tiny-avatar";
  tiny.style.background = getAvatarColor(99);
  tiny.textContent = "ML";
  const who = document.createElement("span");
  who.textContent = "Assistente";
  meta.appendChild(tiny);
  meta.appendChild(who);
  bubble.appendChild(textEl);
  bubble.appendChild(barWrap);
  bubble.appendChild(meta);
  messagesEl.appendChild(bubble);
  scrollToBottom();
  const iv = setInterval(() => {
    s -= 1;
    if (s <= 0) {
      clearInterval(iv);
      location.reload();
      return;
    }
    textEl.textContent = `Ricarico tra ${s}s`;
    try { textEl.style.transform = "scale(1.08)"; setTimeout(() => { textEl.style.transform = "scale(1)"; }, 220); } catch (_) {}
    const pct = Math.max(0, Math.min(100, Math.round((s / total) * 100)));
    bar.style.width = pct + "%";
    scrollToBottom();
  }, 1000);
}

function startQuestionTimer() {
  if (questionTimerId) { try { clearTimeout(questionTimerId); } catch (_) {} questionTimerId = null; }
  questionTimerId = setTimeout(() => {
    renderMessage("Tempo scaduto: nessuna risposta ricevuta.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    waitingForUser = false;
    updateSendDisabled();
    try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
    startCountdown(30);
    setTimeout(() => { try { location.reload(); } catch (_) {} }, 30000);
  }, 300000);
}

function clearQuestionTimer() {
  if (questionTimerId) { try { clearTimeout(questionTimerId); } catch (_) {} questionTimerId = null; }
}

function renderMessage(text, sender = "avatar", av = null) {
  const bubble = document.createElement("div");
  bubble.className = `message ${sender}`;
  const urlMatch = typeof text === "string" && /^https?:\/\//i.test(text.trim());
  if (urlMatch) {
    const a = document.createElement("a");
    a.href = text.trim();
    a.textContent = text.trim();
    a.target = "_blank";
    a.rel = "noopener";
    bubble.appendChild(a);
  } else {
    bubble.textContent = text;
  }

  // Meta (avatar piccolo e/o label)
  const meta = document.createElement("div");
  meta.className = "bubble-meta";

  if (sender === "avatar" && av) {
    const tiny = document.createElement("div");
    tiny.className = "tiny-avatar";
    tiny.style.background = getAvatarColor(av.id);
    tiny.textContent = av.initial;
    const who = document.createElement("span");
    who.textContent = av.name;
    meta.appendChild(tiny);
    meta.appendChild(who);
  } else {
    const who = document.createElement("span");
    who.textContent = "Tu";
    meta.appendChild(who);
  }

  bubble.appendChild(meta);
  messagesEl.appendChild(bubble);
  scrollToBottom();
}

function showGdprInfoButton() {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "8px";
  const btn = document.createElement("button");
  btn.id = "gdprInfoInlineBtn";
  btn.className = "email-btn";
  btn.type = "button";
  btn.textContent = "Informativa";
  wrap.appendChild(btn);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  btn.addEventListener("click", () => {
    if (gdprPanel) {
      gdprPanel.style.display = "block";
      try { gdprPanel.scrollIntoView({ block: "center" }); } catch (_) {}
    }
  });
}

// Sequenza di messaggi dell'assistente (intro/outro) con indicatore di digitazione
function playAssistantLines(lines, callback) {
  let idx = 0;
  const step = () => {
    if (idx >= lines.length) {
      if (typeof callback === "function") callback();
      return;
    }
    showTyping(true);
    setTimeout(() => {
      showTyping(false);
      if (idx === 0 && lines === introLines) {
        enableAudioFromStart();
      }
      renderMessage(lines[idx], "avatar", avatars[Math.min(currentIndex, avatars.length - 1)]);
      idx += 1;
      setTimeout(step, 500);
    }, 600);
  };
  step();
}

function showNextQuestion() {
  const av = avatars[currentIndex];
  updateHeaderAvatar(av);
  showTyping(true);
  setTimeout(() => {
    showTyping(false);
    renderMessage(av.question, "avatar", av);
    waitingForUser = false;
    userInput.disabled = true;
    if (speakBtn) speakBtn.disabled = true;
    forceEnableSend = false;
    updateSendDisabled();
    try {
      const map = {
        1: showQuestion1Suggestions,
        2: showQuestion2Suggestions,
        3: showQuestion3Suggestions,
        4: showQuestion4Suggestions,
        5: showQuestion5Suggestions,
        6: showQuestion6Suggestions,
        7: showQuestion7Suggestions,
        8: showQuestion8Suggestions,
        9: showQuestion9Suggestions,
        10: showQuestion10Suggestions,
      };
      const fn = map[av.baseId];
      if (typeof fn === "function") fn();
    } catch (_) {}
    gateAnswerUntilVideoEnds();
  }, 600);
}

function finishFlow() {
  userInput.disabled = true;
  sendBtn.disabled = true;
  userInput.style.display = "none";
  sendBtn.style.display = "none";
  if (speakBtn) speakBtn.style.display = "none";
  if (speakHint) speakHint.style.display = "none";
  avatarVideoAllowed = false;
  if (avatarVideo) {
    try { avatarVideo.pause(); } catch (_) {}
  }
  if (avatarVideoContainer) avatarVideoContainer.classList.add("is-hidden");
  if (avatarImageContainer) avatarImageContainer.classList.remove("is-hidden");
  avatarCircle.style.display = "none";
  const getAns = (n) => {
    const item = answers.find(a => a.numero === n);
    return item ? item.risposta : "";
  };
  const cats = FLOW_CATEGORIES.slice();
  const getQ = (n) => {
    const av = avatars[n - 1];
    return av ? av.question : "";
  };
  const lines = [
    "Sei un paroliere e cantautore italiano specializzato in canzoni per bambini.",
    " Il tuo compito è generare testi originali, semplici, allegri e adatti all’infanzia, seguendo le indicazioni fornite dall’utente.",
    " ",
    " ISTRUZIONI:",
    " ",
    " 1. Crea il testo della canzone in base alle domande e risposte fornite dall'utente:",
    ...cats.map((c, i) => `    - Categoria: ${c} - domanda: ${getQ(i + 1)} - risposta: ${getAns(i + 1)}`),
    " ",
    " 2. CREA IL TESTO DELLA CANZONE:",
    "    - Linguaggio semplice e comprensibile per bambini.",
    "    - Tono positivo, gioioso, leggero e divertente.",
    "    - Inserisci immagini colorate, elementi magici o simpatici.",
    "    - Mantieni coerenza narrativa e ritmo cantabile.",
    "    - Evita contenuti violenti, complessi o non adatti all’infanzia.",
    "    - Rispetta la struttura richiesta.",
    "    - Evita rime forzate e cliché, prediligi metafore e immagini semplici.",
    " ",
    " 3. CONSEGNA:",
    "    - Restituisci solo il testo completo della canzone senza spiegazioni aggiuntive.",
  ];
  const prompt = lines.join("\n");
  renderMessage("Sto scrivendo la tua canzone, dammi un attimo per pensare", "avatar", { id: 99, name: "MusicLab", initial: "ML" });
  showTyping(true);
  callMusicLab(prompt)
    .then((text) => {
      showTyping(false);
      const out = text && text.trim().length > 0 ? text.trim() : "Generazione vuota.";
      renderMessage("Gli elfi musichieri stanno componendo la base musicale della tua canzone.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
      createSongAndEmail(out);
    })
    .catch((e) => {
      showTyping(false);
      const msg = String(e && e.message || "");
      let human = "Errore nella generazione del testo. Backend non raggiungibile.";
      if (msg.startsWith("backend_")) {
        const parts = msg.split("_", 3);
        const code = parts[1] || "";
        const body = parts[2] ? decodeURIComponent(parts[2]).slice(0, 500) : "";
        human = `Errore backend (${code}). ${body}`;
      } else if (msg.startsWith("local_")) {
        const parts = msg.split("_", 3);
        const code = parts[1] || "";
        const body = parts[2] ? decodeURIComponent(parts[2]).slice(0, 500) : "";
        human = `Errore server locale (${code}). ${body}`;
      }
      renderMessage(human, "avatar", { id: 99, name: "Assistente", initial: "ML" });
    });
}

let secretsPromise = null;
async function loadSecrets() {
  if (secretsPromise) return secretsPromise;
  secretsPromise = (async () => {
    const backendUrl = localStorage.getItem("MUSICLAB_BACKEND_URL") || "https://hyperlabs.pythonanywhere.com/";
    //const backendUrl = localStorage.getItem("MUSICLAB_BACKEND_URL") || "http://localhost:8888/";
    return { backendUrl };
  })();
  return secretsPromise;
}

function buildProducerCreatePayload(lyricsText) {
  const mv = localStorage.getItem("AIMUSIC_MV") || "FUZZ-2.0 Pro";
  const instrumental = String(localStorage.getItem("AIMUSIC_INSTRUMENTAL") || "false") === "true";
  const title = localStorage.getItem("AIMUSIC_TITLE") || "Back to You";
  const getAns = (n) => {
    const item = answers.find(a => a.numero === n);
    return item ? item.risposta : "";
  };
  const a7 = getAns(7);
  const a8 = getAns(8);
  const a9 = getAns(9);
  const a10 = getAns(10);
  const sound = ["joyful, emotional that transmits Christmas emotions suitable for children",  a8, a9, a10].map(s => String(s || "").trim()).filter(Boolean).join(", ");
  return {
    task_type: "create_music",
    mv,
    sound: sound || "emotional pop with gentle piano, warm synths, and a catchy beat",
    lyrics_strength: 0.5,
    sound_strength: 0.5,
    make_instrumental: instrumental,
    title,
    lyrics: String(lyricsText || "").trim(),
  };
}

async function createSongAndEmail(lyricsText) {
  const tryCreate = async () => {
    const { backendUrl } = await loadSecrets();
    const u = backendUrl.endsWith("/") ? backendUrl + "aimusic-producer-create" : backendUrl + "/aimusic-producer-create";
    const payload = buildProducerCreatePayload(lyricsText);
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) return { taskId: "", status: r.status };
    const j = await r.json();
    const base = (j && j.result) ? j.result : (j || {});
    let taskId = String(base.task_id || base.taskId || base.id || "");
    if (!taskId) {
      const obj = (j || {}).result || j || {};
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (k.toLowerCase().includes("task") && (typeof v === "string" || typeof v === "number")) {
          taskId = String(v);
          break;
        }
      }
    }
    return { taskId, status: 200 };
  };
  let attempts = 0;
  let finalUrl = "";
  let lastTask = "";
  while (attempts < 2 && !finalUrl) {
    try {
      const res = await tryCreate();
      if (!res.taskId) {
        attempts += 1;
        continue;
      }
      lastTask = res.taskId;
      renderMessage("Un pò di pazienza la tua canzone sta per essere incisa…", "avatar", { id: 99, name: "Assistente", initial: "ML" });
      const url = await pollProducerTask(res.taskId);
      if (url) finalUrl = url;
      else attempts += 1;
    } catch (_) {
      attempts += 1;
    }
  }
  if (finalUrl) {
    const appCode = userAccessCode;
    await notifyEmailWithSong("ECCO LA TUA CANZONE DI NATALE", lyricsText, finalUrl);
    await appendCanzoniLog(appCode, lastTask, finalUrl);
    if (String(localStorage.getItem("AIMUSIC_AUTODOWNLOAD") || "false") === "true") {
      await autoDownloadSong(finalUrl);
    }
    if (String(localStorage.getItem("AIMUSIC_AUTORELOAD") || "false") === "true") {
      startCountdown(30);
    }
  } else {
    renderMessage("Generazione audio non riuscita. Invio comunque il testo via email.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    await notifyEmailWithSong("MusicLab — Testo canzone", lyricsText, "");
  }
}

async function pollProducerTask(taskId) {
  const { backendUrl } = await loadSecrets();
  const u = backendUrl.endsWith("/") ? backendUrl + "aimusic-task" : backendUrl + "/aimusic-task";
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (r.ok) {
        const j = await r.json();
        const obj = (j || {}).result || j || {};
        let url = String(obj.url || obj.audio_url || obj.download_url || "");
        if (!url && Array.isArray(obj.data) && obj.data.length > 0) {
          const first = obj.data[0] || {};
          if (first.audio_url) url = String(first.audio_url || "");
          else if (first.url) url = String(first.url || "");
          else if (first.download_url) url = String(first.download_url || "");
        }
        url = sanitizeUrl(url);
        if (!url) {
          url = findAudioUrl(obj);
          url = sanitizeUrl(url);
        }
        const status = String(obj.status || obj.state || "").toLowerCase();
        if (url) return url;
        if (status === "failed" || status === "error") break;
      }
    } catch (_) {}
    await new Promise(res => setTimeout(res, 5000));
  }
  return "";
}

function findAudioUrl(o) {
  const exts = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];
  const stack = [o];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    if (typeof cur === "string") {
      let s = cur.trim();
      s = sanitizeUrl(s);
      if (/^https?:\/\//i.test(s)) {
        const low = s.toLowerCase();
        if (exts.some(e => low.includes(e)) || low.includes("audio") || low.includes("download")) return s;
      }
      continue;
    }
    if (Array.isArray(cur)) {
      for (let i = 0; i < cur.length; i++) stack.push(cur[i]);
      continue;
    }
    if (typeof cur === "object") {
      for (const k of Object.keys(cur)) {
        const v = cur[k];
        if (typeof v === "string") {
          let s = v.trim();
          s = sanitizeUrl(s);
          if (/^https?:\/\//i.test(s)) {
            const low = s.toLowerCase();
            if (exts.some(e => low.includes(e)) || k.toLowerCase().includes("url") || k.toLowerCase().includes("audio") || low.includes("download")) return s;
          }
        } else {
          stack.push(v);
        }
      }
    }
  }
  return "";
}

async function appendCanzoniLog(appCode, taskId, url) {
  const { backendUrl } = await loadSecrets();
  if (!backendUrl) return false;
  try {
    const u = backendUrl.endsWith("/") ? backendUrl + "append-canzoni-log" : backendUrl + "/append-canzoni-log";
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_code: appCode, task_id: taskId, url }),
    });
    if (r.ok) return true;
  } catch (_) {}
  return false;
}

function sanitizeUrl(s) {
  if (!s) return "";
  let out = String(s).trim();
  while (out.startsWith("`") || out.startsWith("\"") || out.startsWith("'")) out = out.slice(1).trim();
  while (out.endsWith("`") || out.endsWith("\"") || out.endsWith("'")) out = out.slice(0, -1).trim();
  return out;
}

async function autoDownloadSong(url) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (_) {}
    }, 0);
  } catch (_) {}
}

async function callMusicLab(prompt) {
  const { backendUrl } = await loadSecrets();
  if (backendUrl) {
    try {
      const u = backendUrl.endsWith("/") ? backendUrl + "generate" : backendUrl + "/generate";
      const r = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (r.ok) {
        const d = await r.json();
        return d.text || "";
      }
      const errBody = await r.text();
      throw new Error("backend_" + r.status + "_" + encodeURIComponent(errBody || ""));
    } catch (_) {}
  }
  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.text || "";
    }
    const errBody = await res.text();
    throw new Error("local_" + res.status + "_" + encodeURIComponent(errBody || ""));
  } catch (_) {}
  throw new Error("missing_backend");
}

async function sendConsentOtpEmail(email, code) {
  const { backendUrl } = await loadSecrets();
  if (!backendUrl || !email) return false;
  const subject = "MusicLab — Codice OTP consenso";
  const text = `Il tuo codice OTP è ${code}. Inseriscilo per confermare il consenso.`;
  const html = `<div>Il tuo codice OTP è <strong>${code}</strong>.</div><div>Inseriscilo per confermare il consenso.</div>`;
  const remote = backendUrl.endsWith("/") ? backendUrl + "send-email" : backendUrl + "/send-email";
  try {
    const res = await fetch(remote, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: [email], to_addrs: [email], toAddrs: [email], cc: [], bcc: [], subject, text, html }),
    });
    if (res.ok) return true;
    let codeErr = "";
    let detail = "";
    try {
      const j = await res.json();
      codeErr = j && j.error ? String(j.error) : "";
      detail = j && (j.detail || j.error || "");
    } catch (_) {
      try { detail = await res.text(); } catch (_) {}
    }
    const params = new URLSearchParams();
    params.append("to", email);
    params.append("subject", subject);
    params.append("text", text);
    params.append("html", html);
    const res2 = await fetch(remote, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (res2.ok) return true;
    try {
      const j2 = await res2.json();
      if (j2 && j2.error) {
        renderMessage("Invio OTP via e-mail non riuscito: " + j2.error, "avatar", { id: 99, name: "Assistente", initial: "ML" });
        if (j2.detail) renderMessage(String(j2.detail), "avatar", { id: 99, name: "Assistente", initial: "ML" });
        try { window.ML_LAST_OTP_ERROR = { code: String(j2.error || ""), detail: String(j2.detail || "") }; } catch (_) {}
      }
    } catch (_) {}
  } catch (_) {}
  return false;
}
async function markAppCodeUsed(code, email, dateISO, voiceFlag, otp) {
  const { backendUrl } = await loadSecrets();
  const payload = { code, email, date: dateISO, voice: voiceFlag, otp };
  if (!backendUrl) return false;
  try {
    const u = backendUrl.endsWith("/") ? backendUrl + "mark-code-used" : backendUrl + "/mark-code-used";
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) return true;
  } catch (_) {}
  return false;
}

async function notifyEmailWithSong(subject, songText, songUrl) {
  const { backendUrl } = await loadSecrets();
  if (!backendUrl || !userEmail) return;
  let codiciUrl = "";
  let codiciErr = "";
  codiciErr = "Pubblicazione CodiciAPP disattivata";
  // Drive upload disabilitato temporaneamente
  const consentLineText = `\nConsenso informato dato in data: ${otpVerifiedAt || "-"}, tramite codice otp inviato a ${userEmail || "-"}`;
  const codeLineText = `\nGenerazione avvenuta con codica attivazione: ${userAccessCode || "-"}`;
  const songLinkLineText = songUrl ? `\nLink download canzone: ${songUrl}` : "";
  const codiciLinkLineText = codiciUrl ? `\nLink download CodiciAPP: ${codiciUrl}` : "";
  const codiciErrLineText = codiciErr ? `\nErrore pubblicazione CodiciAPP: ${codiciErr}` : "";
  const bodyText = "Grazie per aver dato voce al Natale con \u201cCurno AI Christmas Sound\u201d!\n Hai appena creato la tua canzone unica… ora è il momento di farla risuonare!\n Scaricala qui e, se ti va, condividila con noi: ci piacerebbe sentirla!\n Tagga il Centro Commerciale Curno e usa gli hashtag: \n di seguito il testo della tua canzone " + songText + "\n #MyXmasSound #CurnoVibes #NataleInNote \n " + consentLineText + codeLineText + songLinkLineText + codiciLinkLineText + codiciErrLineText;
  const bodyHtml = "<div>La tua creatività ha acceso la magia del Natale ✨🎄 e la tua canzone è pronta a suonare forte 🎶🔥.</div>" +
                   "<div>Scaricala qui:" + `<a href="${songUrl}" target="_blank" rel="noopener">Download</a>` + " 📥 e condividi il risultato sui tuoi social 📲!</div>" +
                   "<div>Tagga @centrocommercialecurno 📸 e non dimenticare l’hashtag #NataleaCurno. ❄️🎵.</div>" +
                   "<div>Non vediamo l’ora di ascoltare la tua musica! 🎧❤️</div>" +
                   "<div>di seguito il testo della tua canzone</div>" +
                   "<pre style=\"white-space:pre-wrap;\">" + songText.replace(/</g, "&lt;") + "</pre>" +
                   "<div>#MyXmasSound #CurnoVibes #NataleInNote</div>" +
                   `<div>Consenso informato dato in data: ${otpVerifiedAt || "-"}, tramite codice otp inviato a ${userEmail || "-"}</div>` +
                   `<div>Generazione avvenuta con codica attivazione: ${userAccessCode || "-"}</div>` +                   
                   (codiciUrl ? `<div>Link download CodiciAPP: <a href="${codiciUrl}" target="_blank" rel="noopener">${codiciUrl}</a></div>` : "");
  const recipients = [userEmail, "eventi.centrocommercialecurno@hyperlabs.it"].filter(Boolean);
  const remote = backendUrl.endsWith("/") ? backendUrl + "send-email" : backendUrl + "/send-email";
  let done = false;
  try {
    const res = await fetch(remote, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: recipients, to_addrs: recipients, toAddrs: recipients, cc: [], bcc: [], subject, text: bodyText, html: bodyHtml }),
    });
    if (res.ok) {
      renderMessage("Email inviata! Controlla la tua casella.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
      startCountdown(10);
      done = true;
    } else {
      let detail = "";
      let code = "";
      try {
        const j = await res.json();
        code = j && j.error ? String(j.error) : "";
        detail = j && (j.detail || j.error || "");
      } catch (_) {
        try { detail = await res.text(); } catch (_) {}
      }
      const params = new URLSearchParams();
      for (const r of recipients) params.append("to", r);
      params.append("subject", subject);
      params.append("text", bodyText);
      params.append("html", bodyHtml);
      const res2 = await fetch(remote, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (res2.ok) {
        renderMessage("Email inviata! Controlla la tua casella.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
        startCountdown(10);
        done = true;
      } else {
        let detail2 = "";
        let code2 = "";
        try {
          const j2 = await res2.json();
          code2 = j2 && j2.error ? String(j2.error) : "";
          detail2 = j2 && (j2.detail || j2.error || "");
        } catch (_) {
          try { detail2 = await res2.text(); } catch (_) {}
        }
        const human = emailErrorMessage(code2 || code, detail2 || detail, res2.status);
        renderMessage(human, "avatar", { id: 99, name: "Assistente", initial: "ML" });
      }
    }
  } catch (e) {
    renderMessage("Invio email non riuscito: errore imprevisto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
  }
  userEmail = "";
  userAccessCode = "";
}

async function uploadCodiciAppToBucket() {
  const { backendUrl } = await loadSecrets();
  if (!backendUrl) {
    renderMessage("Backend non configurato.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    return;
  }
  const f = codiciFileInput && codiciFileInput.files && codiciFileInput.files[0];
  if (!f) {
    renderMessage("Seleziona il file CodiciAPP.csv.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    return;
  }
  const name = f.name || "CodiciAPP.csv";
  const type = "text/csv";
  const reader = new FileReader();
  reader.onload = async () => {
    let base64 = "";
    const res = String(reader.result || "");
    const idx = res.indexOf(",");
    if (res.startsWith("data:")) {
      base64 = res.slice(idx + 1);
    } else {
      base64 = btoa(res);
    }
    try {
      const u = backendUrl.endsWith("/") ? backendUrl + "upload-to-b2" : backendUrl + "/upload-to-b2";
      const r = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: name, contentBase64: base64, contentType: type, expiresSec: 604800 }),
      });
      if (r.ok) {
        const j = await r.json();
        const url = String((j || {}).url || "");
        if (url) {
          renderMessage("Upload riuscito.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
          renderMessage(url, "avatar", { id: 99, name: "Assistente", initial: "ML" });
        } else {
          renderMessage("Upload riuscito.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
        }
      } else {
        let detail = "";
        let code = "";
        try {
          const j = await r.json();
          code = j && j.error ? String(j.error) : "";
          detail = j && (j.detail || j.error || "");
        } catch (_) {
          try { detail = await r.text(); } catch (_) {}
        }
        const params = new URLSearchParams();
        params.append("fileName", name);
        params.append("contentBase64", base64);
        params.append("contentType", type);
        params.append("expiresSec", String(604800));
        const r2 = await fetch(u, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        if (r2.ok) {
          try {
            const j2 = await r2.json();
            const url2 = String((j2 || {}).url || "");
            if (url2) {
              renderMessage("Upload riuscito.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
              renderMessage(url2, "avatar", { id: 99, name: "Assistente", initial: "ML" });
            } else {
              renderMessage("Upload riuscito.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
            }
          } catch (_) {
            renderMessage("Upload riuscito.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
          }
        } else {
          let detail2 = "";
          let code2 = "";
          try {
            const j2 = await r2.json();
            code2 = j2 && j2.error ? String(j2.error) : "";
            detail2 = j2 && (j2.detail || j2.error || "");
          } catch (_) {
            try { detail2 = await r2.text(); } catch (_) {}
          }
          const msg = publishErrorMessage(code2 || code, detail2 || detail, r2.status);
          renderMessage(msg, "avatar", { id: 99, name: "Assistente", initial: "ML" });
        }
      }
    } catch (e) {
      renderMessage("Upload non riuscito: errore imprevisto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    }
  };
  reader.readAsDataURL(f);
}

function emailErrorMessage(code, detail, status) {
  const map = {
    smtp_missing_config: "SMTP non configurato: completa il file secrets.json",
    smtp_not_configured: "SMTP non configurato",
    smtp_auth_failed: "Autenticazione SMTP fallita: verifica utente e password",
    smtp_connect_error: "Connessione SMTP non riuscita: verifica host e porta",
    smtp_dns_error: "Errore DNS: impossibile risolvere l'host SMTP",
    smtp_timeout: "Timeout connessione: il server SMTP non risponde",
    smtp_recipients_refused: "Destinatari rifiutati dal server SMTP",
    smtp_sender_refused: "Mittente rifiutato dal server SMTP",
    smtp_data_error: "Errore dati durante l'invio SMTP",
    smtp_helo_error: "Errore HELO/EHLO verso SMTP",
    smtp_error: "Errore SMTP generico",
    unknown_error: "Errore sconosciuto nel backend"
  };
  const base = map[code] || `Invio email non riuscito (${status})`;
  const extra = detail ? `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "";
  return base + extra;
}

function publishErrorMessage(code, detail, status) {
  const map = {
    missing_file: "File CodiciAPP non trovato sul backend remoto",
    b2_missing_config: "Configurazione Backblaze B2 mancante nel secrets.json",
    b2_http_400: "Errore richiesta B2 (400)",
    b2_http_401: "Autorizzazione B2 fallita (401)",
    b2_http_403: "Permessi B2 insufficienti (403)",
    b2_http_404: "Bucket o risorsa B2 non trovata (404)",
    b2_http_429: "Rate limit B2 superato (429)",
    b2_http_500: "Errore interno B2 (500)",
  };
  const base = map[code] || `Pubblicazione CodiciAPP non riuscita (${status})`;
  const extra = detail ? `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "";
  return base + extra;
}

 

async function handleUserAnswer(text) {
  const raw = (text ?? "").trim();
  const cleaned = sanitizeForbidden(raw);
  if (!cleaned) {
    renderMessage("Testo non valido. Evita parole non consentite.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
    waitingForUser = true;
    updateSendDisabled();
    return;
  }
  const answerText = cleaned;
  renderMessage(answerText, "user");
  if (gatePhase) {
    const who = { id: 99, name: "Assistente", initial: "ML" };
    if (gatePhase === "email") {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(answerText)) {
        renderMessage("Email non valida. Riprova.", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      userEmail = answerText;
      renderMessage("Perfetto! Ora inserisci il codice di accesso", "avatar", who);
      gatePhase = "code";
      try {
        userInput.setAttribute("inputmode", "text");
        userInput.setAttribute("autocomplete", "off");
        userInput.placeholder = "Scrivi il codice e premi Invio…";
      } catch (_) {}
      if (speakBtn) speakBtn.disabled = false;
      if (emailGate) emailGate.style.display = "none";
      waitingForUser = true;
      userInput.value = "";
      userInput.disabled = false;
      updateSendDisabled();
      autoResize();
      return;
    }
    if (gatePhase === "code") {
      if (answerText.length < 4) {
        renderMessage("Codice non valido. Deve avere almeno 4 caratteri.", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      const codeUpper = String(answerText || "").trim().toUpperCase();
      const codeOk = await verifyAppCode(codeUpper);
      if (!codeOk.found) {
        renderMessage("Voucher non valido", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      if (codeOk.used) {
        renderMessage("Voucher già utilizzato", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      userAccessCode = codeUpper;
      if (emailGate) emailGate.style.display = "none";
      const consent = `Grazie! Per proseguire, è necessario che acconsenti al trattamento dei seguenti dati:\n1) Invio della canzone generata → uso della tua e-mail.\n2) Invio di OTP via MAIL per confermare la tua identità.\n3) Uso della voce del minore per dialogo con l’assistente virtuale (solo con consenso del genitore/tutore).\n\nLeggi attentamente l'informativa cliccacndo su "INFORMATIVA".\n\nSuccessivamente per acconsentire clicca su "SÌ, ACCONSENTO" in modo da consentirci l'invio del codice OTP per confermare il consenso`;
      renderMessage(consent, "avatar", who);
      try { showConsentSuggestions(); } catch (_) {}
      gatePhase = "phone";
      waitingForUser = true;
      userInput.value = "";
      autoResize();
      updateSendDisabled();
      return;
    }
    if (gatePhase === "phone") {
      const digits = (answerText || "").replace(/[^0-9+]/g, "");
      const isValid = /^\+?[0-9]{7,15}$/.test(digits);
      if (!isValid) {
        renderMessage("Numero non valido. Inserisci un telefono con 7-15 cifre.", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      userPhone = digits;
      try { localStorage.setItem("MUSICLAB_USER_PHONE", userPhone); } catch (_) {}
      userConsentOTP = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      try { localStorage.setItem("MUSICLAB_OTP", userConsentOTP); } catch (_) {}
      const ok = await sendConsentOtpEmail(userEmail, userConsentOTP);
      if (ok) {
        gatePhase = "otp";
        otpAttempts = 0;
        if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
        otpTimerId = setTimeout(() => {
          renderMessage("Tempo scaduto: il codice OTP è scaduto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
          waitingForUser = false;
          updateSendDisabled();
          startCountdown(15);
          setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
        }, 60000);
        if (otpGate) otpGate.style.display = "grid";
        if (userInput) userInput.disabled = true;
        try { otpInput && otpInput.focus(); } catch (_) {}
        return;
      } else {
        gatePhase = "otp";
        otpAttempts = 0;
        if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
        otpTimerId = setTimeout(() => {
          renderMessage("Tempo scaduto: il codice OTP è scaduto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
          waitingForUser = false;
          updateSendDisabled();
          startCountdown(15);
          setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
        }, 60000);
        if (otpGate) otpGate.style.display = "block";
        if (otpError) { otpError.textContent = "Invio OTP via e-mail non riuscito. Riprova."; otpError.style.display = "block"; }
        if (userInput) userInput.disabled = true;
        try { otpInput && otpInput.focus(); } catch (_) {}
        return;
      }
    }
    if (gatePhase === "otp") {
      const onlyDigits = answerText.replace(/\D/g, "");
      if (!/^\d{6}$/.test(onlyDigits)) {
        renderMessage("Codice OTP non valido. Inserisci 6 cifre.", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      if (userConsentOTP && onlyDigits !== userConsentOTP) {
        otpAttempts += 1;
        if (otpAttempts >= 4) {
          renderMessage("Troppi tentativi errati", "avatar", who);
          waitingForUser = false;
          updateSendDisabled();
          if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
          setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
          return;
        }
        renderMessage("Codice OTP errato. Riprova.", "avatar", who);
        waitingForUser = true;
        updateSendDisabled();
        return;
      }
      if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
      otpVerifiedAt = new Date().toISOString();
      try {
        const updated = await markAppCodeUsed(userAccessCode, userEmail, otpVerifiedAt, "Y", userConsentOTP);
        if (!updated) {
          renderMessage("Aggiornamento remoto del Voucher non riuscito. Riprova più tardi.", "avatar", who);
        }
      } catch (_) {
        renderMessage("Aggiornamento remoto del Voucher non riuscito. Riprova più tardi.", "avatar", who);
      }
      let codiciUrl = "";
      let codiciErr = "";
      let codiciDebug = "";
      codiciErr = "Pubblicazione CodiciAPP disattivata";
      try {
        const { backendUrl } = await loadSecrets();
        if (backendUrl) {
          const u = backendUrl.endsWith("/") ? backendUrl + "send-email" : backendUrl + "/send-email";
          const subject = "MusicLab — CodiciAPP aggiornato";
          const text = "Il file CodiciAPP è stato aggiornato e caricato. Link download: " + (codiciUrl || "-") + (codiciErr ? ("\nErrore pubblicazione CodiciAPP: " + codiciErr) : "") + (codiciDebug ? ("\nDettagli tecnici: " + codiciDebug) : "");
          const html = "<div>Il file CodiciAPP è stato aggiornato e caricato.</div>" + (codiciUrl ? `<div>Link download: <a href="${codiciUrl}" target="_blank" rel="noopener">${codiciUrl}</a></div>` : "<div>Nessun link disponibile</div>") + (codiciErr ? `<div>Errore pubblicazione CodiciAPP: ${codiciErr}</div>` : "") + (codiciDebug ? `<pre style="white-space:pre-wrap;">${codiciDebug.replace(/</g, "&lt;")}</pre>` : "");
          await fetch(u, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: ["giovanni.racioppi@hyperlabs.it"], subject, text, html }),
          });
        }
      } catch (_) {}
      gatePhase = null;
      waitingForUser = false;
      userInput.value = "";
      autoResize();
      playAssistantLines(introLines, showFirstQuestionAfterIntro);
      return;
    }
  }
  try { clearSuggestions(); } catch (_) {}
  
  answers.push({ numero: currentIndex + 1, categoria: FLOW_CATEGORIES[currentIndex], risposta: answerText });
  waitingForUser = false;
  userInput.value = "";
  autoResize();

  currentIndex += 1;
  if (currentIndex < avatars.length) {
    setTimeout(showNextQuestion, 450);
  } else {
    finishFlow();
  }
}

function showQuestion1Suggestions() {
  clearSuggestions();
  const list = [
"Le lucine che brillano ovunque.",
"L’odore dei biscotti appena sfornati.",
"I regali colorati sotto l’albero.",
"L’abbraccio caldo della famiglia.",
"La magia che c’è nell’aria.",
"La neve che cade lenta.",
"Il presepe pieno di personaggi.",
"Le canzoni natalizie in ogni stanza.",
"Il camino acceso.",
"L’albero decorato con fantasia.",
"Il tempo passato con gli amici.",
"Le storie che si raccontano la sera.",
"Le palline che luccicano.",
"Il profumo dell’arancia e della cannella.",
"La sorpresa dei regali nascosti.",
"Le risate a tavola.",
"Le cartoline fatte a mano.",
"Il cioccolato caldo fumante.",
"La gioia di aspettare la mezzanotte.",
"Le strade addobbate.",
"I pupazzi di neve.",
"I maglioni buffi.",
"I canti in coro.",
"I sogni più belli che sembrano veri.",
"Le luci che si accendono e spengono.",
"I fiocchi che scendono dal cielo.",
"I pranzi lunghissimi.",
"I pacchetti luccicanti.",
"Le sorprese dietro ogni porta.",
"Le stelline scintillanti.",
"I giochi da tavolo in famiglia.",
"Le foto sotto l’albero.",
"I dolci tipici del periodo.",
"Il calore della casa.",
"Il silenzio della neve di notte.",
"I canti dei bambini.",
"I centrotavola fatti a mano.",
"Le porte decorate.",
"Le lanterne accese.",
"Gli auguri sinceri.",
"Le fiabe natalizie.",
"L’attesa del mattino.",
"Le risate dei più piccoli.",
"Le calze appese al camino.",
"Il countdown festoso.",
"L’allegria che contamina tutti.",
"Le impronte sulla neve fresca.",
"Le lucine che fanno atmosfera.",
"Le tradizioni di famiglia.",
"Il cuore che si scalda."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  // Rimosso: il chip "Informativa trattamento dati" non viene più proposto tra le opzioni della domanda.
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function clearSuggestions() {
  if (suggestionsEl && suggestionsEl.parentNode) {
    try { suggestionsEl.parentNode.removeChild(suggestionsEl); } catch (_) {}
  }
  suggestionsEl = null;
}

function shuffleSecure(arr) {
  const a = arr.slice();
  const n = a.length;
  try {
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    for (let i = n - 1; i > 0; i--) {
      const j = buf[i] % (i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  } catch (_) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
}

function randomSample(list, k) {
  const s = shuffleSecure(list);
  const m = Math.min(k, s.length);
  return s.slice(0, m);
}

function showQuestion2Suggestions() {
  clearSuggestions();
  const list = [
"Babbo Natale.",
"Una renna super veloce.",
"Un elfo pasticcione.",
"Un pupazzo di neve parlante.",
"Una stella magica.",
"Un pinguino danzante.",
"Una bambina sognatrice.",
"Un orsetto polare curioso.",
"Un gatto natalizio.",
"Un cane travestito da renna.",
"Un piccolo folletto.",
"La Befana gentile.",
"Un albero che sa cantare.",
"Un orologio che segna la magia.",
"La neve che parla.",
"Un biscotto vivente.",
"Un giocattolo animato.",
"Un angioletto luminoso.",
"Un trenino dei sogni.",
"Una campanella che vola.",
"Un elfo inventore.",
"Una renna che racconta storie.",
"Una fiammella che non si spegne.",
"Un pupazzo robotico.",
"Un sacco di regali parlante.",
"Una cometa birichina.",
"Un coro di fiocchi di neve.",
"Un maglione vivace.",
"Un topolino natalizio.",
"Un gufetto saggio.",
"Un lupo buono.",
"Un bimbo curioso.",
"Una fata dei doni.",
"Un regalo misterioso.",
"Un cavallino a dondolo animato.",
"Un elfo dormiglione.",
"Una renna che vuole volare.",
"Un bambino che incontra la magia.",
"Una scatola musicale incantata.",
"Un fiocco gigante.",
"Un omino di pan di zenzero.",
"Un trenino di zucchero.",
"Un coro di stelle.",
"Un pupazzo che vuole un amico.",
"Una pallina di Natale chiacchierona.",
"Una lanterna con una voce dolce.",
"Una renna rockettara.",
"Un elfo poeta.",
"Un orsetto che cerca la neve.",
"Una renna timida che diventa coraggiosa."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion3Suggestions() {
  clearSuggestions();
  const list = [
"Al Polo Nord.",
"In un bosco innevato.",
"In una casa calda e accogliente.",
"A scuola prima delle vacanze.",
"In città tra le luci.",
"In un piccolo villaggio.",
"Su una montagna innevata.",
"In una grotta di ghiaccio.",
"Sulla slitta di Babbo Natale.",
"In una cucina profumata.",
"Nel laboratorio degli elfi.",
"In un negozio di giocattoli.",
"In un castello di neve.",
"In una baita di montagna.",
"In un giardino ghiacciato.",
"In una piazza piena di canti.",
"In una soffitta piena di ricordi.",
"Sulla luna illuminata.",
"In un parco tutto bianco.",
"Sul tetto di casa.",
"In una foresta magica.",
"In un mercatino di Natale.",
"Nella stanza dei sogni.",
"In una tenda invernale.",
"In un igloo accogliente.",
"In un mondo di zucchero.",
"In una stanza addobbata.",
"In un trenino in viaggio.",
"In un lago ghiacciato.",
"Vicino al camino.",
"In un palazzo gigante.",
"Nel cielo stellato.",
"In una fattoria innevata.",
"In una biblioteca natalizia.",
"In una sala per i regali.",
"In un villaggio di luci.",
"In un sogno dei bambini.",
"Su una nuvola candida.",
"Sotto un grande abete.",
"In una stanza segreta.",
"Nella stanza dei giocattoli.",
"In una metropoli festosa.",
"In una slitta volante.",
"In un grande parco giochi.",
"In una stanza nascosta del Polo Nord.",
"In un villaggio di animali.",
"In un mondo immaginario.",
"Sul pianeta del Natale.",
"In un rifugio caldo.",
"Nel cuore del bosco incantato."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion4Suggestions() {
  clearSuggestions();
  const list = [
"Babbo Natale perde un regalo.",
"Una renna impara a volare.",
"Gli elfi creano un giocattolo speciale.",
"Una bambina trova una stella caduta.",
"Un pupazzo prende vita.",
"Arriva la prima neve dell’anno.",
"Un regalo parla e racconta la sua storia.",
"Un coro di bambini canta all’unisono.",
"Le luci dell’albero si accendono da sole.",
"Un elfo fa un pasticcio divertente.",
"Una cometa guida i bimbi.",
"Una slitta vola tra le case.",
"Un sogno diventa realtà.",
"La neve fa una sorpresa.",
"Una renna si perde e viene ritrovata.",
"I bambini costruiscono un pupazzo magico.",
"Un trenino porta gioia ovunque.",
"Gli animali del bosco festeggiano.",
"La Befana incontra Babbo Natale.",
"Un regalo gigante esplode in coriandoli.",
"Una lanterna illumina la notte.",
"Un elfo scopre il significato del Natale.",
"Un magico countdown comincia.",
"Il cielo si riempie di stelle danzanti.",
"Una porta segreta si apre.",
"I bambini aiutano Babbo Natale.",
"Il gatto combina guai.",
"Il pupazzo cerca un amico.",
"Una campanella chiama tutti a festeggiare.",
"Un giocattolo vuole un bambino.",
"La neve canta una melodia.",
"Una fata porta un dono speciale.",
"Un pinguino viene invitato alla festa.",
"La città si illumina.",
"Un bambino scrive una lettera magica.",
"La slitta non parte e bisogna ripararla.",
"Una sorpresa arriva nella notte.",
"I fiocchi di neve raccontano storie.",
"Gli elfi ballano.",
"Una festa nasce per caso.",
"La magia sveglia un vecchio orologio.",
"Una cometa porta un messaggio.",
"Un coro salva il Natale.",
"Un regalo vola via e tutti lo inseguono.",
"Un bambino ritrova la magia perduta.",
"Un elfo inventa una macchina buffa.",
"Le stelle fanno un concerto.",
"Un pupazzo diventa eroe.",
"Una renna salva la notte.",
"Tutti uniscono le forze per festeggiare."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion5Suggestions() {
  clearSuggestions();
  const list = [
    "Gioia pura.",
"Magia scintillante.",
"Sorpresa.",
"Tenerezza.",
"Allegria.",
"Meraviglia.",
"Calore.",
"Avventura.",
"Speranza.",
"Dolcezza.",
"Entusiasmo.",
"Curiosità.",
"Amicizia.",
"Emozione.",
"Felicità contagiosa.",
"Fantasia.",
"Serenità.",
"Fiducia.",
"Amore.",
"Generosità.",
"Spirito di festa.",
"Pace.",
"Incanto.",
"Tranquillità.",
"Motivazione.",
"Solidarietà.",
"Stupore.",
"Magia interiore.",
"Brillantezza.",
"Complicità.",
"Energia.",
"Leggerezza.",
"Sogno.",
"Unione.",
"Euforia.",
"Nostalgia dolce.",
"Scintille di felicità.",
"Gioia condivisa.",
"Attesa emozionata.",
"Allegria danzante.",
"Ottimismo.",
"Coraggio.",
"Momenti speciali.",
"Sorrisi.",
"Gratitudine.",
"Magia buona.",
"Armonia.",
"Meraviglia infantile.",
"Spensieratezza.",
"Calore familiare."

  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion6Suggestions() {
  clearSuggestions();
  const list = [
"Magia, magia!",
"Brilla Natale!",
"Toc toc, sorpresa!",
"Ehi, che festa!",
"Din don dan!",
"È Natale qui con te!",
"Luci e sogni!",
"Voliamo su!",
"Che felicità!",
"Oh oh oh!",
"Stella mia!",
"Accendi la magia!",
"Batti le mani!",
"È tempo di gioia!",
"Sotto l’albero!",
"Brillano i cuori!",
"Canta con me!",
"Buon Natale a te!",
"Nel cielo blu!",
"Ding dong!",
"Evviva la festa!",
"Magico sarà!",
"Un sogno così!",
"Allegria!",
"Fiocca la felicità!",
"Natalissimo!",
"Stelle a volontà!",
"Voliamo insieme!",
"C’è magia!",
"Un regalo per te!",
"Festa, festa, festa!",
"Che bello che è!",
"Gira la magia!",
"Lalalalala!",
"Sogna con me!",
"È festa ormai!",
"Un mondo di luce!",
"Oh, che magia!",
"Sempre insieme!",
"Un Natale così!",
"Fiocchi nel cuor!",
"Brilliamo noi!",
"Salta con me!",
"Un sorriso in più!",
"Canta Natale!",
"Vieni qui con me!",
"Brilla forte!",
"E che festa sia!",
"Magia per te!",
"Sotto il cielo blu!"
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion7Suggestions() {
  clearSuggestions();
  const list = [
"Essere gentili.",
"Condividere i giochi.",
"Aiutare i più piccoli.",
"Dire grazie.",
"Dire scusa.",
"Collaborare.",
"Non arrendersi.",
"Avere fiducia.",
"Credere nei sogni.",
"Saper aspettare.",
"Essere generosi.",
"Amare gli amici.",
"Sorridere sempre.",
"Rispettare gli altri.",
"Fare un gesto buono.",
"Accogliere tutti.",
"Portare gioia.",
"Essere grati.",
"Essere coraggiosi.",
"Non giudicare.",
"Donare tempo.",
"Raccontare la verità.",
"Valorizzare la famiglia.",
"Rispettare la natura.",
"Salvaguardare la magia.",
"Essere creativi.",
"Aiutare chi ha bisogno.",
"Essere pazienti.",
"Capire gli altri.",
"Dare il buon esempio.",
"Diffondere felicità.",
"Essere amici della pace.",
"Ascoltare gli altri.",
"Dare un sorriso.",
"Fare squadra.",
"Credere in sé stessi.",
"Essere curiosi.",
"Essere responsabili.",
"Non sprecare.",
"Fare complimenti sinceri.",
"Abbracciare chi si ama.",
"Vivere con leggerezza.",
"Cogliere la magia nel quotidiano.",
"Essere gentili con gli animali.",
"Non litigare.",
"Usare parole dolci.",
"Aiutare la famiglia.",
"Tenere viva la fantasia.",
"Festeggiare tutti insieme.",
"Apprezzare le piccole cose."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion8Suggestions() {
  clearSuggestions();
  const list = [
    "Veloce e saltellante.",
"Lenta e magica.",
"Allegra e ritmata.",
"Dolce e tranquilla.",
"Super energica.",
"Morbida e calma.",
"Veloce come una slitta.",
"Lenta come la neve.",
"Scattante e divertente.",
"Luminosa e lieve.",
"Un misto di veloce e lenta.",
"Ritmata come un jingle.",
"Sussurrata e leggera.",
"Festosa.",
"Serenata lenta.",
"Rock leggero.",
"Swing vivace.",
"Danzerina.",
"Sognante.",
"Battito moderato.",
"Velocità media.",
"Crescente.",
"Lenta ma luminosa.",
"Veloce e brillante.",
"Saltellante.",
"Ipnotica e calma.",
"Movimentata.",
"Fluida.",
"Scorrevole.",
"Lieve.",
"Ritmo calmo.",
"Ritmo scattante.",
"Vibrazione lenta.",
"Esplosiva.",
"Passeggiata musicale.",
"Galoppante.",
"Onde sonore lente.",
"Pulsante.",
"Rapida e gioiosa.",
"Avvolgente.",
"Lenta come un sogno.",
"Veloce come la felicità.",
"Ritmo frizzante.",
"Ritmo tenero.",
"Energia media.",
"Lenta per il ritornello.",
"Veloce per le strofe.",
"Una dolce filastrocca.",
"Una marcia vivace.",
"Una ballata lenta."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion9Suggestions() {
  clearSuggestions();
  const list = [
"Campanellini della Slitta , Arpa , Violino", 
"Celesta , Flauto Traverso , Triangolo", 
"Coro di Bambini , Pianoforte , Campanelli a mano", 
"Carillon , Arpa , Vento (effetto sonoro)", 
"Campanellini della Slitta , Tromba , Tamburo (rullante)", 
"Violino , Violoncello , Triangolo", 
"Glockenspiel (o Xilofono metallico) , Arpa , Flauto Dolce", 
"Sezione Archi , Tromba , Timpani (Tamburi grandi)", 
"Pianoforte , Violino , Campanellini", 
"Triangolo , Celesta , Pizzicato (Violini suonati con le dita)", 
"Chitarra Elettrica , Batteria , Basso", 
"Tastiera Elettronica , Batteria , Battito di Mani (Clap)", 
"Sassofono , Pianoforte , Schiocco di dita", 
"Ukulele , Fischio , Tamburello", 
"Chitarra Elettrica , Campanelli della Slitta , Batteria", 
"Sintetizzatore , Drum Machine (Beatbox) , Basso", 
"Pianoforte Jazz , Contrabbasso , Spazzole (Batteria soft)", 
"Chitarra Acustica , Tamburello , Piede che batte", 
"Tastiera , Suoni Robot , Cassa dritta (Boom Boom)", 
"Chitarra Elettrica , Batteria veloce , Tromba", 
"Tamburo , Flauto Dolce , Trombetta", 
"Tuba , Clarinetto , Piatti", 
"Kazoo , Banjo , Clacson/Trombetta", 
"Fisarmonica , Tuba , Tamburello", 
"Xilofono (veloce) , Flauto , Legnetti", 
"Voce Robot , Sintetizzatore , Bip-Bop", 
"Pizzicato (Archi) , Fagotto , Triangolo", 
"Grancassa , Piatti , Tromba", 
"Banjo , Armonica a bocca , Battito di mani", 
"Pianoforte veloce , Xilofono , Effetto Boing", 
"Carillon , Flauto Dolce", 
"Arpa , Violoncello", 
"Chitarra Acustica (arpeggio) , Piano dolce", 
"Arpa , Coro di voci bianche", 
"Celesta , Pianoforte lento", 
"Violoncello , Chitarra classica", 
"Flauto di Pan , Chitarra acustica", 
"Glockenspiel , Vibrafono (suono morbido)", 
"Organo dolce , Flauto", 
"Pianoforte Giocattolo (lento) , Archi leggeri", 
"Ukulele , Maracas , Onde del mare", 
"Cornamusa , Flauto , Tamburello", 
"Chitarra Classica , Maracas , Bonghi", 
"Fisarmonica , Clarinetto , Tuba", 
"Violino (Fiddle) , Chitarra Acustica , Banjo", 
"Bonghi , Legnetti , Marimba (Xilofono di legno)", 
"Fisarmonica , Tamburello , Mandolino", 
"Organo Hammond , Battito di Mani , Tamburo", 
"Fisarmonica , Violino , Contrabbasso", 
"Corno , Flauto , Chitarra Acustica"
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showConsentSuggestions() {
  clearSuggestions();
  const list = [
    "SÌ, ACCONSENTO",
    "NON, ACCONSENTO"
  ];
  const subset = randomSample(list, 2);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      if (/^NON/i.test(t)) {
        clearSuggestions();
        const who = { id: 99, name: "Assistente", initial: "ML" };
        renderMessage("Non avendo fornito il consenso al trattamento dei dati richiesto, al momento non è possibile proseguire con il servizio", "avatar", who);
        waitingForUser = false;
        gatePhase = null;
        if (userInput) userInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        if (speakBtn) speakBtn.disabled = true;
        startCountdown(15);
      } else {
        clearSuggestions();
        const who = { id: 99, name: "Assistente", initial: "ML" };
        userConsentOTP = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
        try { localStorage.setItem("MUSICLAB_OTP", userConsentOTP); } catch (_) {}
        (async () => {
          const ok = await sendConsentOtpEmail(userEmail, userConsentOTP);
          if (ok) {
            gatePhase = "otp";
            otpAttempts = 0;
            if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
            otpTimerId = setTimeout(() => {
              renderMessage("Tempo scaduto: il codice OTP è scaduto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
              waitingForUser = false;
              updateSendDisabled();
              startCountdown(15);
              setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
            }, 60000);
            if (otpGate) otpGate.style.display = "grid";
            if (userInput) userInput.disabled = true;
            try { otpInput && otpInput.focus(); } catch (_) {}
            
          } else {
            gatePhase = "otp";
            otpAttempts = 0;
            if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
            otpTimerId = setTimeout(() => {
              renderMessage("Tempo scaduto: il codice OTP è scaduto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
              waitingForUser = false;
              updateSendDisabled();
              startCountdown(15);
              setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
            }, 60000);
        if (otpGate) otpGate.style.display = "grid";
            if (otpError) {
              let extra = "";
              try {
                const e = window.ML_LAST_OTP_ERROR || {};
                if (e.code || e.detail) {
                  extra = " (" + [e.code, e.detail].filter(Boolean).join(": ").slice(0, 200) + ")";
                }
              } catch (_) {}
              otpError.textContent = "Invio OTP via e-mail non riuscito. Riprova." + extra;
              otpError.style.display = "block";
            }
            if (userInput) userInput.disabled = true;
            try { otpInput && otpInput.focus(); } catch (_) {}
          }
        })();
      }
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function showQuestion10Suggestions() {
  clearSuggestions();
  const list = [
"Pop natalizio.",
"Filastrocca allegra.",
"Classica dolce.",
"Rock leggerissimo.",
"Swing festoso.",
"Tradizionale natalizia.",
"Pop moderno.",
"Filastrocca ritmata.",
"Classica magica.",
"Rock fiabesco.",
"Swing elegante.",
"Corale natalizio.",
"Pop infantile.",
"Filastrocca lenta.",
"Filastrocca veloce.",
"Classica brillante.",
"Rock giocoso.",
"Swing sorridente.",
"Gospel natalizio.",
"Pop sognante.",
"Filastrocca dolce.",
"Classica incantata.",
"Ballata natalizia.",
"Pop ritmato.",
"Rock natalizio.",
"Swing anni ‘50.",
"Filastrocca in rima.",
"Musica da carillon.",
"Pop-orchestrale.",
"Musica cinematica.",
"Filastrocca molto breve.",
"Musica da cartone animato.",
"Pop leggero.",
"Pop ballabile.",
"Musica simile ai jingle.",
"Armonie classiche.",
"Folk natalizio.",
"Pop elettronico leggero.",
"Filastrocca giocosa.",
"Pop tenero.",
"Filastrocca swingata.",
"Rock dei bambini.",
"Pop delicato.",
"Classica per fiabe.",
"Brano da musical.",
"Pop acustico.",
"Filastrocca molto ritmata.",
"Musica tradizionale del Nord.",
"Pop gioioso.",
"Filastrocca a coro."
  ];
  const subset = randomSample(list, 10);
  const cont = document.createElement("div");
  cont.className = "suggestions";
  subset.forEach((t) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = t;
    chip.addEventListener("click", () => {
      try { clearQuestionTimer(); } catch (_) {}
      try { if (recognition && isRecognizing) { stoppedByUser = true; recognition.stop(); } } catch (_) {}
      userInput.value = t;
      autoResize();
      updateSendDisabled();
      try { userInput.focus(); } catch (_) {}
      clearSuggestions();
      handleUserAnswer(t);
      tryUnmuteAvatar();
    });
    cont.appendChild(chip);
  });
  suggestionsEl = cont;
  chatEl.appendChild(cont);
  scrollToBottom();
}

function handleSubmit(e) {
  e.preventDefault();
  clearQuestionTimer();
  handleUserAnswer(userInput.value);
  tryUnmuteAvatar();
}

chatForm.addEventListener("submit", handleSubmit);
userInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    clearQuestionTimer();
    handleUserAnswer(userInput.value);
    tryUnmuteAvatar();
  }
});

// Abilita/disabilita il pulsante Invia in base al contenuto dell'input
function updateSendDisabled() {
  const hasText = (userInput.value || "").trim().length > 0;
  if (!waitingForUser) {
    sendBtn.disabled = true;
    return;
  }
  if (isRecognizing) {
    sendBtn.disabled = true;
    return;
  }
  // Se abbiamo forzato l'abilitazione dopo lo stop, tieni Invia abilitato
  if (forceEnableSend) {
    sendBtn.disabled = false;
    return;
  }
  sendBtn.disabled = !hasText;
}
userInput.addEventListener("input", updateSendDisabled);

function autoResize() {
  userInput.style.height = "auto";
  const h = Math.min(userInput.scrollHeight, 220);
  userInput.style.height = h + "px";
}
userInput.addEventListener("input", autoResize);

userInput.addEventListener("input", () => {
  if (!shouldFilterNow()) return;
  const v = userInput.value || "";
  const s = sanitizeForbidden(v);
  if (s !== v) {
    userInput.value = s;
    autoResize();
  }
});

function showKeyboardFor(el) {
  try {
    el.setAttribute("autocapitalize", "none");
    el.setAttribute("enterkeyhint", "done");
    el.focus({ preventScroll: false });
    try {
      const len = (el.value || "").length;
      if (typeof el.setSelectionRange === "function") {
        el.setSelectionRange(len, len);
      }
    } catch (_) {}
    try { el.click(); } catch (_) {}
    try {
      if (navigator.virtualKeyboard && typeof navigator.virtualKeyboard.show === "function") {
        navigator.virtualKeyboard.show();
      }
    } catch (_) {}
    try { el.scrollIntoView({ block: "end" }); } catch (_) {}
    setTimeout(() => {
      try { el.focus(); } catch (_) {}
    }, 60);
  } catch (_) {}
}

function tryUnmuteAvatar() {
  if (!avatarVideo) return;
  if (!avatarVideoAllowed) return;
  avatarAudioEnabled = true;
  avatarVideo.muted = false;
  if (switchingVideo) return;
}

function enableAudioFromStart() {
  if (!avatarVideo) return;
  avatarVideoAllowed = true;
  avatarAudioEnabled = true;
  try {
    avatarVideo.src = "Avatar_Intro.mp4";
    avatarVideo.preload = "auto";
    avatarVideo.muted = false;
    avatarVideo.currentTime = 0;
    if (avatarVideoContainer) avatarVideoContainer.classList.remove("is-hidden");
    if (avatarImageContainer) avatarImageContainer.classList.add("is-hidden");
    avatarCircle.style.display = "none";
    avatarVideo.play().catch(() => {});
  } catch (_) {}
}

function gateAnswerUntilVideoEnds() {
  const enable = () => {
    waitingForUser = true;
    userInput.disabled = false;
    if (speakBtn) speakBtn.disabled = false;
    forceEnableSend = false;
    updateSendDisabled();
    userInput.focus();
    if (!gatePhase) startQuestionTimer();
  };
  if (avatarVideo && avatarVideoAllowed) {
    if (avatarVideo.ended || (avatarVideo.duration && avatarVideo.currentTime >= avatarVideo.duration)) {
      enable();
      return;
    }
    const handler = () => {
      avatarVideo.removeEventListener("ended", handler);
      enable();
    };
    avatarVideo.addEventListener("ended", handler);
    return;
  }
  enable();
}

if (avatarVideoContainer) {
  avatarVideoContainer.addEventListener("click", () => {
    avatarAudioEnabled = !avatarAudioEnabled;
    avatarVideo.muted = !avatarAudioEnabled;
    if (avatarAudioEnabled) {
      avatarVideo.play().catch(() => {});
    }
  });
}

if (speakBtn) {
  speakBtn.addEventListener("click", () => {
    if (!waitingForUser) return;
    if (!recognition) {
      // Fallback: informo che non è supportato
      renderMessage(
        "Il tuo browser non supporta la dettatura vocale.",
        "avatar",
        { id: 98, name: "Assistente", initial: "ML" }
      );
      return;
    }
    if (isRecognizing) {
      stoppedByUser = true;
      recognition.stop();
    } else {
      try {
        stoppedByUser = false;
        recognition.start();
      } catch (_) {
        // in alcuni browser, start può lanciare se già in esecuzione
        stoppedByUser = true;
        recognition.stop();
        renderMessage("Se non parte, consenti il microfono e usa Chrome/Edge su localhost.", "avatar", { id: 97, name: "Assistente", initial: "ML" });
        if (speakHint) {
          speakHint.textContent = "Consenti il microfono nel browser";
          speakHint.style.display = "inline";
        }
      }
    }
  });
}

// Avvio
window.addEventListener("DOMContentLoaded", () => {
  showStartupPopup();
  updateHeaderAvatar(avatars[0]);
  showTyping(true);
  setTimeout(() => {
    showTyping(false);
    waitingForUser = false;
    gatePhase = "email";
    userInput.disabled = false;
    if (speakBtn) {
      speakBtn.disabled = true;
      speakBtn.classList.remove("recording");
    }
    if (speakHint) speakHint.style.display = "none";
    try {
      userInput.setAttribute("inputmode", "email");
      userInput.setAttribute("autocomplete", "email");
      userInput.placeholder = "Inserisci la tua email…";
    } catch (_) {}
    forceEnableSend = false;
    updateSendDisabled();
    autoResize();
  }, 600);
  if (uploadCodiciBtn) {
    uploadCodiciBtn.addEventListener("click", () => {
      uploadCodiciAppToBucket();
    });
  }
  if (emailConfirmBtn && emailInput && emailCodeInput) {
    const submitGate = async () => {
      const vEmail = String(emailInput.value || "").trim();
      const vCode = String(emailCodeInput.value || "").trim();
      const vEmailU = vEmail.toUpperCase();
      const vCodeU = vCode.toUpperCase();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!vEmail || !re.test(vEmail)) {
        if (emailError) emailError.textContent = "Inserisci un indirizzo email valido";
        if (emailError) emailError.style.display = "block";
        try { emailInput.focus(); } catch (_) {}
        return;
      }
      if (!vCode || vCode.length < 4) {
        if (emailError) emailError.textContent = "Inserisci un codice di accesso valido";
        if (emailError) emailError.style.display = "block";
        try { emailCodeInput.focus(); } catch (_) {}
        return;
      }
      if (emailError) emailError.style.display = "none";
      const res = await verifyAppCode(vCodeU);
      if (!res.found) {
        if (emailError) emailError.textContent = "Voucher non valido";
        if (emailError) emailError.style.display = "block";
        try { emailCodeInput.focus(); } catch (_) {}
        return;
      }
      if (res.used) {
        if (emailError) emailError.textContent = "Voucher già utilizzato";
        if (emailError) emailError.style.display = "block";
        try { emailCodeInput.focus(); } catch (_) {}
        return;
      }
      userEmail = vEmailU;
      userAccessCode = vCodeU;
      if (emailGate) emailGate.style.display = "none";
      if (speakBtn) speakBtn.disabled = false;
      gatePhase = "phone";
      waitingForUser = true;
      userInput.disabled = false;
      userInput.value = "";
      updateSendDisabled();
      autoResize();
      const who = { id: 99, name: "Assistente", initial: "ML" };      
      const consent = `Per proseguire ho bisogno del tuo consenso al trattamento dei dati.\n\nFinalità e dati trattati:\n1) Invio della canzone generata → uso della tua e-mail.\n2) Invio di OTP via MAIL per confermare la tua identità.\n3) Uso della voce del minore per dialogo con l’assistente virtuale (solo con consenso del genitore/tutore).\n\nBase giuridica: tuo consenso (art. 6 e art. 8 GDPR).\nModalità: dati trattati in modo sicuro e non condivisi con terzi non autorizzati.\nConservazione: solo per il tempo necessario al servizio.\n\nPer acconsentire clicca su "SÌ, ACCONSENTO" in modo da consentirci l'invio del codice OTP per confermare il consenso`;
      renderMessage(consent, "avatar", who);
      try { showGdprInfoButton(); } catch (_) {}
      try { showConsentSuggestions(); } catch (_) {}
      try { userInput.focus(); } catch (_) {}
    };
    emailConfirmBtn.addEventListener("click", submitGate);
    emailInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitGate();
      }
    });
    emailCodeInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitGate();
      }
    });
  }
  if (gdprCloseBtn && gdprPanel) {
    gdprCloseBtn.addEventListener("click", () => {
      gdprPanel.style.display = "none";
    });
  }
  if (otpConfirmBtn && otpInput) {
    const submitOtpGate = async () => {
      const onlyDigits = String(otpInput.value || "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(onlyDigits)) {
        if (otpError) otpError.textContent = "Inserisci un codice OTP valido (6 cifre)";
        if (otpError) otpError.style.display = "block";
        try { otpInput.focus(); } catch (_) {}
        return;
      }
      if (userConsentOTP && onlyDigits !== userConsentOTP) {
        otpAttempts += 1;
        if (otpAttempts >= 4) {
          if (otpError) otpError.textContent = "Troppi tentativi: ricarico la pagina";
          if (otpError) otpError.style.display = "block";
          if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
          startCountdown(15);
          setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
          return;
        }
        if (otpError) otpError.textContent = "Codice OTP errato. Riprova.";
        if (otpError) otpError.style.display = "block";
        try { otpInput.focus(); } catch (_) {}
        return;
      }
      if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
      otpVerifiedAt = new Date().toISOString();
      try {
        const updated = await markAppCodeUsed(userAccessCode, userEmail, otpVerifiedAt, "Y", userConsentOTP);
        if (!updated) {
          renderMessage("Aggiornamento remoto del Voucher non riuscito. Riprova più tardi.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
        }
      } catch (_) {
        renderMessage("Aggiornamento remoto del Voucher non riuscito. Riprova più tardi.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
      }
      if (otpGate) otpGate.style.display = "none";
      gatePhase = null;
      waitingForUser = false;
      userInput.value = "";
      userInput.disabled = true;
      autoResize();
      playAssistantLines(introLines, showFirstQuestionAfterIntro);
    };
    otpConfirmBtn.addEventListener("click", submitOtpGate);
    otpInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitOtpGate();
      }
    });
  }
  if (otpResendBtn) {
    const resendOtpGate = async () => {
      const vEmailRaw = String((otpEmailInput && otpEmailInput.value) || userEmail || "").trim();
      const vEmail = vEmailRaw.toUpperCase();
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!vEmail || !re.test(vEmail)) {
        if (otpError) otpError.textContent = "Inserisci un indirizzo email valido per il reinvio";
        if (otpError) otpError.style.display = "block";
        try { otpEmailInput && otpEmailInput.focus(); } catch (_) {}
        return;
      }
      userEmail = vEmail;
      userConsentOTP = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      try { localStorage.setItem("MUSICLAB_OTP", userConsentOTP); } catch (_) {}
      if (otpTimerId) { try { clearTimeout(otpTimerId); } catch (_) {} otpTimerId = null; }
      otpTimerId = setTimeout(() => {
        renderMessage("Tempo scaduto: il codice OTP è scaduto.", "avatar", { id: 99, name: "Assistente", initial: "ML" });
        waitingForUser = false;
        updateSendDisabled();
        startCountdown(15);
        setTimeout(() => { try { location.reload(); } catch (_) {} }, 15000);
      }, 300000);
      const ok = await sendConsentOtpEmail(userEmail, userConsentOTP);
      if (ok) {
        const who = { id: 99, name: "Assistente", initial: "ML" };
        renderMessage("Ho inviato un nuovo OTP all’email aggiornata.", "avatar", who);
        if (otpError) otpError.style.display = "none";
        if (otpGate) otpGate.style.display = "grid";
        if (userInput) userInput.disabled = true;
        try { otpInput && otpInput.focus(); } catch (_) {}
      } else {
        if (otpError) otpError.textContent = "Reinvio OTP non riuscito. Riprova";
        if (otpError) otpError.style.display = "block";
        try { otpEmailInput && otpEmailInput.focus(); } catch (_) {}
      }
    };
    otpResendBtn.addEventListener("click", resendOtpGate);
    if (otpEmailInput) {
      otpEmailInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          resendOtpGate();
        }
      });
    }
  }
});
function showFirstQuestionAfterIntro() {
  if (avatarVideo && avatarVideoAllowed) {
    const ready = avatarVideo.duration && avatarVideo.currentTime >= avatarVideo.duration;
    if (avatarVideo.ended || ready) {
      showNextQuestion();
      return;
    }
    const handler = () => {
      avatarVideo.removeEventListener("ended", handler);
      showNextQuestion();
    };
    avatarVideo.addEventListener("ended", handler);
    return;
  }
  showNextQuestion();
}
async function sendConsentOtp(phone, code) {
  const { backendUrl } = await loadSecrets();
  const payload = { to: phone, code };
  // Try remote first
  if (backendUrl) {
    try {
      const u = backendUrl.endsWith("/") ? backendUrl + "send-otp" : backendUrl + "/send-otp";
      const r = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) return true;
      try {
        const j = await r.json();
        if (j && j.error) {
          renderMessage("Invio OTP non riuscito: " + j.error, "avatar", { id: 99, name: "Assistente", initial: "ML" });
          if (j.detail) renderMessage(String(j.detail), "avatar", { id: 99, name: "Assistente", initial: "ML" });
        }
      } catch (_) {}
    } catch (_) {}
  }
  try {
    const res = await fetch("/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
    try {
      const j = await res.json();
      if (j && j.error) {
        renderMessage("Invio OTP non riuscito: " + j.error, "avatar", { id: 99, name: "Assistente", initial: "ML" });
        if (j.detail) renderMessage(String(j.detail), "avatar", { id: 99, name: "Assistente", initial: "ML" });
      }
    } catch (_) {}
  } catch (_) {}
  return false;
}

// Verifica OTP lato client rispetto a quello generato
async function verifyAppCode(code) {
  const { backendUrl } = await loadSecrets();
  const payload = { code };
  if (!backendUrl) return { found: false, used: false, error: true };
  try {
    const u = backendUrl.endsWith("/") ? backendUrl + "verify-code" : backendUrl + "/verify-code";
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const j = await r.json();
      return { found: !!j.found, used: !!j.used };
    }
  } catch (_) {}
  try {
    const r2 = await fetch("/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r2.ok) {
      const j2 = await r2.json();
      return { found: !!j2.found, used: !!j2.used };
    }
  } catch (_) {}
  return { found: false, used: false, error: true };
}

function showEmailGateNow() {
  if (emailGate) emailGate.style.display = "grid";
  if (emailInput) {
    emailInput.setAttribute("inputmode", "email");
    emailInput.setAttribute("autocomplete", "off");
    emailInput.setAttribute("autocapitalize", "none");
    emailInput.setAttribute("spellcheck", "false");
    emailInput.setAttribute("name", "no-store-email-" + Date.now());
    try { emailInput.value = ""; } catch (_) {}
    emailInput.focus();
    try { emailInput.setSelectionRange((emailInput.value || "").length, (emailInput.value || "").length); } catch (_) {}
  }
  if (emailCodeInput) {
    emailCodeInput.setAttribute("inputmode", "text");
    emailCodeInput.setAttribute("autocomplete", "off");
    emailCodeInput.setAttribute("autocapitalize", "none");
    emailCodeInput.setAttribute("spellcheck", "false");
    emailCodeInput.setAttribute("name", "no-store-code-" + Date.now());
    try { emailCodeInput.value = ""; } catch (_) {}
  }
}

function showStartupPopup() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.72)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 300ms ease";
  try { overlay.style.backdropFilter = "blur(6px)"; } catch (_) {}

  let styleEl = document.getElementById("mlPopupStyles");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "mlPopupStyles";
    styleEl.textContent = "@keyframes mlPulse{0%{box-shadow:0 0 12px rgba(255,255,255,0.08),0 0 28px rgba(0,153,255,0.18)}50%{box-shadow:0 0 24px rgba(255,255,255,0.18),0 0 64px rgba(255,0,150,0.28)}100%{box-shadow:0 0 12px rgba(255,255,255,0.08),0 0 28px rgba(0,153,255,0.18)}}@keyframes mlKenBurns{0%{transform:scale(1) translate3d(0,0,0)}100%{transform:scale(1.06) translate3d(1.5%, -1.5%, 0)}}";
    document.head.appendChild(styleEl);
  }
  const box = document.createElement("div");
  box.style.background = "transparent";
  box.style.borderRadius = "12px";
  box.style.padding = "16px";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.width = "auto";
  box.style.height = "auto";
  box.style.boxShadow = "none";
  box.style.border = "2px solid #ffffff";
  box.style.textAlign = "center";
  box.style.perspective = "1000px";
  box.style.animation = "mlPulse 3.5s ease-in-out infinite";
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.width = "1px";
  wrap.style.height = "1px";
  wrap.style.overflow = "hidden";
  let imgA = document.createElement("img");
  imgA.style.position = "absolute";
  imgA.style.left = "0";
  imgA.style.top = "0";
  imgA.style.width = "100%";
  imgA.style.height = "100%";
  imgA.style.objectFit = "contain";
  imgA.style.opacity = "1";
  imgA.style.transition = "opacity 1200ms ease-in-out, filter 1200ms ease-in-out";
  imgA.style.filter = "blur(0px)";
  let imgB = document.createElement("img");
  imgB.style.position = "absolute";
  imgB.style.left = "0";
  imgB.style.top = "0";
  imgB.style.width = "100%";
  imgB.style.height = "100%";
  imgB.style.objectFit = "contain";
  imgB.style.opacity = "0";
  imgB.style.transition = "opacity 1200ms ease-in-out, filter 1200ms ease-in-out";
  imgB.style.filter = "blur(10px)";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Chiudi";
  btn.style.marginTop = "12px";
  btn.style.padding = "10px 20px";
  btn.style.fontSize = "16px";
  btn.style.borderRadius = "8px";
  btn.style.border = "1px solid #ccc";
  btn.style.background = "#f5f5f5";
  btn.style.cursor = "pointer";
  const imgs = ["Step1.jpg","Step2.jpg","Step3.jpg","Step4.jpg"];
  let i = 0;
  let timer = null;
  const MORPH_MS = 1200;
  const HOLD_MS = 5000;
  const updateSizeFrom = (img) => {
    try {
      const nw = img.naturalWidth || img.width || 0;
      const nh = img.naturalHeight || img.height || 0;
      if (nw > 0 && nh > 0) {
        const sw = Math.round(nw * 1);
        const sh = Math.round(nh * 1);
        wrap.style.width = sw + "px";
        wrap.style.height = sh + "px";
        imgA.style.width = "100%";
        imgA.style.height = "100%";
        imgB.style.width = "100%";
        imgB.style.height = "100%";
      }
    } catch (_) {}
  };
  const loadImage = (img, src, cb) => {
    try {
      img.onload = () => { img.onload = null; cb(); };
      img.onerror = () => { try { img.onerror = null; } catch (_) {} cb(); };
    } catch (_) { img.onload = null; }
    img.src = src;
    if (img.complete) {
      try {
        if (img.naturalWidth > 0 || img.naturalHeight > 0) {
          setTimeout(cb, 0);
        }
      } catch (_) { setTimeout(cb, 0); }
    }
  };
  const startSequence = () => {
    loadImage(imgA, imgs[i], () => { updateSizeFrom(imgA); });
    i = (i + 1) % imgs.length;
    loadImage(imgB, imgs[i], () => {});
  };
  
  const advance = () => {
    loadImage(imgA, imgs[i], () => {
      updateSizeFrom(imgA);
      i = (i + 1) % imgs.length;
    });
  };
  startSequence();
  wrap.appendChild(imgA);
  wrap.appendChild(imgB);
  btn.addEventListener("click", () => {
    try { clearTimeout(timer); } catch (_) {}
    overlay.style.opacity = "0";
    setTimeout(() => { try { overlay.remove(); } catch (_) {} try { showEmailGateNow(); } catch (_) {} }, 300);
  });
  box.appendChild(wrap);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const scheduleNext = () => { timer = setTimeout(() => { advance(); scheduleNext(); }, HOLD_MS); };
  setTimeout(() => { overlay.style.opacity = "1"; scheduleNext(); }, 120);
}
