// ── alumnos.js: bootstrap de app + gestión de alumnos y cursos ──────────────
// Depende de: core.js (g, vi, esc, esc2, toast, showLoader, hideLoader, confirmDialog)
//             session.js (session, alumnos, cursos, drawerIdx, hojaActiva, hojaData,
//                         saveTimers, saveSession, loadSession, clearSession)
//             api.js (apiGet, apiPost, apiGetCached, invalidateCache)
// Carga siguiente: notas.js (loadHojas, renderAlBlock, etc.)

window.onload=function(){
  initTheme();
  // Migrar sesión legacy de sessionStorage si existe
  const legacy=sessionStorage.getItem('ft_session');
  if(legacy){try{const d=JSON.parse(legacy);saveSession(d);sessionStorage.removeItem('ft_session')}catch(e){}}
  const saved=loadSession();
  if(saved){session=saved;startApp();return;}
  g('loginPage').style.display='flex';
};

// Adaptación responsive al rotar pantalla
window.addEventListener('resize', function(){
  if (!session || session.rol !== 'estudiante') return;
  var bn = g('estBottomNav');
  if (bn) bn.style.display = window.innerWidth < 768 ? 'flex' : 'none';
});

async function doLogin(){
  const code=vi('lgCode').trim().toLowerCase(),pass=vi('lgPass').trim();
  if(!code||!pass){lgErr('Completa codigo y contrasena');return}
  if(!GAS_URL||GAS_URL.indexOf('PEGA_AQUI')>=0){lgErr('Configura GAS_URL en el HTML');return}
  showLoader('Verificando...');
  try{
    const r=await apiGet('login',{codigo:code,password:pass});
    hideLoader();
    if(!r.ok){lgErr(r.error||'Error de autenticacion');return}
    session={token:r.token,rol:r.rol,nombre:r.nombre,codigo:code};
    saveSession(session);
    // Guardar cred temporalmente solo para abrir HC en la misma sesión
    try{sessionStorage.setItem('_hcCred',btoa(code+':'+pass));}catch(e){}
    startApp();
  }catch(e){hideLoader();lgErr('Error: '+e.message)}
}
function lgErr(m){const el=g('lgErr');el.textContent=m;el.classList.add('show')}
function logout(){
  session=null;clearSession();try{sessionStorage.removeItem('_hcCred');}catch(e){}hojaActiva=null;hojaData=null;
  g('appPage').style.display='none';g('loginPage').style.display='flex';
  g('lgCode').value='';g('lgPass').value='';g('lgErr').classList.remove('show');
}
function startApp(){
  g('loginPage').style.display='none';g('appPage').style.display='block';
  const rl={admin:'Admin',docente:'Docente',estudiante:'Estudiante',recepcion:'Recepción'};
  g('rolLabel').textContent=rl[session.rol]||session.rol;
  g('rolDot').className='rdot '+session.rol;
  pingConn();
  if(session.rol==='estudiante'){
    g('viewAdmin').style.display='none';
    g('viewEstudiante').style.display='block';
    iniciarVistaEstudiante();
  } else if(session.rol==='recepcion'){
    g('viewAdmin').style.display='none';
    g('viewEstudiante').style.display='none';
    iniciarVistaRecepcion();
  } else {
    g('viewAdmin').style.display='block';
    g('viewEstudiante').style.display='none';
    iniciarVistaAdmin();
  }
  initSidebar(session.rol);
}
async function pingConn(){
  try{const r=await apiGet('ping');setConn(r.ok,r.ok?'Conectado':'Sin respuesta')}
  catch(e){setConn(false,e.message)}
}
function setConn(ok,msg){
  g('cdot').className='dot '+(ok?'ok':'err');g('clabel').textContent=ok?'Conectado':'Error';
  g('cpill').className='cpill '+(ok?'ok':'');
  const h=g('connHint');if(!h)return;
  h.className=ok?'hint-b':'hint';
  h.innerHTML='<span>'+(ok?'OK':'!')+'</span><span>'+msg+'</span>';
}
function iniciarVistaAdmin(){
  const esA=session.rol==='admin';
  const esD=session.rol==='docente';
  document.body.className=(document.body.className||'').replace(/\brol-\S+/g,'').trim()+' rol-'+session.rol;
  // Ambos roles: ocultar sidebar completamente, mostrar topbar
  hideSidebar();
  if(g('docenteTopbar'))g('docenteTopbar').style.display='block';

  if(esA){
    g('btnGen').disabled=false;
    // Mostrar botones de admin en el topbar
    ['adminOnlyBtns'].forEach(id=>{const el=g(id);if(el)el.style.display='flex';});
    renderCursos();renderPreview();cargarUsuarios();initGenSections();
    var cap=g('casAdminPanel');if(cap)cap.style.display='';
  } else {
    // Docente: solo hojas y agenda, sin acceso a paneles de admin
    if(g('btnGen'))g('btnGen').style.display='none';
    ['adminOnlyBtns'].forEach(id=>{const el=g(id);if(el)el.style.display='none';});
    const uz=g('uploadZone');if(uz)uz.style.display='none';
    // Ocultar también el panelCard y prevCard
    if(g('panelCard'))g('panelCard').style.display='none';
    if(g('prevCard'))g('prevCard').style.display='none';
    var cap2=g('casAdminPanel');if(cap2)cap2.style.display='none';
  }
  loadHojas();
}
function showTab(tid,btn){
  if(tid==='ho')loadHojas();
  if(tid==='cas')cargarCasilleros();
  if(tid==='us')cargarUsuarios();
  if(tid==='pdf')cargarHojasExport();
  if(tid==='log')cargarLog();
  if(tid==='cal'){iniciarAgenda();setTimeout(cargarListaReservas,600);}
}
function openDrawer(i){
  drawerIdx=i;const a=alumnos[i];
  g('drawerTitle').textContent=a.name;g('drawerSub').textContent='Codigo: '+(a.code||'-');
  renderDrawerChecks();
  g('drawer-overlay').classList.add('show');g('drawer').classList.add('open');
}
function closeDrawer(){g('drawer-overlay').classList.remove('show');g('drawer').classList.remove('open');drawerIdx=-1}
function renderDrawerChecks(){
  const box=g('drawerChecks'),activos=cursos.filter(c=>c.on);
  if(!activos.length){box.innerHTML='<div style="color:var(--tx4);font-size:13px;font-style:italic">Sin cursos configurados</div>';return}
  if(drawerIdx<0)return;
  const a=alumnos[drawerIdx];
  box.innerHTML=activos.map(c=>{
    const on=a.cursos[c.label]===true;
    return `<div class="cck ${on?'on':''}" onclick="toggleDrawerCurso('${esc(c.label)}')"><div class="ck">${on?'v':' '}</div><span>${c.label}</span></div>`;
  }).join('');
}
function toggleDrawerCurso(lbl){
  if(drawerIdx<0)return;alumnos[drawerIdx].cursos[lbl]=!alumnos[drawerIdx].cursos[lbl];
  renderDrawerChecks();updBadge(drawerIdx);renderPreview();
}
function updBadge(i){
  const a=alumnos[i],activos=cursos.filter(c=>c.on);
  const n=activos.filter(c=>a.cursos[c.label]===true).length;
  const el=g('albadge_'+i);
  if(el){el.textContent=n+'/'+activos.length+' cursos';el.className='al-badge '+(n===0?'none':'')}
}
function makeAlumno(code,name){const c={};cursos.forEach(cu=>{c[cu.label]=false});return{code,name,cursos:c}}

// ── PANEL GENERADOR: secciones colapsables ──────────────
function toggleGenSection(id){
  var body = document.getElementById(id);
  if(!body) return;
  var isOpen = !body.classList.contains('collapsed');
  var arrow = document.getElementById('arrow' + id.charAt(0).toUpperCase() + id.slice(1));
  if(isOpen){
    body.classList.add('collapsed');
    if(arrow) arrow.classList.remove('open');
  } else {
    body.classList.remove('collapsed');
    if(arrow) arrow.classList.add('open');
  }
}

// Inicializar secciones abiertas
function initGenSections(){
  ['secAlumnos','secCursos','secConfig'].forEach(function(id){
    var body = document.getElementById(id);
    var arrow = document.getElementById('arrow' + id.charAt(0).toUpperCase() + id.slice(1));
    if(body) body.classList.remove('collapsed');
    if(arrow) arrow.classList.add('open');
  });
}

function loadCSV(e){ loadCSVMulti(e); }

function loadCSVMulti(e){
  var files=Array.from(e.target.files||[]);
  if(!files.length)return;
  var pendiente=files.length,totalN=0;
  function done(){ pendiente--; if(pendiente===0){renderAlumnos();renderPreview();toast(totalN+' alumnos importados (sin duplicados)','','ok');} }
  files.forEach(function(file){
    var ext=file.name.split('.').pop().toLowerCase();
    if(ext==='xlsx'||ext==='xls'){
      var r=new FileReader();
      r.onload=function(ev){
        try{
          var wb=XLSX.read(ev.target.result,{type:'array'});
          var ws=wb.Sheets[wb.SheetNames[0]];
          var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          totalN+=importarFilas_(rows.map(function(row){return row.map(function(x){return String(x);});}));
        }catch(ex){toast('Error XLSX: '+file.name,ex.message,'err');}
        done();
      };
      r.readAsArrayBuffer(file);
    } else {
      var r2=new FileReader();
      r2.onload=function(ev){
        var lines=ev.target.result.split('\n').filter(function(l){return l.trim();});
        totalN+=importarFilas_(lines.map(function(l){return parsearLineaCSV_(l);}));
        done();
      };
      r2.readAsText(file,'UTF-8');
    }
  });
  e.target.value='';
}

function parsearLineaCSV_(linea){
  // Detectar separador principal: tab > punto y coma > coma
  var sep = linea.indexOf('\t')!==-1 ? '\t' : linea.indexOf(';')!==-1 ? ';' : ',';
  if(sep !== ',') return linea.split(sep).map(function(x){return x.trim();});
  // Con coma: primera col podría ser código numérico
  var partes = linea.split(',').map(function(x){return x.trim();});
  if(partes.length<=1) return partes;
  // Si primera parte es numérica (código de alumno)
  if(/^\d+$/.test(partes[0])||partes[0].length<=10){
    // código + nombre (puede tener comas) + código_curso (último si parece código corto)
    var codigo = partes[0];
    // El último elemento podría ser código de curso (corto, sin espacios, alfanumérico)
    var ultimo = partes[partes.length-1];
    var esCodCurso = partes.length>2 && /^[A-Z0-9\-]{2,15}$/i.test(ultimo) && ultimo.indexOf(' ')===-1;
    if(esCodCurso){
      var nombre = partes.slice(1, partes.length-1).join(',').trim();
      return [codigo, nombre, ultimo];
    } else {
      var nombre = partes.slice(1).join(',').trim();
      return [codigo, nombre];
    }
  } else {
    // Sin código: todo es el nombre (puede tener comas: "APELLIDO, NOMBRE")
    // Si último elemento parece código de curso
    var ultimo = partes[partes.length-1];
    var esCodCurso = partes.length>1 && /^[A-Z0-9\-]{2,15}$/i.test(ultimo) && ultimo.indexOf(' ')===-1;
    if(esCodCurso){
      var nombre = partes.slice(0, partes.length-1).join(',').trim();
      return ['', nombre, ultimo];
    } else {
      return ['', partes.join(',').trim()];
    }
  }
}

function importarFilas_(rows){
  var n=0;
  rows.forEach(function(p){
    if(!p||p.length<1)return;
    var code='',name='',codigoCurso='';
    if(p.length>=3){
      var c0=String(p[0]).trim(),c1=String(p[1]).trim(),c2=String(p[2]).trim();
      if(/^\d+$/.test(c0)||c0.length<=10){ code=c0; name=c1; codigoCurso=c2.toUpperCase(); }
      else { name=c0+' '+c1; codigoCurso=c2.toUpperCase(); }
    } else if(p.length>=2){
      var c0=String(p[0]).trim(),c1=String(p[1]).trim();
      if(/^\d+$/.test(c0)||c0.length<=10){code=c0;name=c1;}
      else{name=c0+' '+c1;}
    } else { name=String(p[0]).trim(); }
    name=name.trim();
    if(!name||name.toLowerCase()==='nombre'||name.toLowerCase()==='apellidos y nombres'||name.toLowerCase()==='apellidos'||name==='-')return;
    var nameNorm=name.toLowerCase().normalize('NFC');
    // Si ya existe, solo activar el curso si hay código
    var existente=alumnos.find(function(a){return a.name.toLowerCase().normalize('NFC')===nameNorm;});
    if(existente){
      if(codigoCurso){
        var cu=cursos.find(function(x){return x.codigo===codigoCurso;});
        if(cu) existente.cursos[cu.label]=true;
      }
      return;
    }
    var al=makeAlumno(code,name);
    if(codigoCurso){
      var cu=cursos.find(function(x){return x.codigo===codigoCurso;});
      if(cu) al.cursos[cu.label]=true;
    }
    alumnos.push(al); n++;
  });
  return n;
}function addAlumno(){
  const code=vi('mCode').trim(),name=vi('mName').trim();if(!name)return;
  const nn=name.toLowerCase().normalize('NFC');
  if(alumnos.some(function(a){return a.name.toLowerCase().normalize('NFC')===nn;})){
    toast('Duplicado','Ya existe: '+name,'warn');return;
  }
  alumnos.push(makeAlumno(code,name));g('mCode').value='';g('mName').value='';
  renderAlumnos();renderPreview();g('mCode').focus();
}
function remAlumno(i){alumnos.splice(i,1);renderAlumnos();renderPreview()}
function clearAlumnos(){if(!alumnos.length)return;confirmDialog('Limpiar lista?').then(function(ok){if(!ok)return;alumnos=[];renderAlumnos();renderPreview()})}
function renderAlumnos(){
  var list=g('slist'), activos=cursos.filter(function(c){return c.on;});
  if(!alumnos.length){list.innerHTML='<div class="empty">Sin alumnos</div>';}
  else list.innerHTML=alumnos.map(function(a,i){
    var chks='';
    if(activos.length){
      chks='<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-left:auto">'+
        activos.map(function(cu){
          var checked=a.cursos[cu.label]===true;
          var lbl=(cu.codigo?cu.codigo+' ':'')+( cu.label.length>14?cu.label.substring(0,14)+'…':cu.label);
          return '<label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:var(--tx3);cursor:pointer;white-space:nowrap">'+
            '<input type="checkbox" class="al-curso-chk"'+(checked?' checked':'')
            +' data-ai="'+i+'" data-label="'+cu.label.replace(/"/g,'&quot;')+'"'
            +' style="accent-color:var(--n500);width:13px;height:13px;cursor:pointer">'+lbl+'</label>';
        }).join('')+
      '</div>';
    }
    return '<div class="al-row" style="flex-wrap:wrap;gap:4px;align-items:center">'+
      '<span class="sn">'+(i+1)+'</span>'+
      '<span class="sname">'+a.name+'</span>'+
      '<span class="scode">'+(a.code||'-')+'</span>'+
      chks+
      '<button class="sdel" onclick="remAlumno('+i+')">x</button>'+
      '</div>';
  }).join('');
  // Delegar eventos de checkbox
  list.querySelectorAll('.al-curso-chk').forEach(function(chk){
    chk.addEventListener('change',function(){
      var ai=parseInt(this.getAttribute('data-ai'));
      var label=this.getAttribute('data-label');
      if(alumnos[ai]) alumnos[ai].cursos[label]=this.checked;
      renderPreview();
    });
  });
  g('scnt').textContent=alumnos.length+' alumno'+(alumnos.length!==1?'s':'');
  g('prevBadge').textContent=alumnos.length+' alumnos';
  var cnt=g('secAlumnosCount');if(cnt)cnt.textContent=alumnos.length+' alumnos';
  var btn=g('btnGen');if(btn)btn.disabled=!(alumnos.length>0&&cursos.filter(function(cx){return cx.on;}).length>0);
}
function renderCursos(){
  const el=g('crsList');if(!el)return;
  var btn=g('btnGen');if(btn)btn.disabled=!(alumnos.length>0&&cursos.filter(function(cx){return cx.on;}).length>0);
  if(!cursos.length){el.innerHTML='<div class="empty" style="padding:8px">Agrega cursos abajo</div>';return}
  var cntEl=g('secCursosCount');if(cntEl){var act=cursos.filter(function(x){return x.on;}).length;cntEl.textContent=cursos.length+' cursos ('+act+' activos)';}
  el.innerHTML=cursos.map((c,ci)=>{
    const sh=c.subgrupos.length?c.subgrupos.map((sg,si)=>renderSgrCard(ci,si,sg)).join(''):'<div style="font-size:11px;color:var(--tx4);padding:4px 0">Sin subgrupos</div>';
    return `<div class="crs-item ${c.on?'on':''}" id="crsitem_${ci}">
      <div class="crs-header"><div class="crs-chk" onclick="toggleCurso(${ci})">${c.on?'v':' '}</div><span class="crs-label" onclick="toggleCursoExpand(${ci})">${c.label}</span>${c.codigo?'<span style="font-size:10px;font-weight:800;background:var(--n700);color:var(--n300);border-radius:5px;padding:2px 6px;margin-left:4px">'+c.codigo+'</span>':''}<span class="crs-arrow" onclick="toggleCursoExpand(${ci})">&#9658;</span><button class="crs-del" onclick="delCurso(${ci})">&#128465;</button></div>
      <div class="crs-body" id="crsbody_${ci}"><div class="sgr-lbl">Subgrupos</div><div class="sgr-list" id="sgrlist_${ci}">${sh}</div><button class="add-sgr-btn" onclick="addSubgrupo(${ci})">+ Agregar subgrupo</button></div>
    </div>`;
  }).join('');
}
function renderSgrCard(ci,si,sg){
  const pac   = sg.numPacientes||1;
  const base  = sg.notasBase||15;
  const total = base + (sg.notasExtra||0);
  const inpStyle = 'width:100%;border:1px solid var(--bd);border-radius:8px;padding:6px 8px;font-size:14px;font-family:\'DM Mono\',monospace;font-weight:800;outline:none;text-align:center;background:#fff;';
  const lblStyle = 'font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.6px;display:block;margin-bottom:4px;';
  return `<div class="sgr-card">
    <div class="sgr-card-top">
      <input class="sgr-name-inp" value="${esc2(sg.nombre)}" placeholder="Nombre subgrupo" oninput="updateSgrNombre(${ci},${si},this.value)">
      <button class="sgr-del" onclick="delSubgrupo(${ci},${si})">&#128465;</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
      <div>
        <label style="${lblStyle}">Pacientes</label>
        <input type="number" min="1" max="20" value="${pac}"
          style="${inpStyle}"
          oninput="setSgrVal(${ci},${si},'numPacientes',+this.value)">
      </div>
      <div>
        <label style="${lblStyle}">Atenc. mínimas</label>
        <input type="number" min="1" max="50" value="${base}"
          style="${inpStyle}"
          oninput="setSgrValBase(${ci},${si},+this.value,+this.closest('.sgr-card').querySelector('[data-total]').value)">
      </div>
      <div>
        <label style="${lblStyle}">Atenc. continuación</label>
        <input type="number" min="1" max="100" value="${total}" data-total
          style="${inpStyle}"
          oninput="setSgrValTotal(${ci},${si},+this.closest('.sgr-card').querySelectorAll('input[type=number]')[1].value||${base},+this.value)">
      </div>
    </div>
  </div>`;
}
function toggleCurso(ci){cursos[ci].on=!cursos[ci].on;renderCursos();renderAlumnos();renderPreview()}
function toggleCursoExpand(ci){const el=g('crsitem_'+ci);if(el)el.classList.toggle('expanded')}
function addCurso(){
  const inp=g('newCrs'), inpCod=g('newCrsCod');
  const name=inp.value.trim(); if(!name)return;
  const codigo=inpCod?inpCod.value.trim().toUpperCase():'';
  if(cursos.find(function(c){return c.label===name;})){toast('Ya existe ese curso','','warn');return;}
  if(codigo && cursos.find(function(c){return c.codigo===codigo;})){toast('Ya existe ese código','','warn');return;}
  cursos.push({label:name, codigo:codigo, on:true, subgrupos:[{nombre:'Subgrupo 1',notasBase:15,notasExtra:0,numPacientes:5}]});
  inp.value=''; if(inpCod) inpCod.value='';
  renderCursos();renderAlumnos();renderPreview();
}
function delCurso(ci){confirmDialog(`Eliminar "${cursos[ci].label}"?`).then(function(ok){if(!ok)return;cursos.splice(ci,1);renderCursos();renderAlumnos();renderPreview()})}
function addSubgrupo(ci){const n=cursos[ci].subgrupos.length+1;cursos[ci].subgrupos.push({nombre:'Subgrupo '+n,notasBase:15,notasExtra:0,numPacientes:5});renderSgrList(ci);renderPreview()}
function delSubgrupo(ci,si){cursos[ci].subgrupos.splice(si,1);renderSgrList(ci);renderPreview()}
function renderSgrList(ci){const el=g('sgrlist_'+ci);if(!el)return;el.innerHTML=cursos[ci].subgrupos.length?cursos[ci].subgrupos.map((sg,si)=>renderSgrCard(ci,si,sg)).join(''):'<div style="font-size:11px;color:var(--tx4)">Sin subgrupos</div>'}
function updateSgrNombre(ci,si,val){cursos[ci].subgrupos[si].nombre=val;renderPreview()}
function changeSgr(ci,si,field,delta){
  if(!cursos[ci]||!cursos[ci].subgrupos[si])return;
  var sg=cursos[ci].subgrupos[si];
  var min=field==='notasExtra'?0:1;
  sg[field]=Math.max(min,(sg[field]||0)+delta);
  renderCursos();renderPreview();
}

function setSgrVal(ci,si,field,val){
  if(!cursos[ci]||!cursos[ci].subgrupos[si])return;
  var v=isNaN(val)?1:Math.max(1,Math.round(val));
  cursos[ci].subgrupos[si][field]=v;
  renderPreview();
}

function setSgrValBase(ci,si,base,total){
  if(!cursos[ci]||!cursos[ci].subgrupos[si])return;
  base=isNaN(base)?1:Math.max(1,Math.round(base));
  total=isNaN(total)?base:Math.max(base,Math.round(total));
  cursos[ci].subgrupos[si].notasBase=base;
  cursos[ci].subgrupos[si].notasExtra=total-base;
  renderPreview();
}

function setSgrValTotal(ci,si,base,total){
  if(!cursos[ci]||!cursos[ci].subgrupos[si])return;
  base=isNaN(base)?1:Math.max(1,Math.round(base));
  total=isNaN(total)?base:Math.max(base,Math.round(total));
  cursos[ci].subgrupos[si].notasBase=base;
  cursos[ci].subgrupos[si].notasExtra=total-base;
  renderPreview();
}
function guardarCursos(){localStorage.setItem('ft_cursos_v6',JSON.stringify(cursos));toast('Cursos guardados','','ok')}

async function guardarCursosSheets(){
  if(!cursos.length){toast('No hay cursos para guardar','','warn');return;}
  showLoader('Guardando cursos en Sheets...');
  try{
    const r=await apiPost({action:'guardarConfigCursos',cursos:JSON.stringify(cursos)});
    hideLoader();
    if(!r.ok)throw new Error(r.error||'No se pudo guardar');
    invalidateCache('cargarConfigCursos');
    toast('Cursos guardados en Sheets','','ok');
  }catch(e){hideLoader();toast('Error al guardar en Sheets',e.message,'err');}
}

async function cargarCursosSheets(){
  showLoader('Cargando cursos desde Sheets...');
  try{
    const r=await apiGetCached('cargarConfigCursos');
    hideLoader();
    if(!r.ok)throw new Error(r.error||'No disponible');
    const cargados=typeof r.cursos==='string'?JSON.parse(r.cursos):r.cursos;
    if(!cargados||!cargados.length){toast('Sin cursos guardados en Sheets','','warn');return;}
    if(!await confirmDialog('Cargar '+cargados.length+' curso(s) desde Sheets?\n(Reemplaza los cursos actuales)'))return;
    cursos=cargados;
    localStorage.setItem('ft_cursos_v6',JSON.stringify(cursos));
    renderCursos();renderAlumnos();renderPreview();
    toast('Cursos cargados desde Sheets','','ok');
  }catch(e){hideLoader();toast('Error al cargar desde Sheets',e.message,'err');}
}

function resetCursos(){confirmDialog('Borrar todos los cursos?').then(function(ok){if(!ok)return;cursos=[];localStorage.removeItem('ft_cursos_v6');renderCursos();renderAlumnos();renderPreview()})}

async function cargarUsuarios(){
  const box=g('usrList');if(!box)return;box.innerHTML='<div class="empty">Cargando...</div>';
  try{
    const r=await apiGetCached('listarUsuarios');if(!r.ok)throw new Error(r.error);
    if(!r.usuarios.length){box.innerHTML='<div class="empty">Sin usuarios registrados</div>';return}
    box.innerHTML=r.usuarios.map(u=>{
      const dots='*'.repeat(Math.min(String(u.password).length,8));
      return `<div class="usr-row"><span class="usr-codigo" title="${u.codigo}">${u.codigo}</span><span class="usr-nombre" title="${u.nombre||''}">${u.nombre||'-'}</span><span class="usr-pass">${dots}</span><span class="rol-tag ${u.rol}">${u.rol}</span><button class="usr-edit" onclick="editarUsuario('${esc(u.codigo)}','${esc(String(u.password))}','${esc(u.rol)}','${esc(u.nombre||'')}')" title="Editar / cambiar contrasena">&#9998;</button><button class="usr-del" onclick="eliminarUsuarioDB('${esc(u.codigo)}')" title="Eliminar">&#128465;</button></div>`;
    }).join('');
  }catch(e){box.innerHTML=`<div class="hint">Error: ${e.message}</div>`}
}

function editarUsuario(codigo, password, rol, nombre){
  const c=g('usCod'),p=g('usPass'),n=g('usNom'),r=g('usRol'),gr=g('usGrado');
  if(c)c.value=codigo;
  if(p)p.value=password;
  if(r)r.value=rol;
  
  // Si es docente, extraer el grado académico del nombre
  let nombreSinGrado = nombre;
  let grado = '';
  if(rol === 'docente'){
    const gradosAcademicos = ['Lic.', 'Mtro.', 'Mtra.', 'Dr.', 'Dra.', 'Ing.', 'Prof.'];
    for(let g of gradosAcademicos){
      if(nombre.startsWith(g + ' ')){
        grado = g;
        nombreSinGrado = nombre.substring(g.length + 1);
        break;
      }
    }
  }
  
  if(n)n.value=nombreSinGrado;
  if(gr)gr.value=grado;
  
  // Mostrar/ocultar selector de grado
  mostrarGradoAcademico();
  
  // Scroll al formulario
  const form=g('usCod');if(form)form.scrollIntoView({behavior:'smooth',block:'center'});
  form&&form.focus();
  toast('Usuario cargado para editar','Cambia los datos y pulsa Guardar','');
}
async function guardarUsuarioDB(){
  const cod=vi('usCod').trim(),pass=vi('usPass').trim(),nom=vi('usNom').trim(),rol=vi('usRol');
  if(!cod||!pass){toast('Codigo y contrasena requeridos','','warn');return}
  
  // Si es docente, agregar grado académico al nombre
  let nombreFinal = nom;
  if(rol === 'docente'){
    const grado = vi('usGrado').trim();
    if(grado){
      nombreFinal = grado + ' ' + nom;
    }
  }
  
  showLoader('Guardando...');
  try{
    const r=await apiPost({action:'guardarUsuario',codigo:cod,password:pass,rol,nombre:nombreFinal});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast(r.accion==='creado'?'Usuario creado':'Actualizado',cod+' - '+rol,'ok');
    invalidateCache('listarUsuarios');
    g('usCod').value='';g('usPass').value='';g('usNom').value='';g('usGrado').value='';cargarUsuarios();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
function mostrarGradoAcademico(){
  const rol = vi('usRol');
  const container = g('gradoAcademicoContainer');
  if(rol === 'docente'){
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
    g('usGrado').value = '';
  }
}
async function eliminarUsuarioDB(codigo){
  if(!await confirmDialog(`Eliminar usuario "${codigo}"?`))return;showLoader('Eliminando...');
  try{
    const r=await apiPost({action:'eliminarUsuario',codigo});
    hideLoader();if(!r.ok)throw new Error(r.error);
    toast('Usuario eliminado','','ok');invalidateCache('listarUsuarios');cargarUsuarios();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

// ── IMPORTAR DESDE PLANILLAS DE NOTAS ────────────────────
let _importPlanillasData = [];
// ── BUSCAR ALUMNO GLOBAL (dentro del panel Hojas) ────────
async function buscarAlumnoGlobal(){
  const q = (vi('busAlumnoInput')||'').trim().toLowerCase();
  const box = g('busAlumnoResultados');
  if(!box) return;
  if(!q){ box.style.display='none'; return; }
  box.style.display='block';
  box.innerHTML='<div class="empty">Buscando...</div>';
  showLoader('Buscando en todas las hojas...');
  try{
    const rH = await apiGetCached('listarHojas');
    if(!rH.ok) throw new Error(rH.error);
    const EXCLUIR = ['Casilleros','_usuarios','Log'];
    const hojas = rH.hojas.filter(h => EXCLUIR.indexOf(h.nombre) < 0);

    const resultados = []; // { nombre, codigo, hoja, cursos:[{nombre, promedio}], promGeneral }
    for(let i = 0; i < hojas.length; i++){
      try{
        const r = await apiGetCached('leerHoja', {hoja: hojas[i].nombre});
        if(!r.ok || !r.alumnos) continue;
        const apro = Number((r.config||{}).notaApro)||11;
        r.alumnos.forEach(al => {
          const nombre = (al.nombre||'').toLowerCase();
          const codigo = (al.codigo||'').toLowerCase();
          if(nombre.indexOf(q) < 0 && codigo.indexOf(q) < 0) return;

          // Recopilar promedios por curso/subgrupo
          const cursosInfo = [];
          let todasNotas = [];
          (al.cursos||[]).forEach(cu => {
            let promsEnCurso = [];
            (cu.subgrupos||[]).forEach(sg => {
              (sg.pacientes||[]).forEach(pac => {
                if(pac.prom !== '' && pac.prom !== undefined && pac.prom !== null){
                  promsEnCurso.push(Number(pac.prom));
                  todasNotas.push(Number(pac.prom));
                }
              });
            });
            const promCurso = promsEnCurso.length
              ? (promsEnCurso.reduce((a,b)=>a+b,0)/promsEnCurso.length).toFixed(1)
              : null;
            cursosInfo.push({nombre: cu.nombre, prom: promCurso});
          });
          const promGeneral = todasNotas.length
            ? (todasNotas.reduce((a,b)=>a+b,0)/todasNotas.length).toFixed(1)
            : null;

          resultados.push({
            nombre: al.nombre, codigo: al.codigo,
            hoja: hojas[i].nombre, cursosInfo, promGeneral, apro
          });
        });
      }catch(e){}
    }

    hideLoader();

    if(!resultados.length){
      box.innerHTML='<div class="empty">No se encontraron alumnos con "'+q+'"</div>'; return;
    }

    // Agrupar por código/nombre para unir hojas del mismo alumno
    const mapa = {};
    resultados.forEach(r => {
      const key = (r.codigo||r.nombre).toLowerCase().trim();
      if(!mapa[key]) mapa[key] = {nombre:r.nombre, codigo:r.codigo, hojas:[]};
      mapa[key].hojas.push({hoja:r.hoja, cursosInfo:r.cursosInfo, promGeneral:r.promGeneral, apro:r.apro});
    });

    const items = Object.values(mapa);
    const total = resultados.length;

    box.innerHTML = `<div style="font-size:11px;color:var(--tx3);margin-bottom:8px;font-weight:600">${items.length} alumno${items.length!==1?'s':''} encontrado${items.length!==1?'s':''} en ${total} hoja${total!==1?'s':''}</div>`
    + items.map(al => {
      const hojaBlocks = al.hojas.map(h => {
        const nomEsc = h.hoja.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const cursoRows = h.cursosInfo.map(cu => {
          const p = cu.prom;
          const color = p === null ? 'var(--tx4)'
            : Number(p) >= h.apro ? 'var(--green)' : 'var(--red)';
          const bg = p === null ? '' : Number(p) >= h.apro ? 'var(--green2)' : 'var(--red2)';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px 5px 20px;font-size:11px;border-bottom:1px solid var(--bd2)">
            <span style="color:var(--tx3);font-style:italic">${cu.nombre}</span>
            <span style="font-family:'DM Mono',monospace;font-weight:700;color:${color};background:${bg};padding:1px 7px;border-radius:6px">${p !== null ? p : '-'}</span>
          </div>`;
        }).join('');

        const pg = h.promGeneral;
        const pgColor = pg === null ? 'var(--tx4)' : Number(pg) >= h.apro ? 'var(--green)' : 'var(--red)';

        return `<div style="border:1px solid var(--bd2);border-radius:10px;overflow:hidden;margin-bottom:6px">
          <div onclick="cerrarPanel();setTimeout(()=>abrirHoja('${nomEsc}'),80)"
            style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--n800);cursor:pointer;transition:opacity .15s"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--n200);font-weight:700">&#128203; ${h.hoja}</span>
            <div style="display:flex;align-items:center;gap:7px">
              <span style="font-size:10px;color:var(--n300)">Prom. gral.</span>
              <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:800;color:${pgColor}">${pg !== null ? pg : '-'}</span>
              <span style="font-size:9px;color:var(--n400)">&#8594; abrir</span>
            </div>
          </div>
          ${cursoRows}
        </div>`;
      }).join('');

      return `<div style="border:1px solid var(--bd2);border-radius:12px;overflow:hidden;margin-bottom:10px;box-shadow:var(--sh)">
        <div style="background:var(--n900);padding:10px 14px;display:flex;align-items:center;gap:10px">
          <span style="font-family:'Syne',sans-serif;font-weight:700;color:#fff;font-size:13px">${al.nombre}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--n300)">${al.codigo||'-'}</span>
        </div>
        <div style="padding:10px">${hojaBlocks}</div>
      </div>`;
    }).join('');

  }catch(e){
    hideLoader();
    box.innerHTML=`<div class="hint">Error: ${e.message}</div>`;
  }
}

async function importarDesdePlanillas(){
  const box = g('importPlanillasBox');
  const lista = g('importPlanillasList');
  const title = g('importPlanillasTitle');
  if(box) box.style.display = 'none';
  showLoader('Escaneando planillas...');
  try{
    const rH = await apiGetCached('listarHojas');
    if(!rH.ok) throw new Error(rH.error);
    const EXCLUIR = ['Casilleros','_usuarios','Log'];
    const hojas = rH.hojas.filter(h => EXCLUIR.indexOf(h.nombre) < 0);
    if(!hojas.length){ hideLoader(); toast('Sin planillas creadas','','warn'); return; }

    const rU = await apiGetCached('listarUsuarios');
    const existentes = {};
    if(rU.ok) rU.usuarios.forEach(u => { existentes[String(u.codigo).trim().toLowerCase()] = true; });

    const alumnosMap = {};
    for(let i = 0; i < hojas.length; i++){
      try{
        const r = await apiGetCached('leerHoja', {hoja: hojas[i].nombre});
        if(!r.ok || !r.alumnos) continue;
        r.alumnos.forEach(al => {
          const cod = String(al.codigo||'').trim();
          const nom = String(al.nombre||'').trim();
          if(!cod || cod === '' || cod.toLowerCase() === 'undefined') return;
          if(!alumnosMap[cod]){
            alumnosMap[cod] = {codigo:cod, nombre:nom, hojas:[], existe: !!existentes[cod.toLowerCase()]};
          }
          if(alumnosMap[cod].hojas.indexOf(hojas[i].nombre) < 0)
            alumnosMap[cod].hojas.push(hojas[i].nombre);
        });
      }catch(e){}
    }

    hideLoader();
    _importPlanillasData = Object.values(alumnosMap)
      .filter(a => a.codigo && a.nombre)
      .sort((a,b) => a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));

    if(!_importPlanillasData.length){
      toast('No se encontraron alumnos con codigo en las planillas','','warn'); return;
    }

    const nuevos   = _importPlanillasData.filter(a => !a.existe).length;
    const yaExisten = _importPlanillasData.filter(a => a.existe).length;
    if(title) title.textContent = _importPlanillasData.length + ' alumnos · ' + nuevos + ' nuevos · ' + yaExisten + ' ya existen';

    if(lista) lista.innerHTML = _importPlanillasData.map((al,i) => `
      <div style="display:flex;align-items:center;gap:9px;padding:8px 11px;border-bottom:1px solid var(--bd2);${al.existe?'opacity:.55':''}">
        <input type="checkbox" id="imp_${i}" ${al.existe?'':'checked'} style="width:15px;height:15px;cursor:pointer;accent-color:var(--n500)">
        <label for="imp_${i}" style="flex:1;cursor:pointer;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${al.nombre}</div>
          <div style="font-size:10px;color:var(--n500);font-family:'DM Mono',monospace">${al.codigo} ${al.existe?'<span style="color:var(--amber);font-weight:700">· ya existe</span>':''}</div>
        </label>
        <div style="font-size:9px;color:var(--tx4);text-align:right;flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis" title="${al.hojas.join(', ')}">${al.hojas[0]}${al.hojas.length>1?(' +'+String(al.hojas.length-1)):''}</div>
      </div>`).join('');

    if(box) box.style.display = 'block';
    setTimeout(() => { if(box) box.scrollIntoView({behavior:'smooth', block:'nearest'}); }, 100);

  }catch(e){ hideLoader(); toast('Error al escanear planillas', e.message, 'err'); }
}

function seleccionarTodosImport(sel){
  _importPlanillasData.forEach((_,i) => {
    const cb = document.getElementById('imp_'+i);
    if(cb) cb.checked = sel;
  });
}

async function confirmarImportPlanillas(){
  const seleccionados = _importPlanillasData.filter((_,i) => {
    const cb = document.getElementById('imp_'+i);
    return cb && cb.checked;
  });
  if(!seleccionados.length){ toast('Selecciona al menos un alumno','','warn'); return; }
  const soloNuevos = seleccionados.filter(a => !a.existe);
  if(!soloNuevos.length){ toast('Todos los seleccionados ya existen como usuarios','','warn'); return; }
  if(!await confirmDialog('Crear ' + soloNuevos.length + ' usuario(s)?\nContrasena inicial = codigo.\nNo se sobreescriben los existentes.')) return;
  const usuarios = soloNuevos.map(a => ({codigo:a.codigo, password:a.codigo, rol:'estudiante', nombre:a.nombre}));
  showLoader('Creando usuarios...');
  try{
    const r = await apiPost({action:'importarUsuarios', usuarios});
    hideLoader(); if(!r.ok) throw new Error(r.error);
    const res = g('importResult');
    if(res){ res.style.display='block'; res.innerHTML=`<div class="hint-g"><span>OK</span><span><strong>${r.agregados}</strong> creados, <strong>${r.omitidos}</strong> omitidos (ya existian)</span></div>`; }
    toast(r.agregados+' usuarios creados', r.omitidos+' omitidos', 'ok');
    const box = g('importPlanillasBox'); if(box) box.style.display='none';
    _importPlanillasData = [];
    cargarUsuarios();
  }catch(e){ hideLoader(); toast('Error', e.message, 'err'); }
}
async function importarDesdeAlumnos(){
  if(!alumnos.length){toast('No hay alumnos cargados','Ve a la pestana Alumnos','warn');return}
  const usuarios=alumnos.filter(a=>a.code).map(a=>({codigo:a.code,password:a.code,rol:'estudiante',nombre:a.name}));
  if(!usuarios.length){toast('Sin codigos','Los alumnos no tienen codigo asignado','warn');return}
  if(!await confirmDialog(`Importar ${usuarios.length} alumnos como estudiantes?\nContrasena inicial = codigo.\nNo sobreescribe existentes.`))return;
  showLoader('Importando...');
  try{
    const r=await apiPost({action:'importarUsuarios',usuarios});
    hideLoader();if(!r.ok)throw new Error(r.error);
    const res=g('importResult');res.style.display='block';
    res.innerHTML=`<div class="hint-g"><span>OK</span><span><strong>${r.agregados}</strong> creados, <strong>${r.omitidos}</strong> omitidos (ya existian)</span></div>`;
    toast(`${r.agregados} usuarios creados`,`${r.omitidos} omitidos`,'ok');invalidateCache('listarUsuarios');cargarUsuarios();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}

function renderPreview(){
  const activos=cursos.filter(c=>c.on),body=g('prevBody');if(!body)return;
  if(!alumnos.length||!activos.length){body.innerHTML='<div class="empty">Configura alumnos, cursos y subgrupos</div>';return}
  body.innerHTML=alumnos.map(a=>{
    const al=activos.filter(c=>a.cursos[c.label]===true);
    if(!al.length)return`<div class="pv-al"><div class="pv-al-hdr"><span>${a.name}</span><span class="pv-al-code">${a.code||''}</span></div><div class="empty" style="padding:10px">Sin cursos - clic en el badge</div></div>`;
    const bl=al.map(c=>{
      const sb=c.subgrupos.map(sg=>{
        let thS='',thE='',tdS='',tdE='';
        for(let i=0;i<(sg.notasBase||0);i++){const lbl=i===0?'EV':'S'+i;thS+=`<th class="th-ss">${lbl}</th>`;tdS+='<td style="color:var(--tx4);text-align:center">.</td>'}
        for(let i=0;i<(sg.notasExtra||0);i++){thE+=`<th class="th-ex">S${(sg.notasBase||0)+i}</th>`;tdE+='<td style="color:#93c5fd;text-align:center">.</td>'}
        let rows='';for(let pi=0;pi<(sg.numPacientes||1);pi++)rows+=`<tr><td class="td-pac">PAC${pi+1}</td><td>-</td>${tdS}${tdE}<td><span class="pc">-</span></td></tr>`;
        return`<div class="pv-sgr-hdr"><span>${sg.nombre}</span></div><div style="overflow-x:auto"><table class="nt"><thead><tr><th class="th-pac" style="display:none"></th><th class="th-nom">Nombre Paciente</th>${thS}${thE}<th class="th-pr">PROM</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      }).join('');
      return`<div class="pv-cu-hdr">${c.label}</div>${sb}`;
    }).join('');
    return`<div class="pv-al"><div class="pv-al-hdr"><span>${a.name}</span><span class="pv-al-code">${a.code||''}</span></div>${bl}</div>`;
  }).join('');
}

async function generarPlanilla(){
  if(!alumnos.length){toast('Sin alumnos','','warn');return}
  const activos=cursos.filter(c=>c.on);if(!activos.length){toast('Sin cursos activos','','warn');return}
  const hoja=vi('cfgHoja')||(vi('cfgSec')+' - '+vi('cfgAsig').substring(0,18));
  const pctExtra=+(vi('cfgPctExtra')||20);
  const aP=alumnos.map(a=>({nombre:a.name,codigo:a.code||'',cursos:activos.filter(c=>a.cursos[c.label]===true).map(c=>({nombre:c.label,subgrupos:c.subgrupos.map(sg=>({nombre:sg.nombre,notasBase:sg.notasBase||15,notasExtra:sg.notasExtra||0,numPacientes:sg.numPacientes||1,pctExtra:sg.pctExtra!==undefined?sg.pctExtra:pctExtra}))})) }));
  if(!aP.some(a=>a.cursos.length)){toast('Sin cursos asignados','Asigna cursos a los alumnos','warn');return}
  showLoader('Creando planilla...');
  try{
    const r=await apiPost({action:'crearPlanilla',nombreHoja:hoja,config:{asignatura:vi('cfgAsig'),semestre:vi('cfgSem'),seccion:vi('cfgSec'),ciclo:vi('cfgCiclo'),notaApro:+vi('scApro')||11,pctExtra:+(vi('cfgPctExtra')||20)},alumnos:aP});
    hideLoader();if(!r.ok)throw new Error(r.error||JSON.stringify(r));
    toast('Planilla creada',`"${r.hoja}"`,'ok');window.open(r.url,'_blank');
    await abrirHoja(r.hoja);loadHojas();
  }catch(e){hideLoader();toast('Error',e.message,'err')}
}
