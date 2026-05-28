// Guardado unificado del formulario de historia clínica

async function guardarHC(catId, pacId, modo){
  if(!tryLock()) return;
  // Si el paciente fue creado como borrador, el botón aún tiene pacId vacío;
  // leer el hidden input que se actualiza al guardar.
  pacId = pacId || g('hcPacId')?.value || '';
  const nombre=g('pN')?.value?.trim()||'';
  const dni=g('pD')?.value?.trim()||'';
  if(!nombre||!dni){_busy=false;toast('Nombre y DNI son requeridos','','warn');return;}
  // Validar docente si es estudiante
  const docenteHC=g('hcDoc')?.value||g('hcDocInput')?.value||'';
  const docenteHCCodigo=g('hcDocCodigo')?.value||'';
  if(session.rol==='estudiante'&&!docenteHC){_busy=false;toast('⚠️ Debes seleccionar un docente supervisor','Es obligatorio para guardar la evaluación','warn');return;}

  const esBorrador = modo==='borrador';
  showSendOverlay(
    esBorrador ? '💾 Guardando borrador...' : '📤 Enviando evaluación...',
    esBorrador ? 'Guardando datos localmente' : 'Enviando al docente supervisor'
  );
  function v(id){return g(id)?.value||'';}
  try{

  // Leer campos comunes
  const datosNeuro = catId==='neuro_adultos' ? {
    // Historia neurológica
    dxNeuroMedico:v('dxNeuroMedico'),tipoCondicionNeuro:v('tipoCondicionNeuro'),tiempoEvolucionNeuro:v('tiempoEvolucionNeuro'),
    ladoAfectadoNeuro:v('ladoAfectadoNeuro'),clasificacionFuncional:v('clasificacionFuncional'),
    dolorNeuro:v('dolorNeuro'),evaNeuroDolor:g('evaNeuroDolor')?Number(g('evaNeuroDolor').value):0,
    historiaCondicion:v('historiaCondicion'),antecedentesNeuro:v('antecedentesNeuro'),
    // Estado cognitivo
    nConciencia:v('nConciencia'),lateralidad:v('lateralidad'),orientacion:v('orientacion'),
    comunicacion:v('comunicacion'),memoria:v('memoria'),atencion:v('atencion'),obsCognitivo:v('obsCognitivo'),
    // Motor
    tono_MMSS_D:v('tono_MMSS_D'),tono_MMSS_I:v('tono_MMSS_I'),tono_MMII_D:v('tono_MMII_D'),tono_MMII_I:v('tono_MMII_I'),
    fuerza_MMSS_D:v('fuerza_MMSS_D'),fuerza_MMSS_I:v('fuerza_MMSS_I'),fuerza_MMII_D:v('fuerza_MMII_D'),fuerza_MMII_I:v('fuerza_MMII_I'),
    reflejos:v('reflejos'),babinski:v('babinski'),clonus:v('clonus'),coordinacion:v('coordinacion'),movInvoluntarios:v('movInvoluntarios'),obsMotor:v('obsMotor'),
    // Sensibilidad
    sensTactil:v('sensTactil'),sensDolor:v('sensDolor'),sensTermica:v('sensTermica'),propiocepccion:v('propiocepccion'),zonaAfectada:v('zonaAfectada'),obsSensibilidad:v('obsSensibilidad'),
    // Control postural
    controlCefal:v('controlCefal'),controlTronco:v('controlTronco'),eqEstatico:v('eqEstatico'),eqDinamico:v('eqDinamico'),obsPostural:v('obsPostural'),
    // Marcha
    tipoMarcha:v('tipoMarcha'),patronMarcha:v('patronMarcha'),ayudaTecnica:v('ayudaTecnica'),transferenciaCS:v('transferenciaCS'),transferenciaSP:v('transferenciaSP'),obsMarcha:v('obsMarcha'),marchaDescripcion:v('marchaDescripcion'),
    // AVD
    avdBasicasAfect:v('avdBasicasAfect'),avdInstAfect:v('avdInstAfect'),
    cifDeterioro:v('cifDeterioro'),cifActividad:v('cifActividad'),cifParticipacion:v('cifParticipacion'),cifContextual:v('cifContextual'),
  } : {};

  // Leer campos específicos de neuro pediátrica
  const datosPed = catId==='neuro_pediatrica' ? {
    dxMedico:v('aDxMed'),tiempoEvol:v('tiempoEvol'),tipoParto:v('tipoParto'),semanasGest:v('semanasGest'),pesoNacer:v('pesoNacer'),apgar:v('apgar'),antePrenatal:v('antePrenatal'),antePosnatal:v('antePosnatal'),medicacion:v('medicacion'),
    // Hitos del desarrollo con observaciones
    hitosSostenCef:v('hitosSostenCef'),hitosSostenCef_obs:v('hitosSostenCef_obs'),
    hitosSedest:v('hitosSedest'),hitosSedest_obs:v('hitosSedest_obs'),
    hitosGateo:v('hitosGateo'),hitosGateo_obs:v('hitosGateo_obs'),
    hitosBiped:v('hitosBiped'),hitosBiped_obs:v('hitosBiped_obs'),
    hitosMarcha:v('hitosMarcha'),hitosMarcha_obs:v('hitosMarcha_obs'),
    hitosLenguaje:v('hitosLenguaje'),hitosLenguaje_obs:v('hitosLenguaje_obs'),
    escolarizacion:v('escolarizacion'),obsDesarrollo:v('obsDesarrollo'),
    alertaPed:v('alertaPed'),comprensionPed:v('comprensionPed'),conductaPed:v('conductaPed'),comunicacionPed:v('comunicacionPed'),obsCognitivoPed:v('obsCognitivoPed'),
    // Tono y fuerza pediátrica (IDs generados por secMotorPed con prefijo tonoPed_/fuerzaPed_)
    tonoPed_MMSS_D:v('tonoPed_MMSS_D'),tonoPed_MMSS_I:v('tonoPed_MMSS_I'),tonoPed_MMII_D:v('tonoPed_MMII_D'),tonoPed_MMII_I:v('tonoPed_MMII_I'),
    fuerzaPed_MMSS_D:v('fuerzaPed_MMSS_D'),fuerzaPed_MMSS_I:v('fuerzaPed_MMSS_I'),fuerzaPed_MMII_D:v('fuerzaPed_MMII_D'),fuerzaPed_MMII_I:v('fuerzaPed_MMII_I'),
    refMoro:v('refMoro'),refTANC:v('refTANC'),refTL:v('refTL'),refPrension:v('refPrension'),reaccEnderez:v('reaccEnderez'),reaccEquilib:v('reaccEquilib'),patronesMovPed:v('patronesMovPed'),obsMotorPed:v('obsMotorPed'),
    controlCefalPed:v('controlCefalPed'),sedestacionPed:v('sedestacionPed'),bipedPed:v('bipedPed'),ortesisPed:v('ortesisPed'),obsPosturalPed:v('obsPosturalPed'),
    tipoMarchaPed:v('tipoMarchaPed'),patronMarchaPed:v('patronMarchaPed'),ayudaTecPed:v('ayudaTecPed'),obsMarchaPed:v('obsMarchaPed'),
    marchaPedDescripcion:v('marchaPedDescripcion'),
    prensionPed:v('prensionPed'),lateralidadPed:v('lateralidadPed'),alcancePed:v('alcancePed'),obsMMSSPed:v('obsMMSSPed'),
    alimentPed:v('alimentPed'),higienePed:v('higienePed'),juegoSoc:v('juegoSoc'),progDomiciliario:v('progDomiciliario'),
    cifDeterioro:v('cifDeterioro'),cifActividad:v('cifActividad'),cifParticipacion:v('cifParticipacion'),cifContextual:v('cifContextual'),
  } : {};

  const datosPostural = catId === 'postural' ? {
    tiempoEvolPost: v('tiempoEvolPost'),
    dolorPostural: v('dolorPostural'),
    actFisicaPost: v('actFisicaPost'),
    // Vista anterior
    cabezaAnt:v('cabezaAnt'),hombrosAnt:v('hombrosAnt'),clavicular:v('clavicular'),
    triangulTalle:v('triangulTalle'),pelvisAnt:v('pelvisAnt'),rodillasAnt:v('rodillasAnt'),
    pieDerAnt:v('pieDerAnt'),pieIzqAnt:v('pieIzqAnt'),obsAnt:v('obsAnt'),
    // Vista posterior
    occipucio:v('occipucio'),escapulas:v('escapulas'),columnaPost:v('columnaPost'),
    plieguesGluteos:v('plieguesGluteos'),plieguesPopliteos:v('plieguesPopliteos'),
    talones:v('talones'),obsPost:v('obsPost'),
    // Vista lateral
    cabezaLat:v('cabezaLat'),curvaCervical:v('curvaCervical'),curvaDorsal:v('curvaDorsal'),
    curvaLumbar:v('curvaLumbar'),pelvisLat:v('pelvisLat'),rodillasLat:v('rodillasLat'),obsLat:v('obsLat'),
    // Mediciones
    discrepanciaReal:v('discrepanciaReal'),discrepanciaAparente:v('discrepanciaAparente'),
    flechaCervical:v('flechaCervical'),flechaLumbar:v('flechaLumbar'),
    testAdams:v('testAdams'),anguloRotTronco:v('anguloRotTronco'),
    gibosidad:v('gibosidad'),plomada:v('plomada'),desviacionPlomada:v('desviacionPlomada'),obsMediciones:v('obsMediciones'),
    // Calzado
    desgasteCalzado:v('desgasteCalzado'),apoyoD:v('apoyoD'),apoyoI:v('apoyoI'),
    plantillas:v('plantillas'),obsCalzado:v('obsCalzado'),plantigrafiaFileId:v('plantigrafiaFileId'),
    // Diagnóstico
    relacionSintomas: v('relacionSintomas'),
    cifDeterioro: v('cifDeterioro'),
    cifContextual: v('cifContextual'),
    obsInspeccionVisual: v('obsInspeccionVisual'),
    widgetPostural: (window.wpostGetData?JSON.stringify(window.wpostGetData()):null)
  } : {};

  // Leer campos específicos de cardiorespiratorio
  const datosCardio = catId==='cardiorespiratorio' ? {
    dxMedico:v('aDxMed'),dxSecundario:v('dxSecundario'),motivo:v('aMotivo'),
    tiempoEvol:v('tiempoEvol'),hospitRecientes:v('hospitRecientes'),cirugiasPrev:v('cirugiasPrev'),
    antecedentes:v('aAntecedentes'),medicacionActual:v('medicacionActual'),
    // Signos vitales
    fcReposo:v('fcReposo'),frReposo:v('frReposo'),taSistolica:v('taSistolica'),taDiastolica:v('taDiastolica'),
    spo2Reposo:v('spo2Reposo'),peso:v('peso'),talla:v('talla'),
    imc:v('imc'),
    // Evaluación respiratoria
    patronResp:v('patronResp'),muscAccesoria:v('muscAccesoria'),tiraje:v('tiraje'),tos:v('tos'),
    tipoTorax:v('tipoTorax'),expansionToracica:v('expansionToracica'),
    auscultacion:v('auscultacion'),
    // Evaluación cardíaca
    disneaReposo:v('disneaReposo'),ortopnea:v('ortopnea'),dolorToracico:v('dolorToracico'),
    palpitaciones:v('palpitaciones'),tosNocturna:v('tosNocturna'),nyha:v('nyha'),edemaMmii:v('edemaMmii'),
    activDesencan:v('activDesencan'),psicosocial:v('psicosocial'),
    // Fuerza y resistencia
    fuerzaMmssDCard:v('fuerzaMmssDCard'),fuerzaMmssICard:v('fuerzaMmssICard'),
    fuerzaMmiiDCard:v('fuerzaMmiiDCard'),fuerzaMmiiICard:v('fuerzaMmiiICard'),
    dinamoD:v('dinamoD'),obsFuerzaCard:v('obsFuerzaCard'),
    // Capacidad funcional
    limitAVD:v('limitAVD'),suenio:v('suenio'),obsFuncCard:v('obsFuncCard'),
  } : {};


  // Leer campos específicos de parálisis facial
  const datosFacial = catId==='paralisis_facial' ? {
    dxFacial:v('dxFacial'),tipoParalisis:v('tipoParalisis'),ladoFacial:v('ladoFacial'),
    tiempoEvolFacial:v('tiempoEvolFacial'),etiologiaFacial:v('etiologiaFacial'),
    houseBrackmann:v('houseBrackmann'),lagoftalmos:v('lagoftalmos'),sincinesias:v('sincinesias'),
    simetriaReposo:v('simetriaReposo'),
    elevacionCeja:v('elevacionCeja'),cierreOcular:v('cierreOcular'),sonrisa:v('sonrisa'),
    elevacionComisura:v('elevacionComisura'),fruncirLabios:v('fruncirLabios'),
    arrugarFrente:v('arrugarFrente'),mostrarDientes:v('mostrarDientes'),inflarMejillas:v('inflarMejillas'),
    parpadeoFuerza:v('parpadeoFuerza'),deprComisura:v('deprComisura'),
    sensAuricular:v('sensAuricular'),gustoLengua:v('gustoLengua'),reflejoCorneal:v('reflejoCorneal'),
    secLagrimal:v('secLagrimal'),dolorFacial:v('dolorFacial'),hiperacusia:v('hiperacusia'),
    emgFacial:v('emgFacial'),schirmer:v('schirmer'),
    observacionesFacial:v('observacionesFacial'),
  } : {};

  // Leer campos específicos de geriatría
  const datosGeriatria = catId==='geriatria' ? {
    dxGeriatria:v('dxGeriatria'),edadGer:v('edadGer'),motivoGer:v('motivoGer'),
    tiempoEvolGer:v('tiempoEvolGer'),antecedentesGer:v('antecedentesGer'),
    tipoViviendaGer:v('tipoViviendaGer'),soporteSocial:v('soporteSocial'),
    caidasGer:v('caidasGer'),miedoCaer:v('miedoCaer'),
    polifarmaciaGer:v('polifarmaciaGer'),estadoNutricional:v('estadoNutricional'),
    posturaGer:v('posturaGer'),pielGer:v('pielGer'),
    evaGer:g('evaGer')?Number(g('evaGer').value):0,dolLocGer:v('dolLocGer'),
    palpacionGer:v('palpacionGer'),
    movilCervGer:v('movilCervGer'),movilLumGer:v('movilLumGer'),
    movilCaderaGer:v('movilCaderaGer'),movilRodGer:v('movilRodGer'),
    fuerzaMMSS_Ger:v('fuerzaMMSS_Ger'),fuerzaMMII_Ger:v('fuerzaMMII_Ger'),
    fuerzaGer:v('fuerzaGer'),trofismoGer:v('trofismoGer'),
    sensGer:v('sensGer'),reflejosGer:v('reflejosGer'),auxGer:v('auxGer'),
    velocidadMarchaGer:v('velocidadMarchaGer'),patronMarchaGer:v('patronMarchaGer'),
    equilibrioEstGer:v('equilibrioEstGer'),equilibrioDinGer:v('equilibrioDinGer'),
    tugGer:v('tugGer'),chairStand:v('chairStand'),
    mmseGer:v('mmseGer'),gdsGer:v('gdsGer'),friedGer:v('friedGer'),barthelGer:v('barthelGer'),
    obsGeriatria:v('obsGeriatria'),
  } : {};

  // Variables dinámicas solo presentes en traumatología
  const regiones = (function(){
    var sel=[];
    document.querySelectorAll('#regionesWrap [data-r]').forEach(function(el){sel.push(el.dataset.r);});
    return sel;
  })();
  const rom = (function(){
    var r={};
    document.querySelectorAll('[data-rom]').forEach(function(el){if(el.value.trim())r[el.dataset.rom]=el.value.trim();});
    return r;
  })();
  const fuerza = (function(){
    var r={};
    document.querySelectorAll('[data-fuerza]').forEach(function(el){if(el.value.trim())r[el.dataset.fuerza]=el.value.trim();});
    return r;
  })();
  const datos={
    edad:v('pEdad'),dxMedico:v('aDxMed'),dxFisio:v('aDxFisio'),
    motivo:v('aMotivo'),antecedentes:v('aAntecedentes'),
    regiones, rom, fuerza,
    pruebasFuncionales: leerPruebasFuncionales(),
    palpacion:v('tPalpacion'),trofismo:v('tTrofismo'),
    eva:Number(v('tEva')||0),dolLoc:v('tDolLoc'),dolTipo:v('tDolTipo'),
    neuro:v('tNeuro'),tegu:v('tTegu'),pruebas:v('tPruebas'),aux:v('tAux'),
    examObjetivo:v('examObjetivo'),
    meta:v('planMeta'),objGeneral:v('planObjG'),objEspecificos:v('planObjE'),planGeneral:v('planGeneral'),
    // Escalas estandarizadas
    escalas: leerEscalasForm(),
    ...datosNeuro,
    ...datosPed,
    ...datosCardio,
    ...datosFacial,
    ...datosPostural,
    ...datosGeriatria,
  };
  
  // Guardar paciente
  // FIX: solo enviar campos con valor para no sobreescribir datos existentes con cadenas vacías
  const bPac = {action:'guardarPaciente', nombre, dni, categoriaId:catId, estado:'activo'};
  if(pacId) bPac.id = pacId;
  const _sv = v('pS');   if(_sv)  bPac.sexo          = _sv;
  const _fn = v('pFN');  if(_fn)  bPac.fechaNac       = _fn;
  const _tel= v('pT');   if(_tel) bPac.telefono       = _tel;
  const _oc = v('pO');   if(_oc)  bPac.ocupacion      = _oc;
  const _fi = v('pFI');  if(_fi)  bPac.fechaInicio    = _fi;
  const _re = v('pR');   if(_re)  bPac.responsable    = _re;
  const _tr = v('pTR');  if(_tr)  bPac.telResponsable = _tr;
  const rPac=await apiPost(bPac);
  if(!rPac.ok){toast('Error al guardar paciente',rPac.error,'err');return;}
  const idPac=pacId||rPac.id;
  // Persistir el ID del paciente en el hidden input para que el siguiente llamado lo use
  const hcPacIdEl=g('hcPacId');
  if(hcPacIdEl) hcPacIdEl.value=idPac;

  // Guardar evaluación (actualizar si viene de una eval rechazada/borrador existente)
  const estado=modo==='borrador'?'borrador':(session.rol==='estudiante'?'pendiente':'aprobada');
  const evalIdExistente=g('hcEvalId')?.value||'';
  const payloadEval={action:'guardarEvaluacion',pacienteId:idPac,categoriaId:catId,
    tipo:'inicial',estado,docente:docenteHC,docenteCodigo:docenteHCCodigo,dxFisio:datos.dxFisio,aptaPatron:'',datosEspecificos:datos};
  if(evalIdExistente) payloadEval.id=evalIdExistente;
  const rEval=await apiPost(payloadEval);
  if(!rEval.ok){hideSendOverlay();toast('Error al guardar evaluación',rEval.error,'err');return;}
  hideSendOverlay();

  // Actualizar hcEvalId con el ID real (nuevo o existente) para que el consentimiento funcione
  const nuevoEvalId = rEval.id || evalIdExistente;
  const hcEvalIdEl = g('hcEvalId');
  if(hcEvalIdEl && nuevoEvalId) hcEvalIdEl.value = nuevoEvalId;

  if(estado==='borrador'){
    // En borrador: quedar en el formulario para permitir subir consentimiento
    toast('💾 Borrador guardado','Ahora puedes subir el consentimiento informado','ok');
    // Solo iniciar timer si es la primera vez (no actualización)
    if(!evalIdExistente || nuevoEvalId !== evalIdExistente){
      const startTime = Date.now();
      startTimerBanner(nuevoEvalId, idPac, catId, startTime);
      mostrarTimerModal();
    } else if(!timerCargar()){
      // El estudiante sigue en borrador pero perdió el timer (otro dispositivo) — reanudar
      const evalData = await apiGet('listarEvaluaciones', {pacienteId: idPac});
      const ev = (evalData.evaluaciones||[]).find(function(e){return e.id===nuevoEvalId;});
      if(ev&&ev.timerInicio){
        startTimerBanner(nuevoEvalId, idPac, catId, parseInt(ev.timerInicio));
      }
    }
    return;
  }
  stopTimerBanner();
  const msgs={pendiente:'📤 Enviada al docente',aprobada:'✅ Historia guardada'};
  toast(msgs[estado]||'Guardado','','ok');
  if(estado==='pendiente') cargarBadge();
  await delay(500);abrirPac(idPac);
  }catch(ex){ hideSendOverlay(); toast('Error inesperado',ex.message,'err'); }
}

// ─── Modal selección de categoría ────────────────────
