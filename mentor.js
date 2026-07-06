// ============================================================
//  MENTOR DOCENTE UDD  —  Lógica principal (Fase 1.1)
// ============================================================

// ---- 1. Prompt base del mentor (del documento del cliente) ----
const SYSTEM_PROMPT = `
Eres "Mentor Docente UDD", un mentor académico especializado en educación
superior, innovación educativa y desarrollo docente, al servicio de los
profesores de Ingeniería Civil Industrial de la Universidad del Desarrollo.

TU ROL ES EL DE UN MENTOR, NO UN TUTOR.
- Acompañas, no diriges.
- Orientas, no entregas respuestas hechas.
- Formulas preguntas, no das soluciones cerradas.
- Tu foco es el desarrollo profesional del docente, no resolver su tarea por él.

CÓMO CONVERSAS:
- Usas preguntas abiertas y poderosas que invitan a la reflexión, por ejemplo:
  "¿Qué has intentado hasta ahora?", "¿Qué evidencia tienes de ese problema?",
  "¿Qué alternativas consideras más viables?", "¿Qué aprendizaje quieres generar
  en tus estudiantes?".
- Practicas escucha activa: reformulas y sintetizas lo que el docente expresa
  antes de avanzar.
- Muestras inteligencia emocional: validas frustraciones, incertidumbre o
  sobrecarga, y generas confianza.
- Mantienes un tono cercano, profesional y orientado al crecimiento continuo.

LO QUE EVITAS:
- Respuestas directivas del tipo "Haz esto" o "La respuesta correcta es".
- Convertirte en un buscador de información o en un evaluador.
- Dar soluciones largas y cerradas. Prefieres devolver la reflexión al docente.

FORMA DE TUS RESPUESTAS:
- Breves y conversacionales. Normalmente 2 a 4 frases.
- Casi siempre terminas con una pregunta que ayuda al docente a seguir pensando.
- Cuando sugieres estrategias (metodologías activas, evaluación auténtica,
  retroalimentación efectiva, rúbricas, etc.), las ofreces como opciones a
  considerar, no como instrucciones.

Te apoyas en buenas prácticas de educación superior, aprendizaje activo,
evaluación auténtica, mentoría y el Modelo Educativo UDD.
`.trim();

// ---- 2. Estado de la conversación ----
// `history` apunta SIEMPRE al historial de la conversación activa (ver sección 10).
let history = []; // [{ role: "user" | "model", text: "..." }]

// ---- 3. Referencias del DOM ----
const conversationEl  = document.getElementById("conversation");
const welcomeEl        = document.getElementById("welcome");
const inputEl          = document.getElementById("input");
const sendBtn          = document.getElementById("send");
const statusDot        = document.getElementById("statusDot");
const statusText       = document.getElementById("statusText");
const scrollBottomBtn  = document.getElementById("scrollBottomBtn");
// Panel (drawer) de conversaciones
const menuBtn          = document.getElementById("menuBtn");
const drawerEl         = document.getElementById("drawer");
const drawerBackdrop   = document.getElementById("drawerBackdrop");
const drawerListEl     = document.getElementById("drawerList");
const drawerCloseBtn   = document.getElementById("drawerCloseBtn");
const newConvBtn       = document.getElementById("newConvBtn");

// ---- 4. Modo de conexión: proxy seguro vs. key local ----
// Tras desplegar el Cloudflare Worker (Fase 1.2), pega su URL aquí, por ejemplo:
//   const WORKER_URL = "https://mentor-udd-proxy.tu-cuenta.workers.dev";
// Con WORKER_URL seteada, la key vive en el Worker y NUNCA llega al navegador.
// Si lo dejas vacío, el sitio usa la key local de config.js (modo desarrollo directo).
const WORKER_URL = "https://mentor-udd-proxy.transportesvidisa.workers.dev/";
const WORKER_BASE = WORKER_URL.replace(/\/+$/, ""); // sin slash final
window.MENTOR_WORKER_BASE = WORKER_BASE;            // lo usa auth.js para el login

function usingProxy() {
  return typeof WORKER_URL === "string" && WORKER_URL.trim() !== "";
}

function getConfig() {
  const cfg = window.MENTOR_CONFIG;
  if (!cfg || !cfg.GEMINI_API_KEY || cfg.GEMINI_API_KEY === "PEGA_TU_API_KEY_AQUI") {
    return null;
  }
  return cfg;
}

// Listo para enviar si hay proxy configurado, o si hay key local (modo directo).
function isReady() {
  return usingProxy() || getConfig() !== null;
}

function setStatus(state, text) {
  statusDot.className = "status-dot " + state;
  statusText.textContent = text;
}

// Habilita "enviar" solo cuando hay texto y el input no está bloqueado.
function updateSendState() {
  sendBtn.disabled = inputEl.disabled || inputEl.value.trim() === "";
}

(function checkConfig() {
  if (usingProxy()) {
    setStatus("ok", "Listo (vía proxy seguro)");
  } else if (getConfig()) {
    setStatus("ok", "Listo");
  } else {
    setStatus("warn", "Falta API key");
  }
})();

// ---- 5. Autoajuste del textarea ----
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
  updateSendState();
});
updateSendState(); // estado inicial (input vacío → enviar deshabilitado)

// ---- 6. Envío de mensajes ----
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
sendBtn.addEventListener("click", handleSend);

// Chips de sugerencia
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    inputEl.value = chip.dataset.prompt;
    handleSend();
  });
});

// Evita envíos dobles: los chips de sugerencia llaman handleSend() directo,
// así que con solo deshabilitar el input no basta.
let isSending = false;

async function handleSend() {
  if (isSending) return;
  const text = inputEl.value.trim();
  if (!text) return;

  if (!isReady()) {
    addMentorMessage(
      "Aún no hay conexión configurada. Para desarrollo, pega tu clave en **config.js** " +
      "(gratis en aistudio.google.com/apikey). Para producción, despliega el Worker y pega " +
      "su URL en **WORKER_URL** (mentor.js). Luego recarga la página."
    );
    return;
  }

  // Oculta la bienvenida en el primer mensaje (se conserva en el DOM para
  // poder restaurarla al limpiar la conversación).
  if (welcomeEl) welcomeEl.hidden = true;

  // Pinta el mensaje del usuario
  addUserMessage(text);
  history.push({ role: "user", text });
  touchActive(); // guarda y actualiza el panel de conversaciones

  // Limpia el input
  inputEl.value = "";
  inputEl.style.height = "auto";
  isSending = true;
  inputEl.disabled = true;
  sendBtn.disabled = true;

  // Indicador de "pensando"
  const thinkingEl = addThinking();

  try {
    const reply = await callGeminiWithRetry(history, (attempt) => {
      setStatus("warn", "Reintentando… (" + attempt + "/" + MAX_ATTEMPTS + ")");
      setThinkingLabel(thinkingEl, "Reintentando…");
    });
    thinkingEl.remove();
    addMentorMessage(reply);
    history.push({ role: "model", text: reply });
    touchActive();
    setStatus("ok", "Listo");
  } catch (err) {
    thinkingEl.remove();
    console.error(err);
    const fe = friendlyError(err);
    addMentorMessage(fe.text);
    setStatus("err", fe.statusText);
  } finally {
    isSending = false;
    inputEl.disabled = false;
    updateSendState();
    inputEl.focus();
  }
}

// ---- 7. Llamada a la API de Gemini (con reintentos) ----

// Error de API con lo necesario para decidir si conviene reintentar.
class ApiError extends Error {
  constructor(status, message, retryAfterMs) {
    super(message);
    this.status = status;                  // 0 = fallo de red (fetch rechazado)
    this.retryAfterMs = retryAfterMs || null;
  }
}

const MAX_ATTEMPTS = 3;                    // 1 intento + 2 reintentos
const RETRYABLE_STATUS = [0, 429, 500, 502, 503, 504];
const MAX_RETRY_DELAY_MS = 15000;          // espera mayor = cuota diaria agotada: no insistir

// Google incluye RetryInfo en los 429:
//   error.details: [{ "@type": ".../google.rpc.RetryInfo", retryDelay: "12s" }]
function parseRetryDelay(errJson) {
  const details = errJson?.error?.details;
  if (!Array.isArray(details)) return null;
  for (const d of details) {
    if (d && typeof d.retryDelay === "string") {
      const secs = parseFloat(d.retryDelay);
      if (!isNaN(secs) && secs >= 0) return Math.round(secs * 1000);
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reintenta ante errores transitorios (rate limit, caídas del servicio, red).
// Respeta el retryDelay que sugiere Gemini; sin sugerencia usa backoff
// exponencial con jitter (~1.2-1.6 s, luego ~2.4-2.8 s).
async function callGeminiWithRetry(hist, onRetry) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await callGemini(hist);
    } catch (err) {
      const retryable = err instanceof ApiError && RETRYABLE_STATUS.includes(err.status);
      if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
      if (err.retryAfterMs && err.retryAfterMs > MAX_RETRY_DELAY_MS) throw err;
      const delay =
        err.retryAfterMs || 1200 * Math.pow(2, attempt - 1) + Math.random() * 400;
      if (onRetry) onRetry(attempt + 1, delay);
      await sleep(delay);
    }
  }
}

// Traduce el error técnico a un mensaje claro para el docente.
function friendlyError(err) {
  const status = err instanceof ApiError ? err.status : null;
  if (status === 429) {
    return {
      text:
        "El mentor está recibiendo muchas consultas y alcanzamos el límite " +
        "gratuito por ahora. Espera un minuto y vuelve a intentarlo.",
      statusText: "Límite de uso",
    };
  }
  if (status === 401) {
    return { text: err.message, statusText: "Sesión expirada" };
  }
  if (status === 403) {
    return {
      text: "Este sitio no está autorizado para conectarse al mentor. Avisa al administrador.",
      statusText: "No autorizado",
    };
  }
  if (status === 0) {
    return {
      text: "No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.",
      statusText: "Sin conexión",
    };
  }
  if (status >= 500) {
    return {
      text: "El servicio del mentor tuvo un problema temporal. Vuelve a intentarlo en unos segundos.",
      statusText: "Error del servicio",
    };
  }
  return {
    text:
      "Hubo un problema al conectar con el mentor. Vuelve a intentarlo. " +
      "_(" + (err.message || "error desconocido") + ")_",
    statusText: "Error",
  };
}

async function callGemini(hist) {
  const contents = hist.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 800,
      topP: 0.95,
    },
  };

  // Elige el destino: proxy seguro (sin key en el cliente) o Gemini directo (key local).
  let url;
  const headers = { "Content-Type": "application/json" };
  if (usingProxy()) {
    url = WORKER_BASE + "/chat";
    const token = window.MENTOR_AUTH && window.MENTOR_AUTH.getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
  } else {
    const cfg = getConfig();
    url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      cfg.MODEL + ":generateContent?key=" + encodeURIComponent(cfg.GEMINI_API_KEY);
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (_) {
    // fetch rechazado (sin red, DNS, CORS): error de conexión, reintentable.
    throw new ApiError(0, "No hay conexión con el servidor.");
  }

  // Token inválido o expirado: vuelve a pedir inicio de sesión.
  if (res.status === 401 && usingProxy()) {
    if (window.MENTOR_AUTH) window.MENTOR_AUTH.logout();
    throw new ApiError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  }

  if (!res.ok) {
    let detail = "";
    let retryAfterMs = null;
    try {
      const e = await res.json();
      detail = e.error?.message || "";
      retryAfterMs = parseRetryDelay(e);
    } catch (_) {}
    throw new ApiError(
      res.status,
      "HTTP " + res.status + (detail ? " — " + detail : ""),
      retryAfterMs
    );
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || "").join("").trim();

  if (!text) {
    // Posible bloqueo por filtros de seguridad u respuesta vacía
    const reason = data.candidates?.[0]?.finishReason || "respuesta vacía";
    throw new Error("Sin respuesta (" + reason + ")");
  }
  return text;
}

// ---- 8. Renderizado de mensajes ----
function addUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "msg user";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.appendChild(bubble);
  conversationEl.appendChild(msg);
  scrollToBottom();
}

// Íconos SVG inline para el botón de copiar (sin assets externos).
const COPY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

// Avatar del mentor: monograma UDD en círculo; si no carga, círculo azul de fallback.
function createAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const img = document.createElement("img");
  img.className = "brand-logo";
  img.src = "assets/logo-mark.png";
  img.alt = "";
  img.onerror = () => { img.remove(); avatar.classList.add("avatar--fallback"); };
  avatar.appendChild(img);
  return avatar;
}

// Botón "copiar" que recuerda el texto crudo (no el HTML renderizado).
function createCopyButton(text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.title = "Copiar respuesta";
  btn.setAttribute("aria-label", "Copiar respuesta");
  btn.innerHTML = COPY_ICON + '<span class="copy-label">Copiar</span>';
  btn.addEventListener("click", () => copyText(text, btn));
  return btn;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Fallback para navegadores/contextos sin Clipboard API.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  // Feedback breve.
  btn.classList.add("copied");
  btn.innerHTML = CHECK_ICON + '<span class="copy-label">Copiado</span>';
  clearTimeout(btn._resetTimer);
  btn._resetTimer = setTimeout(() => {
    btn.classList.remove("copied");
    btn.innerHTML = COPY_ICON + '<span class="copy-label">Copiar</span>';
  }, 1600);
}

function addMentorMessage(text) {
  const msg = document.createElement("div");
  msg.className = "msg mentor";

  const row = document.createElement("div");
  row.className = "msg-row";
  row.appendChild(createAvatar());

  const content = document.createElement("div");
  content.className = "msg-content";

  const sender = document.createElement("div");
  sender.className = "sender";
  sender.textContent = "Mentor Docente";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);

  const actions = document.createElement("div");
  actions.className = "msg-actions";
  actions.appendChild(createCopyButton(text));

  content.appendChild(sender);
  content.appendChild(bubble);
  content.appendChild(actions);
  row.appendChild(content);
  msg.appendChild(row);
  conversationEl.appendChild(msg);
  scrollToBottom();
}

function addThinking() {
  const msg = document.createElement("div");
  msg.className = "msg mentor";

  const row = document.createElement("div");
  row.className = "msg-row";
  row.appendChild(createAvatar());

  const content = document.createElement("div");
  content.className = "msg-content";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML =
    '<div class="thinking"><span></span><span></span><span></span></div>';

  content.appendChild(bubble);
  row.appendChild(content);
  msg.appendChild(row);
  conversationEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

// Etiqueta junto a los puntos de "pensando" (p. ej. "Reintentando…").
function setThinkingLabel(thinkingMsgEl, text) {
  if (!thinkingMsgEl) return;
  const think = thinkingMsgEl.querySelector(".thinking");
  if (!think) return;
  let label = think.querySelector(".thinking-label");
  if (!label) {
    label = document.createElement("span");
    label.className = "thinking-label";
    think.appendChild(label);
  }
  label.textContent = text;
}

// Markdown ligero, sin librerías. Pipeline seguro: 1) escapar HTML,
// 2) agrupar bloques (listas, títulos, párrafos), 3) marcas inline.
// Soporta: **negrita**, _cursiva_, `código`, [texto](url http/https),
// listas con - o *, listas numeradas, títulos # a #### y párrafos.

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;"); // necesario: hay URLs dentro de href="…"
}

// Solo enlaces http(s); cualquier otro esquema (javascript:, data:…) se descarta.
function sanitizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : null;
}

// Marcas inline sobre texto YA escapado. Los placeholders (NUL + índice + NUL)
// protegen el interior de `código` y las etiquetas <a> de las demás marcas;
// el carácter nulo no puede aparecer en el texto ya escapado.
function renderInline(escaped) {
  const stash = [];
  const NUL = String.fromCharCode(0);
  const keep = (html) => NUL + (stash.push(html) - 1) + NUL;

  const out = escaped
    // `código` — primero: su interior no debe recibir más formato
    .replace(/`([^`\n]+)`/g, (_, code) => keep("<code>" + code + "</code>"))
    // [texto](url) — antes que la cursiva (las URLs suelen traer "_")
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const safe = sanitizeUrl(url);
      if (!safe) return match; // esquema no permitido: queda como texto plano
      return (
        keep('<a href="' + safe + '" target="_blank" rel="noopener noreferrer">') +
        label + keep("</a>")
      );
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // _cursiva_ acotada a límites de palabra (no rompe snake_case ni URLs)
    .replace(/(^|[\s(¿¡"'])_([^_\n]+)_(?=[\s).,;:!?"']|$)/gm, "$1<em>$2</em>");

  return out.replace(new RegExp(NUL + "(\\d+)" + NUL, "g"), (_, i) => stash[Number(i)]);
}

function formatText(text) {
  const lines = escapeHtml(text).split("\n");
  const isBullet   = (l) => /^\s*[-*]\s+/.test(l);
  const isNumbered = (l) => /^\s*\d+[.)]\s+/.test(l);
  const isHeading  = (l) => /^\s*#{1,4}\s+/.test(l);
  const isBlank    = (l) => /^\s*$/.test(l);

  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) { i++; continue; }

    if (isBullet(line)) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) {
        items.push("<li>" + renderInline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>");
        i++;
      }
      html.push("<ul>" + items.join("") + "</ul>");
      continue;
    }

    if (isNumbered(line)) {
      const items = [];
      while (i < lines.length && isNumbered(lines[i])) {
        items.push("<li>" + renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, "")) + "</li>");
        i++;
      }
      html.push("<ol>" + items.join("") + "</ol>");
      continue;
    }

    if (isHeading(line)) {
      const content = line.replace(/^\s*#{1,4}\s+/, "");
      html.push("<p><strong>" + renderInline(content) + "</strong></p>");
      i++;
      continue;
    }

    // Párrafo: líneas seguidas hasta una línea en blanco u otro bloque
    const para = [];
    while (
      i < lines.length && !isBlank(lines[i]) && !isBullet(lines[i]) &&
      !isNumbered(lines[i]) && !isHeading(lines[i])
    ) {
      para.push(renderInline(lines[i]));
      i++;
    }
    html.push("<p>" + para.join("<br>") + "</p>");
  }

  return html.join("");
}

function scrollToBottom() {
  conversationEl.scrollTop = conversationEl.scrollHeight;
}

// ---- 9. Botón "ir al final" ----
function nearBottom() {
  const gap =
    conversationEl.scrollHeight - conversationEl.scrollTop - conversationEl.clientHeight;
  return gap < 120;
}
function updateScrollBottomBtn() {
  if (!scrollBottomBtn) return;
  scrollBottomBtn.hidden = nearBottom();
}
if (conversationEl && scrollBottomBtn) {
  conversationEl.addEventListener("scroll", updateScrollBottomBtn, { passive: true });
  scrollBottomBtn.addEventListener("click", () => {
    conversationEl.scrollTo({ top: conversationEl.scrollHeight, behavior: "smooth" });
    scrollBottomBtn.hidden = true;
  });
}

// ---- 10. Conversaciones (solo en esta pestaña del navegador) ----
// Persisten en sessionStorage: sobreviven recargas de la pestaña, pero se borran
// al cerrarla. NO es historial por usuario (eso requiere base de datos = Fase 2).
const SESSIONS_KEY = "mentor_udd_sessions";
const MAX_CONVERSATIONS = 30;
let conversations = []; // [{ id, title, history:[{role,text}], updatedAt }]
let activeId = null;
let idSeq = 0;

function newId() {
  idSeq += 1;
  return "c" + Date.now() + "_" + idSeq;
}

function loadSessions() {
  try {
    const raw = sessionStorage.getItem(SESSIONS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.conversations)) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function saveSessions() {
  try {
    sessionStorage.setItem(SESSIONS_KEY, JSON.stringify({ conversations, activeId }));
  } catch (_) {
    // sessionStorage no disponible (modo privado, etc.): seguimos solo en memoria.
  }
}

function activeConv() {
  return conversations.find((c) => c.id === activeId) || null;
}

function convTitle(conv) {
  if (conv.title) return conv.title;
  const firstUser = conv.history.find((m) => m.role === "user");
  if (firstUser) {
    const t = firstUser.text.trim().replace(/\s+/g, " ");
    return t.length > 42 ? t.slice(0, 42) + "…" : t;
  }
  return "Nueva conversación";
}

function relativeTime(ts) {
  if (!ts) return "";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return "hace " + min + " min";
  const h = Math.floor(min / 60);
  if (h < 24) return "hace " + h + " h";
  const d = Math.floor(h / 24);
  if (d < 7) return "hace " + d + " d";
  return new Date(ts).toLocaleDateString();
}

// Guarda la conversación activa (título + marca de tiempo) y refresca el panel.
function touchActive() {
  const conv = activeConv();
  if (conv) {
    if (!conv.title) conv.title = convTitle(conv); // se fija con el primer mensaje del usuario
    conv.updatedAt = Date.now();
    conversations = [conv, ...conversations.filter((c) => c.id !== conv.id)]; // más reciente primero
  }
  saveSessions();
  refreshDrawer();
}

// Re-pinta la conversación activa desde su historial.
function renderConversation() {
  conversationEl.querySelectorAll(".msg").forEach((m) => m.remove());
  if (history.length) {
    if (welcomeEl) welcomeEl.hidden = true;
    history.forEach((m) =>
      m.role === "user" ? addUserMessage(m.text) : addMentorMessage(m.text)
    );
  } else if (welcomeEl) {
    welcomeEl.hidden = false;
  }
  if (scrollBottomBtn) scrollBottomBtn.hidden = true;
  scrollToBottom();
}

function createConversation() {
  const conv = { id: newId(), title: null, history: [], updatedAt: Date.now() };
  conversations.unshift(conv);
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations = conversations.slice(0, MAX_CONVERSATIONS);
  }
  activeId = conv.id;
  history = conv.history;
  renderConversation();
  saveSessions();
  refreshDrawer();
}

function switchConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  activeId = id;
  history = conv.history;
  renderConversation();
  saveSessions();
  refreshDrawer();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  if (activeId === id) {
    if (conversations.length) switchConversation(conversations[0].id);
    else createConversation();
  } else {
    saveSessions();
    refreshDrawer();
  }
}

// ---- 11. Panel (drawer) de conversaciones ----
function refreshDrawer() {
  if (!drawerListEl) return;
  drawerListEl.innerHTML = "";
  if (!conversations.length) {
    const empty = document.createElement("p");
    empty.className = "drawer-empty";
    empty.textContent = "No hay conversaciones todavía.";
    drawerListEl.appendChild(empty);
    return;
  }
  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "conv-item" + (conv.id === activeId ? " active" : "");

    const main = document.createElement("div");
    main.className = "conv-main";
    const title = document.createElement("div");
    title.className = "conv-title";
    title.textContent = convTitle(conv);
    const time = document.createElement("div");
    time.className = "conv-time";
    time.textContent = relativeTime(conv.updatedAt);
    main.appendChild(title);
    main.appendChild(time);
    main.addEventListener("click", () => {
      switchConversation(conv.id);
      closeDrawer();
      inputEl.focus();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "conv-del";
    del.title = "Eliminar conversación";
    del.setAttribute("aria-label", "Eliminar conversación");
    del.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.appendChild(main);
    item.appendChild(del);
    drawerListEl.appendChild(item);
  });
}

function openDrawer() {
  refreshDrawer();
  if (drawerEl) drawerEl.classList.add("open");
  if (drawerBackdrop) drawerBackdrop.classList.add("open");
}
function closeDrawer() {
  if (drawerEl) drawerEl.classList.remove("open");
  if (drawerBackdrop) drawerBackdrop.classList.remove("open");
}

if (menuBtn) menuBtn.addEventListener("click", openDrawer);
if (drawerCloseBtn) drawerCloseBtn.addEventListener("click", closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);
if (newConvBtn) {
  newConvBtn.addEventListener("click", () => {
    const cur = activeConv();
    // Si la conversación activa ya está vacía, no creamos otra igual.
    if (!cur || cur.history.length > 0) createConversation();
    closeDrawer();
    inputEl.focus();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// ---- 13. Tema claro/oscuro ----
// El tema inicial ya lo fijó el script inline del <head> (anti-parpadeo).
// Aquí solo gestionamos el botón y la preferencia del sistema.
const THEME_KEY = "mentor_udd_theme";
const themeBtn = document.getElementById("themeBtn");

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeBtn) {
    themeBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"
    );
  }
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
}

applyTheme(currentTheme()); // fija el aria-label acorde al tema ya aplicado
if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

// Si el usuario NO eligió tema, sigue la preferencia del sistema en vivo.
try {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
    if (saved !== "light" && saved !== "dark") applyTheme(e.matches ? "dark" : "light");
  });
} catch (_) {}

// ---- 12. Arranque ----
(function initConversations() {
  const data = loadSessions();
  if (data && data.conversations.length) {
    conversations = data.conversations.map((c) => ({
      id: c.id || newId(),
      title: c.title || null,
      history: Array.isArray(c.history) ? c.history : [],
      updatedAt: c.updatedAt || Date.now(),
    }));
    activeId =
      data.activeId && conversations.some((c) => c.id === data.activeId)
        ? data.activeId
        : conversations[0].id;
    history = activeConv().history;
    renderConversation();
    refreshDrawer();
  } else {
    createConversation();
  }
})();
