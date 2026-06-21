// ============================================================
//  MENTOR DOCENTE UDD — Inicio de sesión (Fase 1.3a)
// ============================================================
//  Muestra la pantalla de login y, tras validar contra el Worker,
//  guarda un token firmado en localStorage y revela el chat.
//  Expone window.MENTOR_AUTH para que mentor.js adjunte el token.
//  En modo directo (sin Worker) omite el login (desarrollo local).
// ============================================================

(function () {
  const TOKEN_KEY = "mentor_udd_auth";
  const base = window.MENTOR_WORKER_BASE || ""; // lo expone mentor.js

  const loginEl = document.getElementById("login");
  const appEl = document.getElementById("app");
  const formEl = document.getElementById("loginForm");
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPass");
  const errEl = document.getElementById("loginError");
  const btnEl = document.getElementById("loginBtn");
  const userChip = document.getElementById("userChip");
  const logoutBtn = document.getElementById("logoutBtn");

  function readAuth() {
    try {
      const a = JSON.parse(localStorage.getItem(TOKEN_KEY));
      if (!a || !a.token || !a.exp || Date.now() > a.exp) return null;
      return a;
    } catch (_) {
      return null;
    }
  }
  function saveAuth(a) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(a));
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function showApp(username) {
    if (loginEl) loginEl.hidden = true;
    if (appEl) appEl.hidden = false;
    if (username) {
      if (userChip) {
        userChip.textContent = username;
        userChip.hidden = false;
      }
      if (logoutBtn) logoutBtn.hidden = false;
    }
  }
  function showLogin() {
    if (appEl) appEl.hidden = true;
    if (userChip) userChip.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (loginEl) loginEl.hidden = false;
    if (userEl) userEl.focus();
  }

  // API pública para mentor.js
  window.MENTOR_AUTH = {
    getToken() {
      const a = readAuth();
      return a ? a.token : null;
    },
    getUsername() {
      const a = readAuth();
      return a ? a.username : null;
    },
    logout() {
      clearAuth();
      showLogin();
    },
  };

  // Modo directo (sin Worker): no hay backend que valide → sin login.
  if (!base) {
    showApp();
    return;
  }

  // ¿Sesión vigente?
  const existing = readAuth();
  if (existing) {
    showApp(existing.username);
  } else {
    showLogin();
  }

  if (formEl) {
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const username = userEl.value.trim();
      const password = passEl.value;
      if (!username || !password) {
        errEl.textContent = "Ingresa tu usuario y contraseña.";
        return;
      }

      btnEl.disabled = true;
      const original = btnEl.textContent;
      btnEl.textContent = "Entrando…";
      try {
        const res = await fetch(base + "/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
          let msg = "Usuario o contraseña incorrectos.";
          try {
            const j = await res.json();
            if (j && j.error) msg = j.error;
          } catch (_) {}
          errEl.textContent = msg;
          return;
        }
        const data = await res.json();
        saveAuth({ token: data.token, username: data.username, exp: data.exp });
        passEl.value = "";
        showApp(data.username);
      } catch (_) {
        errEl.textContent = "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
      } finally {
        btnEl.disabled = false;
        btnEl.textContent = original;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => window.MENTOR_AUTH.logout());
  }
})();
