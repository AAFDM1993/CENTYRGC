// Generación de PDF, vistas exportables y export con firma de docente

async function _generarHCPdf(pacId, docFirmante, evalIds){
  showSendOverlay('Generando PDF...', 'Cargando historia clínica');
  try{
    // 1. Cargar datos del paciente, evaluaciones y sesiones
    const [rP, rE, rS] = await Promise.all([
      apiGet('obtenerPaciente',    {id: pacId}),
      apiGet('listarEvaluaciones', {pacienteId: pacId}),
      apiGet('listarSesiones',     {pacienteId: pacId})
    ]);
    if(!rP.ok){ hideSendOverlay(); toast('Error al cargar paciente', rP.error||'', 'err'); return; }

    const pac   = rP.paciente;
    const evalsBasic = (rE.evaluaciones||[]).filter(ev => ev.estado === 'aprobada'
      && (!evalIds || !evalIds.length || evalIds.indexOf(ev.id) >= 0));
    const ses   = rS.sesiones||[];

    // Cargar datos COMPLETOS de cada evaluación (listarEvaluaciones no incluye datosEspecificos)
    const evals = await Promise.all(evalsBasic.map(async ev => {
      try{
        const rEv = await apiGet('obtenerEvaluacion', {id: ev.id});
        if(rEv.ok && rEv.evaluacion){
          const raw = rEv.evaluacion.datosEspecificos;
          if(typeof raw === 'string' && raw){
            try{ rEv.evaluacion.datosEspecificos = JSON.parse(raw); }catch(e){ rEv.evaluacion.datosEspecificos = {}; }
          } else if(!raw){
            rEv.evaluacion.datosEspecificos = {};
          }
          // Parsear también rom y fuerza si vienen como string
          ['rom','fuerza'].forEach(function(f){
            if(typeof rEv.evaluacion[f] === 'string'){
              try{ rEv.evaluacion[f] = JSON.parse(rEv.evaluacion[f]); }catch(e){ rEv.evaluacion[f] = {}; }
            }
          });
          return rEv.evaluacion;
        }
      }catch(e){ console.error('[PDF] obtenerEvaluacion error:', e); }
      return ev;
    }));

    // 2. Construir mapa de firmas — SIEMPRE fresco, resolver cada firma a base64
    var firmasMap = {};
    try{
      const rU = await apiGet('listarUsuarios');
      if(rU.ok){
        await Promise.all((rU.usuarios||[]).map(async function(u){
          if(u.firma && !u.firma.startsWith('data:image')){
            u.firma = await resolverFirma_(u.firma);
          }
          // Indexar por todas las variantes del nombre para matching robusto
          var nombreBase = u.nombre || '';
          var nombreNorm = _normNombreExport(nombreBase);
          var nombreConGrado = u.gradoAcademico ? u.gradoAcademico+' '+nombreBase : nombreBase;
          firmasMap[nombreBase]     = u;
          firmasMap[nombreNorm]     = u;
          firmasMap[nombreConGrado] = u;
          firmasMap[u.codigo]       = u;
          if(u.ctmp) firmasMap[u.ctmp] = u;
        }));
        window._listaUsuariosCache = rU.usuarios;
      }
    }catch(e){ console.warn('firmasMap error:', e); }

    // 3. Resolver firma del firmante del modal
    if(docFirmante && docFirmante.firma && !docFirmante.firma.startsWith('data:image')){
      docFirmante.firma = await resolverFirma_(docFirmante.firma);
    }
    if(docFirmante && !docFirmante.firma){
      const match = _findInMap(firmasMap, docFirmante.nombre) || _findInMap(firmasMap, docFirmante.ctmp) || null;
      if(match && match.firma) docFirmante.firma = match.firma;
      if(!docFirmante.gradoAcademico && match && match.gradoAcademico) docFirmante.gradoAcademico = match.gradoAcademico;
      if(!docFirmante.ctmp && match && match.ctmp) docFirmante.ctmp = match.ctmp;
      if(!docFirmante.cargo && match && match.cargo) docFirmante.cargo = match.cargo;
    }

    // 4. Sello del firmante seleccionado en el modal
    var selloFirmante = docFirmante ? mkSelloDocente(docFirmante) : '';

    // 5. Pre-cargar consentimientos como base64 inline para el PDF
    window._consentBase64Map = {};
    await Promise.all(evals.map(async function(ev){
      var fileId = ev.consentimientoPath || '';
      if(!fileId) return;
      try{
        var rc = await apiPost({action:'getConsentimiento', evaluacionId:ev.id});
        if(rc.ok && rc.data){
          window._consentBase64Map[ev.id] = 'data:'+rc.mimeType+';base64,'+rc.data;
        }
      }catch(e){}
    }));

    // 6. Generar y abrir el PDF
    hideSendOverlay();
    const titulo = 'HC_' + e2(pac.nombre||pacId).replace(/\s+/g,'_');
    exportarDocumento(titulo, buildHCCompletaHTML(pac, evals, ses, firmasMap, selloFirmante));

  }catch(err){
    hideSendOverlay();
    console.error('_generarHCPdf error:', err);
    toast('Error al generar PDF: ' + (err.message||'error desconocido'), '', 'err');
  }
}

// ─── BUILD HC COMPLETA ─────────────────────────────────────
// Helper global para normalizar nombre quitando prefijo de grado
function _normNombreExport(n){
  if(!n) return '';
  var s = String(n).trim();
  var prefijos = ['Lic. ','Mtra. ','Mtro. ','Dra. ','Dr. ','Mg. ','Mgtr. '];
  for(var i=0;i<prefijos.length;i++){
    if(s.startsWith(prefijos[i])){ s = s.substring(prefijos[i].length).trim(); break; }
  }
  return s;
}

// Helper global para buscar en firmasMap normalizando prefijos de grado
function _findInMap(map, clave){
  if(!map || !clave) return null;
  if(map[clave]) return map[clave];
  // Quitar prefijo de grado si viene incluido
  var s = String(clave).trim();
  var prefijos = ['Lic. ','Mtra. ','Mtro. ','Dra. ','Dr. ','Mg. ','Mgtr. '];
  for(var i=0;i<prefijos.length;i++){
    if(s.startsWith(prefijos[i])){ var norm=s.substring(prefijos[i].length).trim(); if(map[norm]) return map[norm]; }
  }
  // Búsqueda insensible a mayúsculas como fallback
  var lower = s.toLowerCase();
  var keys = Object.keys(map);
  for(var j=0;j<keys.length;j++){
    if(keys[j].toLowerCase()===lower) return map[keys[j]];
  }
  return null;
}

function buildHCCompletaHTML(pac, evals, ses, firmasMap, selloFirmante){
  var html = '';
  var cat = getCat(pac.categoriaId);

  // ── PORTADA ──
  html += '<div style="border:2px solid #1e3a5f;border-radius:12px;padding:20px 24px;margin-bottom:20px;background:#eff6ff">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">'
    + '<div>'
    + '<div style="font-family:sans-serif;font-weight:800;font-size:20px;color:#1e3a5f;margin-bottom:4px">' + e2(pac.nombre||'—') + '</div>'
    + '<div style="font-size:12px;color:#475569">DNI: ' + e2(pac.dni||'—')
      + (pac.fechaNac ? ' &nbsp;&bull;&nbsp; Nacimiento: ' + e2(formatFechaCorta(pac.fechaNac)) : '')
      + (pac.sexo ? ' &nbsp;&bull;&nbsp; ' + (pac.sexo==='M'?'Masculino':'Femenino') : '') + '</div>'
    + (pac.telefono ? '<div style="font-size:12px;color:#475569">Tel: ' + e2(pac.telefono) + '</div>' : '')
    + (pac.ocupacion ? '<div style="font-size:12px;color:#475569">Ocupaci&oacute;n: ' + e2(pac.ocupacion) + '</div>' : '')
    + '</div>'
    + '<div style="text-align:right">'
    + '<div style="font-size:11px;font-weight:700;background:' + cat.color + '22;color:' + cat.color + ';border:1px solid ' + cat.color + '44;border-radius:20px;padding:4px 12px;margin-bottom:6px">' + e2(cat.nombre||'—') + '</div>'
    + (pac.dxMedico ? '<div style="font-size:11px;color:#475569">Dx m&eacute;dico: ' + e2(pac.dxMedico) + '</div>' : '')
    + (pac.asignadoA ? '<div style="font-size:11px;color:#475569">Estudiante: ' + e2(pac.asignadoA) + '</div>' : '')
    + '</div></div></div>';

  // ── EVALUACIONES — usa buildEvalHTML para render completo y consistente ──
  if(evals.length){
    evals.forEach(function(ev, ei){
      // Construir firma HTML del revisor para pasarla a buildEvalHTML
      var docRevisor = _findInMap(firmasMap, ev.revisadoPor) || _findInMap(firmasMap, ev.docente) || null;
      var firmaHTMLEval = docRevisor ? mkSelloDocente(docRevisor) : '';

      html += '<div style="margin-bottom:24px;page-break-inside:avoid">';
      // Cabecera de la evaluación
      html += '<div style="background:#1e3a5f;color:#fff;font-weight:700;font-size:12px;'
            + 'padding:8px 16px;border-radius:8px 8px 0 0;text-transform:uppercase;letter-spacing:.5px">';
      html += (ei===0 ? 'Evaluaci&oacute;n Inicial' : 'Reevaluaci&oacute;n #' + ei)
            + ' &mdash; ' + e2(formatFechaCorta(ev.fecha||'')) + '</div>';
      html += '<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:4px">';
      // Contenido completo usando buildEvalHTML
      html += buildEvalHTML(ev, pac, firmaHTMLEval);
      html += '</div></div>';
    });
  } else {
    html += '<div class="sec"><div class="sec-hdr">Evaluaciones</div><div class="sec-body full"><div class="field-val" style="color:#94a3b8">Sin evaluaciones aprobadas.</div></div></div>';
  }

  // ── SESIONES ──
  if(ses.length){
    html += '<div style="margin-bottom:20px">'
      + '<div style="background:#1e3a5f;color:#fff;font-weight:700;font-size:12px;padding:8px 16px;border-radius:8px 8px 0 0;text-transform:uppercase;letter-spacing:.5px">Sesiones de Tratamiento (' + ses.length + ')</div>';
    ses.forEach(function(s){
      var estadoColor = s.estado==='aprobada' ? '#16a34a' : s.estado==='pendiente' ? '#d97706' : '#94a3b8';
      var _sDocRev = _findInMap(firmasMap, s.revisadoPor) || _findInMap(firmasMap, s.docente) || null;
      var selloSes = (s.estado==='aprobada' && _sDocRev) ? mkSelloDocente(_sDocRev) : '';

      html += '<div class="sec" style="border-radius:0;margin-bottom:0;border-top:none">'
        // ── Encabezado: Sesión #N — Fecha  |  ESTADO
        + '<div class="sec-hdr" style="background:' + estadoColor + ';display:flex;align-items:center;justify-content:space-between">'
        + '<span>Sesi\u00f3n #' + e2(String(s.numero)) + ' &mdash; ' + e2(formatFechaCorta(s.fecha||'')) + '</span>'
        + '<span style="font-size:10px;opacity:.85">' + e2(s.estado).toUpperCase() + '</span>'
        + '</div>'
        // ── Cuerpo: dos columnas — contenido | sello
        + '<div style="display:flex;align-items:flex-start;gap:0">'
        //   Columna izquierda: todos los datos
        + '<div style="flex:1;min-width:0;padding:10px 14px">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">'
        + '<div><div class="field-lbl">Estudiante</div><div class="field-val">' + e2(s.estudiante||s.terapeuta||'—') + '</div></div>'
        + (s.evaValor!==null&&s.evaValor!==undefined&&s.evaValor!==''?'<div><div class="field-lbl">EVA</div><div class="field-val">'+e2(String(s.evaValor))+'/10</div></div>':'')
        + (s.respuesta ? '<div><div class="field-lbl">Respuesta paciente</div><div class="field-val">' + e2(s.respuesta) + '</div></div>' : '<div></div>')
        + '</div>'
        + (s.descripcion ? '<div style="margin-top:8px"><div class="field-lbl">Descripci\u00f3n / Actividades</div><div class="field-val" style="margin-top:2px;line-height:1.5">' + e2(s.descripcion) + '</div></div>' : '')
        + (s.comentarioDocente ? '<div style="margin-top:6px"><div class="field-lbl">Comentario docente</div><div class="field-val">' + e2(s.comentarioDocente) + '</div></div>' : '')
        + '</div>'
        //   Columna derecha: sello (solo si aprobada y hay sello)
        + (selloSes
            ? '<div style="flex-shrink:0;padding:10px 14px;border-left:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center">'
              + selloSes
              + '</div>'
            : '')
        + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  // ── Sello del firmante ──
  if(selloFirmante){
    html += '<div style="margin-top:24px;display:flex;justify-content:flex-end">' + selloFirmante + '</div>';
  }

  // ── Consentimiento(s) Informado(s) — página aparte por evaluación ──
  evals.forEach(function(ev){
    var fileId = ev.consentimientoPath || '';
    if(!fileId) return;
    // _consentBase64Map se llena en _generarHCPdf antes de llamar esta función
    var b64data = (window._consentBase64Map && window._consentBase64Map[ev.id]) || null;
    if(!b64data) return;
    html += '<div style="page-break-before:always">';
    html += '<div style="background:#1e3a5f;color:#fff;font-weight:700;font-size:12px;'
          + 'padding:8px 16px;border-radius:8px 8px 0 0;text-transform:uppercase;letter-spacing:.5px">'
          + '📄 Consentimiento Informado</div>';
    html += '<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:16px">';
    html += '<img src="' + b64data + '" style="width:100%;max-width:794px;height:auto;display:block;margin:0 auto">';
    html += '</div></div>';
  });

  return html;
}


function exportarEvalModal(evalId, pacId){
  // Si es admin, preguntar si quiere usar un firmante diferente al revisor
  if(session.rol === 'admin'){
    abrirModalFirmaExport(function(docFirmante){
      verEvalConFirma(evalId, pacId, docFirmante);
    });
  } else {
    verEvalConFirma(evalId, pacId, null);
  }
}
async function verEvalConFirma(evalId, pacId, docFirmanteOverride){
  try{
    showSendOverlay('Generando PDF...','Cargando datos de la evaluación');
    const r = await apiGet('obtenerEvaluacion', {id:evalId});
    if(!r.ok){hideSendOverlay();toast('Error al cargar evaluación',r.error,'err');return;}
    const ev = r.evaluacion;
    // Parsear datosEspecificos si viene como string
    if(ev.datosEspecificos && typeof ev.datosEspecificos === 'string'){
      try{ ev.datosEspecificos = JSON.parse(ev.datosEspecificos); }catch(e){ ev.datosEspecificos = {}; }
    }
    const rP = await apiGet('obtenerPaciente', {id:pacId});
    const pac = rP.ok ? rP.paciente : {};

    // Cargar lista de usuarios frescos y resolver firmas
    var rU = await apiGet('listarUsuarios').catch(function(){return {ok:false};});
    if(rU.ok) window._listaUsuariosCache = rU.usuarios||[];
    var firmasMap = {};
    await Promise.all((window._listaUsuariosCache||[]).map(async function(u){
      await resolverFirmaDoc_(u);
      // Indexar por todas las variantes para matching robusto
      var nombreBase = u.nombre||'';
      var nombreNorm = _normNombreExport(nombreBase);
      var nombreConGrado = u.gradoAcademico ? u.gradoAcademico+' '+nombreBase : nombreBase;
      firmasMap[nombreBase]     = u;
      firmasMap[nombreNorm]     = u;
      firmasMap[nombreConGrado] = u;
      firmasMap[u.codigo]       = u;
      if(u.ctmp) firmasMap[u.ctmp] = u;
    }));

    // Sello del docente que revisó la evaluación (va DENTRO de la sección aprobada)
    var firmaRevisorHTML = '';
    if(ev.revisadoPor){
      var docRev = _findInMap(firmasMap, ev.revisadoPor) || _findInMap(firmasMap, ev.docente) || null;
      if(docRev) firmaRevisorHTML = mkSelloDocente(docRev);
    } else if(ev.docente){
      var docSup = _findInMap(firmasMap, ev.docente) || null;
      if(docSup) firmaRevisorHTML = mkSelloDocente(docSup);
    }

    // Sello del firmante del documento (admin/coordinador) — va AL FINAL del documento
    var selloFirmanteHTML = '';
    if(docFirmanteOverride){
      if(docFirmanteOverride.firma && !docFirmanteOverride.firma.startsWith('data:image')){
        docFirmanteOverride.firma = await resolverFirma_(docFirmanteOverride.firma);
      }
      if(!docFirmanteOverride.firma){
        var matchF = _findInMap(firmasMap, docFirmanteOverride.nombre) || _findInMap(firmasMap, docFirmanteOverride.ctmp) || null;
        if(matchF && matchF.firma) docFirmanteOverride.firma = matchF.firma;
        if(!docFirmanteOverride.gradoAcademico && matchF && matchF.gradoAcademico) docFirmanteOverride.gradoAcademico = matchF.gradoAcademico;
        if(!docFirmanteOverride.ctmp && matchF && matchF.ctmp) docFirmanteOverride.ctmp = matchF.ctmp;
        if(!docFirmanteOverride.cargo && matchF && matchF.cargo) docFirmanteOverride.cargo = matchF.cargo;
      }
      selloFirmanteHTML = mkSelloDocente(docFirmanteOverride);
    }

    // Precargar fotos del widget postural para PDF
    if(ev.datosEspecificos&&ev.datosEspecificos.widgetPostural&&window._wpostPrecargarFotos){
      await window._wpostPrecargarFotos(ev.datosEspecificos.widgetPostural);
    }
    if(ev.datosEspecificos&&ev.datosEspecificos.plantigrafiaFileId){
      await _precargarPlantigrafia(ev.datosEspecificos.plantigrafiaFileId);
    } else { window._plantigrafiaCache=null; }
    // Construir cuerpo: evaluación + sello firmante al final
    var bodyHTML = buildEvalHTML(ev, pac, firmaRevisorHTML);
    if(selloFirmanteHTML){
      bodyHTML += '<div style="margin-top:32px;display:flex;justify-content:flex-end">' + selloFirmanteHTML + '</div>';
    }

    hideSendOverlay();
    exportarDocumento('Evaluacion_'+e2(pac.nombre||evalId).replace(/\s+/g,'_'), bodyHTML);
  }catch(err){
    hideSendOverlay();
    toast('Error al generar PDF', err.message||'', 'err');
  }
}

function exportarSesModal(sesId, pacId){
  if(session.rol === 'admin'){
    abrirModalFirmaExport(function(docFirmante){
      verSesConFirma(sesId, pacId, docFirmante);
    });
  } else {
    verSesConFirma(sesId, pacId, null);
  }
}
async function verSesConFirma(sesId, pacId, docFirmanteOverride){
  try{
    showSendOverlay('Generando PDF...','Cargando datos de la sesión');
    const rS = await apiGet('listarSesiones', {pacienteId:pacId});
    const s = (rS.sesiones||[]).find(x=>x.id===sesId);
    if(!s){hideSendOverlay();toast('Sesión no encontrada','','err');return;}
    const rP = await apiGet('obtenerPaciente', {id:pacId});
    const pac = rP.ok ? rP.paciente : {};

    // Cargar lista de usuarios frescos y resolver firmas
    var rU = await apiGet('listarUsuarios').catch(function(){return {ok:false};});
    if(rU.ok) window._listaUsuariosCache = rU.usuarios||[];
    var firmasMap = {};
    await Promise.all((window._listaUsuariosCache||[]).map(async function(u){
      await resolverFirmaDoc_(u);
      var nombreBase = u.nombre||'';
      var nombreNorm = _normNombreExport(nombreBase);
      var nombreConGrado = u.gradoAcademico ? u.gradoAcademico+' '+nombreBase : nombreBase;
      firmasMap[nombreBase]     = u;
      firmasMap[nombreNorm]     = u;
      firmasMap[nombreConGrado] = u;
      firmasMap[u.codigo]       = u;
      if(u.ctmp) firmasMap[u.ctmp] = u;
    }));

    // Sello del docente que revisó la sesión (va DENTRO de la sección aprobada)
    var firmaRevisorHTML = '';
    if(s.revisadoPor){
      var docRev = _findInMap(firmasMap, s.revisadoPor) || _findInMap(firmasMap, s.docente) || null;
      if(docRev) firmaRevisorHTML = mkSelloDocente(docRev);
    } else if(s.docente){
      var docSup = _findInMap(firmasMap, s.docente) || null;
      if(docSup) firmaRevisorHTML = mkSelloDocente(docSup);
    }

    // Sello del firmante del documento (admin/coordinador) — va AL FINAL del documento
    var selloFirmanteHTML = '';
    if(docFirmanteOverride){
      if(docFirmanteOverride.firma && !docFirmanteOverride.firma.startsWith('data:image')){
        docFirmanteOverride.firma = await resolverFirma_(docFirmanteOverride.firma);
      }
      if(!docFirmanteOverride.firma){
        var matchF = _findInMap(firmasMap, docFirmanteOverride.nombre) || _findInMap(firmasMap, docFirmanteOverride.ctmp) || null;
        if(matchF && matchF.firma) docFirmanteOverride.firma = matchF.firma;
        if(!docFirmanteOverride.gradoAcademico && matchF && matchF.gradoAcademico) docFirmanteOverride.gradoAcademico = matchF.gradoAcademico;
        if(!docFirmanteOverride.ctmp && matchF && matchF.ctmp) docFirmanteOverride.ctmp = matchF.ctmp;
        if(!docFirmanteOverride.cargo && matchF && matchF.cargo) docFirmanteOverride.cargo = matchF.cargo;
      }
      selloFirmanteHTML = mkSelloDocente(docFirmanteOverride);
    }

    // Construir cuerpo: sesión + sello firmante al final
    var bodyHTML = buildSesHTML(s, pac, firmaRevisorHTML);
    if(selloFirmanteHTML){
      bodyHTML += '<div style="margin-top:32px;display:flex;justify-content:flex-end">' + selloFirmanteHTML + '</div>';
    }

    hideSendOverlay();
    exportarDocumento('Sesion_'+s.numero+'_'+e2(pac.nombre||sesId).replace(/\s+/g,'_'), bodyHTML);
  }catch(err){
    hideSendOverlay();
    toast('Error al generar PDF', err.message||'', 'err');
  }
}

