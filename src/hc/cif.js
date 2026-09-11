// Selector interactivo de códigos CIF (Clasificación Internacional del Funcionamiento,
// de la Discapacidad y de la Salud — OMS). Subconjunto curado para uso en fisioterapia:
// dominio 'b' (Funciones corporales → Deterioro), 'd' (Actividades y Participación),
// 'e' (Factores contextuales).

const CIF_CATALOGO = [
  // ── b — Funciones corporales ──────────────────────────────
  {code:'b110', label:'Funciones de la conciencia', dominio:'b'},
  {code:'b114', label:'Funciones de la orientación', dominio:'b'},
  {code:'b117', label:'Funciones intelectuales', dominio:'b'},
  {code:'b122', label:'Funciones psicosociales globales', dominio:'b'},
  {code:'b126', label:'Funciones del temperamento y la personalidad', dominio:'b'},
  {code:'b130', label:'Funciones de la energía y los impulsos', dominio:'b'},
  {code:'b134', label:'Funciones del sueño', dominio:'b'},
  {code:'b140', label:'Funciones de la atención', dominio:'b'},
  {code:'b144', label:'Funciones de la memoria', dominio:'b'},
  {code:'b147', label:'Funciones psicomotoras', dominio:'b'},
  {code:'b152', label:'Funciones emocionales', dominio:'b'},
  {code:'b156', label:'Funciones de la percepción', dominio:'b'},
  {code:'b160', label:'Funciones del pensamiento', dominio:'b'},
  {code:'b164', label:'Funciones cognitivas superiores', dominio:'b'},
  {code:'b167', label:'Funciones mentales del lenguaje', dominio:'b'},
  {code:'b172', label:'Funciones de cálculo', dominio:'b'},
  {code:'b210', label:'Funciones visuales', dominio:'b'},
  {code:'b230', label:'Funciones auditivas', dominio:'b'},
  {code:'b235', label:'Funciones vestibulares', dominio:'b'},
  {code:'b250', label:'Función del gusto', dominio:'b'},
  {code:'b265', label:'Función táctil', dominio:'b'},
  {code:'b280', label:'Sensación de dolor', dominio:'b'},
  {code:'b410', label:'Funciones cardíacas', dominio:'b'},
  {code:'b420', label:'Funciones de la presión arterial', dominio:'b'},
  {code:'b430', label:'Funciones hematológicas', dominio:'b'},
  {code:'b435', label:'Funciones del sistema inmunológico', dominio:'b'},
  {code:'b440', label:'Funciones respiratorias', dominio:'b'},
  {code:'b445', label:'Funciones de los músculos respiratorios', dominio:'b'},
  {code:'b455', label:'Funciones de tolerancia al ejercicio', dominio:'b'},
  {code:'b460', label:'Sensaciones asociadas a las funciones cardiovasculares y respiratorias', dominio:'b'},
  {code:'b510', label:'Funciones de ingestión', dominio:'b'},
  {code:'b525', label:'Funciones de defecación', dominio:'b'},
  {code:'b530', label:'Funciones de mantenimiento del peso', dominio:'b'},
  {code:'b620', label:'Funciones de la micción', dominio:'b'},
  {code:'b710', label:'Funciones de la movilidad de las articulaciones', dominio:'b', alias:'movilidad articular, rango de movimiento, ROM, amplitud articular'},
  {code:'b715', label:'Funciones de la estabilidad de las articulaciones', dominio:'b', alias:'estabilidad articular, inestabilidad'},
  {code:'b720', label:'Funciones de la movilidad de los huesos', dominio:'b'},
  {code:'b730', label:'Funciones de la fuerza muscular', dominio:'b', alias:'debilidad muscular'},
  {code:'b735', label:'Funciones del tono muscular', dominio:'b', alias:'espasticidad, hipertonía, hipotonía'},
  {code:'b740', label:'Funciones de la resistencia muscular', dominio:'b', alias:'resistencia, fatiga muscular'},
  {code:'b750', label:'Funciones de los reflejos motores', dominio:'b'},
  {code:'b755', label:'Funciones de las reacciones motoras involuntarias', dominio:'b'},
  {code:'b760', label:'Funciones del control del movimiento voluntario', dominio:'b'},
  {code:'b765', label:'Funciones del movimiento involuntario', dominio:'b'},
  {code:'b770', label:'Funciones del patrón de la marcha', dominio:'b', alias:'patrón de marcha, marcha, caminar'},
  {code:'b780', label:'Sensaciones relacionadas con los músculos y las funciones del movimiento', dominio:'b'},
  {code:'b810', label:'Funciones protectoras de la piel', dominio:'b'},
  {code:'b820', label:'Funciones reparadoras de la piel', dominio:'b'},

  // ── d — Actividades y Participación (usado tanto para Actividad como Participación) ──
  {code:'d110', label:'Mirar', dominio:'d'},
  {code:'d115', label:'Escuchar', dominio:'d'},
  {code:'d140', label:'Aprender a leer', dominio:'d'},
  {code:'d145', label:'Aprender a escribir', dominio:'d'},
  {code:'d150', label:'Aprender a calcular', dominio:'d'},
  {code:'d160', label:'Dirigir la atención', dominio:'d'},
  {code:'d163', label:'Pensar', dominio:'d'},
  {code:'d166', label:'Leer', dominio:'d'},
  {code:'d170', label:'Escribir', dominio:'d'},
  {code:'d175', label:'Resolver problemas', dominio:'d'},
  {code:'d177', label:'Tomar decisiones', dominio:'d'},
  {code:'d210', label:'Llevar a cabo una única tarea', dominio:'d'},
  {code:'d220', label:'Llevar a cabo múltiples tareas', dominio:'d'},
  {code:'d230', label:'Llevar a cabo la rutina diaria', dominio:'d'},
  {code:'d240', label:'Manejar el estrés y otras demandas psicológicas', dominio:'d'},
  {code:'d310', label:'Comunicarse y recibir mensajes hablados', dominio:'d'},
  {code:'d315', label:'Comunicarse y recibir mensajes no verbales', dominio:'d'},
  {code:'d330', label:'Hablar', dominio:'d'},
  {code:'d350', label:'Conversación', dominio:'d'},
  {code:'d360', label:'Utilización de aparatos y técnicas de comunicación', dominio:'d'},
  {code:'d410', label:'Cambiar las posturas corporales básicas', dominio:'d', alias:'cambios posturales, voltearse, cambios de posición'},
  {code:'d415', label:'Mantener la posición del cuerpo', dominio:'d'},
  {code:'d420', label:'Transferir el propio cuerpo', dominio:'d', alias:'transferencias, traslados'},
  {code:'d430', label:'Levantar y llevar objetos', dominio:'d'},
  {code:'d435', label:'Mover objetos con los miembros inferiores', dominio:'d'},
  {code:'d440', label:'Uso fino de la mano', dominio:'d'},
  {code:'d445', label:'Uso de la mano y el brazo', dominio:'d'},
  {code:'d450', label:'Andar', dominio:'d', alias:'caminar, marcha, deambulación'},
  {code:'d455', label:'Desplazarse por el entorno', dominio:'d', alias:'desplazamiento'},
  {code:'d460', label:'Desplazarse por distintos lugares', dominio:'d'},
  {code:'d465', label:'Desplazarse utilizando algún tipo de equipamiento', dominio:'d'},
  {code:'d470', label:'Utilización de medios de transporte', dominio:'d'},
  {code:'d475', label:'Conducir', dominio:'d'},
  {code:'d510', label:'Lavarse', dominio:'d', alias:'baño, aseo, ducharse'},
  {code:'d520', label:'Cuidado de partes del cuerpo', dominio:'d'},
  {code:'d530', label:'Higiene personal relacionada con los procesos de excreción', dominio:'d'},
  {code:'d540', label:'Vestirse', dominio:'d', alias:'vestido'},
  {code:'d550', label:'Comer', dominio:'d', alias:'alimentación'},
  {code:'d560', label:'Beber', dominio:'d', alias:'hidratación'},
  {code:'d570', label:'Cuidado de la propia salud', dominio:'d'},
  {code:'d610', label:'Adquisición de vivienda', dominio:'d'},
  {code:'d620', label:'Adquisición de bienes y servicios', dominio:'d'},
  {code:'d630', label:'Preparación de las comidas', dominio:'d'},
  {code:'d640', label:'Realización de los quehaceres del hogar', dominio:'d', alias:'tareas domésticas, quehaceres'},
  {code:'d650', label:'Cuidado de los objetos del hogar', dominio:'d'},
  {code:'d660', label:'Ayudar a otros', dominio:'d'},
  {code:'d710', label:'Interacciones interpersonales básicas', dominio:'d'},
  {code:'d720', label:'Interacciones interpersonales complejas', dominio:'d'},
  {code:'d730', label:'Relacionarse con extraños', dominio:'d'},
  {code:'d740', label:'Relaciones formales', dominio:'d'},
  {code:'d750', label:'Relaciones sociales informales', dominio:'d'},
  {code:'d760', label:'Relaciones familiares', dominio:'d'},
  {code:'d770', label:'Relaciones íntimas', dominio:'d'},
  {code:'d810', label:'Educación informal', dominio:'d'},
  {code:'d820', label:'Educación escolar', dominio:'d'},
  {code:'d830', label:'Educación superior', dominio:'d'},
  {code:'d840', label:'Aprendizaje relacionado con el trabajo', dominio:'d'},
  {code:'d845', label:'Conseguir, mantener y finalizar un trabajo', dominio:'d', alias:'conseguir empleo, búsqueda de trabajo'},
  {code:'d850', label:'Trabajo remunerado', dominio:'d', alias:'trabajo, empleo, laboral'},
  {code:'d855', label:'Trabajo no remunerado', dominio:'d'},
  {code:'d860', label:'Transacciones económicas básicas', dominio:'d'},
  {code:'d870', label:'Autosuficiencia económica', dominio:'d'},
  {code:'d910', label:'Vida comunitaria', dominio:'d'},
  {code:'d920', label:'Recreación y ocio', dominio:'d', alias:'recreación, ocio, deporte, hobbies'},
  {code:'d930', label:'Religión y espiritualidad', dominio:'d'},
  {code:'d950', label:'Vida política y ciudadanía', dominio:'d'},

  // ── e — Factores contextuales (ambientales) ────────────────
  {code:'e110', label:'Productos o sustancias para el consumo personal', dominio:'e'},
  {code:'e115', label:'Productos y tecnología para uso personal en la vida diaria', dominio:'e', alias:'ayudas técnicas, ortesis, prótesis'},
  {code:'e120', label:'Productos y tecnología para la movilidad y el transporte personal', dominio:'e', alias:'silla de ruedas, andador, bastón, muletas'},
  {code:'e125', label:'Productos y tecnología para la comunicación', dominio:'e'},
  {code:'e130', label:'Productos y tecnología para la educación', dominio:'e'},
  {code:'e135', label:'Productos y tecnología para el empleo', dominio:'e'},
  {code:'e140', label:'Productos y tecnología para actividades culturales, recreativas y deportivas', dominio:'e'},
  {code:'e150', label:'Diseño y construcción de edificios de uso público', dominio:'e'},
  {code:'e155', label:'Diseño y construcción de edificios de uso privado', dominio:'e'},
  {code:'e160', label:'Productos y tecnología del terreno', dominio:'e'},
  {code:'e225', label:'Clima', dominio:'e'},
  {code:'e240', label:'Luz', dominio:'e'},
  {code:'e250', label:'Sonido', dominio:'e'},
  {code:'e310', label:'Familia cercana', dominio:'e'},
  {code:'e320', label:'Amigos', dominio:'e'},
  {code:'e325', label:'Conocidos, compañeros, vecinos y miembros de la comunidad', dominio:'e'},
  {code:'e340', label:'Cuidadores y personal de ayuda', dominio:'e'},
  {code:'e355', label:'Profesionales de la salud', dominio:'e', alias:'médicos, terapeutas, personal de salud'},
  {code:'e360', label:'Otros profesionales', dominio:'e'},
  {code:'e410', label:'Actitudes individuales de la familia cercana', dominio:'e'},
  {code:'e420', label:'Actitudes individuales de amigos', dominio:'e'},
  {code:'e440', label:'Actitudes individuales de cuidadores y personal de ayuda', dominio:'e'},
  {code:'e450', label:'Actitudes individuales de profesionales de la salud', dominio:'e'},
  {code:'e460', label:'Actitudes sociales', dominio:'e'},
  {code:'e465', label:'Normas, prácticas e ideologías sociales', dominio:'e'},
  {code:'e525', label:'Servicios, sistemas y políticas de vivienda', dominio:'e'},
  {code:'e540', label:'Servicios, sistemas y políticas de transporte', dominio:'e'},
  {code:'e550', label:'Servicios, sistemas y políticas legales', dominio:'e'},
  {code:'e570', label:'Servicios, sistemas y políticas de seguridad social', dominio:'e'},
  {code:'e575', label:'Servicios, sistemas y políticas de apoyo social general', dominio:'e'},
  {code:'e580', label:'Servicios, sistemas y políticas sanitarias', dominio:'e'},
  {code:'e585', label:'Servicios, sistemas y políticas de educación y formación', dominio:'e'},
  {code:'e590', label:'Servicios, sistemas y políticas laborales y de empleo', dominio:'e'},
];

// Qué dominio del catálogo y qué tipo de calificador usa cada campo del formulario
const _CIF_CAMPOS = {
  cifDeterioro:     {dominio:'b', calificador:'severidad'},
  cifActividad:     {dominio:'d', calificador:'severidad'},
  cifParticipacion: {dominio:'d', calificador:'severidad'},
  cifContextual:    {dominio:'e', calificador:'facilitador'},
};

const CIF_SEVERIDAD = [
  {v:'0', l:'0 — Sin problema'},
  {v:'1', l:'1 — Leve'},
  {v:'2', l:'2 — Moderado'},
  {v:'3', l:'3 — Grave'},
  {v:'4', l:'4 — Completo'},
];
const CIF_FACILITADOR = [
  {v:'facilitador', l:'Facilitador'},
  {v:'barrera', l:'Barrera'},
];

function _cifNorm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

// ── Render del campo completo (buscador + sugerencias + chips) ──
function secCIFCampo(fieldId, titulo, placeholder, valoresGuardados){
  var cfg = _CIF_CAMPOS[fieldId];
  var iniciales = Array.isArray(valoresGuardados) ? valoresGuardados : [];
  var chips = iniciales.map(function(item){ return _cifChipHTML(fieldId, item, cfg.calificador); }).join('');
  return `<div class="field form-full cif-picker" style="margin-bottom:12px">
    <label for="${fieldId}_buscar">${titulo}</label>
    <div style="position:relative">
      <input class="inp" id="${fieldId}_buscar" placeholder="${e2(placeholder)}" autocomplete="off"
        oninput="filtrarCIF('${fieldId}', this.value)" onfocus="filtrarCIF('${fieldId}', this.value)"
        onblur="setTimeout(function(){var s=g('${fieldId}_sugerencias');if(s){s.style.display='none';}},150)">
      <div id="${fieldId}_sugerencias" class="cif-sugerencias" style="display:none"></div>
    </div>
    <div id="${fieldId}_list" class="cif-chips">${chips}</div>
  </div>`;
}

// ── Agregar la sección completa bajo demanda (botón "+ Agregar diagnóstico CIF") ──
function agregarSeccionCIF(){
  var wrap = g('cifPlaceholderWrap'); if(!wrap) return;
  wrap.outerHTML = secCIF({}, true);
  var hdr = document.getElementById('sec-cif')?.previousElementSibling;
  if(hdr) activarAcordeonSec(hdr);
}

function _cifCalificadorOpts(tipo, valorActual){
  var opts = tipo==='facilitador' ? CIF_FACILITADOR : CIF_SEVERIDAD;
  return opts.map(function(o){
    return `<option value="${o.v}" ${valorActual===o.v?'selected':''}>${o.l}</option>`;
  }).join('');
}

function _cifChipHTML(fieldId, item, tipoCalificador){
  return `<span class="cif-chip" data-cif-code="${e2(item.code)}" data-cif-label="${e2(item.label)}">
    <strong>${e2(item.code)}</strong> ${e2(item.label)}
    <select class="cif-chip-calif" onclick="event.stopPropagation()" onchange="event.stopPropagation()">${_cifCalificadorOpts(tipoCalificador, item.qualifier||'')}</select>
    <button type="button" class="cif-chip-x" onclick="quitarCIF('${fieldId}','${esc(item.code)}')" title="Quitar">✕</button>
  </span>`;
}

// ── Relevancia de un código frente a la búsqueda: menor = mejor coincidencia, -1 = no coincide ──
// Distintos usuarios buscan distinto (término formal CIF vs. lenguaje clínico habitual, orden
// de palabras distinto), así que se evalúan varios niveles antes de descartar un código:
//   0: el código empieza con la búsqueda (ej. "b28" → b280)
//   1: la etiqueta oficial contiene la frase completa
//   2: alguno de los sinónimos clínicos contiene la frase completa
//   3: todas las palabras de la búsqueda aparecen en la etiqueta, en cualquier orden
//   4: todas las palabras de la búsqueda aparecen en etiqueta + sinónimos combinados
function _cifScore(c, q, palabras){
  var codigoNorm = _cifNorm(c.code), labelNorm = _cifNorm(c.label), aliasNorm = _cifNorm(c.alias||'');
  if(codigoNorm.indexOf(q)===0) return 0;
  if(labelNorm.indexOf(q)!==-1) return 1;
  if(aliasNorm && aliasNorm.indexOf(q)!==-1) return 2;
  if(palabras.every(function(p){ return labelNorm.indexOf(p)!==-1; })) return 3;
  var combinado = labelNorm+' '+aliasNorm;
  if(palabras.every(function(p){ return combinado.indexOf(p)!==-1; })) return 4;
  return -1;
}

// ── Sugerencias filtradas mientras se escribe ──
function filtrarCIF(fieldId, texto){
  var cfg = _CIF_CAMPOS[fieldId]; if(!cfg) return;
  var cont = g(fieldId+'_sugerencias'); if(!cont) return;
  var q = _cifNorm(texto).trim();
  if(!q){ cont.style.display='none'; cont.innerHTML=''; return; }
  var palabras = q.split(/\s+/).filter(Boolean);
  var yaSeleccionados = _cifCodigosSeleccionados(fieldId);
  var candidatos = CIF_CATALOGO
    .filter(function(c){ return c.dominio===cfg.dominio && !yaSeleccionados.has(c.code); })
    .map(function(c){ return {c:c, score:_cifScore(c, q, palabras)}; })
    .filter(function(x){ return x.score!==-1; })
    .sort(function(a,b){ return a.score-b.score || a.c.code.localeCompare(b.c.code); })
    .slice(0,8)
    .map(function(x){ return x.c; });
  if(!candidatos.length){
    // Ocultar (no dejar un panel "Sin resultados" flotando): al ser position:absolute
    // quedaría sobre los chips ya seleccionados y bloquearía sus clics (quitar/calificador).
    cont.style.display='none'; cont.innerHTML='';
    return;
  }
  cont.innerHTML = candidatos.map(function(c){
    return `<div class="cif-sug-item" onmousedown="event.preventDefault();seleccionarCIF('${fieldId}','${c.code}')">
      <strong>${c.code}</strong> ${e2(c.label)}</div>`;
  }).join('');
  cont.style.display='block';
}

function _cifCodigosSeleccionados(fieldId){
  var set = new Set();
  var lista = g(fieldId+'_list'); if(!lista) return set;
  lista.querySelectorAll('[data-cif-code]').forEach(function(el){ set.add(el.dataset.cifCode); });
  return set;
}

function seleccionarCIF(fieldId, code){
  var cfg = _CIF_CAMPOS[fieldId]; if(!cfg) return;
  if(_cifCodigosSeleccionados(fieldId).has(code)) return;
  var item = CIF_CATALOGO.find(function(c){ return c.code===code && c.dominio===cfg.dominio; });
  if(!item) return;
  var lista = g(fieldId+'_list'); if(!lista) return;
  lista.insertAdjacentHTML('beforeend', _cifChipHTML(fieldId, item, cfg.calificador));
  var buscar = g(fieldId+'_buscar'); if(buscar) buscar.value='';
  var sug = g(fieldId+'_sugerencias'); if(sug){ sug.style.display='none'; sug.innerHTML=''; }
}

function quitarCIF(fieldId, code){
  var lista = g(fieldId+'_list'); if(!lista) return;
  var el = lista.querySelector('[data-cif-code="'+code+'"]');
  if(el) el.remove();
}

// ── Lectura al guardar (mismo patrón que _leerItemsEscala en escalas.js) ──
function leerCIF(fieldId){
  var lista = g(fieldId+'_list'); if(!lista) return [];
  var out = [];
  lista.querySelectorAll('[data-cif-code]').forEach(function(el){
    var sel = el.querySelector('.cif-chip-calif');
    out.push({ code: el.dataset.cifCode, label: el.dataset.cifLabel, qualifier: sel?sel.value:'' });
  });
  return out;
}

// ── Formato de solo lectura (resumen de paciente, visor de evaluación) ──
function formatCIF(valor){
  if(!valor) return '';
  if(typeof valor === 'string') return valor; // compat: texto libre de datos anteriores
  if(!Array.isArray(valor) || !valor.length) return '';
  return valor.map(function(item){
    var califTxt = '';
    if(item.qualifier==='facilitador') califTxt = ' (facilitador)';
    else if(item.qualifier==='barrera') califTxt = ' (barrera)';
    else if(item.qualifier) califTxt = ' (sev. '+item.qualifier+')';
    return item.code+' '+item.label+califTxt;
  }).join('; ');
}
