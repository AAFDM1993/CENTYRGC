// ── notas.js: editor de hojas y notas ──────────────────────────────────────
// Depende de: core.js (g, vi, esc, esc2, toast, showLoader, hideLoader, APRO)
//             session.js (session, hojaActiva, hojaData, saveTimers)
//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)
//             alumnos.js (renderPreview)
// Globals inline (pendientes): iniciarVistaEstudiante, cargarHojasExport,
//   preguntarMejoria, ofrecerPacienteExtra, eliminarPacX, actualizarTodasPlanillas

async function loadHojas(){
  // Filtrar hojas del sistema
  var HOJAS_SIS=['Casilleros','_usuarios','Log'];
  const box=g('hojasBox');
  if(box) box.innerHTML='<div class="empty">Cargando...</div>';
  try{
    const r=await apiGetCached('listarHojas');if(!r.ok)throw new Error(r.error);
    var hojasFiltradas=r.hojas.filter(function(h){return HOJAS_SIS.indexOf(h.nombre)<0;});
    // Poblar SIEMPRE los botones del topbar
    renderDocenteHojasBtns(hojasFiltradas);
    // Docente: abrir primera hoja automáticamente si no hay hoja activa
    if(session && session.rol==='docente' && !hojaActiva && hojasFiltradas.length>0){
      abrirHoja(hojasFiltradas[0].nombre);
      return;
    }
    // Poblar el panel de hojas solo si está en el DOM visible
    if(!box)return;
    if(!hojasFiltradas.length){box.innerHTML='<div class="empty">Sin hojas creadas</div>';return}
    const esA=session&&session.rol==='admin';
    box.innerHTML=hojasFiltradas.map(h=>`<div class="hi"><div class="hi-ico" onclick="abrirHoja('${esc(h.nombre)}')">&#128203;</div><div class="hi-info" onclick="abrirHoja('${esc(h.nombre)}')"><div class="hi-name">${h.nombre}</div><div class="hi-meta">${h.alumnos} alumno${h.alumnos!==1?'s':''}</div></div>${esA?`<button onclick="event.stopPropagation();abrirConfigHoja('${esc(h.nombre)}')" style="background:rgba(29,78,216,.12);border:1px solid rgba(29,78,216,.3);border-radius:8px;color:var(--n400);font-size:11px;font-weight:700;padding:4px 10px;cursor:pointer;white-space:nowrap;margin-right:4px">&#9881; Config</button><button class="hi-del" onclick="event.stopPropagation();delHoja('${esc(h.nombre)}')">&#128465;</button>`:''}</div>`).join('');
  }catch(e){if(box)box.innerHTML=`<div class="hint">Error: ${e.message}</div>`}
}
async function delHoja(nombre){
  if(!await confirmDialog(`Eliminar "${nombre}"?`))return;showLoader('Eliminando...');
  try{
    const r=await apiPost({action:'eliminarHoja',hoja:nombre});hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Hoja eliminada','','ok');
    invalidateCache('listarHojas');invalidateCache('leerHoja');
    if(hojaActiva===nombre){hojaActiva=null;hojaData=null;g('prevCard').style.display='';g('edCard').style.display='none'}
    loadHojas();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
async function abrirHoja(nombre){
  // Ocultar todas las otras vistas
  var pc=g('panelCard');    if(pc) pc.style.display='none';
  var ac=g('agendaCard');   if(ac) ac.style.display='none';
  var pv=g('prevCard');     if(pv) pv.style.display='none';
  // Si había un panel abierto, devolver su contenido al pane original
  var body=g('panelCardBody');
  if(body){
    var prevTab=body.getAttribute('data-tab');
    if(prevTab){
      var prevPane=g('pane-'+prevTab);
      if(prevPane){while(body.firstChild)prevPane.appendChild(body.firstChild);}
      body.removeAttribute('data-tab');
    }
  }
  var btn=g('btnTopbarAgenda');
  if(btn){btn.style.background='var(--n600)';btn.style.borderColor='var(--n500)';}
  showLoader('Cargando hoja...');
  try{
    const r=await apiGetCached('leerHoja',{hoja:nombre});
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    hojaActiva=nombre; hojaData=r;
    renderEditor();
  }catch(e){hideLoader();toast('Error al cargar hoja',e.message,'err')}
}
function renderEditor(){
  if(!hojaData)return;
  const cfg=hojaData.config||{},apro=Number(cfg.notaApro)||APRO();
  const esD=session&&session.rol==='docente';
  g('prevCard').style.display='none';
  g('edCard').style.display='block';
  g('panelCard').style.display='none';
  g('agendaCard').style.display='none';
  g('edTitle').textContent='Editor: '+hojaActiva;
  g('edBadge').textContent=hojaData.alumnos.length+' alumnos';
  const fb=g('edFilter');fb.style.display=(esD||session.rol==='admin')?'flex':'none';
  const btnPct=document.querySelector('#edCard .chdr button[onclick="editarPctExtraGlobal()"]');
  if(btnPct) btnPct.style.display=session.rol==='admin'?'':'none';
   const btnAl = g('btnAgregarAlumno');
  if(btnAl) btnAl.style.display = session.rol==='admin' ? '' : 'none';
  g('filterText').value='';g('filterCnt').textContent='';
  g('edBody').innerHTML=hojaData.alumnos.map((al,ai)=>renderAlBlock(al,ai,apro)).join('');
}
function renderAlBlock(al,ai,apro){
  const bl=al.cursos.map((cu,ci)=>{
    const sb=cu.subgrupos.map((sg,si)=>{
      const base=sg.notasBase||0,extra=sg.notasExtra||0;
      let thS='',thE='';
      for(let i=0;i<base;i++){const lbl=i===0?'EV':'S'+i;thS+=`<th class="th-ss">${lbl}</th>`;}
      for(let i=0;i<extra;i++)thE+=`<th class="th-ex">S${base+i}</th>`;
      const rows=sg.pacientes.map((pac,pi)=>{
        const nv=pac.nombre||'';
        let sc='',ec='';
        for(let ni=0;ni<base;ni++){const v=pac.notas[ni]!==undefined&&pac.notas[ni]!==''?pac.notas[ni]:'';sc+=`<td><input type="number" class="nc ${v!==''?'v':''}" value="${v}" min="0" max="20" step="0.5" data-al="${esc(al.nombre)}" data-cu="${esc(cu.nombre)}" data-sgr="${esc(sg.nombre)}" data-pac="${esc(pac.label)}" data-tipo="ss" data-idx="${ni}" data-base="${base}" data-extra="${extra}" data-valor-anterior="${v}" onchange="saveNota(this)" onfocus="this.select()"></td>`}
        for(let ni=0;ni<extra;ni++){const v=pac.xNotas&&pac.xNotas[ni]!==undefined&&pac.xNotas[ni]!==''?pac.xNotas[ni]:'';ec+=`<td><input type="number" class="nc ex ${v!==''?'v':''}" value="${v}" min="0" max="20" step="0.5" data-al="${esc(al.nombre)}" data-cu="${esc(cu.nombre)}" data-sgr="${esc(sg.nombre)}" data-pac="${esc(pac.label)}" data-tipo="extra" data-idx="${ni}" data-base="${base}" data-extra="${extra}" data-valor-anterior="${v}" onchange="saveNota(this)" onfocus="this.select()"></td>`}
        const ps=pac.promSS;const pe=pac.extraPond;const p=pac.prom;
        const pc='pc'+(p!==''&&p!==undefined?(p>=apro?' ok':' no'):'');
        const esExtra = pac.label.indexOf('PACX')===0;
        const rowBg = esExtra ? 'background:linear-gradient(90deg,rgba(217,119,6,.08),transparent);' : '';
        const btnDelPacX = (esExtra && session && (session.rol==='admin'||session.rol==='docente'))
          ? `<button onclick="eliminarPacX('${esc(al.nombre)}','${esc(cu.nombre)}','${esc(sg.nombre)}','${esc(pac.label)}')" style="background:none;border:none;color:var(--red);font-size:11px;cursor:pointer;padding:2px 6px;margin-left:6px;border-radius:5px;background:var(--red2);border:1px solid var(--red)" title="Eliminar PACX">&#128465; Eliminar</button>`
          : '';
        const extraBadge = esExtra
          ? `<span style="background:var(--amber);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;margin-right:4px">continuación</span>`
          : '';
        return`<tr style="${rowBg}">
          <td class="td-pac">
            ${pac.label}
            <div style="margin-top:4px">
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:9px;font-weight:600;color:var(--tx4)">
                <input type="checkbox" 
                  id="mejoria_${ai}_${ci}_${si}_${pi}"
                  onchange="toggleMejoriaManual(this,'${esc(al.nombre)}','${esc(cu.nombre)}','${esc(sg.nombre)}','${esc(pac.label)}')"
                  style="width:13px;height:13px;cursor:pointer;accent-color:var(--green)">
                <span id="mejoria_lbl_${ai}_${ci}_${si}_${pi}" style="color:var(--tx4)">mejoría</span>
              </label>
            </div>
          </td>
          <td><input class="nn ${nv?'has-val':''}" value="${esc2(nv)}" placeholder="Nombre paciente" data-al="${esc(al.nombre)}" data-cu="${esc(cu.nombre)}" data-sgr="${esc(sg.nombre)}" data-pac="${esc(pac.label)}" onchange="saveNombrePac(this)" onfocus="this.select()">${esExtra?`<div style="margin-top:3px;display:flex;align-items:center;gap:4px">${extraBadge}${btnDelPacX}</div>`:''}</td>
          ${sc}${ec}
          <td style="text-align:center"><span class="pc" id="ps_${ai}_${ci}_${si}_${pi}" style="background:var(--n800);color:var(--n300)">${ps!==''&&ps!==undefined?ps:'-'}</span></td>
          <td style="display:none"></td>
        </tr>`;
      }).join('')||'<tr><td colspan="99" class="empty" style="padding:8px">Sin pacientes</td></tr>';
      return`<div class="pv-sgr-hdr"><span>${sg.nombre}</span></div><div style="overflow-x:auto"><table class="nt"><thead><tr><th class="th-pac">ID</th><th class="th-nom">Nombre Paciente</th>${thS}${thE}<th class="th-pr">PROM SS</th><th class="th-nf" style="display:none">NOTA FINAL</th></tr></thead><tbody>${rows}</tbody>
      ${(()=>{ const _nf=sg.pacientes.length&&sg.pacientes[0].prom!==''&&sg.pacientes[0].prom!==undefined?Number(sg.pacientes[0].prom):null; const _col=_nf!==null?(_nf>=apro?'var(--green)':'var(--red)'):'var(--n300)'; const _bg=_nf!==null?(_nf>=apro?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)'):'var(--n800)'; return `<tfoot><tr><td colspan="2" style="padding:6px 12px;font-size:11px;font-weight:700;color:var(--tx3);background:var(--n050);border-top:2px solid var(--bd2)">Promedio Subgrupo</td><td colspan="${base+extra}" style="border-top:2px solid var(--bd2);background:var(--n050)"></td><td style="text-align:center;border-top:2px solid var(--bd2);background:${_bg}"><span style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;color:${_col}">${_nf!==null?_nf:'-'}</span></td></tr></tfoot>`; })()}
      </table></div>`;
    }).join('');
    // Calcular nota final del curso: promedio de los promedios de subgrupos
    let _sumaProms = 0, _cntProms = 0;
    cu.subgrupos.forEach(sg2 => {
      // El prom del subgrupo es el mismo para todos los pacientes, usar el primero
      if(sg2.pacientes && sg2.pacientes.length > 0){
        const _p = sg2.pacientes[0].prom;
        if(_p !== '' && _p !== undefined && _p !== null){
          _sumaProms += Number(_p); _cntProms++;
        }
      }
    });
    const _notaFinalCurso = _cntProms > 0 ? (_sumaProms / _cntProms).toFixed(2) : null;
    const _nfColor = _notaFinalCurso === null ? 'var(--n300)'
      : Number(_notaFinalCurso) >= apro ? 'var(--green)' : 'var(--red)';
    const _nfBg = _notaFinalCurso === null ? 'rgba(255,255,255,.08)'
      : Number(_notaFinalCurso) >= apro ? 'rgba(5,150,105,.2)' : 'rgba(220,38,38,.2)';
   return`<div class="pv-cu-hdr" style="justify-content:space-between">
      <span>${cu.nombre}</span>
      <span id="nfcurso_${ai}_${ci}" style="font-family:'DM Mono',monospace;font-size:13px;font-weight:800;background:${_nfBg};color:${_nfColor};padding:2px 12px;border-radius:8px">
        ${_notaFinalCurso !== null ? _notaFinalCurso : '-'}
      </span>
    </div>${sb}`;
  }).join('');
  return`<div class="pv-al" data-idx="${ai}" data-nombre="${al.nombre.toLowerCase()}"><div class="pv-al-hdr"><span>${al.nombre}</span><span class="pv-al-code">${al.codigo||''}</span></div>${bl}</div>`;
}
function aplicarFiltro(){
  const txt=vi('filterText').toLowerCase().trim();
  const bloques=g('edBody').querySelectorAll('.pv-al');let vis=0;;
  bloques.forEach(b=>{const m=!txt||b.dataset.nombre.indexOf(txt)>=0;b.classList.toggle('hidden',!m);if(m)vis++});
  g('filterCnt').textContent=txt?vis+' resultado'+(vis!==1?'s':''):'';
}
async function saveNombrePac(inp){
  const{al:alumno,cu:curso,sgr,pac}=inp.dataset,nombre=inp.value.trim();
  const key='nom|'+alumno+'|'+curso+'|'+sgr+'|'+pac;
  nombre?inp.classList.add('has-val'):inp.classList.remove('has-val');
  clearTimeout(saveTimers[key]);
  saveTimers[key]=setTimeout(async()=>{
    try{const r=await apiPost({action:'guardarNombre',hoja:hojaActiva,alumno,curso,subgrupo:sgr,pacLabel:pac,nombre});if(!r.ok)throw new Error(r.error)}
    catch(e){toast('Error al guardar nombre',e.message,'err')}
  },600);
}

// Mapa en memoria: clave = "alumno|curso|sgr|pac" → true/false
const _mejoriaManual = {};

function toggleMejoriaManual(chk, alumno, curso, sgr, pac){
  const key = alumno+'|'+curso+'|'+sgr+'|'+pac;
  _mejoriaManual[key] = chk.checked;
  const lbl = chk.closest('label').querySelector('span');
  if(chk.checked){
    lbl.textContent = '✓ mejoría';
    lbl.style.color = 'var(--green)';
  } else {
    lbl.textContent = 'mejoría';
    lbl.style.color = 'var(--tx4)';
  }
}
   
async function saveNota(inp){
  const{al:alumno,cu:curso,sgr,pac}=inp.dataset;
  const tipo=inp.dataset.tipo,idx=+inp.dataset.idx,base=+inp.dataset.base,extra=+inp.dataset.extra;
  const valor=inp.value.trim();
  const key=alumno+'|'+curso+'|'+sgr+'|'+pac+'|'+tipo+'|'+idx;
  
  // Guardar el valor anterior si no existe
  if(!inp.dataset.valorAnterior) inp.dataset.valorAnterior = inp.dataset.valorInicial || '';
  const valorAnterior = inp.dataset.valorAnterior;
  
  // Si el valor no cambió, no guardar
  if(valor === valorAnterior) return;
  
  valor!==''?inp.classList.add('v'):inp.classList.remove('v');
  clearTimeout(saveTimers[key]);
   
// Preguntar mejoría en el 25%, 50% y 75% del mínimo programado
  // idx es base 0, atención N = idx N-1
  // Checkpoints desde S1 (idx=1), excluyendo EV (idx=0)
  // sesBase = sesiones reales (base - 1, sin contar EV)
  const _sesBase = Math.max(base - 1, 1);
  const _p25 = Math.ceil(_sesBase * 0.25) - 1 + 1;
  const _p50 = Math.ceil(_sesBase * 0.50) - 1 + 1;
  const _p75 = Math.ceil(_sesBase * 0.75) - 1 + 1;
  const _sesionesMejoria = new Set([_p25, _p50, _p75].filter(x => x >= 1));
  const _checkpointsPacExtra = new Set([_p50, _p75].filter(x => x >= 1));

  // PACX no pregunta mejoría
  const esPACX = pac.indexOf('PACX') === 0;

  if(tipo==='ss' && !esPACX && _sesionesMejoria.has(idx) && valor!==''){
    const notaActual = parseFloat(valor);
    const inputs = inp.closest('tr').querySelectorAll('input.nc:not(.ex)');
    const inputAnterior = inputs[idx-1];
    const notaAnterior = inputAnterior ? parseFloat(inputAnterior.value) : null;

    {
      const keyMejoria = alumno+'|'+curso+'|'+sgr+'|'+pac;
      const huboMejoria = _mejoriaManual[keyMejoria]
        ? true
        : await preguntarMejoria(pac, curso, sgr, idx+1);
      if(!huboMejoria){
        if(notaActual > 10){
          inp.value = '';
          inp.classList.remove('v');
          toast('Sin mejoría','La nota debe ser ≤ 10 en esta sesión','warn');
          return;
        }
      }
      if(!huboMejoria && _checkpointsPacExtra.has(idx)){
        const yaTienePacX = hojaData && hojaData.alumnos.some(a => a.nombre===alumno &&
          (a.cursos||[]).some(c => c.nombre===curso &&
            (c.subgrupos||[]).some(s => s.nombre===sgr &&
              (s.pacientes||[]).some(p => p.label.indexOf('PACX')===0 &&
                p.label.indexOf('('+pac+')')>=0))));
        if(!yaTienePacX){
          // Pasar el PAC vinculado automáticamente
          setTimeout(()=>ofrecerPacienteExtra(alumno,curso,sgr,base,extra,inp,pac), 800);
        }
      }
    }
  }
  saveTimers[key]=setTimeout(async()=>{
    try{
      const r=await apiPost({action:'guardarNota',hoja:hojaActiva,alumno,curso,subgrupo:sgr,pacLabel:pac,tipo,idx,valor:valor===''?'':parseFloat(valor),notasBase:base,notasExtra:extra});
      if(!r.ok)throw new Error(r.error);
      invalidateCache('leerHoja');
      // Actualizar el valor anterior después de guardar exitosamente
      inp.dataset.valorAnterior = valor;
      if(r.prom!==undefined&&hojaData){
        const apro=Number((hojaData.config||{}).notaApro)||APRO();
        const ai=hojaData.alumnos.findIndex(a=>a.nombre===alumno);
        if(ai>=0){const ci=hojaData.alumnos[ai].cursos.findIndex(c=>c.nombre===curso);
          if(ci>=0){const si=hojaData.alumnos[ai].cursos[ci].subgrupos.findIndex(s=>s.nombre===sgr);
            if(si>=0){const pi=hojaData.alumnos[ai].cursos[ci].subgrupos[si].pacientes.findIndex(p=>p.label===pac);
              if(pi>=0){
                const cellNF=g(`pc_${ai}_${ci}_${si}_${pi}`);
                const cellPS=g(`ps_${ai}_${ci}_${si}_${pi}`);
                const cellPE=g(`pe_${ai}_${ci}_${si}_${pi}`);
                if(cellNF){cellNF.textContent=r.prom!==''&&r.prom!==undefined?r.prom:'-';cellNF.className='pc nf'+(r.prom!==''&&r.prom!==undefined?(r.prom>=apro?' ok':' no'):'');}
                if(cellPS&&r.promSS!==undefined){cellPS.textContent=r.promSS!==''&&r.promSS!==undefined?r.promSS:'-';}
                if(cellPE&&r.extraPond!==undefined){cellPE.textContent=r.extraPond!==''&&r.extraPond!==undefined?r.extraPond:'-';}
                // Actualizar hojaData en memoria y recalcular badge del curso
                hojaData.alumnos[ai].cursos[ci].subgrupos[si].pacientes[pi].prom = r.prom!==undefined?r.prom:'';
                hojaData.alumnos[ai].cursos[ci].subgrupos[si].pacientes[pi].promSS = r.promSS!==undefined?r.promSS:'';
                // Recalcular nota final del curso: promedio de los promedios de subgrupos
                let _s=0,_c=0;
                hojaData.alumnos[ai].cursos[ci].subgrupos.forEach(sg2=>{
                  if(sg2.pacientes&&sg2.pacientes.length>0){
                    const _p=sg2.pacientes[0].prom;
                    if(_p!==''&&_p!==undefined&&_p!==null){_s+=Number(_p);_c++;}
                  }
                });
                const _nf=_c>0?(_s/_c).toFixed(2):null;
                const _badgeCurso=g(`nfcurso_${ai}_${ci}`);
                if(_badgeCurso){
                  _badgeCurso.textContent=_nf!==null?_nf:'-';
                  _badgeCurso.style.color=_nf===null?'var(--n300)':Number(_nf)>=apro?'var(--green)':'var(--red)';
                  _badgeCurso.style.background=_nf===null?'rgba(255,255,255,.08)':Number(_nf)>=apro?'rgba(5,150,105,.2)':'rgba(220,38,38,.2)';
                }
              }
            }
          }
        }
      }
    }catch(e){toast('Error al guardar nota',e.message,'err')}
  },500);
}
