// Gestión de pacientes: listado, fichas, evaluaciones, sesiones, revisiones, CRUD

async function renderPacs(){
  if(!window._pacVista) window._pacVista='grid';
  g('vPac').innerHTML=`
    <div class="card-hdr">
      <div><div class="card-title">Pacientes</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="position:relative;width:200px">
          <input class="inp" id="filtroAlumnoInput" placeholder="🔍 Buscar alumno..." oninput="filtrarAlumnosDropdown()" autocomplete="off" style="width:100%">
          <div id="filtroAlumnoDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;max-height:200px;overflow-y:auto;margin-top:4px"></div>
        </div>
        <input class="inp" id="fBusca" placeholder="🔍 Buscar paciente..." oninput="filtrarPacs()" style="width:180px">
        <div style="display:flex;gap:4px;border:1px solid var(--bd);border-radius:10px;overflow:hidden;flex-shrink:0">
          <button id="btnVistaGrid" onclick="setPacVista('grid')" title="Vista cuadrícula"
            style="padding:6px 10px;border:none;cursor:pointer;font-size:14px;background:${window._pacVista==='grid'?'var(--n100)':'transparent'};color:${window._pacVista==='grid'?'var(--n500)':'var(--tx4)'}">⊞</button>
          <button id="btnVistaLista" onclick="setPacVista('lista')" title="Vista lista"
            style="padding:6px 10px;border:none;cursor:pointer;font-size:14px;background:${window._pacVista==='lista'?'var(--n100)':'transparent'};color:${window._pacVista==='lista'?'var(--n500)':'var(--tx4)'}">☰</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="abrirModalCategoria()">+ Nuevo paciente</button>
      </div>
    </div>
    <div id="pacBox"><div class="loader">Cargando...</div></div>`;
  
  // Cargar pacientes
  const r=await apiGet('listarPacientes');
  if(!r.ok){g('pacBox').innerHTML=`<div class="err-box">${e2(r.error)}</div>`;return;}
  window._pacs=r.pacientes||[];
  
  // Cargar alumnos para el dropdown
  const rAlumnos=await apiGet('listarUsuarios');
  if(rAlumnos.ok && rAlumnos.usuarios){
    window._alumnosList=(rAlumnos.usuarios||[]).filter(u=>u.rol==='estudiante');
  }
  
  filtrarPacs();
}

function filtrarAlumnosDropdown(){
  const q=(g('filtroAlumnoInput')?.value||'').toLowerCase().trim();
  const dd=g('filtroAlumnoDD');
  if(!dd) return;
  
  if(!q){
    dd.style.display='none';
    return;
  }
  
  const alumnos=(window._alumnosList||[]).filter(a=>{
    return (a.nombre||'').toLowerCase().includes(q) || (a.codigo||'').toLowerCase().includes(q);
  });
  
  if(!alumnos.length){
    dd.innerHTML='<div style="padding:12px;text-align:center;color:var(--tx4);font-size:12px">Sin resultados</div>';
    dd.style.display='block';
    return;
  }
  
  dd.innerHTML=alumnos.map(a=>`
    <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--bd2);transition:background .15s" 
         onmouseover="this.style.background='var(--surf3)'" 
         onmouseout="this.style.background='transparent'"
         onclick="seleccionarAlumno('${esc(a.codigo)}','${esc(a.nombre)}','${esc(a.codigo)}')">
      <div style="font-weight:600;color:var(--tx)">${e2(a.nombre)}</div>
      <div style="font-size:11px;color:var(--tx3);font-family:'DM Mono',monospace">${e2(a.codigo)}</div>
    </div>
  `).join('');
  dd.style.display='block';
}

function seleccionarAlumno(codigo, nombre, codigoDisplay){
  g('filtroAlumnoInput').value=nombre+' ('+codigoDisplay+')';
  g('filtroAlumnoDD').style.display='none';
  window._alumnoCodigoSeleccionado=codigo;
  filtrarPacs();
}

function setPacVista(v){
  window._pacVista=v;
  var bg=g('btnVistaGrid'),bl=g('btnVistaLista');
  if(bg){bg.style.background=v==='grid'?'var(--n100)':'transparent';bg.style.color=v==='grid'?'var(--n500)':'var(--tx4)';}
  if(bl){bl.style.background=v==='lista'?'var(--n100)':'transparent';bl.style.color=v==='lista'?'var(--n500)':'var(--tx4)';}
  filtrarPacs();
}

function filtrarPacs(){
  const q=(g('fBusca')?.value||'').toLowerCase();
  const alumnoCodigoSeleccionado=window._alumnoCodigoSeleccionado||'';

  const lista=(window._pacs||[]).filter(p=>{
    const mq=!q||(p.nombre||'').toLowerCase().includes(q)||(p.dni||'').includes(q);
    const ma=!alumnoCodigoSeleccionado||p.asignadoA===alumnoCodigoSeleccionado;
    return mq && ma;
  });

  const box=g('pacBox');if(!box)return;
  if(!lista.length){box.innerHTML='<div class="empty">Sin pacientes. Usa "+ Nuevo" para crear el primero.</div>';return;}

  const vista=window._pacVista||'grid';

  if(vista==='lista'){
    box.innerHTML='<div style="display:flex;flex-direction:column;gap:6px">'
      +lista.map(p=>{
        const c=getCat(p.categoriaId);
        const ini=(p.nombre||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
        return `<div style="background:var(--surf);border:1px solid var(--bd2);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color .15s" onclick="abrirPac('${esc(p.id)}')" onmouseover="this.style.borderColor='var(--n300)'" onmouseout="this.style.borderColor='var(--bd2)'">
          <div class="pac-avatar" style="flex-shrink:0;background:${c.color}33;color:${c.color};border:1.5px solid ${c.color}55">${ini}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px;color:var(--n900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e2(p.nombre)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap">
              <span style="font-size:11px;color:var(--tx4);font-family:'DM Mono',monospace">${e2(p.dni)}</span>
              ${p.fechaNac?`<span style="font-size:11px;color:var(--tx4)">${edad(p.fechaNac)} a</span>`:''}
              ${catPill(p.categoriaId)}
              ${bdg(p.estado||'activo')}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;font-size:11px;color:var(--tx4);flex-shrink:0">
            ${p.evalTotal>0?`<span>${p.evalTotal} eval</span>`:''}
            ${p.evalPendiente>0?`<span style="color:var(--amber)">${p.evalPendiente} pend</span>`:''}
            ${p.evalAprobada>0?`<span style="color:var(--green)">✓${p.evalAprobada}</span>`:''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();abrirPac('${esc(p.id)}')">👁️ Ver</button>
            ${session.rol==='admin'?`<button class="btn btn-danger btn-sm" title="Eliminar" onclick="event.stopPropagation();eliminarPac('${esc(p.id)}','${esc(p.nombre)}')">🗑️</button>`:''}
          </div>
        </div>`;
      }).join('')+'</div>';
  } else {
    box.innerHTML=`<div class="pac-grid">${lista.map(p=>{
      const c=getCat(p.categoriaId);
      const ini=(p.nombre||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      return `<div class="pac-card" onclick="abrirPac('${esc(p.id)}')">
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
          <div class="pac-avatar" style="background:${c.color}33;color:${c.color};border:1.5px solid ${c.color}55">${ini}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:var(--n900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e2(p.nombre)}</div>
            <div style="font-size:11px;color:var(--tx3);font-family:'DM Mono',monospace;margin-top:1px">${e2(p.dni)} ${p.fechaNac?'· '+edad(p.fechaNac)+' a':''}</div>
            <div style="margin-top:6px">${catPill(p.categoriaId)}</div>
          </div>
          ${bdg(p.estado||'activo')}
        </div>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--tx3);margin-bottom:8px">
          <span>${p.evalTotal||0} eval</span>
          ${p.evalPendiente>0?`<span style="color:var(--amber)">${p.evalPendiente} pend</span>`:''}
          ${p.evalAprobada>0?`<span style="color:var(--green)">✓ ${p.evalAprobada}</span>`:''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center" onclick="event.stopPropagation();abrirPac('${esc(p.id)}')">👁️ Ver historia clínica</button>
          ${session.rol==='admin'?`<button class="btn btn-danger btn-sm" title="Eliminar esta atención" onclick="event.stopPropagation();eliminarPac('${esc(p.id)}','${esc(p.nombre)}')">🗑️</button>`:''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }
}

// ─── Formulario Paciente ──────────────────────────────
async function abrirFrmPac(pac=null, preCatId=null, preCatNombre=null){
  const catId = pac?.categoriaId || preCatId || '';
  const catNom = preCatNombre || getCat(catId).nombre || '';
  views.forEach(v=>g(v).style.display='none');
  const v=g('vEvalForm'); v.style.display='block';

  // Cargar lista de docentes
  var docentesHC=[];
  try{const ru=await apiGet('listarUsuarios');docentesHC=(ru.usuarios||[]).filter(u=>u.rol==='docente');}catch(e){}
  window._docentesHCList=docentesHC;
  // Docente previo: si viene de una eval existente, recuperar
  const docenteHCActual=pac?.docenteEval||'';

  // Mostrar selector docente solo a estudiantes (docentes/admin se guardan directamente)
  const esEstudiante=session.rol==='estudiante';
  const docSelectorHTML = `
    <div class="card" style="margin-bottom:14px;padding:14px 18px;border:2px solid var(--bd2)">
      <div class="form-grid">
        <div class="field"><label>Estudiante</label>
          <input class="inp" id="hcEst" value="${e2(session.nombre||session.codigo)}" readonly style="background:var(--surf2);cursor:default"></div>
        <div class="field"><label>Docente supervisor${esEstudiante?' *':''}</label>
          <div style="position:relative">
            <input class="inp" id="hcDocInput" placeholder="Buscar docente..." value="${e2(docenteHCActual)}" oninput="filtrarDocentesHC(this.value)" autocomplete="off">
            <div id="hcDocenteDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;max-height:180px;overflow-y:auto;margin-top:4px"></div>
          </div>
          <input type="hidden" id="hcDoc" value="${e2(docenteHCActual)}">
          <input type="hidden" id="hcDocCodigo" value="">
        </div>
      </div>
    </div>`;

  // Botones según rol
  const btnsBorrador=`<button class="btn btn-ghost btn-sm" onclick="guardarHC('${esc(catId)}','${pac?esc(pac.id):''}','borrador')">💾 Guardar borrador</button>`;
  const btnsEnviar=esEstudiante
    ? `<button class="btn btn-primary" onclick="guardarHC('${esc(catId)}','${pac?esc(pac.id):''}','enviar')">📤 Enviar al docente</button>`
    : `<button class="btn btn-primary" onclick="guardarHC('${esc(catId)}','${pac?esc(pac.id):''}','enviar')">✅ Guardar y aprobar</button>`;

  v.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="navTo('pac')">← Volver</button>
      <div>
        <div class="card-title">${pac?'Editar':'Nueva historia clínica'}</div>
        <div style="font-size:12px;color:var(--tx3);margin-top:2px">${catPill(catId)} ${e2(catNom)}</div>
      </div>
    </div>
    ${docSelectorHTML}
    <input type="hidden" id="pC" value="${catId}">
    <input type="hidden" id="hcPacId" value="${pac?.id||''}">
    <input type="hidden" id="hcEvalId" value="${pac?._evalId||''}">
    ${plantillaHTML(catId, pac)}
    <!-- ── Consentimiento Informado ─────────────────────── -->
    <div class="card" style="margin:14px 0;padding:14px 18px">
      <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.4px">📄 Consentimiento Informado</div>
      <div id="consentBox" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <input type="file" id="consentFile" accept=".jpg,.jpeg,.png,.webp"
          style="display:none" onchange="subirConsentimientoUI(this,document.getElementById('hcEvalId')?.value||'')" name="consentFile">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('consentFile').click()">⬆ Subir imagen</button>
        <span id="consentStatus" style="font-size:12px;color:var(--tx3)">Sin archivo</span>
        <button id="consentVerBtn" class="btn btn-ghost btn-sm" style="display:none"
          onclick="verConsentimientoUI(document.getElementById('hcEvalId')?.value||'')">👁 Ver</button>
        <button id="consentDelBtn" class="btn btn-ghost btn-sm" style="display:none;color:#ef4444"
          onclick="eliminarConsentimientoUI(document.getElementById('hcEvalId')?.value||'')">🗑 Quitar</button>
      </div>
    </div>
    <div class="btn-group" style="margin-top:20px;padding-bottom:40px;position:sticky;bottom:0;background:var(--surf2);padding:14px 0 14px;border-top:1px solid var(--bd);z-index:10">
      <button class="btn btn-ghost" onclick="navTo('pac')">✕ Cancelar</button>
      ${btnsBorrador}
      ${btnsEnviar}
    </div>`;
  // Activar acordeones
  v.querySelectorAll('.hc-sec-hdr').forEach(h=>{
    h.onclick=()=>{
      const b=h.nextElementSibling;
      const chv=h.querySelector('.chv');
      b.classList.toggle('open');
      if(chv)chv.classList.toggle('open');
      if(b.classList.contains('open')){
        const mnt=b.querySelector('#wpost_mount');
        if(mnt&&!mnt.hasChildNodes()&&window.wpostMount) window.wpostMount();
        if(b.querySelector('#plantigrafia_img')&&window._plantigrafiaPendingFileId) _inicializarPlantigrafia();
      }
    };
  });
  // Cerrar dropdown al click fuera
  setTimeout(function(){
    document.addEventListener('click',function _hcDDClose(e){
      var dd=g('hcDocenteDD');
      if(dd&&!dd.contains(e.target)&&e.target.id!=='hcDocInput'){dd.style.display='none';document.removeEventListener('click',_hcDDClose);}
    });
  },100);
}

// ─── Detalle Paciente ─────────────────────────────────
async function abrirPac(id){
  views.forEach(v=>g(v).style.display='none');
  const v=g('vDetalle');v.style.display='block';v.innerHTML='<div class="loader">Cargando...</div>';
  const [rP,rE,rS,rU0]=await Promise.all([
    apiGet('obtenerPaciente',{id}),
    apiGet('listarEvaluaciones',{pacienteId:id}),
    apiGet('listarSesiones',{pacienteId:id}),
    window._listaUsuariosCache
      ? Promise.resolve({ok:true,usuarios:window._listaUsuariosCache})
      : apiGet('listarUsuarios').catch(()=>({ok:false}))
  ]);
  if(!rP.ok){v.innerHTML=`<div class="err-box">${e2(rP.error)}</div>`;return;}
  const pac=rP.paciente; pacActivo=pac;
  const evals=rE.evaluaciones||[], ses=rS.sesiones||[];
  window._sesActualesPac=ses;
  // Cache de usuarios disponible antes del render (necesario para mkSelloInline en sesCard)
  if(rU0.ok) window._listaUsuariosCache = rU0.usuarios||[];
  const cat=getCat(pac.categoriaId);
  const esPropio=session.rol==='estudiante'&&(pac.creadoPor===session.codigo||pac.asignadoA===session.codigo);
  const puedeEditar=session.rol!=='estudiante'||esPropio;
  const evalAp=evals.find(e=>e.estado==='aprobada');
  const puedeNuevaSes=!!evalAp&&puedeEditar;

  v.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="navTo('pac')">← Volver</button>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div class="card-title">${e2(pac.nombre)}</div>${catPill(pac.categoriaId)}${bdg(pac.estado||'activo')}
        </div>
        <div style="font-size:12px;color:var(--tx3);margin-top:2px">
          DNI: ${e2(pac.dni)} ${pac.sexo?'· '+(pac.sexo==='M'?'Masc.':'Fem.'):''} ${pac.fechaNac?'· '+edad(pac.fechaNac)+' años':''}
        </div>
      </div>
      <div class="btn-group">
        ${puedeEditar?`<button class="btn btn-ghost btn-sm" onclick="editarPac('${esc(pac.id)}')">✏️ Editar</button>`:''}
        ${(session.rol==='admin'||session.rol==='docente')?`<button class="btn btn-ghost btn-sm" onclick="abrirSelectorExportPDF('${esc(pac.id)}')">📄 Exportar PDF</button>`:''}
        ${session.rol==='admin'?`<button class="btn btn-danger btn-sm" onclick="eliminarPac('${esc(pac.id)}','${esc(pac.nombre)}')">🗑️</button>`:''}
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;font-size:13px">
        ${pac.dxMedico?`<div><div style="font-size:10px;font-weight:700;color:var(--tx4);margin-bottom:2px">DX MÉDICO</div>${e2(pac.dxMedico)}</div>`:''}
        ${pac.medico?`<div><div style="font-size:10px;font-weight:700;color:var(--tx4);margin-bottom:2px">MÉDICO</div>${e2(pac.medico)}</div>`:''}
        ${pac.telefono?`<div><div style="font-size:10px;font-weight:700;color:var(--tx4);margin-bottom:2px">TELÉFONO</div>${e2(pac.telefono)}</div>`:''}
        ${pac.asignadoA?`<div><div style="font-size:10px;font-weight:700;color:var(--tx4);margin-bottom:2px">ASIGNADO A</div>${e2(pac.asignadoA)}</div>`:''}
      </div>
      ${pac.motivo?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"><div style="font-size:10px;font-weight:700;color:var(--tx4);margin-bottom:4px">MOTIVO</div><div style="font-size:13px">${e2(pac.motivo)}</div></div>`:''}
      ${session.rol!=='estudiante'?`
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select class="sel" id="selReasig" style="width:220px"><option value="">↪️ Reasignar a alumno...</option></select>
        <button class="btn btn-ghost btn-sm" onclick="reasignarPac('${esc(pac.id)}')">Reasignar</button>
        <button class="btn btn-danger btn-sm" onclick="archivarAtencion('${esc(pac.id)}','${esc(pac.nombre)}')">📦 Archivar atención</button>
      </div>`:''}
    </div>

    <!-- Evaluaciones -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-hdr">
        <div class="card-title">Evaluaciones</div>
        ${puedeEditar?`<button class="btn btn-primary btn-sm" onclick="abrirModalCategoriaParaEval(pacActivo)">+ Nueva evaluación</button>`:''}
      </div>
      ${evals.length?evals.map((ev,idx)=>evalCard(ev,pac,idx+1)).join(''):'<div class="empty">Sin evaluaciones.</div>'}
    </div>

    <!-- Sesiones -->
    <div class="card">
      <div class="card-hdr">
        <div><div class="card-title">Sesiones de tratamiento</div><div style="font-size:12px;color:var(--tx3)">${ses.length} sesión(es)</div></div>
        ${puedeNuevaSes?`<button class="btn btn-primary btn-sm" onclick="abrirNuevaSes('${esc(pac.id)}','${evalAp?.id||''}',${ses.length+1})">+ Nueva sesión</button>`:''}
        ${!evalAp?`<span style="font-size:11px;color:var(--tx4)">Requiere evaluación aprobada</span>`:''}
      </div>
      ${ses.length?`<div class="timeline">${ses.map(s=>sesCard(s,pac,evalAp)).join('')}</div>`:'<div class="empty">Sin sesiones aún.</div>'}
    </div>`;

  // Cargar alumnos para reasignar (reusar cache ya cargado arriba)
  if(session.rol!=='estudiante'){
    const sel=g('selReasig');
    if(sel&&window._listaUsuariosCache){
      window._listaUsuariosCache.filter(u=>u.rol==='estudiante').forEach(u=>{
        const o=document.createElement('option');
        o.value=u.codigo;o.textContent=(u.nombre||u.codigo);
        if(u.codigo===pac.asignadoA)o.selected=true;
        sel.appendChild(o);
      });
    }
  }
}

function evalCard(ev, pac, numEval){
  const pr=session.rol==='admin'||session.rol==='docente';
  const puedeSend=(ev.estado==='borrador'||ev.estado==='rechazada')&&session.rol==='estudiante'&&(pac.asignadoA===session.codigo||pac.creadoPor===session.codigo||ev.autor===session.codigo||ev.autorCodigo===session.codigo);
  const uid='eval_'+ev.id.replace(/[^a-z0-9]/gi,'_');
  // Compatibilidad: datos pueden estar en datosEspecificos o al nivel raíz
  const d=Object.assign({},ev,ev.datosEspecificos||{});
  // El acordeón carga los datos completos al abrirse (lazy load via toggleEvalInline)
  var detalle='<div id="'+uid+'" data-eval-id="'+ev.id+'" data-pac-id="'+pac.id+'" style="display:none;margin-top:14px;border-top:1px solid var(--bd);padding-top:14px"></div>';

  // FIX: el docente solo puede revisar si es el asignado a esta evaluación (o es admin)
  function puedeRevisarEval(){
    if(session.rol==='admin') return true;
    if(session.rol!=='docente') return false;
    var myName=(session.nombre||'').toLowerCase();
    var myCode=(session.codigo||'').toLowerCase();
    var dn=(ev.docente||'').toLowerCase();
    var dc=(ev.docenteCodigo||'').toLowerCase();
    return dn===myName||dn===myCode||dc===myCode||dc===myName;
  }
  const puedeRev = puedeRevisarEval();


  return `<div style="background:var(--surf3);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:8px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="toggleEvalInline('${uid}',this)">
        <span style="font-size:15px;transition:transform .2s" id="ico_${uid}">▶</span>
        <span style="font-weight:700;font-size:13px">${(function(){var catN=getCat(ev.categoriaId||pac.categoriaId||'').nombre||'Evaluación';var n=numEval||1;return 'Evaluación '+catN+' #'+n;})()}</span>
        ${bdg(ev.estado)}
      </div>
      <div style="font-size:11px;color:var(--tx4)">${e2(ev.autor)} · ${formatFechaCorta(ev.fecha)}</div>
    </div>

    ${ev.comentarioDocente&&ev.estado!=='borrador'?`<div class="rev-bar ${ev.estado}" style="margin-bottom:8px">
      <div style="font-size:18px">${ev.estado==='aprobada'?'✅':ev.estado==='rechazada'?'❌':'⏳'}</div>
      <div><div style="font-size:12px;font-weight:700;color:${ev.estado==='aprobada'?'var(--green)':ev.estado==='rechazada'?'var(--red)':'var(--amber)'}">${ev.estado==='aprobada'?'Aprobada':'Rechazada'} — ${e2(ev.revisadoPor)}</div>
        <div class="rev-comment">${e2(ev.comentarioDocente)}</div></div></div>`:''}
    ${detalle}
    <div class="btn-group" style="margin-top:8px">
      ${(ev.estado==='borrador'||ev.estado==='rechazada')&&(pr||(session.rol==='estudiante'&&(pac.asignadoA===session.codigo||pac.creadoPor===session.codigo||ev.autor===session.codigo||ev.autorCodigo===session.codigo)))?`<button class="btn btn-ghost btn-sm" onclick="editarEvalRechazada('${esc(pac.id)}','${esc(ev.id)}','${esc(pac.categoriaId)}')">✏️ Editar</button>`:''}
      ${ev.estado==='aprobada'&&(session.rol==='admin'||session.rol==='docente')?`<button class="btn btn-ghost btn-sm" style="border-color:var(--amber);color:var(--amber)" onclick="editarEvalAprobada('${esc(pac.id)}','${esc(ev.id)}','${esc(pac.categoriaId)}')">✏️ Editar (doc)</button>`:''}
      ${ev.estado==='pendiente'&&session.rol==='estudiante'?`<span style="font-size:11px;color:var(--amber);padding:4px 8px">⏳ En revisión — no editable</span>`:''}
      ${puedeSend?`<button class="btn btn-primary btn-sm" onclick="enviarEval('${esc(ev.id)}','${esc(pac.id)}')">📤 Enviar al docente</button>`:''}
      ${puedeRev&&ev.estado==='pendiente'?`<button class="btn btn-ghost btn-sm" onclick="toggleEvalInline('${uid}',null)">👁️ Ver contenido</button>`:''}
      ${puedeRev&&ev.estado==='pendiente'?`<button class="btn btn-success btn-sm" onclick="abrirRev('eval','${esc(ev.id)}','${esc(pac.id)}')">📝 Revisar</button>`:''}
      ${ev.estado==='pendiente'&&session.rol==='docente'&&!puedeRev?`<span style="font-size:11px;color:var(--tx4);padding:4px 8px">⏳ Asignado a otro docente</span>`:''}
      ${(ev.estado==='aprobada'||ev.estado==='rechazada')?`<button class="btn btn-ghost btn-sm" onclick="toggleEvalInline('${uid}',null)">👁️ Ver</button>`:''}
      ${ev.estado==='aprobada'?`<button class="btn btn-ghost btn-sm" onclick="exportarEvalModal('${esc(ev.id)}','${esc(pac.id)}')">📄 PDF</button>`:''}
      ${session.rol==='admin'?`<button class="btn btn-danger btn-sm" style="margin-left:auto" title="Eliminar evaluación" onclick="eliminarEval('${esc(ev.id)}','${esc(pac.id)}',${numEval||1})">🗑️</button>`:''}
    </div>
  </div>`;
}

function buildDetalleEval(ev, pac){
  var d=Object.assign({},ev,ev.datosEspecificos||{});
  var catId = ev.categoriaId || pac.categoriaId || '';
  var evaVal = d.evaValor !== undefined ? d.evaValor : (d.eva !== undefined ? d.eva : undefined);
  var cifDeterioro = d.icfDeterioro || d.cifDeterioro || '';
  var cifActividad = d.icfActividad || d.cifActividad || '';
  var objCorto = d.objCorto || d.meta || '';
  var objLargo = d.objLargo || d.objGeneral || '';
  var objEsp = d.objEspecificos || d.planGeneral || '';
  var html = '';

  // Filiación
  html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">I. Filiación</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:14px">';
  html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">NOMBRE</div><div style="font-size:12px">'+e2(pac.nombre||'—')+'</div></div>';
  html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">DNI</div><div style="font-size:12px">'+e2(pac.dni||'—')+'</div></div>';
  if(pac.fechaNac) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">F. NACIMIENTO</div><div style="font-size:12px">'+e2(formatFechaCorta(pac.fechaNac))+'</div></div>';
  if(pac.sexo) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">SEXO</div><div style="font-size:12px">'+(pac.sexo==='M'?'Masculino':'Femenino')+'</div></div>';
  if(pac.ocupacion||d.ocupacion) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">OCUPACIÓN</div><div style="font-size:12px">'+e2(pac.ocupacion||d.ocupacion)+'</div></div>';
  if(pac.telefono) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">TELÉFONO</div><div style="font-size:12px">'+e2(pac.telefono)+'</div></div>';
  if(pac.fechaInicio) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">INICIO TRATAMIENTO</div><div style="font-size:12px">'+e2(formatFechaCorta(pac.fechaInicio))+'</div></div>';
  html+='</div>';

  // Anamnesis
  if(d.dxMedico||pac.dxMedico||d.motivo||pac.motivo||d.antecedentes||pac.antecedentes){
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">II. Anamnesis</div>';
    var dxMed=d.dxMedico||pac.dxMedico||'';
    var motivo=d.motivo||pac.motivo||'';
    var antec=d.antecedentes||pac.antecedentes||'';
    if(dxMed) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">DX MÉDICO</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(dxMed)+'</div></div>';
    if(motivo) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">MOTIVO DE CONSULTA</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(motivo)+'</div></div>';
    if(antec) html+='<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">ANTECEDENTES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(antec)+'</div></div>';
  }

  // III. Examen objetivo — renderizado por categoría
  html += '<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">III. Examen Objetivo</div>';
  html += _buildDetalleExamenPorCategoria(d, ev, catId);

  // Si es traumatología también mostrar ROM, fuerza y pruebas funcionales
  if(catId==='traumatologia'){
    if(d.palpacion) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">PALPACIÓN</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.palpacion)+'</div></div>';
    if(d.pruebasFuncionales&&Object.keys(d.pruebasFuncionales).length){
      html+='<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:4px;text-transform:uppercase">PRUEBAS FUNCIONALES</div>';
      Object.keys(d.pruebasFuncionales).forEach(function(reg){
        var regPruebas=d.pruebasFuncionales[reg];
        var filled=Object.keys(regPruebas).filter(function(k){return regPruebas[k]&&regPruebas[k]!=='—';});
        if(!filled.length) return;
        html+='<div style="font-size:11px;font-weight:700;color:var(--tx2);margin:6px 0 3px">'+e2(reg)+'</div>';
        filled.forEach(function(nom){
          var res=regPruebas[nom];
          var color=res&&res.startsWith('+')?'var(--red)':res&&res.startsWith('-')?'var(--green)':'var(--amber)';
          html+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 8px;background:var(--surf2);border-radius:5px;margin-bottom:2px"><span>'+e2(_fmtPruebaName(nom))+'</span><b style="color:'+color+'">'+e2(res)+'</b></div>';
        });
      });
      html+='</div>';
    }
    if(d.pruebas) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBSERVACIONES PRUEBAS</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.pruebas)+'</div></div>';
    if(d.examObjetivo) html+='<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">EXAMEN OBJETIVO</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.examObjetivo)+'</div></div>';
    
    // ROM (traumatología)
    if(d.rom&&Object.keys(d.rom).length){
      html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">ROM — Rango de Movimiento</div>';
      html+='<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:11px">';
      html+='<tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">Región/Movimiento</th><th style="padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">D</th><th style="padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">I</th></tr>';
      var romKeys=Object.keys(d.rom);
      var grupos={};
      romKeys.forEach(function(k){var reg=k.split('_')[0];if(!grupos[reg])grupos[reg]=[];grupos[reg].push(k);});
      Object.keys(grupos).forEach(function(reg){
        grupos[reg].forEach(function(k,i){
          var mov=k.replace(reg+'_','').replace(/_[DI]$/,'');
          var vD=d.rom[k.replace(/_[DI]$/,'_D')]||'';
          var vI=d.rom[k.replace(/_[DI]$/,'_I')]||'';
          if(k.endsWith('_D')||(!k.endsWith('_I')&&!k.endsWith('_D'))){
            html+='<tr style="border-bottom:1px solid var(--bd2)">';
            if(i===0) html+='<td style="font-weight:700;font-size:10px;padding:3px 8px;color:var(--tx2)" rowspan="'+grupos[reg].filter(function(x){return x.endsWith('_D');}).length+'">'+reg+'</td>';
            html+='<td style="padding:3px 8px;font-size:11px">'+mov+'</td>';
            html+='<td style="text-align:center;padding:3px 8px">'+e2(vD||'—')+'</td>';
            html+='<td style="text-align:center;padding:3px 8px">'+e2(vI||'—')+'</td></tr>';
          }
        });
      });
      html+='</table></div>';
    }
    
    // Fuerza muscular
    if(d.fuerza&&Object.keys(d.fuerza).length){
      html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Fuerza Muscular — Escala Daniels</div>';
      html+='<div style="overflow-x:auto;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:11px">';
      html+='<tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">Músculo/Grupo</th><th style="padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">D</th><th style="padding:4px 8px;border-bottom:1px solid var(--bd);color:var(--tx4)">I</th></tr>';
      var fuerzaKeys=Object.keys(d.fuerza);
      var gruposFuerza={};
      fuerzaKeys.forEach(function(k){var reg=k.split('_')[0];if(!gruposFuerza[reg])gruposFuerza[reg]=[];gruposFuerza[reg].push(k);});
      Object.keys(gruposFuerza).forEach(function(reg){
        gruposFuerza[reg].forEach(function(k,i){
          var mov=k.replace(reg+'_','').replace(/_[DI]$/,'');
          var vD=d.fuerza[k.replace(/_[DI]$/,'_D')]||'';
          var vI=d.fuerza[k.replace(/_[DI]$/,'_I')]||'';
          if(k.endsWith('_D')||(!k.endsWith('_I')&&!k.endsWith('_D'))){
            html+='<tr style="border-bottom:1px solid var(--bd2)">';
            if(i===0) html+='<td style="font-weight:700;font-size:10px;padding:3px 8px;color:var(--tx2)" rowspan="'+gruposFuerza[reg].filter(function(x){return x.endsWith('_D');}).length+'">'+reg+'</td>';
            html+='<td style="padding:3px 8px;font-size:11px">'+mov+'</td>';
            html+='<td style="text-align:center;padding:3px 8px">'+e2(vD||'—')+'</td>';
            html+='<td style="text-align:center;padding:3px 8px">'+e2(vI||'—')+'</td></tr>';
          }
        });
      });
      html+='</table></div>';
    }
  }

  // Diagnóstico
  if(ev.dxFisio||d.dxFisio||d.aptaPatron||cifDeterioro||cifActividad){
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">IV. Diagnóstico</div>';
    html+='<div style="display:grid;gap:6px;margin-bottom:12px">';
    if(d.aptaPatron||ev.aptaPatron) html+='<div><span style="font-size:10px;color:var(--tx4);font-weight:700">PATRÓN APTA: </span><span style="font-size:12px">'+e2(d.aptaPatron||ev.aptaPatron)+'</span></div>';
    if(ev.dxFisio||d.dxFisio) html+='<div><span style="font-size:10px;color:var(--tx4);font-weight:700">DX FISIO: </span><span style="font-size:12px">'+e2(ev.dxFisio||d.dxFisio)+'</span></div>';
    if(cifDeterioro) html+='<div><span style="font-size:10px;color:var(--tx4);font-weight:700">CIF DETERIORO: </span><span style="font-size:12px">'+e2(cifDeterioro)+'</span></div>';
    if(cifActividad) html+='<div><span style="font-size:10px;color:var(--tx4);font-weight:700">CIF ACTIVIDAD: </span><span style="font-size:12px">'+e2(cifActividad)+'</span></div>';
    if(d.pronostico) html+='<div><span style="font-size:10px;color:var(--tx4);font-weight:700">PRONÓSTICO: </span><span style="font-size:12px">'+e2(d.pronostico)+'</span></div>';
    html+='</div>';
  }

  // Plan de tratamiento
  if(objCorto||objLargo||objEsp||d.planSesiones){
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">V. Plan de Tratamiento</div>';
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:10px">';
    if(d.planSesiones) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">N&deg; SESIONES</div><div style="font-size:13px;font-weight:700">'+e2(d.planSesiones)+'</div></div>';
    if(d.planFrecuencia) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">FRECUENCIA</div><div style="font-size:12px">'+e2(d.planFrecuencia)+'</div></div>';
    if(d.planDuracion) html+='<div><div style="font-size:10px;color:var(--tx4);font-weight:700">DURACIÓN</div><div style="font-size:12px">'+e2(d.planDuracion)+'</div></div>';
    html+='</div>';
    if(objCorto) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">META</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(objCorto)+'</div></div>';
    if(objLargo) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBJETIVO GENERAL</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(objLargo)+'</div></div>';
    if(objEsp) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBJETIVOS ESPECÍFICOS</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(objEsp)+'</div></div>';
    if(d.planGeneral) html+='<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">PLAN DE TRATAMIENTO</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.planGeneral)+'</div></div>';
  }

  // Observaciones
  if(d.obsExamen||d.aux) html+='<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px;text-transform:uppercase">Observaciones / Auxiliares</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.obsExamen||d.aux||'')+'</div></div>';

  // Escalas aplicadas
  var escalasData = d.escalas;
  if(escalasData && typeof escalasData === 'string'){
    try{ escalasData = JSON.parse(escalasData); } catch(ex){ escalasData = null; }
  }
  if(escalasData && Object.keys(escalasData).length){
    html += displayEscalasResumen(escalasData);
  }

  // Estado de revisión del docente + sello
  if(ev.estado==='aprobada'||ev.estado==='rechazada'){
    var revColor = ev.estado==='aprobada' ? 'var(--green)' : 'var(--red)';
    var revIcon  = ev.estado==='aprobada' ? '✅' : '❌';
    var revisor  = ev.revisadoPor || ev.docente || '';
    var selloUID = 'rev_'+ev.id.replace(/[^a-z0-9]/gi,'_');
    var selloHTML = revisor ? mkSelloInline(revisor, selloUID) : '';
    html += '<div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:'+(ev.estado==='aprobada'?'var(--green2)':'var(--red2)')+';border:1px solid '+(ev.estado==='aprobada'?'rgba(34,197,94,.3)':'rgba(239,68,68,.25)')+';display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:12px;font-weight:700;color:'+revColor+'">'+revIcon+' '+(ev.estado==='aprobada'?'Aprobada':'Rechazada')+(revisor?' — '+e2(revisor):'')+'</div>';
    if(ev.comentarioDocente) html += '<div style="font-size:12px;color:var(--tx2);margin-top:4px;padding:6px 8px;background:rgba(0,0,0,.06);border-radius:6px">'+e2(ev.comentarioDocente)+'</div>';
    html += '</div>';
    if(selloHTML) html += '<div style="flex-shrink:0">'+selloHTML+'</div>';
    html += '</div>';
  }

  return html;
}

// ── Vista inline de examen objetivo por categoría (para el acordeón) ──────────
function _buildDetalleExamenPorCategoria(d, ev, catId) {
  var h = '';
  var fld = function(lbl, val) {
    if (!val && val !== 0) return '';
    return '<div style="margin-bottom:4px"><span style="font-size:10px;color:var(--tx4);font-weight:700;text-transform:uppercase">'
      + lbl + ': </span><span style="font-size:12px">' + e2(String(val)) + '</span></div>';
  };

  if (catId === 'traumatologia') {
    h += fld('EVA', d.eva !== undefined ? d.eva + '/10' : (d.evaValor !== undefined ? d.evaValor + '/10' : ''));
    h += fld('Trofismo', d.trofismo);
    h += fld('Localización dolor', d.dolLoc);
    h += fld('Tipo dolor', d.dolTipo);
    if (d.palpacion) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">PALPACIÓN</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">' + e2(d.palpacion) + '</div></div>';

  } else if (catId === 'neuro_adultos') {
    // Historia neurológica
    h += fld('Diagnóstico médico', d.dxNeuroMedico||d.dxMedico);
    h += fld('Tipo de condición', d.tipoCondicionNeuro);
    h += fld('Tiempo de evolución', d.tiempoEvolucionNeuro);
    h += fld('Lado afectado', d.ladoAfectadoNeuro);
    h += fld('Clasificación funcional', d.clasificacionFuncional);
    h += fld('Dolor neurológico', d.dolorNeuro);
    if(d.evaNeuroDolor!==undefined && d.evaNeuroDolor!==null && d.evaNeuroDolor!=='')
      h += fld('EVA dolor neurológico', d.evaNeuroDolor+'/10');
    if(d.historiaCondicion) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">HISTORIA DE LA CONDICIÓN</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.historiaCondicion)+'</div></div>';
    if(d.antecedentesNeuro) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">ANTECEDENTES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.antecedentesNeuro)+'</div></div>';
    // Estado cognitivo
    h += fld('Nivel de conciencia', d.nConciencia);
    h += fld('Lateralidad', d.lateralidad);
    h += fld('Orientación', d.orientacion);
    h += fld('Comunicación', d.comunicacion);
    h += fld('Memoria', d.memoria);
    h += fld('Atención', d.atencion);
    if(d.obsCognitivo) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBS. COGNITIVO</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.obsCognitivo)+'</div></div>';
    // Motor
    h += fld('Tono MMSS D', d.tono_MMSS_D);
    h += fld('Tono MMSS I', d.tono_MMSS_I);
    h += fld('Tono MMII D', d.tono_MMII_D);
    h += fld('Tono MMII I', d.tono_MMII_I);
    h += fld('Fuerza MMSS D', d.fuerza_MMSS_D);
    h += fld('Fuerza MMSS I', d.fuerza_MMSS_I);
    h += fld('Fuerza MMII D', d.fuerza_MMII_D);
    h += fld('Fuerza MMII I', d.fuerza_MMII_I);
    h += fld('Reflejos OT', d.reflejos);
    h += fld('Babinski', d.babinski);
    h += fld('Clonus', d.clonus);
    h += fld('Coordinación', d.coordinacion);
    h += fld('Movimientos involuntarios', d.movInvoluntarios);
    if(d.obsMotor) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBS. MOTOR</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.obsMotor)+'</div></div>';
    // Sensibilidad
    h += fld('Sensibilidad táctil', d.sensTactil);
    h += fld('Sensibilidad dolorosa', d.sensDolor);
    h += fld('Sensibilidad térmica', d.sensTermica);
    h += fld('Propiocepción', d.propiocepccion);
    h += fld('Zona afectada', d.zonaAfectada);
    // Control postural y marcha
    h += fld('Control cefálico', d.controlCefal);
    h += fld('Control de tronco', d.controlTronco);
    h += fld('Equilibrio estático', d.eqEstatico);
    h += fld('Equilibrio dinámico', d.eqDinamico);
    h += fld('Tipo de marcha', d.tipoMarcha);
    h += fld('Patrón de marcha', d.patronMarcha);
    h += fld('Ayuda técnica', d.ayudaTecnica);
    h += fld('Transferencia cama↔silla', d.transferenciaCS);
    h += fld('Transferencia sentado↔pie', d.transferenciaSP);
    if(d.marchaDescripcion) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">DESCRIPCIÓN MARCHA</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.marchaDescripcion)+'</div></div>';
    // AVD
    if(d.avdBasicasAfect) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">AVD BÁSICAS AFECTADAS</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.avdBasicasAfect)+'</div></div>';
    if(d.avdInstAfect) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">AVD INSTRUMENTALES AFECTADAS</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.avdInstAfect)+'</div></div>';

  } else if (catId === 'neuro_pediatrica') {
    h += fld('Tipo parto', d.tipoParto);
    h += fld('Semanas gestación', d.semanasGest);
    h += fld('APGAR', d.apgar);
    h += fld('Escolarización', d.escolarizacion);
    h += fld('Tono MMSS D', d.tonoPed_MMSS_D);
    h += fld('Tono MMSS I', d.tonoPed_MMSS_I);
    h += fld('Tono MMII D', d.tonoPed_MMII_D);
    h += fld('Tono MMII I', d.tonoPed_MMII_I);
    h += fld('Fuerza MMSS D', d.fuerzaPed_MMSS_D);
    h += fld('Fuerza MMSS I', d.fuerzaPed_MMSS_I);
    h += fld('Fuerza MMII D', d.fuerzaPed_MMII_D);
    h += fld('Fuerza MMII I', d.fuerzaPed_MMII_I);
    h += fld('Control cefálico', d.controlCefalPed);
    h += fld('Sedestación', d.sedestacionPed);
    h += fld('Tipo marcha', d.tipoMarchaPed);
    h += fld('Patrón marcha', d.patronMarchaPed);
    if (d.obsMotorPed) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBS. MOTOR</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">' + e2(d.obsMotorPed) + '</div></div>';

  } else if (catId === 'cardiorespiratorio') {
    h += fld('FC reposo', d.fcReposo ? d.fcReposo + ' lpm' : '');
    h += fld('FR reposo', d.frReposo ? d.frReposo + ' rpm' : '');
    h += fld('TA', (d.taSistolica && d.taDiastolica) ? d.taSistolica + '/' + d.taDiastolica + ' mmHg' : '');
    h += fld('SpO₂ reposo', d.spo2Reposo ? d.spo2Reposo + '%' : '');
    h += fld('IMC', d.imc ? d.imc + ' kg/m²' : '');
    h += fld('O₂ suplementario', d.o2Suplem);
    h += fld('Patrón respiratorio', d.patronResp);
    h += fld('Tiraje', d.tiraje);
    h += fld('Tos', d.tos);
    h += fld('Disnea en reposo', d.disneaReposo);
    h += fld('NYHA', d.nyha);
    h += fld('Edema MMII', d.edemaMmii);
    h += fld('FVC', d.fvc ? d.fvc + ' L' : '');
    h += fld('FEV1/FVC', d.fev1fvc ? d.fev1fvc + '%' : '');
    if (d.auscultacion) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">AUSCULTACIÓN</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">' + e2(d.auscultacion) + '</div></div>';


  } else if (catId === 'postural') {
    h += fld('Cabeza (frontal)', d.cabezaAnt);
    h += fld('Hombros (frontal)', d.hombrosAnt);
    h += fld('Columna', d.columnaPost);
    h += fld('Pelvis (lateral)', d.pelvisLat);
    h += fld('Curva cervical', d.curvaCervical);
    h += fld('Curva dorsal', d.curvaDorsal);
    h += fld('Curva lumbar', d.curvaLumbar);
    h += fld('Test Adams', d.testAdams);
    h += fld('Gibosidad', d.gibosidad);
    h += fld('Discrepancia MMII real', d.discrepanciaReal ? d.discrepanciaReal + ' cm' : '');
    h += fld('Flecha cervical', d.flechaCervical ? d.flechaCervical + ' cm' : '');
    h += fld('Flecha lumbar', d.flechaLumbar ? d.flechaLumbar + ' cm' : '');
    h += fld('Apoyo plantar D', d.apoyoD);
    h += fld('Apoyo plantar I', d.apoyoI);
    h += fld('Test dedos-suelo', d.testDedusSuelo !== '' && d.testDedusSuelo !== undefined ? d.testDedusSuelo + ' cm' : '');
    if (d.cifDeterioro) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">ALTERACIONES POSTURALES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">' + e2(d.cifDeterioro) + '</div></div>';

  } else if (catId === 'paralisis_facial') {
    h += fld('Diagnóstico', d.dxFacial);
    h += fld('Tipo de parálisis', d.tipoParalisis);
    h += fld('Lado afectado', d.ladoFacial);
    h += fld('Tiempo de evolución', d.tiempoEvolFacial);
    h += fld('Etiología', d.etiologiaFacial);
    h += fld('House-Brackmann', d.houseBrackmann);
    h += fld('Lagoftalmos', d.lagoftalmos);
    h += fld('Sincinesias', d.sincinesias);
    h += fld('Simetría en reposo', d.simetriaReposo);
    h += fld('Arrugar frente', d.arrugarFrente);
    h += fld('Elevación ceja', d.elevacionCeja);
    h += fld('Cierre ocular', d.cierreOcular);
    h += fld('Sonrisa', d.sonrisa);
    h += fld('Elevación comisura', d.elevacionComisura);
    h += fld('Mostrar dientes', d.mostrarDientes);
    h += fld('Fruncir labios', d.fruncirLabios);
    h += fld('Inflar mejillas', d.inflarMejillas);
    h += fld('Sensibilidad auricular', d.sensAuricular);
    h += fld('Gusto', d.gustoLengua);
    h += fld('Dolor', d.dolorFacial);
    h += fld('Hiperacusia', d.hiperacusia);
    if(d.observacionesFacial) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBSERVACIONES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.observacionesFacial)+'</div></div>';

  } else if (catId === 'geriatria') {
    h += fld('Diagnóstico', d.dxGeriatria);
    h += fld('Edad', d.edadGer ? d.edadGer+' años' : '');
    h += fld('Motivo', d.motivoGer);
    h += fld('Evolución', d.tiempoEvolGer);
    h += fld('Vivienda', d.tipoViviendaGer);
    h += fld('Soporte social', d.soporteSocial);
    h += fld('Caídas 6m', d.caidasGer);
    h += fld('Miedo a caer', d.miedoCaer);
    h += fld('Polifarmacia', d.polifarmaciaGer);
    h += fld('Nutrición', d.estadoNutricional);
    if(d.antecedentesGer) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">ANTECEDENTES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.antecedentesGer)+'</div></div>';
    h += fld('Dolor EVA', d.evaGer !== undefined && d.evaGer !== '' ? d.evaGer+'/10' : '');
    h += fld('Postura', d.posturaGer);
    h += fld('Piel', d.pielGer);
    h += fld('Fuerza MMSS', d.fuerzaMMSS_Ger);
    h += fld('Fuerza MMII', d.fuerzaMMII_Ger);
    h += fld('Dinamometría', d.fuerzaGer);
    h += fld('Trofismo', d.trofismoGer);
    h += fld('Sensibilidad', d.sensGer);
    h += fld('Reflejos OT', d.reflejosGer);
    if(d.palpacionGer) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">PALPACIÓN</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.palpacionGer)+'</div></div>';
    if(d.auxGer) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">EXÁMENES AUXILIARES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.auxGer)+'</div></div>';
    h += fld('Velocidad marcha', d.velocidadMarchaGer);
    h += fld('Patrón marcha', d.patronMarchaGer);
    h += fld('Equilibrio estático', d.equilibrioEstGer);
    h += fld('Equilibrio dinámico', d.equilibrioDinGer);
    h += fld('TUG', d.tugGer ? d.tugGer+' seg.' : '');
    h += fld('Chair Stand', d.chairStand ? d.chairStand+' rep.' : '');
    h += fld('MMSE', d.mmseGer);
    h += fld('GDS Depresión', d.gdsGer);
    h += fld('Fragilidad Fried', d.friedGer);
    h += fld('Barthel', d.barthelGer);
    if(d.obsGeriatria) h += '<div style="margin-bottom:6px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:2px">OBSERVACIONES</div><div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">'+e2(d.obsGeriatria)+'</div></div>';

  } else {
    if (d.examObjetivo) h += '<div style="font-size:12px;background:var(--surf2);border-radius:8px;padding:8px">' + e2(d.examObjetivo) + '</div>';
  }

  return h ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;margin-bottom:12px">' + h + '</div>' : '';
}

async function toggleEvalInline(uid, headerEl){
  var el=document.getElementById(uid);
  if(!el) return;
  var ico=document.getElementById('ico_'+uid);
  var open=el.style.display==='none'||el.style.display==='';
  el.style.display=open?'block':'none';
  if(ico) ico.style.transform=open?'rotate(90deg)':'';
  // Si aún no se cargaron los datos completos, los buscamos ahora
  if(open && el.dataset.loaded!=='1'){
    var evalId=el.dataset.evalId;
    var pacId=el.dataset.pacId;
    if(!evalId) return;
    el.innerHTML='<div style="color:var(--tx4);font-size:12px;padding:8px">⏳ Cargando evaluación...</div>';
    try{
      var r=await apiGet('obtenerEvaluacion',{id:evalId});
      if(!r.ok){el.innerHTML='<div style="color:var(--red);font-size:12px;padding:8px">Error al cargar datos.</div>';return;}
      var ev=r.evaluacion;
      // Parsear datosEspecificos si viene como string
      if(ev.datosEspecificos && typeof ev.datosEspecificos === 'string'){
        try{ ev.datosEspecificos = JSON.parse(ev.datosEspecificos); }catch(e){ ev.datosEspecificos = {}; }
      }
      // Parsear rom y fuerza si vienen como string
      ['rom','fuerza'].forEach(function(f){
        if(typeof ev[f] === 'string'){ try{ ev[f] = JSON.parse(ev[f]); }catch(e){ ev[f] = {}; } }
      });
      // Parsear widgetPostural si viene como string dentro de datosEspecificos
      if(ev.datosEspecificos && typeof ev.datosEspecificos.widgetPostural === 'string' && ev.datosEspecificos.widgetPostural){
        try{ ev.datosEspecificos.widgetPostural = JSON.parse(ev.datosEspecificos.widgetPostural); }catch(e){}
      }
      var rP=await apiGet('obtenerPaciente',{id:pacId});
      var pac=rP.ok?rP.paciente:{};
      // Precargar fotos del widget postural antes de renderizar
      if(ev.datosEspecificos&&ev.datosEspecificos.widgetPostural&&window._wpostPrecargarFotos){
        await window._wpostPrecargarFotos(ev.datosEspecificos.widgetPostural);
      }
      if(ev.datosEspecificos&&ev.datosEspecificos.plantigrafiaFileId){
        await _precargarPlantigrafia(ev.datosEspecificos.plantigrafiaFileId);
      } else { window._plantigrafiaCache=null; }
      var _firmaVer=(ev.estado==='aprobada'&&(ev.revisadoPor||ev.docente))?mkSelloInline(ev.revisadoPor||ev.docente,uid+'_f'):'';
      el.innerHTML=buildEvalHTML(ev, pac, _firmaVer);

      // Consentimiento informado — siempre intenta cargarlo; se oculta si no existe
      (function(){
        var cId='ci_'+uid;
        var cDiv=document.createElement('div');
        cDiv.id=cId;
        cDiv.style.cssText='margin-top:12px;padding:12px 14px;background:var(--surf2);border:1px solid var(--bd);border-radius:10px;display:none';
        cDiv.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">📄 Consentimiento Informado</div>'
          +'<div id="ci_img_'+uid+'"></div>';
        el.appendChild(cDiv);
        apiPost({action:'getConsentimiento',evaluacionId:ev.id}).then(function(rc){
          var wrap=document.getElementById(cId);
          var box=document.getElementById('ci_img_'+uid);
          if(!wrap||!box) return;
          if(!rc.ok) return; // sin consentimiento — permanece oculto
          var dataUrl='data:'+rc.mimeType+';base64,'+rc.data;
          box.innerHTML='<img src="'+dataUrl+'" style="max-width:100%;max-height:320px;border-radius:8px;border:1px solid var(--bd);display:block;cursor:zoom-in" onclick="window.open(this.src,\'_blank\')" title="Clic para ampliar">';
          wrap.style.display='block';
        }).catch(function(){});
      })();

      el.dataset.loaded='1';
      // Agregar leyenda flotante a los chips del widget postural
      setTimeout(function(){
        document.querySelectorAll('.wpost-chip-view').forEach(function(chip){
          var altId=chip.getAttribute('data-alt-id');
          var alt=window.wpostGetALTS?window.wpostGetALTS().find(function(a){return a.id===altId;}):null;
          if(!alt) return;
          
          var showTooltip=function(){
            if(chip._tooltip) return; // Ya existe
            var rect=chip.getBoundingClientRect();
            var tooltip=document.createElement('div');
            tooltip.style.cssText='position:fixed;background:'+alt.color+';color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;z-index:10000;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.3);left:'+(rect.left+rect.width/2)+'px;top:'+(rect.top-8)+'px;transform:translate(-50%,-100%)';
            tooltip.textContent=alt.lbl;
            tooltip.className='wpost-tooltip';
            document.body.appendChild(tooltip);
            chip._tooltip=tooltip;
          };
          
          var hideTooltip=function(){
            if(chip._tooltip){chip._tooltip.remove();chip._tooltip=null;}
          };
          
          chip.addEventListener('mouseenter',showTooltip);
          chip.addEventListener('mouseleave',hideTooltip);
          chip.addEventListener('click',function(e){
            e.stopPropagation();
            if(chip._tooltip) hideTooltip();
            else showTooltip();
          });
          chip.addEventListener('touchstart',function(e){
            e.stopPropagation();
            showTooltip();
          });
          chip.addEventListener('touchend',hideTooltip);
        });
      },100);
    }catch(err){el.innerHTML='<div style="color:var(--red);font-size:12px;padding:8px">Error: '+err.message+'</div>';}
  }
}

function sesCard(s, pac, evalAp){
  const pr=session.rol==='admin'||session.rol==='docente';
  const puedeSend=(s.estado==='borrador'||s.estado==='rechazada')&&evalAp&&session.rol==='estudiante'&&(s.autor===session.codigo||s.autorCodigo===session.codigo||pac.asignadoA===session.codigo||pac.creadoPor===session.codigo);
  const uid='ses_'+s.id.replace(/[^a-z0-9]/gi,'_');

  // FIX: el docente solo puede revisar si es el asignado a esta sesión (o es admin)
  function puedeRevisarSes(){
    if(session.rol==='admin') return true;
    if(session.rol!=='docente') return false;
    var myName=(session.nombre||'').toLowerCase();
    var myCode=(session.codigo||'').toLowerCase();
    var dn=(s.docente||'').toLowerCase();
    var dc=(s.docenteCodigo||'').toLowerCase();
    return dn===myName||dn===myCode||dc===myCode||dc===myName;
  }
  const puedeRev = puedeRevisarSes();
  return `<div class="tl-item">
    <div class="tl-dot ${s.estado}">S${s.numero}</div>
    <div style="background:var(--surf2);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-left:4px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;cursor:pointer" onclick="toggleEvalInline('${uid}',null)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;transition:transform .2s" id="ico_${uid}">▶</span>
          <div style="font-size:12px;color:var(--tx)">
            <b>Sesión #${s.numero}</b> · ${formatFechaCorta(s.fecha)}
            ${s.estudiante||s.terapeuta?'<br><span style="font-size:11px;color:var(--tx4)">&#127891; '+(s.estudiante||s.terapeuta||'')+'</span>':''}
            ${s.docente?'<span style="font-size:11px;color:var(--tx4);margin-left:8px">&#128203; '+s.docente+'</span>':'' }
          </div>
        </div>
        ${bdg(s.estado)}
      </div>
      ${s.descripcion?`<div style="font-size:12px;color:var(--tx3);margin-bottom:6px">${e2(s.descripcion.substring(0,120))}${s.descripcion.length>120?'...':''}</div>`:''}
      <!-- Detalle expandible -->
      <div id="${uid}" style="display:none;margin-top:10px;border-top:1px solid var(--bd);padding-top:10px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:10px">
          <div><div style="font-size:10px;color:var(--tx4);font-weight:700">EVA</div><div style="font-size:13px;font-weight:700;color:var(--red)">${s.evaValor??'—'}/10</div></div>
          ${s.respuesta?`<div><div style="font-size:10px;color:var(--tx4);font-weight:700">RESPUESTA PACIENTE</div><div style="font-size:12px">${e2(s.respuesta)}</div></div>`:''}
        </div>
        ${s.descripcion?`<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--tx4);font-weight:700;margin-bottom:4px;text-transform:uppercase">Descripción completa</div><div style="font-size:12px;background:var(--surf3);border-radius:8px;padding:10px;line-height:1.6">${e2(s.descripcion)}</div></div>`:''}
        ${(s.estado==='aprobada'||s.estado==='rechazada')&&s.revisadoPor ? `
        <div style="margin-top:10px;padding:12px 14px;border-radius:10px;background:${s.estado==='aprobada'?'var(--green2)':'var(--red2)'};border:1px solid ${s.estado==='aprobada'?'rgba(34,197,94,.3)':'rgba(239,68,68,.25)'};display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:${s.estado==='aprobada'?'var(--green)':'var(--red)'}">${s.estado==='aprobada'?'✅ Aprobada':'❌ Rechazada'} — ${e2(s.revisadoPor)}</div>
            ${s.comentarioDocente?`<div style="font-size:12px;color:var(--tx2);margin-top:4px;padding:6px 8px;background:rgba(0,0,0,.06);border-radius:6px">${e2(s.comentarioDocente)}</div>`:''}
          </div>
          <div style="flex-shrink:0">${mkSelloInline(s.revisadoPor||s.docente||'',uid)}</div>
        </div>` : ''}
      </div>
      <div class="btn-group" style="margin-top:8px">
        ${s.estado==='borrador'||s.estado==='rechazada'?`<button class="btn btn-ghost btn-sm" onclick="abrirFrmSes('${esc(pac.id)}','${esc(s.evaluacionId)}',${s.numero},'${esc(s.id)}')">✏️ Editar</button>`:''}
        ${puedeSend&&(s.estado==='borrador'||s.estado==='rechazada')?`<button class="btn btn-primary btn-sm" onclick="enviarSes('${esc(s.id)}','${esc(pac.id)}')">📤 Enviar</button>`:''}
        ${puedeRev&&s.estado==='pendiente'?`<button class="btn btn-success btn-sm" onclick="abrirRev('ses','${esc(s.id)}','${esc(pac.id)}')">📝 Revisar</button>`:''}
        ${s.estado==='pendiente'&&session.rol==='docente'&&!puedeRev?`<span style="font-size:11px;color:var(--tx4);padding:4px 8px">⏳ Asignado a otro docente</span>`:''}
      </div>
    </div>
  </div>`;
}

// ─── Editar evaluación rechazada/borrador con plantilla correcta por categoría ─
async function editarEvalAprobada(pacId, evalId, catId){
  // Solo admin y docente pueden usar esta función
  if(session.rol!=='admin'&&session.rol!=='docente'){
    toast('Sin permisos','Solo docentes y administradores pueden editar evaluaciones aprobadas','warn');
    return;
  }
  // Mismo flujo que editarEvalRechazada
  return editarEvalRechazada(pacId, evalId, catId);
}

async function editarEvalRechazada(pacId, evalId, catId){
  // Cargar tanto el paciente como la evaluación
  const [rP, rE] = await Promise.all([
    apiGet('obtenerPaciente', {id: pacId}),
    apiGet('obtenerEvaluacion', {id: evalId})
  ]);
  if(!rP.ok){ toast('Error al cargar paciente', rP.error, 'err'); return; }
  if(!rE.ok){ toast('Error al cargar evaluación', rE.error, 'err'); return; }

  const pac = rP.paciente;
  const ev  = rE.evaluacion;

  // Fusionar los datosEspecificos de la eval en el objeto pac
  // para que plantillaHTML(catId, pac) precargue todos los campos
  var datosEsp = ev.datosEspecificos || {};
  if(typeof datosEsp==='string'){try{datosEsp=JSON.parse(datosEsp);}catch(e){datosEsp={};}}
  const pacConDatos = Object.assign({}, pac, datosEsp, {
    // Campos del paciente tienen prioridad sobre datosEspecificos genéricos
    id:          pac.id,
    nombre:      pac.nombre,
    dni:         pac.dni,
    fechaNac:    pac.fechaNac,
    fechaInicio: pac.fechaInicio,
    categoriaId: catId || pac.categoriaId,
    // Guardar el id de la evaluación para que guardarHC actualice en lugar de crear
    _evalId:     evalId,
    _docenteEval: ev.docente || '',
    datosEspecificos: datosEsp
  });

  // Abrir el formulario con plantilla específica de la categoría
  await abrirFrmPac(pacConDatos);

  // Pre-seleccionar el docente guardado en la eval
  if(ev.docente){
    var inp = g('hcDocInput'); if(inp) inp.value = ev.docente;
    var hid = g('hcDoc');      if(hid) hid.value = ev.docente;
  }

  // Mostrar estado del consentimiento si ya existe
  if(ev.consentimientoPath){
    setTimeout(function(){
      var st=g('consentStatus'),vBtn=g('consentVerBtn'),dBtn=g('consentDelBtn');
      if(st) st.textContent='📎 Consentimiento adjunto';
      if(vBtn){ vBtn.style.display=''; vBtn.onclick=function(){ verConsentimientoUI(evalId); }; }
      if(dBtn){ dBtn.style.display=''; dBtn.onclick=function(){ eliminarConsentimientoUI(evalId); }; }
    },150);
  }
}

// ─── Formulario Evaluación ────────────────────────────
// ── DRAFT automático ─────────────────────────────────

async function enviarEval(evalId, pacId){
  if(!tryLock()) return;
  showSendOverlay('📤 Enviando al docente...','');
  try{
    const r=await apiPost({action:'guardarEvaluacion',id:evalId,estado:'pendiente'});
    hideSendOverlay();
    if(!r.ok){toast('Error',r.error,'err');return;}
    stopTimerBanner();
    toast('📤 Enviada al docente','','ok');
    cargarBadge();
    await delay(500);abrirPac(pacId);
  }catch(ex){ hideSendOverlay(); toast('Error inesperado',ex.message,'err'); }
}

// ─── Formulario Sesión ────────────────────────────────


function filtrarDocentesHC(val){
  var docentes=window._docentesHCList||[];
  var dd=g('hcDocenteDD');
  if(!dd) return;
  if(!val||!val.trim()){dd.style.display='none';return;}
  var v=val.toLowerCase();
  var matches=docentes.filter(function(d){
    return (d.nombre||'').toLowerCase().includes(v)||(d.codigo||'').toLowerCase().includes(v);
  });
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map(function(d){
    return '<div data-hnm="'+encodeURIComponent(d.nombre||d.codigo)+'" data-hcd="'+encodeURIComponent(d.codigo||'')+'" style="padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:10px;background:var(--n100);color:var(--n900);border-radius:4px;padding:1px 5px;font-weight:700">'+e2(d.rol)+'</span>'+e2(d.nombre||d.codigo)
      +(d.gradoAcademico?' <span style="font-size:10px;color:var(--tx4)">'+e2(d.gradoAcademico)+'</span>':'')
      +'</div>';
  }).join('');
  dd.style.display='block';
  // Mobile/tablet: posicionar junto al input usando !important para vencer el CSS
  if(window.innerWidth<=1024){
    var inp=g('hcDocInput');
    if(inp){
      var rect=inp.getBoundingClientRect();
      var sb=window.innerHeight-rect.bottom-8;
      var sa=rect.top-8;
      if(sb>=100||sb>=sa){
        dd.style.setProperty('top',(rect.bottom+4)+'px','important');
        dd.style.setProperty('bottom','auto','important');
      } else {
        dd.style.setProperty('bottom',(window.innerHeight-rect.top+4)+'px','important');
        dd.style.setProperty('top','auto','important');
      }
      dd.style.setProperty('left',Math.max(4,rect.left)+'px','important');
      dd.style.setProperty('right',Math.max(4,window.innerWidth-rect.right)+'px','important');
    }
  }
  dd.querySelectorAll('[data-hnm]').forEach(function(el){
    el.addEventListener('click',function(){ selDocHC(el.getAttribute('data-hnm'), el.getAttribute('data-hcd')); });
  });
}
function selDocHC(enc, codEnc){
  var nombre=decodeURIComponent(enc);
  var codigo=codEnc?decodeURIComponent(codEnc):'';
  var inp=g('hcDocInput'); if(inp) inp.value=nombre;
  var hid=g('hcDoc'); if(hid) hid.value=nombre;
  // Guardar también el código para filtrado exacto en pendientes
  var hidCod=g('hcDocCodigo'); if(hidCod) hidCod.value=codigo;
  var dd=g('hcDocenteDD'); if(dd) dd.style.display='none';
}
function filtrarDocentes(val, docentesParam){
  var docentes=docentesParam||window._docentesList||[];
  var dd=g('docenteDD');
  if(!val||!val.trim()){dd.style.display='none';return;}
  var v=val.toLowerCase();
  var matches=docentes.filter(function(d){
    return (d.nombre||'').toLowerCase().includes(v)||(d.codigo||'').toLowerCase().includes(v);
  });
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map(function(d){
    return '<div data-dnm="'+encodeURIComponent(d.nombre||d.codigo)+'" data-dcd="'+encodeURIComponent(d.codigo||'')+'" style="padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:10px;background:var(--n100);color:var(--n900);border-radius:4px;padding:1px 5px;font-weight:700">'+e2(d.rol)+'</span>'+e2(d.nombre||d.codigo)
      +(d.gradoAcademico?' <span style="font-size:10px;color:var(--tx4)">'+e2(d.gradoAcademico)+'</span>':'')
      +'</div>';
  }).join('');
  dd.style.display='block';
<<<<<<< Updated upstream
=======
  // Mobile/tablet: posicionar junto al input usando !important para vencer el CSS
>>>>>>> Stashed changes
  if(window.innerWidth<=1024){
    var inp2=g('sDocInput');
    if(inp2){
      var rect=inp2.getBoundingClientRect();
      var sb=window.innerHeight-rect.bottom-8;
<<<<<<< Updated upstream
      if(sb>=120||sb>=(rect.top-8)){dd.style.top=(rect.bottom+4)+'px';dd.style.bottom='auto';}
      else{dd.style.bottom=(window.innerHeight-rect.top+4)+'px';dd.style.top='auto';}
      dd.style.left=rect.left+'px';dd.style.right=(window.innerWidth-rect.right)+'px';
=======
      var sa=rect.top-8;
      if(sb>=100||sb>=sa){
        dd.style.setProperty('top',(rect.bottom+4)+'px','important');
        dd.style.setProperty('bottom','auto','important');
      } else {
        dd.style.setProperty('bottom',(window.innerHeight-rect.top+4)+'px','important');
        dd.style.setProperty('top','auto','important');
      }
      dd.style.setProperty('left',Math.max(4,rect.left)+'px','important');
      dd.style.setProperty('right',Math.max(4,window.innerWidth-rect.right)+'px','important');
>>>>>>> Stashed changes
    }
  }
  dd.querySelectorAll('[data-dnm]').forEach(function(el){
    el.addEventListener('click',function(){ selDoc(el.getAttribute('data-dnm'), el.getAttribute('data-dcd')); });
  });
}
function selDoc(enc, codEnc){
  var nombre=decodeURIComponent(enc);
  var codigo=codEnc?decodeURIComponent(codEnc):'';
  var inp=g('sDocInput'); if(inp) inp.value=nombre;
  var hid=g('sDoc'); if(hid) hid.value=nombre;
  var hidCod=g('sDocCodigo'); if(hidCod) hidCod.value=codigo;
  var dd=g('docenteDD'); if(dd) dd.style.display='none';
}
function abrirNuevaSes(pacId,evalId,num){
  var ses=window._sesActualesPac||[];
  var hasPend=ses.some(function(s){return s.estado==='pendiente';});
  if(hasPend&&session.rol==='estudiante'){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(8,15,28,.78);z-index:900;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);padding:16px';
    ov.innerHTML='<div style="background:var(--surf);border:1px solid var(--bd);border-radius:18px;padding:26px 22px;width:100%;max-width:380px;box-shadow:0 24px 60px rgba(0,0,0,.45)">'
      +'<div style="font-size:28px;text-align:center;margin-bottom:10px">⏳</div>'
      +'<div style="font-family:\'Syne\',sans-serif;font-weight:700;font-size:15px;color:var(--tx);text-align:center;margin-bottom:10px">Sesión pendiente de aprobación</div>'
      +'<div style="font-size:13px;color:var(--tx3);line-height:1.7;margin-bottom:20px;text-align:center">No puedes registrar una nueva sesión hasta que el docente apruebe la sesión anterior. Comunícate con tu docente supervisor.</div>'
      +'<button id="_sesCancelBtn" class="btn btn-primary" style="width:100%;justify-content:center">Entendido</button>'
      +'</div>';
    document.body.appendChild(ov);
    document.getElementById('_sesCancelBtn').onclick=function(){ov.remove();};
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    return;
  }
  abrirFrmSes(pacId,evalId,num,null);
}
async function abrirFrmSes(pacId, evalId, num, sesId=null){
  views.forEach(v=>g(v).style.display='none');
  const v=g('vSesForm'); v.style.display='block';
  let ses=null;
  if(sesId){const r=await apiGet('listarSesiones',{pacienteId:pacId});ses=(r.sesiones||[]).find(s=>s.id===sesId);}
  const hoy=new Date().toISOString().slice(0,10);
  // Respuesta del paciente solo cada 3 sesiones (ses 3,6,9,...)
  const mostrarRespuesta=(num%3===0);
  // Cargar docentes para el selector
  var docentes=[];
  try{const ru=await apiGet('listarUsuarios');docentes=(ru.usuarios||[]).filter(u=>u.rol==='docente');}catch(e){}
  window._docentesList=docentes; // guardar para el input
  const docenteActual=ses?.docente||'';

  v.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="abrirPac('${esc(pacId)}')">&#8592; Volver</button>
      <div class="card-title">&#128197; ${sesId?'Editar':'Nueva'} Sesi&oacute;n #${num}</div>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="field"><label>Fecha *</label>
          <input class="inp" id="sF" type="date" value="${ses?.fecha||hoy}"></div>
        <div class="field"><label>Estudiante</label>
          <input class="inp" id="sEst" value="${e2(ses?.estudiante||session.nombre||session.codigo)}" placeholder="Nombre del estudiante" ${session.rol==='estudiante'?'readonly style="background:var(--surf2);cursor:default"':''}></div>
        <div class="field"><label>Docente</label>
          <div style="position:relative">
            <input class="inp" id="sDocInput" placeholder="Buscar docente..." value="${e2(docenteActual)}" oninput="filtrarDocentes(this.value)" autocomplete="off">
            <div id="docenteDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:50;max-height:180px;overflow-y:auto;margin-top:4px"></div>
          </div>
          <input type="hidden" id="sDoc" value="${e2(docenteActual)}">
          <input type="hidden" id="sDocCodigo" value="">
        </div>
        <div class="field"><label>EVA / Dolor (opcional)</label>
          <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <input type="number" class="inp" id="sesEva" min="0" max="10" step="1" style="width:80px" value="${ses?.evaValor!==null&&ses?.evaValor!==undefined&&ses?.evaValor!==''?ses.evaValor:''}" placeholder="—">
            <span style="font-size:11px;color:var(--tx3)">0 = sin dolor · 10 = máximo</span>
          </div></div>
        <div class="field form-full"><label>Descripci&oacute;n de la sesi&oacute;n *</label>
          <textarea class="ta" id="sDes" rows="5" placeholder="Procedimientos realizados, par&aacute;metros, &aacute;reas tratadas...">${e2(ses?.descripcion||'')}</textarea></div>
        ${mostrarRespuesta?`<div class="field form-full">
          <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding:7px 12px;background:var(--surf3);border-radius:8px">&#128203; Respuesta del paciente (sesi&oacute;n #${num})</div>
          <select class="sel" id="sRes">
            <option value=""></option>
            ${['Muy buena','Buena','Regular','Sin cambios','Deterioro leve','Intolerancia'].map(r=>`<option ${ses?.respuesta===r?'selected':''}>${r}</option>`).join('')}
          </select></div>`:''}
      </div>
      <div class="btn-group" style="margin-top:16px">
        <button class="btn btn-ghost" onclick="abrirPac('${esc(pacId)}')">✕ Cancelar</button>
        <button class="btn btn-ghost btn-sm" onclick="guardarSes('${esc(pacId)}','${esc(evalId)}',${num},'${sesId||''}','borrador')">💾 Guardar borrador</button>
        <button class="btn btn-primary" onclick="guardarSes('${esc(pacId)}','${esc(evalId)}',${num},'${sesId||''}','enviar')">📤 Enviar al docente</button>
      </div>
    </div>`;
  // Cerrar dropdown docente al click fuera
  setTimeout(function(){
    document.addEventListener('click',function _ddClose(e){
      var dd=g('docenteDD');
      if(dd&&!dd.contains(e.target)&&e.target.id!=='sDocInput'){dd.style.display='none';document.removeEventListener('click',_ddClose);}
    });
  },100);
}

async function guardarSes(pacId, evalId, num, sesId, modo){
  if(!tryLock()) return;
  const des=g('sDes')?.value?.trim()||'';
  const doc=g('sDoc')?.value||g('sDocInput')?.value||'';
  const docCodigo=g('sDocCodigo')?.value||'';
  if(!doc){_busy=false;toast('⚠️ Debes seleccionar un docente supervisor','Es obligatorio para guardar la sesión','warn');return;}
  if(modo==='enviar'&&!des){_busy=false;toast('Completa la descripción de la sesión','','warn');return;}
  const estado=modo==='borrador'?'borrador':(session.rol==='estudiante'?'pendiente':'aprobada');
  showSendOverlay(
    modo==='borrador' ? '💾 Guardando sesión...' : (session.rol==='estudiante' ? '📤 Enviando sesión...' : '✅ Guardando sesión...'),
    modo==='borrador' ? '' : (session.rol==='estudiante' ? 'El docente '+doc+' recibirá la sesión' : '')
  );
  try{
    const b={action:'guardarSesion',pacienteId:pacId,evaluacionId:evalId,numero:num,
      fecha:g('sF')?.value||'',
      estudiante:g('sEst')?.value||session.nombre||session.codigo,
      docente:doc, docenteCodigo:docCodigo,
      evaValor:g('sesEva')?.value!==''&&g('sesEva')?.value!==null?Number(g('sesEva').value):null,
      descripcion:des,respuesta:g('sRes')?.value||'',estado};
    if(sesId) b.id=sesId;
    const r=await apiPost(b);
    hideSendOverlay();
    if(!r.ok){toast('Error',r.error,'err');return;}
    const msgs={pendiente:'📤 Enviada al docente',aprobada:'✅ Sesión guardada',borrador:'💾 Borrador guardado'};
    toast(msgs[estado],'','ok');
    if(estado==='pendiente') cargarBadge();
    await delay(500);abrirPac(pacId);
  }catch(ex){ hideSendOverlay(); toast('Error inesperado',ex.message,'err'); }
}

async function enviarSes(sesId, pacId){
  if(!tryLock()) return;
  showSendOverlay('📤 Enviando sesión...','');
  try{
    const r=await apiPost({action:'guardarSesion',id:sesId,estado:'pendiente'});
    hideSendOverlay();
    if(!r.ok){toast('Error',r.error,'err');return;}
    toast('📤 Enviada al docente','','ok');
    cargarBadge();
    await delay(500);abrirPac(pacId);
  }catch(ex){ hideSendOverlay(); toast('Error inesperado',ex.message,'err'); }
}

// ─── Revisión (docente/admin) ─────────────────────────
function abrirRev(tipo, id, pacId){
  revTarget={tipo,id,pacId};
  g('modalRevTit').textContent=tipo==='eval'?'Revisar evaluación':'Revisar sesión';
  g('modalRevCom').value='';
  g('modalRev').classList.add('open');
}
function cerrarRev(){g('modalRev').classList.remove('open');revTarget=null;}
async function confirmarRev(estado){
  if(!revTarget)return;
  const com=g('modalRevCom')?.value?.trim()||'';
  if(estado==='rechazada'&&!com){toast('Escribe un comentario para el alumno','','warn');return;}

  // FIX: guardar los datos de revTarget ANTES de cerrar el modal,
  // porque cerrarRev() pone revTarget=null y luego no se puede acceder.
  const _tipo  = revTarget.tipo;
  const _id    = revTarget.id;
  const _pacId = revTarget.pacId;
  cerrarRev(); // ahora es seguro cerrar: ya tenemos copias de los datos

  showSendOverlay(
    estado==='aprobada' ? '✅ Aprobando...' : '❌ Rechazando...',
    estado==='aprobada' ? 'Notificando al alumno' : 'Enviando comentario al alumno'
  );
  try{
    const action = _tipo==='eval' ? 'revisarEvaluacion' : 'revisarSesion';
    const revisadoPor = (session&&session.nombre) ? session.nombre : (session&&session.codigo ? session.codigo : '');
    const r=await apiPost({action, id:_id, estado, comentario:com, revisadoPor});
    if(!r.ok){hideSendOverlay();toast('Error',r.error||'Error desconocido','err');return;}
    if(estado==='aprobada'&&session){
      try{
        var rU=await apiGet('listarUsuarios').catch(function(){return {ok:false};});
        if(rU.ok){
          var docMe=(rU.usuarios||[]).find(function(u){
            return u.codigo===session.codigo||u.nombre===session.nombre;
          });
          if(docMe&&docMe.firma){
            await resolverFirmaDoc_(docMe);
            window._firmaRevisorActual=docMe;
          }
        }
      }catch(e){ console.warn('No se pudo cargar firma del revisor:',e); }
    }
    hideSendOverlay();
    toast(estado==='aprobada'?'✅ Aprobado':'❌ Rechazado','','ok');
    cargarBadge();
    if(_pacId){ await delay(500); abrirPac(_pacId); } // usar la copia local, no revTarget (que ya es null)
  }catch(ex){ hideSendOverlay(); toast('Error inesperado',ex.message,'err'); }
}

// ─── Vista: Pendientes ────────────────────────────────
async function renderPend(){
  g('vPend').innerHTML='<div class="loader">⏳ Cargando pendientes...</div>';
  const r=await apiGet('pendientesRevision');
  if(!r.ok){g('vPend').innerHTML=`<div class="err-box">${e2(r.error)}</div>`;return;}
  var evAll=r.evaluaciones||[], sesAll=r.sesiones||[];
  // Si es docente, filtrar solo los asignados a este docente
  var ev=evAll, ses=sesAll;
  if(session.rol==='docente'){
    var myName=(session.nombre||'').toLowerCase();
    var myCode=(session.codigo||'').toLowerCase();
    ev=evAll.filter(function(e){
      var dn=(e.docente||'').toLowerCase();
      var dc=(e.docenteCodigo||'').toLowerCase();
      return dn===myName||dn===myCode||dc===myCode||dc===myName;
    });
    ses=sesAll.filter(function(s){
      var dn=(s.docente||'').toLowerCase();
      var dc=(s.docenteCodigo||'').toLowerCase();
      return dn===myName||dn===myCode||dc===myCode||dc===myName;
    });
  }
  const tot=ev.length+ses.length;
  const pnoms={};
  await Promise.all([...new Set([...ev.map(e=>e.pacienteId),...ses.map(s=>s.pacienteId)])].map(async id=>{
    const rp=await apiGet('obtenerPaciente',{id});if(rp.ok)pnoms[id]=rp.paciente?.nombre||id;
  }));

  g('vPend').innerHTML=`
    <div class="card-hdr"><div class="card-title">Pendientes de revisión</div><span class="badge ${tot?'pendiente':'aprobada'}">${tot} pendiente(s)</span></div>
    ${tot===0?'<div class="empty">✅ Todo al día. Sin pendientes.</div>':''}
    ${ev.length?`<div style="font-size:11px;font-weight:700;color:var(--tx4);text-transform:uppercase;margin-bottom:8px">Evaluaciones (${ev.length})</div>
      ${ev.map(e=>{const esVencida=e.estado==='vencida';return `<div style="background:var(--surf2);border:1px solid ${esVencida?'#b45309':'var(--amber)'};border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px${esVencida?';background:#fef3c7':''}">
        <div><div style="font-weight:700">${e2(pnoms[e.pacienteId]||e.pacienteId)} ${bdg(e.estado||'pendiente')}</div>
          <div style="font-size:12px;color:var(--tx3)">Evaluación · ${e2(e.autor)} · ${formatFechaCorta(e.fecha)}</div>${esVencida?'<div style="font-size:11px;color:#b45309;margin-top:3px">⏰ Tiempo vencido — asigna la nota manualmente</div>':''}</div>
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="abrirPac('${esc(e.pacienteId)}')">👁️ Ver</button>
          <button class="btn btn-success btn-sm" onclick="abrirRev('eval','${esc(e.id)}','${esc(e.pacienteId)}')">📝 Revisar</button>
        </div></div>`;}).join('')}`:''}
    ${ses.length?`<div style="font-size:11px;font-weight:700;color:var(--tx4);text-transform:uppercase;margin:14px 0 8px">Sesiones (${ses.length})</div>
      ${ses.map(s=>`<div style="background:var(--surf2);border:1px solid var(--amber);border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><div style="font-weight:700">${e2(pnoms[s.pacienteId]||s.pacienteId)}</div>
          <div style="font-size:12px;color:var(--tx3)">Sesión #${s.numero} · ${e2(s.autor)} · ${formatFechaCorta(s.fecha)}</div></div>
        <div class="btn-group">
          <button class="btn btn-ghost btn-sm" onclick="abrirPac('${esc(s.pacienteId)}')">👁️ Ver</button>
          <button class="btn btn-success btn-sm" onclick="abrirRev('ses','${esc(s.id)}','${esc(s.pacienteId)}')">📝 Revisar</button>
        </div></div>`).join('')}`:''}
  `;
}

async function cargarBadge(){
  if(session.rol==='estudiante')return;
  const r=await apiGet('pendientesRevision').catch(()=>({ok:false}));
  if(!r.ok)return;
  var evB=r.evaluaciones||[],sesB=r.sesiones||[];
  if(session.rol==='docente'){
    var bn=(session.nombre||'').toLowerCase(),bc=(session.codigo||'').toLowerCase();
    evB=evB.filter(function(e){
      var dn=(e.docente||'').toLowerCase();
      var dc=(e.docenteCodigo||'').toLowerCase();
      return dn===bn||dn===bc||dc===bc||dc===bn;
    });
    sesB=sesB.filter(function(s){
      var dn=(s.docente||'').toLowerCase();
      var dc=(s.docenteCodigo||'').toLowerCase();
      return dn===bn||dn===bc||dc===bc||dc===bn;
    });
  }
  const t=evB.length+sesB.length;
  const b=g('sbBadge');if(b){b.textContent=t;b.style.display=t?'':'none';}
}

// ─── Vista: Categorías ────────────────────────────────
function renderCats(){
  g('vCats').innerHTML=`
    <div class="card-hdr"><div class="card-title">Categorías</div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">
      ${cats.map(c=>`<div style="background:var(--surf2);border:1px solid ${c.color}44;border-radius:14px;padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:12px;height:12px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
          <div style="font-weight:700;font-size:14px;color:#fff">${e2(c.nombre)}</div>
        </div>
        <div style="font-size:12px;color:var(--tx3)">${e2(c.descripcion)}</div>
      </div>`).join('')}
    </div>
    <div style="margin-top:14px;padding:14px;background:var(--surf2);border:1px solid var(--bd);border-radius:12px;font-size:12px;color:var(--tx3)">
      Las plantillas específicas por categoría se pueden personalizar. Puedes proporcionar los campos adicionales para cada categoría y se integrarán en la evaluación.
    </div>`;
}

// ─── Ver detalle ──────────────────────────────────────
async function editarPac(id){
  const r=await apiGet('obtenerPaciente',{id});
  if(!r.ok){toast('Error',r.error,'err');return;}
  const pac=r.paciente;
  // Buscar la evaluación más reciente para actualizar en lugar de crear una nueva
  const rE=await apiGet('listarEvaluaciones',{pacienteId:id}).catch(function(){return {ok:false};});
  const evals=(rE.ok&&rE.evaluaciones)||[];
  const ultimaEval=evals.sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');})[0]||null;
  if(ultimaEval){
    const rEv=await apiGet('obtenerEvaluacion',{id:ultimaEval.id}).catch(function(){return {ok:false};});
    if(rEv.ok){
      var datosEsp=rEv.evaluacion.datosEspecificos||{};
      if(typeof datosEsp==='string'){try{datosEsp=JSON.parse(datosEsp);}catch(e){datosEsp={};}}
      await abrirFrmPac(Object.assign({},pac,datosEsp,{
        id:pac.id,nombre:pac.nombre,dni:pac.dni,fechaNac:pac.fechaNac,fechaInicio:pac.fechaInicio,
        _evalId:ultimaEval.id,datosEspecificos:datosEsp
      }));
      // Restaurar estado visual del consentimiento si ya existe (igual que editarEvalRechazada)
      if(rEv.evaluacion.consentimientoPath){
        var evalIdCons=ultimaEval.id;
        setTimeout(function(){
          var st=g('consentStatus'),vBtn=g('consentVerBtn'),dBtn=g('consentDelBtn');
          if(st) st.textContent='📎 Consentimiento adjunto';
          if(vBtn){ vBtn.style.display=''; vBtn.onclick=function(){ verConsentimientoUI(evalIdCons); }; }
          if(dBtn){ dBtn.style.display=''; dBtn.onclick=function(){ eliminarConsentimientoUI(evalIdCons); }; }
        },150);
      }
      return;
    }
  }
  abrirFrmPac(pac);
}

async function eliminarPac(id, nombre){
  if(!confirm('¿Eliminar la atención de "'+nombre+'"?\n\nSolo se eliminará ESTA ficha (evaluaciones y sesiones incluidas).\nLas demás atenciones NO se verán afectadas.\n\nEsta acción no se puede deshacer.'))return;
  const r=await apiPost({action:'eliminarPaciente',id});
  if(!r.ok){toast('Error',r.error,'err');return;}
  toast('Paciente eliminado','','ok');
  await delay(500);navTo('pac');
}

async function eliminarEval(evalId, pacId, numEval){
  if(!confirm('¿Eliminar Evaluación #'+numEval+'?\n\nSolo se eliminará ESTA evaluación.\nLas sesiones y otras evaluaciones del paciente NO se verán afectadas.\n\nEsta acción no se puede deshacer.'))return;
  const r=await apiPost({action:'eliminarEvaluacion',evalId});
  if(!r.ok){toast('Error',r.error,'err');return;}
  toast('Evaluación eliminada','','ok');
  await delay(400);abrirPac(pacId);
}

async function reasignarPac(pacId){
  const nuevo=g('selReasig')?.value;
  if(!nuevo){toast('Selecciona un alumno','','warn');return;}
  const r=await apiPost({action:'reasignarPaciente',pacienteId:pacId,nuevoAlumno:nuevo});
  if(!r.ok){toast('Error',r.error,'err');return;}
  toast('Paciente reasignado','','ok');
  await delay(500);abrirPac(pacId);
}

async function archivarAtencion(pacId, pacNombre){
  const confirmado=confirm(`¿Archivar la atención de "${pacNombre}"?\n\nEsto desasignará al alumno y archivará el paciente. Solo será accesible desde "Buscar HC".`);
  if(!confirmado) return;
  
  try{
    showSendOverlay('Archivando...','Procesando solicitud');
    const r=await apiPost({action:'archivarPaciente',pacienteId:pacId});
    hideSendOverlay();
    if(!r.ok){toast('Error',r.error,'err');return;}
    toast('✅ Atención archivada','El paciente ha sido archivado','ok');
    await delay(500);
    navTo('pac');
  }catch(ex){
    hideSendOverlay();
    toast('Error inesperado',ex.message,'err');
  }
}
// ══════════════════════════════════════════════════
// PLANTILLAS POR CATEGORÍA
// ══════════════════════════════════════════════════
