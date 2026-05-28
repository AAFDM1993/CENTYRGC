# Widget Postural — Fotos + Cuadrícula + Chips pélvicos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las siluetas estáticas del widget postural por fotos del paciente subidas a Drive, agregar cuadrícula de referencia 2 cm × 2 cm y añadir chips de Anteversión/Retroversión pélvica.

**Architecture:** El widget es un IIFE inline en `hc.html` (línea ~9023). Las fotos se comprimen con canvas en el cliente, se suben a Google Drive via dos nuevas acciones GAS (`subirFotoWidget`, `getFotoWidget`), y sus fileIds se almacenan dentro del JSON `widgetPostural.fotos`. La caché `window._wpostFotosCache` centraliza las fotos ya descargadas para render en lectura y PDF.

**Tech Stack:** Vanilla JS, Google Apps Script, Google Drive API (via DriveApp), CSS repeating-linear-gradient para la cuadrícula.

---

## Mapa de archivos

| Archivo | Cambios |
|---|---|
| `gashc.txt` | +`subirFotoWidget_`, +`getFotoWidget_`, rutas en doPost/doGet |
| `hc.html` línea ~9023 (IIFE del widget) | +2 chips en ALTS, +`_comprimirFoto`, +lógica upload en wpostMount, +grid div, actualizar wpostGetData/wpostSetData/wpostGetIMGS |
| `hc.html` líneas ~1234 y ~1636 | render lectura/PDF: llamar precargarFotos antes de usar wpostGetIMGS |
| `hc.html` toggleEvalInline (~línea 2653) | hacer async, await precargarFotos |
| `hc.html` verEvalConFirma (~línea 3300) | await precargarFotos antes de renderizar |

---

## Task 1: Nuevos chips — Anteversión y Retroversión pélvica

**Archivos:**
- Modify: `hc.html` línea 9023 (IIFE — array ALTS)

- [ ] **Buscar el fin del array ALTS en el script inline**

  Buscar: `{"id":"hiperlord","lbl":"Hiperlordosis","color":"#f59e0b","char":"⌣"}];`

- [ ] **Agregar los dos chips al final del array ALTS**

  Reemplazar:
  ```
  {"id":"hiperlord","lbl":"Hiperlordosis","color":"#f59e0b","char":"⌣"}];
  ```
  por:
  ```
  {"id":"hiperlord","lbl":"Hiperlordosis","color":"#f59e0b","char":"⌣"},{"id":"antev_pelv","lbl":"Anteversión pelv.","color":"#0d9488","char":"AP"},{"id":"retrov_pelv","lbl":"Retroversión pelv.","color":"#e11d48","char":"RP"}];
  ```

- [ ] **Verificar manualmente**

  Abrir `hc.html` en Chrome. Ir a una evaluación postural → sección Inspección Visual → desplegar widget. Los chips **AP** (teal) y **RP** (rosa) deben aparecer en la grilla de íconos junto a los existentes. Colocar uno en la imagen estática y confirmar que se guarda correctamente.

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: add anteversion/retroversion pelvica chips to postural widget"
  ```

---

## Task 2: Backend — `subirFotoWidget_`

**Archivos:**
- Modify: `gashc.txt` — doPost router + nueva función

- [ ] **Registrar la acción en doPost**

  Buscar en `gashc.txt`:
  ```
      if (a === 'eliminarEvaluacion')      return json_(eliminarEvaluacion_(b, tok));
  ```
  Agregar después:
  ```
      if (a === 'subirFotoWidget')         return json_(subirFotoWidget_(b, tok));
  ```

- [ ] **Agregar la función `subirFotoWidget_`**

  Agregar después de `getConsentimiento_` (buscar `function eliminarConsentimiento_`):

  ```javascript
  function subirFotoWidget_(b, tok) {
    authB_(tok, ['admin','docente','estudiante']);
    var b64      = String(b.archivoBase64||'').trim();
    var vista    = String(b.vista||'').trim();
    var evalId   = String(b.evalId||'').trim();
    if (!b64)   return {ok:false, error:'archivoBase64 requerido'};
    if (!vista) return {ok:false, error:'vista requerida'};
    if (b64.length > 6000000) return {ok:false, error:'Imagen demasiado grande. Máximo ~4 MB.'};

    var mimeType = 'image/jpeg';
    var rawB64   = b64;
    var m = b64.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { mimeType = m[1]; rawB64 = m[2]; }
    var ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';

    // Borrar archivo previo si se indica
    var prevFileId = String(b.prevFileId||'').trim();
    if (prevFileId) {
      try { DriveApp.getFileById(prevFileId).setTrashed(true); } catch(ex) {}
    }

    var folder   = getConsentimientosFolder_();
    var fileName = 'wpost_' + vista + '_' + (evalId||'tmp') + '_' + Date.now() + ext;
    var bytes    = Utilities.base64Decode(rawB64);
    var blob     = Utilities.newBlob(bytes, mimeType, fileName);
    var newFile  = folder.createFile(blob);
    return {ok:true, fileId: newFile.getId()};
  }
  ```

- [ ] **Verificar sintaxis**

  Copiar el contenido de `gashc.txt` al editor de Google Apps Script. La función debe aparecer sin errores de sintaxis. No es necesario desplegar aún.

- [ ] **Commit**

  ```bash
  git add gashc.txt
  git commit -m "feat: add subirFotoWidget backend action"
  ```

---

## Task 3: Backend — `getFotoWidget_`

**Archivos:**
- Modify: `gashc.txt` — doGet router + nueva función

- [ ] **Registrar la acción en doGet**

  Buscar:
  ```
      if (a === 'getConsentimiento')  return json_(getConsentimiento_(p));
  ```
  Agregar después:
  ```
      if (a === 'getFotoWidget')      return json_(getFotoWidget_(p));
  ```

- [ ] **Agregar la función `getFotoWidget_`**

  Agregar justo después de `subirFotoWidget_`:

  ```javascript
  function getFotoWidget_(p) {
    auth_(p, ['admin','docente','estudiante']);
    var fileId = String(p.fileId||'').trim();
    if (!fileId) return {ok:false, error:'fileId requerido'};
    try {
      var file     = DriveApp.getFileById(fileId);
      var blob     = file.getBlob();
      var b64      = Utilities.base64Encode(blob.getBytes());
      var mimeType = blob.getContentType()||'image/jpeg';
      return {ok:true, data:b64, mimeType:mimeType};
    } catch(ex) {
      return {ok:false, error:'Archivo no encontrado: '+ex.message};
    }
  }
  ```

- [ ] **Redesplegar el backend**

  En Google Apps Script: Nueva implementación → Implementación de aplicación web → copiar URL de implementación. Confirmar que la URL no cambia (misma implementación existente con nueva versión).

- [ ] **Commit**

  ```bash
  git add gashc.txt
  git commit -m "feat: add getFotoWidget backend action"
  ```

---

## Task 4: Widget — Overlay de cuadrícula 2 cm × 2 cm

**Archivos:**
- Modify: `hc.html` función `wpostMount` (~línea 9049–9073)

- [ ] **Localizar los dos bloques de vistas en wpostMount**

  Hay dos `forEach` en `wpostMount` que construyen paneles de vista:
  - `['ant','post'].forEach(...)` (~línea 9049)
  - `['latd','lati'].forEach(...)` (~línea 9065)

  En ambos, el contenedor clickeable es:
  ```javascript
  html+='<div id="wpost_vb_'+k+'" style="position:relative;cursor:crosshair;width:100%;height:375px;overflow:hidden">';
  html+='<img id="wpost_img_'+k+'" src="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;object-position:top center;pointer-events:none;user-select:none">';
  html+='<div id="wpost_dl_'+k+'" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"></div>';
  html+='</div></div>';
  ```

- [ ] **Agregar el div de cuadrícula y el botón de foto en ambos forEach**

  Reemplazar el bloque `['ant','post'].forEach(...)`:

  ```javascript
  ['ant','post'].forEach(function(k){
    var lbl=k==='ant'?'Vista Anterior':'Vista Posterior';
    html+='<div style="width:250px;background:var(--surf);border-radius:10px;border:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden">';
    html+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--tx3);padding:4px 8px;border-bottom:1px solid var(--bd);background:var(--surf3);flex-shrink:0;height:25px">'+lbl+'</div>';
    html+='<div id="wpost_vb_'+k+'" style="position:relative;cursor:crosshair;width:100%;height:375px;overflow:hidden">';
    html+='<img id="wpost_img_'+k+'" src="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;object-position:top center;pointer-events:none;user-select:none">';
    html+='<div id="wpost_grid_'+k+'" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;background:repeating-linear-gradient(to right,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 2cm),repeating-linear-gradient(to bottom,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 2cm)"></div>';
    html+='<div id="wpost_dl_'+k+'" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2"></div>';
    html+='</div>';
    html+='<div style="padding:4px 6px;border-top:1px solid var(--bd);background:var(--surf3)">';
    html+='<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:9px;font-weight:600;color:var(--tx3)">';
    html+='<input type="file" accept="image/*" style="display:none" onchange="_wpostSubirFoto(this,\''+k+'\')">';
    html+='📷 Subir foto</label>';
    html+='<span id="wpost_foto_status_'+k+'" style="font-size:9px;color:var(--tx4);margin-left:4px"></span>';
    html+='</div>';
    html+='</div>';
  });
  ```

  Reemplazar el bloque `['latd','lati'].forEach(...)` con el mismo patrón (cambiar solo las etiquetas):

  ```javascript
  ['latd','lati'].forEach(function(k){
    var lbl=k==='latd'?'Lateral Derecha':'Lateral Izquierda';
    html+='<div style="width:250px;background:var(--surf);border-radius:10px;border:1px solid var(--bd);display:flex;flex-direction:column;overflow:hidden">';
    html+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--tx3);padding:4px 8px;border-bottom:1px solid var(--bd);background:var(--surf3);flex-shrink:0;height:25px">'+lbl+'</div>';
    html+='<div id="wpost_vb_'+k+'" style="position:relative;cursor:crosshair;width:100%;height:375px;overflow:hidden">';
    html+='<img id="wpost_img_'+k+'" src="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;object-position:top center;pointer-events:none;user-select:none">';
    html+='<div id="wpost_grid_'+k+'" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;background:repeating-linear-gradient(to right,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 2cm),repeating-linear-gradient(to bottom,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 2cm)"></div>';
    html+='<div id="wpost_dl_'+k+'" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2"></div>';
    html+='</div>';
    html+='<div style="padding:4px 6px;border-top:1px solid var(--bd);background:var(--surf3)">';
    html+='<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:9px;font-weight:600;color:var(--tx3)">';
    html+='<input type="file" accept="image/*" style="display:none" onchange="_wpostSubirFoto(this,\''+k+'\')">';
    html+='📷 Subir foto</label>';
    html+='<span id="wpost_foto_status_'+k+'" style="font-size:9px;color:var(--tx4);margin-left:4px"></span>';
    html+='</div>';
    html+='</div>';
  });
  ```

- [ ] **Verificar cuadrícula en el widget (sin foto aún)**

  Abrir `hc.html`. Ir al widget postural. Las 4 vistas deben mostrar la silueta estática con una cuadrícula semitransparente encima. Los chips siguen colocándose correctamente sobre la cuadrícula.

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: add 2cm grid overlay and photo upload button to postural widget views"
  ```

---

## Task 5: Widget — Función de compresión y subida de foto

**Archivos:**
- Modify: `hc.html` línea 9023 (IIFE — agregar funciones antes de `window.wpostGetData`)

- [ ] **Agregar `_comprimirFoto` y `_wpostSubirFoto` en el IIFE**

  Buscar en el script inline (línea 9023):
  ```
  window.wpostGetData=function(){
  ```

  Insertar ANTES de esa línea (al final del IIFE, antes de los `window.wpost*` exports):

  ```javascript
  function _comprimirFoto(file,cb){
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){
        var maxPx=800,w=img.width,h=img.height;
        if(w>maxPx||h>maxPx){if(w>h){h=Math.round(h*maxPx/w);w=maxPx;}else{w=Math.round(w*maxPx/h);h=maxPx;}}
        var cv=document.createElement('canvas');
        cv.width=w;cv.height=h;
        cv.getContext('2d').drawImage(img,0,0,w,h);
        cb(cv.toDataURL('image/jpeg',0.80));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  }
  window._wpostSubirFoto=function(input,vista){
    var file=input.files&&input.files[0];
    if(!file) return;
    input.value='';
    var st=document.getElementById('wpost_foto_status_'+vista);
    if(st) st.textContent='Comprimiendo...';
    _comprimirFoto(file,function(b64){
      if(st) st.textContent='Subiendo...';
      var prevFileId=(VBS[vista]&&VBS[vista].fotoId)||null;
      // Leer el evalId desde el hidden input del formulario (id="hcEvalId")
      var evalIdActual=document.getElementById('hcEvalId')?.value||'';
      var payload={action:'subirFotoWidget',archivoBase64:b64,vista:vista,prevFileId:prevFileId||'',evalId:evalIdActual};
      apiPost(payload).then(function(r){
        if(!r.ok){if(st)st.textContent='Error: '+(r.error||'');return;}
        if(!VBS[vista]) VBS[vista]={};
        VBS[vista].fotoId=r.fileId;
        var img=document.getElementById('wpost_img_'+vista);
        if(img) img.src=b64;
        if(!window._wpostFotosCache) window._wpostFotosCache={};
        window._wpostFotosCache[vista]=b64;
        if(st) st.textContent='✓ Foto subida';
      }).catch(function(e){if(st)st.textContent='Error al subir';});
    });
  };
  ```

  > **Nota:** El `evalId` se obtiene directamente del `<input type="hidden" id="hcEvalId">` que ya existe en el formulario (línea ~2626). No se necesita ninguna variable global adicional.

- [ ] **Verificar subida de foto**

  1. Abrir `hc.html` → evaluación postural en modo edición
  2. Hacer clic en "📷 Subir foto" en "Vista Anterior"
  3. Seleccionar una foto JPG/PNG
  4. Verificar que el status muestre "Comprimiendo..." → "Subiendo..." → "✓ Foto subida"
  5. La silueta estática debe reemplazarse por la foto del paciente
  6. La cuadrícula debe aparecer sobre la foto
  7. Los chips se siguen colocando correctamente

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: add photo compression and Drive upload to postural widget"
  ```

---

## Task 6: `wpostGetData` — Serializar fotos

**Archivos:**
- Modify: `hc.html` línea 9023 (IIFE — `window.wpostGetData`)

- [ ] **Actualizar `wpostGetData` para incluir `fotos`**

  Buscar:
  ```javascript
  window.wpostGetData=function(){
    var out={};
    ['ant','post','latd','lati'].forEach(function(k){
      out[k]=(data[k]||[]).map(function(d){
        var a=getAlt(d.altId);
        return{altId:d.altId,alt:a?a.lbl:'',xp:d.xp,yp:d.yp};
      });
    });
    return out;
  };
  ```

  Reemplazar por:
  ```javascript
  window.wpostGetData=function(){
    var out={};
    ['ant','post','latd','lati'].forEach(function(k){
      out[k]=(data[k]||[]).map(function(d){
        var a=getAlt(d.altId);
        return{altId:d.altId,alt:a?a.lbl:'',xp:d.xp,yp:d.yp};
      });
    });
    out.fotos={};
    ['ant','post','latd','lati'].forEach(function(k){
      out.fotos[k]=(VBS[k]&&VBS[k].fotoId)||null;
    });
    return out;
  };
  ```

- [ ] **Verificar serialización**

  Abrir la consola del navegador. Con el widget postural abierto y una foto subida, ejecutar:
  ```javascript
  console.log(JSON.stringify(window.wpostGetData().fotos));
  ```
  Debe mostrar los fileIds de Drive para las vistas con foto y `null` para las demás.

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: include photo fileIds in wpostGetData serialization"
  ```

---

## Task 7: `wpostSetData` — Cargar fotos al editar evaluación existente

**Archivos:**
- Modify: `hc.html` línea 9023 (IIFE — `window.wpostSetData`)

- [ ] **Actualizar `wpostSetData` para cargar fotos de Drive**

  Buscar:
  ```javascript
  window.wpostSetData=function(saved){
    if(!saved) return;
    ['ant','post','latd','lati'].forEach(function(k){
      if(saved[k]&&Array.isArray(saved[k])){
        data[k]=saved[k].map(function(d){return{altId:d.altId||d.alt,xp:d.xp,yp:d.yp};});
        renderDrops(k);
      }
    });
  };
  ```

  Reemplazar por:
  ```javascript
  window.wpostSetData=function(saved){
    if(!saved) return;
    ['ant','post','latd','lati'].forEach(function(k){
      if(saved[k]&&Array.isArray(saved[k])){
        data[k]=saved[k].map(function(d){return{altId:d.altId||d.alt,xp:d.xp,yp:d.yp};});
        renderDrops(k);
      }
    });
    if(saved.fotos){
      if(!window._wpostFotosCache) window._wpostFotosCache={};
      ['ant','post','latd','lati'].forEach(function(k){
        var fid=saved.fotos[k];
        if(!fid) return;
        if(!VBS[k]) VBS[k]={};
        VBS[k].fotoId=fid;
        var st=document.getElementById('wpost_foto_status_'+k);
        if(st) st.textContent='Cargando foto...';
        apiGet('getFotoWidget',{fileId:fid}).then(function(r){
          if(!r.ok){if(st)st.textContent='';return;}
          var src='data:'+r.mimeType+';base64,'+r.data;
          window._wpostFotosCache[k]=src;
          var img=document.getElementById('wpost_img_'+k);
          if(img) img.src=src;
          if(st) st.textContent='✓';
        }).catch(function(){if(st)st.textContent='';});
      });
    }
  };
  ```

- [ ] **Verificar carga al re-editar**

  1. Guardar evaluación postural con fotos subidas
  2. Cerrar y volver a abrir la evaluación en modo edición
  3. Las fotos deben cargarse desde Drive y reemplazar las siluetas
  4. Los chips guardados deben seguir en sus posiciones

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: load photos from Drive in wpostSetData when editing existing evaluation"
  ```

---

## Task 8: `wpostGetIMGS` — Devolver fotos cacheadas para render/PDF

**Archivos:**
- Modify: `hc.html` línea ~9225

- [ ] **Actualizar `wpostGetIMGS`**

  Buscar:
  ```javascript
  window.wpostGetIMGS=function(){return IMGS;};
  ```

  Reemplazar por:
  ```javascript
  window.wpostGetIMGS=function(){
    if(!window._wpostFotosCache) return IMGS;
    var result={ant:IMGS.ant,post:IMGS.post,latd:IMGS.latd,lati:IMGS.lati};
    ['ant','post','latd','lati'].forEach(function(k){
      if(window._wpostFotosCache[k]) result[k]=window._wpostFotosCache[k];
    });
    return result;
  };
  ```

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: wpostGetIMGS returns cached patient photos with static fallback"
  ```

---

## Task 9: Helper `_wpostPrecargarFotos` — Precarga async para render

**Archivos:**
- Modify: `hc.html` línea 9023 (IIFE — agregar antes de los exports `window.wpost*`)

- [ ] **Agregar función de precarga**

  Buscar (en el IIFE, junto a los otros exports):
  ```javascript
  window.wpostGetIMGS=function(){
  ```

  Insertar ANTES:
  ```javascript
  window._wpostPrecargarFotos=async function(widgetData){
    // Resetear caché siempre para evitar contaminación entre evaluaciones
    window._wpostFotosCache={};
    if(!widgetData||!widgetData.fotos) return;
    var vistas=['ant','post','latd','lati'];
    await Promise.all(vistas.map(async function(k){
      var fid=widgetData.fotos[k];
      if(!fid) return;
      try{
        var r=await apiGet('getFotoWidget',{fileId:fid});
        if(r.ok&&r.data) window._wpostFotosCache[k]='data:'+r.mimeType+';base64,'+r.data;
      }catch(e){}
    }));
  };
  ```

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: add _wpostPrecargarFotos async helper for read/pdf render"
  ```

---

## Task 10: Render lectura — `toggleEvalInline` preload fotos

**Archivos:**
- Modify: `hc.html` función `toggleEvalInline` (~línea 2650)

- [ ] **Localizar el punto exacto de inserción en `toggleEvalInline` (línea ~3221)**

  La función ya es `async`. Buscar el bloque que termina con:
  ```javascript
      // Parsear widgetPostural si viene como string dentro de datosEspecificos
      if(ev.datosEspecificos && typeof ev.datosEspecificos.widgetPostural === 'string' && ev.datosEspecificos.widgetPostural){
        try{ ev.datosEspecificos.widgetPostural = JSON.parse(ev.datosEspecificos.widgetPostural); }catch(e){}
      }
      var rP=await apiGet('obtenerPaciente',{id:pacId});
      var pac=rP.ok?rP.paciente:{};
      el.innerHTML=buildEvalHTML(ev, pac, '');
  ```

- [ ] **Insertar preload justo antes de `el.innerHTML=buildEvalHTML`**

  Reemplazar:
  ```javascript
      var rP=await apiGet('obtenerPaciente',{id:pacId});
      var pac=rP.ok?rP.paciente:{};
      el.innerHTML=buildEvalHTML(ev, pac, '');
  ```
  por:
  ```javascript
      var rP=await apiGet('obtenerPaciente',{id:pacId});
      var pac=rP.ok?rP.paciente:{};
      // Precargar fotos del widget postural antes de renderizar
      if(ev.datosEspecificos&&ev.datosEspecificos.widgetPostural&&window._wpostPrecargarFotos){
        await window._wpostPrecargarFotos(ev.datosEspecificos.widgetPostural);
      }
      el.innerHTML=buildEvalHTML(ev, pac, '');
  ```

- [ ] **Verificar render en modo lectura con fotos**

  1. Guardar evaluación postural con al menos una foto subida
  2. Ir a la ficha del paciente → sección Evaluaciones
  3. Expandir la evaluación postural (clic en el acordeón)
  4. La foto del paciente debe mostrarse en la vista correspondiente con la cuadrícula encima
  5. Los chips deben aparecer sobre la foto en sus posiciones guardadas

- [ ] **Commit**

  ```bash
  git add hc.html
  git commit -m "feat: preload widget photos before read-only eval render"
  ```

---

## Task 11: Render PDF — `verEvalConFirma` preload fotos

**Archivos:**
- Modify: `hc.html` función `verEvalConFirma` (~línea 3300)

- [ ] **Localizar el punto exacto en `verEvalConFirma` (línea ~3304)**

  Buscar el bloque (línea ~3360):
  ```javascript
    // Construir cuerpo: evaluación + sello firmante al final
    var bodyHTML = buildEvalHTML(ev, pac, firmaRevisorHTML);
  ```

- [ ] **Insertar preload justo antes de `buildEvalHTML`**

  Reemplazar:
  ```javascript
    // Construir cuerpo: evaluación + sello firmante al final
    var bodyHTML = buildEvalHTML(ev, pac, firmaRevisorHTML);
  ```
  por:
  ```javascript
    // Precargar fotos del widget postural para PDF
    if(ev.datosEspecificos&&ev.datosEspecificos.widgetPostural&&window._wpostPrecargarFotos){
      await window._wpostPrecargarFotos(ev.datosEspecificos.widgetPostural);
    }
    // Construir cuerpo: evaluación + sello firmante al final
    var bodyHTML = buildEvalHTML(ev, pac, firmaRevisorHTML);
  ```

- [ ] **Verificar render en PDF**

  1. Ir a una evaluación postural aprobada con fotos subidas
  2. Clic en "📄 PDF"
  3. El PDF generado debe mostrar la foto del paciente (no la silueta) con la cuadrícula y los chips en sus posiciones

- [ ] **Commit final**

  ```bash
  git add hc.html
  git commit -m "feat: preload widget photos before PDF generation"
  ```

---

## Checklist de verificación final

- [ ] Los chips AP y RP aparecen en el selector y se pueden colocar en todas las vistas
- [ ] La cuadrícula 2 cm × 2 cm aparece sobre la silueta estática cuando no hay foto
- [ ] Subir foto en una vista la reemplaza inmediatamente (la silueta de otras vistas no cambia)
- [ ] Al guardar y re-abrir en edición, las fotos se cargan desde Drive
- [ ] El render de lectura (acordeón) muestra las fotos correctamente
- [ ] El PDF generado incluye las fotos con cuadrícula y chips
- [ ] Si no se sube foto, la silueta estática sigue mostrándose (fallback intacto)
- [ ] Redesplegar `gashc.txt` en Google Apps Script antes de probar subida real
