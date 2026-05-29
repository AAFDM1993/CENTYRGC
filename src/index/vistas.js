// ── vistas.js: vistas de estudiante y docente ──────────────────────────────
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)
//             session.js (session, hojaActiva, hojaData)
//             api.js (apiGet, apiGetCached)
//             notas.js (abrirHoja)
// Fase 6 agregará: iniciarVistaRecepcion, renderCalendarioRec

async function iniciarVistaEstudiante(){
  document.body.className=(document.body.className||'').replace(/\brol-\S+/g,'').trim()+' rol-estudiante';
  // Ocultar topbars que no aplican al estudiante
  var dt=g('docenteTopbar'); if(dt) dt.style.display='none';
  var ab=g('adminBottomNav'); if(ab) ab.style.display='none';
  // Decidir entre topbar o bottom nav según ancho de pantalla
  var bn=g('estBottomNav'), tw=g('estTopbarWrap');
  if(window.innerWidth<768){
    if(bn) bn.style.display='flex';
  } else {
    if(bn) bn.style.display='none';
  }
  if(tw) tw.style.display='none';
  // Actualizar info del usuario
  var nomEl=g('estNombre'), codEl=g('estCodigo');
  if(nomEl) nomEl.textContent=session.nombre||'Estudiante';
  if(codEl) codEl.textContent='Cod: '+(session.codigo||'-');
  // Mostrar sección de notas por defecto
  var sN=g('secEstNotas'),sA=g('secEstAgenda'),sC=g('secEstCasilleros');
  if(sN) sN.style.display='block';
  if(sA) sA.style.display='none';
  if(sC) sC.style.display='none';
  var bN=g('btnEstNotas'),bA=g('btnEstAgenda'),bC=g('btnEstCas');
  if(bN){bN.style.background='var(--n500)';bN.style.borderColor='var(--n400)';bN.style.color='#fff';}
  if(bA){bA.style.background='transparent';bA.style.borderColor='rgba(255,255,255,.2)';bA.style.color='var(--n300)';}
  if(bC){bC.style.background='transparent';bC.style.borderColor='rgba(255,255,255,.2)';bC.style.color='var(--n300)';}
  // Cargar notas
  showLoader('Cargando notas...');
  try{
    const r=await apiGetCached('misNotas',{codigo:session.codigo});
    hideLoader();
    if(!r.ok) throw new Error(r.error);
    renderEstNotas(r.resultados);
  }catch(e){
    hideLoader();
    var box=g('estNotas');
    if(box) box.innerHTML='<div class="hint" style="margin:16px">Error al cargar notas: '+e.message+'</div>';
  }
  // Cargar agenda en background
  iniciarAgendaEstudiante();
}
function renderEstNotas(resultados) {
  const box = g('estNotas');
  if (!resultados.length) {
    box.innerHTML = '<div class="est-no-data"><div class="ico">&#128203;</div><p>No se encontraron notas para tu codigo.</p></div>';
    return;
  }

  box.innerHTML = resultados.map(res => {
    // 1. Mapeo de cursos
    const bl = res.cursos.map(cu => {
      const subgrupos = cu.subgrupos.map(sg => {
        const base = sg.notasBase || 0, extra = sg.notasExtra || 0;
        let thS = '', thE = '';
        
        for (let i = 0; i < base; i++) {
          const lbl = i === 0 ? 'EV' : 'S' + i;
          thS += `<th class="th-ss">${lbl}</th>`;
        }
        for (let i = 0; i < extra; i++) thE += `<th class="th-ex">S${base + i}</th>`;

        const rows = sg.pacientes.map(pac => {
          const tSS = pac.notas.map((v, ni) => {
            if (v === '') return `<td style="text-align:center;font-family:'DM Mono',monospace;font-size:12px;padding:5px 3px;color:var(--tx4)">.</td>`;
            const doc = (pac.notasDoc && pac.notasDoc[ni]) || '';
            return `<td style="text-align:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;padding:5px 3px;color:var(--n600);cursor:pointer;position:relative"
              data-doc="${esc2(doc)}" onclick="mostrarDocenteNota(this)" title="Ver quién registró esta nota"
            >${v}<span style="position:absolute;top:1px;right:1px;font-size:8px;color:var(--n300);line-height:1">&#9432;</span></td>`;
          }).join('');

          const tEx = pac.xNotas.map((v, ni) => {
            if (v === '') return `<td style="text-align:center;font-family:'DM Mono',monospace;font-size:12px;padding:5px 3px;color:var(--tx4)">.</td>`;
            const doc = (pac.xNotasDoc && pac.xNotasDoc[ni]) || '';
            return `<td style="text-align:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;padding:5px 3px;color:#1d4ed8;cursor:pointer;position:relative"
              data-doc="${esc2(doc)}" onclick="mostrarDocenteNota(this)" title="Ver quién registró esta nota"
            >${v}<span style="position:absolute;top:1px;right:1px;font-size:8px;color:var(--n400);line-height:1">&#9432;</span></td>`;
          }).join('');

          const ps = pac.promSS; const pe = pac.extraPond; const p = pac.prom;
          const pc = 'pc' + (p !== '' && p !== undefined ? (p >= 11 ? ' ok' : ' no') : '');
          
          return `<tr>
            <td class="td-pac" style="display:none">${_esc(pac.label)}</td>
            <td style="font-size:12px;font-weight:500;padding:7px 8px;color:var(--tx2)">${_esc(pac.nombre || '-')}</td>
            ${tSS}${tEx}
            <td style="text-align:center"><span class="pc" style="background:var(--n800);color:var(--n300)">${ps !== '' && ps !== undefined ? ps : '-'}</span></td>
            <td style="display:none"></td>
          </tr>`;
        }).join('');

        return `<div class="est-sgr-hdr">${sg.nombre}</div><div style="overflow-x:auto"><table class="nt"><thead><tr><th class="th-pac" style="display:none"></th><th class="th-nom">Paciente</th>${thS}${thE}<th class="th-pr">PROM</th><th class="th-nf" style="display:none">NOTA FINAL</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:7px 12px;font-weight:700;font-size:12px;color:var(--n600);background:var(--n050);border-top:2px solid var(--bd2)">Promedio Subgrupo</td>
          ${(() => { const nf=sg.pacientes.length&&sg.pacientes[0].prom!==''&&sg.pacientes[0].prom!==undefined?Number(sg.pacientes[0].prom):null; const col=nf!==null?(nf>=11?'var(--green)':'var(--red)'):'var(--tx4)'; const bg=nf!==null?(nf>=11?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)'):'var(--n050)'; return `<td colspan="${base+extra+1}" style="text-align:center;background:${bg};border-top:2px solid var(--bd2)"><span style="font-family:'DM Mono',monospace;font-size:15px;font-weight:800;color:${col}">${nf!==null?nf:'-'}</span></td>`; })()}
        </tr></tfoot>
        </table></div>`;
      }).join('');
      const _pC=[];cu.subgrupos.forEach(sg=>{if(sg.pacientes&&sg.pacientes.length>0){const _p=sg.pacientes[0].prom;if(_p!==''&&_p!==undefined)_pC.push(Number(_p));}});
      const _aC=_pC.length?Math.round(_pC.reduce((a,b)=>a+b,0)/_pC.length*100)/100:null;
      const _cC=_aC!==null?(_aC>=11?'var(--green)':'var(--red)'):'var(--tx4)';
      const _bgC=_aC!==null?(_aC>=11?'rgba(5,150,105,.15)':'rgba(220,38,38,.12)'):'transparent';
      const _spC=_aC!==null?`<span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:800;color:${_cC};background:${_bgC};padding:2px 10px;border-radius:8px">${_aC}</span>`:'';
      return `<div class="est-cu-hdr" style="display:flex;align-items:center;justify-content:space-between"><span>${cu.nombre}</span>${_spC}</div>${subgrupos}`;
    }).join('');

    const promFinal = (() => {
      const todas = [];
      res.cursos.forEach(cu => cu.subgrupos.forEach(sg => sg.pacientes.forEach(pac => { if(pac.prom !== '' && pac.prom !== undefined) todas.push(Number(pac.prom)); })));
      if(!todas.length) return '';
      const avg = Math.round(todas.reduce((a,b)=>a+b,0)/todas.length*100)/100;
      const color = avg >= 11 ? 'var(--green)' : 'var(--red)';
      return `<span style="font-family:'DM Mono',monospace;font-size:15px;font-weight:800;color:${color};margin-left:10px">${avg}</span>`;
    })();

    return `<div class="est-hoja"><div class="est-hoja-hdr"><h3>${res.asignatura}</h3><p>${res.hoja}</p></div>${bl}</div>`;
  }).join('');
}
let _docPopupTimer = null;
function mostrarDocenteNota(td){
  document.querySelectorAll('.nota-doc-popup').forEach(p=>p.remove());
  clearTimeout(_docPopupTimer);
  const doc = td.getAttribute('data-doc') || '';
  const popup = document.createElement('div');
  popup.className = 'nota-doc-popup';
  popup.style.cssText = 'position:fixed;background:var(--surf);border:1px solid var(--n300);border-radius:12px;padding:10px 14px;box-shadow:0 6px 24px rgba(10,22,40,.2);z-index:9999;min-width:160px;max-width:240px';
  popup.innerHTML = doc
    ? `<div style="font-size:10px;color:var(--tx4);text-transform:uppercase;letter-spacing:.7px;font-weight:700;margin-bottom:4px">&#128203; Registrado por</div>
       <div style="font-size:14px;font-weight:700;color:var(--n500)">${_esc(doc)}</div>`
    : `<div style="font-size:10px;color:var(--tx4);text-transform:uppercase;letter-spacing:.7px;font-weight:700;margin-bottom:4px">&#128203; Registrado por</div>
       <div style="font-size:12px;color:var(--tx3)">Sin registro disponible</div>`;
  document.body.appendChild(popup);
  const rect = td.getBoundingClientRect();
  let top = rect.bottom + 6, left = rect.left + rect.width/2 - popup.offsetWidth/2;
  if(top + popup.offsetHeight > window.innerHeight - 10) top = rect.top - popup.offsetHeight - 6;
  left = Math.max(8, Math.min(left, window.innerWidth - popup.offsetWidth - 8));
  popup.style.top = top+'px'; popup.style.left = left+'px';
  _docPopupTimer = setTimeout(()=>popup.remove(), 4000);
  const cerrar = e=>{ if(!td.contains(e.target)&&!popup.contains(e.target)){popup.remove();document.removeEventListener('click',cerrar);}};
  setTimeout(()=>document.addEventListener('click',cerrar), 50);
}

