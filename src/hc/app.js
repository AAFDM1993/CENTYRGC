// Inicialización de la app HC: paleta, brand, timers, bootstrap DOMContentLoaded, navegación, búsqueda

// ─── Config ───────────────────────────────────────────

// ─── Debug ────────────────────────────────────────────
// Activar:  localStorage.setItem('hc_debug','1') → recarga
// Desactivar: localStorage.removeItem('hc_debug') → recarga
const HC_DEBUG = localStorage.getItem('hc_debug') === '1';
const dbg = (function(){
  if(!HC_DEBUG) return { log:()=>{}, warn:()=>{}, err:()=>{}, api:()=>{}, chip:()=>{}, perm:()=>{}, eval:()=>{}, form:()=>{} };
  const tag  = (mod) => `%c[HC:${mod}]`;
  const base = 'font-weight:700;padding:1px 4px;border-radius:3px;color:#fff;';
  const cols = {
    API: base+'background:#0ea5e9;', PERM: base+'background:#f59e0b;',
    EVAL: base+'background:#8b5cf6;', CHIP: base+'background:#10b981;',
    FORM: base+'background:#3b82f6;', ERR: base+'background:#ef4444;',
    WARN: base+'background:#f97316;', INFO: base+'background:#64748b;',
  };
  const fmt = (mod, color, ...args) => console.log(tag(mod), cols[color]||cols.INFO, ...args);
  console.log('%c HC DEBUG ACTIVO — desactivar: localStorage.removeItem(\'hc_debug\') ',
    'background:#1e3a5f;color:#fff;font-weight:700;padding:4px 10px;border-radius:4px;font-size:13px');
  return {
    log:  (...a) => fmt('INFO','INFO',...a),  warn: (...a) => fmt('WARN','WARN',...a),
    err:  (...a) => fmt('ERR','ERR',...a),    api:  (action,payload,resp) => fmt('API','API',action,'→',payload,'✓',resp),
    chip: (...a) => fmt('CHIP','CHIP',...a),  perm: (...a) => fmt('PERM','PERM',...a),
    eval: (...a) => fmt('EVAL','EVAL',...a),  form: (...a) => fmt('FORM','FORM',...a),
  };
})();

// ─── Paleta de colores del sistema ────────────────────
const HC_PALETAS = {
  oceano:   {'--n900':'#0a1628','--n800':'#0f1e3d','--n700':'#1a2f5a','--n600':'#1e3a5f','--n500':'#1d4ed8','--n400':'#3b82f6','--n300':'#93c5fd','--n200':'#bfdbfe','--n100':'#dbeafe','--n050':'#eff6ff'},
  pizarra:  {'--n900':'#0f172a','--n800':'#1e293b','--n700':'#334155','--n600':'#475569','--n500':'#475569','--n400':'#64748b','--n300':'#94a3b8','--n200':'#cbd5e1','--n100':'#e2e8f0','--n050':'#f8fafc'},
  esmeralda:{'--n900':'#022c22','--n800':'#064e3b','--n700':'#065f46','--n600':'#047857','--n500':'#059669','--n400':'#10b981','--n300':'#6ee7b7','--n200':'#a7f3d0','--n100':'#d1fae5','--n050':'#ecfdf5'},
  indigo:   {'--n900':'#1e1b4b','--n800':'#312e81','--n700':'#3730a3','--n600':'#4338ca','--n500':'#4f46e5','--n400':'#6366f1','--n300':'#a5b4fc','--n200':'#c7d2fe','--n100':'#e0e7ff','--n050':'#eef2ff'}
};
function hcAplicarPaleta(nombre, custom){
  if(nombre === 'personalizado' && custom){
    try{
      const c = typeof custom==='string' ? JSON.parse(custom) : custom;
      if(c.c500 && c.c900){
        function lerp(a,b,t){
          const ah=parseInt(a.slice(1),16),bh=parseInt(b.slice(1),16);
          const ar=(ah>>16)&0xff,ag=(ah>>8)&0xff,ab=ah&0xff;
          const br=(bh>>16)&0xff,bg=(bh>>8)&0xff,bb=bh&0xff;
          const rr=Math.round(ar+(br-ar)*t),rg=Math.round(ag+(bg-ag)*t),rb=Math.round(ab+(bb-ab)*t);
          return '#'+[rr,rg,rb].map(x=>x.toString(16).padStart(2,'0')).join('');
        }
        const r=document.documentElement;
        r.style.setProperty('--n900',c.c900); r.style.setProperty('--n800',lerp(c.c900,c.c500,.15));
        r.style.setProperty('--n700',lerp(c.c900,c.c500,.30)); r.style.setProperty('--n600',lerp(c.c900,c.c500,.45));
        r.style.setProperty('--n500',c.c500); r.style.setProperty('--n400',lerp(c.c500,'#ffffff',.25));
        r.style.setProperty('--n300',lerp(c.c500,'#ffffff',.50)); r.style.setProperty('--n200',lerp(c.c500,'#ffffff',.72));
        r.style.setProperty('--n100',lerp(c.c500,'#ffffff',.86)); r.style.setProperty('--n050',lerp(c.c500,'#ffffff',.94));
        return;
      }
    }catch(e){}
  }
  const p = HC_PALETAS[nombre];
  if(!p) return;
  Object.entries(p).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
}

// ─── Marca dinámica (cargada desde GAS via acción getBrand) ───
let _brandNombre = '';
let _brandLogo   = '';   // base64 del logo, vacío = fallback texto

async function cargarBrand(){
  try{
    const u = new URL(HC_URL);
    u.searchParams.set('action','getBrand');
    const r = await fetch(u.toString());
    const d = await r.json();
    if(!d.ok) return;
    if(d.nombre) _brandNombre = d.nombre;
    if(d.logo)   _brandLogo   = d.logo;
    aplicarBrand();
  }catch(e){ console.warn('Brand load failed:',e); }
}

function aplicarBrand(){
  // 1. Header principal — logo (usa hdrLogoWrapHdr como contenedor estable)
  var hdrWrap = g('hdrLogoWrapHdr');
  if(hdrWrap){
    if(_brandLogo){
      // Crear imagen via DOM (sin onerror inline — evita errores de comillas anidadas)
      hdrWrap.textContent = '';
      hdrWrap.style.background = 'none';
      hdrWrap.style.padding = '0';
      hdrWrap.style.overflow = 'hidden';
      var img = document.createElement('img');
      img.src = _brandLogo;
      img.alt = 'Logo';
      img.style.cssText = 'width:34px;height:34px;object-fit:contain;border-radius:10px;display:block';
      img.onerror = function(){
        // Si la imagen falla, volver a mostrar iniciales
        hdrWrap.textContent = (_brandNombre||'HC').replace(/[^A-Za-z\u00C0-\u024F\s]/g,'')
          .split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase()||'HC';
        hdrWrap.style.background = 'linear-gradient(135deg,var(--n500),var(--purple))';
        hdrWrap.style.padding = '';
        hdrWrap.style.overflow = '';
      };
      hdrWrap.appendChild(img);
    } else {
      // Mostrar iniciales
      var ini = (_brandNombre||'HC').replace(/[^A-Za-z\u00C0-\u024F\s]/g,'')
        .split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase()||'HC';
      hdrWrap.textContent = ini;
      hdrWrap.style.background = 'linear-gradient(135deg,var(--n500),var(--purple))';
      hdrWrap.style.padding = '';
      hdrWrap.style.overflow = '';
    }
  }
  // 2. Header — nombre empresa
  var hdrNom = g('hdrNombreEmpresa');
  if(hdrNom) hdrNom.textContent = (_brandNombre||'HC') + ' · HC';
  // 3. Header — botón ← Empresa
  var hdrBtn = g('hdrBtnEmpresa');
  if(hdrBtn) hdrBtn.textContent = _brandNombre||'Inicio';
  // 4. Overlay de carga
  var ovEmp = g('overlayEmpresa');
  if(ovEmp) ovEmp.textContent = _brandNombre||'Historias Clínicas';
  // 5. Tarjeta de login — logo
  var lgWrap = g('lgLogoWrap');
  if(lgWrap){
    if(_brandLogo){
      lgWrap.textContent = '';
      lgWrap.style.background = 'none';
      lgWrap.style.padding = '0';
      lgWrap.style.overflow = 'hidden';
      var lgImg = document.createElement('img');
      lgImg.src = _brandLogo;
      lgImg.style.cssText = 'width:42px;height:42px;object-fit:contain;border-radius:10px;display:block';
      lgImg.onerror = function(){
        lgWrap.textContent = (_brandNombre||'HC').replace(/[^A-Za-z\u00C0-\u024F\s]/g,'')
          .split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase()||'HC';
        lgWrap.style.background = 'linear-gradient(135deg,var(--n500),var(--purple))';
        lgWrap.style.padding = '';
        lgWrap.style.overflow = '';
      };
      lgWrap.appendChild(lgImg);
    } else {
      var ini2 = (_brandNombre||'HC').replace(/[^A-Za-z\u00C0-\u024F\s]/g,'')
        .split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase()||'HC';
      lgWrap.textContent = ini2;
      lgWrap.style.background = 'linear-gradient(135deg,var(--n500),var(--purple))';
    }
  }
  // 6. Tarjeta de login — nombre
  var lgNom = g('lgNombreEmpresa');
  if(lgNom) lgNom.textContent = _brandNombre||'HC';
}

let cats = [], pacActivo = null, revTarget = null;


var _timerInterval = null;

function startTimerBanner(evalId, pacId, catId, startTime){
  timerGuardar(evalId, pacId, catId, startTime);
  if(_timerInterval) clearInterval(_timerInterval);
  var banner = g('hcTimerBanner');
  var countEl = g('hcTimerCount');
  if(banner) banner.style.display='block';

  function tick(){
    var remaining = TIMER_MS - (Date.now() - startTime);
    if(remaining <= 0){
      clearInterval(_timerInterval);
      _timerInterval = null;
      onTimerExpired(evalId, pacId);
      return;
    }
    var m = Math.floor(remaining/60000);
    var s = Math.floor((remaining%60000)/1000);
    if(countEl) countEl.textContent = String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  tick();
  _timerInterval = setInterval(tick, 1000);
}

function stopTimerBanner(){
  if(_timerInterval){ clearInterval(_timerInterval); _timerInterval=null; }
  timerBorrar();
  var banner=g('hcTimerBanner');
  if(banner) banner.style.display='none';
}

async function onTimerExpired(evalId, pacId){
  stopTimerBanner();
  var r = await apiPost({action:'cerrarPorTimer', id:evalId});
  if(r.ok){
    invalidarCache(['listarEvaluaciones','pendientesRevision','listarPacientes']);
    toast('⏰ Tiempo vencido','Tu evaluación fue cerrada. El docente asignará la nota.','warn');
    await delay(1500);
    if(pacId) abrirPac(pacId); else navTo('pac');
  }
}

function mostrarTimerModal(){
  var m=g('hcTimerModal');
  if(m){ m.style.display='flex'; }
}
function cerrarTimerModal(){
  var m=g('hcTimerModal');
  if(m){ m.style.display='none'; }
}

async function checkTimerOnInit(){
  var t = timerCargar();
  if(!t) return;
  // Verificar con el servidor si la evaluación sigue en borrador
  try{
    var remaining = TIMER_MS - (Date.now() - t.startTime);
    if(remaining <= 0){
      // Ya expiró — cerrar en servidor
      await onTimerExpired(t.evalId, t.pacId);
      return;
    }
    // Aún tiene tiempo — reanudar banner
    startTimerBanner(t.evalId, t.pacId, t.catId, t.startTime);
  }catch(e){ timerBorrar(); }
}
// ───────────────────────────────────────────────────────


// ─── Init ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',async()=>{
  cargarBrand(); // Carga logo y nombre desde GAS sin bloquear la UI
  const p=new URLSearchParams(location.search);
  const cred=p.get('cred');       // base64(codigo:pass) desde index
  const rolParam=p.get('rol')||'';
  const nombreParam=p.get('nombre')||'';
  const codigoParam=p.get('codigo')||'';
  // Limpiar URL para no exponer credenciales
  if(cred||rolParam) history.replaceState({},'',location.pathname);

  if(cred){
    // Login silencioso: decodificar cred y autenticar con el GAS del HC
    try{
      const dec=atob(cred);
      const col=dec.indexOf(':');
      if(col>0){
        const cod=dec.slice(0,col);
        const pass=dec.slice(col+1);
        g('lgPage').classList.add('on'); // mostrar pantalla de carga
        const r=await fetch(HC_URL+'?action=login&codigo='+encodeURIComponent(cod)+'&password='+encodeURIComponent(pass)).then(x=>x.json()).catch(()=>({ok:false}));
        if(r.ok){
          session={token:r.token,rol:r.rol,nombre:r.nombre||nombreParam,codigo:r.codigo||cod};
          saveSess(session);
          iniciarApp();
          return;
        } else {
          // Login falló — puede que el usuario no exista en el HC
          // Mostrar mensaje informativo en el login
          const err=g('lgErr');
          if(err){err.textContent='Tu usuario no existe en el sistema HC. Pide al administrador que te registre.';err.style.display='block';}
        }
      }
    }catch(e){ console.warn('Auto-login HC falló:',e); }
  }

  // Sin auto-login: intentar sesión guardada
  session=loadSess();
  if(session){ iniciarApp(); }
  else{
    var ov2=g('hcInitOverlay');
    if(ov2){ov2.style.transition='opacity .4s';ov2.style.opacity='0';setTimeout(function(){ov2.style.display='none';},400);}
    g('lgPage').classList.add('on');
  }
});

async function iniciarApp(){
  // Ocultar overlay de carga inicial
  var ov=g('hcInitOverlay');
  if(ov){ov.style.transition='opacity .4s';ov.style.opacity='0';setTimeout(function(){ov.style.display='none';},400);}
  g('lgPage').classList.remove('on');
  g('appPage').style.display='block';
  const hn=g('hdrNombre'); if(hn){hn.textContent=session.nombre||session.codigo;hn.style.display='';}
  const hr=g('hdrRol'); hr.textContent=session.rol; hr.className='rol-pill '+session.rol;
  if(session.rol==='admin'){
    g('sbAdminSec').style.display='block';
    var mn=g('mnAdmin'); if(mn) mn.style.display='flex';
  }
  const rc=await apiGet('listarCategorias');
  if(rc.ok) cats=rc.categorias||[];
  if(session.rol!=='estudiante') cargarBadge();
  if(session.rol!=='estudiante') iniciarPollingPendientes();
  if(session.rol==='estudiante') checkTimerOnInit();
  navTo('pac');
}

// ─── Nav ──────────────────────────────────────────────
const views=['vPac','vDetalle','vEvalForm','vSesForm','vPend','vBusqHC','vFirmas','vConfig','vExportHC'];
const sbs=['sbPac','sbPend','sbBusqHC','sbFirmas','sbConfig'];

function setMobileActive(id){
  ['mnPac','mnPend','mnBusq','mnAdmin'].forEach(function(b){
    var el=g(b); if(el) el.classList.remove('active');
  });
  var el=g(id); if(el) el.classList.add('active');
}
function navTo(v){
  views.forEach(x=>g(x).style.display='none');
  sbs.forEach(x=>{const e=g(x);if(e)e.classList.remove('active');});
  if(v==='pac'){g('vPac').style.display='block';g('sbPac').classList.add('active');renderPacs();}
  if(v==='pend'){g('vPend').style.display='block';g('sbPend')?.classList.add('active');renderPend();}
  if(v==='busqhc'){g('vBusqHC').style.display='block';g('sbBusqHC')?.classList.add('active');renderBusqHC();}
  if(v==='firmas'){g('vFirmas').style.display='block';g('sbFirmas')?.classList.add('active');renderFirmas();}
  if(v==='exporthc'){g('vExportHC').style.display='block';g('sbExportHC')?.classList.add('active');renderExportHC();}
  if(v==='config'){g('vConfig').style.display='block';g('sbConfig')?.classList.add('active');renderConfig();}
}

// ─── Helpers ──────────────────────────────────────────
function getCat(id){return cats.find(c=>c.id===id)||{nombre:id||'—',color:'#64748b',id};}
function catPill(id){const c=getCat(id);return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${e2(c.nombre)}</span>`;}
function bdg(estado){const m={borrador:'📝 Borrador',pendiente:'⏳ Pendiente',aprobada:'✓ Aprobada',rechazada:'✗ Rechazada',activo:'● Activo',vencida:'⏰ Vencida'};return `<span class="badge ${estado}">${m[estado]||estado}</span>`;}
// ─── Vista: Pacientes ─────────────────────────────────
function renderBusqHC(){
  var v=g('vBusqHC');
  v.innerHTML=`
    <div class="card-hdr">
      <div class="card-title">&#128269; Buscar Historia Cl&iacute;nica</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="form-grid">
        <div class="field form-full">
          <input class="inp" id="hcBusca" placeholder="Buscar por nombre, DNI o diagn&oacute;stico..." oninput="buscarHC()" style="font-size:14px">
        </div>
      </div>
    </div>
    <div id="hcResultados"><div class="empty">Escribe para buscar historias cl&iacute;nicas...</div></div>`;
}
async function buscarHC(){
  var q=(g('hcBusca')?.value||'').toLowerCase().trim();
  var box=g('hcResultados');
  if(!q||q.length<2){box.innerHTML='<div class="empty">Escribe al menos 2 caracteres...</div>';return;}
  box.innerHTML='<div class="loader">&#9203; Buscando...</div>';
  var r=await apiGet('listarPacientes');
  if(!r.ok){box.innerHTML='<div class="err-box">'+e2(r.error)+'</div>';return;}
  var pacs=(r.pacientes||[]).filter(function(p){
    return (p.nombre||'').toLowerCase().includes(q)
      ||(p.dni||'').includes(q)
      ||(p.dxFisio||'').toLowerCase().includes(q)
      ||(p.dxMedico||'').toLowerCase().includes(q);
  });
  if(!pacs.length){box.innerHTML='<div class="empty">Sin resultados para &ldquo;'+e2(q)+'&rdquo;</div>';return;}
  var html='<div style="font-size:12px;color:var(--tx4);margin-bottom:10px">'+pacs.length+' resultado'+(pacs.length!==1?'s':'')+' encontrado'+(pacs.length!==1?'s':'')+'</div><div class="pac-grid">';
  pacs.forEach(function(p){
    var cat=getCat(p.categoriaId);
    var ini=(p.nombre||'?').split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
    html+='<div class="pac-card" data-pid="'+e2(p.id)+'" style="cursor:pointer">'
      +'<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">'
      +'<div class="pac-avatar" style="background:'+cat.color+'33;color:'+cat.color+';border:1.5px solid '+cat.color+'55">'+ini+'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-weight:700;font-size:14px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+e2(p.nombre)+'</div>'
      +'<div style="font-size:11px;color:var(--tx3);margin-top:1px">'+e2(p.dni)+(p.fechaNac?' &middot; '+edad(p.fechaNac)+' a':'')+'</div>'
      +'<div style="margin-top:4px">'+catPill(p.categoriaId)+'</div>'
      +(p.dxFisio?'<div style="font-size:11px;color:var(--tx3);margin-top:3px">Dx: '+e2(p.dxFisio)+'</div>':'')
      +'</div>'+bdg(p.estado||'activo')+'</div>'
      +'<div style="font-size:11px;color:var(--tx4)">&#128203; '+(p.evalTotal||0)+' evaluaci'+(p.evalTotal===1?'ón':'ones')+'</div>'
      +'</div>';
  });
  html+='</div>';
  box.innerHTML=html;
  box.querySelectorAll('[data-pid]').forEach(function(el){
    el.addEventListener('click',function(){abrirPac(el.getAttribute('data-pid'));});
  });
}



function exportarDocumento(titulo, bodyHTML){
  var fullHTML = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
    +'<title>'+titulo+'</title>'
    +'<style>'
    +'*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'@page{size:A4;margin:10mm}'
    +'body{font-family:"Plus Jakarta Sans",Arial,sans-serif;font-size:12px;color:#0f172a;background:#fff;padding:24px}'
    +'@media print{body{padding:0}button{display:none}}'
    /* Cabecera del documento */
    +'.doc-header{display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #1e3a5f;padding-bottom:12px;margin-bottom:18px}'
    +'.doc-logo{font-family:sans-serif;font-weight:800;font-size:18px;color:#1e3a5f;letter-spacing:-0.5px}'
    /* Secciones */
    +'.sec{margin-bottom:14px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}'
    +'.sec-hdr{background:#1e3a5f;color:#fff;font-weight:700;font-size:11px;padding:8px 14px;text-transform:uppercase;letter-spacing:.5px}'
    +'.sec-body{padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 16px}'
    +'.sec-body.full{grid-template-columns:1fr}'
    +'.sec-body.cols2{grid-template-columns:1fr 1fr}'
    +'.sec-sub{grid-column:1/-1;font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.4px;margin:8px 0 4px;padding-bottom:4px;border-bottom:2px solid #dbeafe}'
    /* Campos — usados por row() y rowFull() en buildEvalHTML */
    +'.fld{display:flex;flex-direction:column;gap:2px}'
    +'.fld.full{grid-column:1/-1}'
    +'.fld-lbl,.field-lbl{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.3px}'
    +'.fld-val,.field-val{font-size:12px;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 9px;min-height:26px;word-break:break-word}'
    +'.fld-val.long,.field-val.long{white-space:pre-wrap;min-height:38px;color:#334155}'
    +'.fld-val.mono{font-family:monospace;font-weight:700;font-size:13px;color:#1d4ed8;text-align:center}'
    /* Tablas ROM / Fuerza */
    +'.tbl-rom{width:100%;border-collapse:collapse;font-size:11px}'
    +'.tbl-rom th{background:#eff6ff;color:#1e3a5f;padding:5px 8px;text-align:center;border:1px solid #e2e8f0;font-weight:700}'
    +'.tbl-rom td{border:1px solid #e2e8f0;padding:4px 8px;text-align:center}'
    /* Sello docente */
    +'.sello-doc{text-align:center;min-width:150px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:transparent}'
    /* Imágenes */
    +'img{max-width:100%;height:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'.sello-doc img{mix-blend-mode:multiply;background:transparent}'
    +'</style>'
    +'<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">'
    +'</head><body>'
    +'<div class="doc-header">'
    +'<div class="doc-logo">Historia Cl&iacute;nica Fisioterap&eacute;utica</div>'
    +'<div style="text-align:right;font-size:10px;color:#64748b">Generado: '
    +(function(){var n=new Date();var dd=String(n.getDate()).padStart(2,'0');var mm=String(n.getMonth()+1).padStart(2,'0');var yy=n.getFullYear();var h=n.getHours();var mi=String(n.getMinutes()).padStart(2,'0');var ap=h>=12?'PM':'AM';h=h%12||12;return dd+'/'+mm+'/'+yy+' '+h+':'+mi+' '+ap;})()
    +'</div></div>'
    +bodyHTML
    +'<div style="text-align:center;margin-top:24px">'
    +'<button onclick="window.print()" style="background:#1e3a5f;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Imprimir / Guardar PDF</button>'
    +'</div>'
    +'</body></html>';

  // Usar Blob URL para evitar bloqueo de popups con document.write
  try{
    var blob = new Blob([fullHTML], {type:'text/html;charset=utf-8'});
    var url  = URL.createObjectURL(blob);
    var w    = window.open(url, '_blank');
    if(!w){
      // Fallback: crear link de descarga
      var a = document.createElement('a');
      a.href = url;
      a.download = titulo + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Archivo descargado — ábrelo en el navegador para imprimir','','ok');
    }
    // Liberar blob después de 60s
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  } catch(err){
    // Fallback final: data URI
    var encoded = 'data:text/html;charset=utf-8,' + encodeURIComponent(fullHTML);
    var a = document.createElement('a');
    a.href = encoded;
    a.download = titulo + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

