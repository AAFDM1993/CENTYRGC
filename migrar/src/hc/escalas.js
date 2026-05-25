// Sistema de escalas clínicas: helpers, render y cálculo de 30+ escalas

function toggleEscalaBloque(id){
  var body = g('escala_body_'+id);
  var ico  = g('ico_escala_'+id);
  if(!body) return;
  var open = body.style.display!=='none';
  body.style.display = open ? 'none' : 'block';
  if(ico) ico.textContent = open ? '▶' : '▼';
}

function eliminarEscala(id, evt){
  if(evt) evt.stopPropagation();
  var bloque = g('escala_bloque_'+id);
  if(bloque) bloque.remove();
}

// ── Calcular y mostrar resultado ─────────────────────────────

function recalcularEscala(id){
  var def = _selEsc(id); if(!def) return;
  var res = def.calcular(id);
  if(!res) return;
  var divRes   = g('escala_resultado_'+id);
  var divPunt  = g('escala_puntaje_'+id);
  var divInterp= g('escala_interp_'+id);
  if(divRes) divRes.style.display='block';
  if(divPunt) divPunt.textContent = res.puntaje||'';
  if(divInterp){ divInterp.textContent = res.interpretacion||''; divInterp.style.color=res.color||'var(--tx2)'; }
}

// ── Leer todas las escalas para guardar ─────────────────────

function leerEscalasForm(){
  var resultado = {};
  ESCALAS_CATALOGO.forEach(function(def){
    var bloque = g('escala_bloque_'+def.id);
    if(!bloque) return;
    var fechaEl = g('escala_fecha_'+def.id);
    var items = _leerItemsEscala(def.id);
    var calc  = def.calcular(def.id);
    resultado[def.id] = Object.assign({
      fechaAplicacion: fechaEl ? fechaEl.value : '',
      puntajeTotal: calc ? calc.puntajeRaw : null,
      interpretacion: calc ? calc.interpretacion : '',
    }, items);
  });
  return resultado;
}

function _leerItemsEscala(id){
  var items = {};
  var bloque = g('escala_bloque_'+id); if(!bloque) return items;
  bloque.querySelectorAll('[data-escala-item]').forEach(function(el){
    var k = el.getAttribute('data-escala-item');
    items[k] = el.type==='checkbox' ? el.checked : el.value;
  });
  return { items: items };
}

// ── Display de escalas guardadas (evalCard expandible) ────────

// Mapa global para pasar datos de escalas al modal sin inyectar JSON en onclick
var _escalaDataStore = {};

function displayEscalasResumen(escalas){
  if(!escalas || !Object.keys(escalas).length) return '';
  var html = '<div style="margin-top:12px;border-top:1px solid var(--bd);padding-top:12px">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--tx4);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Escalas aplicadas</div>';
  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  Object.keys(escalas).forEach(function(eid){
    var def = _selEsc(eid);
    var datos = escalas[eid];
    if(typeof datos === 'string'){ try{ datos = JSON.parse(datos); } catch(ex){ datos = {}; } }
    if(!datos) return;
    // Guardar en store global para acceder desde onclick sin JSON inline
    _escalaDataStore[eid] = datos;
    var nombre = def ? def.nombre : eid.replace(/_/g,' ');
    var puntaje = datos.puntajeTotal !== null && datos.puntajeTotal !== undefined ? datos.puntajeTotal : '—';
    var interp  = datos.interpretacion || '';
    var fecha   = datos.fechaAplicacion ? ' · ' + formatFechaCorta(datos.fechaAplicacion) : '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:var(--surf3);border-radius:8px">';
    html += '<div style="flex:1;min-width:0">';
    html += '<span style="font-size:12px;font-weight:700;color:var(--tx)">'+e2(nombre)+'</span>';
    html += '<span style="font-size:11px;color:var(--tx4)">'+e2(fecha)+'</span>';
    if(interp) html += '<div style="font-size:11px;color:var(--tx3);margin-top:1px">'+e2(interp)+'</div>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">';
    html += '<span style="font-size:14px;font-weight:800;color:var(--n700)">'+e2(String(puntaje))+'</span>';
    // Botón 📄 usa data-eid para evitar problemas de comillas en onclick
    html += '<button class="btn btn-ghost btn-sm" style="padding:3px 8px;font-size:11px" data-eid="'+e2(eid)+'" onclick="verDetalleEscala(this.getAttribute(\'data-eid\'))">📄</button>';
    html += '</div></div>';
  });
  html += '</div></div>';
  return html;
}

function verDetalleEscala(eid){
  var datos = _escalaDataStore[eid];
  if(!datos){ toast('No se encontraron datos de la escala','','warn'); return; }
  if(typeof datos === 'string'){ try{ datos = JSON.parse(datos); } catch(ex){ datos = {}; } }
  var def = _selEsc(eid);
  var m = g('modalDetalleEscala'); if(!m) return;
  g('modalDetalleEscalaTit').textContent = def ? def.nombre : eid.replace(/_/g,' ');
  var body = g('modalDetalleEscalaBody');
  var html = '';
  // Fecha y resultado
  html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;padding:12px;background:var(--surf3);border-radius:10px">';
  if(datos.fechaAplicacion) html += '<div><div style="font-size:10px;color:var(--tx4);font-weight:700">FECHA</div><div style="font-size:13px">'+e2(formatFechaCorta(datos.fechaAplicacion))+'</div></div>';
  if(datos.puntajeTotal!==null && datos.puntajeTotal!==undefined) html += '<div><div style="font-size:10px;color:var(--tx4);font-weight:700">PUNTAJE</div><div style="font-size:18px;font-weight:800;color:var(--n700)">'+datos.puntajeTotal+'</div></div>';
  if(datos.interpretacion) html += '<div><div style="font-size:10px;color:var(--tx4);font-weight:700">INTERPRETACIÓN</div><div style="font-size:13px;font-weight:600">'+e2(datos.interpretacion)+'</div></div>';
  html += '</div>';
  // Ítems individuales
  if(datos.items && Object.keys(datos.items).length){
    html += '<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:8px">Ítems registrados</div>';
    html += '<div style="display:flex;flex-direction:column;gap:4px">';
    Object.keys(datos.items).forEach(function(k){
      var v = datos.items[k];
      if(v===''||v===null||v===undefined||v===false) return;
      html += '<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--surf2);border-radius:6px;font-size:12px">';
      html += '<span style="color:var(--tx3)">'+e2(k.replace(/_/g,' ').replace(/\s*\([^)]*\)/g,''))+'</span>';
      html += '<span style="font-weight:700;color:var(--tx)">'+e2(String(v))+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }
  body.innerHTML = html;
  m.style.display = 'flex';
}

function cerrarModalDetalleEscala(){
  var m = g('modalDetalleEscala'); if(m) m.style.display='none';
}

// ── Helper: select genérico para ítems ──────────────────────

function _selItem(id, opciones, valGuardado, label){
  var val = (valGuardado!==undefined && valGuardado!==null) ? valGuardado : '';
  var html = '<div style="margin-bottom:8px">';
  if(label) html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:3px">'+label+'</div>';
  html += '<select class="sel" data-escala-item="'+id+'" onchange="recalcularEscala(\''+id.split('_')[0]+'\')" style="font-size:12px">';
  html += '<option value=""></option>';
  opciones.forEach(function(op){
    html += '<option value="'+op.v+'" '+(String(val)===String(op.v)?'selected':'')+'>'+e2(op.l)+'</option>';
  });
  html += '</select></div>';
  return html;
}

function _numItem(escId, itemId, valGuardado, label, min, max, ph){
  var val = (valGuardado!==undefined && valGuardado!==null) ? valGuardado : '';
  return '<div style="margin-bottom:8px">'
    +(label?'<div style="font-size:11px;color:var(--tx3);margin-bottom:3px">'+label+'</div>':'')
    +'<input type="number" class="inp" data-escala-item="'+itemId+'" value="'+val+'" min="'+(min||0)+'" max="'+(max||999)+'" placeholder="'+(ph||'')+'" style="max-width:120px;font-size:12px" oninput="recalcularEscala(\''+escId+'\')">'
    +'</div>';
}


// ══════════════════════════════════════════════════════════════
// SECCIÓN C: RENDER + CÁLCULO DE CADA ESCALA
// ══════════════════════════════════════════════════════════════

// ── EVA ──────────────────────────────────────────────────────
function renderEscalaEVA(d){
  var v = d&&d.items ? (d.items.valor||0) : 0;
  return '<div style="padding:8px 0">'
    +'<label style="font-size:12px;color:var(--tx3)">Valor de dolor percibido (0 = sin dolor, 10 = máximo dolor)</label>'
    +'<div style="display:flex;align-items:center;gap:12px;margin-top:8px">'
    +'<div class="eva-track" style="flex:1;position:relative"><input type="range" class="eva-sl" data-escala-item="valor" min="0" max="10" step="1" value="'+v+'" oninput="g(\'eva_disp\').textContent=this.value;recalcularEscala(\'eva\')"></div>'
    +'<div class="eva-val" id="eva_disp">'+v+'</div>'
    +'</div></div>';
}
function calcularEVA(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="valor"]'); if(!el) return null;
  var v=Number(el.value);
  var interp = v<=2?'Sin dolor o mínimo':v<=4?'Dolor leve':v<=6?'Dolor moderado':v<=8?'Dolor intenso':'Dolor insoportable';
  var color  = v<=2?'var(--green)':v<=4?'#65a30d':v<=6?'var(--amber)':v<=8?'#ea580c':'var(--red)';
  return {puntaje: v+'/10', puntajeRaw: v, interpretacion: interp, color: color};
}

// ── BORG ─────────────────────────────────────────────────────
function renderEscalaBorg(d){
  var v = d&&d.items ? (d.items.nivel||'') : '';
  var ops=[{v:'0',l:'0 — Ninguno'},{v:'0.5',l:'0.5 — Muy, muy leve'},{v:'1',l:'1 — Muy leve'},
    {v:'2',l:'2 — Leve'},{v:'3',l:'3 — Moderado'},{v:'4',l:'4 — Algo intenso'},
    {v:'5',l:'5 — Intenso'},{v:'6',l:'6'},{v:'7',l:'7 — Muy intenso'},
    {v:'8',l:'8'},{v:'9',l:'9 — Muy, muy intenso'},{v:'10',l:'10 — Máximo'}];
  return _selItem('borg_nivel', ops, v, 'Nivel de esfuerzo percibido');
}
function calcularBorg(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="borg_nivel"]'); if(!el||!el.value) return null;
  var v=Number(el.value);
  var interp = v<=2?'Esfuerzo muy leve':v<=4?'Esfuerzo leve a moderado':v<=6?'Esfuerzo moderado a intenso':v<=8?'Esfuerzo muy intenso':'Esfuerzo máximo';
  return {puntaje: v+'/10', puntajeRaw: v, interpretacion: interp};
}

// ── BERG (14 ítems × 0-4) ────────────────────────────────────
function renderEscalaBerg(d){
  var items_d = d&&d.items ? d.items : {};
  var items = [
    'Sedestación a bipedestación','Bipedestación sin apoyo','Sedestación sin apoyo (2 min)',
    'Bipedestación a sedestación','Transferencias','Bipedestación ojos cerrados',
    'Bipedestación pies juntos','Alcance hacia delante con brazo extendido','Recoger objeto del suelo',
    'Girar a mirar atrás (derecha e izquierda)','Girar 360&deg;','Escalón alternado (8 veces)',
    'Bipedestación tándem','Apoyo monopodal'
  ];
  var ops=[{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'}];
  var html='<div style="display:grid;gap:6px">';
  items.forEach(function(it,i){
    var key='item'+i;
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;color:var(--tx);flex:1">'+e2((i+1)+'. '+it)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'berg\')" style="width:70px;font-size:12px;padding:4px 6px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularBerg(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var els=b.querySelectorAll('[data-escala-item]');
  var suma=0, count=0;
  els.forEach(function(el){ if(el.value!==''){suma+=Number(el.value);count++;} });
  if(!count) return null;
  var interp = suma>=45?'Bajo riesgo de caída':suma>=36?'Riesgo moderado de caída':'Alto riesgo de caída';
  var color  = suma>=45?'var(--green)':suma>=36?'var(--amber)':'var(--red)';
  return {puntaje: suma+'/56', puntajeRaw: suma, interpretacion: interp, color: color};
}

// ── TUG ──────────────────────────────────────────────────────
function renderEscalaTUG(d){
  var v = d&&d.items ? (d.items.segundos||'') : '';
  return _numItem('tug','segundos',v,'Tiempo registrado (segundos)',0,300,'ej: 12.5');
}
function calcularTUG(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="segundos"]'); if(!el||!el.value) return null;
  var v=Number(el.value);
  var interp = v<10?'Independencia completa, bajo riesgo':v<12?'Independencia, riesgo bajo-moderado':v<20?'Dependencia variable, riesgo moderado de caída':v<30?'Dependencia leve, alto riesgo de caída':'Alta dependencia, muy alto riesgo de caída';
  var color  = v<10?'var(--green)':v<12?'#65a30d':v<20?'var(--amber)':'var(--red)';
  return {puntaje: v+' seg', puntajeRaw: v, interpretacion: interp, color: color};
}

// ── SIT-TO-STAND 30s ─────────────────────────────────────────
function renderEscalaSTS30(d){
  var v = d&&d.items ? (d.items.repeticiones||'') : '';
  var edad = d&&d.items ? (d.items.edad||'') : '';
  var sexo = d&&d.items ? (d.items.sexo||'') : '';
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +_numItem('sts30','repeticiones',v,'Repeticiones completadas',0,60,'N&deg;')
    +_numItem('sts30','edad',edad,'Edad del paciente (años)',18,120,'años')
    +'<div>'+_selItem('sts30_sexo',[{v:'M',l:'Masculino'},{v:'F',l:'Femenino'}],sexo,'Sexo')+'</div>'
    +'</div>';
}
function calcularSTS30(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var rEl=b.querySelector('[data-escala-item="repeticiones"]'); if(!rEl||!rEl.value) return null;
  var rep=Number(rEl.value);
  // Norma simplificada por edad/sexo (60-64 años como referencia base)
  return {puntaje: rep+' reps', puntajeRaw: rep, interpretacion: 'Ver tabla normativa por edad y sexo'};
}

// ── 6MWT ─────────────────────────────────────────────────────
function renderEscala6MWT(d){
  var items_d = d&&d.items ? d.items : {};
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +_numItem('sixmwt','distancia',items_d.distancia||'','Distancia recorrida (metros)',0,1000,'metros')
    +_numItem('sixmwt','fc_pre',items_d.fc_pre||'','FC pre-test (lpm)',0,250,'lpm')
    +_numItem('sixmwt','fc_post',items_d.fc_post||'','FC post-test (lpm)',0,250,'lpm')
    +_numItem('sixmwt','spo2_pre',items_d.spo2_pre||'','SpO₂ pre (%)',0,100,'%')
    +_numItem('sixmwt','spo2_post',items_d.spo2_post||'','SpO₂ post (%)',0,100,'%')
    +'<div>'+_selItem('sixmwt_borg_post',[{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5'},{v:'6',l:'6'},{v:'7',l:'7'},{v:'8',l:'8'},{v:'9',l:'9'},{v:'10',l:'10'}],items_d.borg_post||'','Borg al finalizar')+'</div>'
    +'</div>';
}
function calcular6MWT(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var dEl=b.querySelector('[data-escala-item="distancia"]'); if(!dEl||!dEl.value) return null;
  var dist=Number(dEl.value);
  // Referencia simplificada: >450m=bueno, 300-450=moderado, <300=limitado
  var interp = dist>=450?'Capacidad funcional conservada':dist>=300?'Capacidad funcional moderadamente reducida':'Capacidad funcional severamente reducida';
  var color  = dist>=450?'var(--green)':dist>=300?'var(--amber)':'var(--red)';
  return {puntaje: dist+' m', puntajeRaw: dist, interpretacion: interp, color: color};
}

// ── BARTHEL (10 ítems) ───────────────────────────────────────
// ── NIHSS ─────────────────────────────────────────────────────
function renderEscalaNIHSS(d){
  var items_d = d&&d.items ? d.items : {};
  var items = [
    {k:'1a_conciencia', l:'1a. Nivel de conciencia',     ops:[{v:0,l:'0 — Alerta'},{v:1,l:'1 — Somnoliento'},{v:2,l:'2 — Estuporoso'},{v:3,l:'3 — Coma'}]},
    {k:'1b_preguntas',  l:'1b. Preguntas de orientación', ops:[{v:0,l:'0 — Ambas correctas'},{v:1,l:'1 — Una correcta'},{v:2,l:'2 — Ninguna'}]},
    {k:'1c_ordenes',    l:'1c. Respuesta a órdenes',      ops:[{v:0,l:'0 — Ambas'},{v:1,l:'1 — Una'},{v:2,l:'2 — Ninguna'}]},
    {k:'2_mirada',      l:'2. Mirada',                    ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Parálisis parcial'},{v:2,l:'2 — Desviación forzada'}]},
    {k:'3_visual',      l:'3. Campos visuales',           ops:[{v:0,l:'0 — Sin pérdida'},{v:1,l:'1 — Hemianopsia parcial'},{v:2,l:'2 — Hemianopsia completa'},{v:3,l:'3 — Ceguera bilateral'}]},
    {k:'4_facial',      l:'4. Paresia facial',            ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Leve'},{v:2,l:'2 — Parcial'},{v:3,l:'3 — Completa'}]},
    {k:'5a_motor_mi_d', l:'5a. Motor MMSS D',             ops:[{v:0,l:'0 — Sin caída'},{v:1,l:'1 — Cae antes de 10s'},{v:2,l:'2 — Esfuerzo contra gravedad'},{v:3,l:'3 — Sin esfuerzo'},{v:4,l:'4 — Sin movimiento'}]},
    {k:'5b_motor_mi_i', l:'5b. Motor MMSS I',             ops:[{v:0,l:'0 — Sin caída'},{v:1,l:'1 — Cae antes de 10s'},{v:2,l:'2 — Esfuerzo contra gravedad'},{v:3,l:'3 — Sin esfuerzo'},{v:4,l:'4 — Sin movimiento'}]},
    {k:'6a_motor_ii_d', l:'6a. Motor MMII D',             ops:[{v:0,l:'0 — Sin caída'},{v:1,l:'1 — Cae antes de 5s'},{v:2,l:'2 — Esfuerzo contra gravedad'},{v:3,l:'3 — Sin esfuerzo'},{v:4,l:'4 — Sin movimiento'}]},
    {k:'6b_motor_ii_i', l:'6b. Motor MMII I',             ops:[{v:0,l:'0 — Sin caída'},{v:1,l:'1 — Cae antes de 5s'},{v:2,l:'2 — Esfuerzo contra gravedad'},{v:3,l:'3 — Sin esfuerzo'},{v:4,l:'4 — Sin movimiento'}]},
    {k:'7_ataxia',      l:'7. Ataxia de extremidades',    ops:[{v:0,l:'0 — Ausente'},{v:1,l:'1 — En 1 extremidad'},{v:2,l:'2 — En 2 extremidades'}]},
    {k:'8_sensibilidad',l:'8. Sensibilidad',              ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Pérdida leve-moderada'},{v:2,l:'2 — Pérdida grave'}]},
    {k:'9_lenguaje',    l:'9. Mejor lenguaje',            ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Afasia leve-moderada'},{v:2,l:'2 — Afasia grave'},{v:3,l:'3 — Mudo/global'}]},
    {k:'10_disartria',  l:'10. Disartria',                ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Leve-moderada'},{v:2,l:'2 — Grave'}]},
    {k:'11_extincion',  l:'11. Extinción/inatención',     ops:[{v:0,l:'0 — Normal'},{v:1,l:'1 — Inatención en 1 modalidad'},{v:2,l:'2 — Inatención grave'}]},
  ];
  var html = '<div style="display:grid;gap:5px">';
  items.forEach(function(it){
    var val = items_d[it.k]!==undefined ? String(items_d[it.k]) : '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--surf3);border-radius:7px">';
    html += '<span style="font-size:11px;flex:1;color:var(--tx2)">'+it.l+'</span>';
    html += '<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'nihss\')" style="font-size:11px;min-width:220px"><option value=""></option>';
    it.ops.forEach(function(o){ html += '<option value="'+o.v+'"'+(val===String(o.v)?' selected':'')+'>'+o.l+'</option>'; });
    html += '</select></div>';
  });
  return html + '</div>';
}
function calcularNIHSS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var keys=['1a_conciencia','1b_preguntas','1c_ordenes','2_mirada','3_visual','4_facial','5a_motor_mi_d','5b_motor_mi_i','6a_motor_ii_d','6b_motor_ii_i','7_ataxia','8_sensibilidad','9_lenguaje','10_disartria','11_extincion'];
  var total=0, filled=0;
  keys.forEach(function(k){
    var el=b.querySelector('[data-escala-item="'+k+'"]'); if(!el||el.value==='') return;
    total+=parseFloat(el.value)||0; filled++;
  });
  if(!filled) return null;
  var interp=total===0?'Sin déficit':total<=4?'Déficit leve':total<=15?'Déficit moderado':total<=20?'Déficit moderado-grave':total<=25?'Déficit grave':'Muy grave';
  var color=total===0?'var(--green)':total<=4?'#16a34a':total<=15?'var(--amber)':total<=20?'#ea580c':'var(--red)';
  return {puntaje:total+'/42', puntajeRaw:total, interpretacion:interp, color};
}

// ── HOEHN & YAHR ──────────────────────────────────────────────
function renderEscalaHoehnYahr(d){
  var items_d = d&&d.items ? d.items : {};
  var estadios=[
    {v:'1',  l:'1 — Unilateral, sin incapacidad funcional'},
    {v:'1.5',l:'1.5 — Unilateral con afectación axial'},
    {v:'2',  l:'2 — Bilateral, sin alteración del equilibrio'},
    {v:'2.5',l:'2.5 — Bilateral leve, recupera en jalón'},
    {v:'3',  l:'3 — Bilateral, inestabilidad postural, independiente'},
    {v:'4',  l:'4 — Incapacidad grave, aún puede caminar solo'},
    {v:'5',  l:'5 — Silla de ruedas o cama sin ayuda'},
  ];
  var val=items_d.estadio||'';
  var html='<div style="display:grid;gap:8px">';
  html+='<div><label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Estadio Hoehn & Yahr</label>';
  html+='<select class="sel" data-escala-item="estadio" onchange="recalcularEscala(\'hoehn_yahr\')" style="width:100%;margin-top:6px"><option value=""></option>';
  estadios.forEach(function(e){ html+='<option value="'+e.v+'"'+(val===e.v?' selected':'')+'>'+e.l+'</option>'; });
  html+='</select></div>';
  html+='<div><label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Observaciones</label>';
  html+='<textarea class="ta" data-escala-item="obs" rows="2" placeholder="Fluctuaciones, respuesta a medicación..." style="margin-top:6px">'+e2(items_d.obs||'')+'</textarea></div></div>';
  return html;
}
function calcularHoehnYahr(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var est=(b.querySelector('[data-escala-item="estadio"]')||{}).value||'';
  if(!est) return null;
  var interpMap={'1':'Afectación unilateral — mínima discapacidad','1.5':'Afectación unilateral con axial — leve','2':'Bilateral sin alteración de equilibrio','2.5':'Bilateral leve — responde al jalón','3':'Bilateral con inestabilidad postural — independiente','4':'Discapacidad grave — aún deambula solo','5':'Dependencia total'};
  var colorMap={'1':'var(--green)','1.5':'var(--green)','2':'#16a34a','2.5':'var(--amber)','3':'var(--amber)','4':'#ea580c','5':'var(--red)'};
  return {puntaje:'Estadio '+est, puntajeRaw:parseFloat(est), interpretacion:interpMap[est]||'', color:colorMap[est]||'var(--tx3)'};
}

// ── EDSS — ESCLEROSIS MÚLTIPLE ────────────────────────────────
function renderEscalaEDSS(d){
  var items_d = d&&d.items ? d.items : {};
  var niveles=[
    {v:'0',  l:'0.0 — Exploración neurológica normal'},
    {v:'1',  l:'1.0 — Sin discapacidad, signos mínimos'},
    {v:'1.5',l:'1.5 — Sin discapacidad, signos mínimos en >1 FS'},
    {v:'2',  l:'2.0 — Discapacidad mínima en 1 FS'},
    {v:'2.5',l:'2.5 — Discapacidad mínima en 2 FS'},
    {v:'3',  l:'3.0 — Discapacidad moderada en 1 FS, deambula sin limitación'},
    {v:'3.5',l:'3.5 — Deambula sin limitación, discapacidad moderada en 1 FS + leve en otros'},
    {v:'4',  l:'4.0 — Deambula >500 m sin ayuda'},
    {v:'4.5',l:'4.5 — Deambula >300 m sin ayuda'},
    {v:'5',  l:'5.0 — Deambula ~200 m sin ayuda'},
    {v:'5.5',l:'5.5 — Deambula ~100 m sin ayuda'},
    {v:'6',  l:'6.0 — Ayuda unilateral para caminar 100 m'},
    {v:'6.5',l:'6.5 — Ayuda bilateral para caminar 20 m'},
    {v:'7',  l:'7.0 — Silla de ruedas — traslada solo'},
    {v:'7.5',l:'7.5 — Silla de ruedas — traslada con ayuda'},
    {v:'8',  l:'8.0 — Encamado, usa brazos, cuida de sí mismo'},
    {v:'8.5',l:'8.5 — Encamado, usa brazos parcialmente'},
    {v:'9',  l:'9.0 — Encamado, se comunica'},
    {v:'9.5',l:'9.5 — Completamente dependiente'},
    {v:'10', l:'10.0 — Muerte por EM'},
  ];
  var val=items_d.nivel||'';
  var sistemas=['Piramidal','Cerebeloso','Troncoencefálico','Sensitivo','Vesical/intestinal','Visual','Cerebral/Mental'];
  var selSis=items_d.sistema_func||'';
  var html='<div style="display:grid;gap:8px">';
  html+='<div><label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Puntuación EDSS</label>';
  html+='<select class="sel" data-escala-item="nivel" onchange="recalcularEscala(\'edss\')" style="width:100%;margin-top:6px"><option value=""></option>';
  niveles.forEach(function(n){ html+='<option value="'+n.v+'"'+(val===n.v?' selected':'')+'>'+n.l+'</option>'; });
  html+='</select></div>';
  html+='<div><label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Sistema funcional con mayor compromiso</label>';
  html+='<select class="sel" data-escala-item="sistema_func" style="width:100%;margin-top:6px"><option value=""></option>';
  sistemas.forEach(function(s){ html+='<option'+(selSis===s?' selected':'')+'>'+s+'</option>'; });
  html+='</select></div>';
  html+='<div><label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Observaciones</label>';
  html+='<textarea class="ta" data-escala-item="obs" rows="2" placeholder="Brotes recientes, tratamiento actual..." style="margin-top:6px">'+e2(items_d.obs||'')+'</textarea></div></div>';
  return html;
}
function calcularEDSS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var nivel=(b.querySelector('[data-escala-item="nivel"]')||{}).value||'';
  if(!nivel) return null;
  var n=parseFloat(nivel);
  var interp=n<=1.5?'Sin discapacidad':n<=3.5?'Discapacidad leve — deambulación conservada':n<=5.5?'Discapacidad moderada — deambulación limitada':n<=7?'Discapacidad grave — ayuda para caminar':n<=8.5?'Muy grave — encamado':n<10?'Dependencia total':'Muerte por EM';
  var color=n<=1.5?'var(--green)':n<=3.5?'#16a34a':n<=5.5?'var(--amber)':n<=7?'#ea580c':'var(--red)';
  return {puntaje:'EDSS '+nivel, puntajeRaw:n, interpretacion:interp, color};
}

// ── GDS-15 — DEPRESIÓN GERIÁTRICA ─────────────────────────────
function renderEscalaGDS15(d){
  var pregs=[
    '¿Está satisfecho/a con su vida?','¿Ha abandonado actividades que le interesaban?',
    '¿Siente que su vida está vacía?','¿Se siente aburrido/a?',
    '¿Tiene esperanza en el futuro?','¿Tiene pensamientos que le molestan?',
    '¿Está de buen ánimo la mayor parte del tiempo?','¿Tiene miedo de que algo malo le vaya a pasar?',
    '¿Se siente feliz la mayor parte del tiempo?','¿Se siente a veces desamparado/a?',
    '¿Se siente a veces inquieto/a o intranquilo/a?','¿Prefiere quedarse en casa en lugar de salir?',
    '¿Está preocupado/a por el futuro?','¿Cree que tiene más problemas de memoria que la mayoría?',
    '¿Cree que es maravilloso estar vivo/a?'
  ];
  var html='<div class="esc-grid">';
  pregs.forEach(function(p,i){
    var val=d&&d['gds'+(i+1)];
    html+='<div style="padding:8px 0;border-bottom:1px solid var(--bd2)">';
    html+='<div style="font-size:12px;color:var(--tx2);margin-bottom:5px">'+(i+1)+'. '+p+'</div>';
    html+='<div style="display:flex;gap:10px">';
    ['Sí','No'].forEach(function(op){
      html+='<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;font-weight:600">';
      html+='<input type="radio" name="gds'+(i+1)+'" value="'+op+'" '+(val===op?'checked':'')+' onchange="calcularGDS15()" style="accent-color:var(--n500)">';
      html+=op+'</label>';
    });
    html+='</div></div>';
  });
  html+='</div><div id="gds15Result" style="margin-top:10px;padding:10px;background:var(--surf3);border-radius:8px;font-size:13px;font-weight:700"></div>';
  return html;
}
function calcularGDS15(){
  var puntaConSi=[1,2,3,4,6,8,10,11,12,13];
  var puntaConNo=[5,7,9,15];
  var total=0;
  for(var i=1;i<=15;i++){
    var el=document.querySelector('input[name="gds'+i+'"]:checked');
    if(!el) continue;
    if(puntaConSi.indexOf(i)>=0 && el.value==='Sí') total++;
    if(puntaConNo.indexOf(i)>=0 && el.value==='No') total++;
  }
  var interp=total<=4?'Normal (sin depresión)':total<=8?'Depresión leve':total<=11?'Depresión moderada':'Depresión grave';
  var res=document.getElementById('gds15Result');
  if(res) res.textContent='Puntuación: '+total+'/15 — '+interp;
}

function renderEscalaBarthel(d){
  var items_d = d&&d.items ? d.items : {};
  var config = [
    {k:'comida',     l:'Alimentación',           ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Necesita ayuda'},{v:10,l:'10 — Independiente'}]},
    {k:'bano',       l:'Baño/ducha',              ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Independiente'}]},
    {k:'aseo',       l:'Aseo personal',           ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Independiente'}]},
    {k:'vestido',    l:'Vestido',                 ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Necesita ayuda'},{v:10,l:'10 — Independiente'}]},
    {k:'intestino',  l:'Control intestinal',      ops:[{v:0,l:'0 — Incontinente'},{v:5,l:'5 — Accidente ocasional'},{v:10,l:'10 — Continente'}]},
    {k:'vejiga',     l:'Control vesical',         ops:[{v:0,l:'0 — Incontinente'},{v:5,l:'5 — Accidente ocasional'},{v:10,l:'10 — Continente'}]},
    {k:'wc',         l:'Uso del WC',              ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Necesita ayuda'},{v:10,l:'10 — Independiente'}]},
    {k:'transfer',   l:'Traslado silla-cama',     ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Gran ayuda'},{v:10,l:'10 — Mínima ayuda'},{v:15,l:'15 — Independiente'}]},
    {k:'deambulacion',l:'Deambulación',           ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — En silla de ruedas'},{v:10,l:'10 — Necesita ayuda'},{v:15,l:'15 — Independiente'}]},
    {k:'escaleras',  l:'Subir/bajar escaleras',   ops:[{v:0,l:'0 — Dependiente'},{v:5,l:'5 — Necesita ayuda'},{v:10,l:'10 — Independiente'}]},
  ];
  var html='<div style="display:grid;gap:5px">';
  config.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;color:var(--tx);flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'barthel\')" style="font-size:12px;padding:4px 6px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularBarthel(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var els=b.querySelectorAll('[data-escala-item]');
  var suma=0, count=0;
  els.forEach(function(el){ if(el.value!==''){suma+=Number(el.value);count++;} });
  if(!count) return null;
  var interp = suma>=91?'Independencia total':suma>=61?'Dependencia leve':suma>=41?'Dependencia moderada':suma>=21?'Dependencia grave':'Dependencia total';
  var color  = suma>=91?'var(--green)':suma>=61?'#65a30d':suma>=41?'var(--amber)':'var(--red)';
  return {puntaje: suma+'/100', puntajeRaw: suma, interpretacion: interp, color: color};
}

// ── ASHWORTH MODIFICADA ──────────────────────────────────────
function renderEscalaAshworth(d){
  var items_d = d&&d.items ? d.items : {};
  var segmentos=['Flexores codo D','Extensores codo D','Flexores codo I','Extensores codo I',
    'Flexores muñeca D','Flexores muñeca I','Flexores cadera D','Extensores cadera D',
    'Flexores cadera I','Extensores cadera I','Cuádriceps D','Isquiotibiales D',
    'Cuádriceps I','Isquiotibiales I','Tríceps sural D','Tríceps sural I'];
  var ops=[{v:'0',l:'0 — Sin aumento del tono'},{v:'1',l:'1 — Leve al inicio del mov.'},{v:'1+',l:'1+ — Leve en menos de mitad'},{v:'2',l:'2 — Marcado, mov. pasivo fácil'},{v:'3',l:'3 — Considerable, mov. difícil'},{v:'4',l:'4 — Rígido en flex/ext'}];
  var html='<div style="display:grid;gap:5px">';
  segmentos.forEach(function(seg){
    var key=seg.replace(/\s/g,'_');
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(seg)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'ashworth\')" style="font-size:11px;padding:3px 4px;max-width:210px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularAshworth(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var count=0, positivos=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){
    if(el.value&&el.value!=='0'){positivos++;} if(el.value) count++;
  });
  if(!count) return null;
  return {puntaje: positivos+' seg. con tono elevado', puntajeRaw: positivos, interpretacion: 'Ver detalle por segmento'};
}

// ── MRC DISNEA ───────────────────────────────────────────────
function renderEscalaMRC(d){
  var v = d&&d.items ? (d.items.grado||'') : '';
  var ops=[
    {v:'0',l:'0 — Sin disnea, salvo ejercicio intenso'},
    {v:'1',l:'1 — Disnea al subir pendientes o escaleras rápido'},
    {v:'2',l:'2 — Camina más despacio que personas de su edad'},
    {v:'3',l:'3 — Se detiene al caminar 100m o tras pocos minutos'},
    {v:'4',l:'4 — No puede salir de casa, disnea al vestirse'},
  ];
  return _selItem('mrc_disnea_grado', ops, v, 'Grado de disnea');
}
function calcularMRC(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="mrc_disnea_grado"]'); if(!el||!el.value) return null;
  var v=Number(el.value);
  var interp=['Sin limitación funcional significativa','Limitación leve','Limitación moderada','Limitación grave','Limitación muy grave'][v];
  var color = v<=1?'var(--green)':v<=2?'var(--amber)':'var(--red)';
  return {puntaje: 'Grado '+v+'/4', puntajeRaw: v, interpretacion: interp, color: color};
}

// ── NYHA ─────────────────────────────────────────────────────
function renderEscalaNYHA(d){
  var v = d&&d.items ? (d.items.clase||'') : '';
  var ops=[
    {v:'I',  l:'Clase I — Sin limitación de actividad física'},
    {v:'II', l:'Clase II — Leve limitación, síntomas con esfuerzo moderado'},
    {v:'III',l:'Clase III — Marcada limitación, síntomas con mínimo esfuerzo'},
    {v:'IV', l:'Clase IV — Incapacidad de actividad, síntomas en reposo'},
  ];
  return _selItem('nyha_clase', ops, v, 'Clase funcional NYHA');
}
function calcularNYHA(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="nyha_clase"]'); if(!el||!el.value) return null;
  var m={I:'Limitación mínima',II:'Limitación leve',III:'Limitación marcada',IV:'Limitación severa'};
  var c={I:'var(--green)',II:'var(--amber)',III:'#ea580c',IV:'var(--red)'};
  return {puntaje: 'Clase '+el.value, puntajeRaw: el.value, interpretacion: m[el.value]||'', color: c[el.value]||''};
}

// ── ESPIROMETRÍA ─────────────────────────────────────
function renderEscalaEspirometria(d){
  var items_d = d&&d.items ? d.items : {};
  var html = '<div style="display:grid;gap:10px">';
  html += _numItem('espirometria','pef',  items_d.pef||'',  'PEF — Flujo espiratorio pico (L/min)', 0, 900,  'L/min');
  html += _numItem('espirometria','fvc',  items_d.fvc||'',  'FVC — Capacidad vital forzada (L)',    0, 10,   'L');
  html += _numItem('espirometria','fev1', items_d.fev1||'', 'FEV1 — Volumen espiratorio forzado 1s (L)', 0, 10, 'L');
  html += _numItem('espirometria','fev1fvc', items_d.fev1fvc||'', 'FEV1/FVC — Índice de Tiffeneau (%)', 0, 100, '%');
  html += '</div>';
  html += '<div style="margin-top:12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;background:var(--surf3);border-radius:8px">';
  html += '<span style="font-size:11px;color:var(--tx3);font-weight:600">Interpretación orientativa:</span>';
  html += '<span style="font-size:11px;background:var(--green2);color:var(--green);border-radius:6px;padding:2px 8px">FEV1/FVC ≥70% Normal</span>';
  html += '<span style="font-size:11px;background:var(--amber2);color:var(--amber);border-radius:6px;padding:2px 8px">FEV1/FVC &lt;70% Obstructivo</span>';
  html += '<span style="font-size:11px;background:var(--red2);color:var(--red);border-radius:6px;padding:2px 8px">FVC &lt;80% pred. Restrictivo</span>';
  html += '</div>';
  return html;
}
function calcularEspirometria(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var pef   = parseFloat(b.querySelector('[data-escala-item="pef"]')?.value||'');
  var fvc   = parseFloat(b.querySelector('[data-escala-item="fvc"]')?.value||'');
  var fev1  = parseFloat(b.querySelector('[data-escala-item="fev1"]')?.value||'');
  var ratio = parseFloat(b.querySelector('[data-escala-item="fev1fvc"]')?.value||'');
  if(isNaN(fev1) && isNaN(fvc) && isNaN(ratio) && isNaN(pef)) return null;
  var interp = 'Sin datos suficientes', color = 'var(--tx3)';
  if(!isNaN(ratio) && !isNaN(fvc)){
    if(ratio >= 70 && fvc >= 80){ interp='Normal'; color='var(--green)'; }
    else if(ratio < 70 && fvc >= 80){ interp='Patrón obstructivo'; color='var(--amber)'; }
    else if(ratio >= 70 && fvc < 80){ interp='Patrón restrictivo'; color='#ea580c'; }
    else { interp='Patrón mixto (obstructivo + restrictivo)'; color='var(--red)'; }
  } else if(!isNaN(ratio)){
    interp = ratio>=70 ? 'FEV1/FVC normal (≥70%)' : 'FEV1/FVC bajo (<70%) — posible obstrucción';
    color  = ratio>=70 ? 'var(--green)' : 'var(--amber)';
  }
  var resumen = [];
  if(!isNaN(pef))   resumen.push('PEF: '+pef+' L/min');
  if(!isNaN(fvc))   resumen.push('FVC: '+fvc+' L');
  if(!isNaN(fev1))  resumen.push('FEV1: '+fev1+' L');
  if(!isNaN(ratio)) resumen.push('FEV1/FVC: '+ratio+'%');
  return {puntaje: resumen.join(' · ') || '—', puntajeRaw: ratio||null, interpretacion: interp, color: color};
}

// ── ASIA (Lesión medular) ────────────────────────────────────
function renderEscalaASIA(d){
  var items_d = d&&d.items ? d.items : {};
  var miosomas_motor = [
    {k:'C5',l:'C5 — Flexores codo (biceps)'},
    {k:'C6',l:'C6 — Extensores muñeca (ECRL)'},
    {k:'C7',l:'C7 — Extensores codo (tríceps)'},
    {k:'C8',l:'C8 — Flexores dedo medio (FDP)'},
    {k:'T1',l:'T1 — Abductor 5° dedo (ADM)'},
    {k:'L2',l:'L2 — Flexores cadera (iliopsoas)'},
    {k:'L3',l:'L3 — Extensores rodilla (cuádriceps)'},
    {k:'L4',l:'L4 — Dorsiflexores tobillo (tibial ant.)'},
    {k:'L5',l:'L5 — Extensores dedo gordo (EHL)'},
    {k:'S1',l:'S1 — Flexores plantares (gastrocnemio)'},
  ];
  var gradosMRC = [{v:'',l:''},{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5'}];
  var html = '<div style="display:grid;gap:14px">';

  // Motor
  html += '<div style="font-size:11px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;border-bottom:1px solid var(--bd);padding-bottom:4px">Puntuación motora (0–5 MRC por segmento)</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  miosomas_motor.forEach(function(m){
    var vD = items_d['motor_D_'+m.k]||'';
    var vI = items_d['motor_I_'+m.k]||'';
    html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px">';
    html += '<span style="min-width:170px;color:var(--tx2)">'+m.l+'</span>';
    html += '<span style="font-size:10px;color:var(--tx4)">D:</span>';
    html += '<select class="sel" data-escala-item="motor_D_'+m.k+'" onchange="recalcularEscala(\'asia\')" style="width:52px;font-size:12px;padding:4px 6px">';
    gradosMRC.forEach(function(g){ html += '<option value="'+g.v+'"'+(String(vD)===String(g.v)?' selected':'')+'>'+g.l+'</option>'; });
    html += '</select>';
    html += '<span style="font-size:10px;color:var(--tx4)">I:</span>';
    html += '<select class="sel" data-escala-item="motor_I_'+m.k+'" onchange="recalcularEscala(\'asia\')" style="width:52px;font-size:12px;padding:4px 6px">';
    gradosMRC.forEach(function(g){ html += '<option value="'+g.v+'"'+(String(vI)===String(g.v)?' selected':'')+'>'+g.l+'</option>'; });
    html += '</select></div>';
  });
  html += '</div>';

  // Sensitivo clave
  html += '<div style="font-size:11px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;margin-top:4px;margin-bottom:4px;border-bottom:1px solid var(--bd);padding-bottom:4px">Sensibilidad táctil ligera y puntiforme — puntos clave (0=ausente, 1=alterada, 2=normal, NT=no evaluado)</div>';
  var dermOfValues = [{v:'',l:''},{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'NT',l:'NT'}];
  var dermatomas = ['C2','C3','C4','C5','C6','C7','C8','T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12','L1','L2','L3','L4','L5','S1','S2','S3','S4-5'];
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:5px">';
  dermatomas.forEach(function(dt){
    var vD = items_d['sens_D_'+dt]||'';
    var vI = items_d['sens_I_'+dt]||'';
    html += '<div style="display:flex;align-items:center;gap:5px;font-size:11px">';
    html += '<span style="min-width:36px;font-weight:600;color:var(--tx2)">'+dt+'</span>';
    html += '<span style="font-size:10px;color:var(--tx4)">D:</span>';
    html += '<select class="sel" data-escala-item="sens_D_'+dt+'" onchange="recalcularEscala(\'asia\')" style="width:52px;font-size:11px;padding:3px 5px">';
    dermOfValues.forEach(function(g){ html += '<option value="'+g.v+'"'+(String(vD)===String(g.v)?' selected':'')+'>'+g.l+'</option>'; });
    html += '</select>';
    html += '<span style="font-size:10px;color:var(--tx4)">I:</span>';
    html += '<select class="sel" data-escala-item="sens_I_'+dt+'" onchange="recalcularEscala(\'asia\')" style="width:52px;font-size:11px;padding:3px 5px">';
    dermOfValues.forEach(function(g){ html += '<option value="'+g.v+'"'+(String(vI)===String(g.v)?' selected':'')+'>'+g.l+'</option>'; });
    html += '</select></div>';
  });
  html += '</div>';

  // Clasificación ASIA
  var clases = [
    {v:'A',l:'A — Completa: sin función motora/sensitiva en S4-5'},
    {v:'B',l:'B — Incompleta: sensitiva conservada, no motora por debajo del nivel'},
    {v:'C',l:'C — Incompleta: motora conservada, mayoría < grado 3'},
    {v:'D',l:'D — Incompleta: motora conservada, mayoría ≥ grado 3'},
    {v:'E',l:'E — Normal: funciones motoras y sensitivas normales'},
  ];
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">';
  html += '<div>'+_selItem('asia_grado', clases, items_d.asia_grado||'', 'Clasificación ASIA (A–E)')+'</div>';
  html += '<div>'+_numItem('asia','nivel_neuro', items_d.nivel_neuro||'', 'Nivel neurológico (ej: C6, T4, L2)', 0, 0, 'Ej: C6')+'</div>';
  html += '</div>';
  html += '<div>'+_selItem('asia_lesion_tipo',
    [{v:'Completa',l:'Lesión completa'},{v:'Incompleta motora',l:'Incompleta motora'},{v:'Incompleta sensitiva',l:'Incompleta sensitiva'},{v:'Síndrome central',l:'Síndrome medular central'},{v:'Síndrome anterior',l:'Síndrome medular anterior'},{v:'Síndrome Brown-Séquard',l:'Síndrome de Brown-Séquard'}],
    items_d.lesion_tipo||'', 'Tipo de síndrome medular')+'</div>';

  html += '</div>';
  return html;
}
function calcularASIA(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var grado = (b.querySelector('[data-escala-item="asia_grado"]')||{}).value||'';
  var nivel = (b.querySelector('[data-escala-item="nivel_neuro"]')||{}).value||'';
  if(!grado && !nivel) return null;
  // Motor score
  var motorKeys=['C5','C6','C7','C8','T1','L2','L3','L4','L5','S1'];
  var motorD=0, motorI=0;
  motorKeys.forEach(function(k){
    var d=parseFloat((b.querySelector('[data-escala-item="motor_D_'+k+'"]')||{}).value||0);
    var i=parseFloat((b.querySelector('[data-escala-item="motor_I_'+k+'"]')||{}).value||0);
    if(!isNaN(d)) motorD+=d;
    if(!isNaN(i)) motorI+=i;
  });
  var totalMotor = motorD + motorI;
  var colorMap = {A:'var(--red)',B:'#ea580c',C:'var(--amber)',D:'var(--green)',E:'var(--green)'};
  var interpMap = {
    A:'Lesión completa — sin función bajo el nivel neurológico',
    B:'Incompleta — solo sensitiva conservada',
    C:'Incompleta — motora presente, mayoría < grado 3',
    D:'Incompleta — motora presente, mayoría ≥ grado 3',
    E:'Función normal'
  };
  var resumen = [];
  if(nivel) resumen.push('Nivel: '+nivel);
  if(grado) resumen.push('ASIA '+grado);
  resumen.push('Motor total: '+totalMotor+'/100');
  return {
    puntaje: resumen.join(' · '),
    puntajeRaw: totalMotor,
    interpretacion: grado ? (interpMap[grado]||'') : '',
    color: grado ? (colorMap[grado]||'var(--tx3)') : 'var(--tx3)'
  };
}

// ── LAWTON-BRODY (8 ítems) ───────────────────────────────────
function renderEscalaLawton(d){
  var items_d = d&&d.items ? d.items : {};
  var config=[
    {k:'telefono',  l:'Uso del teléfono',      ops:[{v:0,l:'0 — No usa'},{v:1,l:'1 — Con ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'compras',   l:'Hacer compras',          ops:[{v:0,l:'0 — Incapaz'},{v:0,l:'0 — Con ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'cocina',    l:'Preparación comida',     ops:[{v:0,l:'0 — No prepara'},{v:0,l:'0 — Recalienta'},{v:1,l:'1 — Independiente'}]},
    {k:'limpieza',  l:'Cuidado del hogar',      ops:[{v:0,l:'0 — No realiza'},{v:1,l:'1 — Con ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'lavanderia',l:'Lavado de ropa',         ops:[{v:0,l:'0 — Depende'},{v:1,l:'1 — Con ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'transporte',l:'Uso de transporte',      ops:[{v:0,l:'0 — No puede'},{v:1,l:'1 — Con ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'medicacion',l:'Manejo medicación',      ops:[{v:0,l:'0 — Incapaz'},{v:0,l:'0 — Necesita ayuda'},{v:1,l:'1 — Independiente'}]},
    {k:'dinero',    l:'Manejo del dinero',      ops:[{v:0,l:'0 — Incapaz'},{v:1,l:'1 — Operaciones simples'},{v:1,l:'1 — Independiente'}]},
  ];
  var html='<div style="display:grid;gap:5px">';
  config.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'lawton\')" style="font-size:12px;padding:4px 6px;max-width:200px"><option value=""></option>';
    it.ops.forEach(function(op,i){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)&&i>0?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularLawton(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0, count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){ if(el.value!==''){suma+=Number(el.value);count++;} });
  if(!count) return null;
  var interp = suma>=6?'Independencia conservada':suma>=4?'Dependencia leve':suma>=2?'Dependencia moderada':'Dependencia grave';
  return {puntaje: suma+'/8', puntajeRaw: suma, interpretacion: interp, color: suma>=6?'var(--green)':suma>=4?'var(--amber)':'var(--red)'};
}

// ── SPPB ─────────────────────────────────────────────────────
function renderEscalaSPPB(d){
  var items_d = d&&d.items ? d.items : {};
  var ops04=[{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'}];
  return '<div style="display:grid;gap:8px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Subtest 1 — Equilibrio estático (0-4)</div>'
    +_selItem('sppb_equil', [{v:'0',l:'0 — No puede mantener posición tándem'},{v:'1',l:'1 — Semitándem < 10seg'},{v:'2',l:'2 — Semitándem ≥ 10seg, tándem < 3seg'},{v:'3',l:'3 — Tándem 3-9.9seg'},{v:'4',l:'4 — Tándem ≥ 10seg'}], items_d.sppb_equil, null)
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Subtest 2 — Velocidad de marcha 4m (0-4)</div>'
    +_selItem('sppb_marcha', [{v:'0',l:'0 — No puede'},{v:'1',l:'1 — ≥ 8.70seg'},{v:'2',l:'2 — 6.21–8.70seg'},{v:'3',l:'3 — 4.82–6.20seg'},{v:'4',l:'4 — < 4.82seg'}], items_d.sppb_marcha, null)
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">Subtest 3 — Sit-to-Stand × 5 (0-4)</div>'
    +_selItem('sppb_sts', [{v:'0',l:'0 — No puede'},{v:'1',l:'1 — ≥ 16.70seg'},{v:'2',l:'2 — 13.70–16.69seg'},{v:'3',l:'3 — 11.20–13.69seg'},{v:'4',l:'4 — < 11.20seg'}], items_d.sppb_sts, null)
    +'</div>';
}
function calcularSPPB(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var keys=['sppb_equil','sppb_marcha','sppb_sts'], suma=0, count=0;
  keys.forEach(function(k){ var el=b.querySelector('[data-escala-item="'+k+'"]'); if(el&&el.value!==''){suma+=Number(el.value);count++;} });
  if(!count) return null;
  var interp = suma>=10?'Rendimiento físico normal':suma>=7?'Limitación leve':suma>=4?'Limitación moderada':'Limitación grave';
  return {puntaje: suma+'/12', puntajeRaw: suma, interpretacion: interp, color: suma>=10?'var(--green)':suma>=7?'var(--amber)':'var(--red)'};
}

// ── TINETTI ──────────────────────────────────────────────────
function renderEscalaTinetti(d){
  var items_d = d&&d.items ? d.items : {};
  var eq=[
    {k:'eq1',l:'1. Equilibrio sentado',ops:[{v:0,l:'0 — Se inclina/resbala'},{v:1,l:'1 — Estable'}]},
    {k:'eq2',l:'2. Levantarse',ops:[{v:0,l:'0 — Incapaz'},{v:1,l:'1 — Usa los brazos'},{v:2,l:'2 — Sin usar brazos'}]},
    {k:'eq3',l:'3. Intento de levantarse',ops:[{v:0,l:'0 — Incapaz'},{v:1,l:'1 — Varios intentos'},{v:2,l:'2 — Al primer intento'}]},
    {k:'eq4',l:'4. Equilibrio inmediato (5seg)',ops:[{v:0,l:'0 — Inestable'},{v:1,l:'1 — Estable con ayuda'},{v:2,l:'2 — Estable sin ayuda'}]},
    {k:'eq5',l:'5. Equilibrio en bipedestación',ops:[{v:0,l:'0 — Inestable'},{v:1,l:'1 — Pies separados/apoyo'},{v:2,l:'2 — Pies juntos, sin apoyo'}]},
    {k:'eq6',l:'6. Empujón (esternón ×3)',ops:[{v:0,l:'0 — Cae'},{v:1,l:'1 — Se tambalea, agarra'},{v:2,l:'2 — Estable'}]},
    {k:'eq7',l:'7. Ojos cerrados',ops:[{v:0,l:'0 — Inestable'},{v:1,l:'1 — Estable'}]},
    {k:'eq8',l:'8. Giro 360&deg;',ops:[{v:0,l:'0 — Pasos discontinuos'},{v:1,l:'1 — Pasos continuos'},{v:0,l:'0 — Inestable'},{v:1,l:'1 — Estable'}]},
    {k:'eq9',l:'9. Sentarse',ops:[{v:0,l:'0 — Inseguro'},{v:1,l:'1 — Usa brazos/discontinuo'},{v:2,l:'2 — Seguro, suave'}]},
  ];
  var ma=[
    {k:'ma1',l:'1. Inicio de la marcha',ops:[{v:0,l:'0 — Vacilación'},{v:1,l:'1 — Sin vacilación'}]},
    {k:'ma2',l:'2. Longitud/altura paso D',ops:[{v:0,l:'0 — No supera pie I'},{v:1,l:'1 — Supera pie I'}]},
    {k:'ma3',l:'3. Longitud/altura paso I',ops:[{v:0,l:'0 — No supera pie D'},{v:1,l:'1 — Supera pie D'}]},
    {k:'ma4',l:'4. Simetría del paso',ops:[{v:0,l:'0 — Asimétrica'},{v:1,l:'1 — Simétrica'}]},
    {k:'ma5',l:'5. Continuidad del paso',ops:[{v:0,l:'0 — Para o discontinuo'},{v:1,l:'1 — Continuo'}]},
    {k:'ma6',l:'6. Trayectoria (3m)',ops:[{v:0,l:'0 — Marcada desviación'},{v:1,l:'1 — Leve desviación'},{v:2,l:'2 — Sin desviación'}]},
    {k:'ma7',l:'7. Tronco',ops:[{v:0,l:'0 — Balanceo marcado'},{v:1,l:'1 — Flexión/rodillas/espalda'},{v:2,l:'2 — Sin balanceo'}]},
    {k:'ma8',l:'8. Posición al caminar',ops:[{v:0,l:'0 — Talones separados'},{v:1,l:'1 — Talones casi juntos'}]},
  ];
  var html='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Parte A — Equilibrio (máx 16)</div><div style="display:grid;gap:4px">';
  eq.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'tinetti\')" style="font-size:11px;padding:3px 4px;max-width:200px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'">'+op.l+'</option>'; });
    html+='</select></div>';
  });
  html+='</div><div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin:10px 0 6px">Parte B — Marcha (máx 12)</div><div style="display:grid;gap:4px">';
  ma.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'tinetti\')" style="font-size:11px;padding:3px 4px;max-width:200px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'">'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularTinetti(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma>=24?'Bajo riesgo de caída':suma>=19?'Riesgo moderado de caída':'Alto riesgo de caída';
  return {puntaje:suma+'/28',puntajeRaw:suma,interpretacion:interp,color:suma>=24?'var(--green)':suma>=19?'var(--amber)':'var(--red)'};
}

// ── FES-I (16 ítems, 1-4 cada uno) ──────────────────────────
function renderEscalaFESI(d){
  var items_d = d&&d.items ? d.items : {};
  var actividades=['Limpiar la casa','Vestirse/desvestirse','Preparar comidas sencillas',
    'Bañarse o ducharse','Ir a comprar','Levantarse/sentarse en silla','Subir/bajar escaleras',
    'Caminar por el vecindario','Coger algo por encima de la cabeza','Ir a ver a alguien',
    'Caminar sobre superficies resbaladizas','Visitar a un amigo o familiar','Caminar en lugares con aglomeración',
    'Caminar sobre superficies irregulares','Subir/bajar una cuesta','Ir a un acto social'];
  var ops=[{v:'1',l:'1 — Nada preocupado'},{v:'2',l:'2 — Algo preocupado'},{v:'3',l:'3 — Bastante preocupado'},{v:'4',l:'4 — Muy preocupado'}];
  var html='<div style="display:grid;gap:4px">';
  actividades.forEach(function(act,i){
    var key='item'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+act)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'fesi\')" style="font-size:11px;padding:3px 4px;max-width:180px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularFESI(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma<=19?'Bajo miedo a caer':suma<=27?'Moderado miedo a caer':'Severo miedo a caer';
  return {puntaje:suma+'/64',puntajeRaw:suma,interpretacion:interp,color:suma<=19?'var(--green)':suma<=27?'var(--amber)':'var(--red)'};
}

// ── MMSE (simplificado, 30 pts) ──────────────────────────────
function renderEscalaMMSE(d){
  var items_d = d&&d.items ? d.items : {};
  var dominios=[
    {k:'orientacion_t',l:'Orientación temporal (5 pts)',max:5},
    {k:'orientacion_e',l:'Orientación espacial (5 pts)',max:5},
    {k:'registro',l:'Registro de 3 palabras (3 pts)',max:3},
    {k:'atencion',l:'Atención y cálculo (5 pts)',max:5},
    {k:'memoria',l:'Memoria diferida — 3 palabras (3 pts)',max:3},
    {k:'denominacion',l:'Denominación (2 pts)',max:2},
    {k:'repeticion',l:'Repetición (1 pt)',max:1},
    {k:'comprension',l:'Comprensión verbal (3 pts)',max:3},
    {k:'lectura',l:'Lectura (1 pt)',max:1},
    {k:'escritura',l:'Escritura (1 pt)',max:1},
    {k:'copia',l:'Copia figura (1 pt)',max:1},
  ];
  var html='<div style="display:grid;gap:5px">';
  dominios.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<input type="number" class="inp" data-escala-item="'+it.k+'" value="'+(items_d[it.k]!==undefined?items_d[it.k]:'')+'" min="0" max="'+it.max+'" style="width:60px;font-size:12px;text-align:center" oninput="recalcularEscala(\'mmse\')">';
    html+='</div>';
  });
  return html+'</div>';
}
function calcularMMSE(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma>=25?'Cognición normal':suma>=20?'Deterioro leve':suma>=10?'Deterioro moderado':'Deterioro grave';
  return {puntaje:suma+'/30',puntajeRaw:suma,interpretacion:interp,color:suma>=25?'var(--green)':suma>=20?'var(--amber)':'var(--red)'};
}

// ── MNA BREVE ────────────────────────────────────────────────
function renderEscalaMNA(d){
  var items_d = d&&d.items ? d.items : {};
  var items=[
    {k:'apetito',l:'A. Pérdida de apetito',ops:[{v:0,l:'0 — Anorexia grave'},{v:1,l:'1 — Moderada'},{v:2,l:'2 — Sin pérdida'}]},
    {k:'peso',l:'B. Pérdida de peso reciente',ops:[{v:0,l:'0 — >3kg'},{v:1,l:'1 — No sabe'},{v:2,l:'2 — 1-3kg'},{v:3,l:'3 — Sin pérdida'}]},
    {k:'movilidad',l:'C. Movilidad',ops:[{v:0,l:'0 — Cama/silla'},{v:1,l:'1 — Sale del domicilio'},{v:2,l:'2 — Sale libremente'}]},
    {k:'estres',l:'D. Estrés/enfermedad aguda',ops:[{v:0,l:'0 — Sí'},{v:2,l:'2 — No'}]},
    {k:'neuropsico',l:'E. Problema neuropsicológico',ops:[{v:0,l:'0 — Demencia grave'},{v:1,l:'1 — Demencia leve'},{v:2,l:'2 — Sin problema'}]},
    {k:'imc',l:'F. IMC',ops:[{v:0,l:'0 — <19'},{v:1,l:'1 — 19-21'},{v:2,l:'2 — 21-23'},{v:3,l:'3 — ≥23'}]},
  ];
  var html='<div style="display:grid;gap:5px">';
  items.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'mna\')" style="font-size:12px;padding:4px 6px;max-width:180px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularMNA(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma>=12?'Estado nutricional normal':suma>=8?'Riesgo de desnutrición':'Desnutrición';
  return {puntaje:suma+'/14',puntajeRaw:suma,interpretacion:interp,color:suma>=12?'var(--green)':suma>=8?'var(--amber)':'var(--red)'};
}

// ── FRIED ────────────────────────────────────────────────────
function renderEscalaFried(d){
  var items_d = d&&d.items ? d.items : {};
  var criterios=[
    {k:'peso',l:'1. Pérdida de peso involuntaria (>4.5 kg o >5% en último año)'},
    {k:'agotamiento',l:'2. Agotamiento referido por el paciente'},
    {k:'actividad',l:'3. Baja actividad física (< umbral por sexo)'},
    {k:'lentitud',l:'4. Lentitud de marcha (velocidad < 0.8 m/s)'},
    {k:'debilidad',l:'5. Debilidad muscular (dinamometría < umbral)'},
  ];
  var html='<div style="display:grid;gap:5px">';
  criterios.forEach(function(it){
    var val=items_d[it.k];
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'fried\')" style="font-size:12px;padding:4px 6px;width:120px">';
    html+='<option value=""></option>';
    html+='<option value="1" '+(val===1||val==='1'?'selected':'')+'>Presente</option>';
    html+='<option value="0" '+(val===0||val==='0'?'selected':'')+'>Ausente</option>';
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularFried(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma===0?'Robusto (no frágil)':suma<=2?'Pre-frágil':'Frágil';
  return {puntaje:suma+'/5 criterios',puntajeRaw:suma,interpretacion:interp,color:suma===0?'var(--green)':suma<=2?'var(--amber)':'var(--red)'};
}


// ── AIMS — Alberta Infant Motor Scale ────────────────────────
function renderEscalaAIMS(d){
  var items_d = d&&d.items ? d.items : {};
  var posiciones = [
    {key:'prono', label:'Prono', placeholder:'Observaciones en posición prono: control cefálico, apoyo en antebrazos, extensión de caderas, propulsión...'},
    {key:'supino', label:'Supino', placeholder:'Observaciones en posición supino: control de cabeza, movimientos de MMII, volteo, puente...'},
    {key:'sedestacion', label:'Sedestación', placeholder:'Observaciones en sedestación: control de tronco, apoyo de manos, equilibrio, transiciones...'},
    {key:'bipedestacion', label:'Bipedestación', placeholder:'Observaciones en bipedestación: apoyo plantar, equilibrio, inicio de marcha, transferencia de peso...'},
  ];
  var html = '<div style="display:grid;gap:10px">';
  posiciones.forEach(function(pos){
    html += '<div style="padding:12px;background:var(--surf);border-radius:10px;border:1px solid var(--bd)">';
    html += '<div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:6px">' + pos.label + '</div>';
    html += '<textarea class="ta" data-escala-item="' + pos.key + '" rows="3" placeholder="' + pos.placeholder + '" style="font-size:12px;min-height:70px" oninput="recalcularEscala(\'aims\')">' + e2(items_d[pos.key]||'') + '</textarea>';
    html += '</div>';
  });
  return html + '</div>';
}
function calcularAIMS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value&&el.value.trim()!=='') count++;});
  if(!count) return null;
  return {puntaje: count + '/4 posiciones evaluadas', puntajeRaw: null, interpretacion: 'Registro observacional por posición. Consultar percentiles AIMS según edad.'};
}

// ── TARDIEU ──────────────────────────────────────────────────
function renderEscalaTardieu(d){
  var items_d = d&&d.items ? d.items : {};
  var segmentos=['Flexores codo D','Flexores codo I','Flexores muñeca D','Flexores muñeca I',
    'Flexores cadera D','Flexores cadera I','Cuádriceps D','Cuádriceps I','Tríceps sural D','Tríceps sural I'];
  var calidad=[{v:'0',l:'0 — Sin resistencia'},{v:'1',l:'1 — Leve resistencia'},{v:'2',l:'2 — Captura clara'},{v:'3',l:'3 — Clonus agotable'},{v:'4',l:'4 — Clonus inagotable'},{v:'5',l:'5 — Articulación inmóvil'}];
  var html='<div style="display:grid;gap:4px">';
  segmentos.forEach(function(seg){
    var key=seg.replace(/\s/g,'_');
    html+='<div style="padding:6px 8px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<div style="font-size:11px;font-weight:700;margin-bottom:4px">'+e2(seg)+'</div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
    html+='<div style="flex:1"><div style="font-size:10px;color:var(--tx4)">Calidad (X)</div>';
    html+='<select class="sel" data-escala-item="'+key+'_X" onchange="recalcularEscala(\'tardieu\')" style="font-size:11px;padding:3px;width:100%"><option value=""></option>';
    calidad.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key+'_X'])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
    html+='<div><div style="font-size:10px;color:var(--tx4)">Angulo R1 (&deg;)</div>';
    html+='<input type="number" class="inp" data-escala-item="'+key+'_R1" value="'+(items_d[key+'_R1']||'')+'" min="0" max="180" style="width:70px;font-size:12px" oninput="recalcularEscala(\'tardieu\')"></div>';
    html+='<div><div style="font-size:10px;color:var(--tx4)">Angulo R2 (&deg;)</div>';
    html+='<input type="number" class="inp" data-escala-item="'+key+'_R2" value="'+(items_d[key+'_R2']||'')+'" min="0" max="180" style="width:70px;font-size:12px" oninput="recalcularEscala(\'tardieu\')"></div>';
    html+='</div></div>';
  });
  return html+'</div>';
}
function calcularTardieu(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value) count++;});
  if(!count) return null;
  return {puntaje:'Ver detalle por segmento', puntajeRaw: null, interpretacion:'Diferencia R2-R1 indica grado de espasticidad dinámica'};
}

// ── ESCALAS TRAUMATOLOGÍA (versiones simplificadas) ──────────

function _escalaSimpleItems(escId, items_d, config){
  var html='<div style="display:grid;gap:4px">';
  config.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\''+escId+'\')" style="font-size:11px;padding:3px 4px;max-width:200px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}

function _calcSimple(id, max, rangos){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=''; var color='var(--tx2)';
  for(var i=0;i<rangos.length;i++){
    if(suma>=rangos[i].min&&suma<=rangos[i].max){interp=rangos[i].l;color=rangos[i].c||'var(--tx2)';break;}
  }
  return {puntaje:suma+'/'+max, puntajeRaw:suma, interpretacion:interp, color:color};
}

// DASH (30 ítems, 1-5 por ítem, fórmula especial)
function renderEscalaDASH(d){
  var items_d=d&&d.items?d.items:{};
  var preguntas=['Abrir un frasco nuevo o apretado','Escribir','Girar una llave','Preparar una comida',
    'Empujar una puerta pesada','Poner algo en un estante sobre la cabeza','Tareas domésticas pesadas',
    'Trabajar en el jardín o patio','Hacer la cama','Llevar una bolsa o maletín',
    'Cargar un objeto pesado (más de 5 kg)','Cambiar una bombilla sobre la cabeza',
    'Lavarse o secarse el cabello','Lavarse la espalda','Ponerse un jersey',
    'Usar un cuchillo para cortar comida','Actividades de ocio con poco esfuerzo en el brazo',
    'Actividades de ocio que exigen fuerza o impacto','Actividades de ocio que mueven libremente el brazo',
    'Transporte (conducir o usar transporte)','Actividad sexual','Afectación del trabajo o actividad diaria',
    'Dolor en brazo/hombro/mano','Hormigueo en brazo/hombro/mano','Debilidad',
    'Rigidez','Gravedad del dolor en el último mes','Intensidad del dolor al hacer ciertas actividades',
    'Hormigueo (sensación de alfileres y agujas)','Dificultad para dormir'];
  var ops=[{v:'1',l:'1 — Ninguna dificultad'},{v:'2',l:'2 — Leve'},{v:'3',l:'3 — Moderada'},{v:'4',l:'4 — Grave'},{v:'5',l:'5 — Incapaz'}];
  var html='<div style="display:grid;gap:4px;max-height:400px;overflow-y:auto;padding-right:4px">';
  preguntas.forEach(function(p,i){
    var key='item'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+p)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'dash\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularDASH(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var vals=[],count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){vals.push(Number(el.value));count++;}});
  if(count<10) return null;
  var suma=vals.reduce(function(a,b){return a+b;},0);
  var score=((suma/count)-1)*(100/4);
  score=Math.round(score*10)/10;
  var interp=score<=25?'Discapacidad mínima':score<=50?'Discapacidad moderada':score<=75?'Discapacidad grave':'Discapacidad muy grave';
  return {puntaje:score+'/100', puntajeRaw:score, interpretacion:interp, color:score<=25?'var(--green)':score<=50?'var(--amber)':'var(--red)'};
}

// QuickDASH (11 ítems)
function renderEscalaQuickDASH(d){
  var items_d=d&&d.items?d.items:{};
  var preguntas=['Abrir un frasco nuevo o apretado','Tareas domésticas pesadas','Llevar una bolsa o maletín',
    'Lavarse la espalda','Usar un cuchillo para cortar comida','Actividades de ocio que exigen fuerza o impacto',
    'Afectación del trabajo o actividades diarias habituales','Dolor en brazo/hombro/mano',
    'Hormigueo en brazo/hombro/mano','Debilidad en brazo/hombro/mano','Dificultad para dormir'];
  var ops=[{v:'1',l:'1 — Ninguna dificultad'},{v:'2',l:'2 — Leve'},{v:'3',l:'3 — Moderada'},{v:'4',l:'4 — Grave'},{v:'5',l:'5 — Incapaz'}];
  var html='<div style="display:grid;gap:4px">';
  preguntas.forEach(function(p,i){
    var key='item'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+p)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'quickdash\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularQuickDASH(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var vals=[],count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){vals.push(Number(el.value));count++;}});
  if(count<10) return null;
  var suma=vals.reduce(function(a,b){return a+b;},0);
  var score=((suma/count)-1)*(100/4);
  score=Math.round(score*10)/10;
  var interp=score<=25?'Discapacidad mínima':score<=50?'Discapacidad moderada':score<=75?'Discapacidad grave':'Discapacidad muy grave';
  return {puntaje:score+'/100',puntajeRaw:score,interpretacion:interp,color:score<=25?'var(--green)':score<=50?'var(--amber)':'var(--red)'};
}

// NDI (10 ítems × 0-5)
function renderEscalaNDI(d){
  var items_d=d&&d.items?d.items:{};
  var secciones=['Intensidad del dolor','Cuidado personal','Levantar objetos','Leer','Dolor de cabeza',
    'Concentración','Trabajo','Conducir','Dormir','Actividades de ocio'];
  var ops5=[{v:'0',l:'0 — Sin problema'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5 — Máxima discapacidad'}];
  var html='<div style="display:grid;gap:4px">';
  secciones.forEach(function(s,i){
    var key='item'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+s)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'ndi\')" style="font-size:11px;padding:3px 4px;max-width:180px"><option value=""></option>';
    ops5.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularNDI(id){
  return _calcSimple(id,50,[
    {min:0,max:4,l:'Sin discapacidad',c:'var(--green)'},{min:5,max:14,l:'Discapacidad leve',c:'#65a30d'},
    {min:15,max:24,l:'Discapacidad moderada',c:'var(--amber)'},{min:25,max:34,l:'Discapacidad grave',c:'#ea580c'},
    {min:35,max:50,l:'Discapacidad completa',c:'var(--red)'}]);
}

// Oswestry (10 ítems × 0-5, resultado en %)
function renderEscalaOswestry(d){
  var items_d=d&&d.items?d.items:{};
  var secciones=['Intensidad del dolor','Cuidado personal','Levantar objetos','Caminar',
    'Estar sentado','Estar de pie','Dormir','Vida sexual','Vida social','Viajar'];
  var ops5=[{v:'0',l:'0'},{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'},{v:'4',l:'4'},{v:'5',l:'5'}];
  var html='<div style="display:grid;gap:4px">';
  secciones.forEach(function(s,i){
    var key='item'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+s)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'oswestry\')" style="font-size:11px;padding:3px 4px;max-width:180px"><option value=""></option>';
    ops5.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularOswestry(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var pct=Math.round((suma/(count*5))*100);
  var interp=pct<=20?'Discapacidad mínima':pct<=40?'Discapacidad moderada':pct<=60?'Discapacidad grave':pct<=80?'Discapacidad muy grave':'Máxima discapacidad o simulación';
  return {puntaje:pct+'%',puntajeRaw:pct,interpretacion:interp,color:pct<=20?'var(--green)':pct<=40?'var(--amber)':'var(--red)'};
}

// Tampa (TSK) — 17 ítems, 1-4
function renderEscalaTampa(d){
  var items_d=d&&d.items?d.items:{};
  var afirmaciones=[
    'Me duele y creo que algo grave está pasando','Tengo miedo de lesionarme si hago ejercicio',
    'Mi cuerpo me está diciendo que algo está seriamente mal','Cuando me duele quiero que los demás no me vean',
    'El miedo a lesionarme es el mayor problema para recuperarme','Si me arriesgara a lesionarme el dolor empeoraría',
    'El dolor siempre significa que me he lesionado','No es necesariamente más peligroso si me duele al hacer actividad',
    'Tengo miedo de lastimarme accidentalmente','Lo más seguro es simplemente estar en cama cuando tengo dolor',
    'Si aceptara que tengo que vivir con dolor podría más','Si no hubiera lesionado no tendría tanto dolor',
    'El dolor me indica cuando terminar el ejercicio','No es seguro para mí estar físicamente activo',
    'No puedo hacer las cosas como antes por el riesgo de lesión','Incluso si el dolor es intenso puedo seguir activo de forma segura',
    'Nada puede aliviar el dolor que siento'];
  var ops=[{v:'1',l:'1 — Totalmente en desacuerdo'},{v:'2',l:'2 — En desacuerdo'},{v:'3',l:'3 — De acuerdo'},{v:'4',l:'4 — Totalmente de acuerdo'}];
  var html='<div style="display:grid;gap:4px;max-height:380px;overflow-y:auto;padding-right:4px">';
  afirmaciones.forEach(function(a,i){
    var key='item'+(i+1);
    // Ítems invertidos: 4, 8, 12, 16
    var inv=[4,8,12,16].indexOf(i+1)!==-1;
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)'+(inv?';border-left:3px solid var(--n400)':'')+'">';
    html+='<span style="font-size:11px;flex:1">'+e2((i+1)+'. '+a)+(inv?' <span style="font-size:9px;color:var(--n400)">[inv]</span>':'')+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'tampa\')" style="font-size:11px;padding:3px 4px;max-width:180px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===op.v?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div><div style="font-size:10px;color:var(--tx4);margin-top:6px">[inv] = ítems de puntuación invertida (4, 8, 12, 16)</div>';
}
function calcularTampa(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var invertidos=[4,8,12,16];
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el,idx){
    if(el.value!==''){
      var v=Number(el.value); var n=idx+1;
      if(invertidos.indexOf(n)!==-1) v=5-v; // invertir
      suma+=v; count++;
    }
  });
  if(!count) return null;
  var interp=suma<=32?'Baja kinesiofobia':suma<=40?'Kinesiofobia moderada':'Alta kinesiofobia';
  return {puntaje:suma+'/68',puntajeRaw:suma,interpretacion:interp,color:suma<=32?'var(--green)':suma<=40?'var(--amber)':'var(--red)'};
}

// WOMAC, KOOS, HOOS, Constant-Murley, Lysholm, VISA-P, VISA-A, FAAM
// (versiones funcionales con ítems representativos)
function renderEscalaWOMAC(d){
  var items_d=d&&d.items?d.items:{};
  var dolor=['Dolor al caminar en superficie plana','Dolor al subir o bajar escaleras','Dolor nocturno en cama','Dolor en reposo','Dolor al soportar el peso'];
  var rigidez=['Rigidez matutina','Rigidez después de estar sentado, acostado o descansando'];
  var funcion=['Bajar escaleras','Subir escaleras','Levantarse de la silla','Estar de pie','Agacharse','Caminar en superficie plana','Entrar/salir del coche','Ir de compras','Ponerse/quitarse los calcetines','Levantarse de la cama','Acostarse en la cama','Entrar/salir de la bañera','Estar sentado','Sentarse/levantarse del WC','Tareas domésticas pesadas','Tareas domésticas ligeras'];
  var ops=[{v:'0',l:'0 — Ninguno'},{v:'1',l:'1 — Poco'},{v:'2',l:'2 — Bastante'},{v:'3',l:'3 — Mucho'},{v:'4',l:'4 — Muchísimo'}];
  function mkSection(tit, arr, prefix){
    var h='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin:8px 0 4px">'+tit+'</div>';
    arr.forEach(function(p,i){
      var key=prefix+(i+1);
      h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--surf);border-radius:6px;border:1px solid var(--bd);margin-bottom:3px">';
      h+='<span style="font-size:11px;flex:1">'+e2(p)+'</span>';
      h+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'womac\')" style="font-size:11px;padding:3px 4px;max-width:150px"><option value=""></option>';
      ops.forEach(function(op){ h+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
      h+='</select></div>';
    });
    return h;
  }
  return mkSection('A — Dolor (5 ítems)',dolor,'d')+mkSection('B — Rigidez (2 ítems)',rigidez,'r')+mkSection('C — Función (17 ítems)',funcion,'f');
}
function calcularWOMAC(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var max=count*4; var pct=Math.round((suma/max)*100);
  var interp=pct<=25?'Función preservada':pct<=50?'Afectación leve-moderada':pct<=75?'Afectación moderada-grave':'Afectación grave';
  return {puntaje:pct+'% ('+suma+'/'+max+')',puntajeRaw:pct,interpretacion:interp,color:pct<=25?'var(--green)':pct<=50?'var(--amber)':'var(--red)'};
}

function renderEscalaKOOS(d){
  var items_d=d&&d.items?d.items:{};
  // Versión resumida con las 5 subescalas (1 ítem representativo c/u para prototipo)
  var subs=[
    {prefix:'s',tit:'S — Síntomas',items:['Inflamación de rodilla','Rigidez matutina','Dificultad al doblar','Dificultad al estirar']},
    {prefix:'d',tit:'D — Dolor',items:['Frecuencia del dolor','Dolor al girar','Dolor al extender','Dolor al bajar escaleras','Dolor al estar de pie']},
    {prefix:'a',tit:'A — AVD',items:['Levantarse de la silla','Bajar escaleras','Ponerse calcetines','Estar de pie']},
    {prefix:'sp',tit:'SP — Deporte/Ocio',items:['Ponerse de cuclillas','Correr','Saltar','Girar en la rodilla afectada']},
    {prefix:'q',tit:'Q — Calidad de vida',items:['¿Con qué frecuencia nota la rodilla?','¿Ha modificado el estilo de vida?','¿Cuánta dificultad confía?','¿Cuánto problema en general?']},
  ];
  var ops=[{v:'0',l:'0 — Ninguno/Nunca'},{v:'1',l:'1 — Poco/Raro'},{v:'2',l:'2 — Moderado'},{v:'3',l:'3 — Mucho/A veces'},{v:'4',l:'4 — Extremo/Siempre'}];
  var html='';
  subs.forEach(function(sub){
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin:8px 0 4px">'+sub.tit+'</div>';
    sub.items.forEach(function(it,i){
      var key=sub.prefix+(i+1);
      html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--surf);border-radius:6px;border:1px solid var(--bd);margin-bottom:3px">';
      html+='<span style="font-size:11px;flex:1">'+e2(it)+'</span>';
      html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'koos\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
      ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
      html+='</select></div>';
    });
  });
  return html;
}
function calcularKOOS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var score=100-Math.round((suma/(count*4))*100);
  var interp=score>=75?'Función preservada':score>=50?'Afectación moderada':'Afectación grave';
  return {puntaje:score+'/100',puntajeRaw:score,interpretacion:interp,color:score>=75?'var(--green)':score>=50?'var(--amber)':'var(--red)'};
}

function renderEscalaHOOS(d){
  var items_d=d&&d.items?d.items:{};
  var subs=[
    {prefix:'s',tit:'S — Síntomas',items:['Rigidez matutina','Dificultad al doblar la cadera','Dificultad al estirar','¿Crepitaciones?']},
    {prefix:'d',tit:'D — Dolor',items:['Frecuencia del dolor','Dolor agudo','Dolor al extender','Dolor al bajar escaleras','Dolor de noche']},
    {prefix:'a',tit:'A — AVD',items:['Bajar escaleras','Levantarse de la silla','Ponerse calcetines','Estar acostado']},
    {prefix:'sp',tit:'SP — Deporte/Ocio',items:['Ponerse de cuclillas','Caminar rápido','Dar la vuelta a la cadera']},
    {prefix:'q',tit:'Q — Calidad de vida',items:['¿Con qué frecuencia nota la cadera?','¿Ha modificado el estilo de vida?','¿Cuánto problema en general?']},
  ];
  var ops=[{v:'0',l:'0 — Ninguno/Nunca'},{v:'1',l:'1 — Poco'},{v:'2',l:'2 — Moderado'},{v:'3',l:'3 — Mucho'},{v:'4',l:'4 — Extremo'}];
  var html='';
  subs.forEach(function(sub){
    html+='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin:8px 0 4px">'+sub.tit+'</div>';
    sub.items.forEach(function(it,i){
      var key=sub.prefix+(i+1);
      html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--surf);border-radius:6px;border:1px solid var(--bd);margin-bottom:3px">';
      html+='<span style="font-size:11px;flex:1">'+e2(it)+'</span>';
      html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'hoos\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
      ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
      html+='</select></div>';
    });
  });
  return html;
}
function calcularHOOS(id){ return calcularKOOS(id); } // misma fórmula

function renderEscalaConstant(d){
  var items_d=d&&d.items?d.items:{};
  return '<div style="display:grid;gap:8px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">A — Dolor (máx 15 pts)</div>'
    +_numItem('constant','dolor',items_d.dolor||'','Puntuación de dolor (0=máximo, 15=sin dolor)',0,15,'0-15')
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">B — AVD (máx 20 pts)</div>'
    +_numItem('constant','avd',items_d.avd||'','Actividades diarias (0-20)',0,20,'0-20')
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">C — Movilidad (máx 40 pts)</div>'
    +_numItem('constant','movilidad',items_d.movilidad||'','Rango de movimiento (0-40)',0,40,'0-40')
    +'<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase">D — Fuerza (máx 25 pts)</div>'
    +_numItem('constant','fuerza',items_d.fuerza||'','Fuerza en abducción (0-25)',0,25,'0-25')
    +'</div>';
}
function calcularConstant(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma>=86?'Excelente':suma>=71?'Bueno':suma>=56?'Moderado':'Malo';
  return {puntaje:suma+'/100',puntajeRaw:suma,interpretacion:interp,color:suma>=71?'var(--green)':suma>=56?'var(--amber)':'var(--red)'};
}

function renderEscalaLysholm(d){
  var items_d=d&&d.items?d.items:{};
  var config=[
    {k:'cojera',l:'Cojera',ops:[{v:5,l:'5 — Sin cojera'},{v:3,l:'3 — Leve o periódica'},{v:0,l:'0 — Grave y constante'}]},
    {k:'apoyo',l:'Apoyo',ops:[{v:5,l:'5 — Sin apoyo'},{v:3,l:'3 — Bastón o muleta'},{v:0,l:'0 — Imposible soportar peso'}]},
    {k:'bloqueo',l:'Bloqueo articular',ops:[{v:15,l:'15 — Sin bloqueo'},{v:10,l:'10 — Bloqueo pero no durante examen'},{v:6,l:'6 — Bloqueo en examen'},{v:2,l:'2 — Bloqueo frecuente'},{v:0,l:'0 — Articulación bloqueada'}]},
    {k:'inestabilidad',l:'Inestabilidad',ops:[{v:25,l:'25 — Sin fallos'},{v:20,l:'20 — Raro al actividades intensas'},{v:15,l:'15 — Frecuente al deporte'},{v:10,l:'10 — Ocasional AVD'},{v:5,l:'5 — En cada AVD'},{v:0,l:'0 — En cada paso'}]},
    {k:'dolor',l:'Dolor',ops:[{v:25,l:'25 — Sin dolor'},{v:20,l:'20 — Ocasional con esfuerzo'},{v:15,l:'15 — Marcado con esfuerzo'},{v:10,l:'10 — Intenso con esfuerzo'},{v:5,l:'5 — Intenso en reposo'},{v:0,l:'0 — Constante'}]},
    {k:'inflamacion',l:'Inflamación',ops:[{v:10,l:'10 — Sin inflamación'},{v:6,l:'6 — Con esfuerzo intenso'},{v:2,l:'2 — Con esfuerzo ordinario'},{v:0,l:'0 — Constante'}]},
    {k:'escaleras',l:'Escaleras',ops:[{v:10,l:'10 — Sin problemas'},{v:6,l:'6 — Con problemas leves'},{v:2,l:'2 — Un escalón a la vez'},{v:0,l:'0 — Imposible'}]},
    {k:'cuclillas',l:'Ponerse en cuclillas',ops:[{v:5,l:'5 — Sin problemas'},{v:4,l:'4 — Con leve problema'},{v:2,l:'2 — Menos de 90&deg;'},{v:0,l:'0 — Imposible'}]},
  ];
  var html='<div style="display:grid;gap:4px">';
  config.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'lysholm\')" style="font-size:11px;padding:3px 4px;max-width:210px"><option value=""></option>';
    it.ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularLysholm(id){
  return _calcSimple(id,100,[
    {min:95,max:100,l:'Excelente',c:'var(--green)'},{min:84,max:94,l:'Bueno',c:'#65a30d'},
    {min:65,max:83,l:'Regular',c:'var(--amber)'},{min:0,max:64,l:'Malo',c:'var(--red)'}]);
}

// VISA-P y VISA-A (8 ítems cada uno)
function _renderVISA(escId, preguntas, items_d){
  var html='<div style="display:grid;gap:6px">';
  preguntas.forEach(function(p,i){
    var key='item'+(i+1);
    html+='<div style="padding:7px 10px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
    html+='<div style="font-size:11px;margin-bottom:4px">'+e2((i+1)+'. '+p.l)+'</div>';
    html+='<input type="number" class="inp" data-escala-item="'+key+'" value="'+(items_d[key]||'')+'" min="0" max="'+p.max+'" style="max-width:100px;font-size:12px" oninput="recalcularEscala(\''+escId+'\')">';
    html+='<span style="font-size:11px;color:var(--tx4);margin-left:6px">/ '+p.max+'</span>';
    html+='</div>';
  });
  return html+'</div>';
}
function renderEscalaVISAP(d){
  var items_d=d&&d.items?d.items:{};
  return _renderVISA('visap',[
    {l:'¿Por cuánto tiempo puedes estar sentado sin dolor? (0=no puedo, 10=sin límite)',max:10},
    {l:'¿Tienes dolor al bajar escaleras? (0=dolor severo, 10=sin dolor)',max:10},
    {l:'¿Tienes dolor en la rodilla con carga completa en extensión? (0=dolor severo, 10=sin dolor)',max:10},
    {l:'¿Cuándo caminas en llano tienes dolor? (0=dolor severo, 10=sin dolor)',max:10},
    {l:'¿Tienes dolor en actividades que impliquen tendon patelar? (0=siempre, 10=nunca)',max:10},
    {l:'¿Puedes hacer squats sin dolor? (0=imposible, 10=sin dolor)',max:10},
    {l:'¿Puedes saltar sin dolor? (0=imposible, 10=sin límite)',max:10},
    {l:'¿Estás participando en deporte o actividad física? (0=no, 4=competencia)',max:4},
  ],items_d);
}
function calcularVISAP(id){
  return _calcSimple(id,100,[{min:0,max:50,l:'Sintomático, limitado'},{min:51,max:80,l:'Sintomático, funcional'},{min:81,max:100,l:'Asintomático o mínimamente sintomático'}]);
}
function renderEscalaVISAA(d){
  var items_d=d&&d.items?d.items:{};
  return _renderVISA('visaa',[
    {l:'¿Tienes dolor matutino en el tendón de Aquiles al despertar? (0=severo, 10=sin dolor)',max:10},
    {l:'¿Tienes dolor al estiramiento del tendón? (0=severo, 10=sin dolor)',max:10},
    {l:'¿Tienes dolor al caminar en llano? (0=severo, 10=sin dolor)',max:10},
    {l:'¿Cuántos talones elevados puedes hacer? (0=ninguno, 10=≥25)',max:10},
    {l:'¿Cuánto puedes correr antes de dolor? (0=nada, 10=sin dolor)',max:10},
    {l:'¿Puedes entrenar plenamente? (0=no, 10=sin limitación)',max:10},
    {l:'¿Realizas entrenamiento de fuerza? (0=nada, 10=pleno)',max:10},
    {l:'Actividad deportiva actual (0=ninguna, 4=competencia)',max:4},
  ],items_d);
}
function calcularVISAA(id){ return calcularVISAP(id); }

// FAAM
function renderEscalaFAAM(d){
  var items_d=d&&d.items?d.items:{};
  var avd=['Estar de pie','Caminar en superficie plana','Caminar descalzo','Subir colinas','Bajar colinas',
    'Subir escaleras','Bajar escaleras','Caminar sobre superficie irregular','Entrar/salir del coche',
    'Estar de pie 15 min','Estar de pie > 1 hora','Caminar 5 minutos','Caminar 10 minutos','Caminar 15 minutos o más',
    'Tareas domésticas','Actividades de cuidado personal','Trabajo ligero a moderado','Trabajo pesado'];
  var dep=['Correr','Saltar','Aterrizar','Inicio y parada rápidos','Cortes y giros laterales','Actividades de bajo impacto','Actividad a nivel de rendimiento normal'];
  var ops=[{v:'4',l:'4 — Sin dificultad'},{v:'3',l:'3 — Leve dificultad'},{v:'2',l:'2 — Moderada dificultad'},{v:'1',l:'1 — Dificultad extrema'},{v:'0',l:'0 — Incapaz'}];
  var html='<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">Subescala AVD</div><div style="display:grid;gap:3px">';
  avd.forEach(function(p,i){
    var key='avd'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--surf);border-radius:6px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(p)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'faam\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  html+='</div><div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin:8px 0 4px">Subescala Deporte</div><div style="display:grid;gap:3px">';
  dep.forEach(function(p,i){
    var key='dep'+(i+1);
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--surf);border-radius:6px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(p)+'</span>';
    html+='<select class="sel" data-escala-item="'+key+'" onchange="recalcularEscala(\'faam\')" style="font-size:11px;padding:3px 4px;max-width:160px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[key])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularFAAM(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var avdS=0,avdC=0,depS=0,depC=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){
    if(el.value==='') return;
    var v=Number(el.value);
    if(el.getAttribute('data-escala-item').startsWith('avd')){avdS+=v;avdC++;}
    else{depS+=v;depC++;}
  });
  if(!avdC) return null;
  var avdPct=Math.round((avdS/(avdC*4))*100);
  var depPct=depC?Math.round((depS/(depC*4))*100):null;
  return {puntaje:'AVD: '+avdPct+'%'+(depPct!==null?' | Dep: '+depPct+'%':''),puntajeRaw:avdPct,interpretacion:avdPct>=75?'Función preservada':'Función afectada',color:avdPct>=75?'var(--green)':'var(--amber)'};
}

// ── PEDIÁTRICAS ──────────────────────────────────────────────

function renderEscalaGMFCS(d){
  var v=d&&d.items?d.items.nivel||'':'';
  var niveles=[
    {v:'I',  l:'Nivel I — Camina sin restricciones; limitaciones en habilidades motrices avanzadas'},
    {v:'II', l:'Nivel II — Camina con limitaciones; dificultad en superficies irregulares e inclinadas'},
    {v:'III',l:'Nivel III — Camina con dispositivo de ayuda; limitaciones en exteriores y comunidad'},
    {v:'IV', l:'Nivel IV — Movilidad independiente limitada; transporte en silla de ruedas'},
    {v:'V',  l:'Nivel V — Transportado en silla de ruedas manual; control de cabeza y tronco limitado'},
  ];
  var html='<div style="display:grid;gap:6px">';
  niveles.forEach(function(n){
    var sel=v===n.v;
    html+='<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;border:2px solid '+(sel?'var(--n500)':'var(--bd)')+';background:'+(sel?'var(--surf3)':'var(--surf)')+';cursor:pointer" onclick="selGMFCS(\''+n.v+'\')" id="gmfcs_'+n.v+'">';
    html+='<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(sel?'var(--n500)':'var(--bd)')+';background:'+(sel?'var(--n500)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center">'+(sel?'<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>':'')+'</div>';
    html+='<div><div style="font-weight:700;font-size:13px;color:var(--n700)">'+n.v+'</div><div style="font-size:11px;color:var(--tx3);margin-top:2px">'+e2(n.l.split('—')[1])+'</div></div>';
    html+='<input type="hidden" data-escala-item="nivel" value="'+n.v+'" id="gmfcs_val_'+n.v+'" '+(sel?'':'disabled')+'>';
    html+='</div>';
  });
  return html+'</div>';
}
function selGMFCS(nivel){
  ['I','II','III','IV','V'].forEach(function(n){
    var div=document.getElementById('gmfcs_'+n);
    var inp=document.getElementById('gmfcs_val_'+n);
    var sel=n===nivel;
    if(div){div.style.borderColor=sel?'var(--n500)':'var(--bd)';div.style.background=sel?'var(--surf3)':'var(--surf)';}
    if(inp){inp.disabled=!sel;inp.removeAttribute('data-escala-item');if(sel)inp.setAttribute('data-escala-item','nivel');}
  });
  recalcularEscala('gmfcs');
}
function calcularGMFCS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="nivel"]:not([disabled])'); if(!el||!el.value) return null;
  var desc={I:'Marcha independiente sin restricciones',II:'Marcha con limitaciones',III:'Marcha con dispositivo de ayuda',IV:'Movilidad muy limitada',V:'Dependencia total de transporte'};
  return {puntaje:'Nivel '+el.value,puntajeRaw:el.value,interpretacion:desc[el.value]||''};
}

function renderEscalaMACS(d){
  var v=d&&d.items?d.items.nivel||'':'';
  var niveles=[
    {v:'I',  l:'Nivel I — Maneja objetos fácil y satisfactoriamente'},
    {v:'II', l:'Nivel II — Maneja la mayoría con menor calidad o velocidad'},
    {v:'III',l:'Nivel III — Maneja con dificultad; necesita ayuda para preparar o adaptar'},
    {v:'IV', l:'Nivel IV — Manejo limitado; éxito parcial con ayuda'},
    {v:'V',  l:'Nivel V — No maneja objetos; habilidad muy limitada incluso en acciones simples'},
  ];
  var html='<div style="display:grid;gap:6px">';
  niveles.forEach(function(n){
    var sel=v===n.v;
    html+='<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;border:2px solid '+(sel?'var(--n500)':'var(--bd)')+';background:'+(sel?'var(--surf3)':'var(--surf)')+';cursor:pointer" onclick="selMACS(\''+n.v+'\')" id="macs_'+n.v+'">';
    html+='<div style="width:22px;height:22px;border-radius:50%;border:2px solid '+(sel?'var(--n500)':'var(--bd)')+';background:'+(sel?'var(--n500)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center">'+(sel?'<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>':'')+'</div>';
    html+='<div><div style="font-weight:700;font-size:13px;color:var(--n700)">'+n.v+'</div><div style="font-size:11px;color:var(--tx3);margin-top:2px">'+e2(n.l.split('—')[1])+'</div></div>';
    html+='<input type="hidden" data-escala-item="nivel" value="'+n.v+'" id="macs_val_'+n.v+'" '+(sel?'':'disabled')+'>';
    html+='</div>';
  });
  return html+'</div>';
}
function selMACS(nivel){
  ['I','II','III','IV','V'].forEach(function(n){
    var div=document.getElementById('macs_'+n);
    var inp=document.getElementById('macs_val_'+n);
    var sel=n===nivel;
    if(div){div.style.borderColor=sel?'var(--n500)':'var(--bd)';div.style.background=sel?'var(--surf3)':'var(--surf)';}
    if(inp){inp.disabled=!sel;inp.removeAttribute('data-escala-item');if(sel)inp.setAttribute('data-escala-item','nivel');}
  });
  recalcularEscala('macs');
}
function calcularMACS(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var el=b.querySelector('[data-escala-item="nivel"]:not([disabled])'); if(!el||!el.value) return null;
  var desc={I:'Manejo independiente eficaz',II:'Manejo con leve limitación',III:'Requiere adaptaciones y ayuda',IV:'Éxito parcial con apoyo',V:'No maneja objetos funcionalmente'};
  return {puntaje:'Nivel '+el.value,puntajeRaw:el.value,interpretacion:desc[el.value]||''};
}

function renderEscalaWeeFIM(d){
  var items_d=d&&d.items?d.items:{};
  var dominios=[
    {k:'alimentacion',l:'Alimentación',max:7},{k:'aseo',l:'Aseo personal',max:7},{k:'bano',l:'Baño',max:7},
    {k:'vestido_sup',l:'Vestido parte superior',max:7},{k:'vestido_inf',l:'Vestido parte inferior',max:7},
    {k:'wc',l:'Uso del WC',max:7},{k:'vejiga',l:'Control de vejiga',max:7},{k:'intestino',l:'Control intestinal',max:7},
    {k:'transfer_cama',l:'Traslado cama/silla/silla de ruedas',max:7},{k:'transfer_wc',l:'Traslado al WC',max:7},
    {k:'transfer_bano',l:'Traslado al baño',max:7},{k:'marcha',l:'Locomoción: marcha/silla de ruedas',max:7},
    {k:'escaleras',l:'Locomoción: escaleras',max:7},{k:'comprension',l:'Comprensión',max:7},
    {k:'expresion',l:'Expresión',max:7},{k:'interaccion',l:'Interacción social',max:7},
    {k:'resolucion',l:'Resolución de problemas',max:7},{k:'memoria',l:'Memoria',max:7},
  ];
  var ops=[{v:'1',l:'1 — Dependencia total'},{v:'2',l:'2 — Asistencia máxima'},{v:'3',l:'3 — Asistencia moderada'},
    {v:'4',l:'4 — Asistencia mínima'},{v:'5',l:'5 — Supervisión'},{v:'6',l:'6 — Independencia modificada'},{v:'7',l:'7 — Independencia completa'}];
  var html='<div style="display:grid;gap:4px">';
  dominios.forEach(function(it){
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;background:var(--surf);border-radius:7px;border:1px solid var(--bd)">';
    html+='<span style="font-size:11px;flex:1">'+e2(it.l)+'</span>';
    html+='<select class="sel" data-escala-item="'+it.k+'" onchange="recalcularEscala(\'weefim\')" style="font-size:11px;padding:3px 4px;max-width:190px"><option value=""></option>';
    ops.forEach(function(op){ html+='<option value="'+op.v+'" '+(String(items_d[it.k])===String(op.v)?'selected':'')+'>'+op.l+'</option>'; });
    html+='</select></div>';
  });
  return html+'</div>';
}
function calcularWeeFIM(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var suma=0,count=0;
  b.querySelectorAll('[data-escala-item]').forEach(function(el){if(el.value!==''){suma+=Number(el.value);count++;}});
  if(!count) return null;
  var interp=suma>=108?'Independencia funcional':suma>=72?'Dependencia modificada':suma>=36?'Asistencia parcial':'Dependencia completa';
  return {puntaje:suma+'/126',puntajeRaw:suma,interpretacion:interp,color:suma>=108?'var(--green)':suma>=72?'var(--amber)':'var(--red)'};
}

// ══════════════════════════════════════════════════════════════
// FICHA CARDIORRESPIRATORIA
// ══════════════════════════════════════════════════════════════

