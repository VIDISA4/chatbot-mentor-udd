# assets/

Imágenes del sitio. Ya integradas:

- **`logo-udd.png`** — logo oficial UDD completo (lockup: monograma +
  "Universidad del Desarrollo" + "Facultad de Ingeniería"). Se usa en la
  **pantalla de login**.
- **`logo-mark.png`** — solo el **monograma UDD** (recortado del logo completo,
  cuadrado, fondo transparente). Se usa en la **marca del header**, el **avatar
  del mentor** en cada respuesta, y el **favicon**.

## Si cambias el logo

Reemplaza `logo-udd.png` por la nueva versión (mismo nombre) y, si quieres
regenerar el monograma del header/avatar, recorta el isotipo y guárdalo como
`logo-mark.png` (cuadrado, fondo transparente).

**Fallbacks:** si `logo-udd.png` falta, el login no muestra logo (el resto
funciona). Si `logo-mark.png` falta, el header y el avatar caen a un círculo
azul UDD automáticamente (`onerror`).
