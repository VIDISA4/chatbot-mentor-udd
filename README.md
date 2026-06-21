# Mentor Docente UDD — Fase 1.1

Esqueleto funcional del chatbot mentor. Corre **localmente en tu computador**.
La interfaz conversa con Google Gemini vía API.

---

## ✅ Qué incluye esta fase (1.1)

- Interfaz de chat completa y funcional.
- Conexión a Gemini con el prompt del "Mentor Docente UDD".
- API key en archivo separado (`config.js`), protegido con `.gitignore`.

## ⏭️ Lo que viene después

- **Fase 1.2:** proteger la key con un proxy (Cloudflare Workers) para que
  nadie la robe al desplegar.
- **Fase 1.3:** iterar interfaz, flujos por modalidad y materiales de Ale.

---

## 🚀 Cómo correrlo (3 pasos)

### 1. Consigue tu API key gratis
Entra a **https://aistudio.google.com/apikey**, inicia sesión con tu cuenta
Google y crea una API key. Es gratis y no pide tarjeta.

### 2. Pega tu key
Abre el archivo **`config.js`** y reemplaza `PEGA_TU_API_KEY_AQUI` por tu clave:

```js
GEMINI_API_KEY: "AIzaSy...tu_clave_real...",
```

### 3. Abre el proyecto con un servidor local

> ⚠️ No basta con doble-clic en `index.html`. El navegador bloquea las llamadas
> a la API si abres el archivo directamente (`file://`). Usa un servidor local.

**Opción A — Python** (ya viene en la mayoría de los equipos):
```bash
cd mentor-udd
python -m http.server 8000
```
Luego abre **http://localhost:8000** en tu navegador.

**Opción B — Node.js:**
```bash
cd mentor-udd
npx serve
```

**Opción C — VS Code:**
Instala la extensión **"Live Server"**, abre la carpeta, clic derecho en
`index.html` → "Open with Live Server".

---

## 📁 Estructura

```
mentor-udd/
├── index.html          Interfaz
├── styles.css          Estilos
├── mentor.js           Lógica + conexión a Gemini + prompt del mentor
├── config.js           TU API KEY local (no se sube a GitHub)
├── config.example.js   Plantilla de configuración (sí se sube)
├── worker/             Proxy de Cloudflare (Fase 1.2) — protege la key en producción
│   ├── worker.js         Código del Worker
│   ├── wrangler.toml     Config de despliegue (opcional, CLI)
│   └── README.md         Guía paso a paso para desplegarlo
├── .gitignore          Protege config.js
└── README.md
```

---

## 🔒 Sobre la seguridad de la key (importante)

**Desarrollo (modo directo):** la key vive en `config.js`, solo en tu equipo.
Sirve para iterar. **No despliegues esto público así**: cualquiera vería la key.

**Producción (modo proxy, Fase 1.2):** la key se mueve a un **Cloudflare Worker**
(carpeta `worker/`) y nunca llega al navegador. Despliega el Worker siguiendo
`worker/README.md`, pega su URL en la constante `WORKER_URL` de `mentor.js`, y el
sitio pasará a hablar con el Worker en vez de con Google directo. Mientras
`WORKER_URL` esté vacía, sigue funcionando el modo directo con `config.js`.

## ✏️ Para ajustar el comportamiento del mentor

El "carácter" del mentor está en la constante `SYSTEM_PROMPT`, al inicio de
`mentor.js`. Ahí puedes refinar el tono y las reglas conforme Ale entregue
sus materiales.
