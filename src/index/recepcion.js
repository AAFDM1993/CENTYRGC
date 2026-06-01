// ── recepcion.js: vista recepción + renderCalendarioRec + guardarConfig ───────
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)
//             session.js (session)
//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)
//             agenda.js (getLunes, timeToMin, minToTime, generarSlots, agendaCfg)

let calRecFechaBase = new Date();
let agendaRecReservas = [];

async function iniciarVistaRecepcion(){
  document.body.className=(document.body.className||'').replace(/\brol-\S+/g,'').trim()+' rol-recepcion';
  g('viewRecepcion').style.display='block';
  const rdot=g('rolDot'); if(rdot) rdot.className='rdot recepcion';
  showLoader('Cargando calendario...');
  try{
    const rc = await apiGetCached('leerAgendaConfig');
    if(rc.ok && rc.config){
      agendaCfg = rc.config;
      agendaCfg.areas = (agendaCfg.areas||[]).map(function(a){
        if(!a.espacios&&a.camillas) a.espacios=Array.from({length:a.camillas},(_,i)=>({nombre:'Camilla '+(i+1),capacidad:1}));
        if(!a.espacios) a.espacios=[{nombre:'Espacio 1',capacidad:1}];
        return a;
      });
      if(!agendaCfg.franjas) agendaCfg.franjas=[{inicio:'08:00',fin:'13:00'},{inicio:'14:00',fin:'19:00'}];
    } else {
      hideLoader();
      g('calRecGrid').innerHTML='<div class="empty" style="padding:20px">⚠️ Error al cargar configuración: '+(rc.error||'Sin respuesta')+'</div>';
      return;
    }
    renderAreaBtns('calRecAreaFiltro','filtrarCalendarioRecPorArea');
    calRecFechaBase = getLunes(new Date());
    await cargarReservasRec();
    const finSem=new Date(calRecFechaBase);finSem.setDate(finSem.getDate()+5);
    await cargarBloqueos(fmt(calRecFechaBase),fmt(finSem));
  }catch(e){
    hideLoader();
    g('calRecGrid').innerHTML='<div class="empty" style="padding:20px">⚠️ Error: '+e.message+'</div>';
    return;
  }
  hideLoader();
  if(!agendaCfg.areas||!agendaCfg.areas.length){
    g('calRecGrid').innerHTML='<div class="empty" style="padding:20px">Sin áreas configuradas. Contacta al administrador.</div>';
    return;
  }
  renderCalendarioRec();
}

async function cargarReservasRec(){
  const ini=fmt(calRecFechaBase);
  const finSem=new Date(calRecFechaBase);finSem.setDate(finSem.getDate()+5);
  try{
    const r=await apiGetCached('leerReservas',{fechaInicio:ini,fechaFin:fmt(finSem)});
    if(r.ok) agendaRecReservas=r.reservas;
  }catch(e){ agendaRecReservas=[]; }
}

function semanaAnteriorRec(){ calRecFechaBase.setDate(calRecFechaBase.getDate()-7); _recargarRec(); }
function semanaSiguienteRec(){ calRecFechaBase.setDate(calRecFechaBase.getDate()+7); _recargarRec(); }
function irHoyRec(){ calRecFechaBase=getLunes(new Date()); _recargarRec(); }

function _recargarRec(){
  const finSem=new Date(calRecFechaBase);finSem.setDate(finSem.getDate()+5);
  cargarReservasRec().then(()=>{
    cargarBloqueos(fmt(calRecFechaBase),fmt(finSem)).then(renderCalendarioRec);
  });
}

function filtrarCalendarioRecPorArea(area){
  setAreaFiltro('calRecAreaFiltro',area,null);
  renderCalendarioRec();
}

function renderCalendarioRec(){
  const grid=g('calRecGrid'); if(!grid) return;
  const lbl=g('calRecLabel');
  const vier=new Date(calRecFechaBase);vier.setDate(vier.getDate()+5);
  if(lbl) lbl.textContent=fmtDia(calRecFechaBase)+' – '+fmtDia(vier)+' / '+vier.getFullYear();
  // (el label se actualiza después de calcular dias si es semana actual)
  const areaFiltro=getAreaFiltro('calRecAreaFiltro');
  const areas=areaFiltro?agendaCfg.areas.filter(a=>a.nombre===areaFiltro):agendaCfg.areas;
  if(!areas.length){ grid.innerHTML='<div class="empty" style="padding:20px">Sin areas configuradas</div>'; return; }

  const hoy=fmt(new Date());
  const ahora=new Date();
  const todosLosDias=[];
  for(let i=0;i<6;i++){const d=new Date(calRecFechaBase);d.setDate(d.getDate()+i);todosLosDias.push(d);}
  const ultimaFranjaG=agendaCfg.franjas&&agendaCfg.franjas.length
    ?agendaCfg.franjas[agendaCfg.franjas.length-1].fin:'19:00';
  const semanaActual=fmt(getLunes(new Date()))===fmt(calRecFechaBase);
  let dias;
  if(semanaActual){
    const diasHabiles=[];
    let cursor=new Date();cursor.setHours(0,0,0,0);
    while(diasHabiles.length<7){
      const dow=cursor.getDay();
      if(dow>=1&&dow<=6){
        const fd=fmt(cursor);
        const finDia=new Date(fd+'T'+ultimaFranjaG+':00');
        if(finDia>ahora) diasHabiles.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate()+1);
    }
    dias=diasHabiles;
  } else {
    dias=todosLosDias;
  }
  const dw=window.innerWidth<=480?110:window.innerWidth<=768?140:200;

  let html='<div class="cal-grid-wrap"><div style="display:flex;flex-direction:column;min-width:max-content">';

  // Cabecera días
  html+='<div style="display:flex;position:sticky;top:0;z-index:5;background:var(--surf)">';
  html+=`<div style="width:140px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);background:var(--surf2)"></div>`;
  dias.forEach(d=>{
    const esHoy=fmt(d)===hoy;
    html+=`<div style="width:${dw}px;flex-shrink:0"><div class="cal-day-hdr ${esHoy?'hoy':''}"><span class="dia-num">${d.getDate()}</span><span class="dia-nom">${DIAS_NOM[d.getDay()]}</span></div></div>`;
  });
  html+='</div>';

  areas.forEach(area=>{
    const slots=generarSlots(agendaCfg.franjas, area.duracion||60);
    html+=`<div style="background:var(--n700);color:var(--n200);padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:.5px;border-bottom:2px solid var(--n600)">${area.nombre}</div>`;

    slots.forEach((slot,hi)=>{
      if(hi>0){
        const prevFin=timeToMin(slots[hi-1].fin),currIni=timeToMin(slot.inicio);
        if(currIni>prevFin) html+=`<div style="height:8px;background:var(--n050);border-top:2px solid var(--bd2);border-bottom:2px solid var(--bd2);display:flex;align-items:center;padding-left:8px"><span style="font-size:9px;color:var(--tx4);font-weight:700">RECESO</span></div>`;
      }
      (area.espacios||[]).forEach((esp,ei)=>{
        const borderTop=ei===0?'2px solid var(--n300)':'1px dashed var(--bd2)';
        html+=`<div style="display:flex;border-top:${borderTop}">`;
        html+=`<div style="width:140px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);background:var(--surf2);padding:6px 10px;display:flex;flex-direction:column;justify-content:center">`;
        if(ei===0) html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:var(--tx);margin-bottom:2px">${slot.inicio}–${slot.fin}</div>`;
        html+=`<div style="font-size:11px;font-weight:600;color:var(--n500)">${esp.nombre}</div></div>`;

        dias.forEach(d=>{
          const fechaStr=fmt(d);
          const norm=s=>String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const matchEsp=(r,en)=>{const rc=norm(r.camilla),ne=norm(en);return rc===ne||rc.startsWith(ne)||ne.startsWith(rc);};
          const rsvEsp=agendaRecReservas.filter(r=>norm(r.fecha)===norm(fechaStr)&&norm(r.horaInicio)===norm(slot.inicio)&&norm(r.area)===norm(area.nombre)&&matchEsp(r,esp.nombre));
          const bloq=typeof esBloqueado==='function'&&esBloqueado(fechaStr,slot.inicio,area.nombre,esp.nombre);

          let celda='';
          if(bloq){
            celda=`<div style="height:100%;background:repeating-linear-gradient(45deg,#fee2e2,#fee2e2 3px,#fff5f5 3px,#fff5f5 8px);display:flex;align-items:center;justify-content:center;font-size:9px;color:#dc2626;font-weight:600">&#128274; Bloqueado</div>`;
          } else if(rsvEsp.length){
            rsvEsp.forEach(rsv=>{
              celda+=`<div style="background:var(--n600);border-radius:6px;padding:3px 6px;margin-bottom:2px">
                <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.paciente||'—'}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${rsv.docente||rsv.reservadoPor||''}</div>
              </div>`;
            });
          } else {
            celda=`<div style="min-height:32px"></div>`;
          }
          html+=`<div style="width:${dw}px;flex-shrink:0;border-right:1px solid var(--bd2);border-bottom:1px solid var(--bd2);padding:4px 5px;min-height:34px">${celda}</div>`;
        });
        html+='</div>';
      });
    });
    html+='<div style="height:6px;background:var(--n800)"></div>';
  });

  html+='</div></div>';
  grid.innerHTML=html;
}
   async function abrirConfigHoja(nombre){
  showLoader('Cargando estructura...');
  try{
    const r = await apiGetCached('leerHoja', {hoja: nombre});
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    window._cfgHojaAlumnos = r.alumnos;
    window._cfgHojaNombre  = nombre;
    const cursosArr = [];
    r.alumnos.forEach(function(al){
      al.cursos.forEach(function(cu){
        let cuObj = cursosArr.find(function(x){ return x.nombre === cu.nombre; });
        if(!cuObj){ cuObj = {nombre:cu.nombre, subgrupos:[]}; cursosArr.push(cuObj); }
        cu.subgrupos.forEach(function(sg){
          if(!cuObj.subgrupos.find(function(x){ return x.nombre === sg.nombre; })){
            const numPac = sg.pacientes ? sg.pacientes.filter(function(p){ return p.label.indexOf('PACX')<0; }).length : 1;
            cuObj.subgrupos.push({nombre:sg.nombre, notasBase:sg.notasBase||0, notasExtra:sg.notasExtra||0, numPac:numPac});
          }
        });
      });
    });
    window._cfgCursosArr = cursosArr;
    let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
          + '<div style="font-size:12px;color:var(--tx3);background:var(--n050);border:1px solid var(--n200);border-radius:10px;padding:9px 12px;flex:1;margin-right:10px">'
          + '<strong style="color:var(--n600)">&#9432;</strong> Cambios aplican a todos los alumnos. Las notas se conservan.</div>'
          + '<button onclick="regenerarHoja()" style="background:var(--red);border:none;border-radius:9px;color:#fff;font-size:12px;font-weight:700;padding:9px 16px;cursor:pointer;white-space:nowrap;flex-shrink:0">&#128260; Regenerar hoja</button>'
          + '</div>';
    cursosArr.forEach(function(cu, ci){
      html += '<div style="margin-bottom:16px">'
            + '<div style="background:var(--n700);color:var(--n200);padding:8px 14px;border-radius:10px 10px 0 0;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between">'
            + '<span>&#128218; '+cu.nombre+'</span>'
            + '<button onclick="guardarConfigCurso('+ci+')" style="background:var(--green);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;padding:5px 12px;cursor:pointer">&#10003; Guardar</button>'
            + '</div>';
      cu.subgrupos.forEach(function(sg, si){
        const min = sg.notasBase, max = min + sg.notasExtra, np = sg.numPac||1;
        const isLast = si === cu.subgrupos.length - 1;
        html += '<div style="border:1px solid var(--bd2);border-top:none;padding:12px 14px;background:var(--surf2);'+(isLast?'border-radius:0 0 10px 10px':'')+'">';
        html += '<div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:10px">&#128101; '+sg.nombre+'</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
        html += '<div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Min</label>'
              + '<input type="number" min="1" max="50" value="'+min+'" id="cfg_min_'+ci+'_'+si+'" style="width:100%;border:1px solid var(--bd);border-radius:8px;padding:7px 10px;font-size:14px;font-weight:800;outline:none;text-align:center"></div>';
        html += '<div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Max</label>'
              + '<input type="number" min="1" max="50" value="'+max+'" id="cfg_max_'+ci+'_'+si+'" style="width:100%;border:1px solid var(--bd);border-radius:8px;padding:7px 10px;font-size:14px;font-weight:800;outline:none;text-align:center"></div>';
        html += '<div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Pacientes</label>'
              + '<input type="number" min="1" max="20" value="'+np+'" id="cfg_pac_'+ci+'_'+si+'" style="width:100%;border:1px solid var(--bd);border-radius:8px;padding:7px 10px;font-size:14px;font-weight:800;outline:none;text-align:center"></div>';
        html += '</div></div>';
      });
      html += '</div>';
    });
    const paneHo=g('pane-ho'); if(paneHo) paneHo.innerHTML='';
    const body=g('panelCardBody'); if(body) body.innerHTML=html;
    const title=g('panelCardTitle'); if(title) title.innerHTML='&#9881; '+nombre;
    const pc=g('panelCard'); if(pc) pc.style.display='block';
    if(g('edCard')) g('edCard').style.display='none';
    if(g('agendaCard')) g('agendaCard').style.display='none';
    if(g('prevCard')) g('prevCard').style.display='none';
  }catch(e){ hideLoader(); toast('Error', e.message, 'err'); }
}
async function guardarConfigSubgrupo(curso, subgrupo, ci, si){
  // Mantenida por compatibilidad — ahora se usa guardarConfigCurso
}

async function guardarConfigCurso(ci){
  const hoja    = window._cfgHojaNombre;
  const alumnos = (window._cfgHojaAlumnos||[]).map(a=>a.nombre);
  const cursosArr = window._cfgCursosArr||[];
  if(!hoja||!alumnos.length){ toast('Error','No hay hoja cargada','err'); return; }
  const cu = cursosArr[ci];
  if(!cu){ toast('Error','Curso no encontrado','err'); return; }
  const subgruposData = [];
  cu.subgrupos.forEach((sg, si) => {
    const min=parseInt((g('cfg_min_'+ci+'_'+si)||{}).value||0);
    const max=parseInt((g('cfg_max_'+ci+'_'+si)||{}).value||0);
    const np =parseInt((g('cfg_pac_'+ci+'_'+si)||{}).value||1);
    console.log('INPUT IDs:', 'cfg_min_'+ci+'_'+si, 'cfg_max_'+ci+'_'+si, 'cfg_pac_'+ci+'_'+si);
    console.log('VALUES:', min, max, np);
    console.log('ELEMENT:', g('cfg_min_'+ci+'_'+si));
    if(!isNaN(min)&&!isNaN(max)&&min>=1&&max>=min)
      subgruposData.push({subgrupo:sg.nombre, notasBase:min, notasExtra:max-min, numPacientes:np});
    else toast('Valor inválido en '+sg.nombre,'Mínimo ≥ 1 y máximo ≥ mínimo','warn');
  });
  if(!subgruposData.length){ toast('Sin cambios válidos','','warn'); return; }
  showLoader('Guardando '+cu.nombre+'...');
  try{
    const r = await apiPost({
      action: 'actualizarCursoCompleto',
      hoja,
      curso:    cu.nombre,
      alumnos:  alumnos,
      subgrupos: subgruposData
    });
    hideLoader();
    if(!r.ok) throw new Error(r.error||'Error en el GAS');
    if(r.errores && r.errores.length)
      toast('Completado con advertencias', r.errores.slice(0,3).join(' | '), 'warn');
    else
      toast('Guardado', cu.nombre+' — '+alumnos.length+' alumnos', 'ok');
  }catch(e){ hideLoader(); toast('Error', e.message, 'err'); }
}

async function regenerarHoja(){
  const hoja = window._cfgHojaNombre;
  if(!hoja){ toast('Error','No hay hoja cargada','err'); return; }
  if(!await confirmDialog('Regenerar "'+ hoja +'"?\n\nSe ELIMINARÁN todas las notas. ¿Continuar?')) return;
  showLoader('Regenerando hoja...');
  try{
    const r = await apiPost({action:'regenerarHoja', hoja});
    hideLoader();
    if(!r.ok) throw new Error(r.error||'Error en el GAS');
    toast('Hoja regenerada', hoja, 'ok');
    cerrarPanel();
    loadHojas();
  }catch(e){ hideLoader(); toast('Error', e.message, 'err'); }
}

