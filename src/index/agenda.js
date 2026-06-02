// ── agenda.js: sistema completo de agenda (admin + docente + estudiante) ─────
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader, confirmDialog)
//             session.js (session, hojaActiva)
//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)
//             notas.js (abrirHoja)
//             vistas.js (iniciarVistaEstudiante)

let agendaCfg   = { areas:[], franjas:[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}], mensajeUltimaHora:'', mensajeUltimaHoraArea:'*' };
let agendaReservas = [];
let calFechaBase   = new Date();
let rsvPendiente   = null;

// ── Reservas borradas recientemente (filtro anti-cache-GAS) ───────────────
// Cuando GAS tarda en invalidar su cache, el cliente filtra los borrados.
// Se persiste en sessionStorage para sobrevivir recargas de página.
const _RSV_BORRADAS_TTL = 10 * 60 * 1000; // 10 min — cubre el cache server-side de GAS
const _rsvBorradas = {}; // { key: expiryTimestamp }
(function _loadRsvBorradas(){
  try{
    const stored = JSON.parse(sessionStorage.getItem('_rsvBorradas') || '{}');
    const now = Date.now();
    Object.entries(stored).forEach(([k, exp]) => { if(exp > now) _rsvBorradas[k] = exp; });
  }catch(e){}
})();
function _markRsvDeleted(fecha, hora, area, camilla){
  const k = [fecha,hora,area,camilla].map(s=>String(s).trim().toLowerCase()).join('|');
  _rsvBorradas[k] = Date.now() + _RSV_BORRADAS_TTL;
  try{ sessionStorage.setItem('_rsvBorradas', JSON.stringify(_rsvBorradas)); }catch(e){}
}
function _filterRsvBorradas(reservas){
  const now = Date.now();
  // Limpiar entradas expiradas de memoria y storage
  let changed = false;
  Object.keys(_rsvBorradas).forEach(k=>{ if(_rsvBorradas[k] <= now){ delete _rsvBorradas[k]; changed = true; } });
  if(changed) try{ sessionStorage.setItem('_rsvBorradas', JSON.stringify(_rsvBorradas)); }catch(e){}
  if(!Object.keys(_rsvBorradas).length) return reservas;
  return reservas.filter(rv=>{
    const k=[rv.fecha,rv.horaInicio,rv.area,rv.camilla].map(s=>String(s).trim().toLowerCase()).join('|');
    return !_rsvBorradas[k];
  });
}

const DIAS_NOM = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];

function getLunes(d){
  const dt=new Date(d); dt.setHours(0,0,0,0);
  const dia=dt.getDay();
  if(dia===0) dt.setDate(dt.getDate()+1);
  else { const diff=1-dia; dt.setDate(dt.getDate()+diff); }
  return dt;
}
function fmt(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function fmtDia(d){ return String(d.getDate()).padStart(2,'0')+'/'+(d.getMonth()+1); }

// Convierte "HH:MM" a minutos totales desde medianoche
function timeToMin(t){ const [h,m]=t.split(':').map(Number); return h*60+(m||0); }
// Convierte minutos totales a "HH:MM"
function minToTime(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }

// Retorna true si `hora` (HH:MM) es el último slot de alguna franja
function esUltimaHoraFranja(hora, franjas, durMin){
  const dur=(durMin&&durMin>0)?durMin:60;
  return (franjas||[]).some(function(fr){
    const end=timeToMin(fr.fin);
    const lastStart=end-dur;
    return lastStart>=timeToMin(fr.inicio)&&timeToMin(hora)===lastStart;
  });
}

// Genera slots a partir de las franjas con una duración en minutos.
// Retorna array de objetos { inicio:"08:00", fin:"08:30" }
function generarSlots(franjas, duracionMin){
  const dur = (duracionMin && duracionMin > 0) ? duracionMin : 60;
  const slots=[];
  (franjas||[]).forEach(fr=>{
    let cur = timeToMin(fr.inicio);
    const end = timeToMin(fr.fin);
    while(cur + dur <= end){
      slots.push({ inicio: minToTime(cur), fin: minToTime(cur + dur) });
      cur += dur;
    }
  });
  return slots;
}

// ── Carga inicial ─────────────────────────────────────────
async function iniciarAgenda(){
  try{
    const r=await apiGetCached('leerAgendaConfig');
    if(r.ok) agendaCfg=r.config;
    // Migrar config antigua (camillas → espacios)
    agendaCfg.areas=agendaCfg.areas.map(a=>{
      if(!a.espacios&&a.camillas){
        a.espacios=Array.from({length:a.camillas},(_,i)=>({nombre:'Camilla '+(i+1),capacidad:1}));
      }
      if(!a.espacios) a.espacios=[{nombre:'Espacio 1',capacidad:1}];
      return a;
    });
    if(!agendaCfg.franjas) agendaCfg.franjas=[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
    renderAreasConfig();
    actualizarFiltroArea();
    calFechaBase=getLunes(new Date());
    await cargarReservasSemana();
    // Cargar bloqueos de la semana
    const finSemB=new Date(calFechaBase);finSemB.setDate(finSemB.getDate()+5);
    await cargarBloqueos(fmt(calFechaBase),fmt(finSemB));
    renderCalendario();
    // También cargar lista de reservas y bloqueos
    setTimeout(()=>{cargarListaReservas();renderListaBloqueos();actualizarSelectsBloqueo();}, 500);
  }catch(e){toast('Error al cargar agenda',e.message,'err')}
}

function _recargarCalendarios(){
  // 1. Render inmediato con datos actuales (sin esperar red)
  agendaReservas=[];
  renderCalendario();
  const v=new Date(calFechaBase);v.setDate(v.getDate()+5);
  const lbl=g('calSemanaLabel');
  if(lbl)lbl.textContent=fmtDia(calFechaBase)+' \u2013 '+fmtDia(v)+' / '+v.getFullYear();
  // Poner el grid en estado cargando de forma sutil
  const grid=g('calGrid');
  if(grid)grid.style.opacity='0.45';
  // 2. Cargar datos en paralelo y actualizar
  const finSem=new Date(calFechaBase);finSem.setDate(finSem.getDate()+5);
  Promise.all([
    cargarReservasSemana(),
    cargarBloqueos(fmt(calFechaBase),fmt(finSem))
  ]).then(()=>{
    renderCalendario();
    if(grid)grid.style.opacity='';
  }).catch(()=>{
    if(grid)grid.style.opacity='';
  });
}
function semanaAnterior(){ calFechaBase.setDate(calFechaBase.getDate()-7); _recargarCalendarios(); }
function semanaSiguiente(){ calFechaBase.setDate(calFechaBase.getDate()+7); _recargarCalendarios(); }
function irHoy(){ calFechaBase=getLunes(new Date()); _recargarCalendarios(); }

async function cargarReservasSemana(){
  const ini=fmt(calFechaBase);
  const finSem=new Date(calFechaBase); finSem.setDate(finSem.getDate()+5); // sábado
  try{
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fmt(finSem)});
    if(r.ok) agendaReservas=_filterRsvBorradas(r.reservas);
  }catch(e){ agendaReservas=[]; }
}
// ── RESERVAS DEL DÍA ─────────────────────────────────────
function verReservasHoy(){
  const panel = g('reservasHoyPanel');
  const body  = g('reservasHoyBody');
  const titulo = g('reservasHoyTitulo');
  if(!panel || !body) return;

  // Si ya está visible, lo cierra (toggle)
  if(panel.style.display !== 'none'){
    cerrarReservasHoy(); return;
  }

  const hoy = fmt(new Date());
  const fechaLabel = new Date().toLocaleDateString('es-PE',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
  if(titulo) titulo.innerHTML = '&#128203; Reservas · ' + fechaLabel;

  // Filtrar reservas de hoy de todas las áreas
  const reservasHoy = agendaReservas.filter(r => r.fecha === hoy);

  if(!reservasHoy.length){
    body.innerHTML = '<div class="empty" style="padding:20px">Sin reservas para hoy</div>';
    panel.style.display = 'block';
    setTimeout(() => panel.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
    return;
  }

  // Ordenar por hora
  reservasHoy.sort((a,b) => a.horaInicio.localeCompare(b.horaInicio));

  // Agrupar por área
  const porArea = {};
  reservasHoy.forEach(r => {
    if(!porArea[r.area]) porArea[r.area] = [];
    porArea[r.area].push(r);
  });

  const esAdmin  = session && session.rol === 'admin';
  const esDocente = session && session.rol === 'docente';
  const puedeElim = esAdmin || esDocente;

  body.innerHTML = Object.entries(porArea).map(([area, reservas]) => {
    const filas = reservas.map(r => {
      const nomEscFecha = r.fecha.replace(/'/g,"\\'");
      const nomEscHora  = r.horaInicio.replace(/'/g,"\\'");
      const nomEscArea  = r.area.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const nomEscCam   = r.camilla.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `<div style="display:grid;grid-template-columns:70px 100px 1fr 1fr ${puedeElim?'28px':'0'};gap:8px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--bd2);font-size:12px">
        <span style="font-family:'DM Mono',monospace;font-weight:700;color:var(--n500)">${r.horaInicio}</span>
        <span style="font-size:11px;color:var(--tx3)">${r.camilla}</span>
        <div>
          <div style="font-weight:600;color:var(--tx)">${r.paciente||'—'}</div>
          ${r.observacion?`<div style="font-size:10px;color:var(--tx4)">${r.observacion}</div>`:''}
        </div>
        <div style="font-size:11px;color:var(--n500)">${r.docente||r.reservadoPor||'—'}</div>
        ${puedeElim?`<button onclick="eliminarReservaHoy('${nomEscFecha}','${nomEscHora}','${nomEscArea}','${nomEscCam}')" style="background:none;border:none;color:var(--tx4);cursor:pointer;font-size:13px;padding:0;transition:color .15s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--tx4)'" title="Cancelar">&#128465;</button>`:''}
      </div>`;
    }).join('');

    return `<div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.7px;padding:6px 12px;background:var(--surf2);border-bottom:1px solid var(--bd2)">${area} · ${reservas.length} reserva${reservas.length!==1?'s':''}</div>
      ${filas}
    </div>`;
  }).join('');

  // Fila de totales
  body.innerHTML += `<div style="padding:8px 12px;background:var(--n050);border-top:2px solid var(--bd2);font-size:12px;font-weight:700;color:var(--n600);display:flex;align-items:center;gap:8px">
    <span>&#128203;</span>
    <span>Total del día: <strong>${reservasHoy.length}</strong> reserva${reservasHoy.length!==1?'s':''} en <strong>${Object.keys(porArea).length}</strong> área${Object.keys(porArea).length!==1?'s':''}</span>
  </div>`;

  panel.style.display = 'block';
  setTimeout(() => panel.scrollIntoView({behavior:'smooth', block:'nearest'}), 100);
}

function cerrarReservasHoy(){
  const panel = g('reservasHoyPanel');
  if(panel) panel.style.display = 'none';
}

async function eliminarReservaHoy(fecha, hora, area, camilla){
  if(!await confirmDialog('Cancelar esta reserva?')) return;
  showLoader('Cancelando...');
  try{
    const r = await apiPost({action:'eliminarReserva', fecha, horaInicio:hora, area, camilla});
    hideLoader(); if(!r.ok) throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    // Actualización optimista: elimina de memoria y re-renderiza sin esperar re-fetch
    const _n=s=>String(s).trim().toLowerCase();
    agendaReservas=agendaReservas.filter(rv=>!(
      _n(rv.fecha)===_n(fecha)&&_n(rv.horaInicio)===_n(hora)&&
      _n(rv.area)===_n(area)&&_n(rv.camilla)===_n(camilla)
    ));
    _markRsvDeleted(fecha, hora, area, camilla);
    renderCalendario();
    verReservasHoy();
    invalidateCache('leerReservas');
  }catch(e){ hideLoader(); toast('Error', e.message, 'err'); }
}
// ── Renderizar calendario (admin + docente) ───────────────
function renderCalendario(){
  const finD=new Date(calFechaBase);finD.setDate(finD.getDate()+5);
  const vier=new Date(calFechaBase);vier.setDate(vier.getDate()+5);
  g('calSemanaLabel').textContent=fmtDia(calFechaBase)+' \u2013 '+fmtDia(vier)+' / '+vier.getFullYear();

  const areaFiltro=getAreaFiltro('calAreaFiltro');
  const areas=areaFiltro?agendaCfg.areas.filter(a=>a.nombre===areaFiltro):agendaCfg.areas;
  if(!areas.length){g('calGrid').innerHTML='<div class="empty" style="padding:20px">Sin areas configuradas.</div>';return;}

  const hoy=fmt(new Date());
  const ahora=new Date();
  const todosLosDias=[];
  for(let i=0;i<6;i++){const d=new Date(calFechaBase);d.setDate(d.getDate()+i);todosLosDias.push(d);}
// Mostrar siempre lunes a viernes de la semana base
// Los slots pasados se muestran en gris (manejado por la variable `pasado` más abajo)
const dias = todosLosDias;
  const esAdmin=session&&session.rol==='admin';
  const esDocente=session&&session.rol==='docente';
  const puedeElim=esAdmin||esDocente;
  const dw=window.innerWidth<=480?110:window.innerWidth<=768?140:200;

  let html='<div class="cal-grid-wrap"><div style="display:flex;flex-direction:column;min-width:max-content">';

  // Cabecera días (sticky)
  html+='<div style="display:flex;position:sticky;top:0;z-index:5;background:var(--surf)">';
  html+=`<div style="width:140px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);background:var(--surf2)"></div>`;
  dias.forEach(d=>{
    const esHoy=fmt(d)===hoy;
    html+=`<div style="width:${dw}px;flex-shrink:0"><div class="cal-day-hdr ${esHoy?'hoy':''}"><span class="dia-num">${d.getDate()}</span><span class="dia-nom">${DIAS_NOM[d.getDay()]}</span></div></div>`;
  });
  html+='</div>';

  areas.forEach(area=>{
    const durArea = area.duracion || 60;
    const slots = generarSlots(agendaCfg.franjas, durArea);
    html+=`<div style="background:var(--n700);color:var(--n200);padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:.5px;border-bottom:2px solid var(--n600)">${area.nombre}</div>`;

    slots.forEach((slot,hi)=>{
      const hora = slot.inicio;
      const horaFin = slot.fin;
      const horaLabel = hora + '\u2013' + horaFin;

      // Separador de receso entre franjas
      if(hi>0){
        const prevFin = timeToMin(slots[hi-1].fin);
        const currIni = timeToMin(slot.inicio);
        if(currIni > prevFin){
          html+=`<div style="height:8px;background:var(--n050);border-top:2px solid var(--bd2);border-bottom:2px solid var(--bd2);display:flex;align-items:center;padding-left:8px"><span style="font-size:9px;color:var(--tx4);font-weight:700">RECESO</span></div>`;
        }
      }

      (area.espacios||[]).forEach((esp,ei)=>{
        const cap=esp.capacidad||1;
        const borderTop=ei===0?'2px solid var(--n300)':'1px dashed var(--bd2)';
        html+=`<div style="display:flex;border-top:${borderTop}">`;

        // Columna fija: rango hora + espacio
        html+=`<div style="width:140px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);background:var(--surf2);padding:6px 10px;display:flex;flex-direction:column;justify-content:center">`;
        if(ei===0) html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:var(--tx);margin-bottom:2px;line-height:1.3">${horaLabel}</div>`;
        html+=`<div style="font-size:11px;font-weight:600;color:var(--n500)">${esp.nombre}</div>`;
        html+=`<div style="font-size:9px;color:var(--tx4)">${cap} lugar${cap!==1?'es':''}</div>`;
        html+='</div>';

        dias.forEach(d=>{
          const fechaStr=fmt(d);
          const pasado=new Date(fechaStr+'T'+hora+':00')<new Date();
          const norm=s=>String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const matchEsp=(r,en)=>{const rc=norm(r.camilla),ne=norm(en);return rc===ne||rc.startsWith(ne)||ne.startsWith(rc);};
          const rsvEsp=agendaReservas.filter(r=>norm(r.fecha)===norm(fechaStr)&&norm(r.horaInicio)===norm(hora)&&norm(r.area)===norm(area.nombre)&&matchEsp(r,esp.nombre));
          const capBloq=typeof capacidadBloqueada==='function'?capacidadBloqueada(fechaStr,hora,area.nombre,esp.nombre):0;
          const lleno=rsvEsp.length>=(cap-capBloq);
          const bloq=typeof esBloqueado==='function'&&esBloqueado(fechaStr,hora,area.nombre,esp.nombre);

          let celda='';
          if(bloq){
            celda=`<div style="height:100%;background:repeating-linear-gradient(45deg,#fee2e2,#fee2e2 3px,#fff5f5 3px,#fff5f5 8px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#dc2626;font-weight:600">&#128274; Bloqueado</div>`;
          } else {
            rsvEsp.forEach(rsv=>{
              const asis=rsv.asistencia||'';
              const bgCard=asis==='Asisti\u00f3'?'#15803d':asis==='No asisti\u00f3'?'#991b1b':'var(--n600)';
              const btnAsistio=pasado&&puedeElim?`<button onclick="event.stopPropagation();marcarAsistencia('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}','${asis==='Asisti\u00f3'?'':'Asisti\u00f3'}',${rsv.id})" style="background:${asis==='Asisti\u00f3'?'rgba(255,255,255,.3)':'rgba(255,255,255,.15)'};border:none;color:#fff;font-size:10px;font-weight:700;cursor:pointer;padding:1px 5px;border-radius:3px;line-height:1.4" title="${asis==='Asisti\u00f3'?'Desmarcar':'Marcar como Asisti\u00f3'}">\u2713</button>`:'';
              const btnNoAsistio=pasado&&puedeElim?`<button onclick="event.stopPropagation();marcarAsistencia('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}','${asis==='No asisti\u00f3'?'':'No asisti\u00f3'}',${rsv.id})" style="background:${asis==='No asisti\u00f3'?'rgba(255,255,255,.3)':'rgba(255,255,255,.15)'};border:none;color:#fff;font-size:10px;font-weight:700;cursor:pointer;padding:1px 5px;border-radius:3px;line-height:1.4" title="${asis==='No asisti\u00f3'?'Desmarcar':'Marcar como No asisti\u00f3'}">\u2717</button>`:'';
              celda+=`<div style="background:${bgCard};border-radius:6px;padding:3px 6px;margin-bottom:2px;position:relative">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:14px">${rsv.paciente||'\u2014'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
                ${pasado&&puedeElim?`<div style="display:flex;gap:2px;margin-top:3px">${btnAsistio}${btnNoAsistio}</div>`:''}
                ${puedeElim?`<button onclick="event.stopPropagation();pedirEliminar('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}')" style="position:absolute;top:2px;right:3px;background:none;border:none;color:rgba(255,255,255,.6);font-size:11px;cursor:pointer;line-height:1;padding:2px" title="Cancelar">&#10005;</button>`:''}
              </div>`;
            });
            if(!pasado&&!lleno){
              const fl=d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'});
              celda+=`<button onclick="abrirReservaEspacio('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}',${cap},'${esc(fl)}')"
                style="width:100%;background:transparent;border:1px dashed transparent;border-radius:6px;color:var(--tx4);font-size:10px;padding:4px 2px;cursor:pointer;transition:all .15s;min-height:32px;display:flex;align-items:center;justify-content:center"
                onmouseover="this.style.borderColor='var(--n300)';this.style.color='var(--n500)';this.style.background='rgba(29,78,216,.06)'"
                onmouseout="this.style.borderColor='transparent';this.style.color='var(--tx4)';this.style.background='transparent'"
              ><span style="font-size:14px">+</span></button>`;
            } else if(pasado&&rsvEsp.length===0){
              celda=`<div style="min-height:32px;background:#f9fafb"></div>`;
            }
          }
          html+=`<div style="width:${dw}px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);padding:4px 5px;min-height:34px;background:${pasado&&!bloq?'#f9fafb':'var(--surf)'}">${celda}</div>`;
        });
        html+='</div>';
      });
    });
    html+='<div style="height:6px;background:var(--n800)"></div>';
  });
  html+='</div></div>';
  g('calGrid').innerHTML=html;
}


// ── Configuración de áreas ────────────────────────────────
function renderAreasConfig(){
  const esA=session&&session.rol==='admin';
  if(!esA)return;

  const listModal = g('areasConfigListModal');
  if(!listModal) return;

  const html = agendaCfg.areas.map((a,i)=>{
    const espaciosHtml=(a.espacios||[]).map((esp,ei)=>{
    const k=i+'-'+ei;
    const abierto=_espFormAbierto===k;
    return `
      <div>
        <div class="espacio-row">
          <div><label>Nombre del espacio</label><input value="${esc2(esp.nombre)}" placeholder="Ej. Camilla 1" oninput="agendaCfg.areas[${i}].espacios[${ei}].nombre=this.value"></div>
          <div><label>Capacidad (pac.)</label><input type="number" min="1" max="20" value="${esp.capacidad||1}" oninput="agendaCfg.areas[${i}].espacios[${ei}].capacidad=+this.value||1"></div>
          <button onclick="toggleEspForm(${i},${ei})" style="background:${abierto?'rgba(220,38,38,.15)':'var(--surf2)'};border:1px solid ${abierto?'var(--red)':'var(--bd)'};color:${abierto?'var(--red)':'var(--tx3)'};border-radius:6px;padding:0;font-size:14px;cursor:pointer;width:28px;height:28px" title="${abierto?'Cerrar':'Bloquear por hora'}">${abierto?'&#128275;':'&#128274;'}</button>
          <button class="area-del" onclick="delEspacio(${i},${ei})" title="Eliminar espacio">&#128465;</button>
        </div>
        ${abierto?`<div style="padding:8px 10px;background:var(--red2);border:1px solid var(--red);border-radius:8px;margin-top:4px;margin-left:8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <div class="field" style="margin:0"><label>Hora inicio</label><input type="time" class="inp" id="bef-h1-${i}-${ei}"></div>
            <div class="field" style="margin:0"><label>Hora fin (opc.)</label><input type="time" class="inp" id="bef-h2-${i}-${ei}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
            <div class="field" style="margin:0"><label>Fecha inicio</label><input type="date" class="inp" id="bef-f1-${i}-${ei}"></div>
            <div class="field" style="margin:0"><label>Fecha fin (opc.)</label><input type="date" class="inp" id="bef-f2-${i}-${ei}"></div>
          </div>
          ${esp.capacidad>1?`<div class="field" style="margin:0 0 8px 0"><label>Puestos a bloquear (de ${esp.capacidad})</label><input type="number" class="inp" id="bef-cap-${i}-${ei}" min="1" max="${esp.capacidad}" value="1" style="width:80px;text-align:center"></div>`:''}
          <div style="display:flex;gap:6px">
            <button onclick="crearBloqueoEspacio(${i},${ei})" style="flex:1;background:var(--red);color:#fff;border:none;border-radius:7px;padding:7px;font-size:12px;font-weight:700;cursor:pointer">&#128274; Crear bloqueo</button>
            <button onclick="toggleEspForm(${i},${ei})" style="background:var(--surf2);border:1px solid var(--bd);border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer">Cancelar</button>
          </div>
        </div>`:''}
      </div>`;
  }).join('');

    const areaBloq=esAreaBloqueada(a.nombre);
    return `<div class="area-card">
      <div class="area-card-top">
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Area</label>
          <input value="${esc2(a.nombre)}" oninput="agendaCfg.areas[${i}].nombre=this.value;actualizarFiltroArea()" placeholder="Nombre del area" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%">
        </div>
        <div><label style="font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:3px">Durac.(min)</label>
          <input type="number" min="15" max="240" step="15" value="${a.duracion||60}" oninput="agendaCfg.areas[${i}].duracion=+this.value||60" style="background:#fff;border:1px solid var(--bd);border-radius:6px;padding:5px 8px;font-size:12px;outline:none;width:100%;text-align:center">
        </div>
        <button onclick="toggleBloqueoArea(${i})" style="background:${areaBloq?'var(--green2)':'rgba(220,38,38,.1)'};border:1px solid ${areaBloq?'var(--green)':'var(--red)'};color:${areaBloq?'var(--green)':'var(--red)'};border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">${areaBloq?'&#128275; Activa':'&#128274; Bloquear'}</button>
        <button class="area-del" onclick="delArea(${i})" title="Eliminar area">&#128465;</button>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-left:8px">Espacios / Camillas / Colchonetas</div>
      ${espaciosHtml}
      <button onclick="addEspacio(${i})" style="margin-left:8px;background:var(--n050);border:1px dashed var(--n300);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:var(--n500);cursor:pointer">+ Agregar espacio</button>
    </div>`;
  }).join('');

  const emptyMsg = '<div class="empty" style="padding:8px">Sin areas. Agrega una abajo.</div>';
  listModal.innerHTML = html || emptyMsg;

  // Sincronizar franjas horarias en el modal
  const f=agendaCfg.franjas||[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
  ['calFranja1Ini','calFranja1Fin','calFranja2Ini','calFranja2Fin'].forEach((id,i)=>{
    const elModal=g(id+'Modal');
    const frIdx=Math.floor(i/2); const tipo=i%2===0?'inicio':'fin';
    if(elModal) elModal.value=(f[frIdx]||{})[tipo]||'';
  });
  const elMsg=g('cfgMensajeUltimaHora');
  if(elMsg) elMsg.value=agendaCfg.mensajeUltimaHora||'';
  const elAreaSel=g('cfgMensajeUltimaHoraArea');
  if(elAreaSel){
    elAreaSel.innerHTML='<option value="*">Todas las áreas</option>'+(agendaCfg.areas||[]).map(a=>`<option value="${esc2(a.nombre)}">${esc2(a.nombre)}</option>`).join('');
    elAreaSel.value=agendaCfg.mensajeUltimaHoraArea||'*';
  }
}
function addArea(){
  const inputModal = g('newAreaNomModal');
  const nom = inputModal ? inputModal.value.trim() : '';
  if(!nom) return;
  if(inputModal) inputModal.value='';
  agendaCfg.areas.push({nombre:nom,espacios:[{nombre:'Espacio 1',capacidad:1}],duracion:60});
  renderAreasConfig();
  actualizarFiltroArea();
}
function delArea(i){ agendaCfg.areas.splice(i,1);renderAreasConfig();actualizarFiltroArea(); }
function addEspacio(areaIdx){ agendaCfg.areas[areaIdx].espacios.push({nombre:'Espacio '+(agendaCfg.areas[areaIdx].espacios.length+1),capacidad:1}); renderAreasConfig(); }
function delEspacio(areaIdx,espIdx){ agendaCfg.areas[areaIdx].espacios.splice(espIdx,1); renderAreasConfig(); }

// Lee el área activa del div de botones (o string vacío = todas)
function getAreaFiltro(divId){
  var d=g(divId); if(!d) return '';
  var active=d.querySelector('.area-pill.active');
  return active ? active.getAttribute('data-area') : '';
}

function renderAreaBtns(divId, onChangeFn){
  var d=g(divId); if(!d) return;
  var current=getAreaFiltro(divId);
  d.innerHTML='';
  var btn0=document.createElement('button');
  btn0.className='area-pill'+(current===''?' active':'');
  btn0.setAttribute('data-area','');
  btn0.textContent='Todas';
  btn0.onclick=function(){ window[onChangeFn](''); };
  d.appendChild(btn0);
  agendaCfg.areas.forEach(function(a){
    var btn=document.createElement('button');
    btn.className='area-pill'+(current===a.nombre?' active':'');
    btn.setAttribute('data-area',a.nombre);
    btn.textContent=a.nombre;
    btn.onclick=function(){ window[onChangeFn](a.nombre); };
    d.appendChild(btn);
  });
}

function setAreaFiltro(divId, area, onChangeFn){
  var d=g(divId); if(!d) return;
  d.querySelectorAll('.area-pill').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-area')===area);
  });
  if(onChangeFn) window[onChangeFn] && window[onChangeFn]();
}

function actualizarFiltroArea(){
  renderAreaBtns('calAreaFiltro', 'filtrarCalendarioPorArea');
  // Actualizar el del estudiante
  actualizarFiltroAreaEst();
}

function filtrarCalendarioPorArea(area){
  setAreaFiltro('calAreaFiltro', area, null);
  renderCalendario();
}

async function guardarAgendaConfig(){
  const f=agendaCfg.franjas=[];
  const pares=[['calFranja1IniModal','calFranja1FinModal'],['calFranja2IniModal','calFranja2FinModal']];
  pares.forEach(([iId,fId])=>{
    const ini=vi(iId), fin=vi(fId);
    if(ini&&fin) f.push({inicio:ini,fin:fin});
  });
  if(!f.length) f.push({inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'});
  agendaCfg.mensajeUltimaHora=(document.getElementById('cfgMensajeUltimaHora')||{}).value||'';
  agendaCfg.mensajeUltimaHoraArea=(g('cfgMensajeUltimaHoraArea')||{}).value||'*';
  showLoader('Guardando configuracion...');
  try{
    const r=await apiPost({action:'guardarAgendaConfig',config:agendaCfg});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Configuracion guardada','','ok');
    await cargarReservasSemana();renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

// ── Overlay "Reservando..." ───────────────────────────────
function mostrarOverlayReservando(paciente){
  let ov=document.getElementById('_rsvOverlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='_rsvOverlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(10,22,40,.72);backdrop-filter:blur(4px);transition:opacity .2s';
    ov.innerHTML=`<div style="background:var(--surf);border-radius:20px;padding:32px 36px;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 24px 60px rgba(10,22,40,.45);min-width:220px;text-align:center">
      <div id="_rsvOvSpinner" style="width:42px;height:42px;border:4px solid var(--n100);border-top-color:var(--n500);border-radius:50%;animation:_rsvSpin .7s linear infinite"></div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--n900);margin-bottom:4px">Reservando…</div>
        <div id="_rsvOvPac" style="font-size:12px;color:var(--tx3);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
      </div>
    </div>`;
    if(!document.getElementById('_rsvSpinStyle')){
      const st=document.createElement('style');
      st.id='_rsvSpinStyle';
      st.textContent='@keyframes _rsvSpin{to{transform:rotate(360deg)}}';
      document.head.appendChild(st);
    }
    document.body.appendChild(ov);
  }
  const pac=document.getElementById('_rsvOvPac');
  if(pac)pac.textContent=paciente||'';
  ov.style.opacity='0';
  ov.style.display='flex';
  requestAnimationFrame(()=>{ ov.style.opacity='1'; });
}
function ocultarOverlayReservando(){
  const ov=document.getElementById('_rsvOverlay');
  if(!ov)return;
  ov.style.opacity='0';
  setTimeout(()=>{ ov.style.display='none'; },200);
}

async function adquirirLock(fecha,hora,area,camilla){
  try{
    const r=await apiPost({action:'adquirirLock',fecha,horaInicio:hora,area,camilla});
    if(r.ok){ _lockActivo={fecha,hora,area,camilla}; return true; }
    return false;
  }catch(e){ return false; }
}

async function liberarLock(){
  if(!_lockActivo)return;
  const{fecha,hora,area,camilla}=_lockActivo;
  _lockActivo=null;
  try{ await apiPost({action:'liberarLock',fecha,horaInicio:hora,area,camilla}); }catch(e){}
}

// ── Reservar slot ─────────────────────────────────────────
async function abrirReservaEspacio(fecha,hora,area,espacio,capacidad,fechaLabel){
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _areaFiltro=agendaCfg.mensajeUltimaHoraArea||'*';
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if((_areaFiltro==='*'||_areaFiltro===area)&&esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:false};
  g('reservaModalTitle').textContent='Reservar \xb7 '+area+' \xb7 '+espacio;
  g('reservaModalSub').textContent=fechaLabel+' \xb7 '+hora+' hs';
  g('rsvPaciente').value='';
  g('rsvDocente').value=session&&session.nombre||'';
  g('rsvObs').value='';
  const err=g('rsvErr');if(err){err.style.display='none';err.textContent=''}
  g('reservaModal').style.display='flex';
  setTimeout(()=>g('rsvPaciente').focus(),100);
}

// Alias para compatibilidad con código anterior
function abrirReserva(fecha,hora,area,camilla,fechaLabel){
  const area_obj=agendaCfg.areas.find(a=>a.nombre===area);
  const esp=area_obj&&area_obj.espacios?area_obj.espacios.find(e=>e.nombre===camilla):null;
  const cap=esp?esp.capacidad:1;
  abrirReservaEspacio(fecha,hora,area,camilla,cap,fechaLabel);
}

function cerrarReservaModal(){ g('reservaModal').style.display='none'; if(rsvPendiente&&rsvPendiente.esEstudiante&&!_confirmandoReserva)liberarLock(); rsvPendiente=null; }

async function confirmarReserva(){
  if(!rsvPendiente)return;
  const pac=vi('rsvPaciente').trim();
  if(!pac){const e=g('rsvErr');e.textContent='El nombre del paciente es requerido';e.style.display='block';return}
  // Leer todos los datos ANTES de cerrar el modal (cerrar pone rsvPendiente=null)
  const esEst=rsvPendiente.esEstudiante||false;
  const fromModal=rsvPendiente.fromModal||false;
  const _fecha=rsvPendiente.fecha, _hora=rsvPendiente.hora;
  const _area=rsvPendiente.area, _camilla=rsvPendiente.camilla;
  const _cap=rsvPendiente.capacidad||1;
  const _doc=vi('rsvDocente'), _obs=vi('rsvObs');
  _confirmandoReserva=true;
  cerrarReservaModal();
  _confirmandoReserva=false;
  mostrarOverlayReservando(pac);
  try{
    const r=await apiPost({
      action:'crearReserva',
      fecha:_fecha, horaInicio:_hora,
      area:_area, camilla:_camilla,
      capacidad:_cap,
      paciente:pac, docente:_doc, observacion:_obs
    });
    hideLoader();if(!r.ok)throw new Error(r.error);
    ocultarOverlayReservando();
    toast('Reserva creada','','ok');
    invalidateCache('leerReservas');
    if(esEst){
      liberarLock();
      await cargarReservasEst();
      const _finSemC=new Date(calEstFechaBase);_finSemC.setDate(_finSemC.getDate()+5);
      await cargarBloqueos(fmt(calEstFechaBase),fmt(_finSemC));
      renderCalendarioEst();
    }
    else if(fromModal){ const finM=new Date(calFechaBase);finM.setDate(finM.getDate()+5); await cargarReservasSemana(); await cargarBloqueos(fmt(calFechaBase),fmt(finM)); renderCalendarioModal(); }
    else { await cargarReservasSemana();renderCalendario(); }
  }catch(e){
    ocultarOverlayReservando();
    hideLoader();
    // Reabrir modal con el error visible
    g('reservaModal').style.display='flex';
    const er=g('rsvErr');er.textContent=e.message;er.style.display='block';
  }
}

async function marcarAsistencia(fecha,hora,area,camilla,valor,rsvId){
  const _n=s=>String(s).trim().toLowerCase();
  const rsv=rsvId!=null
    ?agendaReservas.find(r=>r.id===rsvId)
    :agendaReservas.find(r=>_n(r.fecha)===_n(fecha)&&_n(r.horaInicio)===_n(hora)&&_n(r.area)===_n(area)&&_n(r.camilla)===_n(camilla));
  const prevValor=rsv?rsv.asistencia:'';
  if(rsv)rsv.asistencia=valor;
  renderCalendario();
  try{
    const r=await apiPost({action:'marcarAsistencia',fecha,horaInicio:hora,area,camilla,asistencia:valor,id:rsvId});
    if(!r.ok)throw new Error(r.error);
  }catch(e){
    if(rsv)rsv.asistencia=prevValor;
    renderCalendario();
    toast('Error',e.message,'err');
  }
}

async function pedirEliminar(fecha,hora,area,camilla){
  if(!await confirmDialog('Cancelar esta reserva?'))return;
  showLoader('Cancelando...');
  try{
    const r=await apiPost({action:'eliminarReserva',fecha,horaInicio:hora,area,camilla});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    // Actualización optimista: elimina de memoria y re-renderiza sin esperar re-fetch
    const _n=s=>String(s).trim().toLowerCase();
    agendaReservas=agendaReservas.filter(rv=>!(
      _n(rv.fecha)===_n(fecha)&&_n(rv.horaInicio)===_n(hora)&&
      _n(rv.area)===_n(area)&&_n(rv.camilla)===_n(camilla)
    ));
    _markRsvDeleted(fecha, hora, area, camilla);
    renderCalendario();
    invalidateCache('leerReservas');
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}


g('configAgendaModal')&&g('configAgendaModal').addEventListener('click',function(e){if(e.target===this)cerrarConfigAgenda();});
g('reservaModal')&&g('reservaModal').addEventListener('click',function(e){if(e.target===this)cerrarReservaModal();});


// Parsea timestamp GAS formato "dd/MM/yyyy HH:mm:ss" a Date
function _parseTsGAS(ts){
  const m=String(ts||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5],+m[6]):null;
}

async function cancelarReservaEst(fecha,hora,area,camilla){
  if(!confirm('¿Cancelar esta reserva?'))return;
  showLoader('Cancelando...');
  try{
    const r=await apiPost({action:'cancelarReservaEst',fecha,horaInicio:hora,area,camilla});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    const _n=s=>String(s).trim().toLowerCase();
    agendaEstReservas=agendaEstReservas.filter(rv=>!(
      _n(rv.fecha)===_n(fecha)&&_n(rv.horaInicio)===_n(hora)&&
      _n(rv.area)===_n(area)&&_n(rv.camilla)===_n(camilla)
    ));
    _markRsvDeleted(fecha,hora,area,camilla);
    renderCalendarioEst();
    invalidateCache('leerReservas');
  }catch(e){hideLoader();toast('Error',e.message,'err');}
}

// ── AGENDA DEL ESTUDIANTE ────────────────────────────────────
let calEstFechaBase = getLunes ? getLunes(new Date()) : new Date();
let agendaEstReservas = [];
let agendaLocks = [];
let _lockActivo = null;
let _confirmandoReserva = false;

async function iniciarAgendaEstudiante(){
  try{
    const rc=await apiGetCached('leerAgendaConfig');
    if(rc.ok){
      agendaCfg=rc.config;
      // Migrar config antigua
      agendaCfg.areas=agendaCfg.areas.map(a=>{
        if(!a.espacios&&a.camillas) a.espacios=Array.from({length:a.camillas},(_,i)=>({nombre:'Camilla '+(i+1),capacidad:1}));
        if(!a.espacios) a.espacios=[{nombre:'Espacio 1',capacidad:1}];
        return a;
      });
      if(!agendaCfg.franjas) agendaCfg.franjas=[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
      actualizarFiltroAreaEst();
    }
    calEstFechaBase=getLunes(new Date());
    await cargarReservasEst();
    const finSemEst2=new Date(calEstFechaBase);finSemEst2.setDate(finSemEst2.getDate()+5);
    await cargarBloqueos(fmt(calEstFechaBase),fmt(finSemEst2));
    renderCalendarioEst();
  }catch(e){ console.warn('Agenda no disponible:',e.message); }
}

function actualizarFiltroAreaEst(){
  renderAreaBtns('calEstAreaFiltro', 'filtrarCalendarioEstPorArea');
}
function filtrarCalendarioEstPorArea(area){
  setAreaFiltro('calEstAreaFiltro', area, null);
  renderCalendarioEst();
}

async function cargarReservasEst(){
  const ini=fmt(calEstFechaBase);
  const finSem=new Date(calEstFechaBase); finSem.setDate(finSem.getDate()+5);
  try{
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fmt(finSem)});
    if(r.ok){ agendaEstReservas=_filterRsvBorradas(r.reservas); agendaLocks=r.locks||[]; }
  }catch(e){ agendaEstReservas=[]; agendaLocks=[]; }
}

function semanaAnteriorEst(){ liberarLock(); calEstFechaBase.setDate(calEstFechaBase.getDate()-7); cargarReservasEst().then(renderCalendarioEst); }
function semanaSiguienteEst(){ liberarLock(); calEstFechaBase.setDate(calEstFechaBase.getDate()+7); cargarReservasEst().then(renderCalendarioEst); }
function irHoyEst(){ calEstFechaBase=getLunes(new Date()); cargarReservasEst().then(renderCalendarioEst); }

function renderCalendarioEst(){
  const finD=new Date(calEstFechaBase);finD.setDate(finD.getDate()+5); // sábado
  const lbl=g('calEstLabel');
  const vier3=new Date(calEstFechaBase);vier3.setDate(vier3.getDate()+5);
  if(lbl) lbl.textContent=fmtDia(calEstFechaBase)+' \u2013 '+fmtDia(vier3);

  const areaFiltro=getAreaFiltro('calEstAreaFiltro');
  const areas=areaFiltro?agendaCfg.areas.filter(a=>a.nombre===areaFiltro):agendaCfg.areas;
  const grid=g('calEstGrid');if(!grid)return;
  if(!areas.length){ grid.innerHTML='<div class="empty" style="padding:20px">Sin areas configuradas</div>'; return; }

  const miNombre=session&&(session.nombre||session.codigo)||'';
  const miCodigo=session&&session.codigo||'';
  const iniStr=fmt(calEstFechaBase);
  const finStr=fmt(finD);
  const misReservas=agendaEstReservas.filter(r=>(r.reservadoPor===miNombre||r.reservadoPor===miCodigo)&&r.fecha>=iniStr&&r.fecha<=finStr);
  const info=g('calEstReservaInfo');
  if(info) info.textContent=misReservas.length>0?('\u2713 '+misReservas.length+' reserva'+(misReservas.length!==1?'s':'')+' esta semana'):'';

  const slots=generarSlots(agendaCfg.franjas, agendaCfg.areas[0]&&agendaCfg.areas[0].duracion||60);
  const hoy=fmt(new Date());
  const dias=[];
  for(let i=0;i<6;i++){const d=new Date(calEstFechaBase);d.setDate(d.getDate()+i);dias.push(d);}

  // Ancho de columna de días
  const dw=window.innerWidth<=480?110:window.innerWidth<=768?140:200;

  let html='<div class="cal-grid-wrap"><div style="display:flex;flex-direction:column;min-width:max-content">';

  // Cabecera global de días (sticky)
  html+='<div style="display:flex;position:sticky;top:0;z-index:5;background:var(--n900)">';
  html+=`<div style="width:100px;flex-shrink:0;border-right:1px solid var(--n700);border-bottom:1px solid var(--n700);background:var(--n900)"></div>`;
  dias.forEach(d=>{
    const esHoy=fmt(d)===hoy;
    html+=`<div style="width:${dw}px;flex-shrink:0"><div class="cal-day-hdr ${esHoy?'hoy':''}"><span class="dia-num">${d.getDate()}</span><span class="dia-nom">${DIAS_NOM[d.getDay()]}</span></div></div>`;
  });
  html+='</div>';

  areas.forEach(area=>{
    const durArea = area.duracion || 60;
    const areaSlots = generarSlots(agendaCfg.franjas, durArea);
    // Cabecera del área
    html+=`<div style="background:var(--n700);color:var(--n200);padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:.5px;border-bottom:2px solid var(--n600)">${area.nombre}</div>`;

    areaSlots.forEach((slot,hi)=>{
      const hora = slot.inicio;
      const horaFin = slot.fin;
      const horaLabel = hora + '\u2013' + horaFin;

      // Separador visual entre franjas
      if(hi>0){
        const prevFin = timeToMin(areaSlots[hi-1].fin);
        const currIni = timeToMin(slot.inicio);
        if(currIni > prevFin){
          html+=`<div style="height:8px;background:var(--n050);border-top:2px solid var(--bd2);border-bottom:2px solid var(--bd2);display:flex;align-items:center;padding-left:8px"><span style="font-size:9px;color:var(--tx4);font-weight:700">RECESO</span></div>`;
        }
      }

      // Por cada espacio — fila separada con borde superior entre camillas
      (area.espacios||[]).forEach((esp,ei)=>{
        const cap=esp.capacidad||1;
        // Borde superior más grueso para separar visualmente cada camilla
        const borderTop = ei===0 ? '2px solid var(--n300)' : '1px dashed var(--bd2)';

        html+=`<div style="display:flex;border-top:${borderTop}">`;

        // Columna fija: rango hora + nombre del espacio
        html+=`<div style="width:140px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);background:var(--surf2);padding:6px 10px;display:flex;flex-direction:column;justify-content:center">`;
        if(ei===0) html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:var(--tx);margin-bottom:2px;line-height:1.3">${horaLabel}</div>`;
        html+=`<div style="font-size:11px;font-weight:600;color:var(--n500)">${esp.nombre}</div>`;
        html+=`<div style="font-size:9px;color:var(--tx4)">${cap} lugar${cap!==1?'es':''}</div>`;
        html+='</div>';

        // Celdas por día
        dias.forEach(d=>{
          const fechaStr=fmt(d);
          const pasado=new Date(fechaStr+'T'+hora+':00')<new Date();
          const norm=s=>String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const matchEsp=(r,en)=>{const rc=norm(r.camilla),ne=norm(en);return rc===ne||rc.startsWith(ne)||ne.startsWith(rc);};
          const rsvEsp=agendaEstReservas.filter(r=>norm(r.fecha)===norm(fechaStr)&&norm(r.horaInicio)===norm(hora)&&norm(r.area)===norm(area.nombre)&&matchEsp(r,esp.nombre));
          const capBloq=typeof capacidadBloqueada==='function'?capacidadBloqueada(fechaStr,hora,area.nombre,esp.nombre):0;
          const lleno=rsvEsp.length>=(cap-capBloq);
          const bloq=typeof esBloqueado==='function'&&esBloqueado(fechaStr,hora,area.nombre,esp.nombre);

          let celda='';
          if(bloq){
            celda=`<div style="height:100%;background:repeating-linear-gradient(45deg,#fee2e2,#fee2e2 3px,#fff5f5 3px,#fff5f5 8px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#dc2626;font-weight:600">&#128274;</div>`;
          } else {
            // Mostrar reservas existentes
            rsvEsp.forEach(rsv=>{
              const esMia=rsv.reservadoPor===miNombre||rsv.reservadoPor===miCodigo;
              const puedeCancelar=(()=>{
                if(!esMia)return false;
                const cutoff=new Date(fechaStr+'T00:00:00');
                cutoff.setDate(cutoff.getDate()-1);
                cutoff.setHours(20,0,0,0);
                return new Date()<cutoff;
              })();
              celda+=`<div style="background:${esMia?'var(--green)':'var(--n600)'};border-radius:6px;padding:3px 6px;margin-bottom:2px;position:relative">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis${puedeCancelar?';padding-right:60px':''}">${rsv.paciente||'\u2014'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
                ${puedeCancelar?`<button onclick="event.stopPropagation();cancelarReservaEst('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}')" style="position:absolute;top:50%;right:3px;transform:translateY(-50%);background:rgba(0,0,0,.3);border:none;color:#fff;font-size:9px;cursor:pointer;padding:2px 5px;border-radius:3px;white-space:nowrap" title="Cancelar reserva (hasta las 20:00 del d\xeda anterior)">\u2715 Cancelar</button>`:''}
              </div>`;
            });
            // Botón de reservar si hay capacidad, no está en el pasado y no hay lock ajeno
            const _nLk=s=>String(s||'').trim().toLowerCase();
            const isLocked=agendaLocks.some(lk=>_nLk(lk.fecha)===_nLk(fechaStr)&&_nLk(lk.horaInicio)===_nLk(hora)&&_nLk(lk.area)===_nLk(area.nombre)&&_nLk(lk.camilla)===_nLk(esp.nombre)&&_nLk(lk.lockedBy)!==_nLk(miCodigo)&&_nLk(lk.lockedBy)!==_nLk(miNombre));
            if(!pasado&&!lleno&&!isLocked){
              const fl=d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'});
              celda+=`<button onclick="abrirReservaEstEsp('${esc(fechaStr)}','${esc(hora)}','${esc(area.nombre)}','${esc(esp.nombre)}',${cap},'${esc(fl)}')"
                style="width:100%;background:transparent;border:1px dashed transparent;border-radius:6px;color:var(--tx4);font-size:10px;padding:4px 2px;cursor:pointer;transition:all .15s;min-height:32px;display:flex;align-items:center;justify-content:center;gap:3px"
                onmouseover="this.style.borderColor='var(--n300)';this.style.color='var(--n500)';this.style.background='rgba(29,78,216,.06)'"
                onmouseout="this.style.borderColor='transparent';this.style.color='var(--tx4)';this.style.background='transparent'"
              ><span style="font-size:13px">+</span></button>`;
            } else if(pasado&&rsvEsp.length===0){
              celda=`<div style="height:32px;background:#f9fafb"></div>`;
            }
          }

          html+=`<div style="width:${dw}px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);padding:4px 5px;min-height:34px;background:${pasado&&!bloq?'#f9fafb':'var(--surf)'}">${celda}</div>`;
        });
        html+='</div>'; // fin fila camilla
      });
    });

    // Separador entre áreas
    html+='<div style="height:6px;background:var(--n800)"></div>';
  });

  html+='</div></div>';
  grid.innerHTML=html;
}


async function abrirReservaEstEsp(fecha,hora,area,espacio,capacidad,fechaLabel){
  const ok=await adquirirLock(fecha,hora,area,espacio);
  if(!ok){ toast('Espacio ocupado','Este espacio está siendo seleccionado por otro estudiante, intenta en un momento','warn'); return; }
  const _msg=agendaCfg.mensajeUltimaHora||'';
  if(_msg){
    const _areaFiltro=agendaCfg.mensajeUltimaHoraArea||'*';
    const _aObj=agendaCfg.areas.find(function(a){return a.nombre===area;});
    const _dur=_aObj?(_aObj.duracion||60):60;
    if((_areaFiltro==='*'||_areaFiltro===area)&&esUltimaHoraFranja(hora,agendaCfg.franjas,_dur)) await infoDialog(_msg);
  }
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:true};
  g('reservaModalTitle').textContent='Reservar \xb7 '+area+' \xb7 '+espacio;
  g('reservaModalSub').textContent=fechaLabel+' \xb7 '+hora+' hs';
  g('rsvPaciente').value='';
  g('rsvDocente').value=session&&session.nombre||'';
  g('rsvObs').value='';
  const err=g('rsvErr');if(err){err.style.display='none';err.textContent=''}
  g('reservaModal').style.display='flex';
  setTimeout(()=>g('rsvPaciente').focus(),100);
}

// Alias
function abrirReservaEst(fecha,hora,area,camilla,fechaLabel){
  const ao=agendaCfg.areas.find(a=>a.nombre===area);
  const esp=ao&&ao.espacios?ao.espacios.find(e=>e.nombre===camilla):null;
  abrirReservaEstEsp(fecha,hora,area,camilla,esp?esp.capacidad:1,fechaLabel);
}


// ── EXPAND/COLAPSAR secciones ──────────────────────────────
function toggleSection(id, arrowOrHdr){
  const body=g(id);if(!body)return;
  // arrowOrHdr puede ser el arrow directamente (por id) o el hdr (para buscar en hijos)
  let arrow=arrowOrHdr;
  if(arrowOrHdr&&arrowOrHdr.classList&&!arrowOrHdr.classList.contains('collapsible-arrow')){
    arrow=arrowOrHdr.querySelector('.collapsible-arrow')||arrowOrHdr;
  }
  const open=body.classList.toggle('open');
  if(arrow&&arrow.classList) arrow.classList.toggle('open', open);
}


// ── DOCENTE TOPBAR ───────────────────────────────────────
let calGridTarget = 'calGrid';

function renderDocenteHojasBtns(hojas){
  const box=g('docenteHojasBtns');if(!box)return;
  // Filtrar hojas internas del sistema
  var HOJAS_SISTEMA=['Casilleros','_usuarios','Log'];
  hojas=hojas.filter(function(h){return HOJAS_SISTEMA.indexOf(h.nombre)<0;});
  if(!hojas||!hojas.length){box.innerHTML='<span style="font-size:12px;color:var(--n400)">Sin hojas</span>';return;}
  box.innerHTML=hojas.map(h=>`
    <button onclick="abrirHoja('${esc(h.nombre)}')" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:12px;font-weight:600;padding:6px 12px;cursor:pointer;white-space:nowrap;transition:all .2s;max-width:180px;overflow:hidden;text-overflow:ellipsis" onmouseover="this.style.background='rgba(255,255,255,.18)'" onmouseout="this.style.background='rgba(255,255,255,.08)'" title="${h.nombre}">
      ${h.nombre.length>20?h.nombre.substring(0,18)+'…':h.nombre}
    </button>`).join('');
}

// ── AGENDA COMO PÁGINA COMPLETA ────────────────────────────
async function mostrarAgenda(){
  // Ocultar el editor y el panel, mostrar la sección de agenda
  var edCard = g('edCard');
  if(edCard) edCard.style.display='none';
  // Cerrar panel si hay uno abierto y devolver contenido al pane original
  var body=g('panelCardBody');
  if(body){
    var prevTab=body.getAttribute('data-tab');
    if(prevTab){
      var prevPane=g('pane-'+prevTab);
      if(prevPane){while(body.firstChild)prevPane.appendChild(body.firstChild);}
      body.removeAttribute('data-tab');
    }
  }
  var pc=g('panelCard');if(pc)pc.style.display='none';
  var ac = g('agendaCard');
  if(ac) ac.style.display='block';
  // Marcar botón activo en el topbar
  var btn = g('btnTopbarAgenda');
  if(btn){ btn.style.background='var(--n500)'; btn.style.borderColor='var(--n400)'; }
  // Cargar configuración y datos
  showLoader('Cargando agenda...');
  try{
    var rc = await apiGetCached('leerAgendaConfig');
    if(rc.ok){
      agendaCfg = rc.config;
      agendaCfg.areas = (agendaCfg.areas||[]).map(function(a){
        if(!a.espacios && a.camillas)
          a.espacios = Array.from({length:a.camillas}, function(_,i){ return {nombre:'Camilla '+(i+1), capacidad:1}; });
        if(!a.espacios) a.espacios = [{nombre:'Espacio 1', capacidad:1}];
        return a;
      });
      if(!agendaCfg.franjas)
        agendaCfg.franjas = [{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
    }
    // Mostrar btn Config solo para admin
    var btnCfg = g('btnConfigAgenda');
    if(btnCfg) btnCfg.style.display = (session && session.rol==='admin') ? '' : 'none';
    // Poblar filtro de área
    renderAreaBtns('calAreaFiltro', 'filtrarCalendarioPorArea');
    calFechaBase = getLunes(calFechaBase || new Date());
    var finSem = new Date(calFechaBase); finSem.setDate(finSem.getDate()+5);
    await cargarReservasSemana();
    await cargarBloqueos(fmt(calFechaBase), fmt(finSem));
  } catch(ex){ console.warn('Error agenda:', ex); }
  hideLoader();
  renderCalendario();
}
async function abrirConfigAgenda(){
  await cargarBloqueos();
  renderAreasConfig();
  // Poblar selects de bloqueo del modal con las áreas actuales
  actualizarSelectsBloqueoModal();
  renderListaBloqueosModal();
  cfgSwitchTab('areas');
  var m = g('configAgendaModal');
  if(m) m.style.display='flex';
}
function cerrarConfigAgenda(){
  var m = g('configAgendaModal');
  if(m) m.style.display='none';
}

function cfgSwitchTab(tab){
  var pA=g('cfgPanelAreas'),pB=g('cfgPanelBloqueos'),pR=g('cfgPanelReservas');
  var tA=g('cfgTabAreas'),tB=g('cfgTabBloqueos'),tR=g('cfgTabReservas');
  if(!pA||!pB) return;

  // Reset all
  [pA,pB,pR].forEach(function(p){if(p)p.style.display='none';});
  [tA,tB,tR].forEach(function(t){if(t){t.style.background='none';t.style.borderBottomColor='transparent';t.style.color='var(--n300)';}});

  if(tab==='areas'){
    pA.style.display='block';
    tA.style.background='rgba(59,130,246,.12)';tA.style.borderBottomColor='var(--n400)';tA.style.color='#fff';
  } else if(tab==='bloqueos'){
    pB.style.display='block';
    tB.style.background='rgba(220,38,38,.12)';tB.style.borderBottomColor='var(--red)';tB.style.color='#fff';
    renderListaBloqueosModal();
  } else if(tab==='reservas'){
    if(pR) pR.style.display='block';
    if(tR){tR.style.background='rgba(5,150,105,.12)';tR.style.borderBottomColor='var(--green)';tR.style.color='#fff';}
    cargarListaReservas();
  }
}

function actualizarSelectsBloqueoModal(){
  var mbArea=g('mbArea');if(!mbArea)return;
  var val=mbArea.value;
  mbArea.innerHTML='<option value="*">Todas las areas</option>'+
    agendaCfg.areas.map(a=>`<option value="${esc2(a.nombre)}" ${a.nombre===val?'selected':''}>${a.nombre}</option>`).join('');
  actualizarCamillasBloqueoModal();
}

function actualizarCamillasBloqueoModal(){
  var mbCamilla=g('mbCamilla');if(!mbCamilla)return;
  var areaVal=vi('mbArea');
  mbCamilla.innerHTML='<option value="*">Todos los espacios</option>';
  if(areaVal&&areaVal!=='*'){
    var area=agendaCfg.areas.find(a=>a.nombre===areaVal);
    if(area&&area.espacios){
      area.espacios.forEach(e=>{
        var opt=document.createElement('option');
        opt.value=e.nombre;opt.textContent=e.nombre;
        mbCamilla.appendChild(opt);
      });
    }
  }
}

function _toggleDowMode(){
  const esDow=g('mbEsDow')&&g('mbEsDow').checked;
  const fWrap=g('mbFechaWrap');
  const dWrap=g('mbDiaSemanaWrap');
  if(fWrap)fWrap.style.display=esDow?'none':'grid';
  if(dWrap)dWrap.style.display=esDow?'':'none';
}

async function crearBloqueoModal(){
  const esDow=g('mbEsDow')&&g('mbEsDow').checked;
  var fecha;
  if(esDow){
    fecha='DOW:'+(vi('mbDiaSemana')||'1');
  } else {
    var fechaIni=vi('mbFecha')||'';
    var fechaFin=vi('mbFechaFin')||'';
    if(fechaIni&&fechaFin){
      if(fechaFin<fechaIni){toast('Error','La fecha fin debe ser igual o posterior a la fecha inicio','err');return;}
      fecha=fechaIni+'/'+fechaFin;
    } else if(fechaIni){
      fecha=fechaIni;
    } else {
      fecha='*';
    }
  }
  var horaIni=vi('mbHora')||'*';
  var horaFin=vi('mbHoraFin')||'';
  var hora;
  if(horaIni!=='*'&&horaFin){
    if(horaFin<=horaIni){toast('Error','La hora fin debe ser posterior a la hora inicio','err');return;}
    hora=horaIni+'-'+horaFin;
  } else {
    hora=horaIni;
  }
  var area=vi('mbArea')||'*';
  var camilla=vi('mbCamilla')||'*';
  var motivo=vi('mbMotivo')||'Sin motivo';
  if((fecha==='*'||esDow)&&hora==='*'&&area==='*'){
    if(!await confirmDialog('Esto bloqueará TODOS los horarios de TODAS las áreas. ¿Continuar?'))return;
  }
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area,camilla,motivo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo creado','','ok');
    invalidateCache('leerBloqueos');
    var f=g('mbFecha');var ff=g('mbFechaFin');var h=g('mbHora');var hf=g('mbHoraFin');var mo=g('mbMotivo');
    if(f)f.value='';if(ff)ff.value='';if(h)h.value='';if(hf)hf.value='';if(mo)mo.value='';
    const dowEl=g('mbEsDow');if(dowEl){dowEl.checked=false;_toggleDowMode();}
    const dsEl=g('mbDiaSemana');if(dsEl)dsEl.selectedIndex=0;
    await cargarBloqueos();
    renderListaBloqueos();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

function renderListaBloqueosModal(){
  var box=g('listaBloqueosModal');if(!box)return;
  if(!agendaBloqueos.length){
    box.innerHTML='<div class="empty" style="padding:12px">Sin bloqueos activos</div>';return;
  }
  box.innerHTML=`<div style="background:var(--n900);padding:6px 12px;display:grid;grid-template-columns:80px 90px 1fr 1fr 28px;gap:6px;font-size:10px;font-weight:700;color:var(--n300);text-transform:uppercase">
    <span>Fecha</span><span>Hora</span><span>Area</span><span>Motivo</span><span></span>
  </div>`+agendaBloqueos.map(b=>`
    <div style="display:grid;grid-template-columns:80px 90px 1fr 1fr 28px;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--bd2);background:var(--red2);font-size:12px">
      <span style="font-family:'DM Mono',monospace;font-size:10px">${(function(){const _D=['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];return b.fecha&&b.fecha.startsWith('DOW:')?'Todos los '+(_D[parseInt(b.fecha.split(':')[1])]||b.fecha):(b.fecha||'—');})()}</span>
      <span style="font-family:'DM Mono',monospace;font-size:10px">${b.hora}</span>
      <div><div style="font-weight:600;font-size:11px">${b.area}</div><div style="font-size:10px;color:var(--tx3)">${b.camilla}</div></div>
      <span style="color:var(--red);font-weight:600;font-size:11px">${b.motivo}</span>
      <button onclick="eliminarBloqueoModal(${b.id})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0" title="Eliminar">&#128465;</button>
    </div>`).join('');
}

async function eliminarBloqueoModal(id){
  if(!await confirmDialog('Eliminar este bloqueo?'))return;
  showLoader('Eliminando...');
  try{
    var r=await apiPost({action:'eliminarBloqueo',id});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo eliminado','','ok');
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderListaBloqueos();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
function abrirAgendaPopup(){ mostrarAgenda(); }
function cerrarAgendaModal(){}


function renderCalendarioModal(){renderCalendario();}


function abrirReservaEspModal(fecha,hora,area,espacio,capacidad,fechaLabel){
  rsvPendiente={fecha,hora,area,camilla:espacio,capacidad,esEstudiante:false,fromModal:true};
  g('reservaModalTitle').textContent='Reservar · '+area+' · '+espacio;
  g('reservaModalSub').textContent=fechaLabel+' · '+hora+' hs';
  g('rsvPaciente').value='';
  g('rsvDocente').value=session&&session.nombre||'';
  g('rsvObs').value='';
  const err=g('rsvErr');if(err){err.style.display='none';err.textContent=''}
  g('reservaModal').style.display='flex';
  setTimeout(()=>g('rsvPaciente').focus(),100);
}

async function pedirEliminarModal(fecha,hora,area,camilla){
  if(!await confirmDialog('Cancelar esta reserva?'))return;
  showLoader('Cancelando...');
  try{
    const r=await apiPost({action:'eliminarReserva',fecha,horaInicio:hora,area,camilla});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    _markRsvDeleted(fecha, hora, area, camilla);
    invalidateCache('leerReservas');
    const finSemEM=new Date(calFechaBase);finSemEM.setDate(finSemEM.getDate()+5);
    await cargarReservasSemana();
    await cargarBloqueos(fmt(calFechaBase),fmt(finSemEM));
    renderCalendarioModal();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

// Cerrar modal agenda al click fuera


// ── LISTA DE RESERVAS (admin) ─────────────────────────────
async function cargarListaReservas(){
  const box=g('listaReservasBox');if(!box)return;
  box.innerHTML='<div class="empty">Cargando...</div>';
  // Actualizar filtro de áreas
  const selArea=g('calFiltroAreaRes');
  if(selArea){
    const val=selArea.value;
    selArea.innerHTML='<option value="">Todas las areas</option>'+
      agendaCfg.areas.map(a=>`<option value="${esc2(a.nombre)}" ${a.nombre===val?'selected':''}>${a.nombre}</option>`).join('');
  }
  try{
    const modo=vi('calFiltroHojaRes');
    let ini='',fin='';
    if(modo!=='todas'){
      const lun=getLunes(calFechaBase);
      const dom=new Date(lun);dom.setDate(dom.getDate()+6);
      ini=fmt(lun);fin=fmt(dom);
    }
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fin});
    if(!r.ok)throw new Error(r.error);
    let reservas=_filterRsvBorradas(r.reservas);
    const areaF=vi('calFiltroAreaRes');
    if(areaF) reservas=reservas.filter(rv=>rv.area===areaF);
    if(!reservas.length){box.innerHTML='<div class="empty" style="padding:12px">Sin reservas</div>';return;}
    // Ordenar por fecha desc
    reservas.sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.horaInicio.localeCompare(a.horaInicio));
    box.innerHTML=reservas.map(rv=>`
      <div style="display:grid;grid-template-columns:85px 85px 1fr 1fr 32px;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--bd2);font-size:12px">
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--tx3)">${rv.fecha}</span>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--tx3)">${rv.horaInicio}</span>
        <div>
          <div style="font-weight:600;color:var(--tx)">${rv.paciente||'—'}</div>
          <div style="font-size:11px;color:var(--tx4)">${rv.area} · ${rv.camilla}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--n500)">${rv.docente||rv.reservadoPor||'—'}</div>
          <div style="font-size:10px;color:var(--tx4)">${rv.observacion||''}</div>
        </div>
        <button onclick="eliminarReservaLista('${esc(rv.fecha)}','${esc(rv.horaInicio)}','${esc(rv.area)}','${esc(rv.camilla)}')" style="background:none;border:none;color:var(--tx4);cursor:pointer;font-size:13px;padding:0;transition:color .15s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--tx4)'" title="Eliminar">&#128465;</button>
      </div>`).join('');
  }catch(e){box.innerHTML=`<div class="hint" style="margin:8px">Error: ${e.message}</div>`}
}

async function eliminarReservaLista(fecha,hora,area,camilla){
  if(!await confirmDialog('Cancelar reserva de '+camilla+' el '+fecha+' a las '+hora+'?'))return;
  showLoader('Cancelando...');
  try{
    const r=await apiPost({action:'eliminarReserva',fecha,horaInicio:hora,area,camilla});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Reserva cancelada','','ok');
    // Actualización optimista
    const _n=s=>String(s).trim().toLowerCase();
    agendaReservas=agendaReservas.filter(rv=>!(
      _n(rv.fecha)===_n(fecha)&&_n(rv.horaInicio)===_n(hora)&&
      _n(rv.area)===_n(area)&&_n(rv.camilla)===_n(camilla)
    ));
    _markRsvDeleted(fecha, hora, area, camilla);
    renderCalendario();
    invalidateCache('leerReservas');
    cargarListaReservas();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}


// ── NAVEGACIÓN ESTUDIANTE ────────────────────────────────
function mostrarSecEst(sec){
  var sN=g('secEstNotas'),sA=g('secEstAgenda'),sC=g('secEstCasilleros');
  var bN=g('btnEstNotas'),bA=g('btnEstAgenda'),bC=g('btnEstCas');
  var bnN=g('estBnNotas'),bnA=g('estBnAgenda');
  [sN,sA,sC].forEach(function(s){if(s)s.style.display='none';});
  [bN,bA,bC].forEach(function(b){if(b){b.style.background='transparent';b.style.borderColor='rgba(255,255,255,.2)';b.style.color='var(--n300)';}});
  if(bnN)bnN.style.color='var(--n400)';if(bnA)bnA.style.color='var(--n400)';
  if(sec==='notas'){
    if(sN)sN.style.display='block';
    if(bN){bN.style.background='var(--n500)';bN.style.borderColor='var(--n400)';bN.style.color='#fff';}
    if(bnN)bnN.style.color='#fff';
  }else if(sec==='agenda'){
    if(sA)sA.style.display='block';
    if(bA){bA.style.background='var(--n500)';bA.style.borderColor='var(--n400)';bA.style.color='#fff';}
    if(bnA)bnA.style.color='#fff';
    cargarReservasEst().then(()=>{
      const hoy2=new Date(); hoy2.setHours(0,0,0,0);
      const cursor2=new Date(hoy2);
      const dias5=[];
      while(dias5.length<6){
        const dow=cursor2.getDay();
        if(dow>=1&&dow<=6) dias5.push(fmt(new Date(cursor2)));
        cursor2.setDate(cursor2.getDate()+1);
      }
      cargarBloqueos(dias5[0],dias5[dias5.length-1]).then(renderCalendarioEst);
    });
    if(!agendaCfg.areas.length) iniciarAgendaEstudiante();
  }else if(sec==='casilleros'){
    if(sC)sC.style.display='block';
    if(bC){bC.style.background='var(--n500)';bC.style.borderColor='var(--n400)';bC.style.color='#fff';}
    cargarCasillerosSoloLectura();
  }
}

// ════════════════════════════════════════════════════════
// BLOQUEOS DE AGENDA
// ════════════════════════════════════════════════════════
let agendaBloqueos = [];
var _espFormAbierto = null;

async function cargarBloqueos(fechaInicio, fechaFin){
  try{
    const r=await apiGetCached('leerBloqueos',{fechaInicio:fechaInicio||'',fechaFin:fechaFin||''});
    if(r.ok) agendaBloqueos=r.bloqueos;
  }catch(e){ agendaBloqueos=[]; }
}

function _matchBloqueo(b, fecha, hora, area, camilla){
  let fOk;
  if(b.fecha&&b.fecha.startsWith('DOW:')){
    const dow=parseInt(b.fecha.split(':')[1]);
    const d=new Date(fecha+'T12:00:00');
    fOk=d.getDay()===dow;
  } else {
    fOk = b.fecha==='*' || (b.fecha.includes('/')
      ? (()=>{ const [fi,ff]=b.fecha.split('/'); return fi&&ff&&fecha>=fi&&fecha<=ff; })()
      : b.fecha===fecha);
  }
  const hOk = b.hora==='*' || (b.hora.includes('-')
    ? (()=>{ const [ini,fin]=b.hora.split('-'); return ini&&fin&&hora>=ini&&hora<fin; })()
    : b.hora===hora);
  const aOk = b.area==='*' || b.area===area;
  const cOk = b.camilla==='*' || b.camilla===camilla;
  return fOk && hOk && aOk && cOk;
}

function esBloqueado(fecha, hora, area, camilla){
  return agendaBloqueos.some(b=>!(b.motivo&&b.motivo.startsWith('[cap:'))&&_matchBloqueo(b,fecha,hora,area,camilla));
}

function capacidadBloqueada(fecha,hora,area,camilla){
  return agendaBloqueos.reduce(function(sum,b){
    var m=b.motivo&&b.motivo.match(/^\[cap:(\d+)\]/);
    if(!m)return sum;
    return _matchBloqueo(b,fecha,hora,area,camilla)?sum+parseInt(m[1]):sum;
  },0);
}

function esAreaBloqueada(nombre){
  return agendaBloqueos.some(b=>b.fecha==='*'&&b.hora==='*'&&b.area===nombre&&b.camilla==='*');
}

async function toggleBloqueoArea(areaIdx){
  const nombre=agendaCfg.areas[areaIdx].nombre;
  showLoader('Actualizando...');
  try{
    const bloq=agendaBloqueos.find(b=>b.fecha==='*'&&b.hora==='*'&&b.area===nombre&&b.camilla==='*');
    if(bloq){
      const r=await apiPost({action:'eliminarBloqueo',id:bloq.id});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Área desbloqueada','','ok');
    }else{
      const r=await apiPost({action:'crearBloqueo',fecha:'*',hora:'*',area:nombre,camilla:'*',motivo:'Área bloqueada'});
      hideLoader();if(!r.ok)throw new Error(r.error);
      toast('Área bloqueada','','ok');
    }
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderAreasConfig();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

function toggleEspForm(areaIdx,espIdx){
  var key=areaIdx+'-'+espIdx;
  _espFormAbierto=(_espFormAbierto===key)?null:key;
  renderAreasConfig();
}
async function crearBloqueoEspacio(areaIdx,espIdx){
  var areaNombre=agendaCfg.areas[areaIdx].nombre;
  var espNombre=agendaCfg.areas[areaIdx].espacios[espIdx].nombre;
  var cap=agendaCfg.areas[areaIdx].espacios[espIdx].capacidad||1;
  var k=areaIdx+'-'+espIdx;
  var horaIni=vi('bef-h1-'+k)||'*';
  var horaFin=vi('bef-h2-'+k)||'';
  var hora;
  if(horaIni!=='*'&&horaFin){
    if(horaFin<=horaIni){toast('Error','La hora fin debe ser posterior a la hora inicio','err');return;}
    hora=horaIni+'-'+horaFin;
  } else {
    hora=horaIni;
  }
  var fechaIni=vi('bef-f1-'+k)||'';
  var fechaFin=vi('bef-f2-'+k)||'';
  var fecha;
  if(fechaIni&&fechaFin){
    if(fechaFin<fechaIni){toast('Error','La fecha fin debe ser igual o posterior a la fecha inicio','err');return;}
    fecha=fechaIni+'/'+fechaFin;
  } else if(fechaIni){
    fecha=fechaIni;
  } else {
    fecha='*';
  }
  var capBloq=cap>1?(parseInt(vi('bef-cap-'+k))||1):1;
  if(capBloq<1||capBloq>cap)capBloq=1;
  var motivo='[cap:'+capBloq+']';
  showLoader('Creando bloqueo...');
  try{
    var r=await apiPost({action:'crearBloqueo',fecha,hora,area:areaNombre,camilla:espNombre,motivo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Bloqueo creado','','ok');
    _espFormAbierto=null;
    invalidateCache('leerBloqueos');
    await cargarBloqueos();
    renderAreasConfig();
    renderListaBloqueosModal();
    renderCalendario();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

// UI de bloqueos
function actualizarSelectsBloqueo(){
  actualizarSelectsBloqueoModal();
}
function actualizarCamillasBloqueo(){
  actualizarCamillasBloqueoModal();
}

async function crearBloqueoUI(){ await crearBloqueoModal(); }

function renderListaBloqueos(){ renderListaBloqueosModal(); }




// ── PANEL ADMIN DESDE TOPBAR ─────────────────────────────
// Títulos de los paneles del admin
var PANEL_TITLES = {
  al:'&#128203; Crear planilla', us:'&#128101; Usuarios',
  ho:'&#9881; Configuracion de Hojas', pdf:'&#128196; PDF', log:'&#128202; Log', cas:'&#128220; Casilleros',
  bus:'&#128269; Buscar Alumno'
};

function abrirPanelAdmin(tab){
  var _rp = (tab==='cas'||tab==='ho'||tab==='bus') ? ['admin','docente'] : ['admin'];
  if(!session||!_rp.includes(session.rol)){toast('Sin permiso','Solo admin','err');return;}

  // Si ya hay un panel abierto, devolver su contenido al pane original ANTES de abrir otro
  const body = g('panelCardBody');
  if(body){
    const prevTab = body.getAttribute('data-tab');
    if(prevTab && prevTab !== tab){
      const prevPane = g('pane-'+prevTab);
      if(prevPane){ while(body.firstChild) prevPane.appendChild(body.firstChild); }
      body.removeAttribute('data-tab');
    } else if(prevTab === tab){
      // Mismo panel: limpiar para recargar
      body.innerHTML = '';
      body.removeAttribute('data-tab');
    }
  }

  // Ocultar otras secciones
  if(g('edCard'))  g('edCard').style.display='none';
  if(g('agendaCard')) g('agendaCard').style.display='none';
  if(g('prevCard')) g('prevCard').style.display='none';

  // Activar el tab del sidebar si existe
  const tabBtn = g('tab'+tab.charAt(0).toUpperCase()+tab.slice(1));
  if(tabBtn) showTab(tab, tabBtn);

  // Mover el contenido del pane al panelCard
  const pane = g('pane-'+tab);
  if(!pane){ console.warn('pane-'+tab+' no encontrado'); return; }

  const title = g('panelCardTitle');
  if(!body || !title) return;

  title.innerHTML = PANEL_TITLES[tab] || tab;
  body.innerHTML = '';
  while(pane.firstChild) body.appendChild(pane.firstChild);
  body.setAttribute('data-tab', tab);

  // Cargar datos según el panel
  if(tab==='pdf') cargarHojasExport();
  else if(tab==='us') cargarUsuarios();
  else if(tab==='ho') loadHojas();
  else if(tab==='log') cargarLog();
  else if(tab==='cas') cargarCasilleros();
  else if(tab==='cfg') cargarConfigSistema();

  // Mostrar el panelCard
  const pc = g('panelCard');
  if(pc) pc.style.display='block';
  if(tab==='al') setTimeout(initGenSections,50);
}

function cerrarPanel(){
  const pc = g('panelCard');
  if(!pc) return;
  const body = g('panelCardBody');
  const tab = body && body.getAttribute('data-tab');
  // Devolver contenido al pane original
  if(tab){
    const pane = g('pane-'+tab);
    if(pane){ while(body.firstChild) pane.appendChild(body.firstChild); }
  }
  pc.style.display='none';
}



// ── BOTTOM NAV ADMIN/DOCENTE ────────────────────────────
function admNavNotas(){
  // Siempre mostrar el popup de selección de hojas
  var bnH=g('admBnHojas'),bnA=g('admBnAgenda');
  if(bnH)bnH.style.color='#fff';
  if(bnA)bnA.style.color='var(--n400)';
  abrirPopupHojas();
}

async function abrirPopupHojas(){
  var popup=g('popupHojas');
  var lista=g('popupHojasList');
  if(!popup||!lista)return;
  lista.innerHTML='<div style="color:var(--tx4);font-size:13px;padding:10px 0;text-align:center">Cargando...</div>';
  popup.style.display='block';
  try{
    var r=await apiGetCached('listarHojas');
    if(!r.ok)throw new Error(r.error);
    var EXCLUIR=['Casilleros','_usuarios','Log'];
    var hojas=(r.hojas||[]).filter(function(h){return EXCLUIR.indexOf(h.nombre)<0;});
    if(!hojas.length){
      lista.innerHTML='<div style="color:var(--tx4);font-size:13px;padding:10px 0;text-align:center">Sin hojas creadas</div>';
      return;
    }
    var html='';
    hojas.forEach(function(h){
      var esActiva=hojaActiva===h.nombre;
      var nom=h.nombre.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      var nomEsc=h.nombre.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      var meta=h.alumnos+' alumno'+(h.alumnos!==1?'s':'')+(esActiva?' · abierta':'');
      html+='<div class="popup-hoja-item'+(esActiva?' activa':'')+'" onclick="seleccionarHojaPopup(\''+nomEsc+'\')">'+
        '<span class="popup-hoja-ico">&#128203;</span>'+
        '<div><div class="popup-hoja-nombre">'+nom+'</div>'+
        '<div class="popup-hoja-meta">'+meta+'</div></div></div>';
    });
    lista.innerHTML=html;
  }catch(e){
    lista.innerHTML='<div style="color:var(--red);font-size:13px;padding:10px 0;text-align:center">Error: '+e.message+'</div>';
  }
}

function cerrarPopupHojas(){
  var popup=g('popupHojas');
  if(popup)popup.style.display='none';
}

async function seleccionarHojaPopup(nombre){
  cerrarPopupHojas();
  // Ocultar otras vistas
  var ac=g('agendaCard');if(ac)ac.style.display='none';
  var pc=g('panelCard');if(pc)pc.style.display='none';
  var pv=g('prevCard');if(pv)pv.style.display='none';
  // Abrir la hoja
  await abrirHoja(nombre);
}
function admNavAgenda(){
  mostrarAgenda();
  // Actualizar colores del nav
  var bnH=g('admBnHojas'),bnA=g('admBnAgenda');
  if(bnA)bnA.style.color='#fff';
  if(bnH)bnH.style.color='var(--n400)';
}

// ════════════════════════════════════════════════════════
// CASILLEROS
// ════════════════════════════════════════════════════════
