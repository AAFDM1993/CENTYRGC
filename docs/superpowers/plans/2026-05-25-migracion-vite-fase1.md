# Migración a Vite — Fase 1: Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el proyecto Vite en `migrar/` con ambas apps (index y HC) funcionando idéntico al estado actual, sin tocar una sola línea de lógica.

**Architecture:** Proyecto Vite multi-página (MPA) con dos entry points: `index.html` y `hc.html`. Los archivos HTML se copian tal cual — inline CSS y JS permanecen intactos. Vite sirve ambas apps en dev con hot-reload y genera un `dist/` limpio con `npm run build`.

**Tech Stack:** Node.js 20, Vite 5, npm

---

### Task 1: Inicializar proyecto npm e instalar Vite

**Files:**
- Create: `migrar/package.json`
- Create: `migrar/node_modules/` (generado por npm)

- [ ] **Step 1: Crear package.json con scripts de Vite**

Crear el archivo `migrar/package.json` con este contenido exacto:

```json
{
  "name": "centyrgc",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm install
```

Salida esperada: `added 10 packages` (o similar), sin errores. Se crea `node_modules/` y `package-lock.json`.

- [ ] **Step 3: Verificar que Vite está instalado**

```powershell
npx vite --version
```

Salida esperada: `vite/5.x.x` (cualquier versión 5.x).

---

### Task 2: Crear configuración Vite multi-página

**Files:**
- Create: `migrar/vite.config.js`

- [ ] **Step 1: Crear vite.config.js**

Crear `migrar/vite.config.js` con este contenido:

```js
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        hc: resolve(__dirname, 'hc.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: '/index.html',
  },
})
```

- [ ] **Step 2: Commit base del proyecto**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/package.json migrar/package-lock.json migrar/vite.config.js
git commit -m "feat: inicializar proyecto Vite en migrar/"
```

---

### Task 3: Copiar archivos de las apps al proyecto Vite

**Files:**
- Create: `migrar/index.html` (copia de `index.html`)
- Create: `migrar/hc.html` (copia de `hc.html`)
- Create: `migrar/logo.png` (copia de `logo.png`)

- [ ] **Step 1: Copiar los archivos al proyecto Vite**

```powershell
Copy-Item "D:\projectoshtmls\CENTYRGC\CENTYRGC\index.html" "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\index.html"
Copy-Item "D:\projectoshtmls\CENTYRGC\CENTYRGC\hc.html" "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\hc.html"
Copy-Item "D:\projectoshtmls\CENTYRGC\CENTYRGC\logo.png" "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\logo.png"
```

- [ ] **Step 2: Verificar que los archivos existen**

```powershell
Get-ChildItem "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\" | Select-Object Name, Length
```

Salida esperada: lista con `hc.html`, `index.html`, `logo.png`, `node_modules`, `package.json`, `package-lock.json`, `vite.config.js`.

- [ ] **Step 3: Crear .gitignore para excluir node_modules y dist**

Crear `migrar/.gitignore`:

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 4: Commit**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/index.html migrar/hc.html migrar/logo.png migrar/.gitignore
git commit -m "feat: copiar apps al proyecto Vite (sin cambios de lógica)"
```

---

### Task 4: Verificar servidor de desarrollo

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Arrancar el servidor de desarrollo**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run dev
```

Salida esperada:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

- [ ] **Step 2: Verificar app de Notas en el navegador**

Abrir `http://localhost:5173/index.html` en el navegador.

Verificar:
- Aparece la pantalla de login de la app de Notas
- El logo se carga correctamente
- No hay errores en la consola del navegador (F12 → Console)

- [ ] **Step 3: Verificar app de HC en el navegador**

Abrir `http://localhost:5173/hc.html` en el navegador.

Verificar:
- Aparece la pantalla de login de HC
- No hay errores en la consola del navegador (F12 → Console)

- [ ] **Step 4: Detener el servidor**

Presionar `Ctrl+C` en la terminal.

---

### Task 5: Verificar build de producción

**Files:**
- Create: `migrar/dist/` (generado por Vite build)

- [ ] **Step 1: Ejecutar build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run build
```

Salida esperada: termina sin errores. Puede mostrar warnings sobre tamaño de chunks (los archivos HTML son grandes) — eso es esperado y no es un error.

- [ ] **Step 2: Verificar estructura del dist/**

```powershell
Get-ChildItem "D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar\dist\" | Select-Object Name
```

Salida esperada: archivos `index.html`, `hc.html` y carpeta `assets/` (con CSS/JS procesados si los hubiera).

- [ ] **Step 3: Previsualizar el build**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC\migrar
npm run preview
```

Abrir `http://localhost:4173/index.html` y `http://localhost:4173/hc.html`.

Verificar que ambas apps cargan igual que en dev.

Detener con `Ctrl+C`.

- [ ] **Step 4: Commit final de Fase 1**

```powershell
cd D:\projectoshtmls\CENTYRGC\CENTYRGC
git add migrar/
git commit -m "feat: Fase 1 completa — Vite MPA con index y HC funcionando"
```

---

## Criterios de éxito de Fase 1

- [ ] `npm run dev` sirve ambas apps en `localhost:5173`
- [ ] Ambas apps cargan sin errores en consola del navegador
- [ ] `npm run build` termina sin errores
- [ ] `npm run preview` sirve el build de producción correctamente
- [ ] `logo.png` se carga correctamente en ambas apps

## Siguiente fase

Una vez completada esta fase, la Fase 2 consiste en extraer módulos de `hc.html` uno por uno hacia `src/hc/`. El plan de Fase 2 se escribirá por separado cuando sea el momento.
