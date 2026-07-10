// ── exportar.js: exportación a PDF y Excel ─────────────────────────────────
// Depende de: core.js (g, vi, esc, toast, showLoader, hideLoader)
//             session.js (session)
//             api.js (apiGet, apiGetCached)
//             config-index.js (logoParaPDF_ usa applyBranding)

// ── EXPORTAR PDF ─────────────────────────────────────────────
let expSelCurso=null;

async function cargarHojasExport(){
  const box=g('expCursosList');if(!box)return;
  box.innerHTML='<div class="empty">Cargando cursos...</div>';
  expSelCurso=null;expResumenCombinado=null;
  const pb=g('resumenPreviewBox');if(pb)pb.style.display='none';
  showLoader('Escaneando todas las hojas...');
  try{
    const rHojas=await apiGetCached('listarHojas');
    if(!rHojas.ok)throw new Error(rHojas.error);
    const EXCLUIR=['Casilleros','_usuarios','Log'];
    const hojasFiltradas=rHojas.hojas.filter(h=>EXCLUIR.indexOf(h.nombre)<0);
    if(!hojasFiltradas.length){hideLoader();box.innerHTML='<div class="empty">Sin hojas creadas</div>';return;}

    // Escanear todas las hojas para obtener cursos únicos
    const cursosMap={}; // { nombreCurso: [{hoja, ciclo, cfg}] }
    for(let i=0;i<hojasFiltradas.length;i++){
      const hn=hojasFiltradas[i].nombre;
      try{
        const r=await apiGetCached('resumenHoja',{hoja:hn});
        if(!r.ok)continue;
        const cfg=r.config||{};
        const ciclo=cfg.ciclo||extraerCicloDeNombre(hn)||hn;
        (r.cursos||[]).forEach(cu=>{
          if(!cursosMap[cu.nombre]) cursosMap[cu.nombre]=[];
          cursosMap[cu.nombre].push({hoja:hn,ciclo,cfg,alumnos:cu.alumnos});
        });
      }catch(e){}
    }
    hideLoader();
    const nombresCursos=Object.keys(cursosMap).sort((a,b)=>a.localeCompare(b,'es'));
    if(!nombresCursos.length){box.innerHTML='<div class="empty">Sin cursos encontrados</div>';return;}
    // Guardar mapa global para usarlo en selExpCurso sin re-escanear
    window._expCursosMap=cursosMap;
    renderExpCursosList(nombresCursos,cursosMap);
  }catch(e){hideLoader();box.innerHTML=`<div class="hint">Error: ${e.message}</div>`;}
}

function renderExpCursosList(nombres, cursosMap){
  const box=g('expCursosList');if(!box)return;
  box.innerHTML=nombres.map(nombre=>{
    const grupos=cursosMap[nombre]||[];
    const ciclos=[...new Set(grupos.map(g=>g.ciclo))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
    const totalAlumnos=grupos.reduce((s,g)=>s+g.alumnos.length,0);
    const sel=expSelCurso===nombre;
    return `<div class="exp-hoja-item ${sel?'sel':''}" onclick="selExpCurso('${esc(nombre)}')">
      <div class="ck">${sel?'&#10003;':' '}</div>
      <div style="flex:1;min-width:0">
        <div class="exp-hoja-name">${nombre}</div>
        <div class="exp-hoja-meta">${ciclos.join(', ')} &middot; ${totalAlumnos} alumnos</div>
      </div>
    </div>`;
  }).join('');
}

function selExpCurso(nombre){
  expSelCurso=nombre;
  const pb=g('resumenPreviewBox');if(pb)pb.style.display='none';
  if(window._expCursosMap){
    const nombres=Object.keys(window._expCursosMap).sort((a,b)=>a.localeCompare(b,'es'));
    renderExpCursosList(nombres,window._expCursosMap);
  }
  if(window._expCursosMap&&window._expCursosMap[nombre]){
    const grupos=window._expCursosMap[nombre];
    // Combinar todos los alumnos en UNA sola lista sin separar por ciclo/hoja
    const todosAlumnos=[];
    grupos.forEach(gr=>{
      gr.alumnos.forEach(al=>{
        todosAlumnos.push({
          nombre:al.nombre,
          codigo:al.codigo,
          promFinal:al.promFinal,
          notaApro:Number((gr.cfg||{}).notaApro)||11
        });
      });
    });
    todosAlumnos.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
    expResumenCombinado={curso:nombre,alumnos:todosAlumnos,grupos};
    expAlumnoFiltro=null;
    const selAlumno=g('expSelAlumno');
    if(selAlumno){
      selAlumno.innerHTML='<option value="">Todos los alumnos</option>'+
        todosAlumnos.map(al=>`<option value="${esc(al.codigo)}">${al.nombre}</option>`).join('');
    }
    renderResumenPreviewCombinado();
    if(pb)pb.style.display='block';
    expSubgruposDetalle=null; expSubgruposEstado='cargando'; expSubgruposSeleccionados={};
    const chkTodos=g('expChkTodos'); if(chkTodos) chkTodos.checked=false;
    _actualizarBotonesFormatoAlcance();
    if(expAlcance==='subgrupos') renderExpSubgruposChecklist();
    _cargarSubgruposEnBackground(nombre);
  }
}

let expResumenCombinado = null; // { curso, grupos: [{ciclo, hoja, cfg, alumnos}] }

let expAlumnoFiltro = null; // null = todos, o {nombre, codigo} de un alumno específico

function _alumnosConFiltroAlumno(alumnos){
  if(!expAlumnoFiltro) return alumnos;
  return (alumnos||[]).filter(a=>a.codigo===expAlumnoFiltro.codigo);
}

function _filasConFiltroAlumno(filas){
  if(!expAlumnoFiltro) return filas;
  return (filas||[]).filter(f=>f.alumnoCodigo===expAlumnoFiltro.codigo);
}

function setExpAlumnoFiltro(codigo){
  if(!codigo){ expAlumnoFiltro=null; return; }
  const al=(expResumenCombinado.alumnos||[]).find(a=>a.codigo===codigo);
  expAlumnoFiltro=al?{nombre:al.nombre,codigo:al.codigo}:null;
}

// Extrae el ciclo romano del nombre de la hoja: "V Ciclo 2025-I" → "V Ciclo"
function extraerCicloDeNombre(nombre){
  const m=nombre.match(/^((?:I{1,3}|IV|VI{0,3}|IX|X|XI|XII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\s+Ciclo)/i);
  return m?m[1]:null;
}

function renderResumenPreviewCombinado(){
  const tbl=g('resumenTable');if(!tbl||!expResumenCombinado)return;
  if(!expResumenCombinado.alumnos||!expResumenCombinado.alumnos.length){
    tbl.innerHTML='<div class="empty">Sin datos</div>';return;
  }
  let html='<table>';
  html+=`<thead><tr>
    <th style="width:36px">#</th>
    <th style="width:100px">Codigo</th>
    <th>Apellidos y Nombres</th>
    <th style="width:80px;text-align:center">Prom.</th>
  </tr></thead><tbody>`;
  expResumenCombinado.alumnos.forEach((al,i)=>{
    const p=al.promFinal;
    const apro=al.notaApro||11;
    const cls=p!==''&&p!==undefined?(p>=apro?'ok':'no'):'';
    const color=cls==='ok'?'var(--green)':cls==='no'?'var(--red)':'var(--tx3)';
    html+=`<tr>
      <td style="padding:7px 12px;border-bottom:1px solid var(--bd2);font-size:12px;color:var(--tx3);text-align:center">${i+1}</td>
      <td style="padding:7px 12px;border-bottom:1px solid var(--bd2);font-family:'DM Mono',monospace;font-size:11px;color:var(--n500)">${al.codigo||'-'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid var(--bd2);font-size:12px;font-weight:600">${al.nombre}</td>
      <td style="padding:7px 12px;border-bottom:1px solid var(--bd2);font-family:'DM Mono',monospace;font-weight:700;text-align:center;color:${color}">${p!==''&&p!==undefined?p:'-'}</td>
    </tr>`;
  });
  html+='</tbody></table>';
  tbl.innerHTML=html;
}

// Convierte el logo guardado a version negra para PDF.
// Estrategia:
//   - Si el PNG tiene fondo transparente (alfa < 255 en algun pixel):
//       pixels visibles (alfa > 10) → negro puro, mantiene alfa original
//   - Si la imagen es solida (JPEG o PNG sin transparencia):
//       usa luminancia invertida como alfa (blanco → invisible, oscuro → opaco negro)
async function logoParaPDF_(){
  const b64=g('cfgLogoB64')?g('cfgLogoB64').textContent:'';
  if(!b64) return '';
  return new Promise(function(resolve){
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      canvas.width=img.width; canvas.height=img.height;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=imgData.data;

      // Detectar si tiene fondo transparente
      let tieneTransp=false;
      for(let i=3;i<d.length;i+=4){ if(d[i]<255){tieneTransp=true;break;} }

      for(let i=0;i<d.length;i+=4){
        const alfa=d[i+3];
        if(tieneTransp){
          // PNG con transparencia: pixels visibles → negro, conservar alfa
          if(alfa>10){ d[i]=0; d[i+1]=0; d[i+2]=0; }
          else { d[i+3]=0; } // pixel transparente → dejarlo transparente
        } else {
          // Imagen solida (JPEG / PNG sin alpha):
          // Usar luminancia invertida como canal alfa para que lo blanco desaparezca
          const lum=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
          d[i]=0; d[i+1]=0; d[i+2]=0;
          d[i+3]=Math.round(255-lum); // blanco(255)→alfa 0, negro(0)→alfa 255
        }
      }
      ctx.putImageData(imgData,0,0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror=function(){ resolve(''); };
    img.src=b64;
  });
}

async function exportarPDF(){
  // Validación corregida — solo necesita curso seleccionado y datos combinados
  if(!expSelCurso||!expResumenCombinado||!expResumenCombinado.alumnos||!expResumenCombinado.alumnos.length){
    toast('Selecciona un curso primero','','warn');return;
  }
  const alumnosFiltrados=_alumnosConFiltroAlumno(expResumenCombinado.alumnos);
  const fecha=new Date().toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
  // Obtener logo guardado y convertirlo a negro para el PDF
  const logoUrl=await logoParaPDF_();
  // Datos institucionales desde el panel de configuración
  const instUniv=(g('cfgUniv')||{}).value||'';
  const instFac =(g('cfgFac') ||{}).value||'';
  const instEsc =(g('cfgEsc') ||{}).value||'';
  // Semestre del primer grupo que lo tenga
  const semestre=(expResumenCombinado.grupos||[]).map(g=>g.cfg&&g.cfg.semestre).find(s=>s)||'';
  const apro=alumnosFiltrados[0]&&alumnosFiltrados[0].notaApro||11;
 
  // Filas sin columna de ciclo
  let filas='';
  alumnosFiltrados.forEach((al,i)=>{
    const p=al.promFinal;
    const aprobado=p!==''&&p!==undefined&&p>=al.notaApro;
    const desaprobado=p!==''&&p!==undefined&&p<al.notaApro;
    const color=aprobado?'#059669':desaprobado?'#dc2626':'#64748b';
    filas+=`<tr>
      <td style="text-align:center;color:#64748b;font-size:11px;padding:7px 10px">${i+1}</td>
      <td style="font-family:monospace;font-size:11px;color:#1d4ed8;padding:7px 10px">${al.codigo||'-'}</td>
      <td style="font-weight:600;font-size:12px;padding:7px 10px">${al.nombre}</td>
      <td style="text-align:center;font-family:monospace;font-weight:700;font-size:13px;color:${color};padding:7px 10px">${p!==''&&p!==undefined?p:'-'}</td>
    </tr>`;
  });
 
  // Resumen estadístico al pie
  const conNota=alumnosFiltrados.filter(a=>a.promFinal!==''&&a.promFinal!==undefined);
  const aprobados=conNota.filter(a=>a.promFinal>=a.notaApro).length;
  const pct=conNota.length?Math.round(aprobados/conNota.length*100):0;
  const total=alumnosFiltrados.length;
 
  const htmlPDF=`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Registro de Notas - ${expSelCurso}</title>
<style>
@page{size:A4;margin:15mm 14mm 18mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#0f172a}
.hdr-pdf{display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:2px solid #0a1628;margin-bottom:18px}
.logo-box{width:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.logo-box img{max-width:80px;max-height:70px;object-fit:contain}
.inst-info{flex:1}
.inst-univ{font-size:10px;font-weight:700;color:#0a1628;text-transform:uppercase;letter-spacing:.6px;line-height:1.6}
.inst-fac{font-size:9.5px;color:#334155;text-transform:uppercase;letter-spacing:.5px;line-height:1.6}
.inst-esc{font-size:9.5px;color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;line-height:1.6}
.titulo{margin-bottom:14px}
.titulo h1{font-size:15px;font-weight:800;color:#0a1628;margin-bottom:3px}
.titulo h2{font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px}
.meta{display:flex;gap:18px;font-size:11px;color:#334155;flex-wrap:wrap}
.meta-item{display:flex;gap:5px}.meta-item strong{color:#0a1628}
table{width:100%;border-collapse:collapse;margin-top:6px}
thead th{background:#0a1628;color:#fff;padding:9px 10px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.3px}
thead th.c{text-align:center}
tbody tr:nth-child(even){background:#f8faff}tbody tr:nth-child(odd){background:#fff}
tbody td{border-bottom:1px solid #e2e8f0;vertical-align:middle}
tbody tr:last-child td{border-bottom:2px solid #0a1628}
.stats-box{margin-top:20px;padding:12px 16px;background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;display:flex;gap:28px;flex-wrap:wrap;page-break-inside:avoid}
.stat-item{text-align:center}
.stat-num{font-size:22px;font-weight:800;line-height:1.1}
.stat-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.stat-apro{color:#059669}.stat-desapro{color:#dc2626}.stat-total{color:#0a1628}.stat-pct{color:#1d4ed8}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr-pdf">
  <div class="logo-box"><img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'"></div>
  <div class="inst-info">
    ${instUniv?`<div class="inst-univ">${instUniv}</div>`:''}
    ${instFac?`<div class="inst-fac">${instFac}</div>`:''}
    ${instEsc?`<div class="inst-esc">${instEsc}</div>`:''}
  </div>
</div>
<div class="titulo">
  <h1>${expSelCurso}</h1>
  <h2>Registro consolidado de notas</h2>
  <div class="meta">
    ${semestre?`<div class="meta-item"><strong>Semestre:</strong><span>${semestre}</span></div>`:''}
    <div class="meta-item"><strong>Total alumnos:</strong><span>${total}</span></div>
    <div class="meta-item"><strong>Fecha:</strong><span>${fecha}</span></div>
  </div>
</div>
<table>
  <thead><tr>
    <th class="c" style="width:34px">#</th>
    <th style="width:100px">Codigo</th>
    <th>Apellidos y Nombres</th>
    <th class="c" style="width:90px">Prom. Final</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="stats-box">
  <div class="stat-item"><div class="stat-num stat-total">${total}</div><div class="stat-lbl">Total</div></div>
  <div class="stat-item"><div class="stat-num stat-apro">${aprobados}</div><div class="stat-lbl">Aprobados</div></div>
  <div class="stat-item"><div class="stat-num stat-desapro">${conNota.length-aprobados}</div><div class="stat-lbl">Desaprobados</div></div>
  <div class="stat-item"><div class="stat-num stat-pct">${pct}%</div><div class="stat-lbl">Aprobacion</div></div>
</div>
<\u0073cript>window.onload=function(){window.print()}<\/script>
</body></html>`;
 
  _abrirVentanaImpresion(htmlPDF);
}

function _abrirVentanaImpresion(htmlPDF){
  try{
    const blob=new Blob([htmlPDF],{type:'text/html;charset=utf-8'});
    const burl=URL.createObjectURL(blob);
    const win=window.open(burl,'_blank');
    if(!win){toast('Habilita popups en el navegador','','warn');URL.revokeObjectURL(burl);return}
    setTimeout(()=>URL.revokeObjectURL(burl),60000);
  }catch(ex){
    const win=window.open('','_blank');
    if(!win){toast('Habilita popups','','warn');return}
    win.document.write(htmlPDF);win.document.close();
  }
}

// ── EXPORTAR ATENCIONES DE UN ALUMNO A XLSX (admin) ────────────
function _sanitizeSheetName(nombre){
  return String(nombre||'Hoja').replace(/[:\\/?*\[\]]/g,'-').slice(0,31) || 'Hoja';
}

function _nombreHojaUnico(nombresAsignados, nombreCrudo){
  const base = _sanitizeSheetName(nombreCrudo);
  let candidato = base;
  let n = 1;
  while(nombresAsignados[candidato]){
    n++;
    const sufijo = '_' + n;
    candidato = base.slice(0, 31 - sufijo.length) + sufijo;
  }
  nombresAsignados[candidato] = true;
  return candidato;
}

function _aoaFilaPaciente(pac, base, extra){
  var fila = [pac.nombre || '-'];
  for(var i=0;i<base;i++) fila.push(pac.notas[i]!==''&&pac.notas[i]!==undefined ? pac.notas[i] : '');
  for(var i2=0;i2<extra;i2++) fila.push(pac.xNotas[i2]!==''&&pac.xNotas[i2]!==undefined ? pac.xNotas[i2] : '');
  fila.push(pac.promSS!==''&&pac.promSS!==undefined ? pac.promSS : '');
  return fila;
}

function _agregarComentariosNotas(comentarios, pac, filaIdx, colBase, base){
  (pac.notasDoc||[]).forEach(function(doc, ni){
    if(doc) comentarios.push({r: filaIdx, c: colBase+ni, texto: 'Registrado por: ' + doc});
  });
  (pac.xNotasDoc||[]).forEach(function(doc, ni){
    if(doc) comentarios.push({r: filaIdx, c: colBase+base+ni, texto: 'Registrado por: ' + doc});
  });
}

function _construirHojaAtenciones(resultado){
  var aoa = [];
  aoa.push(['Asignatura: ' + (resultado.asignatura || resultado.hoja)]);
  aoa.push([]);
  var comentarios = []; // {r, c, texto} en índices 0-based dentro de aoa

  (resultado.cursos || []).forEach(function(cu){
    aoa.push(['CURSO: ' + cu.nombre]);
    var promsCurso = [];
    (cu.subgrupos || []).forEach(function(sg){
      var base = sg.notasBase || 0, extra = sg.notasExtra || 0;
      aoa.push(['Subgrupo: ' + sg.nombre]);
      var header = ['Paciente'];
      for(var i=0;i<base;i++) header.push(i===0?'EV':'S'+i);
      for(var i2=0;i2<extra;i2++) header.push('E'+(i2+1));
      header.push('PROM');
      aoa.push(header);

      (sg.pacientes || []).forEach(function(pac){
        var filaIdx = aoa.length;
        aoa.push(_aoaFilaPaciente(pac, base, extra));
        _agregarComentariosNotas(comentarios, pac, filaIdx, 1, base);
      });

      var promSgr = (sg.pacientes && sg.pacientes.length && sg.pacientes[0].prom !== '' && sg.pacientes[0].prom !== undefined)
        ? Number(sg.pacientes[0].prom) : null;
      if(promSgr !== null) promsCurso.push(promSgr);
      var filaProm = ['Promedio Subgrupo'];
      for(var k=1;k<header.length-1;k++) filaProm.push('');
      filaProm.push(promSgr !== null ? promSgr : '');
      aoa.push(filaProm);
      aoa.push([]);
    });
    var promCurso = promsCurso.length ? Math.round(promsCurso.reduce(function(a,b){return a+b;},0)/promsCurso.length*100)/100 : '';
    aoa.push(['Promedio Curso', promCurso]);
    aoa.push([]);
  });

  var ws = XLSX.utils.aoa_to_sheet(aoa);
  comentarios.forEach(function(cm){
    var ref = XLSX.utils.encode_cell({r: cm.r, c: cm.c});
    if(!ws[ref]) ws[ref] = {t:'s', v:''};
    ws[ref].c = [{a:'CENTYR', t: cm.texto}];
    ws[ref].c.hidden = true;
  });
  return ws;
}

async function exportarAtencionesAlumnoXLSX(codigo, nombre){
  showLoader('Generando reporte de '+nombre+'...');
  try{
    const r = await apiGet('notasAlumnoAdmin', {codigo});
    hideLoader();
    if(!r.ok) throw new Error(r.error || 'Error al obtener notas');
    if(!r.resultados || !r.resultados.length){
      toast('Sin datos', nombre+' no tiene notas registradas en ninguna hoja', 'warn');
      return;
    }
    const wb = XLSX.utils.book_new();
    const nombresFinales = {}; // nombres ya asignados a este workbook
    r.resultados.forEach(function(res){
      const nombreHoja = _nombreHojaUnico(nombresFinales, res.hoja);
      const ws = _construirHojaAtenciones(res);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    });
    const fecha = new Date().toISOString().slice(0,10);
    const nombreArchivo = 'Atenciones_'+String(nombre||'alumno').replace(/[^a-zA-Z0-9]+/g,'_')+'_'+fecha+'.xlsx';
    XLSX.writeFile(wb, nombreArchivo);
    toast('Exportado', nombreArchivo, 'ok');
  }catch(e){
    hideLoader();
    toast('Error al exportar', e.message, 'err');
  }
}

// ── EXPORTAR RESUMEN DE CURSO A XLSX (admin) ────────────
function exportarResumenCursoXLSX(){
  if(!expSelCurso||!expResumenCombinado||!expResumenCombinado.alumnos||!expResumenCombinado.alumnos.length){
    toast('Selecciona un curso primero','','warn');return;
  }
  const aoa=[['Codigo','Apellidos y Nombres','Promedio Final']];
  _alumnosConFiltroAlumno(expResumenCombinado.alumnos).forEach(al=>{
    aoa.push([al.codigo||'-', al.nombre, al.promFinal!==''&&al.promFinal!==undefined?al.promFinal:'']);
  });
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,_sanitizeSheetName(expSelCurso));
  const fecha=new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb,'Resumen_'+String(expSelCurso).replace(/[^a-zA-Z0-9]+/g,'_')+'_'+fecha+'.xlsx');
  toast('Exportado','Resumen de '+expSelCurso,'ok');
}

let expSubgruposDetalle = null; // { [nombreSubgrupo]: { base, extra, filas:[{alumnoNombre, alumnoCodigo, pacientes}] } }

// ── EXPORTAR DETALLE DE SUBGRUPO A XLSX (admin) ────────────
function _promedioSubgrupo(filas){
  const proms=(filas||[]).map(fila=>{
    const pac=(fila.pacientes||[])[0];
    return pac&&pac.prom!==''&&pac.prom!==undefined?Number(pac.prom):null;
  }).filter(p=>p!==null);
  if(!proms.length) return null;
  return Math.round(proms.reduce((a,b)=>a+b,0)/proms.length*100)/100;
}

function _construirHojaDetalleSubgrupo(nombreSubgrupo, info){
  const base=info.base, extra=info.extra;
  const filasOrdenadas=info.filas.slice().sort((a,b)=>a.alumnoNombre.localeCompare(b.alumnoNombre,'es',{sensitivity:'base'}));
  const header=['Alumno','Codigo','Paciente'];
  for(let i=0;i<base;i++) header.push(i===0?'EV':'S'+i);
  for(let i2=0;i2<extra;i2++) header.push('E'+(i2+1));
  header.push('PROM');
  const aoa=[header];
  const comentarios=[];
  filasOrdenadas.forEach(fila=>{
    (fila.pacientes||[]).forEach(pac=>{
      const filaIdx=aoa.length;
      const filaPac=_aoaFilaPaciente(pac, base, extra);
      aoa.push([fila.alumnoNombre, fila.alumnoCodigo||'-'].concat(filaPac));
      _agregarComentariosNotas(comentarios, pac, filaIdx, 3, base);
    });
  });
  const promSubgrupo=_promedioSubgrupo(filasOrdenadas);
  const filaProm=['Promedio Subgrupo'];
  for(let k=1;k<header.length-1;k++) filaProm.push('');
  filaProm.push(promSubgrupo!==null?promSubgrupo:'');
  aoa.push(filaProm);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  comentarios.forEach(function(cm){
    const ref=XLSX.utils.encode_cell({r:cm.r,c:cm.c});
    if(!ws[ref]) ws[ref]={t:'s',v:''};
    ws[ref].c=[{a:'CENTYR', t:cm.texto}];
    ws[ref].c.hidden=true;
  });
  return {ws, promSubgrupo};
}

// ── EXPORTAR PANEL UNIFICADO: estado y carga en segundo plano de subgrupos ────────────
let expFormato = 'pdf';      // 'pdf' | 'xlsx'
let expAlcance = 'ciclo';    // 'ciclo' | 'subgrupos'
let expSubgruposSeleccionados = {}; // { [nombreSubgrupo]: true }
let expSubgruposEstado = 'idle';    // 'idle' | 'cargando' | 'listo' | 'error'
let _expSubgruposCargaId = 0;       // token para descartar cargas obsoletas

async function _cargarSubgruposEnBackground(nombreCurso){
  if(!expResumenCombinado||!expResumenCombinado.grupos||!expResumenCombinado.grupos.length){
    expSubgruposEstado='error'; if(expAlcance==='subgrupos') renderExpSubgruposChecklist(); return;
  }
  const cargaId = ++_expSubgruposCargaId;
  const grupos = expResumenCombinado.grupos;
  const detalle = {};
  try{
    for(let i=0;i<grupos.length;i++){
      if(cargaId!==_expSubgruposCargaId) return; // el curso cambió, abortar esta carga
      const hn=grupos[i].hoja;
      try{
        const r=await apiGetCached('leerHoja',{hoja:hn});
        if(!r.ok||!r.alumnos)continue;
        r.alumnos.forEach(al=>{
          (al.cursos||[]).forEach(cu=>{
            if(cu.nombre!==nombreCurso)return;
            (cu.subgrupos||[]).forEach(sg=>{
              if(!detalle[sg.nombre]) detalle[sg.nombre]={base:sg.notasBase||0, extra:sg.notasExtra||0, filas:[]};
              detalle[sg.nombre].filas.push({alumnoNombre:al.nombre, alumnoCodigo:al.codigo, pacientes:sg.pacientes||[]});
            });
          });
        });
      }catch(e){}
    }
    if(cargaId!==_expSubgruposCargaId) return;
    expSubgruposDetalle=detalle;
    expSubgruposEstado='listo';
  }catch(e){
    if(cargaId!==_expSubgruposCargaId) return;
    expSubgruposEstado='error';
  }
  if(expAlcance==='subgrupos') renderExpSubgruposChecklist();
}

function renderExpSubgruposChecklist(){
  const box=g('expSubgruposList');if(!box)return;
  if(expSubgruposEstado==='cargando'){box.innerHTML='<div class="empty">Cargando subgrupos...</div>';return;}
  if(expSubgruposEstado==='error'){
    box.innerHTML='<div class="hint">Error al cargar subgrupos. <a href="#" onclick="event.preventDefault();_cargarSubgruposEnBackground(expSelCurso)">Reintentar</a></div>';
    return;
  }
  const nombres=Object.keys(expSubgruposDetalle||{}).sort((a,b)=>a.localeCompare(b,'es'));
  if(!nombres.length){box.innerHTML='<div class="empty">Sin subgrupos encontrados</div>';return;}
  box.innerHTML=nombres.map(nombre=>{
    const info=expSubgruposDetalle[nombre];
    const checked=!!expSubgruposSeleccionados[nombre];
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;font-size:12px">
      <input type="checkbox" ${checked?'checked':''} onchange="toggleExpSubgrupo('${esc(nombre)}',this.checked)">
      <span style="flex:1">${nombre}</span>
      <span style="color:var(--tx4);font-size:11px">${info.filas.length} alumno${info.filas.length!==1?'s':''}</span>
    </label>`;
  }).join('');
}

function toggleExpSubgrupo(nombre, marcado){
  if(marcado) expSubgruposSeleccionados[nombre]=true;
  else delete expSubgruposSeleccionados[nombre];
  const todos=Object.keys(expSubgruposDetalle||{});
  const chkTodos=g('expChkTodos');
  if(chkTodos) chkTodos.checked = todos.length>0 && todos.every(n=>expSubgruposSeleccionados[n]);
}

function toggleExpSubgruposTodos(marcar){
  expSubgruposSeleccionados={};
  if(marcar) Object.keys(expSubgruposDetalle||{}).forEach(n=>{expSubgruposSeleccionados[n]=true;});
  renderExpSubgruposChecklist();
}

function setExpFormato(fmt){
  expFormato=fmt;
  _actualizarBotonesFormatoAlcance();
}

function setExpAlcance(alcance){
  expAlcance=alcance;
  const box=g('expSubgruposBox');
  if(box) box.style.display = alcance==='subgrupos' ? 'block' : 'none';
  if(alcance==='subgrupos') renderExpSubgruposChecklist();
  _actualizarBotonesFormatoAlcance();
}

function _actualizarBotonesFormatoAlcance(){
  const setActivo=(id,activo)=>{const b=g(id);if(!b)return;b.style.background=activo?'var(--n500)':'';b.style.color=activo?'#fff':'';};
  setActivo('btnFmtPdf', expFormato==='pdf');
  setActivo('btnFmtXlsx', expFormato==='xlsx');
  setActivo('btnAlcCiclo', expAlcance==='ciclo');
  setActivo('btnAlcSubgrupos', expAlcance==='subgrupos');
}

// ── EXPORTAR PANEL UNIFICADO: XLSX de uno o varios subgrupos ────────────
function exportarXLSXSubgrupos(nombres){
  if(!expSubgruposDetalle||!nombres||!nombres.length){
    toast('Selecciona al menos un subgrupo','','warn');return;
  }
  const wb=XLSX.utils.book_new();
  const nombresAsignados={};
  const promsSubgrupos=[];
  nombres.forEach(nombreSgr=>{
    const info=expSubgruposDetalle[nombreSgr];
    if(!info)return;
    const filasFiltradas=_filasConFiltroAlumno(info.filas);
    const {ws, promSubgrupo}=_construirHojaDetalleSubgrupo(nombreSgr, {base:info.base, extra:info.extra, filas:filasFiltradas});
    if(promSubgrupo!==null) promsSubgrupos.push(promSubgrupo);
    const nombreHoja=_nombreHojaUnico(nombresAsignados, nombreSgr);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  });
  if(promsSubgrupos.length>1){
    const promCurso=Math.round(promsSubgrupos.reduce((a,b)=>a+b,0)/promsSubgrupos.length*100)/100;
    const wsResumen=XLSX.utils.aoa_to_sheet([['Promedio Curso', promCurso]]);
    XLSX.utils.book_append_sheet(wb, wsResumen, _nombreHojaUnico(nombresAsignados, 'Resumen'));
  }
  const fecha=new Date().toISOString().slice(0,10);
  const nombreArchivo='Detalle_'+String(expSelCurso||'curso').replace(/[^a-zA-Z0-9]+/g,'_')+'_'+fecha+'.xlsx';
  XLSX.writeFile(wb, nombreArchivo);
  toast('Exportado', nombreArchivo, 'ok');
}

// ── EXPORTAR PANEL UNIFICADO: PDF de uno o varios subgrupos ────────────
function _tablaSubgrupoHTML(nombreSubgrupo, info, apro){
  const base=info.base, extra=info.extra;
  const filasOrdenadas=info.filas.slice().sort((a,b)=>a.alumnoNombre.localeCompare(b.alumnoNombre,'es',{sensitivity:'base'}));
  let thNotas='';
  for(let i=0;i<base;i++) thNotas+=`<th style="text-align:center">${i===0?'EV':'S'+i}</th>`;
  for(let i2=0;i2<extra;i2++) thNotas+=`<th style="text-align:center">E${i2+1}</th>`;
  const colspanTotal=3+base+extra+1; // Alumno+Codigo+Paciente+notas+PROM
  let filasHtml='';
  filasOrdenadas.forEach(fila=>{
    (fila.pacientes||[]).forEach(pac=>{
      let tdNotas='';
      for(let i=0;i<base;i++){const v=pac.notas&&pac.notas[i];tdNotas+=`<td style="text-align:center">${v!==''&&v!==undefined?v:'-'}</td>`;}
      for(let i2=0;i2<extra;i2++){const v=pac.xNotas&&pac.xNotas[i2];tdNotas+=`<td style="text-align:center">${v!==''&&v!==undefined?v:'-'}</td>`;}
      const p=pac.promSS;
      const color=p!==''&&p!==undefined?(p>=apro?'#059669':'#dc2626'):'#64748b';
      filasHtml+=`<tr>
        <td style="font-size:11px;padding:6px 8px">${fila.alumnoNombre}</td>
        <td style="font-family:monospace;font-size:10px;color:#1d4ed8;padding:6px 8px">${fila.alumnoCodigo||'-'}</td>
        <td style="font-size:11px;padding:6px 8px">${pac.nombre||'-'}</td>
        ${tdNotas}
        <td style="text-align:center;font-family:monospace;font-weight:700;color:${color};padding:6px 8px">${p!==''&&p!==undefined?p:'-'}</td>
      </tr>`;
      if(pac.puntoExtra && Number(pac.puntoExtra)!==0 && pac.justificacion){
        filasHtml+=`<tr>
          <td colspan="${colspanTotal}" style="background:#f0fdf4;border-bottom:1px solid #e2e8f0;padding:5px 8px;font-size:10.5px;color:#166534">
            <strong>+ Punto extra (+${pac.puntoExtra}):</strong> ${escHtml(pac.justificacion)}
          </td>
        </tr>`;
      }
    });
  });
  const promSubgrupo=_promedioSubgrupo(filasOrdenadas);
  const colspanNotas=2+1+base+extra;
  const filaProm=promSubgrupo!==null
    ?`<tr style="background:#f8faff;border-top:2px solid #0a1628">
        <td colspan="${colspanNotas}" style="font-weight:700;font-size:11px;padding:7px 8px">Promedio Subgrupo</td>
        <td style="text-align:center;font-family:monospace;font-weight:800;font-size:12px;color:#1d4ed8;padding:7px 8px">${promSubgrupo}</td>
      </tr>`
    :'';
  return {
    html: `<div>
      <h2 style="font-size:13px;font-weight:800;color:#1d4ed8;margin:18px 0 8px">Subgrupo: ${nombreSubgrupo}</h2>
      <table>
        <thead><tr>
          <th style="width:120px">Alumno</th><th style="width:80px">Codigo</th><th>Paciente</th>${thNotas}<th style="width:60px;text-align:center">PROM</th>
        </tr></thead>
        <tbody>${filasHtml}${filaProm}</tbody>
      </table>
    </div>`,
    promSubgrupo
  };
}

async function exportarPDFSubgrupos(nombres){
  if(!expSubgruposDetalle||!nombres||!nombres.length){
    toast('Selecciona al menos un subgrupo','','warn');return;
  }
  const fecha=new Date().toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
  const logoUrl=await logoParaPDF_();
  const instUniv=(g('cfgUniv')||{}).value||'';
  const instFac =(g('cfgFac') ||{}).value||'';
  const instEsc =(g('cfgEsc') ||{}).value||'';
  const apro=(expResumenCombinado.alumnos&&expResumenCombinado.alumnos[0]&&expResumenCombinado.alumnos[0].notaApro)||11;

  let secciones='';
  const promsSubgrupos=[];
  nombres.forEach((nombreSgr,i)=>{
    const info=expSubgruposDetalle[nombreSgr];
    if(!info)return;
    const filasFiltradas=_filasConFiltroAlumno(info.filas);
    const {html, promSubgrupo}=_tablaSubgrupoHTML(nombreSgr, {base:info.base, extra:info.extra, filas:filasFiltradas}, apro);
    if(promSubgrupo!==null) promsSubgrupos.push(promSubgrupo);
    const pageBreak=i>0?'page-break-before:always;':'';
    secciones+=`<div style="${pageBreak}">${html}</div>`;
  });

  let seccionResumen='';
  if(promsSubgrupos.length>1){
    const promCurso=Math.round(promsSubgrupos.reduce((a,b)=>a+b,0)/promsSubgrupos.length*100)/100;
    seccionResumen=`<div style="margin-top:20px;padding:12px 16px;background:#f8faff;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid">
      <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Promedio Curso</span>
      <span style="font-family:monospace;font-size:18px;font-weight:800;color:#1d4ed8;margin-left:10px">${promCurso}</span>
    </div>`;
  }

  const htmlPDF=`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<title>Detalle de Subgrupos - ${expSelCurso}</title>
<style>
@page{size:A4;margin:15mm 14mm 18mm 14mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#0f172a}
.hdr-pdf{display:flex;align-items:center;gap:18px;padding-bottom:14px;border-bottom:2px solid #0a1628;margin-bottom:18px}
.logo-box{width:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.logo-box img{max-width:80px;max-height:70px;object-fit:contain}
.inst-info{flex:1}
.inst-univ{font-size:10px;font-weight:700;color:#0a1628;text-transform:uppercase;letter-spacing:.6px;line-height:1.6}
.inst-fac{font-size:9.5px;color:#334155;text-transform:uppercase;letter-spacing:.5px;line-height:1.6}
.inst-esc{font-size:9.5px;color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;line-height:1.6}
.titulo h1{font-size:15px;font-weight:800;color:#0a1628;margin-bottom:3px}
.titulo h2{font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:6px}
thead th{background:#0a1628;color:#fff;padding:7px 8px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.3px}
tbody tr:nth-child(even){background:#f8faff}tbody tr:nth-child(odd){background:#fff}
tbody td{border-bottom:1px solid #e2e8f0;vertical-align:middle}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr-pdf">
  <div class="logo-box"><img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'"></div>
  <div class="inst-info">
    ${instUniv?`<div class="inst-univ">${instUniv}</div>`:''}
    ${instFac?`<div class="inst-fac">${instFac}</div>`:''}
    ${instEsc?`<div class="inst-esc">${instEsc}</div>`:''}
  </div>
</div>
<div class="titulo">
  <h1>${expSelCurso}</h1>
  <h2>Detalle de atenciones por subgrupo &middot; ${fecha}</h2>
</div>
${secciones}
${seccionResumen}
<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

  _abrirVentanaImpresion(htmlPDF);
}

// ── EXPORTAR PANEL UNIFICADO: dispatcher único ────────────
function exportarSeleccion(){
  if(!expSelCurso||!expResumenCombinado||!expResumenCombinado.alumnos||!expResumenCombinado.alumnos.length){
    toast('Selecciona un curso primero','','warn');return;
  }
  if(expAlcance==='ciclo'){
    if(expFormato==='pdf') exportarPDF();
    else exportarResumenCursoXLSX();
    return;
  }
  const nombres=Object.keys(expSubgruposSeleccionados).filter(n=>expSubgruposSeleccionados[n]);
  if(!nombres.length){toast('Selecciona al menos un subgrupo','','warn');return;}
  if(expFormato==='pdf') exportarPDFSubgrupos(nombres);
  else exportarXLSXSubgrupos(nombres);
}
