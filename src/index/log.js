// ── log.js: log de notas + log de casilleros + sidebar stubs + cambio de pass
// Depende de: core.js (g, vi, toast, showLoader, hideLoader)
//             session.js (session)
//             api.js (apiGetCached, apiPost, invalidateCache)

// ── LOG DE NOTAS ──────────────────────────────────────────────
async function cargarLog(){
  const box=g('logList');if(!box)return;
  box.innerHTML='<div class="empty">Cargando...</div>';
  const sel=g('logFiltroHoja');
  if(sel&&sel.options.length<=1){
    try{
      const rh=await apiGetCached('listarHojas');
      if(rh.ok){
        var SIS=['Casilleros','_usuarios','Log'];
        rh.hojas.filter(h=>SIS.indexOf(h.nombre)<0).forEach(h=>{
          if(![...sel.options].find(o=>o.value===h.nombre)){
            const o=document.createElement('option');o.value=h.nombre;o.textContent=h.nombre;sel.appendChild(o);
          }
        });
      }
    }catch(e){}
  }
  const hojaFiltro=vi('logFiltroHoja')||'';
  try{
    const r=await apiGetCached('leerLog',{hoja:hojaFiltro,limite:0});
    if(!r.ok)throw new Error(r.error);
    if(!r.registros||!r.registros.length){box.innerHTML='<div class="empty">Sin registros</div>';return}
    // Guardar todos los registros para filtrar sin re-fetch
    box._allRows = r.registros;
    renderLogRows(r.registros, box);
  }catch(e){box.innerHTML=`<div class="hint" style="padding:12px">Error: ${e.message}</div>`}
}

function renderLogRows(registros, box){
  if(!box) box = g('logList');
  if(!registros||!registros.length){box.innerHTML='<div class="empty">Sin resultados</div>';return;}
  box.innerHTML=`<div style="background:var(--n900);padding:6px 10px;position:sticky;top:0;display:grid;grid-template-columns:110px 90px 1fr 60px 40px 55px;gap:5px;font-size:10px;font-weight:700;color:var(--n300);text-transform:uppercase;letter-spacing:.6px">
    <span>Fecha/Hora</span><span>Docente</span><span>Alumno / Curso / Pac.</span><span>Tipo</span><span>N°</span><span>Valor</span>
  </div>`+registros.map(reg=>{
    const tipo=reg.tipo==='SS'?'ss':'ex';
    const antStr=reg.anterior!=null&&reg.anterior!=='-'?reg.anterior:'-';
    const nuevoStr=reg.nuevo!=null&&reg.nuevo!=='-'?reg.nuevo:'-';
    return`<div class="log-row">
      <span class="log-ts">${reg.ts||''}</span>
      <span class="log-doc" title="${reg.docente||''}">${reg.docente||'—'}</span>
      <span class="log-info" title="${reg.alumno||''} | ${reg.curso||''} | ${reg.subgrupo||''} | ${reg.paciente||''}">${reg.alumno||''} &rsaquo; ${reg.curso||''} &rsaquo; ${reg.paciente||''}</span>
      <span class="log-tipo ${tipo}">${reg.tipo||''}</span>
      <span style="text-align:center;font-family:'DM Mono',monospace;font-weight:700">${reg.nro!=null?reg.nro:''}</span>
      <span style="font-family:'DM Mono',monospace;font-size:11px;text-align:center;color:var(--n500);font-weight:700">${antStr}&#8594;${nuevoStr}</span>
    </div>`;
  }).join('');
}

function filtrarLogAlumno(){
  const box=g('logList');
  if(!box||!box._allRows)return;
  const q=(vi('logFiltroAlumno')||'').toLowerCase().trim();
  if(!q){renderLogRows(box._allRows,box);return;}
  const filtrados=box._allRows.filter(r=>
    (r.alumno||'').toLowerCase().indexOf(q)>=0 ||
    (r.docente||'').toLowerCase().indexOf(q)>=0
  );
  renderLogRows(filtrados,box);
}

// ── LOG DE CASILLEROS ─────────────────────────────────────
let _logCasData = [];

async function cargarLogCasilleros(){
  const box=g('logCasList');if(!box)return;
  box.innerHTML='<div class="empty">Cargando...</div>';
  try{
    const r=await apiGetCached('leerLogCasilleros',{limite:200});
    if(!r.ok)throw new Error(r.error);
    _logCasData=r.registros||[];
    renderLogCasRows(_logCasData);
  }catch(e){box.innerHTML=`<div class="hint" style="padding:12px">Error: ${e.message}</div>`}
}

function renderLogCasRows(registros){
  const box=g('logCasList');if(!box)return;
  if(!registros||!registros.length){box.innerHTML='<div class="empty">Sin registros de casilleros</div>';return;}
  box.innerHTML=`<div style="background:var(--n900);padding:6px 10px;position:sticky;top:0;display:grid;grid-template-columns:130px 70px 70px 1fr 110px;gap:5px;font-size:10px;font-weight:700;color:var(--n300);text-transform:uppercase;letter-spacing:.6px">
    <span>Fecha/Hora</span><span>Acción</span><span>Casillero</span><span>Alumno</span><span>Asignado por</span>
  </div>`+registros.map(reg=>{
    const esAsig=reg.accion==='ASIGNAR';
    const accionColor=esAsig?'var(--green)':'var(--amber)';
    const accionBg=esAsig?'var(--green2)':'var(--amber2)';
    return`<div style="display:grid;grid-template-columns:130px 70px 70px 1fr 110px;gap:5px;align-items:center;padding:7px 10px;border-bottom:1px solid var(--bd2);font-size:11px">
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--tx4)">${reg.ts||''}</span>
      <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${accionBg};color:${accionColor};text-align:center">${reg.accion||''}</span>
      <span style="font-family:'DM Mono',monospace;font-weight:700;color:var(--n500);text-align:center">${reg.casillero||''}</span>
      <div>
        <div style="font-weight:600;color:var(--tx)">${reg.alumnoNombre||'—'}</div>
        <div style="font-size:10px;color:var(--tx4);font-family:'DM Mono',monospace">${reg.alumnoCodigo||''}</div>
      </div>
      <span style="font-size:11px;color:var(--n500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${reg.asignadoPor||''}">${reg.asignadoPor||'—'}</span>
    </div>`;
  }).join('');
}

function filtrarLogCas(){
  const q=(vi('logCasFiltro')||'').toLowerCase().trim();
  if(!q){renderLogCasRows(_logCasData);return;}
  const f=_logCasData.filter(r=>
    (r.alumnoNombre||'').toLowerCase().indexOf(q)>=0||
    (r.alumnoCodigo||'').toLowerCase().indexOf(q)>=0||
    (r.casillero||'').toLowerCase().indexOf(q)>=0||
    (r.asignadoPor||'').toLowerCase().indexOf(q)>=0
  );
  renderLogCasRows(f);
}

function logSwitchTab(tab){
  const tN=g('logTabNotas'),tC=g('logTabCas');
  const pN=g('logPanelNotas'),pC=g('logPanelCas');
  if(tab==='notas'){
    pN.style.display='';pC.style.display='none';
    tN.style.background='rgba(59,130,246,.15)';tN.style.borderBottomColor='var(--n400)';tN.style.color='#fff';
    tC.style.background='none';tC.style.borderBottomColor='transparent';tC.style.color='var(--n300)';
    cargarLog();
  } else {
    pN.style.display='none';pC.style.display='';
    tC.style.background='rgba(5,150,105,.12)';tC.style.borderBottomColor='var(--green)';tC.style.color='#fff';
    tN.style.background='none';tN.style.borderBottomColor='transparent';tN.style.color='var(--n300)';
    cargarLogCasilleros();
  }
}



// ── SIDEBAR DESLIZABLE ───────────────────────────────────────
let _sidebarOpen = false;
function toggleSidebar(){ /* sidebar eliminado */ }
function closeSidebar(){ /* sidebar eliminado */ }
function hideSidebar(){ /* sidebar eliminado */ }


// ── CAMBIO DE CONTRASEÑA ─────────────────────────────────────
function mostrarCambioPass(){
  g('passActual').value='';g('passNueva').value='';g('passConfirm').value='';
  const err=g('passErr');if(err){err.style.display='none';err.textContent=''}
  g('passModal').classList.add('show');
  setTimeout(()=>g('passActual').focus(),100);
}
function cerrarPassModal(){
  g('passModal').classList.remove('show');
}
async function guardarNuevaPass(){
  const actual=g('passActual').value.trim();
  const nueva=g('passNueva').value.trim();
  const confirm=g('passConfirm').value.trim();
  const err=g('passErr');
  const showErr=m=>{err.textContent=m;err.style.display='block'};
  if(!actual||!nueva||!confirm){showErr('Completa todos los campos');return}
  if(nueva!==confirm){showErr('Las contrasenas nuevas no coinciden');return}
  if(nueva.length<6){showErr('La contrasena debe tener al menos 6 caracteres');return}
  if(!session){showErr('No hay sesion activa');return}
  showLoader('Actualizando contrasena...');
  try{
    // Usar la accion cambiarPassword (disponible para todos los roles)
    const r=await apiPost({
      action:'cambiarPassword',
      passwordActual:actual,
      passwordNueva:nueva
    });
    hideLoader();
    if(!r.ok)throw new Error(r.error||'Error al cambiar contrasena');
    // El token se invalida al cambiar la password, forzar nuevo login
    clearSession();
    session=null;
    cerrarPassModal();
    toast('Contrasena actualizada','Por seguridad, inicia sesion nuevamente con tu nueva contrasena','ok');
    setTimeout(()=>{
      g('appPage').style.display='none';
      g('loginPage').style.display='flex';
      g('lgCode').value='';
      g('lgPass').value='';
      g('lgErr').classList.remove('show');
    },2200);
  }catch(e){hideLoader();showErr('Error: '+e.message)}
}
// Cerrar modal al hacer clic fuera
g('passModal')&&g('passModal').addEventListener('click',function(e){
  if(e.target===this)cerrarPassModal();
});


// ════════════════════════════════════════════════════════
// AGENDA / CALENDARIO
// ════════════════════════════════════════════════════════
