# Spec: Aviso informativo en última hora de turno (Agenda)

## Contexto

La agenda del sistema tiene dos franjas horarias configurables (T1 mañana, T2 tarde). Cada franja genera slots de duración configurable (por defecto 60 min). Al hacer clic en un slot libre, se abre el modal de reserva via `abrirReservaEspacio`.

Se requiere mostrar un popup de aviso personalizado cuando el usuario intenta agendar un paciente en el **último slot** de cualquier franja horaria.

---

## Requisitos

- El aviso es **informativo**: el usuario puede continuar y reservar normalmente después de cerrarlo.
- El mensaje es **único y compartido** para el último slot de T1 y T2.
- El mensaje es **configurable** por el administrador desde el panel "Configuración de Agenda".
- Si el campo de mensaje está vacío, la feature está **desactivada** (no aparece ningún popup).
- El popup aparece **antes** del modal de reserva: usuario ve popup → hace clic "Entendido" → recién se abre el modal de reserva.
- Aplica tanto a la vista de admin/docente (`abrirReservaEspacio`) como a la vista de estudiante (`abrirReservaEstEsp`).

---

## Sección 1: Almacenamiento de configuración

Agregar campo `mensajeUltimaHora` (string) a `agendaCfg`:

```js
let agendaCfg = {
  areas: [],
  franjas: [{ inicio: '08:00', fin: '13:00' }, { inicio: '14:00', fin: '19:00' }],
  mensajeUltimaHora: ''  // vacío = desactivado
};
```

Este campo se persiste en el servidor junto con el resto de la configuración de agenda (acción `guardarAgendaConfig` / `leerAgendaConfig`).

---

## Sección 2: UI de configuración

En el modal `#configAgendaModal`, tab "Áreas y Franjas" (`cfgTabAreas`), debajo del bloque de franjas horarias, agregar:

```html
<div class="slbl">Aviso última hora de turno</div>
<textarea class="inp" id="cfgMensajeUltimaHora" rows="2"
  placeholder="Ej: Último horario del turno — confirmar disponibilidad del docente"
  style="resize:vertical;min-height:56px"></textarea>
<div style="font-size:11px;color:var(--tx4);margin-top:4px">
  Aparece al reservar en el último slot de T1 o T2. Dejar vacío para desactivar.
</div>
```

**Lectura** en `abrirConfigAgenda()`: asignar `g('cfgMensajeUltimaHora').value = agendaCfg.mensajeUltimaHora || ''`

**Escritura** en `guardarAgendaConfig()`: leer `vi('cfgMensajeUltimaHora').trim()` y asignarlo a `agendaCfg.mensajeUltimaHora`.

---

## Sección 3: Detección del último slot

Nueva función helper pura (sin efectos secundarios):

```js
function esUltimaHoraFranja(hora, franjas, durMin) {
  const dur = durMin > 0 ? durMin : 60;
  return (franjas || []).some(fr => {
    const end = timeToMin(fr.fin);
    const lastStart = end - dur;
    return lastStart >= timeToMin(fr.inicio) && timeToMin(hora) === lastStart;
  });
}
```

Ejemplo con T1 (08:00–13:00, 60 min): `lastStart = 720 - 60 = 660` → `11:00`. Ejemplo con T2 (14:00–19:00): `lastStart = 1140 - 60 = 1080` → `18:00`.

La función se usa pasando `agendaCfg.franjas` y la duración del área correspondiente.

---

## Sección 4: Nuevo overlay `#infoOverlay`

### HTML

Agregar junto a `#confirmOverlay` en el HTML:

```html
<div id="infoOverlay" style="display:none;position:fixed;inset:0;background:rgba(10,22,40,.6);
  z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(3px)">
  <div style="background:var(--surf);border-radius:18px;padding:28px 24px;max-width:360px;
    width:90%;border:1px solid var(--bd2);box-shadow:0 8px 40px rgba(0,0,0,.3)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-size:22px">⚠️</span>
      <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;
        color:var(--amber)">Aviso</span>
    </div>
    <p id="infoMsg" style="font-size:14px;color:var(--tx);line-height:1.6;
      margin-bottom:20px;white-space:pre-line"></p>
    <div style="display:flex;justify-content:flex-end">
      <button id="infoOk" style="background:var(--amber);border:none;border-radius:12px;
        padding:9px 24px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;
        font-family:'Plus Jakarta Sans',sans-serif">Entendido</button>
    </div>
  </div>
</div>
```

### JS

```js
function infoDialog(msg) {
  return new Promise(function(resolve) {
    var ov = g('infoOverlay');
    g('infoMsg').textContent = msg;
    ov.style.display = 'flex';
    function onOk() {
      ov.style.display = 'none';
      g('infoOk').removeEventListener('click', onOk);
      resolve();
    }
    g('infoOk').addEventListener('click', onOk);
  });
}
```

---

## Sección 5: Intercepción en el flujo de reserva

### `abrirReservaEspacio` (admin/docente)

Convertir a `async` e insertar la verificación al inicio:

```js
async function abrirReservaEspacio(fecha, hora, area, espacio, capacidad, fechaLabel) {
  const msg = agendaCfg.mensajeUltimaHora || '';
  if (msg) {
    const areaObj = agendaCfg.areas.find(a => a.nombre === area);
    const dur = areaObj ? (areaObj.duracion || 60) : 60;
    if (esUltimaHoraFranja(hora, agendaCfg.franjas, dur)) {
      await infoDialog(msg);
    }
  }
  // ... resto del código existente (abrir modal)
}
```

### `abrirReservaEstEsp` (estudiante)

Mismo patrón aplicado a la función equivalente de la vista de estudiante.

---

## Archivos afectados

| Archivo | Cambios |
|---|---|
| `index.html` | Nuevo HTML `#infoOverlay`; nueva función `infoDialog`; nueva función `esUltimaHoraFranja`; modificar `abrirReservaEspacio`, `abrirReservaEstEsp`, `abrirConfigAgenda`, `guardarAgendaConfig`; agregar campo textarea en config modal |

---

## Casos borde

- **Mensaje vacío**: no se llama `infoDialog`, flujo normal sin cambios.
- **Duración de área mayor que la franja**: `generarSlots` ya maneja esto (no genera slots si no caben); `esUltimaHoraFranja` devolverá `false` consistentemente.
- **Franja de un solo slot**: ese slot es también el primero y el último → el aviso aparece. Comportamiento esperado.
- **Slot pasado (ya ocurrió)**: el botón "+" ya no se renderiza para slots pasados, por lo que `abrirReservaEspacio` nunca se llama. No requiere manejo adicional.
