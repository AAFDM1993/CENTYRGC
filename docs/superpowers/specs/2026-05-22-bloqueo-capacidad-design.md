# Diseño: Bloqueo de capacidad (reducción de puestos)

**Fecha:** 2026-05-22  
**Estado:** Aprobado

## Contexto

Cada espacio tiene una `capacidad` (ej. 2 = 2 pacientes simultáneos). Hasta ahora solo se podía bloquear el espacio completo. El usuario necesita reducir la capacidad disponible para un rango de horas/fechas sin bloquear totalmente el espacio.

## Almacenamiento

Se codifica como prefijo en el campo `motivo` del bloqueo: `[cap:N]` donde N es la cantidad de puestos bloqueados.

- `motivo = "[cap:1]"` → bloquea 1 puesto del espacio
- `motivo = "[cap:2]"` → bloquea 2 puestos

Los bloqueos sin prefijo `[cap:]` siguen funcionando como bloqueos totales (via `esBloqueado`). **Cero cambios en GAS.**

## Cambios en `index.html`

### 1. Nueva función `capacidadBloqueada(fecha, hora, area, camilla)`

Suma los N de todos los bloqueos `[cap:N]` que aplican al slot (misma lógica de matching de fecha/hora que `esBloqueado`). Insertar cerca de `esBloqueado`:

```js
function capacidadBloqueada(fecha,hora,area,camilla){
  return agendaBloqueos.reduce(function(sum,b){
    if(!b.motivo||!b.motivo.startsWith('[cap:'))return sum;
    var m=b.motivo.match(/^\[cap:(\d+)\]/);
    if(!m)return sum;
    var n=parseInt(m[1]);
    var fOk=b.fecha==='*'||(b.fecha.includes('/')
      ?(function(){var p=b.fecha.split('/');return p[0]&&p[1]&&fecha>=p[0]&&fecha<=p[1];})()
      :b.fecha===fecha);
    var hOk=b.hora==='*'||(b.hora.includes('-')
      ?(function(){var p=b.hora.split('-');return p[0]&&p[1]&&hora>=p[0]&&hora<p[1];})()
      :b.hora===hora);
    var aOk=b.area==='*'||b.area===area;
    var cOk=b.camilla==='*'||b.camilla===camilla;
    return (fOk&&hOk&&aOk&&cOk)?sum+n:sum;
  },0);
}
```

### 2. Calendar renders — líneas 3757 y 4203

Actualizar ambas ocurrencias de:
```js
const lleno=rsvEsp.length>=cap;
```
A:
```js
const capBloq=typeof capacidadBloqueada==='function'?capacidadBloqueada(fechaStr,hora,area.nombre,esp.nombre):0;
const lleno=rsvEsp.length>=(cap-capBloq);
```

Si `cap - capBloq <= 0` → `rsvEsp.length >= negativo o cero` → siempre `lleno=true` → espacio efectivamente bloqueado.

### 3. Mini-form en `renderAreasConfig()` — campo "Puestos a bloquear"

Dentro del mini-form inline (el bloque `${abierto?...:''}` del template de espacio), agregar un campo **solo cuando `esp.capacidad > 1`**, antes del botón "Crear bloqueo":

```html
${esp.capacidad>1?`<div class="field" style="margin:0 0 8px 0"><label>Puestos a bloquear (de ${esp.capacidad})</label><input type="number" class="inp" id="bef-cap-${i}-${ei}" min="1" max="${esp.capacidad}" value="1" style="width:80px;text-align:center"></div>`:''}
```

### 4. `crearBloqueoEspacio(areaIdx, espIdx)` — leer campo y construir motivo

Leer `bef-cap-k` y siempre construir motivo con prefijo `[cap:N]`:

```js
var cap=agendaCfg.areas[areaIdx].espacios[espIdx].capacidad||1;
var capBloq=cap>1?(parseInt(vi('bef-cap-'+k))||1):1;
if(capBloq<1||capBloq>cap) capBloq=1;
var motivo='[cap:'+capBloq+']';
```

La variable `motivo` reemplaza la cadena `'Bloqueo por espacio'` actual en el `apiPost`.

## Comportamiento visual en el calendario

Cuando `cap - capBloq <= reservas actuales`:
- El botón "+" para nueva reserva **desaparece** (slot no acepta más pacientes)
- Las reservas existentes siguen mostrándose normalmente
- No aparece el indicador rojo "🔒 Bloqueado" — ese solo aparece con bloqueos totales (`esBloqueado=true`)

Esto es correcto: el espacio no está cerrado, solo lleno por reducción de capacidad.

## Retrocompatibilidad

- Bloqueos existentes sin prefijo `[cap:]` siguen siendo detectados por `esBloqueado` → sin cambio
- `capacidadBloqueada` retorna 0 para cualquier bloqueo sin el prefijo → sin efecto en la lógica existente

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `index.html` | Nueva función, 2 líneas de calendar, mini-form campo, `crearBloqueoEspacio` motivo |
| `gasindex.txt` | Ninguno |
