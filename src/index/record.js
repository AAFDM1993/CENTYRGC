// ── record.js: modal de registro de notas global + irAHC ───────────────────
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)
//             session.js (session, hojaActiva, hojaData)
//             api.js (apiPost, apiGetCached, invalidateCache)

// ── MODAL RECORD ─────────────────────────────────────────────
let _recCursos=null, _recData=null, _recTabActivo='', _recGlobal=null, _recStudentCourses=null, _recCicloMap={};
const _CICLOS=[
  {key:'V',   label:'V Ciclo',    re:/TF-?5\d{2}/i},
  {key:'VI',  label:'VI Ciclo',   re:/TF-?6\d{2}/i},
  {key:'VII', label:'VII Ciclo',  re:/TF-?7\d{2}/i},
  {key:'VIII',label:'VIII Ciclo', re:/TF-?8\d{2}/i},
  {key:'otro',label:'Otros',      re:null}
];

function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Ciclo: usa _recCicloMap (mapa dedicado, siempre actualizado), luego regex como fallback
function _recCiclo(nombre){
  var asignado=_recCicloMap[nombre]||'';
  if(asignado) return asignado;
  for(var _i=0;_i<_CICLOS.length;_i++){if(_CICLOS[_i].re&&_CICLOS[_i].re.test(nombre))return _CICLOS[_i].key;}
  return 'otro';
}

function _recCloseOnOv(e){if(e.target===g('recordModalOv'))cerrarRecordPanel();}

function abrirRecordPanel(){
  g('recordModalOv').classList.add('show');
  var esAlumno=session&&session.rol==='estudiante';
  if(!_recCursos||!_recData){
    _recCargar();
  }else{
    _recRenderGlobal();
    if(esAlumno) _recRenderEstudiante(_recStudentCourses||[]);
    else _recRenderTabs();
  }
}

function cerrarRecordPanel(){
  g('recordModalOv').classList.remove('show');
}

async function _recCargar(){
  g('recModalBody').innerHTML='<div class="empty">Cargando...</div>';
  g('recTabs').innerHTML='';
  g('recGlobalSection').innerHTML='';
  var esAlumno=session&&session.rol==='estudiante';
  try{
    var promesas=[
      apiGetCached('listarCursosTodos'),
      apiGetCached('leerRecordsCursos'),
      apiGetCached('leerRecordInfo')
    ];
    if(esAlumno) promesas.push(apiGetCached('misNotas',{codigo:session.codigo}));
    var res=await Promise.all(promesas);
    var rC=res[0],rD=res[1],rG=res[2],rN=res[3];
    if(!rC.ok) throw new Error(rC.error||'Error al listar cursos');
    _recCursos=rC.cursos||[];
    _recData=(rD.ok&&rD.data)||{};
    _recGlobal=(rG.ok&&rG)||{pdfUrl:''};
    // Poblar _recCicloMap: 1) desde backend, 2) fusionar con localStorage como respaldo
    _recCicloMap={};
    Object.keys(_recData).forEach(function(cu){
      if(_recData[cu]&&_recData[cu].ciclo) _recCicloMap[cu]=_recData[cu].ciclo;
    });
    try{
      var lsMap=JSON.parse(localStorage.getItem('_centyr_ciclos')||'{}');
      Object.keys(lsMap).forEach(function(cu){
        if(lsMap[cu]&&!_recCicloMap[cu]) _recCicloMap[cu]=lsMap[cu];
      });
    }catch(e){}
    _recRenderGlobal();
    if(esAlumno){
      _recStudentCourses=[];
      ((rN&&rN.ok&&rN.resultados)||[]).forEach(function(h){
        (h.cursos||[]).forEach(function(cu){
          if(cu.nombre&&_recStudentCourses.indexOf(cu.nombre)===-1)
            _recStudentCourses.push(cu.nombre);
        });
      });
      _recRenderEstudiante(_recStudentCourses);
    }else{
      var ciclosConCursos=_CICLOS.filter(function(c){
        return _recCursos.some(function(cu){return _recCiclo(cu)===c.key;});
      });
      var tabsValidos=ciclosConCursos.map(function(c){return c.key;});
      if(!_recTabActivo||tabsValidos.indexOf(_recTabActivo)===-1){
        _recTabActivo=ciclosConCursos.length?ciclosConCursos[0].key:'otro';
      }
      _recRenderTabs();
    }
  }catch(e){
    g('recModalBody').innerHTML='<div class="hint"><span>&#9888;</span><span>Error: '+_esc(e.message)+'</span></div>';
  }
}

function _recRenderTabs(){
  const tabsEl=g('recTabs');
  const ciclosConCursos=_CICLOS.filter(c=>_recCursos.some(cu=>_recCiclo(cu)===c.key));
  if(!ciclosConCursos.length){
    tabsEl.innerHTML='';
    g('recModalBody').innerHTML='<div class="hint-b"><span>&#9432;</span><span>No hay cursos en las planillas todav&iacute;a.</span></div>';
    return;
  }
  tabsEl.innerHTML=ciclosConCursos.map(c=>
    `<button class="rec-tab${_recTabActivo===c.key?' on':''}" onclick="_recSelTab('${c.key}')">${_esc(c.label)}</button>`
  ).join('');
  _recRenderCiclo(_recTabActivo);
}

function _recSelTab(key){
  _recTabActivo=key;
  g('recTabs').querySelectorAll('.rec-tab').forEach(t=>{
    const c=_CICLOS.find(x=>x.key===key);
    t.classList.toggle('on',c&&t.textContent.trim()===c.label);
  });
  _recRenderCiclo(key);
}

// Índice global para mapear idx → nombre de curso (evita pasar strings en onclick)
let _recCursosActivos=[];

function _recRenderEstudiante(studentCourses){
  g('recTabs').innerHTML=''; // sin tabs para alumnos
  var body=g('recModalBody');

  // Mostrar todos los cursos del alumno (de misNotas), con o sin record configurado
  var misCursos=studentCourses||[];

  if(!misCursos.length){
    body.innerHTML='<div class="hint-b"><span>&#9432;</span><span>A&uacute;n no est&aacute;s inscrito en ninguna planilla. Contacta al administrador.</span></div>';
    return;
  }

  var html='';
  misCursos.forEach(function(cu){
    var d=_recData[cu]||{};
    var pac=String(d.pacientes||'');
    var cons=String(d.consideraciones||'');
    var cicloKey=_recCiclo(cu);
    var cicloLabel=(_CICLOS.find(function(c){return c.key===cicloKey;})||{}).label||'';

    var consDisplay=cons
      ?'<div class="rec-block"><div class="rec-block-lbl">&#128203; Consideraciones</div>'
        +'<div class="rec-block-text">'+_esc(cons)+'</div></div>'
      :'';

    html+='<div class="rec-curso-card">';
    html+='<div class="rec-curso-card-hdr">'
      +'<div class="rec-curso-name">&#128218; '+_esc(cu)+'</div>'
      +(cicloLabel?'<div class="rec-curso-ciclo-pill">'+_esc(cicloLabel)+'</div>':'')
      +'</div>';
    html+='<div class="rec-curso-body">';
    html+='<div class="rec-stat-row">'
      +'<div class="rec-stat-ico">&#128101;</div>'
      +'<div><div class="rec-stat-val">'+(pac||'&mdash;')+'</div>'
      +'<div class="rec-stat-lbl">Pacientes requeridos</div></div></div>';
    html+=consDisplay;
    html+='</div></div>';
    // Sin .rec-edit-section — alumno es solo lectura
  });
  body.innerHTML=html;
}

function _recRenderGlobal(){
  var sec=g('recGlobalSection');
  if(!sec)return;
  var pdfUrl=String((_recGlobal&&_recGlobal.pdfUrl)||'');

  // Botón PDF — siempre visible para todos
  var pdfBtn=pdfUrl
    ?'<a href="'+_esc(pdfUrl)+'" target="_blank" rel="noopener" class="rec-pdf-btn" style="margin-bottom:10px">'
        +'<span class="rec-pdf-ico">&#128196;</span><span>Descargar Reglamento CENTYR (PDF)</span></a>'
    :'<div class="rec-pdf-btn disabled" style="margin-bottom:10px">'
        +'<span class="rec-pdf-ico">&#128196;</span><span>Reglamento PDF (URL no configurada)</span></div>';

  // Bloque de edición — siempre en HTML, visible solo para admin via CSS
  var adminEdit='<div class="rec-global-admin-edit">'
    +'<div style="display:flex;gap:8px;align-items:center">'
      +'<input class="inp" id="recGlobalPdfInput" type="url" value="'+_esc(pdfUrl)+'" placeholder="URL del Reglamento PDF..." style="flex:1;font-size:13px">'
      +'<button class="btn-sm green" onclick="_recGuardarGlobal()" style="flex-shrink:0;white-space:nowrap">&#10003; Guardar URL</button>'
    +'</div>'
    +'<div id="recGlobalRes" style="font-size:12px;margin-top:4px;display:none"></div>'
  +'</div>';

  sec.innerHTML=pdfBtn+adminEdit;
}

async function _recGuardarGlobal(){
  if(!session||session.rol!=='admin'){toast('Sin permisos','Solo el administrador puede guardar','err');return;}
  var url=(g('recGlobalPdfInput')||{}).value||'';
  var res=g('recGlobalRes');
  if(res)res.style.display='none';
  showLoader('Guardando URL...');
  try{
    var r=await apiPost({action:'guardarRecordInfo',pdfUrl:url});
    hideLoader();
    if(r.ok){
      invalidateCache('leerRecordInfo');
      if(!_recGlobal)_recGlobal={};
      _recGlobal.pdfUrl=url;
      _recRenderGlobal();
      toast('URL guardada','El reglamento PDF fue actualizado','ok');
    }else{
      if(res){res.style.display='block';res.style.color='var(--red)';res.textContent='Error: '+(r.error||'?');}
    }
  }catch(e){
    hideLoader();
    if(res){res.style.display='block';res.style.color='var(--red)';res.textContent='Error: '+e.message;}
  }
}

function _recRenderCiclo(cicloKey){
  var body=g('recModalBody');
  var cicloLabel=(_CICLOS.find(function(c){return c.key===cicloKey;})||{}).label||cicloKey;
  _recCursosActivos=_recCursos.filter(function(cu){return _recCiclo(cu)===cicloKey;});

  if(!_recCursosActivos.length){
    body.innerHTML='<div class="hint-b"><span>&#9432;</span><span>Sin cursos en este ciclo.</span></div>';
    return;
  }

  var html='';
  for(var i=0;i<_recCursosActivos.length;i++){
    var cu=_recCursosActivos[i];
    var d=_recData[cu]||{};
    var pac=String(d.pacientes||'');
    var cons=String(d.consideraciones||'');
    var cicloSaved=String(d.ciclo||'');

    // Opciones del select de ciclo
    var cicloOpts='';
    for(var ci=0;ci<_CICLOS.length;ci++){
      var sel=cicloSaved===_CICLOS[ci].key?' selected':'';
      cicloOpts+='<option value="'+_CICLOS[ci].key+'"'+sel+'>'+_esc(_CICLOS[ci].label)+'</option>';
    }

    var consDisplay=cons
      ?'<div class="rec-block"><div class="rec-block-lbl">&#128203; Consideraciones</div><div class="rec-block-text">'+_esc(cons)+'</div></div>'
      :'';

    // Tarjeta info (solo lectura)
    html+='<div class="rec-curso-card">';
    html+='<div class="rec-curso-card-hdr">'
      +'<div class="rec-curso-name">&#128218; '+_esc(cu)+'</div>'
      +'<div class="rec-curso-ciclo-pill">'+_esc(cicloLabel)+'</div>'
      +'</div>';
    html+='<div class="rec-curso-body">';
    html+='<div class="rec-stat-row">'
      +'<div class="rec-stat-ico">&#128101;</div>'
      +'<div><div class="rec-stat-val">'+(pac||'&mdash;')+'</div>'
      +'<div class="rec-stat-lbl">Pacientes requeridos</div></div></div>';
    html+=consDisplay;
    html+='</div></div>';// cierra rec-curso-body y rec-curso-card

    // Sección de edición — SIEMPRE visible, fuera de la tarjeta
    html+='<div class="rec-edit-section">';
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:12px">&#9998; Configurar: '+_esc(cu)+'</div>';
    html+='<div class="field" style="margin-bottom:8px"><label>Ciclo</label>'
      +'<select class="sel" id="rp_ciclo_'+i+'">'+cicloOpts+'</select></div>';
    html+='<div class="field" style="margin-bottom:8px"><label>Pacientes requeridos</label>'
      +'<input class="inp" id="rp_pac_'+i+'" type="number" min="0" value="'+_esc(pac)+'" placeholder="Ej: 25"></div>';
    html+='<div class="field" style="margin-bottom:10px"><label>Consideraciones generales</label>'
      +'<textarea class="inp" id="rp_cons_'+i+'" rows="3" style="resize:vertical;min-height:72px" placeholder="Ingresa las consideraciones...">'+_esc(cons)+'</textarea></div>';
    html+='<button class="btn-sm green" data-rec-idx="'+i+'" onclick="_recGuardar(this)" style="width:100%">&#10003; Guardar</button>';
    html+='<div id="recRes_'+i+'" style="font-size:12px;margin-top:6px;display:none"></div>';
    html+='</div>';// cierra rec-edit-section
  }
  body.innerHTML=html;
}

async function _recGuardar(btn){
  if(!session||session.rol!=='admin'){toast('Sin permisos','Solo el administrador puede guardar','err');return;}
  const idx=parseInt(btn.dataset.recIdx,10);
  const curso=_recCursosActivos[idx];
  if(!curso)return;
  const pac=(g('rp_pac_'+idx)||{}).value||'';
  const cons=(g('rp_cons_'+idx)||{}).value||'';
  const ciclo=(g('rp_ciclo_'+idx)||{}).value||'';
  const res=g('recRes_'+idx);
  if(res)res.style.display='none';
  showLoader('Guardando...');
  try{
    const r=await apiPost({action:'guardarRecordCurso',curso,pacientes:pac,consideraciones:cons,ciclo});
    hideLoader();
    if(r.ok){
      invalidateCache('leerRecordsCursos');
      // Actualizar _recData y _recCicloMap en memoria
      if(!_recData[curso])_recData[curso]={};
      _recData[curso].pacientes=pac;
      _recData[curso].consideraciones=cons;
      _recData[curso].ciclo=ciclo;
      // Actualizar _recCicloMap en memoria
      if(ciclo) _recCicloMap[curso]=ciclo; else delete _recCicloMap[curso];
      // Guardar en localStorage como respaldo persistente
      try{
        var lsMap=JSON.parse(localStorage.getItem('_centyr_ciclos')||'{}');
        if(ciclo) lsMap[curso]=ciclo; else delete lsMap[curso];
        localStorage.setItem('_centyr_ciclos',JSON.stringify(lsMap));
      }catch(e){}
      // Navegar al tab del ciclo guardado
      if(ciclo) _recTabActivo=ciclo;
      _recRenderTabs();
      var cicloLabel=(_CICLOS.find(function(c){return c.key===ciclo;})||{}).label||ciclo;
      toast('Guardado','Asignado a '+cicloLabel,'ok');
    }else{
      if(res){res.style.display='block';res.style.color='var(--red)';res.textContent='Error: '+(r.error||'?');}
    }
  }catch(e){hideLoader();if(res){res.style.display='block';res.style.color='var(--red)';res.textContent='Error: '+e.message;}}
}

function irAHC(){
  if(!session) return;
  // Mostrar overlay de carga
  var ov=document.createElement('div');
  ov.id='hcLoadingOverlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.82);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(6px)';
  ov.innerHTML='<div style="width:48px;height:48px;border:4px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:hcSpin .8s linear infinite"></div>'
    +'<div style="color:#fff;font-size:15px;font-weight:600">Cargando m\u00F3dulo de Historias Cl\u00EDnicas...</div>'
    +'<div style="color:rgba(255,255,255,.5);font-size:12px">Por favor espere</div>';
  if(!document.getElementById('hcSpinStyle')){
    var st=document.createElement('style');
    st.id='hcSpinStyle';
    st.textContent='@keyframes hcSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }
  document.body.appendChild(ov);
  var cred='';
  try{cred=sessionStorage.getItem('_hcCred')||'';}catch(e){}
  var url='hc.html'
    +'?rol='+encodeURIComponent(session.rol)
    +'&nombre='+encodeURIComponent(session.nombre||session.codigo)
    +'&codigo='+encodeURIComponent(session.codigo)
    +(cred?'&cred='+encodeURIComponent(cred):'');
  var w=window.open(url,'_blank');
  // Quitar overlay después de 2.5s (tiempo suficiente para que abra)
  setTimeout(function(){
    var el=document.getElementById('hcLoadingOverlay');
    if(el){el.style.opacity='0';el.style.transition='opacity .4s';setTimeout(function(){el.remove();},400);}
  },2500);
}
