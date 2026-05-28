// Consentimiento informado, plantigrafía y panel de configuración del sistema

async function subirConsentimientoUI(input, evalId){
  if(!input.files||!input.files[0]) return;
  if(!evalId) evalId = document.getElementById('hcEvalId')?.value || '';
  if(!evalId){ toast('Guarda la evaluación primero','','warn'); input.value=''; return; }
  var file = input.files[0];
  if(!file.type.startsWith('image/')){ toast('Solo se aceptan imágenes (JPG, PNG, WebP)','','warn'); input.value=''; return; }
  if(file.size > 4*1024*1024){ toast('La imagen debe ser menor a 4 MB','','warn'); input.value=''; return; }
  if(!tryLock()) return;
  showSendOverlay('📎 Subiendo consentimiento...','');
  try{
    // Convertir a base64
    var b64 = await new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){ resolve(e.target.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    var r = await apiPost({action:'subirConsentimiento', evaluacionId:evalId, archivoBase64:b64, nombre:file.name});
    hideSendOverlay();
    if(!r.ok){ toast('Error al subir', r.error||'Verifica el GAS', 'err'); input.value=''; return; }
    toast('✅ Consentimiento subido','','ok');
    var st=g('consentStatus'); if(st) st.textContent='📎 '+file.name;
    var vBtn=g('consentVerBtn'), dBtn=g('consentDelBtn');
    if(vBtn){ vBtn.style.display=''; vBtn.onclick=function(){ verConsentimientoUI(evalId); }; }
    if(dBtn){ dBtn.style.display=''; dBtn.onclick=function(){ eliminarConsentimientoUI(evalId); }; }
  }catch(ex){ hideSendOverlay(); toast('Error inesperado', ex.message, 'err'); }
  input.value='';
}

async function verConsentimientoUI(evalId){
  if(!evalId) evalId = document.getElementById('hcEvalId')?.value || '';
  if(!evalId){ toast('Sin evaluación','','warn'); return; }
  toast('Cargando imagen...','','ok');
  try{
    var r = await apiPost({action:'getConsentimiento', evaluacionId:evalId});
    if(!r.ok){ toast('Sin consentimiento', r.error||'', 'err'); return; }
    // Abrir en nueva pestaña como blob URL
    var dataUrl = 'data:'+r.mimeType+';base64,'+r.data;
    var win = window.open('','_blank');
    if(win){
      win.document.write('<html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh">'
        +'<img src="'+dataUrl+'" style="max-width:100%;height:auto"></body></html>');
    }
  }catch(ex){ toast('Error', ex.message, 'err'); }
}

async function eliminarConsentimientoUI(evalId){
  if(!evalId) evalId = document.getElementById('hcEvalId')?.value || '';
  if(!evalId) return;
  if(!confirm('¿Eliminar el consentimiento informado?')) return;
  try{
    var r = await apiPost({action:'eliminarConsentimiento', evaluacionId:evalId});
    if(!r.ok){ toast('Error', r.error, 'err'); return; }
    toast('Consentimiento eliminado','','ok');
    var st=g('consentStatus'), vBtn=g('consentVerBtn'), dBtn=g('consentDelBtn');
    if(st) st.textContent='Sin archivo';
    if(vBtn) vBtn.style.display='none';
    if(dBtn) dBtn.style.display='none';
  }catch(ex){ toast('Error', ex.message, 'err'); }
}

// ─── Plantigrafía — funciones UI ───────────────────────────
async function _precargarPlantigrafia(fileId){
  window._plantigrafiaCache = null;
  if(!fileId) return;
  try{
    var r = await apiGet('getFotoWidget', {fileId:fileId});
    if(r.ok && r.data) window._plantigrafiaCache = 'data:'+r.mimeType+';base64,'+r.data;
  }catch(e){}
}
async function _inicializarPlantigrafia(){
  var fileId = window._plantigrafiaPendingFileId;
  if(!fileId){ window._plantigrafiaPendingFileId=''; return; }
  window._plantigrafiaPendingFileId = '';
  var st = document.getElementById('plantigrafia_status');
  if(st) st.textContent = 'Cargando...';
  try{
    var r = await apiGet('getFotoWidget', {fileId:fileId});
    if(r.ok && r.data){
      var b64 = 'data:'+r.mimeType+';base64,'+r.data;
      window._plantigrafiaB64Cache = b64;
      var img = document.getElementById('plantigrafia_img');
      var ph  = document.getElementById('plantigrafia_ph');
      var del = document.getElementById('plantigrafia_del_btn');
      if(img){ img.src=b64; img.style.display=''; }
      if(ph)  ph.style.display='none';
      if(del) del.style.display='';
    }
    if(st) st.textContent='';
  }catch(e){ if(st) st.textContent='Error al cargar'; }
}
function _subirPlantigrafia(input){
  var file = input.files && input.files[0];
  if(!file) return;
  input.value = '';
  var st = document.getElementById('plantigrafia_status');
  if(st) st.textContent = 'Comprimiendo...';
  window._comprimirFoto(file, function(b64){
    if(st) st.textContent = 'Subiendo...';
    var prevFileId = document.getElementById('plantigrafiaFileId')?.value || '';
    var evalIdActual = document.getElementById('hcEvalId')?.value || '';
    apiPost({action:'subirFotoWidget', archivoBase64:b64, vista:'plantigrafia', prevFileId:prevFileId, evalId:evalIdActual}).then(function(r){
      if(!r.ok){ if(st) st.textContent='Error: '+(r.error||''); return; }
      var hid = document.getElementById('plantigrafiaFileId');
      if(hid) hid.value = r.fileId;
      window._plantigrafiaB64Cache = b64;
      var img = document.getElementById('plantigrafia_img');
      var ph  = document.getElementById('plantigrafia_ph');
      var del = document.getElementById('plantigrafia_del_btn');
      if(img){ img.src=b64; img.style.display=''; }
      if(ph)  ph.style.display='none';
      if(del) del.style.display='';
      if(st)  st.textContent='✓';
    }).catch(function(){ if(st) st.textContent='Error al subir'; });
  });
}
function _eliminarPlantigrafia(){
  var hid = document.getElementById('plantigrafiaFileId');
  if(hid) hid.value = '';
  window._plantigrafiaB64Cache = null;
  var img = document.getElementById('plantigrafia_img');
  var ph  = document.getElementById('plantigrafia_ph');
  var del = document.getElementById('plantigrafia_del_btn');
  if(img){ img.src=''; img.style.display='none'; }
  if(ph)  ph.style.display='';
  if(del) del.style.display='none';
}

// VISTA: Configuración del Sistema (solo admin)
// ════════════════════════════════════════════════════════════
function renderConfig(){
  var v=g('vConfig');
  v.innerHTML=`
  <div class="card-hdr" style="margin-bottom:16px">
    <div class="card-title">&#9881;&#65039; Configuraci&oacute;n del Sistema</div>
  </div>

  <!-- Nombre de empresa -->
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:18px">🏷️</span>
      <div class="card-title" style="font-size:14px">Nombre / T&iacute;tulo del Sistema</div>
    </div>
    <div class="form-grid" style="grid-template-columns:1fr auto;gap:10px;align-items:end">
      <div class="field">
        <label>Nombre de la empresa o cl&iacute;nica</label>
        <input class="inp" id="cfgNombre" placeholder="Ingresa el nombre de tu empresa o clínica" value="${e2(_brandNombre||'')}">
      </div>
      <button class="btn btn-primary" onclick="guardarNombreEmpresa()" style="height:38px;white-space:nowrap">
        &#128190; Guardar nombre
      </button>
    </div>
    <p id="cfgNombreMsg" style="display:none;margin-top:8px;font-size:12px;border-radius:8px;padding:6px 10px"></p>
  </div>

  <!-- Logo -->
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:18px">🖼️</span>
      <div class="card-title" style="font-size:14px">Logo del Sistema</div>
    </div>

    <!-- Preview actual -->
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Logo actual</div>
      <div id="cfgLogoPreviewWrap" style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:14px;border:2px dashed var(--bd);background:var(--surf2);overflow:hidden">
        ${_brandLogo
          ? `<img src="${_brandLogo}" style="width:100%;height:100%;object-fit:contain" id="cfgLogoImgActual">`
          : `<span style="font-size:11px;color:var(--tx4);text-align:center;padding:6px">Sin logo</span>`
        }
      </div>
    </div>

    <!-- Zona de carga -->
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Subir nuevo logo (PNG recomendado)</div>
    <div id="cfgDropZone"
      style="border:2px dashed var(--bd);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--surf2)"
      onclick="g('cfgFileInput').click()"
      ondragover="event.preventDefault();this.style.borderColor='var(--n400)';this.style.background='var(--surf3)'"
      ondragleave="this.style.borderColor='var(--bd)';this.style.background='var(--surf2)'"
      ondrop="event.preventDefault();this.style.borderColor='var(--bd)';this.style.background='var(--surf2)';cfgHandleFile(event.dataTransfer.files[0])">
      <div style="font-size:28px;margin-bottom:6px">📂</div>
      <div style="font-size:13px;font-weight:600;color:var(--tx2)">Arrastra tu PNG aqu&iacute; o haz clic para seleccionar</div>
      <div style="font-size:11px;color:var(--tx4);margin-top:4px" id="cfgDropHint">PNG con transparencia &middot; Se redimensiona autom&aacute;ticamente para caber en la hoja de c&aacute;lculo</div>
    </div>
    <input type="file" id="cfgFileInput" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none" onchange="cfgHandleFile(this.files[0])">

    <!-- Preview de imagen seleccionada -->
    <div id="cfgNewPreviewWrap" style="display:none;margin-top:14px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Vista previa (nuevo logo)</div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <!-- Cuadrado con fondo oscuro (para ver transparencia) -->
        <div style="position:relative">
          <div style="font-size:9px;color:var(--tx4);margin-bottom:3px;text-align:center">Fondo oscuro</div>
          <div style="width:80px;height:80px;border-radius:14px;border:1px solid var(--bd);background:#1e3a5f;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <img id="cfgNewPreviewDark" style="width:100%;height:100%;object-fit:contain">
          </div>
        </div>
        <!-- Cuadrado con fondo claro -->
        <div>
          <div style="font-size:9px;color:var(--tx4);margin-bottom:3px;text-align:center">Fondo claro</div>
          <div style="width:80px;height:80px;border-radius:14px;border:1px solid var(--bd);background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <img id="cfgNewPreviewLight" style="width:100%;height:100%;object-fit:contain">
          </div>
        </div>
        <!-- Cuadrado con patrón de transparencia -->
        <div>
          <div style="font-size:9px;color:var(--tx4);margin-bottom:3px;text-align:center">Transparencia</div>
          <div style="width:80px;height:80px;border-radius:14px;border:1px solid var(--bd);background:repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 0 0/16px 16px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            <img id="cfgNewPreviewTrans" style="width:100%;height:100%;object-fit:contain">
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--tx3)" id="cfgFileInfo"></div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="cfgSubirLogo()">&#9650; Subir logo</button>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px;margin-left:6px" onclick="cfgCancelLogo()">Cancelar</button>
        </div>
      </div>
    </div>

    <p id="cfgLogoMsg" style="display:none;margin-top:10px;font-size:12px;border-radius:8px;padding:6px 10px"></p>
  </div>
  `;
}

// ── Archivo seleccionado: redimensionar en canvas preservando alpha ──
// Límite de Google Sheets: 50000 chars por celda.
// Un base64 PNG ocupa ~1.37 bytes por byte → para 50000 chars necesitamos ≤36496 bytes raw.
// Usamos 33KB como techo seguro con margen. Si PNG puro no alcanza, intentamos WebP→PNG fallback JPEG.
var _cfgLogoBase64 = null;
var SHEETS_MAX_CHARS = 38000; // margen amplio bajo el límite real de 50000 chars de Sheets

function cfgHandleFile(file){
  if(!file) return;
  if(!file.type.startsWith('image/')){
    toast('Solo se aceptan imágenes (PNG, JPG, WebP)','','err'); return;
  }
  var reader = new FileReader();
  reader.onload = function(ev){
    var originalDataUrl = ev.target.result;
    var img = new Image();
    img.onload = function(){
      // Intentar tamaños decrecientes hasta caber en el límite de Sheets
      var sizes = [120, 96, 80, 64, 48];
      var result = null;

      for(var s = 0; s < sizes.length; s++){
        var MAX = sizes[s];
        var scale = Math.min(MAX / img.width, MAX / img.height, 1);
        var w = Math.round(img.width  * scale);
        var h = Math.round(img.height * scale);
        // Mínimo 16×16 para que no quede invisible
        if(w < 16) w = 16;
        if(h < 16) h = 16;

        var canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h); // fondo transparente — preserva canal alfa
        ctx.drawImage(img, 0, 0, w, h);

        // Intentar PNG primero (preserva transparencia)
        var dataUrl = canvas.toDataURL('image/png');

        if(dataUrl.length <= SHEETS_MAX_CHARS){
          result = {dataUrl:dataUrl, w:w, h:h, fmt:'PNG', size:sizes[s]};
          break;
        }

        // PNG demasiado grande en este tamaño → intentar WebP (menor peso, preserva alfa)
        var webp = canvas.toDataURL('image/webp', 0.85);
        if(webp && !webp.startsWith('data:image/png') && webp.length <= SHEETS_MAX_CHARS){
          // Convertir WebP de vuelta a PNG para compatibilidad máxima en el header
          // (algunos navegadores viejos no muestran WebP en <img> incrustado)
          // Si el navegador soporta WebP en canvas, ya está; lo usamos directo.
          result = {dataUrl:webp, w:w, h:h, fmt:'WebP', size:sizes[s]};
          break;
        }

        // Fallback JPEG con calidad decreciente (pierde transparencia — fondo blanco)
        var q = 0.80;
        while(q >= 0.30){
          var jpg = canvas.toDataURL('image/jpeg', q);
          if(jpg.length <= SHEETS_MAX_CHARS){
            result = {dataUrl:jpg, w:w, h:h, fmt:'JPEG q'+Math.round(q*100), size:sizes[s]};
            break;
          }
          q -= 0.10;
        }
        if(result) break;
      }

      if(!result){
        toast('La imagen es demasiado grande incluso en el tamaño mínimo. Usa una imagen más simple.','','err');
        return;
      }

      _cfgLogoBase64 = result.dataUrl;

      // Mostrar previews
      var pw = g('cfgNewPreviewWrap');
      if(pw) pw.style.display='block';
      ['cfgNewPreviewDark','cfgNewPreviewLight','cfgNewPreviewTrans'].forEach(function(id){
        var el=g(id); if(el) el.src=result.dataUrl;
      });
      var info = g('cfgFileInfo');
      if(info){
        var kb = Math.round(result.dataUrl.length * 0.75 / 1024);
        var warn = result.fmt.startsWith('JPEG') ? '<br><span style="color:var(--amber);font-size:10px">⚠ JPEG: transparencia convertida a blanco</span>' : '';
        info.innerHTML = '<b>'+file.name+'</b><br>'
          + result.w+'&times;'+result.h+' px · '+result.fmt+'<br>'
          + '~'+kb+' KB · '+result.dataUrl.length+' chars'
          + warn;
      }
      // Actualizar texto de la zona de carga
      var hint = g('cfgDropHint');
      if(hint) hint.textContent = 'Redimensionado a '+result.w+'×'+result.h+' px ('+result.fmt+') para caber en la hoja de cálculo';
    };
    img.onerror = function(){ toast('No se pudo leer la imagen','','err'); };
    img.src = originalDataUrl;
  };
  reader.readAsDataURL(file);
}

function cfgCancelLogo(){
  _cfgLogoBase64 = null;
  var pw = g('cfgNewPreviewWrap'); if(pw) pw.style.display='none';
  var fi = g('cfgFileInput'); if(fi) fi.value='';
}

async function cfgSubirLogo(){
  if(!_cfgLogoBase64){ toast('Selecciona una imagen primero','','warn'); return; }
  var msg = g('cfgLogoMsg');
  if(msg){ msg.style.display='block'; msg.style.background='var(--surf3)'; msg.style.color='var(--tx3)'; msg.textContent='⏳ Subiendo logo...'; }
  try{
    var r = await apiPost({action:'uploadLogo', imageBase64:_cfgLogoBase64});
    if(!r.ok) throw new Error(r.error||'Error desconocido');
    _brandLogo = _cfgLogoBase64;
    aplicarBrand();
    cfgCancelLogo();
    if(msg){ msg.style.background='var(--green2)'; msg.style.color='var(--green)'; msg.textContent='✓ Logo actualizado correctamente'; }
    // Actualizar preview actual
    var wp = g('cfgLogoPreviewWrap');
    if(wp) wp.innerHTML='<img src="'+_brandLogo+'" style="width:100%;height:100%;object-fit:contain" id="cfgLogoImgActual">';
    toast('Logo actualizado','','ok');
  }catch(ex){
    if(msg){ msg.style.background='var(--red2)'; msg.style.color='var(--red)'; msg.textContent='✗ '+ex.message; }
    toast('Error al subir logo: '+ex.message,'','err');
  }
}

async function guardarNombreEmpresa(){
  var inp = g('cfgNombre');
  var nombre = (inp?.value||'').trim();
  var msg = g('cfgNombreMsg');
  if(!nombre){ toast('Escribe un nombre','','warn'); return; }
  if(msg){ msg.style.display='block'; msg.style.background='var(--surf3)'; msg.style.color='var(--tx3)'; msg.textContent='⏳ Guardando...'; }
  try{
    var r = await apiPost({action:'updateEmpresa', nombre:nombre});
    if(!r.ok) throw new Error(r.error||'Error desconocido');
    _brandNombre = nombre;
    aplicarBrand();
    if(msg){ msg.style.background='var(--green2)'; msg.style.color='var(--green)'; msg.textContent='✓ Nombre actualizado correctamente'; }
    toast('Nombre actualizado','','ok');
  }catch(ex){
    if(msg){ msg.style.background='var(--red2)'; msg.style.color='var(--red)'; msg.textContent='✗ '+ex.message; }
    toast('Error: '+ex.message,'','err');
  }
}
