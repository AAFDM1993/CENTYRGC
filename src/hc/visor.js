// Visor HTML de evaluaciones/sesiones y exportación de HC

// ─── BUILD HTML EVALUACIÓN ────────────────────────────
function buildEvalHTML(ev, pac, firmaHTML){
  var desp = ev.datosEspecificos || {};
  if(typeof desp==='string'){try{desp=JSON.parse(desp);}catch(e){desp={};}}
  var d = Object.assign({}, ev, desp);
  var catId = ev.categoriaId || pac.categoriaId || '';

  // helpers internos
  function sec(num,titulo,body){ return '<div class="sec"><div class="sec-hdr">'+(num?num+'. ':'')+titulo+'</div><div class="sec-body full">'+body+'</div></div>'; }
  function secGrid(num,titulo,body){ return '<div class="sec"><div class="sec-hdr">'+(num?num+'. ':'')+titulo+'</div><div class="sec-body">'+body+'</div></div>'; }
  function row(lbl,val){ if(!val&&val!==0) return ''; return '<div class="fld"><div class="fld-lbl">'+lbl+'</div><div class="fld-val">'+e2(String(val))+'</div></div>'; }
  function rowFull(lbl,val){ if(!val&&val!==0) return ''; return '<div class="fld full"><div class="fld-lbl">'+lbl+'</div><div class="fld-val long">'+e2(String(val))+'</div></div>'; }
  function hdr(txt){ return '<div class="sec-sub">'+txt+'</div>'; }

  var rows = '';

  // Buscar el grado académico del docente en la lista de usuarios cargada
  var docenteGrado = '';
  if(ev.docente && window._docentesList){
    var docente = window._docentesList.find(function(d){
      return (d.nombre||'').toLowerCase() === (ev.docente||'').toLowerCase() || (d.codigo||'').toLowerCase() === (ev.docente||'').toLowerCase();
    });
    if(docente && docente.gradoAcademico) docenteGrado = ' · ' + docente.gradoAcademico;
  }

  // I. Filiación — común a todas las fichas
  rows += secGrid('I','Filiaci&oacute;n',
    row('Nombres y Apellidos', pac.nombre||'—')
    + row('DNI', pac.dni||'—')
    + (pac.fechaNac ? row('Fecha de nacimiento', formatFechaCorta(pac.fechaNac)) : '')
    + (pac.sexo     ? row('Sexo', pac.sexo==='M'?'Masculino':'Femenino') : '')
    + (pac.ocupacion||d.ocupacion ? row('Ocupaci&oacute;n', pac.ocupacion||d.ocupacion) : '')
    + (pac.telefono ? row('Tel&eacute;fono', pac.telefono) : '')
    + (pac.responsable ? row('Responsable', pac.responsable) : '')
    + (pac.telResponsable ? row('Tel. responsable', pac.telResponsable) : '')
    + (pac.medico   ? row('M&eacute;dico tratante', pac.medico) : '')
    + row('Estudiante', ev.autor||'—')
    + row('Docente supervisor', (ev.docente||'—')+docenteGrado)
    + row('Fecha', ev.fecha ? (function(){var p=ev.fecha.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:ev.fecha;})() : '—')
  );

  if(catId === 'traumatologia'){
    var romData=d.rom||ev.rom||{};var fuerzaData=d.fuerza||ev.fuerza||{};
    if(typeof romData==='string'){try{romData=JSON.parse(romData);}catch(e){romData={};}}
    if(typeof fuerzaData==='string'){try{fuerzaData=JSON.parse(fuerzaData);}catch(e){fuerzaData={};}}
    rows += sec('II','Anamnesis',
      row('Diagn&oacute;stico m&eacute;dico',d.dxMedico||pac.dxMedico)
      +row('Diagn&oacute;stico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de consulta',d.motivo||pac.motivo)
      +row('Antecedentes',d.antecedentes||pac.antecedentes)
      +row('Tiempo de evolución',d.tiempoEvol));
    // EVA: guardarHC guarda como d.eva (number), guardarEval como d.evaValor / ev.evaValor
    var _evaRaw = (d.evaValor!==undefined&&d.evaValor!=='')?d.evaValor
                : (d.eva!==undefined&&d.eva!==''&&d.eva!==0)?d.eva
                : (ev.evaValor!==undefined&&ev.evaValor!=='')?ev.evaValor:'';
    var exBody=(_evaRaw!==''?row('EVA — Dolor',String(_evaRaw)+'/10'):'')
      +row('Localización del dolor',d.dolLoc||d.dolLoc)
      +row('Tipo de dolor',d.dolTipo)
      +row('Postura',d.postura)+row('Marcha',d.marcha)+row('Trofismo',d.trofismo)
      +rowFull('Palpación',d.palpacion)+rowFull('Valoraci&oacute;n neurol&oacute;gica',d.neuro)
      +rowFull('Tegumentario',d.tegu)+rowFull('Auxiliares diagnóstico',d.aux)
      +rowFull('Examen objetivo',d.examObjetivo||d.obsExamen);
    if(d.pruebasFuncionales&&typeof d.pruebasFuncionales==='object'&&Object.keys(d.pruebasFuncionales).length){
      exBody+='<div style="grid-column:1/-1;margin-top:8px"><div class="field-lbl">Pruebas funcionales</div>';
      Object.keys(d.pruebasFuncionales).forEach(function(reg){
        var ps=d.pruebasFuncionales[reg]; if(!ps||!Object.keys(ps).length) return;
        exBody+='<div style="font-size:11px;font-weight:700;color:#475569;margin:6px 0 3px">'+e2(reg)+'</div>';
        exBody+='<table class="tbl-rom"><thead><tr><th style="text-align:left">Prueba</th><th>Resultado</th></tr></thead><tbody>';
        Object.keys(ps).forEach(function(n){exBody+='<tr><td>'+e2(n)+'</td><td style="text-align:center;font-weight:700">'+e2(String(ps[n]||'—'))+'</td></tr>';});
        exBody+='</tbody></table>';
      });
      exBody+='</div>';
    }
    if(d.pruebas){ exBody+=rowFull('Observaciones adicionales de pruebas',d.pruebas); }
    rows+='<div class="sec"><div class="sec-hdr">III. Examen Objetivo</div><div class="sec-body full">'+exBody;
    var romHTML=buildRomTable(romData); var fuerzaHTML=buildFuerzaTable(fuerzaData);
    if(romHTML) rows+='<div style="grid-column:1/-1;margin-top:8px"><div class="sec-sub">ROM — Rango de movimiento</div>'+romHTML+'</div>';
    if(fuerzaHTML) rows+='<div style="grid-column:1/-1;margin-top:8px"><div class="sec-sub">Fuerza muscular</div>'+fuerzaHTML+'</div>';
    rows+='</div></div>';
    var flexFields=[['testDedusSuelo','Test dedos-suelo','cm'],['testSchober','Test Schober','cm'],
      ['thomasD','Test Thomas D',''],['thomasI','Test Thomas I',''],['elyD','Test Ely D',''],['elyI','Test Ely I',''],
      ['popliD','&Aacute;ngulo popl&iacute;teo D','&deg;'],['popliI','&Aacute;ngulo popl&iacute;teo I','&deg;'],
      ['oberD','Test Ober D',''],['oberI','Test Ober I',''],
      ['dorsiflexD','Dorsiflexión tobillo D','&deg;'],['dorsiflexI','Dorsiflexión tobillo I','&deg;'],['obsFlexPost','Observaciones','']];
    var flexBody=''; flexFields.forEach(function(f){if(d[f[0]])flexBody+=row(f[1],d[f[0]]+(f[2]?' '+f[2]:''));});
    if(flexBody) rows+=secGrid('','Flexibilidad y acortamientos',flexBody);
    rows+=_buildPlanHTML(d,ev,'IV'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'postural'){
    rows+=sec('II','Anamnesis',
      row('Diagn&oacute;stico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de evaluación postural',d.motivo||pac.motivo)
      +row('Antecedentes posturales',d.antecedentes||pac.antecedentes)
      +row('Tiempo de evolución',d.tiempoEvolPost)+row('Dolor postural',d.dolorPostural)
      +row('Actividad física',d.actFisicaPost));
    var vistasCheck=[
      ['ant',['cabezaAnt','hombrosAnt','clavicular','triangulTalle','pelvisAnt','rodillasAnt','pieDerAnt','pieIzqAnt'],
       ['Cabeza','Hombros','Clavicular','Triáng. talle','Pelvis','Rodillas','Pie der.','Pie izq.'],'obsAnt','Vista anterior'],
      ['post',['occipucio','escapulas','columnaPost','plieguesGluteos','plieguesPopliteos','talones'],
       ['Occipucio','Escápulas','Columna','Pli. glúteos','Pli. poplíteos','Talones'],'obsPost','Vista posterior'],
      ['lat',['cabezaLat','curvaCervical','curvaDorsal','curvaLumbar','pelvisLat','rodillasLat'],
       ['Cabeza','Curva cervical','Curva dorsal','Curva lumbar','Pelvis','Rodillas'],'obsLat','Vista lateral']];
    // ── Widget postural: imágenes con chips ───────────────────────
    var _wdata = d.widgetPostural;
    if(typeof _wdata==='string'){try{_wdata=JSON.parse(_wdata);}catch(e){_wdata=null;}}
    var _imgs = window.wpostGetIMGS ? window.wpostGetIMGS() : null;
    var _alts = window.wpostGetALTS ? window.wpostGetALTS() : null;
    var inspBody='';
    if(_imgs){
      var _rendVista = function(vistas){
        var vh='<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:10px">';
        vistas.forEach(function(vp){
          var v=vp[0], lbl=vp[1];
          vh+='<div style="text-align:center">';
          vh+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:3px">'+lbl+'</div>';
          vh+='<div style="position:relative;display:inline-block;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;line-height:0;width:248px;height:375px;box-sizing:content-box">';
          if(_imgs[v]) vh+='<img src="'+_imgs[v]+'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top center;display:block">';
          vh+='<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:repeating-linear-gradient(to right,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm),repeating-linear-gradient(to bottom,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm)"></div>';
          if(_wdata&&_wdata[v]&&_alts) _wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;}); if(!alt) return;
            var _sv=alt.char.indexOf('<svg')===0;
            vh+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +(_sv?'width:22px;height:22px;':'min-width:22px;height:22px;padding:0 4px;')
              +'border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer">'+alt.char+'</div>';
          });
          vh+='</div></div>';
        });
        return vh+'</div>';
      };
      
      // Agregar leyenda de alteraciones
      var leyendaHTML='<div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">';
      leyendaHTML+='<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Leyenda de alteraciones</div>';
      leyendaHTML+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      if(_alts&&_wdata){
        var _used=new Set();
        ['ant','post','latd','lati'].forEach(function(v){(_wdata[v]||[]).forEach(function(c){_used.add(c.altId);});});
        _alts.filter(function(a){return _used.has(a.id);}).forEach(function(alt){
          var _sv=alt.char.indexOf('<svg')===0;
          leyendaHTML+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
          leyendaHTML+='<div style="'+(_sv?'width:20px;height:20px;':'min-width:20px;height:20px;')+'border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
          leyendaHTML+='<span style="color:#475569">'+alt.lbl+'</span>';
          leyendaHTML+='</div>';
        });
      }
      leyendaHTML+='</div></div>';
      
      inspBody += _rendVista([['ant','Vista Anterior'],['post','Vista Posterior']]);
      inspBody += _rendVista([['latd','Lateral Derecha'],['lati','Lateral Izquierda']]);
      inspBody += leyendaHTML;
    }
    // ── Hallazgos por vista (checkboxes) ─────────────────────────
    vistasCheck.forEach(function(vista){
      var fields=vista[1],labels=vista[2],obsKey=vista[3],titulo=vista[4];
      var vbody=''; fields.forEach(function(f,i){if(d[f])vbody+=row(labels[i],d[f]);});
      if(d[obsKey])vbody+=rowFull('Observaciones',d[obsKey]);
      if(vbody)inspBody+='<div style="margin-top:8px"><b style="font-size:11px;color:#1e3a5f">'+titulo+'</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-top:4px">'+vbody+'</div></div>';
    });
    if(d.obsInspeccionVisual)inspBody+=rowFull('Obs. inspección visual',d.obsInspeccionVisual);
    if(inspBody)rows+='<div class="sec"><div class="sec-hdr">III. Inspecci&oacute;n Visual</div><div style="padding:12px 14px">'+inspBody+'</div></div>';
    var medBody=row('Discrepancia MMII real',d.discrepanciaReal?(d.discrepanciaReal+' cm'):'')
      +row('Discrepancia MMII aparente',d.discrepanciaAparente?(d.discrepanciaAparente+' cm'):'')
      +row('Flecha cervical',d.flechaCervical?(d.flechaCervical+' cm'):'')
      +row('Flecha lumbar',d.flechaLumbar?(d.flechaLumbar+' cm'):'')
      +row('Test Adams',d.testAdams)+row('&Aacute;ngulo rot. tronco',d.anguloRotTronco)
      +row('Gibosidad',d.gibosidad)+row('Plomada',d.plomada)
      +row('Desviaci&oacute;n plomada',d.desviacionPlomada?(d.desviacionPlomada+' cm'):'')
      +rowFull('Obs. mediciones',d.obsMediciones);
    if(medBody)rows+=secGrid('VI','Mediciones Posturales',medBody);
    var calzBody=row('Desgaste calzado',d.desgasteCalzado)+row('Apoyo plantar D',d.apoyoD)
      +row('Apoyo plantar I',d.apoyoI)+row('Plantillas',d.plantillas)+rowFull('Obs. calzado',d.obsCalzado);
    var _plImg=window._plantigrafiaCache
      ?'<div style="flex-shrink:0;text-align:center;padding:12px 14px"><div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Plantigraf&iacute;a</div><img src="'+window._plantigrafiaCache+'" style="max-width:220px;max-height:260px;border-radius:6px;border:1px solid #e2e8f0;display:block;margin:0 auto"></div>':'';
    if(calzBody||_plImg)rows+='<div class="sec"><div class="sec-hdr">VII. Calzado y Apoyo Plantar</div><div style="display:flex;align-items:flex-start">'+(calzBody?'<div class="sec-body" style="flex:1">'+calzBody+'</div>':'')+_plImg+'</div></div>';
    rows+=_buildPlanHTML(d,ev,'VIII'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'neuro_adultos'){
    rows+=sec('II','Anamnesis',
      row('Diagn&oacute;stico m&eacute;dico',d.dxNeuroMedico||d.dxMedico||pac.dxMedico)
      +row('Diagn&oacute;stico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de consulta',d.motivo||pac.motivo)
      +row('Antecedentes',d.antecedentes||d.antecedentesNeuro||pac.antecedentes));
    rows+=secGrid('III','Historia Cl&iacute;nica Neurol&oacute;gica',
      row('Tipo de condición',d.tipoCondicionNeuro)+row('Tiempo de evolución',d.tiempoEvolucionNeuro)
      +row('Lado afectado',d.ladoAfectadoNeuro)+row('Clasificación funcional',d.clasificacionFuncional)
      +row('Dolor neurológico',d.dolorNeuro)
      +row('EVA dolor',d.evaNeuroDolor!==undefined&&d.evaNeuroDolor!==''?d.evaNeuroDolor+'/10':''));
    rows+=secGrid('IV','Estado Cognitivo y Comunicaci&oacute;n',
      row('Nivel de conciencia',d.nConciencia)+row('Lateralidad',d.lateralidad)
      +row('Orientación',d.orientacion)+row('Comunicación',d.comunicacion)
      +row('Memoria',d.memoria)+row('Atención',d.atencion)+rowFull('Obs. cognitivo',d.obsCognitivo));
    rows+=secGrid('V','Examen Motor',
      row('Tono MMSS D',d.tono_MMSS_D)+row('Tono MMSS I',d.tono_MMSS_I)
      +row('Tono MMII D',d.tono_MMII_D)+row('Tono MMII I',d.tono_MMII_I)
      +row('Fuerza MMSS D',d.fuerza_MMSS_D)+row('Fuerza MMSS I',d.fuerza_MMSS_I)
      +row('Fuerza MMII D',d.fuerza_MMII_D)+row('Fuerza MMII I',d.fuerza_MMII_I)
      +row('Reflejos OT',d.reflejos)+row('Babinski',d.babinski)+row('Clonus',d.clonus)
      +row('Coordinación',d.coordinacion)+row('Movimientos involuntarios',d.movInvoluntarios)
      +rowFull('Obs. motor',d.obsMotor));
    rows+=secGrid('VI','Sensibilidad',
      row('Sensibilidad táctil',d.sensTactil)+row('Sensibilidad dolorosa',d.sensDolor)
      +row('Sensibilidad térmica',d.sensTermica)+row('Propiocepción',d.propiocepccion)
      +row('Zona afectada',d.zonaAfectada)+rowFull('Obs. sensibilidad',d.obsSensibilidad));
    rows+=secGrid('VII','Control Postural y Equilibrio',
      row('Control cefálico',d.controlCefal)+row('Control de tronco',d.controlTronco)
      +row('Equilibrio estático',d.eqEstatico)+row('Equilibrio dinámico',d.eqDinamico)
      +rowFull('Obs. postural',d.obsPostural));
    rows+=secGrid('VIII','Marcha y Transferencias',
      row('Tipo de marcha',d.tipoMarcha)+row('Patrón de marcha',d.patronMarcha)
      +row('Ayuda técnica',d.ayudaTecnica)+row('Transferencia cama↔silla',d.transferenciaCS)
      +row('Transferencia sentado↔pie',d.transferenciaSP)
      +rowFull('Descripción marcha',d.marchaDescripcion)+rowFull('Obs. marcha',d.obsMarcha));
    rows+=sec('IX','Actividades de la Vida Diaria',
      row('AVD básicas afectadas',d.avdBasicasAfect)+rowFull('AVD instrumentales afectadas',d.avdInstAfect));
    rows+=_buildPlanHTML(d,ev,'IX'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'neuro_pediatrica'){
    rows+=sec('II','Anamnesis',
      row('Diagnóstico médico',d.dxMedico||pac.dxMedico)
      +row('Diagnóstico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de consulta',d.motivo||pac.motivo)
      +row('Tiempo de evolución',d.tiempoEvol)+row('Medicación',d.medicacion));
    var hitosLabels={hitosSostenCef:'Sostén cefálico',hitosSedest:'Sedestación',hitosGateo:'Gateo',
      hitosBiped:'Bipedestación',hitosMarcha:'Marcha',hitosLenguaje:'Lenguaje'};
    var hitosBody='';
    Object.keys(hitosLabels).forEach(function(k){if(d[k])hitosBody+=row(hitosLabels[k],d[k]);});
    hitosBody+=row('Tipo de parto',d.tipoParto)+row('Semanas de gestación',d.semanasGest)
      +row('Peso al nacer',d.pesoNacer)+row('APGAR',d.apgar)
      +rowFull('Antecedentes prenatales',d.antePrenatal)+rowFull('Antecedentes postnatales',d.antePosnatal)
      +row('Escolarización',d.escolarizacion)+rowFull('Obs. desarrollo',d.obsDesarrollo);
    rows+=sec('III','Antecedentes del Desarrollo Motor',hitosBody);
    rows+=secGrid('IV','Estado Cognitivo y Comunicaci&oacute;n',
      row('Alerta',d.alertaPed)+row('Comprensión',d.comprensionPed)
      +row('Conducta',d.conductaPed)+row('Comunicación',d.comunicacionPed)
      +rowFull('Obs. cognitivo',d.obsCognitivoPed));
    rows+=secGrid('V','Examen Motor Pedi&aacute;trico',
      row('Tono MMSS D',d.tonoPed_MMSS_D)+row('Tono MMSS I',d.tonoPed_MMSS_I)
      +row('Tono MMII D',d.tonoPed_MMII_D)+row('Tono MMII I',d.tonoPed_MMII_I)
      +row('Fuerza MMSS D',d.fuerzaPed_MMSS_D)+row('Fuerza MMSS I',d.fuerzaPed_MMSS_I)
      +row('Fuerza MMII D',d.fuerzaPed_MMII_D)+row('Fuerza MMII I',d.fuerzaPed_MMII_I)
      +row('GMFCS',d.escalas&&d.escalas.gmfcs&&d.escalas.gmfcs.items?'Nivel '+d.escalas.gmfcs.items.nivel:'')
      +row('MACS',d.escalas&&d.escalas.macs&&d.escalas.macs.items?'Nivel '+d.escalas.macs.items.nivel:'')
      +row('Ref. Moro',d.refMoro)+row('Ref. TANC',d.refTANC)
      +row('Ref. tónico laberíntico',d.refTL)+row('Ref. prensión',d.refPrension)
      +row('Reacciones de enderezamiento',d.reaccEnderez)+row('Reacciones de equilibrio',d.reaccEquilib)
      +rowFull('Patrones de movimiento',d.patronesMovPed)+rowFull('Obs. motor',d.obsMotorPed));
    rows+=secGrid('VI','Control Postural',
      row('Control cefálico',d.controlCefalPed)+row('Sedestación',d.sedestacionPed)
      +row('Bipedestación',d.bipedPed)+row('Órtesis',d.ortesisPed)+rowFull('Obs. postural',d.obsPosturalPed));
    rows+=secGrid('VII','Marcha y Movilidad',
      row('Tipo de marcha',d.tipoMarchaPed)+row('Patrón de marcha',d.patronMarchaPed)
      +row('Ayuda técnica',d.ayudaTecPed)+rowFull('Descripción marcha',d.marchaPedDescripcion)
      +rowFull('Obs. marcha',d.obsMarchaPed));
    rows+=secGrid('VIII','Funci&oacute;n de Miembro Superior',
      row('Prensión',d.prensionPed)+row('Lateralidad',d.lateralidadPed)
      +row('Alcance',d.alcancePed)+rowFull('Obs. MMSS',d.obsMMSSPed));
    rows+=sec('IX','AVD y Participaci&oacute;n',
      row('Alimentación',d.alimentPed)+row('Higiene',d.higienePed)
      +row('Juego / Socialización',d.juegoSoc)+rowFull('Programa domiciliario',d.progDomiciliario));
    rows+=_buildPlanHTML(d,ev,'X'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'cardiorespiratorio'){
    rows+=sec('II','Anamnesis',
      row('Diagnóstico médico',d.dxMedico||pac.dxMedico)+row('Dx secundario',d.dxSecundario)
      +row('Diagnóstico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de consulta',d.motivo||pac.motivo)+row('Tiempo de evolución',d.tiempoEvol)
      +row('Hospitalizaciones recientes',d.hospitRecientes)+row('Cirugías previas',d.cirugiasPrev)
      +row('Antecedentes',d.antecedentes||pac.antecedentes)+row('Medicación actual',d.medicacionActual));
    rows+=secGrid('III','Examen Objetivo',
      hdr('Signos Vitales')
      +row('FC reposo',d.fcReposo?d.fcReposo+' lpm':'')
      +row('FR reposo',d.frReposo?d.frReposo+' rpm':'')
      +row('TA',(d.taSistolica&&d.taDiastolica)?d.taSistolica+'/'+d.taDiastolica+' mmHg':'')
      +row('SpO₂ reposo',d.spo2Reposo?d.spo2Reposo+'%':'')
      +row('Peso',d.peso?d.peso+' kg':'')+row('Talla',d.talla?d.talla+' cm':'')
      +row('IMC',d.imc?d.imc+' kg/m²':'')
      +hdr('Evaluación Respiratoria')
      +row('Patrón respiratorio',d.patronResp)+row('Músculos accesorios',d.muscAccesoria)
      +row('Tiraje',d.tiraje)+row('Tipo de tórax',d.tipoTorax)
      +row('Expansión torácica',d.expansionToracica)+row('Tos',d.tos)
      +rowFull('Auscultación',d.auscultacion)
      +hdr('Evaluación Cardíaca')
      +row('Disnea en reposo',d.disneaReposo)+row('Ortopnea',d.ortopnea)
      +row('Dolor torácico',d.dolorToracico)+row('Palpitaciones',d.palpitaciones)
      +row('Tos nocturna',d.tosNocturna)+row('NYHA',d.nyha)
      +row('Edema MMII',d.edemaMmii)+row('Actividad desencadenante',d.activDesencan)
      +rowFull('Psicosocial',d.psicosocial)
      +hdr('Fuerza y Resistencia')
      +row('Fuerza MMSS D',d.fuerzaMmssDCard)+row('Fuerza MMSS I',d.fuerzaMmssICard)
      +row('Fuerza MMII D',d.fuerzaMmiiDCard)+row('Fuerza MMII I',d.fuerzaMmiiICard)
      +row('Dinamometría D',d.dinamoD)+row('Dinamometría I',d.dinamoI)
      +rowFull('Obs. fuerza',d.obsFuerzaCard)
      +hdr('Capacidad Funcional')
      +rowFull('Limitación AVD',d.limitAVD)+row('Sueño',d.suenio)+rowFull('Obs. funcional',d.obsFuncCard));
    rows+=_buildPlanHTML(d,ev,'IV'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'geriatria'){
    rows+=sec('II','Anamnesis',
      row('Diagnóstico',d.dxGeriatria)+row('Edad',d.edadGer?d.edadGer+' años':'')
      +row('Motivo de evaluación',d.motivoGer||d.motivo||pac.motivo)
      +row('Tiempo de evolución',d.tiempoEvolGer)
      +rowFull('Antecedentes',d.antecedentesGer||pac.antecedentes)
      +row('Vivienda',d.tipoViviendaGer)+row('Soporte social',d.soporteSocial)
      +row('Caídas últimos 6m',d.caidasGer)+row('Miedo a caer',d.miedoCaer)
      +row('Polifarmacia',d.polifarmaciaGer)+row('Estado nutricional',d.estadoNutricional));
    rows+=secGrid('III','Examen F&iacute;sico',
      row('Postura',d.posturaGer)+row('Piel',d.pielGer)
      +row('EVA dolor',d.evaGer!==undefined&&d.evaGer!==''?d.evaGer+'/10':'')
      +row('Localización dolor',d.dolLocGer)
      +row('Movilidad cervical',d.movilCervGer)+row('Movilidad lumbar',d.movilLumGer)
      +row('Movilidad caderas',d.movilCaderaGer)+row('Movilidad rodillas',d.movilRodGer)
      +row('Fuerza MMSS',d.fuerzaMMSS_Ger)+row('Fuerza MMII',d.fuerzaMMII_Ger)
      +row('Dinamometría',d.fuerzaGer)+row('Trofismo',d.trofismoGer)
      +row('Sensibilidad',d.sensGer)+row('Reflejos OT',d.reflejosGer)
      +rowFull('Palpación',d.palpacionGer)+rowFull('Exámenes auxiliares',d.auxGer));
    rows+=secGrid('IV','Valoraci&oacute;n Funcional y Cognitiva',
      row('Velocidad marcha',d.velocidadMarchaGer)+row('Patrón marcha',d.patronMarchaGer)
      +row('Equilibrio estático',d.equilibrioEstGer)+row('Equilibrio dinámico',d.equilibrioDinGer)
      +row('TUG',d.tugGer?d.tugGer+' seg.':'')+row('Chair Stand 30s',d.chairStand?d.chairStand+' rep.':'')
      +row('MMSE',d.mmseGer)+row('GDS Depresión',d.gdsGer)
      +row('Fragilidad Fried',d.friedGer)+row('Barthel',d.barthelGer)
      +rowFull('Observaciones',d.obsGeriatria));
    rows+=_buildPlanHTML(d,ev,'V'); rows+=_buildEscalasHTML(d);

  } else if(catId === 'paralisis_facial'){
    rows+=secGrid('II','Anamnesis',
      row('Diagnóstico',d.dxFacial)+row('Tipo de parálisis',d.tipoParalisis)
      +row('Lado afectado',d.ladoFacial)+row('Tiempo de evolución',d.tiempoEvolFacial)
      +row('Motivo de consulta',d.motivo||pac.motivo)+row('Antecedentes',d.antecedentes||pac.antecedentes));
    rows+=secGrid('III','Examen Objetivo',
      hdr('Clasificación')+row('Grado House-Brackmann',d.houseBrackmann)
      +row('Lagoftalmos',d.lagoftalmos)+row('Sincinesias',d.sincinesias)
      +hdr('Evaluación Funcional')+row('Simetría en reposo',d.simetriaReposo)
      +row('Elevación ceja',d.elevacionCeja)+row('Cierre ocular',d.cierreOcular)
      +row('Parpadeo — fuerza',d.parpadeoFuerza)
      +row('Sonrisa',d.sonrisa)+row('Elevación comisura',d.elevacionComisura)
      +row('Fruncir labios',d.fruncirLabios)+row('Arrugar frente',d.arrugarFrente)
      +row('Mostrar dientes',d.mostrarDientes)+row('Inflar mejillas',d.inflarMejillas)
      +row('Descender comisura',d.deprComisura)
      +hdr('Evaluación Complementaria')+row('Sensibilidad auricular',d.sensAuricular)
      +row('Gusto (lengua)',d.gustoLengua)+row('Reflejo corneal',d.reflejoCorneal)
      +row('Secreción lagrimal',d.secLagrimal)+row('Dolor facial',d.dolorFacial)
      +row('Hiperacusia',d.hiperacusia)+row('EMG',d.emgFacial)
      +row('Schirmer',d.schirmer)+rowFull('Observaciones',d.observacionesFacial));
    rows+=_buildPlanHTML(d,ev,'VI'); rows+=_buildEscalasHTML(d);

  } else {
    rows+=sec('II','Anamnesis',
      row('Diagnóstico médico',d.dxMedico||pac.dxMedico)
      +row('Diagnóstico fisioterapéutico',d.dxFisio||ev.dxFisio)
      +row('Motivo de consulta',d.motivo||pac.motivo)
      +row('Antecedentes',d.antecedentes||pac.antecedentes));
    rows+=_buildPlanHTML(d,ev,'IV'); rows+=_buildEscalasHTML(d);
  }

  if(ev.estado==='aprobada'){
    rows+='<div class="sec" style="border-color:#16a34a">'
      +'<div class="sec-hdr" style="background:#16a34a">Evaluaci&oacute;n Aprobada</div>'
      +'<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 14px">'
      +(ev.comentarioDocente?'<div class="fld" style="flex:1"><div class="fld-lbl">Comentario</div><div class="fld-val">'+e2(ev.comentarioDocente)+'</div></div>':'<div style="flex:1"></div>')
      +firmaHTML+'</div></div>';
  }
  return rows;
}

function _buildPlanHTML(d, ev, num){
  // Compatibilidad con dos formatos de almacenamiento:
  // guardarHC  → meta, objGeneral, objEspecificos, planGeneral
  // guardarEval → objCorto, objLargo, planSesiones, planFrecuencia, planDuracion, planAreas, planPrecauciones, planEducacion
  var nSes  = d.planSesiones||ev.planSesiones||'';
  var freq  = d.planFrecuencia||ev.planFrecuencia||'';
  var dur   = d.planDuracion||ev.planDuracion||'';
  var meta  = d.meta||d.objCorto||ev.objCorto||'';
  var objG  = d.objGeneral||d.objLargo||ev.objLargo||'';
  var objE  = d.objEspecificos||ev.objEspecificos||'';
  var plan  = d.planGeneral||ev.planGeneral||'';      // 4° campo del formulario — separado de objE
  var areas = d.planAreas||ev.planAreas||'';
  var prec  = d.planPrecauciones||ev.planPrecauciones||'';
  var edu   = d.planEducacion||ev.planEducacion||'';
  var fld = function(lbl, val){ return val ? '<div class="fld full"><div class="fld-lbl">'+lbl+'</div><div class="fld-val long">'+e2(String(val))+'</div></div>' : ''; };
  var body=''
    +(nSes?'<div class="fld"><div class="fld-lbl">N&deg; Sesiones</div><div class="fld-val">'+e2(nSes)+(freq?' · '+e2(freq):'')+(dur?' · '+e2(dur):'')+'</div></div>':'')
    +fld('Meta', meta)
    +fld('Objetivo General', objG)
    +fld('Objetivos Espec&iacute;ficos', objE)
    +fld('Plan de Tratamiento', plan)
    +fld('&Aacute;reas de intervenci&oacute;n', areas)
    +fld('Precauciones / Contraindicaciones', prec)
    +fld('Educaci&oacute;n al paciente', edu);
  if(!body) return '';
  return '<div class="sec"><div class="sec-hdr">'+num+'. Plan de Tratamiento</div><div class="sec-body">'+body+'</div></div>';
}

function _buildEscalasHTML(d){
  var escalas=d.escalas;
  if(escalas&&typeof escalas==='string'){try{escalas=JSON.parse(escalas);}catch(e){escalas=null;}}
  if(!escalas||!Object.keys(escalas).length) return '';
  return _buildEscalasExport(escalas);
}

// Helper: sección de examen objetivo específica por categoría (usada en buildHCCompletaHTML)
function _buildExamenObjetivoPorCategoria(d, ev, catId){
  var h = '<div class="sec"><div class="sec-hdr">III. Examen Objetivo</div>';

  if(catId === 'traumatologia'){
    var eva = (d.eva!==undefined&&d.eva!==null) ? d.eva : ((ev.evaValor!==undefined&&ev.evaValor!==null&&ev.evaValor!=='') ? ev.evaValor : '—');
    h += '<div class="sec-body">'
      + '<div><div class="field-lbl">EVA</div><div class="field-val">' + e2(String(eva)) + '/10</div></div>'
      + _fld2('Localización dolor', d.dolLoc)
      + _fld2('Tipo de dolor', d.dolTipo)
      + _fld2('Trofismo', d.trofismo)
      + (d.palpacion ? '<div style="grid-column:1/-1">'+_fld2('Palpación', d.palpacion)+'</div>' : '')
      + (d.neuro     ? '<div style="grid-column:1/-1">'+_fld2('Valoración neurológica', d.neuro)+'</div>' : '')
      + (d.tegu      ? '<div style="grid-column:1/-1">'+_fld2('Tegumentario', d.tegu)+'</div>' : '')
      + (d.aux       ? '<div style="grid-column:1/-1">'+_fld2('Auxiliares diagnóstico', d.aux)+'</div>' : '')
      + (d.examObjetivo ? '<div style="grid-column:1/-1">'+_fld2('Examen objetivo', d.examObjetivo)+'</div>' : '')
      + '</div>';
    // Pruebas funcionales
    if(d.pruebasFuncionales && typeof d.pruebasFuncionales === 'object' && Object.keys(d.pruebasFuncionales).length){
      h += '<div style="padding:8px 14px 4px"><div style="font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Pruebas funcionales</div>';
      Object.keys(d.pruebasFuncionales).forEach(function(region){
        var pruebas = d.pruebasFuncionales[region];
        if(!pruebas || !Object.keys(pruebas).length) return;
        h += '<div style="font-size:11px;font-weight:700;color:#475569;margin:6px 0 3px">'+e2(region)+'</div>';
        h += '<table class="tbl-rom"><thead><tr><th style="text-align:left">Prueba</th><th>Resultado</th></tr></thead><tbody>';
        Object.keys(pruebas).forEach(function(nombre){
          h += '<tr><td>'+e2(nombre)+'</td><td style="text-align:center;font-weight:700">'+e2(String(pruebas[nombre]||'—'))+'</td></tr>';
        });
        h += '</tbody></table>';
      });
      h += '</div>';
    } else if(d.pruebas){
      h += '<div style="padding:4px 14px">'+_fld2('Pruebas funcionales', d.pruebas)+'</div>';
    }
    // Tablas ROM y Fuerza
    var romData = d.rom || ev.rom || {};
    if(typeof romData === 'string'){ try{ romData = JSON.parse(romData); }catch(e){ romData = {}; } }
    var fuerzaData = d.fuerza || ev.fuerza || {};
    if(typeof fuerzaData === 'string'){ try{ fuerzaData = JSON.parse(fuerzaData); }catch(e){ fuerzaData = {}; } }
    h += buildRomTable(romData);
    h += buildFuerzaTable(fuerzaData);

  } else if(catId === 'neuro_adultos'){
    h += '<div class="sec-body">'
      + _fld2('Diagnóstico médico', d.dxNeuroMedico||d.dxMedico)
      + _fld2('Tipo de condición', d.tipoCondicionNeuro)
      + _fld2('Tiempo de evolución', d.tiempoEvolucionNeuro)
      + _fld2('Lado afectado', d.ladoAfectadoNeuro)
      + _fld2('Clasificación funcional', d.clasificacionFuncional)
      + _fld2('Dolor neurológico', d.dolorNeuro)
      + _fld2('EVA dolor neurológico', d.evaNeuroDolor!==undefined&&d.evaNeuroDolor!==''?d.evaNeuroDolor+'/10':'')

      + _fld2('Nivel de conciencia', d.nConciencia) + _fld2('Lateralidad', d.lateralidad)
      + _fld2('Orientación', d.orientacion) + _fld2('Comunicación', d.comunicacion)
      + _fld2('Memoria', d.memoria) + _fld2('Atención', d.atencion)
      + _fld2('Tono MMSS D', d.tono_MMSS_D) + _fld2('Tono MMSS I', d.tono_MMSS_I)
      + _fld2('Tono MMII D', d.tono_MMII_D) + _fld2('Tono MMII I', d.tono_MMII_I)
      + _fld2('Fuerza MMSS D', d.fuerza_MMSS_D) + _fld2('Fuerza MMSS I', d.fuerza_MMSS_I)
      + _fld2('Fuerza MMII D', d.fuerza_MMII_D) + _fld2('Fuerza MMII I', d.fuerza_MMII_I)
      + _fld2('Reflejos OT', d.reflejos) + _fld2('Babinski', d.babinski) + _fld2('Clonus', d.clonus)
      + _fld2('Coordinación', d.coordinacion) + _fld2('Movimientos involuntarios', d.movInvoluntarios)
      + _fld2('Sensibilidad táctil', d.sensTactil) + _fld2('Propiocepción', d.propiocepccion)
      + _fld2('Zona afectada', d.zonaAfectada)
      + _fld2('Control cefálico', d.controlCefal) + _fld2('Control de tronco', d.controlTronco)
      + _fld2('Equilibrio estático', d.eqEstatico) + _fld2('Equilibrio dinámico', d.eqDinamico)
      + _fld2('Tipo de marcha', d.tipoMarcha) + _fld2('Patrón de marcha', d.patronMarcha)
      + _fld2('Ayuda técnica', d.ayudaTecnica)
      + _fld2('Transferencia cama↔silla', d.transferenciaCS) + _fld2('Transferencia sentado↔pie', d.transferenciaSP)
      + (d.marchaDescripcion?'<div style="grid-column:1/-1"><div class="field-lbl">Descripción marcha</div><div class="field-val">'+e2(d.marchaDescripcion)+'</div></div>':'')
      + (d.avdBasicasAfect?'<div style="grid-column:1/-1"><div class="field-lbl">AVD básicas afectadas</div><div class="field-val">'+e2(d.avdBasicasAfect)+'</div></div>':'')
      + (d.avdInstAfect?'<div style="grid-column:1/-1"><div class="field-lbl">AVD instrumentales afectadas</div><div class="field-val">'+e2(d.avdInstAfect)+'</div></div>':'')
      + '</div>';

  } else if(catId === 'neuro_pediatrica'){
    h += '<div class="sec-body">'
      + _fld2('Tipo parto', d.tipoParto) + _fld2('Semanas gestación', d.semanasGest)
      + _fld2('APGAR', d.apgar) + _fld2('Escolarización', d.escolarizacion)
      + _fld2('Tono MMSS D', d.tonoPed_MMSS_D) + _fld2('Tono MMII D', d.tonoPed_MMII_D)
      + _fld2('GMFCS', d.escalas&&d.escalas.gmfcs&&d.escalas.gmfcs.items?'Nivel '+d.escalas.gmfcs.items.nivel:'')
      + _fld2('MACS', d.escalas&&d.escalas.macs&&d.escalas.macs.items?'Nivel '+d.escalas.macs.items.nivel:'')
      + _fld2('Control cefálico', d.controlCefalPed) + _fld2('Sedestación', d.sedestacionPed)
      + _fld2('Tipo marcha', d.tipoMarchaPed) + _fld2('Patrón marcha', d.patronMarchaPed)
      + '</div>';

  } else if(catId === 'cardiorespiratorio'){
    h += '<div class="sec-body">'
      + _fld2('FC reposo', d.fcReposo ? d.fcReposo + ' lpm' : '') + _fld2('FR reposo', d.frReposo ? d.frReposo + ' rpm' : '')
      + _fld2('TA', (d.taSistolica && d.taDiastolica) ? d.taSistolica + '/' + d.taDiastolica + ' mmHg' : '')
      + _fld2('SpO₂ reposo', d.spo2Reposo ? d.spo2Reposo + '%' : '')
      + _fld2('IMC', d.imc ? d.imc + ' kg/m²' : '')
      + _fld2('Patrón respiratorio', d.patronResp) + _fld2('Tiraje', d.tiraje)
      + _fld2('Tos', d.tos) + _fld2('Disnea en reposo', d.disneaReposo)
      + _fld2('NYHA', d.nyha) + _fld2('Edema MMII', d.edemaMmii)
      
      + (d.auscultacion ? '<div style="grid-column:1/-1"><div class="field-lbl">Auscultaci&oacute;n</div><div class="field-val">' + e2(d.auscultacion) + '</div></div>' : '')
      + '</div>';

  } else if(catId === 'paralisis_facial'){
    h += '<div class="sec-body">'
      + _fld2('Diagnóstico', d.dxFacial)
      + _fld2('Tipo de parálisis', d.tipoParalisis)
      + _fld2('Lado afectado', d.ladoFacial)
      + _fld2('Tiempo de evolución', d.tiempoEvolFacial)
      + _fld2('Etiología', d.etiologiaFacial)
      + _fld2('Grado House-Brackmann', d.houseBrackmann)
      + _fld2('Ojo / Lagoftalmos', d.lagoftalmos)
      + _fld2('Sincinesias', d.sincinesias)
      + _fld2('Simetría en reposo', d.simetriaReposo)
      + _fld2('Elevación ceja', d.elevacionCeja)
      + _fld2('Cierre ocular', d.cierreOcular)
      + _fld2('Sonrisa', d.sonrisa)
      + _fld2('Elevación comisura', d.elevacionComisura)
      + _fld2('Fruncir labios', d.fruncirLabios)
      + (d.observacionesFacial?'<div style="grid-column:1/-1"><div class="field-lbl">Observaciones</div><div class="field-val">'+e2(d.observacionesFacial)+'</div></div>':'')
      + '</div>';

  } else if(catId === 'postural'){
    h += '<div class="sec-body">';
    if(window.wpostGetIMGS&&window.wpostGetALTS){
      var _imgs=window.wpostGetIMGS();
      var _alts=window.wpostGetALTS();
      var _wdata=d.widgetPostural;
      if(typeof _wdata==='string'){try{_wdata=JSON.parse(_wdata);}catch(e){_wdata=null;}}
      if(_imgs){
        h+='<div style="grid-column:1/-1;display:flex;gap:12px;justify-content:center;margin-bottom:10px">';
        [['ant','Vista Anterior'],['post','Vista Posterior']].forEach(function(vp){
          var v=vp[0],lbl=vp[1];
          h+='<div style="text-align:center">';
          h+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:3px">'+lbl+'</div>';
          h+='<div style="position:relative;display:inline-block;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;width:248px;height:375px;box-sizing:content-box">';
          if(_imgs[v])h+='<img src="'+_imgs[v]+'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top center;display:block">';
          h+='<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:repeating-linear-gradient(to right,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm),repeating-linear-gradient(to bottom,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm)"></div>';
          if(_wdata&&_wdata[v])_wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;});
            if(!alt)return;
            var _sv=alt.char.indexOf('<svg')===0;
            h+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +(_sv?'width:22px;height:22px;':'min-width:22px;height:22px;padding:0 4px;')
              +'border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4)'
              +'">'+alt.char+'</div>';
          });
          h+='</div></div>';
        });
        h+='</div>';
        h+='<div style="grid-column:1/-1;display:flex;gap:12px;justify-content:center;margin-bottom:12px">';
        [['latd','Lateral Derecha'],['lati','Lateral Izquierda']].forEach(function(vp){
          var v=vp[0],lbl=vp[1];
          h+='<div style="text-align:center">';
          h+='<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:3px">'+lbl+'</div>';
          h+='<div style="position:relative;display:inline-block;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;width:248px;height:375px;box-sizing:content-box">';
          if(_imgs[v])h+='<img src="'+_imgs[v]+'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top center;display:block">';
          h+='<div style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;background:repeating-linear-gradient(to right,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm),repeating-linear-gradient(to bottom,rgba(0,0,0,0.10) 0,rgba(0,0,0,0.10) 1px,transparent 1px,transparent 0.5cm)"></div>';
          if(_wdata&&_wdata[v])_wdata[v].forEach(function(chip){
            var alt=_alts.find(function(a){return a.id===chip.altId;});
            if(!alt)return;
            var _sv=alt.char.indexOf('<svg')===0;
            h+='<div class="wpost-chip-view" data-alt-id="'+chip.altId+'" style="position:absolute;left:'+chip.xp+'%;top:'+chip.yp+'%;transform:translate(-50%,-50%);'
              +(_sv?'width:22px;height:22px;':'min-width:22px;height:22px;padding:0 4px;')
              +'border-radius:11px;background:'+alt.color+';'
              +'color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;'
              +'border:1.5px solid rgba(255,255,255,.7);box-shadow:0 1px 3px rgba(0,0,0,.4)'
              +'">'+alt.char+'</div>';
          });
          h+='</div></div>';
        });
        h+='</div>';

        // Agregar leyenda de alteraciones
        h+='<div style="grid-column:1/-1;margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">';
        h+='<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Leyenda de alteraciones</div>';
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        if(_alts&&_wdata){
          var _used2=new Set();
          ['ant','post','latd','lati'].forEach(function(v){(_wdata[v]||[]).forEach(function(c){_used2.add(c.altId);});});
          _alts.filter(function(a){return _used2.has(a.id);}).forEach(function(alt){
            var _sv=alt.char.indexOf('<svg')===0;
            h+='<div style="display:flex;align-items:center;gap:6px;font-size:11px">';
            h+='<div style="'+(_sv?'width:20px;height:20px;':'min-width:20px;height:20px;')+'border-radius:10px;background:'+alt.color+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.5)">'+alt.char+'</div>';
            h+='<span style="color:#475569">'+alt.lbl+'</span>';
            h+='</div>';
          });
        }
        h+='</div></div>';
      }
    }
    var pf=[['discrepanciaReal','Discrepancia MMII real','cm'],['discrepanciaAparente','Discrepancia MMII aparente','cm'],
      ['flechaCervical','Flecha cervical','cm'],['flechaLumbar','Flecha lumbar','cm'],
      ['testAdams','Test Adams',''],['anguloRotTronco','Angulo rot. tronco',''],
      ['gibosidad','Gibosidad',''],['plomada','Plomada',''],['desviacionPlomada','Desviacion plomada','cm'],
      ['desgasteCalzado','Desgaste calzado',''],['apoyoD','Apoyo plantar D',''],['apoyoI','Apoyo plantar I',''],
      ['plantillas','Plantillas',''],['obsMediciones','Obs. mediciones',''],['obsCalzado','Obs. calzado',''],
      ['relacionSintomas','Relacion sintomas',''],['cifDeterioro','CIF Deterioro',''],['cifContextual','CIF Contextual','']];
    pf.forEach(function(f){if(d[f[0]])h+=_fld2(f[1],d[f[0]]+(f[2]?' '+f[2]:''));});
    if(d.obsInspeccionVisual)
      h+='<div style="grid-column:1/-1">'+_fld2('Observaciones inspeccion visual',d.obsInspeccionVisual)+'</div>';
    h += '</div>';
  }

  return h + '</div>';
}

// ─── TABLAS ROM Y FUERZA PARA PDF ─────────────────────
function buildRomTable(rom){
  if(!rom || !Object.keys(rom).length) return '';
  // Agrupar claves por región (e.g. "Tobillo D_Dorsiflexion" → región "Tobillo D")
  var regiones = {};
  Object.keys(rom).forEach(function(k){
    if(!rom[k] && rom[k] !== 0) return; // omitir vacíos
    // Formato: "Region_Movimiento" (ej: "Tobillo D_Dorsiflexion") o "Region_Mov_D"/"Region_Mov_I"
    var parts = k.split('_');
    var reg = parts[0];
    if(parts.length >= 2){
      // Buscar región real en ROM_MOV
      var found = Object.keys(ROM_MOV).find(function(r){ return k.startsWith(r+'_'); });
      if(found) reg = found;
    }
    if(!regiones[reg]) regiones[reg] = {};
    var mov = k.substring(reg.length + 1);
    regiones[reg][mov] = rom[k];
  });
  if(!Object.keys(regiones).length) return '';
  var h = '<div style="padding:8px 14px 12px">';
  h += '<div style="font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Rango de movimiento (&deg;)</div>';
  h += '<table class="tbl-rom" style="font-size:11px"><thead><tr>'
    + '<th style="text-align:left">Región</th>'
    + '<th>Movimiento</th>'
    + '<th>Valor</th>'
    + '</tr></thead><tbody>';
  Object.keys(regiones).forEach(function(reg){
    var movs = regiones[reg];
    var keys = Object.keys(movs);
    if(!keys.length) return;
    keys.forEach(function(mov, i){
      h += '<tr>';
      if(i === 0) h += '<td rowspan="'+keys.length+'" style="font-weight:700;border:1px solid #e2e8f0;padding:4px 8px">'+e2(reg)+'</td>';
      h += '<td>'+e2(mov)+'</td>';
      h += '<td style="text-align:center;font-weight:700;color:#1d4ed8">'+e2(String(movs[mov]))+'</td>';
      h += '</tr>';
    });
  });
  h += '</tbody></table></div>';
  return h;
}

function buildFuerzaTable(fuerza){
  if(!fuerza || !Object.keys(fuerza).length) return '';
  var regiones = {};
  Object.keys(fuerza).forEach(function(k){
    if(!fuerza[k] && fuerza[k] !== 0) return;
    var found = Object.keys(FUERZA_GRP).find(function(r){ return k.startsWith(r+'_'); });
    var reg = found || k.split('_')[0];
    if(!regiones[reg]) regiones[reg] = {};
    var mus = k.substring(reg.length + 1);
    regiones[reg][mus] = fuerza[k];
  });
  if(!Object.keys(regiones).length) return '';
  var h = '<div style="padding:4px 14px 12px">';
  h += '<div style="font-size:10px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Fuerza muscular (0–5)</div>';
  h += '<table class="tbl-rom"><thead><tr>'
    + '<th style="text-align:left">Región</th>'
    + '<th>Grupo muscular</th>'
    + '<th>Grado</th>'
    + '</tr></thead><tbody>';
  Object.keys(regiones).forEach(function(reg){
    var movs = regiones[reg];
    var keys = Object.keys(movs);
    if(!keys.length) return;
    keys.forEach(function(mus, i){
      h += '<tr>';
      if(i === 0) h += '<td rowspan="'+keys.length+'" style="font-weight:700;border:1px solid #e2e8f0;padding:4px 8px">'+e2(reg)+'</td>';
      h += '<td>'+e2(mus)+'</td>';
      h += '<td style="text-align:center;font-weight:700;color:#1d4ed8">'+e2(String(movs[mus]))+'</td>';
      h += '</tr>';
    });
  });
  h += '</tbody></table></div>';
  return h;
}

// Helper campo para export
function _fld2(lbl, val){
  if(!val && val !== 0) return '';
  return '<div><div class="field-lbl">' + lbl + '</div><div class="field-val">' + e2(String(val)) + '</div></div>';
}

// Helper: sección de escalas para exportación
function _buildEscalasExport(escalas){
  if(!escalas || !Object.keys(escalas).length) return '';
  var html = '<div class="sec"><div class="sec-hdr">Escalas aplicadas</div><div class="sec-body full">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px">';
  html += '<thead><tr>'
    + '<th style="background:#eff6ff;color:#1e3a5f;padding:5px 10px;text-align:left;border:1px solid #e2e8f0">Escala</th>'
    + '<th style="background:#eff6ff;color:#1e3a5f;padding:5px 10px;text-align:center;border:1px solid #e2e8f0">Puntaje</th>'
    + '<th style="background:#eff6ff;color:#1e3a5f;padding:5px 10px;text-align:left;border:1px solid #e2e8f0">Interpretaci&oacute;n</th>'
    + '<th style="background:#eff6ff;color:#1e3a5f;padding:5px 10px;text-align:center;border:1px solid #e2e8f0">Fecha</th>'
    + '</tr></thead><tbody>';

  Object.keys(escalas).forEach(function(eid){
    var datos = escalas[eid];
    var def = _selEsc(eid);
    if(!def) return;
    var puntaje = datos.puntajeTotal !== null && datos.puntajeTotal !== undefined ? datos.puntajeTotal : '—';
    var interp  = datos.interpretacion || '—';
    var fecha   = datos.fechaAplicacion ? formatFechaCorta(datos.fechaAplicacion) : '—';
    html += '<tr>'
      + '<td style="border:1px solid #e2e8f0;padding:5px 10px;font-weight:700">' + e2(def.nombre) + '</td>'
      + '<td style="border:1px solid #e2e8f0;padding:5px 10px;text-align:center;font-weight:800;color:#1d4ed8">' + e2(String(puntaje)) + '</td>'
      + '<td style="border:1px solid #e2e8f0;padding:5px 10px">' + e2(interp) + '</td>'
      + '<td style="border:1px solid #e2e8f0;padding:5px 10px;text-align:center">' + e2(fecha) + '</td>'
      + '</tr>';

    // Ítems individuales en fila expandida
    if(datos.items && Object.keys(datos.items).length){
      var itemsHtml = Object.keys(datos.items).filter(function(k){
        var v = datos.items[k];
        return v !== '' && v !== null && v !== undefined && v !== false;
      }).map(function(k){
        return '<span style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;margin:2px;font-size:10px">'
          + e2(k.replace(/_/g,' ').replace(/\s*\([^)]*\)/g,'')) + ': <b>' + e2(String(datos.items[k])) + '</b></span>';
      }).join('');
      if(itemsHtml){
        html += '<tr><td colspan="4" style="border:1px solid #e2e8f0;padding:5px 10px;background:#fafafa">' + itemsHtml + '</td></tr>';
      }
    }
  });

  html += '</tbody></table></div></div>';
  return html;
}


// ─── BUILD HTML SESIÓN ────────────────────────────────
function buildSesHTML(s,pac,firmaHTML){
  // Buscar el grado académico del docente en la lista de usuarios cargada
  var docenteGrado = '';
  if(s.docente && window._docentesList){
    var docente = window._docentesList.find(function(d){
      return (d.nombre||'').toLowerCase() === (s.docente||'').toLowerCase() || (d.codigo||'').toLowerCase() === (s.docente||'').toLowerCase();
    });
    if(docente && docente.gradoAcademico) docenteGrado = ' · ' + docente.gradoAcademico;
  }
  
  var rows='<div class="sec"><div class="sec-hdr">Datos del Paciente</div><div class="sec-body">'
    +'<div><div class="field-lbl">Nombre</div><div class="field-val">'+e2(pac.nombre||'—')+'</div></div>'
    +'<div><div class="field-lbl">DNI</div><div class="field-val">'+e2(pac.dni||'—')+'</div></div>'
    +'</div></div>';
  rows+='<div class="sec"><div class="sec-hdr">Sesi&oacute;n #'+s.numero+' &mdash; '+e2(formatFechaCorta(s.fecha||''))+' &mdash; '+e2(s.estudiante||s.terapeuta||'Estudiante')+'</div><div class="sec-body">'
    +'<div><div class="field-lbl">Estudiante</div><div class="field-val">'+e2(s.estudiante||s.terapeuta||'—')+'</div></div>'
    +'<div><div class="field-lbl">Docente supervisor</div><div class="field-val">'+e2(s.docente||'—')+docenteGrado+'</div></div>'
    +(s.evaValor!==null&&s.evaValor!==undefined&&s.evaValor!==''?'<div><div class="field-lbl">EVA</div><div class="field-val">'+e2(String(s.evaValor))+'/10</div></div>':'')
    +(s.respuesta?'<div><div class="field-lbl">Respuesta del paciente</div><div class="field-val">'+e2(s.respuesta)+'</div></div>':'')
    +'<div style="grid-column:1/-1"><div class="field-lbl">Descripci&oacute;n</div><div class="field-val">'+e2(s.descripcion||'—')+'</div></div>'
    +'</div></div>';
  
  // Plan de tratamiento de la sesión
  var planBody = ''
    + (s.planSesiones ? '<div><div class="field-lbl">N&deg; Sesiones</div><div class="field-val">'+e2(s.planSesiones)+(s.planFrecuencia?' · '+e2(s.planFrecuencia):'')+(s.planDuracion?' · '+e2(s.planDuracion):'')+'</div></div>' : '')
    + (s.planAreas ? '<div style="grid-column:1/-1"><div class="field-lbl">&Aacute;reas de intervenci&oacute;n</div><div class="field-val">'+e2(s.planAreas)+'</div></div>' : '')
    + (s.planPrecauciones ? '<div style="grid-column:1/-1"><div class="field-lbl">Precauciones / Contraindicaciones</div><div class="field-val">'+e2(s.planPrecauciones)+'</div></div>' : '')
    + (s.planEducacion ? '<div style="grid-column:1/-1"><div class="field-lbl">Educaci&oacute;n al paciente</div><div class="field-val">'+e2(s.planEducacion)+'</div></div>' : '');
  
  if(planBody){
    rows += '<div class="sec"><div class="sec-hdr">Plan de Tratamiento</div><div class="sec-body">'+planBody+'</div></div>';
  }
  
  if(s.estado==='aprobada'){
    rows+='<div class="sec" style="border-color:#16a34a;position:relative"><div class="sec-hdr" style="background:#16a34a">&#10003; Sesi&oacute;n Aprobada</div>'
      +'<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 14px">'
      +(s.comentarioDocente?'<div style="flex:1"><div class="field-lbl">Comentario</div><div class="field-val">'+e2(s.comentarioDocente)+'</div></div>':'<div style="flex:1"></div>')
      +firmaHTML
      +'</div></div>';
  }
  return rows;
}

// ─── EXPORTAR HC COMPLETA (admin/docente) ──────────────────

// ─── RENDERIZAR VISTA ADMIN: EXPORTAR HC ──────────────────
function renderExportHC(){
  var v=g('vExportHC');
  v.innerHTML='<div class="card-hdr"><div class="card-title">&#128196; Exportar Historia Cl&iacute;nica</div></div>'
    +'<div class="card" style="margin-bottom:16px">'
    +'<p style="font-size:13px;color:var(--tx3);margin-bottom:14px">Busca al paciente por DNI o nombre para exportar su historia cl&iacute;nica completa (evaluaciones aprobadas y sesiones).</p>'
    +'<div class="form-grid">'
    +'<div class="field form-full"><input class="inp" id="expDNI" placeholder="&#128269; Buscar por DNI o nombre del paciente..." oninput="buscarPacExport()" autocomplete="off" style="font-size:14px"></div>'
    +'</div>'
    +'</div>'
    +'<div id="expResultados"><div class="empty">Escribe para buscar...</div></div>';
}

async function buscarPacExport(){
  var q=(g('expDNI')?.value||'').trim().toLowerCase();
  var box=g('expResultados');
  if(!q||q.length<2){box.innerHTML='<div class="empty">Escribe al menos 2 caracteres...</div>';return;}
  box.innerHTML='<div class="loader">&#9203; Buscando...</div>';
  var r=await apiGet('listarPacientes');
  if(!r.ok){box.innerHTML='<div class="err-box">'+e2(r.error)+'</div>';return;}
  var pacs=(r.pacientes||[]).filter(function(p){
    return (p.dni||'').toLowerCase().includes(q)||(p.nombre||'').toLowerCase().includes(q);
  });
  if(!pacs.length){box.innerHTML='<div class="empty">Sin resultados para &ldquo;'+e2(q)+'&rdquo;</div>';return;}
  var html='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">';
  pacs.forEach(function(p){
    var cat=getCat(p.categoriaId);
    var ini=(p.nombre||'?').split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
    html+='<div class="card" style="display:flex;flex-direction:column;gap:10px">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div class="pac-avatar" style="background:'+cat.color+'33;color:'+cat.color+';border:1.5px solid '+cat.color+'55;font-size:13px;font-weight:700">'+ini+'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-weight:700;font-size:14px;color:var(--tx)">'+e2(p.nombre)+'</div>'
      +'<div style="font-size:11px;color:var(--tx4)">DNI: '+e2(p.dni)+(p.fechaNac?' &middot; '+edad(p.fechaNac)+' a':'')+'</div>'
      +'<div style="margin-top:3px">'+catPill(p.categoriaId)+'</div>'
      +'</div></div>'
      +'<div style="display:flex;gap:8px">'
      +'<button class="btn btn-ghost btn-sm" style="flex:1" data-pid="'+e2(p.id)+'" onclick="abrirPac(this.dataset.pid)">&#128065; Ver ficha</button>'
      +'<button class="btn btn-primary btn-sm" style="flex:1" data-pid="'+e2(p.id)+'" onclick="exportarHC(this.dataset.pid)">&#128196; Exportar HC</button>'
      +'</div></div>';
  });
  html+='</div>';
  box.innerHTML=html;
}

async function abrirSelectorExportPDF(pacId){
  const rE = await apiGet('listarEvaluaciones', {pacienteId: pacId});
  if(!rE.ok){ toast('Error', rE.error, 'err'); return; }
  const evs = (rE.evaluaciones||[]).filter(function(ev){ return ev.estado==='aprobada'; });
  if(!evs.length){ toast('Sin evaluaciones aprobadas','','warn'); return; }
  if(evs.length===1){ exportarHCPaciente(pacId,[evs[0].id]); return; }
  // Modal selector
  var old=document.getElementById('modalSelectorExport'); if(old) old.remove();
  var modal=document.createElement('div');
  modal.id='modalSelectorExport';
  modal.style.cssText='position:fixed;inset:0;background:rgba(10,22,40,.75);z-index:950;'
    +'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  var items=evs.map(function(ev,idx){
    var cat=getCat(ev.categoriaId||'')||{};
    return '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;'
      +'border-radius:8px;border:1px solid var(--bd);cursor:pointer;margin-bottom:6px">'
      +'<input type="checkbox" class="expEvalCk" value="'+ev.id+'" checked style="width:16px;height:16px;cursor:pointer">'
      +'<span style="font-size:13px"><b>'+(cat.nombre||ev.categoriaId)+' #'+(idx+1)+'</b>'
      +' &middot; '+formatFechaCorta(ev.fecha)+'</span></label>';
  }).join('');
  modal.innerHTML='<div style="background:var(--surf);border:1px solid var(--bd);border-radius:18px;'
    +'padding:24px;width:100%;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,.4)">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<div style="font-weight:700;font-size:15px;color:var(--tx)">Seleccionar evaluaciones</div>'
    +'<button onclick="document.getElementById(\'modalSelectorExport\').remove()" '
    +'style="background:rgba(128,128,128,.15);border:none;color:var(--tx3);width:28px;height:28px;'
    +'border-radius:8px;font-size:16px;cursor:pointer">&#x2715;</button></div>'
    +'<div style="font-size:12px;color:var(--tx4);margin-bottom:14px">Selecciona qu&eacute; evaluaciones incluir en el PDF</div>'
    +items
    +'<div style="display:flex;gap:8px;margin-top:16px">'
    +'<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'modalSelectorExport\').remove()">Cancelar</button>'
    +'<button id="btnConfirmExport" class="btn btn-primary">&#x1F4C4; Exportar seleccionadas</button>'
    +'</div></div>';
  document.body.appendChild(modal);
  // Bind confirm button using closure — avoids string interpolation of pacId
  document.getElementById('btnConfirmExport').addEventListener('click', function(){
    var ids=Array.from(document.querySelectorAll('#modalSelectorExport .expEvalCk:checked'))
      .map(function(x){return x.value;});
    if(!ids.length){ toast('Selecciona al menos una evaluaci\u00f3n','','warn'); return; }
    document.getElementById('modalSelectorExport').remove();
    exportarHCPaciente(pacId, ids);
  });
}

function exportarHCPaciente(pacId, evalIds){
  abrirModalFirmaExport(function(docFirmante){
    _generarHCPdf(pacId, docFirmante, evalIds);
  });
}

