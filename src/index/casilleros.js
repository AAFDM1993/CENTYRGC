// ── casilleros.js: casilleros + % extra + mejoría + paciente extra + alumno ──
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader, confirmDialog)
//             session.js (session)
//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)
//             log.js (mostrarCambioPass)

let casillerosTodos=[];
let _casignandoCodigo='';

async function cargarCasilleros(){
  const box=g('casillerosList');if(!box)return;
  box.innerHTML='<div class="empty">Cargando...</div>';
  try{
    const r=await apiGetCached('listarCasilleros');
    if(!r.ok)throw new Error(r.error);
    casillerosTodos=r.casilleros||[];
    const cnt=g('casCount');
    if(cnt)cnt.textContent='('+casillerosTodos.length+' total, '+(casillerosTodos.filter(x=>!x.alumnoCodigo).length)+' libres)';
    renderCasilleros(casillerosTodos);
  }catch(e){box.innerHTML='<div class="hint">Error: '+e.message+'</div>';}
}

function renderCasilleros(lista){
  const box=g('casillerosList');if(!box)return;
  const esAdmin=session&&session.rol==='admin';
  const esDocente=session&&session.rol==='docente';
  const puedeAsignar=esAdmin||esDocente;
  if(!lista.length){
    box.innerHTML='<div class="empty" style="grid-column:1/-1">Sin casilleros.'+(esAdmin?' Crea algunos arriba.':'')+'</div>';
    return;
  }
  box.innerHTML=lista.map(cas=>{
    const libre=!cas.alumnoCodigo;
    const bg    =libre?'var(--green2)':'var(--surf2)';
    const border=libre?'var(--green)':'var(--n300)';
    const txtc  =libre?'var(--green)':'var(--tx)';
    const estado=libre?'&#128994; Libre':'&#128309; Asignado';
    const alumInfo=libre?'':`
      <div class="cas-alumno" title="${esc2(cas.alumnoNombre||cas.alumnoCodigo)}">&#128100; ${cas.alumnoNombre||cas.alumnoCodigo}</div>
      ${cas.fechaAsignacion?`<div style="font-size:9px;color:var(--tx4);margin-top:1px">&#128197; ${cas.fechaAsignacion}</div>`:''}`;
    const delBtn=esAdmin?`<button class="cas-del" onclick="event.stopPropagation();eliminarCasillero('${esc(cas.codigo)}')" title="Eliminar">&#10005;</button>`:'';
    let btnAccion='';
    if(puedeAsignar && libre){
      btnAccion=`<button class="cas-asig-btn" onclick="abrirAsignarCasillero('${esc(cas.codigo)}')" style="background:var(--n500);border:1px solid var(--n500)">&#128100; Asignar</button>`;
    } else if(puedeAsignar && !libre){
      btnAccion=`
        <button class="cas-asig-btn" onclick="abrirAsignarCasillero('${esc(cas.codigo)}')" style="background:rgba(29,78,216,.12);border:1px solid rgba(29,78,216,.3);color:var(--n500)">&#128257; Reasignar</button>
        <button class="cas-asig-btn" onclick="devolverLlave('${esc(cas.codigo)}','${esc2(cas.alumnoNombre||cas.alumnoCodigo)}')" style="margin-top:3px;background:var(--red2);border:1px solid var(--red);color:var(--red)">&#128273; Devolver llave</button>`;
    }
    return `<div class="cas-card" style="background:${bg};border-color:${border}">
      ${delBtn}
      <div class="cas-code" style="color:${txtc}">${cas.codigo}</div>
      <div class="cas-estado" style="color:${libre?'var(--green)':'var(--tx3)'}">${estado}</div>
      ${alumInfo}
      ${btnAccion}
    </div>`;
  }).join('');
}
async function crearCasilleros(){
  const prefijo=(g('casPrefijo')?.value||'C').trim().toUpperCase();
  const desde=parseInt(g('casDesde')?.value||1);
  const hasta=parseInt(g('casHasta')?.value||10);
  if(isNaN(desde)||isNaN(hasta)||desde>hasta){toast('Rango inválido','','warn');return;}
  if(hasta-desde>99){toast('Máximo 100 a la vez','','warn');return;}
  const codigos=[];
  for(let i=desde;i<=hasta;i++) codigos.push(prefijo+'-'+String(i).padStart(2,'0'));
  showLoader('Creando casilleros...');
  try{
    const r=await apiPost({action:'crearCasilleros',codigos});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast(r.creados+' creados','','ok');
    invalidateCache('listarCasilleros');
    cargarCasilleros();
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}

async function eliminarCasillero(codigo){
  if(!await confirmDialog('¿Eliminar casillero '+codigo+'?'))return;
  showLoader('Eliminando...');
  try{
    const r=await apiPost({action:'eliminarCasillero',codigo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Casillero eliminado','','ok');
    invalidateCache('listarCasilleros');
    cargarCasilleros();
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}

async function abrirAsignarCasillero(codigo){
  _casignandoCodigo=codigo;
  var cas=casillerosTodos.find(function(x){return x.codigo===codigo;});
  var m=g('modalAsignarCasillero');if(!m)return;
  var libre=!cas||!cas.alumnoCodigo;
  var tit=g('modalCasTitulo');
  if(tit)tit.textContent=(libre?'Asignar':'Reasignar')+' Casillero '+codigo;
  var info=g('modalCasInfo');
  if(info)info.textContent=libre?'':(cas.alumnoNombre||cas.alumnoCodigo)+' ('+cas.alumnoCodigo+')';
  g('inputAlumnoCod').value='';g('inputAlumnoNom').value='';
  var bsr=g('buscarAlumnoModal');if(bsr)bsr.value='';
  var lb=g('listaAlumnosModal');
  if(lb)lb.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Escribe para buscar...</div>';
  var sB=g('alumnoSelBox');if(sB)sB.style.display='none';
 m.style.display='flex';
  var lb=g('listaAlumnosModal');
  if(lb) lb.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Cargando alumnos...</div>';
  cargarAlumnosDatalist().then(function(){
    var lb2=g('listaAlumnosModal');
    if(lb2) lb2.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Escribe para buscar...</div>';
    var b=g('buscarAlumnoModal');if(b)b.focus();
  });
}

var _alumnosModal=[];
async function cargarAlumnosDatalist(){
  try{
    var r=await apiGetCached('listarUsuarios');
    if(!r.ok||!r.usuarios){ toast('Error al cargar alumnos', r.error||'Sin datos', 'err'); return; }
    _alumnosModal=r.usuarios.filter(function(u){return u.rol==='estudiante';});
  }catch(e){ toast('Error al cargar alumnos', e.message, 'err'); }
}
function filtrarAlumnosModal(){
  var q=(g('buscarAlumnoModal')?g('buscarAlumnoModal').value:'').toLowerCase().trim();
  var box=g('listaAlumnosModal');if(!box)return;
  if(!q){box.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Escribe para buscar...</div>';return;}
  var f=_alumnosModal.filter(function(u){
    return (u.codigo||'').toLowerCase().indexOf(q)>=0||(u.nombre||'').toLowerCase().indexOf(q)>=0;
  });
  if(!f.length){box.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Sin resultados</div>';return;}
  box.innerHTML=f.map(function(u){
    var c2=String(u.codigo||'').replace(/&/g,'&amp;');
    var n2=String(u.nombre||u.codigo).replace(/&/g,'&amp;');
    return '<div onclick="selAlumnoModal(this.dataset.cod,this.dataset.nom)"'
      +' data-cod="'+c2+'" data-nom="'+n2+'"'
      +' style="padding:10px 14px;border-bottom:1px solid var(--bd2);cursor:pointer"'
      +' onmouseover="this.style.background=\'var(--n050)\'" onmouseout="this.style.background=\'\'">'+
      '<div style="font-size:13px;font-weight:600;color:var(--tx)">'+n2+'</div>'
      +'<div style="font-size:11px;color:var(--tx3)">'+c2+'</div></div>';
  }).join('');
}
function selAlumnoModal(codigo,nombre){
  g('inputAlumnoCod').value=codigo;g('inputAlumnoNom').value=nombre;
  var box=g('alumnoSelBox');if(box)box.style.display='block';
  var n=g('alumnoSelNombre');if(n)n.textContent=nombre;
  var cd=g('alumnoSelCodigo');if(cd)cd.textContent='Cod: '+codigo;
  var bsr=g('buscarAlumnoModal');if(bsr)bsr.value='';
  var lb=g('listaAlumnosModal');if(lb)lb.innerHTML='<div style="padding:10px 14px;color:var(--n500);font-size:12px;font-weight:700">'+nombre+' seleccionado</div>';
}

function cerrarModalCasillero(){
  var m=g('modalAsignarCasillero');if(m)m.style.display='none';
  _casignandoCodigo='';_alumnosModal=[];
  var bsr=g('buscarAlumnoModal');if(bsr)bsr.value='';
  var sB=g('alumnoSelBox');if(sB)sB.style.display='none';
}

async function devolverLlave(codigo, alumnoInfo){
  if(!await confirmDialog('🔑 Devolver llave del casillero '+codigo+'?\n\nAlumno: '+alumnoInfo+'\n\nEl casillero quedará disponible para otro alumno.'))return;
  showLoader('Liberando casillero...');
  try{
    const r=await apiPost({action:'asignarCasillero',codigo,alumnoCodigo:'',alumnoNombre:'',asignadoPor:session.nombre||session.codigo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Casillero '+codigo+' liberado','Llave devuelta - disponible','ok');
    // Actualizar en memoria y re-renderizar inmediatamente
    var idx=casillerosTodos.findIndex(function(x){return x.codigo===codigo;});
    if(idx>=0){casillerosTodos[idx]=Object.assign({},casillerosTodos[idx],{alumnoCodigo:'',alumnoNombre:'',fechaAsignacion:''});}
    renderCasilleros(casillerosTodos);
    var cnt=g('casCount');
    if(cnt)cnt.textContent='('+casillerosTodos.length+' total, '+(casillerosTodos.filter(function(x){return !x.alumnoCodigo;}).length)+' libres)';
    // Refrescar vista de estudiante si está visible
    if(g('casEstGrid')&&g('secEstCasilleros')&&g('secEstCasilleros').style.display!=='none'){
      invalidateCache('listarCasilleros');cargarCasillerosSoloLectura();
    } else {
      invalidateCache('listarCasilleros');
    }
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}
async function confirmarAsignacion(){
  const alumnoCod=(g('inputAlumnoCod')?.value||'').trim();
  const alumnoNom=(g('inputAlumnoNom')?.value||'').trim();
  if(!alumnoCod){
    toast('Selecciona un alumno','Usa el buscador','warn');
    var b=g('buscarAlumnoModal');if(b)b.focus();return;
  }
  showLoader('Asignando...');
  try{
    const r=await apiPost({action:'asignarCasillero',codigo:_casignandoCodigo,alumnoCodigo:alumnoCod,alumnoNombre:alumnoNom,asignadoPor:session.nombre||session.codigo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Casillero asignado','','ok');
    // Actualizar en memoria y re-renderizar inmediatamente
    var idx=casillerosTodos.findIndex(function(x){return x.codigo===_casignandoCodigo;});
    if(idx>=0){casillerosTodos[idx]=Object.assign({},casillerosTodos[idx],{alumnoCodigo:alumnoCod,alumnoNombre:alumnoNom,fechaAsignacion:new Date().toLocaleDateString('es-PE')});}
    cerrarModalCasillero();
    renderCasilleros(casillerosTodos);
    var cnt=g('casCount');
    if(cnt)cnt.textContent='('+casillerosTodos.length+' total, '+(casillerosTodos.filter(function(x){return !x.alumnoCodigo;}).length)+' libres)';
    // Refrescar vista de estudiante si está visible
    if(g('casEstGrid')&&g('secEstCasilleros')&&g('secEstCasilleros').style.display!=='none'){
      invalidateCache('listarCasilleros');cargarCasillerosSoloLectura();
    } else {
      invalidateCache('listarCasilleros');
    }
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}

g('modalAsignarCasillero')&&g('modalAsignarCasillero').addEventListener('click',function(e){if(e.target===this)cerrarModalCasillero();});

async function cargarCasillerosSoloLectura(){
  var box=g('casEstGrid');if(!box)return;
  box.innerHTML='<div style="padding:8px;color:var(--tx4);font-size:12px">Cargando...</div>';
  try{
    var r=await apiGetCached('listarCasilleros');
    if(!r.ok)throw new Error(r.error);
    var lista=r.casilleros||[];
    if(!lista.length){box.innerHTML='<div style="padding:8px;color:var(--tx4);font-size:12px">Sin casilleros</div>';return;}
    var miCod=(session.codigo||'').toLowerCase();
    box.innerHTML=lista.map(function(cas){
      var libre=!cas.alumnoCodigo,esMio=!libre&&cas.alumnoCodigo.toLowerCase()===miCod;
      var bg=esMio?'var(--n500)':libre?'var(--green2)':'var(--surf2)';
      var brd=esMio?'var(--n400)':libre?'var(--green)':'var(--bd)';
      var tc=esMio?'#fff':libre?'var(--green)':'var(--tx3)';
      var lbl=esMio?'Mi casillero':libre?'Libre':'Ocupado';
      var lc=esMio?'rgba(255,255,255,.8)':libre?'var(--green)':'var(--tx4)';
      return '<div style="background:'+bg+';border:1px solid '+brd+';border-radius:10px;padding:10px 6px;text-align:center">'
        +'<div style="font-family:monospace;font-size:15px;font-weight:800;color:'+tc+'">'+cas.codigo+'</div>'
        +'<div style="font-size:10px;color:'+lc+';margin-top:3px">'+lbl+'</div></div>';
    }).join('');
  }catch(e){box.innerHTML='<div style="padding:8px;color:var(--red);font-size:12px">Error: '+e.message+'</div>';}
}
function cargarCasilleroEstudiante(){}

// ── EDITAR % EXTRA GLOBAL (toda la hoja) ─────────────────
let _pctExtraCtx = null;

function editarPctExtraGlobal(){
  if(!hojaActiva||!hojaData){ toast('Abre una hoja primero','','warn'); return; }
  let pctActual = 20;
  outer: for(const al of hojaData.alumnos){
    for(const cu of al.cursos||[]){
      for(const sg of cu.subgrupos||[]){
        if(sg.pctExtra !== undefined){ pctActual = sg.pctExtra; break outer; }
      }
    }
  }
  const sub = g('pctExtraModalSub');
  if(sub) sub.textContent = 'Se aplicará a todos los subgrupos de: ' + hojaActiva;
  const inp = g('pctExtraInput');
  if(inp) inp.value = pctActual;
  const err = g('pctExtraErr');
  if(err){ err.style.display='none'; err.textContent=''; }
  const m = g('pctExtraModal');
  if(m) m.style.display='flex';
  setTimeout(()=>{ const i=g('pctExtraInput'); if(i){i.focus();i.select();} }, 100);
}

function cerrarPctExtraModal(){
  const m = g('pctExtraModal');
  if(m) m.style.display='none';
}

async function guardarPctExtra(){
  const val = parseInt(g('pctExtraInput').value);
  const err = g('pctExtraErr');
  if(isNaN(val)||val<0||val>100){
    err.textContent='Ingresa un valor entre 0 y 100';
    err.style.display='block'; return;
  }
  showLoader('Actualizando % continuación en toda la hoja...');
  try{
    const r = await apiPost({
      action: 'guardarPctExtraGlobal',
      hoja: hojaActiva,
      pctExtra: val
    });
    hideLoader();
    if(!r.ok) throw new Error(r.error||'Error al guardar');
    if(hojaData){
      hojaData.alumnos.forEach((al,ai)=>{
        (al.cursos||[]).forEach((cu,ci)=>{
          (cu.subgrupos||[]).forEach((sg,si)=>{
            sg.pctExtra = val;
            const badge = g('pctBadge_'+ai+'_'+ci+'_'+si);
            if(badge) badge.textContent = val+'% cont.';
          });
        });
      });
    }
    toast('% continuación actualizado', val+'% en toda la hoja', 'ok');
    cerrarPctExtraModal();
  }catch(e){
    hideLoader();
    err.textContent = e.message;
    err.style.display = 'block';
  }
}

g('pctExtraModal')&&g('pctExtraModal').addEventListener('click',function(e){
  if(e.target===this) cerrarPctExtraModal();
});

// ── MEJORÍA Y PACIENTE EXTRA ──────────────────────────────
function preguntarMejoria(pac, curso, sgr, sesion){
  return new Promise(resolve=>{
    const m = g('mejoriaModal');
    const sub = g('mejoriaModalSub');
    if(sub) sub.textContent = curso+' · '+sgr+' · '+pac+' · Sesión '+sesion;
    if(m){
      m.style.display='flex';
      m._resolve = resolve;
    } else {
      resolve(true);
    }
  });
}

function responderMejoria(huboMejoria){
  const m = g('mejoriaModal');
  if(m){
    m.style.display='none';
    if(m._resolve) m._resolve(huboMejoria);
    m._resolve = null;
  }
}

async function ofrecerPacienteExtra(alumno, curso, sgr, notasBase, notasExtra, inp, pacVinculado){
  // Si ya sabemos el PAC vinculado, crear el PACX automáticamente sin modal
  if(pacVinculado){
    showLoader('Agregando atención de continuación...');
    try{
      const r = await apiPost({
        action: 'agregarPacienteExtra',
        hoja: hojaActiva,
        alumno, curso, subgrupo: sgr,
        notasBase, notasExtra,
        pacVinculado
      });
      hideLoader();
      if(!r.ok) throw new Error(r.error);
      toast('Atención de continuación agregada automáticamente','Recargando editor...','ok');
      setTimeout(()=>abrirHoja(hojaActiva), 600);
    }catch(e){
      hideLoader();
      toast('Error al agregar atención de continuación', e.message, 'err');
    }
    return;
  }

  // Si hay múltiples PAC sin PACX, mostrar modal para seleccionar
  const m   = g('pacExtraModal');
  const sub = g('pacExtraModalSub');
  if(sub) sub.textContent = alumno+' · '+curso+' · '+sgr;

  const pacientes = [];
  if(hojaData){
    const al = hojaData.alumnos.find(a=>a.nombre===alumno);
    if(al){
      const cu = (al.cursos||[]).find(c=>c.nombre===curso);
      if(cu){
        const sg2 = (cu.subgrupos||[]).find(s=>s.nombre===sgr);
        if(sg2){
          (sg2.pacientes||[]).forEach(p=>{
            if(p.label.indexOf('PACX')<0) pacientes.push(p.label);
          });
        }
      }
    }
  }

  const selectorBox = g('pacExtraModalSelector');
  if(selectorBox){
    if(pacientes.length > 1){
      selectorBox.innerHTML = `
        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.7px;display:block;margin-bottom:6px">
            ¿A qué paciente está vinculada esta continuación?
          </label>
          <select id="pacExtraSelector" class="sel" style="font-size:13px">
            ${pacientes.map(p=>`<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>`;
      selectorBox.style.display = 'block';
    } else {
      selectorBox.style.display = 'none';
    }
  }

  if(m){
    m.style.display='flex';
    m._ctx = {alumno, curso, sgr, notasBase, notasExtra,
               pacVinculado: pacientes.length === 1 ? pacientes[0] : null};
  }
}

function cerrarPacExtraModal(){
  const m = g('pacExtraModal');
  if(m){ m.style.display='none'; m._ctx=null; }
}

async function confirmarPacienteExtra(){
  const m = g('pacExtraModal');
  if(!m||!m._ctx) return;
  const {alumno, curso, sgr, notasBase, notasExtra} = m._ctx;
  const pacVinculado = m._ctx.pacVinculado ||
    (g('pacExtraSelector') ? g('pacExtraSelector').value : null);
  cerrarPacExtraModal();
  showLoader('Agregando atención de continuación...');
  try{
    const r = await apiPost({
      action: 'agregarPacienteExtra',
      hoja: hojaActiva,
      alumno, curso, subgrupo: sgr,
      notasBase, notasExtra,
      pacVinculado: pacVinculado
    });
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    toast('Atención de continuación agregada','Recargando editor...','ok');
    setTimeout(()=>abrirHoja(hojaActiva), 600);
  }catch(e){
    hideLoader();
    toast('Error al agregar atención de continuación', e.message, 'err');
  }
}

async function actualizarTodasPlanillas(){
  if(!await confirmDialog('¿Actualizar las fórmulas y etiquetas de TODAS las planillas existentes?\nEsto no borra notas, solo actualiza la estructura.')) return;
  showLoader('Actualizando todas las planillas...');
  try{
    const r = await apiPost({action:'actualizarPlanillas'});
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    const errTxt = r.errores&&r.errores.length ? '\nErrores: '+r.errores.join(', ') : '';
    toast(r.actualizadas+' planillas actualizadas', errTxt||'Sin errores', 'ok');
  }catch(e){
    hideLoader();
    toast('Error al actualizar', e.message, 'err');
  }
}

function abrirPassModal(){ mostrarCambioPass(); }
   // ── AGREGAR ALUMNO TARDÍO ─────────────────────────────
let _agregarAlumnoCtx = null;

async function abrirModalAgregarAlumno(){
  if(!hojaActiva||!hojaData){ toast('Abre una hoja primero','','warn'); return; }
  const m = g('modalAgregarAlumno');
  const sub = g('modalAgregarAlumnoHoja');
  if(sub) sub.textContent = hojaActiva;
  g('newAlCodigo').value='';
  g('newAlNombre').value='';
  const err = g('newAlErr'); if(err) err.style.display='none';

  // Obtener lista de cursos únicos de la hoja
  const cursosUnicos = [];
  if(hojaData.alumnos && hojaData.alumnos.length){
    hojaData.alumnos[0].cursos.forEach(cu => {
      cursosUnicos.push(cu.nombre);
    });
  }

  const box = g('newAlCursosList');
  if(box){
    box.innerHTML = cursosUnicos.map((cn,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--bd2)">
        <input type="checkbox" id="newAlCurso_${i}" value="${esc2(cn)}" checked
          style="width:15px;height:15px;cursor:pointer;accent-color:var(--n500)">
        <label for="newAlCurso_${i}" style="font-size:13px;font-weight:600;color:var(--tx);cursor:pointer">${cn}</label>
      </div>`).join('');
  }

  _agregarAlumnoCtx = { cursos: cursosUnicos };
  if(m) m.style.display='flex';
  setTimeout(()=>g('newAlCodigo').focus(), 100);
}

function cerrarModalAgregarAlumno(){
  const m = g('modalAgregarAlumno');
  if(m) m.style.display='none';
  _agregarAlumnoCtx = null;
}

async function confirmarAgregarAlumno(){
  const codigo = g('newAlCodigo').value.trim();
  const nombre = g('newAlNombre').value.trim();
  const err    = g('newAlErr');
  if(!nombre){ err.textContent='El nombre es requerido'; err.style.display='block'; return; }

  // Recoger cursos seleccionados
  const cursosSeleccionados = [];
  if(_agregarAlumnoCtx){
    _agregarAlumnoCtx.cursos.forEach((cn,i) => {
      const cb = document.getElementById('newAlCurso_'+i);
      if(cb && cb.checked) cursosSeleccionados.push(cn);
    });
  }
  if(!cursosSeleccionados.length){
    err.textContent='Selecciona al menos un curso'; err.style.display='block'; return;
  }

  showLoader('Agregando alumno...');
  try{
    const r = await apiPost({
      action: 'agregarAlumnoHoja',
      hoja: hojaActiva,
      codigo, nombre,
      cursos: cursosSeleccionados
    });
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    toast('Alumno agregado', nombre, 'ok');
    cerrarModalAgregarAlumno();
    await abrirHoja(hojaActiva); // recargar editor
  }catch(e){
    hideLoader();
    err.textContent = e.message; err.style.display='block';
  }
}

// ── ELIMINAR PACX ─────────────────────────────────────
async function eliminarPacX(alumno, curso, sgr, pacLabel){
  if(!await confirmDialog('¿Eliminar '+pacLabel+' de '+alumno+'?\nEsto eliminará la fila de atención de continuación y no se puede deshacer.')) return;
  showLoader('Eliminando...');
  try{
    const r = await apiPost({
      action: 'eliminarPacX',
      hoja: hojaActiva,
      alumno, curso, subgrupo: sgr,
      pacLabel
    });
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    toast('PACX eliminado','','ok');
    await abrirHoja(hojaActiva);
  }catch(e){
    hideLoader();
    toast('Error', e.message, 'err');
  }
}
// ════════════════════════════════════════════════════════
// VISTA RECEPCIÓN
// ════════════════════════════════════════════════════════
