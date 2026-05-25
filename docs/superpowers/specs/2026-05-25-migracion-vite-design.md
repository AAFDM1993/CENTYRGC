# Spec: Migración a Vite — Sistema Único de Gestión Clínica Académica

## Contexto

El proyecto actual tiene dos aplicaciones monolíticas:
- `hc.html` — 8,499 líneas, sistema de Historias Clínicas
- `index.html` — 5,607 líneas, sistema de Notas y gestión académica

El backend es Google Apps Script (GAS), accedido via `fetch()` desde el frontend.
El frontend se sirve desde GitHub Pages (HTML/CSS/JS estático puro).

**Problemas actuales:** difícil encontrar código, miedo a romper algo al modificar, todo acoplado en un solo archivo por app.

**Meta:** migrar a un proyecto Vite modular, gradualmente, sin interrumpir el funcionamiento actual. A futuro, unificar ambas apps en un sistema único de gestión clínica académica.

---

## Arquitectura

Un solo proyecto Vite con dos entry points. Carpeta `shared/` como puente entre ambas apps.

```
migrar/                          ← carpeta del nuevo proyecto (local por ahora)
├── src/
│   ├── shared/                  ← código compartido entre las dos apps
│   │   ├── api.js               ← fetch a GAS (HC_URL, GAS_URL, lógica de llamadas)
│   │   ├── utils.js             ← _esc(), formatFecha(), helpers genéricos
│   │   └── session.js           ← token, roles, manejo de sesión
│   │
│   ├── notas/                   ← app de notas (index.html actual)
│   │   ├── main.js
│   │   ├── alumnos.js
│   │   ├── cursos.js
│   │   ├── agenda.js
│   │   ├── bloqueos.js
│   │   └── notas.js
│   │
│   └── hc/                      ← app de HC (hc.html actual) — migración activa
│       ├── main.js              ← auth + router de roles (admin/docente/alumno)
│       ├── formularios.js       ← llenado de formularios clínicos
│       ├── sello.js             ← datos de docentes
│       └── widget-postural.js   ← widget postural (dentro de eval. postural)
│
├── index.html                   ← shell HTML de notas
├── hc.html                      ← shell HTML de HC
├── vite.config.js
└── package.json
```

---

## Estrategia de Migración (4 fases graduales)

### Fase 1 — Base (única vez, ~1-2 horas)
- Crear el proyecto Vite en `migrar/`
- Configurar dos entry points (`index.html` y `hc.html`) en `vite.config.js`
- Copiar `index.html` y `hc.html` actuales tal cual como punto de partida
- Verificar que `npm run dev` sirve ambas apps sin cambios funcionales
- **Resultado:** entorno Vite funcionando, zero cambios de comportamiento

### Fase 2 — Migrar HC módulo por módulo
Orden de menor a mayor riesgo:

1. `shared/utils.js` — extraer `_esc()`, helpers de fecha y texto
2. `shared/api.js` — extraer lógica de llamadas a GAS (fetch, manejo de errores)
3. `shared/session.js` — extraer manejo de token y roles
4. `hc/sello.js` — datos de docentes (módulo más aislado)
5. `hc/widget-postural.js` — widget postural (bien delimitado, sin dependencias externas)
6. `hc/formularios.js` — el más grande, al final

**Regla por módulo:** extraer → probar → commit. Si algo rompe, solo afecta ese módulo.

### Fase 3 — Limpieza de código
Al migrar cada módulo se identifica y elimina código muerto.
En archivos de ~200-400 líneas el código sin uso es obvio; en 8,500 líneas juntas no lo es.
Las mejoras de diseño (UI) se hacen en este paso, módulo por módulo.

### Fase 4 — Integración futura (notas en HC)
Cuando HC necesite escribir notas en el sistema de notas:
- `hc/notas-hc.js` importa de `shared/api.js` la misma función que ya usa notas
- No hay duplicación de lógica de comunicación con GAS
- El sistema de notas refleja automáticamente lo ingresado desde HC

---

## Lo que NO cambia

- El backend GAS no se modifica.
- Las URLs de GAS en el frontend siguen siendo las mismas.
- Los usuarios no notan ningún cambio durante la migración.
- GitHub Pages se configura cuando el usuario decida publicar (no es parte de esta fase).

---

## Decisiones de diseño

| Decisión | Elección | Alternativa descartada |
|----------|----------|----------------------|
| Tooling | Vite | Sin build step (ES modules nativos) |
| Estructura | Un proyecto, dos entry points | Dos proyectos independientes |
| Prioridad | HC primero | Ambas apps simultáneamente |
| Timing | Gradual, sin urgencia | Migración completa de una vez |
| Publicación | Local por ahora | GitHub Actions inmediato |

---

## Criterios de éxito

- `npm run dev` sirve ambas apps en desarrollo con hot-reload
- `npm run build` genera un `dist/` con `index.html` y `hc.html` listos para GitHub Pages
- Cada módulo extraído tiene una sola responsabilidad clara
- El código de `hc.html` se reduce progresivamente hasta que el archivo shell solo tiene HTML estructural
