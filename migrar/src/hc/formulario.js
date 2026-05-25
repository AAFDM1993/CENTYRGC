// Construcción del formulario HC: catálogo de escalas, plantilla por categoría, secciones de anamnesis/trauma, pruebas funcionales

function plantillaHTML(catId, pac){
  const d = pac?.datosEspecificos || {};
  var secciones = secFiliacion(pac, d) + secAnamnesis(catId, pac, d);

  if(catId === 'traumatologia'){
    secciones += secTrauma(d);
  } else if(catId === 'neuro_adultos'){
    secciones += secNeuroAdultos(d);
  } else if(catId === 'neuro_pediatrica'){
    secciones += secNeuroPediatrica(d);
  } else if(catId === 'cardiorespiratorio'){
    secciones += secCardiorespiratorio(d);
  } else if(catId === 'postural'){
    secciones += secPostural(d);
  } else if(catId === 'paralisis_facial'){
    secciones += secParalisisFacial(d);
  } else if(catId === 'geriatria'){
    secciones += secGeriatria(d);
  }

  secciones += secPlanTratamiento(d);
  secciones += secEscalas(catId, d.escalas||null);
  return secciones;
}

function secWrap(id, titulo, icono, contenido, abierta){
  abierta = abierta===undefined ? false : abierta;
  return '<div class="hc-sec" style="margin-bottom:10px">'
    +'<div class="hc-sec-hdr">'
    +'<div class="hc-sec-title"><span>'+icono+'</span> '+titulo+'</div>'
    +'<span class="chv '+(abierta?'open':'')+'">▼</span>'
    +'</div>'
    +'<div class="hc-sec-body '+(abierta?'open':'')+'" id="sec-'+id+'">'
    +contenido
    +'</div></div>';
}

function secFiliacion(pac, d){
  const p=pac||{};
  const hoy=new Date().toISOString().slice(0,10);
  return secWrap('fil','I. Filiación','',`
    <div class="form-grid">
      <div class="field form-full"><label>Nombres y apellidos *</label>
        <input class="inp" id="pN" value="${e2(p.nombre||'')}" placeholder="Apellidos y nombres completos"></div>
      <div class="field"><label>DNI *</label>
        <input class="inp" id="pD" value="${e2(p.dni||'')}" placeholder="12345678"></div>
      <div class="field"><label>Fecha de nacimiento</label>
        <input class="inp" id="pFN" type="date" value="${p.fechaNac||''}" oninput="calcularEdadAuto()"></div>
      <div class="field"><label>Edad (calculada automáticamente)</label>
        <input class="inp" id="pEdad" value="${e2(d.edad||'')}" placeholder="Se calcula al ingresar fecha" readonly style="background:var(--surf2);cursor:default"></div>
      <div class="field"><label>Sexo</label>
        <select class="sel" id="pS">
          <option value=""></option>
          <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
          <option value="F" ${p.sexo==='F'?'selected':''}>Femenino</option>
        </select></div>
      <div class="field"><label>Ocupación</label>
        <input class="inp" id="pO" value="${e2(p.ocupacion||'')}" placeholder="Profesión u ocupación"></div>
      <div class="field"><label>Teléfono</label>
        <input class="inp" id="pT" value="${e2(p.telefono||'')}" placeholder="999 999 999"></div>
      <div class="field"><label>Fecha de evaluación</label>
        <input class="inp" id="pFI" type="date" value="${p.fechaInicio||(p._evalId?'':hoy)}"></div>
      <div class="field"><label>Responsable (si aplica)</label>
        <input class="inp" id="pR" value="${e2(p.responsable||'')}" placeholder="Nombre del responsable"></div>
      <div class="field"><label>Teléfono responsable</label>
        <input class="inp" id="pTR" value="${e2(p.telResponsable||'')}" placeholder="999 999 999"></div>
    </div>`,true);
}

function secAnamnesis(catId, pac, d){
  var camposDx = '';
  var camposExtra = '';

  // ── Diagnóstico médico por categoría ───────────────────────
  if(catId==='traumatologia'||catId==='neuro_adultos'||catId==='cardiorespiratorio'){
    var placeholderDx = catId==='traumatologia'?'Ej. S83.0 — Esguince rodilla, M54.5 — Lumbalgia...'
      :catId==='neuro_adultos'?'Ej. I63.9 — ACV isquémico, G35 — EM, G20 — Parkinson...'
      :'Ej. I50.0 — Insuficiencia cardíaca, J44.1 — EPOC...';
    camposDx = `<div class="field form-full" style="margin-bottom:12px"><label for="aDxMed">Diagnóstico médico</label>
      <input class="inp" id="aDxMed" value="${e2(d.dxMedico||pac?.dxMedico||'')}" placeholder="${placeholderDx}" name="aDxMed"></div>`;
  }

  if(catId==='postural'){
    camposExtra = `
    <div class="field" style="margin-bottom:12px"><label for="tiempoEvolPost">Tiempo de evolución</label>
      <input class="inp" id="tiempoEvolPost" value="${e2(d.tiempoEvolPost||'')}" placeholder="Ej: 6 meses, desde infancia..." name="tiempoEvolPost"></div>
    <div class="field" style="margin-bottom:12px"><label for="dolorPostural">Dolor asociado</label>
      <select class="sel" id="dolorPostural" name="dolorPostural"><option value=""></option>
        ${['No','Sí — cervical','Sí — dorsal','Sí — lumbar','Sí — múltiple'].map(v=>`<option ${d.dolorPostural===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field form-full" style="margin-bottom:12px"><label for="actFisicaPost">Actividad física / deporte habitual</label>
      <input class="inp" id="actFisicaPost" value="${e2(d.actFisicaPost||'')}" placeholder="Tipo, frecuencia, carga horaria..." name="actFisicaPost"></div>`;
  }

  if(catId==='geriatria'){
    camposDx = `<div class="field form-full" style="margin-bottom:12px"><label for="dxGeriatria">Diagnóstico médico principal</label>
      <input class="inp" id="dxGeriatria" value="${e2(d.dxGeriatria||pac?.dxMedico||'')}"
        placeholder="Ej: M81.0 Osteoporosis, M62.5 Sarcopenia, Z73.0 Sínd. de fragilidad..." name="dxGeriatria"></div>`;
    camposExtra = `
    <div class="field" style="margin-bottom:12px"><label for="edadGer">Edad</label>
      <input class="inp" id="edadGer" type="number" min="60" max="120" value="${e2(d.edadGer||'')}" placeholder="años" name="edadGer"></div>
    <div class="field" style="margin-bottom:12px"><label for="motivoGer">Motivo de evaluación</label>
      <input class="inp" id="motivoGer" value="${e2(d.motivoGer||d.motivo||pac?.motivo||'')}"
        placeholder="Ej: Prevención de caídas, rehabilitación post-fractura..." name="motivoGer"></div>
    <div class="field" style="margin-bottom:12px"><label for="tiempoEvolGer">Tiempo de evolución del problema principal</label>
      <input class="inp" id="tiempoEvolGer" value="${e2(d.tiempoEvolGer||'')}" placeholder="Ej: 6 meses, 2 años..." name="tiempoEvolGer"></div>
    <div class="field form-full" style="margin-bottom:12px"><label for="antecedentesGer">Antecedentes médicos relevantes</label>
      <textarea class="ta" id="antecedentesGer" rows="3"
        placeholder="HTA, DM2, EPOC, enfermedades reumáticas, fracturas previas..." name="antecedentesGer">${e2(d.antecedentesGer||pac?.antecedentes||'')}</textarea></div>
    <div class="field" style="margin-bottom:12px"><label for="tipoViviendaGer">Tipo de vivienda</label>
      <select class="sel" id="tipoViviendaGer" name="tipoViviendaGer"><option value=""></option>
        ${['Domicilio propio','Domicilio familiar','Residencia de ancianos','Hospitalizado'].map(v=>`<option ${d.tipoViviendaGer===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field" style="margin-bottom:12px"><label for="soporteSocial">Soporte social</label>
      <select class="sel" id="soporteSocial" name="soporteSocial"><option value=""></option>
        ${['Vive solo — sin apoyo','Vive solo — con apoyo ocasional','Vive acompañado — independiente','Vive acompañado — con cuidador','Cuidado institucional'].map(v=>`<option ${d.soporteSocial===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field" style="margin-bottom:12px"><label for="caidasGer">Caídas últimos 6 meses</label>
      <select class="sel" id="caidasGer" name="caidasGer"><option value=""></option>
        ${['Ninguna','1 caída','2 caídas','3 o más caídas'].map(v=>`<option ${d.caidasGer===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field" style="margin-bottom:12px"><label for="miedoCaer">Miedo a caer</label>
      <select class="sel" id="miedoCaer" name="miedoCaer"><option value=""></option>
        ${['Sin miedo','Leve — no modifica actividad','Moderado — limita algunas actividades','Grave — limita la mayoría de actividades'].map(v=>`<option ${d.miedoCaer===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field" style="margin-bottom:12px"><label for="polifarmaciaGer">Polifarmacia</label>
      <select class="sel" id="polifarmaciaGer" name="polifarmaciaGer"><option value=""></option>
        ${['Sin medicación','1-4 fármacos','5-9 fármacos (polifarmacia)','10+ fármacos (polifarmacia grave)'].map(v=>`<option ${d.polifarmaciaGer===v?'selected':''}>${v}</option>`).join('')}
      </select></div>
    <div class="field" style="margin-bottom:12px"><label for="estadoNutricional">Estado nutricional</label>
      <select class="sel" id="estadoNutricional" name="estadoNutricional"><option value=""></option>
        ${['Normal','Riesgo de desnutrición','Desnutrición leve-moderada','Desnutrición grave'].map(v=>`<option ${d.estadoNutricional===v?'selected':''}>${v}</option>`).join('')}
      </select></div>`;
  }

  return secWrap('anam','II. Anamnesis','',`
    <div class="form-grid">
      ${camposDx}
      <div class="field form-full" style="margin-bottom:12px"><label for="aDxFisio">Diagnóstico fisioterapéutico</label>
        <input class="inp" id="aDxFisio" value="${e2(d.dxFisio||'')}" placeholder="Diagnóstico fisioterapéutico" name="aDxFisio"></div>
      <div class="field form-full" style="margin-bottom:12px"><label for="aMotivo">Motivo de consulta / Examen subjetivo</label>
        <textarea class="ta" id="aMotivo" rows="3" placeholder="Sintomatología principal, motivo de consulta, dolor, limitaciones referidas..." name="aMotivo">${e2(d.motivo||pac?.motivo||'')}</textarea></div>
      <div class="field form-full" style="margin-bottom:12px"><label for="aAntecedentes">Antecedentes importantes y patológicos</label>
        <textarea class="ta" id="aAntecedentes" rows="3" placeholder="Antecedentes médicos, quirúrgicos, familiares, farmacológicos..." name="aAntecedentes">${e2(d.antecedentes||pac?.antecedentes||'')}</textarea></div>
      ${camposExtra}
    </div>
  `,true);
}

// ── Plantilla Traumatológica ──────────────────────
const ROM_MOV = {
  'Cervical':['Flexión','Extensión','Inclinación D','Inclinación I','Rotación D','Rotación I'],
  'Hombro D':['Flexión','Extensión','Abducción','Aducción','Rot. Interna','Rot. Externa'],
  'Hombro I':['Flexión','Extensión','Abducción','Aducción','Rot. Interna','Rot. Externa'],
  'Codo D':  ['Flexión','Extensión','Pronación','Supinación'],
  'Codo I':  ['Flexión','Extensión','Pronación','Supinación'],
  'Muñeca D':['Flexión','Extensión','Desv. Radial','Desv. Ulnar'],
  'Muñeca I':['Flexión','Extensión','Desv. Radial','Desv. Ulnar'],
  'Col. Dorsal':['Flexión','Extensión','Inclinación D','Inclinación I'],
  'Col. Lumbar':['Flexión','Extensión','Inclinación D','Inclinación I'],
  'Cadera D':['Flexión','Extensión','Abducción','Aducción','Rot. Int.','Rot. Ext.'],
  'Cadera I':['Flexión','Extensión','Abducción','Aducción','Rot. Int.','Rot. Ext.'],
  'Rodilla D':['Flexión','Extensión'],
  'Rodilla I':['Flexión','Extensión'],
  'Tobillo D':['Dorsiflexion','Plantiflexión','Inversión','Eversión'],
  'Tobillo I':['Dorsiflexion','Plantiflexión','Inversión','Eversión'],
};
const FUERZA_GRP = {
  'Cervical':  ['Flex. cervicales','Ext. cervicales'],
  'Hombro D':  ['Flexores','Extensores','Abductores','Aductores','Rotadores'],
  'Hombro I':  ['Flexores','Extensores','Abductores','Aductores','Rotadores'],
  'Codo D':    ['Flexores','Extensores','Pronadores','Supinadores'],
  'Codo I':    ['Flexores','Extensores','Pronadores','Supinadores'],
  'Muñeca D':  ['Flexores','Extensores','Interóseos'],
  'Muñeca I':  ['Flexores','Extensores','Interóseos'],
  'Col. Dorsal':['Ext. dorsales','Rotadores'],
  'Col. Lumbar':['Ext. lumbares','Abdominales'],
  'Cadera D':  ['Flexores','Extensores','Abductores','Rotadores'],
  'Cadera I':  ['Flexores','Extensores','Abductores','Rotadores'],
  'Rodilla D': ['Cuádriceps','Isquiotibiales'],
  'Rodilla I': ['Cuádriceps','Isquiotibiales'],
  'Tobillo D': ['Dorsiflexores','Flex. plantares','Inversores','Eversores'],
  'Tobillo I': ['Dorsiflexores','Flex. plantares','Inversores','Eversores'],
};

// ══════════════════════════════════════════════════════════════
// PRUEBAS FUNCIONALES POR SEGMENTO (Neuromusculoesquelética + Reumatología)
// ══════════════════════════════════════════════════════════════
const PRUEBAS_POR_REGION = {
  // ── HOMBRO ─────────────────────────────────────────────────
  'Hombro D': [
    {nombre:'Test de Jobe (manguito rotador — supraespinoso)',resultado:''},
    {nombre:'Test de Hawkins-Kennedy (impingement subacromial)',resultado:''},
    {nombre:'Test de Neer (impingement)',resultado:''},
    {nombre:'Test de Gerber (subescapular — lift-off)',resultado:''},
    {nombre:'Test de Patte (infraespinoso)',resultado:''},
    {nombre:'Test de Yocum (impingement)',resultado:''},
    {nombre:'Test de O\'Brien (SLAP / AC)',resultado:''},
    {nombre:'Test de Speed (bíceps)',resultado:''},
    {nombre:'Test de Yergason (bíceps)',resultado:''},
    {nombre:'Test de aprensión anterior (inestabilidad)',resultado:''},
    {nombre:'Test de reubicación (inestabilidad)',resultado:''},
    {nombre:'Test de surco (inestabilidad inferior)',resultado:''},
    {nombre:'Test de Cross-body (articulación AC)',resultado:''},
    {nombre:'Test de Drop arm (manguito rotador)',resultado:''},
    {nombre:'Test de Belly press (subescapular)',resultado:''},
    {nombre:'Test de Bear hug (subescapular)',resultado:''},
  ],
  'Hombro I': [
    {nombre:'Test de Jobe (manguito rotador — supraespinoso)',resultado:''},
    {nombre:'Test de Hawkins-Kennedy (impingement subacromial)',resultado:''},
    {nombre:'Test de Neer (impingement)',resultado:''},
    {nombre:'Test de Gerber (subescapular — lift-off)',resultado:''},
    {nombre:'Test de Patte (infraespinoso)',resultado:''},
    {nombre:'Test de Yocum (impingement)',resultado:''},
    {nombre:'Test de O\'Brien (SLAP / AC)',resultado:''},
    {nombre:'Test de Speed (bíceps)',resultado:''},
    {nombre:'Test de Yergason (bíceps)',resultado:''},
    {nombre:'Test de aprensión anterior (inestabilidad)',resultado:''},
    {nombre:'Test de reubicación (inestabilidad)',resultado:''},
    {nombre:'Test de surco (inestabilidad inferior)',resultado:''},
    {nombre:'Test de Cross-body (articulación AC)',resultado:''},
    {nombre:'Test de Drop arm (manguito rotador)',resultado:''},
    {nombre:'Test de Belly press (subescapular)',resultado:''},
    {nombre:'Test de Bear hug (subescapular)',resultado:''},
  ],
  // ── CODO ───────────────────────────────────────────────────
  'Codo D': [
    {nombre:'Test de Cozen (epicondilitis lateral)',resultado:''},
    {nombre:'Test de Mill (epicondilitis lateral)',resultado:''},
    {nombre:'Test de Maudsley (dedo medio)',resultado:''},
    {nombre:'Test de Golfer\'s elbow (epitrocleitis medial)',resultado:''},
    {nombre:'Test de compresión del nervio cubital — Tinel codo',resultado:''},
    {nombre:'Test de valgo stress (LCM)',resultado:''},
    {nombre:'Test de varo stress (LCL)',resultado:''},
    {nombre:'Test de estabilidad radiocubital distal',resultado:''},
    {nombre:'Test de Valgus extension overload (pinzamiento posteromedial)',resultado:''},
  ],
  'Codo I': [
    {nombre:'Test de Cozen (epicondilitis lateral)',resultado:''},
    {nombre:'Test de Mill (epicondilitis lateral)',resultado:''},
    {nombre:'Test de Maudsley (dedo medio)',resultado:''},
    {nombre:'Test de Golfer\'s elbow (epitrocleitis medial)',resultado:''},
    {nombre:'Test de compresión del nervio cubital — Tinel codo',resultado:''},
    {nombre:'Test de valgo stress (LCM)',resultado:''},
    {nombre:'Test de varo stress (LCL)',resultado:''},
    {nombre:'Test de estabilidad radiocubital distal',resultado:''},
    {nombre:'Test de Valgus extension overload (pinzamiento posteromedial)',resultado:''},
  ],
  // ── MUÑECA ─────────────────────────────────────────────────
  'Muñeca D': [
    {nombre:'Test de Phalen (síndrome del túnel carpiano)',resultado:''},
    {nombre:'Test de Tinel — muñeca (túnel carpiano)',resultado:''},
    {nombre:'Maniobra de Durkan (compresión carpal directa)',resultado:''},
    {nombre:'Test de Finkelstein (tenosinovitis De Quervain)',resultado:''},
    {nombre:'Test de Watson (inestabilidad escafoides)',resultado:''},
    {nombre:'Test de estrés del TFCC (fibrocartílago triangular)',resultado:''},
    {nombre:'Test de Froment (nervio cubital)',resultado:''},
    {nombre:'Test de Grip strength (dinamometría)',resultado:''},
    {nombre:'Test de Tinel — canal de Guyón (nervio cubital)',resultado:''},
    {nombre:'Test de balanceo del carpo (inestabilidad carpal)',resultado:''},
  ],
  'Muñeca I': [
    {nombre:'Test de Phalen (síndrome del túnel carpiano)',resultado:''},
    {nombre:'Test de Tinel — muñeca (túnel carpiano)',resultado:''},
    {nombre:'Maniobra de Durkan (compresión carpal directa)',resultado:''},
    {nombre:'Test de Finkelstein (tenosinovitis De Quervain)',resultado:''},
    {nombre:'Test de Watson (inestabilidad escafoides)',resultado:''},
    {nombre:'Test de estrés del TFCC (fibrocartílago triangular)',resultado:''},
    {nombre:'Test de Froment (nervio cubital)',resultado:''},
    {nombre:'Test de Grip strength (dinamometría)',resultado:''},
    {nombre:'Test de Tinel — canal de Guyón (nervio cubital)',resultado:''},
    {nombre:'Test de balanceo del carpo (inestabilidad carpal)',resultado:''},
  ],
  // ── COLUMNA CERVICAL ────────────────────────────────────────
  'Col. Cervical': [
    {nombre:'Test de compresión de Spurling (radiculopatía cervical)',resultado:''},
    {nombre:'Test de distracción cervical (radiculopatía)',resultado:''},
    {nombre:'Test de Valsalva cervical (presión intratecal)',resultado:''},
    {nombre:'Test de Lhermitte (mielopatía cervical)',resultado:''},
    {nombre:'Test de Adams (flexión cervical)',resultado:''},
    {nombre:'Maniobra de Adson (síndrome del desfiladero torácico)',resultado:''},
    {nombre:'Test de compresión del plexo braquial — Roos',resultado:''},
    {nombre:'Test de rotación cervical — Hautant (arteria vertebral)',resultado:''},
    {nombre:'Test de Sharp-Purser (inestabilidad atlantoaxial)',resultado:''},
    {nombre:'Test de Jackson (compresión cervical lateral)',resultado:''},
    {nombre:'Test de flexión-rotación (C1-C2 — cefalea cervicogénica)',resultado:''},
    {nombre:'Test de máxima compresión foraminal',resultado:''},
  ],
  // ── COLUMNA DORSAL ──────────────────────────────────────────
  'Col. Dorsal': [
    {nombre:'Test de compresión vertebral dorsal (fractura por aplastamiento)',resultado:''},
    {nombre:'Test de percusión espinal (dolor vertebral)',resultado:''},
    {nombre:'Test de Slump (sensibilización neural — dorsal)',resultado:''},
    {nombre:'Maniobra de Adson modificada (desfiladero torácico)',resultado:''},
    {nombre:'Test de costilla (disfunción costal)',resultado:''},
    {nombre:'Test de respiración (movilidad costal)',resultado:''},
    {nombre:'Test de Adams (escoliosis)',resultado:''},
  ],
  // ── COLUMNA LUMBAR ──────────────────────────────────────────
  'Col. Lumbar': [
    {nombre:'Test de Lasègue — SLR (ciática / radiculopatía L4-S1)',resultado:''},
    {nombre:'Test de Lasègue cruzado (ciática contralateral)',resultado:''},
    {nombre:'Test de Bragard (irritación radicular — variante SLR)',resultado:''},
    {nombre:'Test de Valsalva lumbar (presión intradiscal)',resultado:''},
    {nombre:'Test de Hoover (simulación / magnif. de dolor)',resultado:''},
    {nombre:'Test de Slump (sensibilización del sistema nervioso)',resultado:''},
    {nombre:'Test de McKenzie — extensión pasiva en prono',resultado:''},
    {nombre:'Test de femoral nerve stretch — FNS (L2-L3-L4)',resultado:''},
    {nombre:'Test de FABER — Patrick (SI / cadera)',resultado:''},
    {nombre:'Test de FADIR (SI — provoc. anterior)',resultado:''},
    {nombre:'Test de Gaenslen (articulación sacroilíaca)',resultado:''},
    {nombre:'Test de compresión sacroilíaca (SI)',resultado:''},
    {nombre:'Test de distracción sacroilíaca (SI)',resultado:''},
    {nombre:'Test de Thigh thrust (SI)',resultado:''},
    {nombre:'Maniobra de Gillet (movilidad SI)',resultado:''},
    {nombre:'Test de Waddell — signos no orgánicos',resultado:''},
    {nombre:'Test de Kemp (compresión e inclinación ipsilateral)',resultado:''},
  ],
  // ── CADERA ─────────────────────────────────────────────────
  'Cadera D': [
    {nombre:'Test de FABER — Patrick (cadera/sacroilíaco)',resultado:''},
    {nombre:'Test de FADIR (impingement femoroacetabular)',resultado:''},
    {nombre:'Test de Thomas (contractura de flexores de cadera)',resultado:''},
    {nombre:'Test de Ober (contractura de TFL/IT)',resultado:''},
    {nombre:'Test de Trendelenburg (insuf. glúteo medio)',resultado:''},
    {nombre:'Test de Ely (retracción recto femoral)',resultado:''},
    {nombre:'Test de log roll (inestabilidad articular)',resultado:''},
    {nombre:'Test de compresión del labrum (cadera)',resultado:''},
    {nombre:'Test de impingement anterior (CAM/Pincer)',resultado:''},
    {nombre:'Test de Craig (anteversión femoral)',resultado:''},
    {nombre:'Test de Stinchfield (flexor de cadera activo)',resultado:''},
    {nombre:'Test de Dial (rotación externa — LCP/LPL)',resultado:''},
    {nombre:'Test de Scour (degeneración articular)',resultado:''},
  ],
  'Cadera I': [
    {nombre:'Test de FABER — Patrick (cadera/sacroilíaco)',resultado:''},
    {nombre:'Test de FADIR (impingement femoroacetabular)',resultado:''},
    {nombre:'Test de Thomas (contractura de flexores de cadera)',resultado:''},
    {nombre:'Test de Ober (contractura de TFL/IT)',resultado:''},
    {nombre:'Test de Trendelenburg (insuf. glúteo medio)',resultado:''},
    {nombre:'Test de Ely (retracción recto femoral)',resultado:''},
    {nombre:'Test de log roll (inestabilidad articular)',resultado:''},
    {nombre:'Test de compresión del labrum (cadera)',resultado:''},
    {nombre:'Test de impingement anterior (CAM/Pincer)',resultado:''},
    {nombre:'Test de Craig (anteversión femoral)',resultado:''},
    {nombre:'Test de Stinchfield (flexor de cadera activo)',resultado:''},
    {nombre:'Test de Dial (rotación externa — LCP/LPL)',resultado:''},
    {nombre:'Test de Scour (degeneración articular)',resultado:''},
  ],
  // ── RODILLA ────────────────────────────────────────────────
  'Rodilla D': [
    {nombre:'Test de Lachman (LCA)',resultado:''},
    {nombre:'Test de cajón anterior (LCA)',resultado:''},
    {nombre:'Test de cajón posterior (LCP)',resultado:''},
    {nombre:'Test de pivot shift (LCA — inestabilidad rotatoria)',resultado:''},
    {nombre:'Test de valgo stress 0&deg; (LCM completo)',resultado:''},
    {nombre:'Test de valgo stress 30&deg; (LCM aislado)',resultado:''},
    {nombre:'Test de varo stress 0&deg; (LCL completo)',resultado:''},
    {nombre:'Test de varo stress 30&deg; (LCL aislado)',resultado:''},
    {nombre:'Test de McMurray (menisco)',resultado:''},
    {nombre:'Test de Apley (menisco)',resultado:''},
    {nombre:'Test de Thessaly (menisco — dinámico)',resultado:''},
    {nombre:'Test de compresión lateral de rótula',resultado:''},
    {nombre:'Test de aprensión rotuliana',resultado:''},
    {nombre:'Test de Clarke (condromalacia rotuliana)',resultado:''},
    {nombre:'Test de dial (esquina posterolateral)',resultado:''},
    {nombre:'Test de Godfrey (LCP — caída posterior)',resultado:''},
    {nombre:'Test de recurvatum en rotación externa (EPL)',resultado:''},
  ],
  'Rodilla I': [
    {nombre:'Test de Lachman (LCA)',resultado:''},
    {nombre:'Test de cajón anterior (LCA)',resultado:''},
    {nombre:'Test de cajón posterior (LCP)',resultado:''},
    {nombre:'Test de pivot shift (LCA — inestabilidad rotatoria)',resultado:''},
    {nombre:'Test de valgo stress 0&deg; (LCM completo)',resultado:''},
    {nombre:'Test de valgo stress 30&deg; (LCM aislado)',resultado:''},
    {nombre:'Test de varo stress 0&deg; (LCL completo)',resultado:''},
    {nombre:'Test de varo stress 30&deg; (LCL aislado)',resultado:''},
    {nombre:'Test de McMurray (menisco)',resultado:''},
    {nombre:'Test de Apley (menisco)',resultado:''},
    {nombre:'Test de Thessaly (menisco — dinámico)',resultado:''},
    {nombre:'Test de compresión lateral de rótula',resultado:''},
    {nombre:'Test de aprensión rotuliana',resultado:''},
    {nombre:'Test de Clarke (condromalacia rotuliana)',resultado:''},
    {nombre:'Test de dial (esquina posterolateral)',resultado:''},
    {nombre:'Test de Godfrey (LCP — caída posterior)',resultado:''},
    {nombre:'Test de recurvatum en rotación externa (EPL)',resultado:''},
  ],
  // ── TOBILLO / PIE ──────────────────────────────────────────
  'Tobillo D': [
    {nombre:'Test del cajón anterior (LPAA — inestabilidad lateral)',resultado:''},
    {nombre:'Test de stress en inversión (LCL — LPAA)',resultado:''},
    {nombre:'Test de Thompson (rotura tendón de Aquiles)',resultado:''},
    {nombre:'Test de compresión de peroné (fractura)',resultado:''},
    {nombre:'Test de Ottawa Ankle Rules (fractura maleolar)',resultado:''},
    {nombre:'Test de Mulder (neuroma de Morton)',resultado:''},
    {nombre:'Test de Windlass (fascitis plantar)',resultado:''},
    {nombre:'Test de Tinel — tobillo (nervio tibial posterior)',resultado:''},
    {nombre:'Test de Kleiger (lesión sindesmosis)',resultado:''},
    {nombre:'Test de Silfverskiöld (dorsiflexión con rodilla extendida)',resultado:''},
    {nombre:'Test de eversión stress (deltoides)',resultado:''},
    {nombre:'Test de compresión sindesmosis (squeeze test)',resultado:''},
  ],
  'Tobillo I': [
    {nombre:'Test del cajón anterior (LPAA — inestabilidad lateral)',resultado:''},
    {nombre:'Test de stress en inversión (LCL — LPAA)',resultado:''},
    {nombre:'Test de Thompson (rotura tendón de Aquiles)',resultado:''},
    {nombre:'Test de compresión de peroné (fractura)',resultado:''},
    {nombre:'Test de Ottawa Ankle Rules (fractura maleolar)',resultado:''},
    {nombre:'Test de Mulder (neuroma de Morton)',resultado:''},
    {nombre:'Test de Windlass (fascitis plantar)',resultado:''},
    {nombre:'Test de Tinel — tobillo (nervio tibial posterior)',resultado:''},
    {nombre:'Test de Kleiger (lesión sindesmosis)',resultado:''},
    {nombre:'Test de Silfverskiöld (dorsiflexión con rodilla extendida)',resultado:''},
    {nombre:'Test de eversión stress (deltoides)',resultado:''},
    {nombre:'Test de compresión sindesmosis (squeeze test)',resultado:''},
  ],
  // ── CERVICAL (alias sin punto para compatibilidad) ──────────
  'Cervical': [
    {nombre:'Test de compresión de Spurling (radiculopatía cervical)',resultado:''},
    {nombre:'Test de distracción cervical (radiculopatía)',resultado:''},
    {nombre:'Test de Valsalva cervical (presión intratecal)',resultado:''},
    {nombre:'Test de Lhermitte (mielopatía cervical)',resultado:''},
    {nombre:'Test de Adams (flexión cervical)',resultado:''},
    {nombre:'Maniobra de Adson (síndrome del desfiladero torácico)',resultado:''},
    {nombre:'Test de compresión del plexo braquial — Roos',resultado:''},
    {nombre:'Test de rotación cervical — Hautant (arteria vertebral)',resultado:''},
    {nombre:'Test de Sharp-Purser (inestabilidad atlantoaxial)',resultado:''},
    {nombre:'Test de Jackson (compresión cervical lateral)',resultado:''},
    {nombre:'Test de flexión-rotación (C1-C2 — cefalea cervicogénica)',resultado:''},
  ],
};

// Normaliza región a la clave del catálogo (quita D/I si no existe clave específica)
function _keyPrueba(region){
  if(PRUEBAS_POR_REGION[region]) return region;
  // Columna lumbar/cervical
  var base=region.replace(/ [DI]$/,'').replace(/^Col\./,'Col.');
  if(PRUEBAS_POR_REGION[base]) return base;
  return null;
}

// Construye el HTML de pruebas para las regiones seleccionadas
function mkPruebasFuncionales(sel, pruebasGuardadas){
  pruebasGuardadas = pruebasGuardadas || {};
  var regConPruebas = (sel||[]).filter(function(r){ return _keyPrueba(r); });
  if(!regConPruebas.length) return '';
  var html = '';
  regConPruebas.forEach(function(region){
    var key = _keyPrueba(region);
    var todasPruebas = PRUEBAS_POR_REGION[key] || [];
    var savedRegion = pruebasGuardadas[region] || {};
    var agregadas = todasPruebas.filter(function(p){ return savedRegion[p.nombre] !== undefined; });
    var regionId = region.replace(/[^a-z0-9]/gi,'_');
    html += '<div style="margin-bottom:16px" id="prueba_region_'+regionId+'">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding:7px 12px;background:var(--surf3);border-radius:8px">';
    html += '<span style="font-size:12px;font-weight:700;color:var(--tx2)">'+e2(region)+'</span>';
    html += '<button type="button" class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px"'
          + ' data-reg="'+e2(region)+'" data-rid="'+e2(regionId)+'"'
          + ' onclick="abrirModalPruebas(this.getAttribute(\'data-reg\'),this.getAttribute(\'data-rid\'))">+ Seleccionar pruebas</button>';
    html += '</div>';
    html += '<div id="prueba_lista_'+regionId+'" style="display:flex;flex-direction:column;gap:5px">';
    agregadas.forEach(function(p){ html += _mkPruebaFila(region, p.nombre, savedRegion[p.nombre]||'', regionId); });
    if(!agregadas.length) html += '<div style="font-size:12px;color:var(--tx4);padding:4px 12px;font-style:italic">Sin pruebas seleccionadas</div>';
    html += '</div></div>';
  });
  return html;
}

function _mkPruebaFila(region, nombre, savedVal, regionId){
  var html = '<div data-fila-prueba="1" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;background:var(--surf);border-radius:8px;border:1px solid var(--bd)">';
  html += '<span style="font-size:11px;flex:1;color:var(--tx)">'+e2(nombre)+'</span>';
  html += '<select class="sel" data-prueba-region="'+e2(region)+'" data-prueba-nombre="'+e2(nombre)+'" style="font-size:11px;padding:4px 6px;width:140px;flex-shrink:0">';
  html += '<option value="">&#8212;</option>';
  ['+  Positivo','-  Negativo','Dudoso','No realizado'].forEach(function(op){
    html += '<option value="'+e2(op)+'"'+(savedVal===op?' selected':'')+'>'+e2(op)+'</option>';
  });
  html += '</select>';
  html += '<button type="button"'
       + ' data-qreg="'+e2(region)+'" data-qnom="'+e2(nombre)+'" data-qrid="'+e2(regionId)+'"'
       + ' onclick="quitarPrueba(this.getAttribute(\'data-qreg\'),this.getAttribute(\'data-qnom\'),this.getAttribute(\'data-qrid\'))"';
  html += 'style="background:none;border:none;color:var(--tx4);cursor:pointer;font-size:18px;padding:0 4px;flex-shrink:0;line-height:1" title="Quitar">&times;</button>';
  html += '</div>';
  return html;
}

var _modalPruebasRegion = '', _modalPruebasRegionId = '';

function abrirModalPruebas(region, regionId){
  _modalPruebasRegion = region;
  _modalPruebasRegionId = regionId;
  var m = g('modalPruebas'); if(!m) return;
  var tit = g('modalPruebasTit'); if(tit) tit.textContent = region;
  var busq = g('pruebaSearch'); if(busq) busq.value = '';
  _renderListaPruebas('');
  m.style.display = 'flex';
  if(busq) setTimeout(function(){ busq.focus(); }, 100);
}

function cerrarModalPruebas(){
  var m = g('modalPruebas'); if(m) m.style.display = 'none';
}

function filtrarModalPruebas(q){
  _renderListaPruebas((q||'').toLowerCase());
}

function _renderListaPruebas(q){
  var lista = g('pruebasList'); if(!lista) return;
  var key = _keyPrueba(_modalPruebasRegion);
  var todas = PRUEBAS_POR_REGION[key] || [];
  var filtradas = q ? todas.filter(function(p){ return p.nombre.toLowerCase().indexOf(q) !== -1; }) : todas;
  if(!filtradas.length){
    lista.innerHTML = '<div style="text-align:center;color:var(--tx4);font-size:13px;padding:20px">Sin resultados</div>';
    return;
  }
  var listaDOM = g('prueba_lista_'+_modalPruebasRegionId);
  var yaAgregadas = {};
  if(listaDOM){
    listaDOM.querySelectorAll('[data-prueba-nombre]').forEach(function(el){
      yaAgregadas[el.getAttribute('data-prueba-nombre')] = true;
    });
  }
  lista.innerHTML = filtradas.map(function(p){
    var ya = !!yaAgregadas[p.nombre];
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:var(--surf2);border:1px solid var(--bd);border-radius:10px;'+(ya?'opacity:.5':'cursor:pointer')+'" '
      +(ya ? '' : 'data-prueba="'+e2(p.nombre)+'" onclick="_seleccionarPrueba(this.getAttribute(\'data-prueba\'))"')+'>'
      +'<span style="font-size:12px;flex:1;color:var(--tx)">'+e2(p.nombre)+'</span>'
      +(ya
        ? '<span style="font-size:11px;color:var(--green);font-weight:700;flex-shrink:0">&#10003; Agregada</span>'
        : '<button class="btn btn-primary btn-sm" style="flex-shrink:0">+ Agregar</button>')
      +'</div>';
  }).join('');
}

function _seleccionarPrueba(nombre){
  var lista = g('prueba_lista_'+_modalPruebasRegionId); if(!lista) return;
  var existe = false;
  lista.querySelectorAll('[data-prueba-nombre]').forEach(function(el){
    if(el.getAttribute('data-prueba-nombre') === nombre) existe = true;
  });
  if(existe) return;
  var vacio = lista.querySelector('[style*="font-style:italic"]');
  if(vacio) vacio.remove();
  lista.insertAdjacentHTML('beforeend', _mkPruebaFila(_modalPruebasRegion, nombre, '', _modalPruebasRegionId));
  _renderListaPruebas(g('pruebaSearch') ? g('pruebaSearch').value.toLowerCase() : '');
}

function quitarPrueba(region, nombre, regionId){
  var lista = g('prueba_lista_'+regionId); if(!lista) return;
  lista.querySelectorAll('[data-prueba-nombre]').forEach(function(el){
    if(el.getAttribute('data-prueba-nombre') === nombre){
      var fila = el.closest('[data-fila-prueba]'); if(fila) fila.remove();
    }
  });
  if(_modalPruebasRegionId === regionId){
    _renderListaPruebas(g('pruebaSearch') ? g('pruebaSearch').value.toLowerCase() : '');
  }
}

// Lee las pruebas seleccionadas del DOM → { region: { nombrePrueba: resultado } }
function leerPruebasFuncionales(){
  var resultado = {};
  document.querySelectorAll('[data-prueba-region]').forEach(function(el){
    var reg = el.getAttribute('data-prueba-region');
    var nom = el.getAttribute('data-prueba-nombre');
    if(!reg || !nom) return;
    if(!resultado[reg]) resultado[reg] = {};
    resultado[reg][nom] = el.value || '';
  });
  return resultado;
}

function actualizarPruebas(){
  var sel = Array.from(document.querySelectorAll('#regionesWrap span[data-r]')).map(function(s){return s.getAttribute('data-r');});
  // Preservar resultados ya ingresados antes de re-renderizar
  var saved = leerPruebasFuncionales();
  var pw = g('tablaPruebasWrap');
  if(pw) pw.innerHTML = mkPruebasFuncionales(sel, saved);
}

const TODAS_REGIONES = Object.keys(ROM_MOV);

function secTrauma(d){
  const sel=d.regiones||[];
  return secWrap('trauma','III. Examen objetivo','',`
    <div style="margin-bottom:16px">
      <label style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:8px">Regiones afectadas</label>
      <div style="position:relative;margin-bottom:8px">
        <input class="inp" id="regionSearch" placeholder="Buscar segmento (ej: Hombro D, Rodilla I...)" oninput="filtrarRegiones(this.value)" autocomplete="off">
        <div id="regionDropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--surf);border:1px solid var(--bd);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:400;max-height:200px;overflow-y:auto"></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;min-height:36px;padding:4px 0" id="regionesWrap">
        ${sel.map(r=>`<span data-r="${r}" style="display:inline-flex;align-items:center;gap:4px;background:var(--n500);color:#fff;border-radius:20px;padding:4px 10px 4px 12px;font-size:12px;font-weight:600">${r}<button type="button" onclick="quitarRegion(encodeURIComponent('${r}'),event)" style="background:none;border:none;color:rgba(255,255,255,.75);cursor:pointer;font-size:16px;line-height:1;padding:0 0 0 2px">&#215;</button></span>`).join('')}
        ${sel.length===0?'<span style="font-size:12px;color:var(--tx4)">Sin regiones &mdash; usa el buscador</span>':''}
      </div>
    </div>
    <div class="field" style="margin-bottom:14px"><label>Palpación</label>
      <textarea class="ta" id="tPalpacion" rows="3" placeholder="Hallazgos a la palpación: dolor, temperatura, consistencia, puntos gatillo...">${e2(d.palpacion||'')}</textarea></div>
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Rangos articulares (grados)</div>
      <div id="tablaROMWrap" style="overflow-x:auto">${mkRomParalelo(sel,d.rom,"rom")}</div>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Fuerza muscular — Escala Daniels (0-5)</div>
      <div id="tablaFuerzaWrap" style="overflow-x:auto">${mkRomParalelo(sel,d.fuerza,"fuerza")}</div>
    </div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label>Trofismo</label>
        <select class="sel" id="tTrofismo">
          <option value=""></option>
          ${['Normal','Hipotrofia leve','Hipotrofia moderada','Hipotrofia severa','Hipertrofia','Atrofia'].map(v=>`<option ${d.trofismo===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>EVA — Dolor (0-10)</label>
        <div class="eva-wrap" style="margin-top:6px">
          <div class="eva-track" style="position:relative">
            <input type="range" class="eva-sl" id="tEva" min="0" max="10" step="1" value="${d.eva??0}" oninput="g('tEvaD').textContent=this.value">
          </div>
          <div class="eva-val" id="tEvaD">${d.eva??0}</div>
        </div></div>
      <div class="field"><label>Localización del dolor</label>
        <input class="inp" id="tDolLoc" value="${e2(d.dolLoc||'')}" placeholder="Ej. Rodilla derecha medial"></div>
      <div class="field"><label>Tipo de dolor</label>
        <select class="sel" id="tDolTipo">
          <option value=""></option>
          ${['Agudo','Crónico','Nociceptivo','Neuropático','Mixto','Referido'].map(v=>`<option ${d.dolTipo===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Neurológico</div>
    <div class="field" style="margin-bottom:14px"><label>Sensibilidad y reflejos osteotendinosos</label>
      <textarea class="ta" id="tNeuro" rows="3" placeholder="Sensibilidad superficial/profunda, reflejos osteotendinosos...">${e2(d.neuro||'')}</textarea></div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Tegumentario</div>
    <div class="field" style="margin-bottom:14px"><label>Inspección</label>
      <textarea class="ta" id="tTegu" rows="3" placeholder="Coloración, edema, cicatrices, heridas, cambios cutáneos...">${e2(d.tegu||'')}</textarea></div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px;display:flex;align-items:center;gap:6px">Pruebas funcionales específicas por segmento</div>
    <div id="tablaPruebasWrap" style="margin-bottom:14px">${mkPruebasFuncionales(sel, d.pruebasFuncionales||{})}</div>
    <div class="field" style="margin-bottom:14px"><label>Observaciones adicionales de pruebas</label>
      <textarea class="ta" id="tPruebas" rows="2" placeholder="Pruebas no listadas, hallazgos adicionales, contexto clínico...">${e2(d.pruebas||'')}</textarea></div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Exámenes auxiliares</div>
    <div class="field"><label>Exámenes auxiliares</label>
      <textarea class="ta" id="tAux" rows="3" placeholder="Radiografías, RMN, ecografías, laboratorio: hallazgos relevantes...">${e2(d.aux||'')}</textarea></div>
  `,true);
}

// ══════════════════════════════════════════════════════════════
// SECCIÓN A: CATÁLOGO DE ESCALAS
// ══════════════════════════════════════════════════════════════

const ESCALAS_CATALOGO = [

  // ── GENERALES (todas las fichas adulto) ──────────────────

  { id:'eva', nombre:'EVA / NRS — Dolor', desc:'Escala visual analógica de dolor del 0 al 10.',
    dominio:'Dolor', cats:'all', ped:true,
    render: renderEscalaEVA, calcular: calcularEVA },

  { id:'borg', nombre:'Escala de Borg', desc:'Percepción subjetiva del esfuerzo durante el ejercicio (0-10).',
    dominio:'Esfuerzo', cats:'all', ped:false,
    render: renderEscalaBorg, calcular: calcularBorg },

  { id:'berg', nombre:'Escala de Berg', desc:'Evalúa el equilibrio funcional en 14 ítems (0-56 pts).',
    dominio:'Equilibrio', cats:'all', ped:true,
    render: renderEscalaBerg, calcular: calcularBerg },

  { id:'tug', nombre:'Timed Up and Go (TUG)', desc:'Mide movilidad y riesgo de caída. Se cronometra en segundos.',
    dominio:'Movilidad', cats:'all', ped:true,
    render: renderEscalaTUG, calcular: calcularTUG },

  { id:'sts30', nombre:'Sit-to-Stand 30s', desc:'Número de veces que se levanta y sienta en 30 segundos. Evalúa fuerza en MMII.',
    dominio:'Fuerza MMII', cats:'all', ped:false,
    render: renderEscalaSTS30, calcular: calcularSTS30 },

  { id:'sixmwt', nombre:'6-Minute Walk Test (6MWT)', desc:'Distancia recorrida en 6 minutos. Evalúa capacidad funcional aeróbica.',
    dominio:'Resistencia', cats:'all', ped:true,
    render: renderEscala6MWT, calcular: calcular6MWT },

  { id:'barthel', nombre:'Índice de Barthel', desc:'Evalúa independencia en AVD básicas. 10 ítems, máximo 100 pts.',
    dominio:'AVD', cats:'all', ped:false,
    render: renderEscalaBarthel, calcular: calcularBarthel },

  { id:'ashworth', nombre:'Escala de Ashworth Modificada', desc:'Evalúa el grado de espasticidad/tono muscular por segmento (0-4).',
    dominio:'Tono muscular', cats:'all', ped:true,
    render: renderEscalaAshworth, calcular: calcularAshworth },

  // ── CARDIORRESPIRATORIO ──────────────────────────────────

  { id:'mrc_disnea', nombre:'MRC — Escala de disnea', desc:'Gradúa la disnea en actividades cotidianas en 5 niveles (0-4).',
    dominio:'Respiratorio', cats:['cardiorespiratorio','geriatria','postural'], ped:false,
    render: renderEscalaMRC, calcular: calcularMRC },

  { id:'nyha', nombre:'NYHA — Clase funcional cardíaca', desc:'Clasifica la limitación funcional por insuficiencia cardíaca en 4 clases.',
    dominio:'Cardíaco', cats:['cardiorespiratorio','geriatria','postural'], ped:false,
    render: renderEscalaNYHA, calcular: calcularNYHA },

  { id:'espirometria', nombre:'Espirometría — PEF / FVC / FEV1 / FEV1/FVC', desc:'Registra los valores espirométricos principales y muestra interpretación orientativa.',
    dominio:'Respiratorio', cats:['cardiorespiratorio'], ped:false,
    render: renderEscalaEspirometria, calcular: calcularEspirometria },

  { id:'asia', nombre:'ASIA — Clasificación de lesión medular', desc:'American Spinal Injury Association. Clasifica el nivel neurológico y el grado de lesión medular (A-E) con exploración motora y sensitiva.',
    dominio:'Lesión medular', cats:['neuro_adultos'], ped:false,
    render: renderEscalaASIA, calcular: calcularASIA },

  { id:'nihss', nombre:'NIHSS — Escala de Ictus del NIH', desc:'Evalúa déficit neurológico post-ACV en 11 ítems. 0 = sin déficit, >25 = gravísimo.',
    dominio:'ACV', cats:['neuro_adultos'], ped:false,
    render: renderEscalaNIHSS, calcular: calcularNIHSS },

  { id:'hoehn_yahr', nombre:'Hoehn & Yahr — Parkinson', desc:'Clasifica la progresión de la enfermedad de Parkinson en 5 estadios.',
    dominio:'Parkinson', cats:['neuro_adultos'], ped:false,
    render: renderEscalaHoehnYahr, calcular: calcularHoehnYahr },

  { id:'edss', nombre:'EDSS — Esclerosis Múltiple', desc:'Expanded Disability Status Scale. Cuantifica discapacidad en EM. 0 (normal) a 10 (muerte por EM).',
    dominio:'Esclerosis múltiple', cats:['neuro_adultos'], ped:false,
    render: renderEscalaEDSS, calcular: calcularEDSS },

  { id:'sunnybrook', nombre:'Sunnybrook — Parálisis facial', desc:'Evalúa simetría en reposo, movimiento voluntario y sincinesias. Puntuación compuesta 0-100 (mayor = mejor función).',
    dominio:'Parálisis facial', cats:['paralisis_facial'], ped:false,
    render: renderEscalaSunnybrook, calcular: calcularSunnybrook },

  // ── GERIÁTRICA ───────────────────────────────────────────

  { id:'gds15', nombre:'GDS-15 — Depresión Geriátrica', desc:'15 ítems. 0-4 normal, 5-8 leve, 9-11 moderada, 12-15 grave.',
    dominio:'Psicológico', cats:['geriatria'], ped:false,
    render: renderEscalaGDS15, calcular: calcularGDS15 },

  { id:'lawton', nombre:'Índice de Lawton-Brody', desc:'Evalúa independencia en AVD instrumentales. 8 ítems, máximo 8 pts.',
    dominio:'AVD Instrumentales', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaLawton, calcular: calcularLawton },

  { id:'sppb', nombre:'SPPB — Short Physical Performance Battery', desc:'3 subtest: equilibrio, velocidad de marcha y Sit-to-Stand. Máximo 12 pts.',
    dominio:'Rendimiento físico', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaSPPB, calcular: calcularSPPB },

  { id:'tinetti', nombre:'Tinetti — Marcha y Equilibrio', desc:'Evalúa equilibrio (16 pts) y marcha (12 pts). Total 28 pts.',
    dominio:'Marcha/Equilibrio', cats:['traumatologia','postural','geriatria','neuro_adultos'], ped:false,
    render: renderEscalaTinetti, calcular: calcularTinetti },

  { id:'fesi', nombre:'FES-I — Miedo a caer', desc:'Evalúa la preocupación por caídas en 16 actividades (16-64 pts).',
    dominio:'Psicosocial', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaFESI, calcular: calcularFESI },

  { id:'mmse', nombre:'MMSE — Mini Mental State', desc:'Evalúa estado cognitivo global. 30 preguntas, máximo 30 pts.',
    dominio:'Cognitivo', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaMMSE, calcular: calcularMMSE },

  { id:'mna', nombre:'MNA Breve — Nutricional', desc:'Cribado nutricional rápido. 6 ítems, máximo 14 pts.',
    dominio:'Nutricional', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaMNA, calcular: calcularMNA },

  { id:'fried', nombre:'Criterios de Fried — Fragilidad', desc:'5 criterios de fragilidad. Clasifica en robusto, pre-frágil o frágil.',
    dominio:'Fragilidad', cats:['traumatologia','postural','geriatria'], ped:false,
    render: renderEscalaFried, calcular: calcularFried },

  // ── NEURO ADULTOS ────────────────────────────────────────

  { id:'tardieu', nombre:'Escala de Tardieu', desc:'Evalúa espasticidad considerando velocidad del estiramiento. Por segmento.',
    dominio:'Espasticidad', cats:['neuro_adultos','postural'], ped:true,
    render: renderEscalaTardieu, calcular: calcularTardieu },

  // ── TRAUMATOLOGÍA ────────────────────────────────────────

  { id:'dash', nombre:'DASH — Miembro Superior', desc:'Discapacidad del brazo, hombro y mano. 30 ítems, 0-100 pts (mayor = peor).',
    dominio:'MMSS', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaDASH, calcular: calcularDASH },

  { id:'quickdash', nombre:'QuickDASH', desc:'Versión breve del DASH. 11 ítems, 0-100 pts.',
    dominio:'MMSS', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaQuickDASH, calcular: calcularQuickDASH },

  { id:'womac', nombre:'WOMAC — Cadera/Rodilla', desc:'Evalúa dolor, rigidez y función en cadera o rodilla. 24 ítems, 3 subescalas.',
    dominio:'Cadera/Rodilla', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaWOMAC, calcular: calcularWOMAC },

  { id:'koos', nombre:'KOOS — Rodilla', desc:'5 subescalas para rodilla: síntomas, dolor, AVD, deporte y calidad de vida.',
    dominio:'Rodilla', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaKOOS, calcular: calcularKOOS },

  { id:'hoos', nombre:'HOOS — Cadera', desc:'5 subescalas para cadera: síntomas, dolor, AVD, deporte y calidad de vida.',
    dominio:'Cadera', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaHOOS, calcular: calcularHOOS },

  { id:'constant', nombre:'Constant-Murley — Hombro', desc:'Evalúa función del hombro: dolor, AVD, movilidad y fuerza. Máximo 100 pts.',
    dominio:'Hombro', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaConstant, calcular: calcularConstant },

  { id:'lysholm', nombre:'Lysholm — Rodilla/Ligamentos', desc:'8 ítems para función de rodilla. 0-100 pts (mayor = mejor).',
    dominio:'Rodilla', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaLysholm, calcular: calcularLysholm },

  { id:'visap', nombre:'VISA-P — Tendón Patelar', desc:'Evalúa severidad de tendinopatía patelar. 8 ítems, 0-100 pts.',
    dominio:'Tendón', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaVISAP, calcular: calcularVISAP },

  { id:'visaa', nombre:'VISA-A — Tendón Aquiles', desc:'Evalúa severidad de tendinopatía aquílea. 8 ítems, 0-100 pts.',
    dominio:'Tendón', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaVISAA, calcular: calcularVISAA },

  { id:'faam', nombre:'FAAM — Tobillo/Pie', desc:'Función del tobillo y pie. 2 subescalas: AVD y deporte.',
    dominio:'Tobillo/Pie', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaFAAM, calcular: calcularFAAM },

  { id:'ndi', nombre:'NDI — Índice de Discapacidad Cervical', desc:'10 ítems para discapacidad cervical. 0-50 pts (mayor = peor).',
    dominio:'Columna cervical', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaNDI, calcular: calcularNDI },

  { id:'oswestry', nombre:'Oswestry — Columna Lumbar', desc:'10 ítems para discapacidad lumbar. Resultado en porcentaje.',
    dominio:'Columna lumbar', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaOswestry, calcular: calcularOswestry },

  { id:'tampa', nombre:'Tampa Scale — Kinesiofobia', desc:'17 ítems. Evalúa miedo al movimiento/relesión. 17-68 pts.',
    dominio:'Psicosocial', cats:['traumatologia','postural'], ped:false,
    render: renderEscalaTampa, calcular: calcularTampa },

  // ── PEDIÁTRICA ───────────────────────────────────────────

  { id:'gmfcs', nombre:'GMFCS — Clasificación Motor Grueso', desc:'Clasifica función motora gruesa en PC. 5 niveles (I-V).',
    dominio:'Motor grueso', cats:['neuro_pediatrica'], ped:true, pedOnly:true,
    render: renderEscalaGMFCS, calcular: calcularGMFCS },

  { id:'macs', nombre:'MACS — Función de Mano', desc:'Clasifica uso de manos en actividades cotidianas. 5 niveles (I-V).',
    dominio:'Función mano', cats:['neuro_pediatrica'], ped:true, pedOnly:true,
    render: renderEscalaMACS, calcular: calcularMACS },

  { id:'weefim', nombre:'WeeFIM — Medida de Independencia', desc:'18 ítems funcionales adaptados a niños. Máximo 126 pts.',
    dominio:'Funcional pediátrico', cats:['neuro_pediatrica'], ped:true, pedOnly:true,
    render: renderEscalaWeeFIM, calcular: calcularWeeFIM },

  { id:'aims', nombre:'Escala de Desarrollo Motor Infantil de Alberta (AIMS)', desc:'Evaluación observacional del desarrollo motor en 4 posiciones: prono, supino, sedestación y bipedestación.',
    dominio:'Desarrollo Motor', cats:'all', ped:true,
    render: renderEscalaAIMS, calcular: calcularAIMS },

  // ── FLEXIBILIDAD Y ACORTAMIENTOS ─────────────────────────
  { id:'flex_acort', nombre:'Flexibilidad y Acortamientos Musculares',
    desc:'Tests de flexibilidad global y acortamientos musculares: Thomas, Ely, Ober, popliteo, dorsiflexion, Schober.',
    dominio:'Flexibilidad', cats:'all', ped:false,
    render: function(d){
      var fv=function(k){ return d&&d.items?d.items[k]||'':''; };
      var sel=function(id,opts,val){
        return '<select class="sel" style="font-size:12px" data-escala-item="'+id+'">'
          +'<option value=""></option>'
          +opts.map(function(o){return '<option'+(val===o?' selected':'')+'>'+o+'</option>';}).join('')
          +'</select>';
      };
      var inp=function(id,ph,val,min,max){
        return '<input class="inp" type="number" style="font-size:12px" data-escala-item="'+id+'"'
          +' placeholder="'+ph+'" value="'+(val||'')+'" min="'+min+'" max="'+max+'" step="0.5">';
      };
      var THOMAS=['Negativo','Positivo - acortamiento iliopsoas','Positivo - acortamiento recto femoral'];
      var BINARIO=['Negativo','Positivo'];
      return '<div class="form-grid" style="gap:8px">'
        +'<div class="field"><label style="font-size:11px">Test dedos-suelo (cm)</label>'+inp('testDedusSuelo','cm (- toca suelo)',fv('testDedusSuelo'),'-30','50')+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Schober (cm)</label>'+inp('testSchober','cm (normal >=5)',fv('testSchober'),'0','10')+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Thomas D</label>'+sel('thomasD',THOMAS,fv('thomasD'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Thomas I</label>'+sel('thomasI',THOMAS,fv('thomasI'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Ely D (recto femoral)</label>'+sel('elyD',BINARIO,fv('elyD'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Ely I (recto femoral)</label>'+sel('elyI',BINARIO,fv('elyI'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Angulo poplíteo D (&deg;)</label>'+inp('popliD','&deg; (normal <20)',fv('popliD'),'0','180')+'</div>'
        +'<div class="field"><label style="font-size:11px">Angulo poplíteo I (&deg;)</label>'+inp('popliI','&deg;',fv('popliI'),'0','180')+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Ober D (TFL)</label>'+sel('oberD',BINARIO,fv('oberD'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Test Ober I (TFL)</label>'+sel('oberI',BINARIO,fv('oberI'))+'</div>'
        +'<div class="field"><label style="font-size:11px">Dorsiflexion tobillo D (&deg;)</label>'+inp('dorsiflexD','&deg; (normal >=10)',fv('dorsiflexD'),'0','30')+'</div>'
        +'<div class="field"><label style="font-size:11px">Dorsiflexion tobillo I (&deg;)</label>'+inp('dorsiflexI','&deg;',fv('dorsiflexI'),'0','30')+'</div>'
        +'<div class="field form-full"><label style="font-size:11px">Observaciones</label>'
        +'<textarea class="ta" rows="2" data-escala-item="obsFlexPost" style="font-size:12px">'+((d&&d.items)?d.items.obsFlexPost||'':'')+'</textarea></div>'
        +'</div>';
    },
    calcular: function(id){
      var b=g('escala_bloque_'+id); if(!b) return null;
      var items={};
      b.querySelectorAll('[data-escala-item]').forEach(function(el){
        var k=el.dataset.escalaItem;
        items[k]=el.tagName==='SELECT'?el.value:(el.tagName==='TEXTAREA'?el.value:el.value);
      });
      var hasData=Object.values(items).some(function(v){return v&&v!=='';});
      return hasData?{items:items,interpretacion:'Ver resultados',puntaje:null}:null;
    }
  },
];


// ══════════════════════════════════════════════════════════════
// SECCIÓN B: MOTOR DE ESCALAS (ScalasEngine)
// ══════════════════════════════════════════════════════════════

// Estado global de escalas activas en el formulario actual
var _escalasActivas = {}; // { escalaId: { fechaAplicacion, items... } }
var _catIdActual = '';    // categoría del formulario actual

// ── Helpers ─────────────────────────────────────────────────

function _esPediatrica(catId){ return catId==='neuro_pediatrica'; }

function _escalasDisponibles(catId){
  const ped = _esPediatrica(catId);
  return ESCALAS_CATALOGO.filter(function(e){
    if(ped && !e.ped) return false;         // ocultar no-ped en pediátrica
    if(!ped && e.pedOnly) return false;     // ocultar exclusivas-ped en adultos
    if(e.cats==='all') return true;
    return e.cats.indexOf(catId)!==-1;
  });
}

function _escalaYaAgregada(id){ return !!document.getElementById('escala_bloque_'+id); }

function _selEsc(id){ return ESCALAS_CATALOGO.find(function(e){return e.id===id;}); }

// ── Sección wrapper en el formulario ─────────────────────────

function secEscalas(catId, datosEscalas){
  _catIdActual = catId;
  _escalasActivas = {};
  var html = '<div id="secEscalasWrap" style="margin-top:6px">';
  // Si hay escalas guardadas, renderizarlas precargadas
  if(datosEscalas && typeof datosEscalas==='object'){
    Object.keys(datosEscalas).forEach(function(eid){
      var def = _selEsc(eid);
      if(def) html += _renderBloqueEscala(def, datosEscalas[eid]);
    });
  }
  html += '</div>';
  html += '<button type="button" class="btn btn-ghost btn-sm" style="margin-top:10px;width:100%;justify-content:center;border-style:dashed" onclick="abrirModalEscalas()">'
        + '+ Agregar escala</button>';
  return secWrap('escalas','Escalas aplicadas','', html, true);
}

// ── Modal: abrir / cerrar / filtrar ─────────────────────────

function abrirModalEscalas(){
  var m = g('modalEscalas');
  if(!m) return;
  m.style.display = 'flex';
  var inp = g('escalaSearch');
  if(inp){ inp.value=''; inp.focus(); }
  _renderListaEscalas('');
}

function cerrarModalEscalas(){
  var m = g('modalEscalas');
  if(m) m.style.display='none';
}

function filtrarModalEscalas(q){
  _renderListaEscalas((q||'').toLowerCase());
}

function _renderListaEscalas(q){
  var lista = g('escalasList'); if(!lista) return;
  var disponibles = _escalasDisponibles(_catIdActual);
  var filtradas = q ? disponibles.filter(function(e){
    return e.nombre.toLowerCase().indexOf(q)!==-1 || e.dominio.toLowerCase().indexOf(q)!==-1 || e.desc.toLowerCase().indexOf(q)!==-1;
  }) : disponibles;

  if(!filtradas.length){
    lista.innerHTML='<div style="text-align:center;color:var(--tx4);font-size:13px;padding:20px">Sin resultados</div>';
    return;
  }

  lista.innerHTML = filtradas.map(function(e){
    var yaEsta = _escalaYaAgregada(e.id);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:var(--surf2);border:1px solid var(--bd);border-radius:10px;'+(yaEsta?'opacity:.55':'cursor:pointer')+'" '
      +(yaEsta?'':'data-selesc="'+e2(e.id)+'" onclick="seleccionarEscala(this.getAttribute(\'data-selesc\'))"')+'>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-weight:700;font-size:13px;color:var(--tx)">'+e2(e.nombre)+'</div>'
      +'<div style="font-size:11px;color:var(--tx3);margin-top:2px">'+e2(e.desc)+'</div>'
      +'<div style="margin-top:4px"><span style="font-size:10px;font-weight:700;background:var(--surf3);color:var(--tx3);border:1px solid var(--bd);border-radius:20px;padding:2px 8px">'+e2(e.dominio)+'</span></div>'
      +'</div>'
      +'<div style="flex-shrink:0">'
      +(yaEsta
        ? '<span style="font-size:11px;color:var(--green);font-weight:700">✓ Agregada</span>'
        : '<button class="btn btn-primary btn-sm">+ Agregar</button>')
      +'</div></div>';
  }).join('');
}

function seleccionarEscala(id){
  if(_escalaYaAgregada(id)){ toast('Esta escala ya fue agregada','','warn'); return; }
  var def = _selEsc(id); if(!def) return;
  var wrap = g('secEscalasWrap'); if(!wrap) return;
  wrap.insertAdjacentHTML('beforeend', _renderBloqueEscala(def, null));
  cerrarModalEscalas();
  // Scroll al bloque recién agregado
  var bloque = g('escala_bloque_'+id);
  if(bloque) bloque.scrollIntoView({behavior:'smooth', block:'nearest'});
}

// ── Render de bloque individual de escala ────────────────────

function _renderBloqueEscala(def, datosGuardados){
  var fecha = (datosGuardados && datosGuardados.fechaAplicacion) || new Date().toISOString().slice(0,10);
  var html = '<div id="escala_bloque_'+def.id+'" style="background:var(--surf2);border:1px solid var(--bd2);border-radius:12px;margin-bottom:10px;overflow:hidden">';
  // Encabezado del bloque
  html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surf3);border-bottom:1px solid var(--bd);cursor:pointer" onclick="toggleEscalaBloque(\''+def.id+'\')">';
  html += '<div style="display:flex;align-items:center;gap:8px">';
  html += '<span style="font-size:13px" id="ico_escala_'+def.id+'">▼</span>';
  html += '<span style="font-weight:700;font-size:13px;color:var(--tx)">'+e2(def.nombre)+'</span>';
  html += '<span style="font-size:10px;background:var(--surf);color:var(--tx3);border:1px solid var(--bd);border-radius:20px;padding:2px 7px">'+e2(def.dominio)+'</span>';
  html += '</div>';
  html += '<button type="button" onclick="eliminarEscala(\''+def.id+'\',event)" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px" title="Quitar escala">✕</button>';
  html += '</div>';
  // Cuerpo colapsable
  html += '<div id="escala_body_'+def.id+'" style="padding:14px">';
  // Fecha de aplicación
  html += '<div class="field" style="margin-bottom:14px">';
  html += '<label style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px">Fecha de aplicación</label>';
  html += '<input class="inp" type="date" id="escala_fecha_'+def.id+'" value="'+fecha+'" style="max-width:180px">';
  html += '</div>';
  // Contenido específico de la escala
  html += def.render(datosGuardados);
  // Resultado en tiempo real
  html += '<div id="escala_resultado_'+def.id+'" style="margin-top:14px;padding:12px 14px;background:var(--n050,#eff6ff);border:1px solid var(--bd2);border-radius:10px;display:none">';
  html += '<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">Resultado</div>';
  html += '<div id="escala_puntaje_'+def.id+'" style="font-size:20px;font-weight:800;color:var(--n700)"></div>';
  html += '<div id="escala_interp_'+def.id+'" style="font-size:12px;color:var(--tx2);margin-top:4px"></div>';
  html += '</div>';
  html += '</div></div>';
  return html;
}

