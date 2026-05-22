# Widget Postural — Rediseño de Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los caracteres Unicode ambiguos de los chips del widget postural por SVG (curvas de columna) y texto corto (FLX/EXT/AA/AO), organizar la paleta por vista activa, y filtrar la leyenda a solo los chips usados.

**Architecture:** Todo el cambio ocurre en un único archivo (`hc.html`). El array `ALTS` vive en una IIFE comprimida al final del archivo (línea ~9034). Las funciones de renderizado se distribuyen en 5 ubicaciones: `renderDrops` (interactivo), `_rendVista` + `buildDetalle` (render/PDF), y dos bloques de leyenda. La paleta pasa de una cuadrícula estática de 28 chips a un componente reactivo que filtra por vista activa usando `mouseenter`/`touchstart`.

**Tech Stack:** JavaScript vanilla (ES5 compatible), SVG inline, HTML string concatenation para render/PDF, DOM para el widget interactivo.

---

## Archivos

| Acción | Archivo | Sección |
|---|---|---|
| Modificar | `hc.html` | ALTS array (~línea 9034, IIFE comprimida) |
| Modificar | `hc.html` | `renderDrops` (~líneas 9213–9215) |
| Modificar | `hc.html` | `wpostMount` palette HTML (~líneas 9082–9085) |
| Modificar | `hc.html` | `wpostMount` palette JS (~líneas 9110–9204) |
| Modificar | `hc.html` | `_rendVista` chip render (~líneas 1248–1254) |
| Modificar | `hc.html` | `buildDetalle` chip render x2 (~líneas 1651–1658, 1671–1678) |
| Modificar | `hc.html` | Leyenda `renderHC` (~líneas 1264–1271) |
| Modificar | `hc.html` | Leyenda `buildDetalle` (~líneas 1688–1694) |

---

## Task 1: Actualizar ALTS — chars y nuevas entradas

**Files:**
- Modify: `hc.html` (ALTS array en IIFE, línea 9034)

**Contexto:** El array ALTS está comprimido en una sola línea larga. Usar Python para los reemplazos es más seguro que el Edit tool dado el encoding mixto (algunos chars son `\uXXXX` y otros son UTF-8 directo en el archivo).

- [ ] **Step 1: Verificar encoding exacto de los entries a cambiar**

```powershell
python3 -c "
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open('hc.html', encoding='utf-8') as f:
    content = f.read()
line = content.split('\n')[9033]
m = re.search(r'var ALTS=(\[.*?\]);', line)
if m:
    raw = m.group(1)
    for token in ['flex', 'ext', 'ang_ag', 'ang_ob', 'hipercif', 'hiperlord']:
        idx = raw.find('\"id\":\"' + token + '\"')
        if idx >= 0:
            print(token + ':', raw[idx:idx+80])
"
```

Esto muestra el texto literal de cada entry tal como está en el archivo. Anotar si usan `\uXXXX` o carácter real.

- [ ] **Step 2: Reemplazar los 6 entries existentes en ALTS**

```python
# Ejecutar desde el directorio del proyecto: python3 fix_alts.py
import re

SVG_CIF_D  = "<svg viewBox='0 0 44 44' width='100%' height='100%'><path d='M28 10 Q12 14 10 22 Q12 30 28 34' fill='none' stroke='currentColor' stroke-width='3.5' stroke-linecap='round'/></svg>"
SVG_LORD_D = "<svg viewBox='0 0 44 44' width='100%' height='100%'><path d='M16 10 Q32 14 34 22 Q32 30 16 34' fill='none' stroke='currentColor' stroke-width='3.5' stroke-linecap='round'/></svg>"

with open('hc.html', encoding='utf-8') as f:
    content = f.read()

# Reemplazos usando el id como ancla — cada tupla es (patron_re, nuevo_char)
replacements = [
    # hipercif: char actual puede ser ⌢ o ⌒ — el patron captura cualquiera
    (r'(\{"id":"hipercif","lbl":"Hipercifosis","color":"#6366f1","char":")[^"]+(")',
     r'\g<1>' + SVG_CIF_D + r'\g<2>'),
    # hiperlord
    (r'(\{"id":"hiperlord","lbl":"Hiperlordosis","color":"#f59e0b","char":")[^"]+(")',
     r'\g<1>' + SVG_LORD_D + r'\g<2>'),
    # flex
    (r'(\{"id":"flex","lbl":"Flexion","color":"#9333ea","char":")[^"]+(")',
     r'\g<1>FLX\g<2>'),
    # ext
    (r'(\{"id":"ext","lbl":"Extension","color":"#7e22ce","char":")[^"]+(")',
     r'\g<1>EXT\g<2>'),
    # ang_ag  (char es "<" — escapado en JSON como "<")
    (r'(\{"id":"ang_ag",\s*"lbl":"Ang\. agudo",\s*"color":"#7f1d1d","char":")[^"]+(")',
     r'\g<1>AA\g<2>'),
    # ang_ob
    (r'(\{"id":"ang_ob",\s*"lbl":"Ang\. obtuso",\s*"color":"#1e3a5f","char":")[^"]+(")',
     r'\g<1>AO\g<2>'),
]

for pattern, repl in replacements:
    new_content = re.sub(pattern, repl, content)
    if new_content == content:
        print('WARNING: no match for pattern:', pattern[:60])
    else:
        print('OK:', pattern[:50])
    content = new_content

with open('hc.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
```

Guardar como `fix_alts.py` en el directorio del proyecto y ejecutar:
```
python3 fix_alts.py
```

- [ ] **Step 3: Agregar hipercif2 e hiperlord2 al array ALTS**

```python
# Añadir al final del script fix_alts.py (o ejecutar por separado):
import re

SVG_CIF_I  = "<svg viewBox='0 0 44 44' width='100%' height='100%'><path d='M16 10 Q32 14 34 22 Q32 30 16 34' fill='none' stroke='currentColor' stroke-width='3.5' stroke-linecap='round'/></svg>"
SVG_LORD_I = "<svg viewBox='0 0 44 44' width='100%' height='100%'><path d='M28 10 Q12 14 10 22 Q12 30 28 34' fill='none' stroke='currentColor' stroke-width='3.5' stroke-linecap='round'/></svg>"

NEW_ENTRIES = (
    ',{"id":"hipercif2","lbl":"Hipercif.(i)","color":"#6366f1","char":"' + SVG_CIF_I + '"}'
    + ',{"id":"hiperlord2","lbl":"Hiperlord.(i)","color":"#f59e0b","char":"' + SVG_LORD_I + '"}'
)

with open('hc.html', encoding='utf-8') as f:
    content = f.read()

# Insertar antes del cierre del array: antes de "antev_pelv"
# (antev_pelv y retrov_pelv van al final, las nuevas entradas van antes)
old = '{"id":"antev_pelv"'
new = NEW_ENTRIES[1:] + ',{"id":"antev_pelv"'   # [1:] quita la coma inicial
if old not in content:
    print('ERROR: ancla antev_pelv no encontrada')
else:
    content = content.replace(old, new, 1)
    with open('hc.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('hipercif2 e hiperlord2 agregados.')
```

- [ ] **Step 4: Verificar el array resultante**

```python
python3 -c "
import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')
with open('hc.html', encoding='utf-8') as f:
    line = f.read().split('\n')[9033]
m = re.search(r'var ALTS=(\[.*?\]);', line)
alts = json.loads(m.group(1))
print(f'Total chips: {len(alts)}')
for a in alts:
    char_preview = a['char'][:40].replace('\n','') if len(a['char']) > 40 else a['char']
    print(f'  {a[\"id\"]}: {char_preview}')
"
```

Expected output: 30 chips en total (28 originales + hipercif2 + hiperlord2), con hipercif/hiperlord mostrando `<svg...`, flex=`FLX`, ext=`EXT`, ang_ag=`AA`, ang_ob=`AO`.

- [ ] **Step 5: Commit**

```bash
git add hc.html
git commit -m "feat: actualizar ALTS con SVG columna y textos FLX/EXT/AA/AO"
```

---

## Task 2: Actualizar renderDrops para chips SVG

**Files:**
- Modify: `hc.html` (~líneas 9213–9215)

**Contexto:** `renderDrops` crea los chips interactivos colocados sobre la imagen en el formulario. Usa `ch.textContent=a.char` que no funciona para SVG. También necesita ajustar dimensiones (no padding para chips SVG).

- [ ] **Step 1: Leer las líneas actuales**

Leer `hc.html` offset=9210, limit=10 para confirmar el código exacto antes de editar.

- [ ] **Step 2: Reemplazar el estilo y asignación de contenido**

Reemplazar:
```javascript
      ch.style.cssText='position:absolute;display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 4px;border-radius:14px;font-size:16px;color:#fff;box-shadow:0 2px 7px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;transform:translate(-50%,-50%);line-height:1;z-index:10;border:2px solid rgba(255,255,255,.5);background:'+a.color;
      ch.style.left=d.xp+'%'; ch.style.top=d.yp+'%';
      ch.title=a.lbl+' - clic para eliminar'; ch.textContent=a.char;
```

Con:
```javascript
      var _svg=a.char.indexOf('<svg')===0;
      ch.style.cssText='position:absolute;display:flex;align-items:center;justify-content:center;'+(_svg?'width:28px;height:28px;':'min-width:28px;height:28px;padding:0 4px;')+'border-radius:14px;font-size:16px;color:#fff;box-shadow:0 2px 7px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;transform:translate(-50%,-50%);line-height:1;z-index:10;border:2px solid rgba(255,255,255,.5);background:'+a.color;
      ch.style.left=d.xp+'%'; ch.style.top=d.yp+'%';
      ch.title=a.lbl+' - clic para eliminar'; if(_svg){ch.innerHTML=a.char;}else{ch.textContent=a.char;}
```

- [ ] **Step 3: Verificar visualmente en el navegador**

Abrir `hc.html`, ir a un paciente postural, colocar un chip de hipercifosis. Debe aparecer como la curva SVG sobre la imagen, no como el carácter ⌢.

- [ ] **Step 4: Commit**

```bash
git add hc.html
git commit -m "feat: renderDrops soporta chips SVG"
```

---

## Task 3: Paleta filtrada por vista activa

**Files:**
- Modify: `hc.html` (~líneas 9082–9085 y 9110–9204)

**Contexto:** Hay dos partes: (a) el HTML de la paleta en `wpostMount` y (b) la lógica JS que llena el grid. Se reemplaza el grid estático por `renderPaleta(vista)` que filtra chips según la vista activa. Se añaden listeners `mouseenter`/`touchstart` en cada contenedor de imagen para cambiar el foco.

- [ ] **Step 1: Actualizar el HTML de la paleta en wpostMount**

Reemplazar (~líneas 9082–9085):
```javascript
  html+='<div style="background:var(--surf);border-radius:10px;border:1px solid var(--bd);padding:8px">';
  html+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--tx3);margin-bottom:6px">Alteraciones</div>';
  html+='<div id="wpost_ig" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px"></div>';
  html+='<div style="margin-top:6px;font-size:9px;color:var(--tx4)">Arrastra icono a imagen o clic icono + clic imagen</div>';
```

Con:
```javascript
  html+='<div style="background:var(--surf);border-radius:10px;border:1px solid var(--bd);padding:8px">';
  html+='<div id="wpost_ig_lbl" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--tx3);margin-bottom:6px">Alteraciones — Vista Anterior</div>';
  html+='<div id="wpost_ig" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:4px"></div>';
  html+='<div style="margin-top:6px;font-size:9px;color:var(--tx4)">Arrastra icono a imagen o clic icono + clic imagen</div>';
```

- [ ] **Step 2: Reemplazar el bloque ALTS.forEach con renderPaleta**

Localizar el bloque de código que comienza con `var ig=document.getElementById('wpost_ig');` (~línea 9180) y termina con el `});` del forEach (~línea 9203). Reemplazar **todo ese bloque** con:

```javascript
  var VISTA_CHIPS={
    ant:  ['elev','dep','inc_d','inc_i','inc_d2','inc_i2','rot_d','rot_i','valgo','varo','flex','ext','ang_ag','ang_ob'],
    post: ['elev','dep','inc_d','inc_i','inc_d2','inc_i2','rot_d','rot_i','valgo','varo','flex','ext','ang_ag','ang_ob'],
    latd: ['ant_z','post_z','prot','retr','recurv','gflexum','hipercif','hiperlord','antev_pelv','retrov_pelv','flex','ext','ang_ag','ang_ob'],
    lati: ['ant_z2','post_z2','prot2','retr2','recurv','gflexum','hipercif2','hiperlord2','antev_pelv','retrov_pelv','flex','ext','ang_ag','ang_ob']
  };
  var VISTA_LBLS={ant:'Vista Anterior',post:'Vista Posterior',latd:'Lateral Derecha',lati:'Lateral Izquierda'};
  renderPaleta=function(vista){
    var ig=document.getElementById('wpost_ig');
    var igLbl=document.getElementById('wpost_ig_lbl');
    if(!ig) return;
    if(igLbl) igLbl.textContent='Alteraciones — '+(VISTA_LBLS[vista]||vista);
    ig.innerHTML='';
    var ids=VISTA_CHIPS[vista]||VISTA_CHIPS.ant;
    ids.forEach(function(id){
      var a=getAlt(id); if(!a) return;
      var isSvg=a.char.indexOf('<svg')===0;
      var c=document.createElement('div');
      c.className='wpost-ic'; c.dataset.id=a.id;
      var iconEl=document.createElement('span');
      iconEl.style.cssText='font-size:22px;line-height:1;color:'+a.color+';display:flex;align-items:center;justify-content:center;width:24px;height:24px';
      if(isSvg){iconEl.innerHTML=a.char;}else{iconEl.textContent=a.char;}
      c.appendChild(iconEl);
      var lblEl=document.createElement('span');
      lblEl.style.cssText='font-size:8px;font-weight:600;color:var(--tx3);text-align:center;line-height:1.2';
      lblEl.textContent=a.lbl;
      c.appendChild(lblEl);
      c.addEventListener('mousedown',function(e){
        if(e.button!==0) return;
        e.preventDefault(); clearPend();
        dragging={alt:a};
        var g=document.getElementById('wpost_ghost');
        if(g){
          g.style.background=a.color;
          if(isSvg){g.innerHTML='<span style="width:18px;height:18px;display:flex;align-items:center">'+a.char+'</span><span style="font-size:10px">'+a.lbl+'</span>';}
          else{g.innerHTML='<span>'+a.char+'</span><span style="font-size:10px">'+a.lbl+'</span>';}
          g.style.display='flex'; posG(e.clientX,e.clientY);
        }
      });
      c.addEventListener('click',function(e){
        e.stopPropagation();
        if(pending&&pending.id===a.id){clearPend();}
        else{
          pending=a;
          document.querySelectorAll('.wpost-ic').forEach(function(x){
            if(x.dataset.id===a.id){x.classList.add('wpost-ic-pend');x.style.borderColor=a.color;x.style.background=a.color+'22';}
            else{x.classList.remove('wpost-ic-pend');x.style.borderColor='transparent';x.style.background='';}
          });
        }
      });
      ig.appendChild(c);
    });
  };
  renderPaleta('ant');
```

**Importante:** `renderPaleta` se declara sin `var` para que quede en el scope del IIFE (al igual que `renderDrops`). Verificar que `getAlt` exista en el mismo scope (es la función helper que ya existe en la IIFE comprimida ~línea 9034).

- [ ] **Step 3: Agregar listeners de foco en los contenedores**

Localizar el bloque que inicializa VBS (~línea 9112–9117):
```javascript
  ['ant','post','latd','lati'].forEach(function(k){
    var img=document.getElementById('wpost_img_'+k);
    var vb=document.getElementById('wpost_vb_'+k);
    if(img) img.src=IMGS[k];
    if(vb) VBS[k]=vb;
  });
```

Reemplazar con:
```javascript
  ['ant','post','latd','lati'].forEach(function(k){
    var img=document.getElementById('wpost_img_'+k);
    var vb=document.getElementById('wpost_vb_'+k);
    if(img) img.src=IMGS[k];
    if(vb){
      VBS[k]=vb;
      vb.addEventListener('mouseenter',function(){renderPaleta(k);});
      vb.addEventListener('touchstart',function(){renderPaleta(k);},{passive:true});
    }
  });
```

- [ ] **Step 4: Verificar en el navegador**

- Al abrir el widget, la paleta debe mostrar "Alteraciones — Vista Anterior" con 14 chips.
- Al pasar el ratón sobre la imagen "Lateral Derecha", la paleta debe cambiar a "Alteraciones — Lateral Derecha" con 14 chips (incluyendo SVG de hipercifosis/hiperlordosis).
- Al pasar sobre "Lateral Izquierda", debe mostrar los chips `*2`.
- El drag-drop y click-to-place deben seguir funcionando igual.

- [ ] **Step 5: Commit**

```bash
git add hc.html
git commit -m "feat: paleta de chips filtrada por vista activa con mouseenter"
```

---

## Task 4: Actualizar render de chips SVG en vistas (render/PDF)

**Files:**
- Modify: `hc.html` (~líneas 1248–1254, 1651–1658, 1671–1678)

**Contexto:** Tres bloques de string-concatenation construyen el HTML del chip sobre la imagen. Todos tienen la misma estructura. Cuando `alt.char` es un SVG, se incluye directamente en el innerHTML (ya que el string resultante se inyecta como innerHTML). Solo hay que ajustar el estilo de dimensiones.

- [ ] **Step 1: Actualizar _rendVista (~líneas 1248–1254)**

Reemplazar:
```javascript
          if(_wdata&&_wdata[v]&&_alts) _wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;}); if(!alt) return;
            vh+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +'min-width:22px;height:22px;padding:0 4px;border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer">'+alt.char+'</div>';
          });
```

Con:
```javascript
          if(_wdata&&_wdata[v]&&_alts) _wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;}); if(!alt) return;
            var _sv=alt.char.indexOf('<svg')===0;
            vh+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +(_sv?'width:22px;height:22px;':'min-width:22px;height:22px;padding:0 4px;')
              +'border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer">'+alt.char+'</div>';
          });
```

- [ ] **Step 2: Actualizar buildDetalle bloque ant/post (~líneas 1651–1658)**

Reemplazar:
```javascript
          if(_wdata&&_wdata[v])_wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;});
            if(!alt)return;
            h+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +'min-width:22px;height:22px;padding:0 4px;border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4)'
              +'">'+alt.char+'</div>';
          });
```

Con (mismo cambio que _rendVista, adaptado a string `h`):
```javascript
          if(_wdata&&_wdata[v])_wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;});
            if(!alt)return;
            var _sv=alt.char.indexOf('<svg')===0;
            h+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +(_sv?'width:22px;height:22px;':'min-width:22px;height:22px;padding:0 4px;')
              +'border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4)'
              +'">'+alt.char+'</div>';
          });
```

**Nota:** Hay **dos bloques idénticos** en `buildDetalle` — uno para `[['ant','Vista Anterior'],['post','Vista Posterior']]` y otro para `[['latd','Lateral Derecha'],['lati','Lateral Izquierda']]`. Aplicar el mismo cambio a ambos. El primero está ~línea 1651 y el segundo ~línea 1671. Usar contexto circundante para diferenciarlos al editar.

- [ ] **Step 3: Actualizar buildDetalle bloque latd/lati (~líneas 1671–1678)**

Mismo reemplazo que el Step 2, aplicado al segundo bloque. Usar como ancla la línea anterior `[['latd','Lateral Derecha'],['lati','Lateral Izquierda']]` para identificarlo.

- [ ] **Step 4: Verificar render**

Abrir el detalle de un paciente postural que tenga chips de hipercifosis colocados. La vista de HC y el PDF deben mostrar la curva SVG en lugar del carácter ⌢.

- [ ] **Step 5: Commit**

```bash
git add hc.html
git commit -m "feat: render chips SVG en vistas HC y PDF"
```

---

## Task 5: Filtrar leyenda a chips usados

**Files:**
- Modify: `hc.html` (~líneas 1264–1271 y 1688–1694)

**Contexto:** Dos secciones de leyenda: una en `renderHC` (~línea 1264) y otra en `buildDetalle` (~línea 1688). Ambas iteran sobre `_alts` completo. Se filtra a solo los ids presentes en `_wdata`. También se añade soporte SVG en el chip de leyenda (20×20px).

- [ ] **Step 1: Actualizar leyenda en renderHC (~líneas 1264–1271)**

Reemplazar:
```javascript
      if(_alts){
        _alts.forEach(function(alt){
          leyendaHTML+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
          leyendaHTML+='<div style="min-width:20px;height:20px;border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
          leyendaHTML+='<span style="color:#475569">'+alt.lbl+'</span>';
          leyendaHTML+='</div>';
        });
      }
```

Con:
```javascript
      if(_alts&&_wdata){
        var _used=new Set();
        ['ant','post','latd','lati'].forEach(function(v){(_wdata[v]||[]).forEach(function(c){_used.add(c.altId);});});
        _alts.filter(function(a){return _used.has(a.id);}).forEach(function(alt){
          var _sv=alt.char.indexOf('<svg')===0;
          leyendaHTML+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
          leyendaHTML+='<div style="'+(_sv?'width:20px;height:20px;':'min-width:20px;height:20px;')+'border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
          leyendaHTML+='<span style="color:#475569">'+alt.lbl+'</span>';
          leyendaHTML+='</div>';
        });
      }
```

- [ ] **Step 2: Actualizar leyenda en buildDetalle (~líneas 1688–1694)**

Reemplazar:
```javascript
        if(_alts){
          _alts.forEach(function(alt){
            h+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
            h+='<div style="min-width:20px;height:20px;border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
            h+='<span style="color:#475569">'+alt.lbl+'</span>';
            h+='</div>';
          });
        }
```

Con:
```javascript
        if(_alts&&_wdata){
          var _used2=new Set();
          ['ant','post','latd','lati'].forEach(function(v){(_wdata[v]||[]).forEach(function(c){_used2.add(c.altId);});});
          _alts.filter(function(a){return _used2.has(a.id);}).forEach(function(alt){
            var _sv=alt.char.indexOf('<svg')===0;
            h+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
            h+='<div style="'+(_sv?'width:20px;height:20px;':'min-width:20px;height:20px;')+'border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
            h+='<span style="color:#475569">'+alt.lbl+'</span>';
            h+='</div>';
          });
        }
```

**Nota:** Se usa `_used2` en buildDetalle para evitar colisión con la variable `_used` de renderHC (aunque están en scopes distintos, es más claro así).

- [ ] **Step 3: Verificar leyenda filtrada**

Abrir el detalle de un paciente postural con 3 chips colocados. La leyenda debe mostrar solo esos 3 chips. Si no hay chips, la leyenda debe quedar vacía (o no mostrarse).

- [ ] **Step 4: Cleanup — limpiar fix_alts.py**

```bash
rm fix_alts.py
```

- [ ] **Step 5: Commit final**

```bash
git add hc.html
git commit -m "feat: leyenda filtrada a chips usados + soporte SVG en leyenda"
```

---

## Self-Review

### Cobertura del spec

| Requisito | Task |
|---|---|
| hipercif/hiperlord → SVG | Task 1 |
| hipercif2/hiperlord2 nuevos | Task 1 |
| flex→FLX, ext→EXT, ang_ag→AA, ang_ob→AO | Task 1 |
| renderDrops SVG | Task 2 |
| Paleta por vista (mouseenter/touchstart) | Task 3 |
| _rendVista SVG | Task 4 |
| buildDetalle SVG (ant/post y latd/lati) | Task 4 |
| Leyenda filtrada (renderHC) | Task 5 |
| Leyenda filtrada (buildDetalle) | Task 5 |
| Leyenda SVG chips | Task 5 |

### Consistencia de tipos

- `a.char.indexOf('<svg')===0` — usado consistentemente en Tasks 2, 3, 4, 5. ✓
- `getAlt(id)` en Task 3 — función existente en el IIFE, retorna la entrada ALTS. ✓
- `renderPaleta` declarado sin `var` en Task 3 para scope de IIFE. ✓

### Casos límite

- Paciente sin chips: `_wdata[v]` es `[]` → `_used` vacío → leyenda vacía. Correcto.
- Chip con id antiguo (`hipercif`) cargado desde Drive: sigue en ALTS con SVG → se renderiza bien. ✓
- `hipercif2`/`hiperlord2` en registros nuevos: se guardan como `{altId:'hipercif2',xp,yp}` igual que los demás. ✓
