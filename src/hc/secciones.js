// Constructores de secciones de formulario clínico por especialidad

function secCardiorespiratorio(d){
  return secSignosVitales(d)
       + secEvalCardioRespiratoria(d)
       + secFuerzaResistenciaCardio(d)
       + secCapacidadFuncionalCardio(d)
}
function secSignosVitales(d){
  return secWrap('sv_cardio','III. Signos vitales y parámetros basales','',`
    <div class="form-grid">
      <div class="field"><label>FC en reposo (lpm)</label>
        <input class="inp" id="fcReposo" type="number" min="0" max="250"
          value="${d.fcReposo||''}" placeholder="lpm"></div>
      <div class="field"><label>FR en reposo (rpm)</label>
        <input class="inp" id="frReposo" type="number" min="0" max="60"
          value="${d.frReposo||''}" placeholder="rpm"></div>
      <div class="field"><label>TA sistólica (mmHg)</label>
        <input class="inp" id="taSistolica" type="number" min="0" max="300"
          value="${d.taSistolica||''}" placeholder="mmHg"></div>
      <div class="field"><label>TA diastólica (mmHg)</label>
        <input class="inp" id="taDiastolica" type="number" min="0" max="200"
          value="${d.taDiastolica||''}" placeholder="mmHg"></div>
      <div class="field"><label>SpO₂ en reposo (%)</label>
        <input class="inp" id="spo2Reposo" type="number" min="0" max="100"
          value="${d.spo2Reposo||''}" placeholder="%"></div>
      <div class="field"><label>Peso (kg)</label>
        <input class="inp" id="peso" type="number" min="0" max="300" step="0.1"
          value="${d.peso||''}" placeholder="kg"
          oninput="(function(){var p=document.getElementById('peso'),t=document.getElementById('talla'),i=document.getElementById('imc');if(p&&t&&i&&p.value&&t.value){var h=Number(t.value)/100;i.value=h>0?(Number(p.value)/(h*h)).toFixed(1):'';}})()"
        ></div>
      <div class="field"><label>Talla (cm)</label>
        <input class="inp" id="talla" type="number" min="0" max="250"
          value="${d.talla||''}" placeholder="cm"
          oninput="(function(){var p=document.getElementById('peso'),t=document.getElementById('talla'),i=document.getElementById('imc');if(p&&t&&i&&p.value&&t.value){var h=Number(t.value)/100;i.value=h>0?(Number(p.value)/(h*h)).toFixed(1):'';}})()"
        ></div>
      <div class="field"><label>IMC (kg/m²) — calculado automáticamente</label>
        <input class="inp" id="imc" value="${d.imc||''}" placeholder="Se calcula al ingresar Peso y Talla" readonly
          style="background:var(--surf3);cursor:default;font-weight:700;color:var(--n900)"></div>
    </div>`);
}


function secEvalCardioRespiratoria(d){
  return secWrap('cardio_resp','IV. Evaluación cardiorrespiratoria','',`
    <div style="font-size:12px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--bd2)">Evaluación Respiratoria</div>
    <div class="form-grid">
      <div class="field"><label>Patrón respiratorio</label>
        <select class="sel" id="patronResp">
          <option value=""></option>
          ${['Normal','Paradójico','Abdominal predominante','Apical predominante','Mixto'].map(v=>`<option ${d.patronResp===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Uso musculatura accesoria</label>
        <select class="sel" id="muscAccesoria">
          <option value=""></option>
          ${['No','Leve','Moderado','Importante'].map(v=>`<option ${d.muscAccesoria===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tiraje</label>
        <select class="sel" id="tiraje">
          <option value=""></option>
          ${['Ninguno','Supraclavicular','Intercostal','Subcostal','Mixto'].map(v=>`<option ${d.tiraje===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tipo de tórax</label>
        <select class="sel" id="tipoTorax">
          <option value=""></option>
          ${['Normal','En barril','Pectus excavatum','Pectus carinatum','Cifoescoliosis','Asimétrico'].map(v=>`<option ${d.tipoTorax===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Expansión torácica</label>
        <select class="sel" id="expansionToracica">
          <option value=""></option>
          ${['Simétrica y conservada','Asimétrica D > I','Asimétrica I > D','Disminuida bilateral','Muy reducida'].map(v=>`<option ${d.expansionToracica===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tos</label>
        <select class="sel" id="tos">
          <option value=""></option>
          ${['Ausente','Seca','Productiva eficaz','Productiva ineficaz','Crónica'].map(v=>`<option ${d.tos===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Auscultación pulmonar</label>
        <textarea class="ta" id="auscultacion" rows="3"
          placeholder="Descripción por zonas (apex, medio, base D/I): murmullo vesicular, crepitantes, sibilancias, roncus, frotes...">${e2(d.auscultacion||'')}</textarea></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--bd2)">Evaluación Cardíaca Funcional</div>
    <div class="form-grid">
      <div class="field"><label>Disnea en reposo</label>
        <select class="sel" id="disneaReposo">
          <option value=""></option>
          ${['No','Sí — leve','Sí — moderada','Sí — grave'].map(v=>`<option ${d.disneaReposo===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Ortopnea</label>
        <select class="sel" id="ortopnea">
          <option value=""></option>
          ${['No','1 almohada','2 almohadas','3 o más almohadas','Decúbito imposible'].map(v=>`<option ${d.ortopnea===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Edema MMII</label>
        <select class="sel" id="edemaMmii">
          <option value=""></option>
          ${['Ausente','Grado 1 — leve maleolar','Grado 2 — hasta la rodilla','Grado 3 — hasta el muslo','Grado 4 — anasarca'].map(v=>`<option ${d.edemaMmii===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Dolor torácico al esfuerzo</label>
        <select class="sel" id="dolorToracico">
          <option value=""></option>
          ${['No','Sí — ocasional','Sí — frecuente'].map(v=>`<option ${d.dolorToracico===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Palpitaciones</label>
        <select class="sel" id="palpitaciones">
          <option value=""></option>
          ${['No','En reposo','Con esfuerzo','Frecuentes'].map(v=>`<option ${d.palpitaciones===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tos nocturna</label>
        <select class="sel" id="tosNocturna">
          <option value=""></option>
          ${['No','Ocasional','Frecuente'].map(v=>`<option ${d.tosNocturna===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Actividades que desencadenan síntomas</label>
        <textarea class="ta" id="activDesencan" rows="2"
          placeholder="Subir escaleras, caminar distancias largas, actividad doméstica...">${e2(d.activDesencan||'')}</textarea></div>
      <div class="field form-full"><label>Aspectos psicosociales</label>
        <textarea class="ta" id="psicosocial" rows="2"
          placeholder="Ansiedad, depresión, tabaquismo activo, red de apoyo, adherencia estimada...">${e2(d.psicosocial||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:8px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica disnea con <b>escala MRC</b> y clase funcional con <b>NYHA</b> en la sección de Escalas. Utiliza la escala de <b>Espirometría</b> para registrar PEF, FVC, FEV1 y FEV1/FVC.
    </div>`);
}

function secFuerzaResistenciaCardio(d){
  const mrc=['0 — Sin contracción','1 — Contracción visible','2 — Movimiento sin gravedad','3 — Vence gravedad','4 — Vence resistencia parcial','5 — Fuerza normal'];
  return secWrap('fuerza_cardio','VI. Fuerza y resistencia muscular','',`
    <div class="form-grid">
      <div class="field"><label>Fuerza MMSS D — MRC</label>
        <select class="sel" id="fuerzaMmssDCard">
          <option value=""></option>
          ${mrc.map(v=>`<option ${d.fuerzaMmssDCard===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Fuerza MMSS I — MRC</label>
        <select class="sel" id="fuerzaMmssICard">
          <option value=""></option>
          ${mrc.map(v=>`<option ${d.fuerzaMmssICard===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Fuerza MMII D — MRC</label>
        <select class="sel" id="fuerzaMmiiDCard">
          <option value=""></option>
          ${mrc.map(v=>`<option ${d.fuerzaMmiiDCard===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Fuerza MMII I — MRC</label>
        <select class="sel" id="fuerzaMmiiICard">
          <option value=""></option>
          ${mrc.map(v=>`<option ${d.fuerzaMmiiICard===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Dinamometría prensión D (kg)</label>
        <input class="inp" id="dinamoD" type="number" min="0" max="100" step="0.1"
          value="${d.dinamoD||''}" placeholder="kg"></div>
      <div class="field"><label>Dinamometría prensión I (kg)</label>
        <input class="inp" id="dinamoI" type="number" min="0" max="100" step="0.1"
          value="${d.dinamoI||''}" placeholder="kg"></div>
      <div class="field form-full"><label>Observaciones de fuerza y resistencia</label>
        <textarea class="ta" id="obsFuerzaCard" rows="2"
          placeholder="Fatiga precoz, debilidad generalizada, asimetrías...">${e2(d.obsFuerzaCard||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:8px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica resistencia con <b>6MWT</b> y <b>Sit-to-Stand 30s</b> en la sección de Escalas.
    </div>`);
}

function secCapacidadFuncionalCardio(d){
  return secWrap('funcional_cardio','VII. Capacidad funcional y AVD','',`
    <div class="form-grid">
      <div class="field"><label>Limitación en AVD por disnea o fatiga</label>
        <select class="sel" id="limitAVD">
          <option value=""></option>
          ${['Ninguna','Leve (actividades intensas)','Moderada (actividades cotidianas)','Grave (mínimo esfuerzo)','Total (reposo)'].map(v=>`<option ${d.limitAVD===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Sueño y descanso</label>
        <select class="sel" id="suenio">
          <option value=""></option>
          ${['Conservado','Insomnio leve','Insomnio moderado','Usa CPAP nocturno','Apneas referidas'].map(v=>`<option ${d.suenio===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones funcionales</label>
        <textarea class="ta" id="obsFuncCard" rows="2"
          placeholder="AVD afectadas, tolerancia al esfuerzo, independencia general...">${e2(d.obsFuncCard||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:8px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica con el <b>Índice de Barthel</b> en la sección de Escalas si aplica.
    </div>`);
}


// ══════════════════════════════════════════════════════════════
// FICHA GERIÁTRICA
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// FICHA EVALUACIÓN POSTURAL
// ══════════════════════════════════════════════════════════════

function secPostural(d){
  return secInspeccionVisualUnificada(d)
       + secMedicionesPosturales(d)
       + secCalzadoApoyoPlantar(d);
}

function secInspeccionVisualUnificada(d){
  if(d.widgetPostural) window._wpostPending=d.widgetPostural;
  else window._wpostPending=null;
  if(d.obsInspeccionVisual) window._wpostPendingObs=d.obsInspeccionVisual;
  else window._wpostPendingObs=null;
  return secWrap('insp_visual','III. Inspeccion visual','','<div id="wpost_mount"></div>',false);
}

function secMedicionesPosturales(d){
  return secWrap('mediciones_post','VI. Mediciones posturales','',`
    <div class="form-grid">
      <div class="field"><label>Discrepancia MMII real (cm)</label>
        <input class="inp" id="discrepanciaReal" type="number" min="0" max="20" step="0.1"
          value="${d.discrepanciaReal||''}" placeholder="cm"></div>
      <div class="field"><label>Discrepancia MMII aparente (cm)</label>
        <input class="inp" id="discrepanciaAparente" type="number" min="0" max="20" step="0.1"
          value="${d.discrepanciaAparente||''}" placeholder="cm"></div>
      <div class="field"><label>Flecha cervical (cm)</label>
        <input class="inp" id="flechaCervical" type="number" min="0" max="15" step="0.1"
          value="${d.flechaCervical||''}" placeholder="cm (normal: 4-6 cm)"></div>
      <div class="field"><label>Flecha lumbar (cm)</label>
        <input class="inp" id="flechaLumbar" type="number" min="0" max="15" step="0.1"
          value="${d.flechaLumbar||''}" placeholder="cm (normal: 4-6 cm)"></div>
      <div class="field"><label>Test de Adams</label>
        <select class="sel" id="testAdams">
          <option value=""></option>
          ${['Negativo','Positivo — gibosidad dorsal D','Positivo — gibosidad dorsal I','Positivo — gibosidad lumbar D','Positivo — gibosidad lumbar I'].map(v=>`<option ${d.testAdams===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Angulo de rotación del tronco (&deg;)</label>
        <input class="inp" id="anguloRotTronco" type="number" min="0" max="40" step="0.5"
          value="${d.anguloRotTronco||''}" placeholder="&deg; (≥ 5&deg; = significativo)"></div>
      <div class="field"><label>Gibosidad</label>
        <select class="sel" id="gibosidad">
          <option value=""></option>
          ${['Ausente','Presente — dorsal D','Presente — dorsal I','Presente — lumbar D','Presente — lumbar I'].map(v=>`<option ${d.gibosidad===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Plomada</label>
        <select class="sel" id="plomada">
          <option value=""></option>
          ${['Alineada','Desviada derecha','Desviada izquierda'].map(v=>`<option ${d.plomada===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Desviación plomada (cm)</label>
        <input class="inp" id="desviacionPlomada" type="number" min="0" max="15" step="0.5"
          value="${d.desviacionPlomada||''}" placeholder="cm"></div>
      <div class="field form-full"><label>Observaciones de mediciones</label>
        <textarea class="ta" id="obsMediciones" rows="2"
          placeholder="Notas sobre mediciones, instrumentos usados...">${e2(d.obsMediciones||'')}</textarea></div>
    </div>`);
}

function secCalzadoApoyoPlantar(d){
  window._plantigrafiaPendingFileId = d.plantigrafiaFileId || '';
  window._plantigrafiaB64Cache = null;
  return secWrap('calzado_post','VII. Calzado y apoyo plantar','',`
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div class="form-grid" style="flex:1">
        <div class="field"><label>Desgaste del calzado</label>
          <select class="sel" id="desgasteCalzado">
            <option value=""></option>
            ${['Simétrico normal','Asimétrico — mayor D','Asimétrico — mayor I','Lateral bilateral','Medial bilateral','Anterior bilateral'].map(v=>`<option ${d.desgasteCalzado===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>Apoyo plantar pie D</label>
          <select class="sel" id="apoyoD">
            <option value=""></option>
            ${['Normal','Pronado','Supinado'].map(v=>`<option ${d.apoyoD===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>Apoyo plantar pie I</label>
          <select class="sel" id="apoyoI">
            <option value=""></option>
            ${['Normal','Pronado','Supinado'].map(v=>`<option ${d.apoyoI===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="field"><label>Plantillas actuales</label>
          <select class="sel" id="plantillas">
            <option value=""></option>
            ${['No usa','Plantillas simples','Plantillas personalizadas','Calzado ortopédico'].map(v=>`<option ${d.plantillas===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
        <div class="field form-full"><label>Observaciones huella plantar / calzado</label>
          <textarea class="ta" id="obsCalzado" rows="2"
            placeholder="Huella plantar, zona de desgaste específica, estado del calzado...">${e2(d.obsCalzado||'')}</textarea></div>
      </div>
      <div style="width:200px;flex-shrink:0">
        <div style="border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:var(--surf)">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--tx3);padding:5px 8px;border-bottom:1px solid var(--bd);background:var(--surf3)">Plantigraf&iacute;a</div>
          <div id="plantigrafia_preview" style="width:100%;min-height:120px;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:6px;box-sizing:border-box">
            <img id="plantigrafia_img" src="" style="max-width:100%;max-height:180px;display:none;border-radius:4px">
            <span id="plantigrafia_ph" style="font-size:11px;color:var(--tx4)">Sin foto</span>
          </div>
          <div style="padding:5px 7px;border-top:1px solid var(--bd);background:var(--surf3);display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:10px;font-weight:600;color:var(--tx3)">
              <input type="file" accept="image/*" style="display:none" onchange="_subirPlantigrafia(this)">
              📷 Subir foto
            </label>
            <button type="button" id="plantigrafia_del_btn" style="display:none;font-size:10px;color:#ef4444;background:none;border:none;cursor:pointer;padding:0 2px;line-height:1" onclick="_eliminarPlantigrafia()">✕ Quitar</button>
            <span id="plantigrafia_status" style="font-size:10px;color:var(--tx4);margin-left:2px"></span>
          </div>
        </div>
        <input type="hidden" id="plantigrafiaFileId" value="${e2(d.plantigrafiaFileId||'')}">
      </div>
    </div>`);
}
function secNeuroAdultos(d){
  return secHistoriaNeuro(d)
       + secEstadoCognitivoCom(d)
       + secExamenMotorNeuro(d)
       + secSensibilidadNeuro(d)
       + secControlPosturalNeuro(d)
       + secMarchaTransferencias(d)
       + secAVDNeuro(d)
}

function secHistoriaNeuro(d){
  return secWrap('historia_neuro','III. Historia clínica neurológica','',`
    <div class="form-grid">
      <div class="field form-full"><label>Diagnóstico médico (CIE-10)</label>
        <input class="inp" id="dxNeuroMedico" value="${e2(d.dxNeuroMedico||d.dxMedico||'')}"
          placeholder="Ej. ACV isquémico, Parkinson, TEC, EM, SGB..."></div>
      <div class="field"><label>Tipo de condición</label>
        <select class="sel" id="tipoCondicionNeuro">
          <option value=""></option>
          ${['ACV isquémico','ACV hemorrágico','Traumatismo craneoencefálico','Lesión medular completa','Lesión medular incompleta',
             'Parkinson','Esclerosis múltiple','Esclerosis lateral amiotrófica','Síndrome de Guillain-Barré',
             'Parálisis cerebral','Polineuropatía','Otra'].map(v=>`<option ${d.tipoCondicionNeuro===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tiempo de evolución</label>
        <select class="sel" id="tiempoEvolucionNeuro">
          <option value=""></option>
          ${['Agudo (< 1 mes)','Subagudo (1-3 meses)','Crónico (> 3 meses)'].map(v=>`<option ${d.tiempoEvolucionNeuro===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Lado afectado</label>
        <select class="sel" id="ladoAfectadoNeuro">
          <option value=""></option>
          ${['Derecho','Izquierdo','Bilateral','No aplica'].map(v=>`<option ${d.ladoAfectadoNeuro===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Clasificación funcional</label>
        <select class="sel" id="clasificacionFuncional">
          <option value=""></option>
          ${['NIHSS 0-4 (leve)','NIHSS 5-15 (moderado)','NIHSS 16-20 (moderado-grave)','NIHSS > 20 (grave)',
             'ASIA A','ASIA B','ASIA C','ASIA D','ASIA E','Hoehn & Yahr I','Hoehn & Yahr II','Hoehn & Yahr III','Hoehn & Yahr IV','Hoehn & Yahr V',
             'EDSS < 4','EDSS 4-6','EDSS > 6','Otra escala'].map(v=>`<option ${d.clasificacionFuncional===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Dolor neurológico</label>
        <select class="sel" id="dolorNeuro">
          <option value=""></option>
          ${['Ausente','Espasticidad dolorosa','Dolor central post-ACV','Dolor neuropático','Alodinia','Disestesias','Cefalea'].map(v=>`<option ${d.dolorNeuro===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>EVA — Dolor neurológico (0-10)</label>
        <div class="eva-wrap" style="margin-top:6px">
          <div class="eva-track" style="position:relative">
            <input type="range" class="eva-sl" id="evaNeuroDolor" min="0" max="10" step="1"
              value="${d.evaNeuroDolor??0}" oninput="g('evaNeuDolorD').textContent=this.value">
          </div>
          <div class="eva-val" id="evaNeuDolorD">${d.evaNeuroDolor??0}</div>
        </div></div>
    </div>`,true);
}

function secEstadoCognitivoCom(d){
  return secWrap('cognitivo','IV. Estado cognitivo y comunicación','',`
    <div class="form-grid">
      <div class="field"><label>Nivel de conciencia</label>
        <select class="sel" id="nConciencia">
          <option value=""></option>
          ${['Alerta','Somnoliento','Estuporoso','Coma'].map(v=>`<option ${d.nConciencia===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Lateralidad dominante</label>
        <select class="sel" id="lateralidad">
          <option value=""></option>
          ${['Diestro','Zurdo','Ambidiestro'].map(v=>`<option ${d.lateralidad===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Orientación</label>
        <select class="sel" id="orientacion">
          <option value=""></option>
          ${['Conservada (T/E/P)','Desorientado en tiempo','Desorientado en espacio','Desorientado en persona','Desorientado T+E','Desorientado global'].map(v=>`<option ${d.orientacion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Comunicación</label>
        <select class="sel" id="comunicacion">
          <option value=""></option>
          ${['Verbal fluida','Afasia expresiva','Afasia receptiva','Afasia mixta','Disartria','No verbal','Comunicación aumentativa'].map(v=>`<option ${d.comunicacion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Memoria</label>
        <select class="sel" id="memoria">
          <option value=""></option>
          ${['Conservada','Alterada a corto plazo','Alterada a largo plazo','Alterada ambas','Sin evaluación'].map(v=>`<option ${d.memoria===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Atención y concentración</label>
        <select class="sel" id="atencion">
          <option value=""></option>
          ${['Conservada','Levemente disminuida','Moderadamente disminuida','Gravemente disminuida'].map(v=>`<option ${d.atencion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones cognitivas</label>
        <textarea class="ta" id="obsCognitivo" rows="2" placeholder="Observaciones adicionales sobre estado cognitivo...">${e2(d.obsCognitivo||'')}</textarea></div>
    </div>`);
}

function secExamenMotorNeuro(d){
  const segmentos=['MMSS D','MMSS I','MMII D','MMII I'];
  const tono=['Normal','Hipotonía leve','Hipotonía moderada','Hipotonía grave','Hipertonía leve','Espasticidad leve','Espasticidad moderada','Espasticidad grave','Rigidez'];
  const mrc=['0 — Sin contracción','1 — Contracción visible sin movimiento','2 — Movimiento sin gravedad','3 — Vence gravedad','4 — Vence resistencia parcial','5 — Fuerza normal'];
  const reflejos=['Normal (++)','Aumentado (+++)','Vivo (++++  )','Disminuido (+)','Abolido (0)'];
  return secWrap('motor_neuro','V. Examen motor','',`
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Tono muscular — Ashworth Modificada por segmento</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:14px">
      ${segmentos.map(seg=>`<div class="field"><label>${seg}</label>
        <select class="sel" id="tono_${seg.replace(/\s/g,'_')}">
          <option value=""></option>
          ${tono.map(v=>`<option ${d['tono_'+seg.replace(/\s/g,'_')]===v?'selected':''}>${v}</option>`).join('')}
        </select></div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Fuerza muscular — Escala MRC (0-5)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:14px">
      ${segmentos.map(seg=>`<div class="field"><label>${seg}</label>
        <select class="sel" id="fuerza_${seg.replace(/\s/g,'_')}">
          <option value=""></option>
          ${mrc.map(v=>`<option ${d['fuerza_'+seg.replace(/\s/g,'_')]===v?'selected':''}>${v}</option>`).join('')}
        </select></div>`).join('')}
    </div>
    <div class="form-grid">
      <div class="field"><label>Reflejos osteotendinosos</label>
        <select class="sel" id="reflejos">
          <option value=""></option>
          ${reflejos.map(v=>`<option ${d.reflejos===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Babinski</label>
        <select class="sel" id="babinski">
          <option value=""></option>
          ${['Negativo','Positivo D','Positivo I','Positivo bilateral'].map(v=>`<option ${d.babinski===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Clonus</label>
        <select class="sel" id="clonus">
          <option value=""></option>
          ${['Ausente','Presente D','Presente I','Presente bilateral'].map(v=>`<option ${d.clonus===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Coordinación</label>
        <select class="sel" id="coordinacion">
          <option value=""></option>
          ${['Conservada','Dismetría leve','Dismetría moderada','Disdiadococinesia','Ataxia'].map(v=>`<option ${d.coordinacion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Movimientos involuntarios</label>
        <select class="sel" id="movInvoluntarios">
          <option value=""></option>
          ${['Ninguno','Temblor reposo','Temblor acción','Distonía','Corea','Atetosis','Mioclonías'].map(v=>`<option ${d.movInvoluntarios===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones motor</label>
        <textarea class="ta" id="obsMotor" rows="2" placeholder="Observaciones adicionales...">${e2(d.obsMotor||'')}</textarea></div>
    </div>`);
}

function secSensibilidadNeuro(d){
  return secWrap('sensibilidad','VI. Sensibilidad','',`
    <div class="form-grid">
      <div class="field"><label>Sensibilidad táctil</label>
        <select class="sel" id="sensTactil">
          <option value=""></option>
          ${['Normal','Hipoestesia leve','Hipoestesia moderada','Hipoestesia grave','Hiperestesia','Anestesia'].map(v=>`<option ${d.sensTactil===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Sensibilidad dolorosa</label>
        <select class="sel" id="sensDolor">
          <option value=""></option>
          ${['Normal','Hipoalgesia','Hiperalgesia','Analgesia','Alodinia'].map(v=>`<option ${d.sensDolor===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Sensibilidad térmica</label>
        <select class="sel" id="sensTermica">
          <option value=""></option>
          ${['Normal','Disminuida','Ausente'].map(v=>`<option ${d.sensTermica===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Propiocepción</label>
        <select class="sel" id="propiocepccion">
          <option value=""></option>
          ${['Conservada','Levemente alterada','Moderadamente alterada','Gravemente alterada'].map(v=>`<option ${d.propiocepccion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Zona afectada</label>
        <select class="sel" id="zonaAfectada">
          <option value=""></option>
          ${['Sin afectación','Hemicuerpo derecho','Hemicuerpo izquierdo','Cuadriplejía','Paraplejía','Monoplejía','Segmentaria'].map(v=>`<option ${d.zonaAfectada===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones sensibilidad</label>
        <textarea class="ta" id="obsSensibilidad" rows="2" placeholder="Distribución, patrones, observaciones...">${e2(d.obsSensibilidad||'')}</textarea></div>
    </div>`);
}

function secControlPosturalNeuro(d){
  return secWrap('postural_neuro','VII. Control postural y equilibrio','',`
    <div class="form-grid">
      <div class="field"><label>Control cefálico</label>
        <select class="sel" id="controlCefal">
          <option value=""></option>
          ${['Completo','Parcial','Ausente'].map(v=>`<option ${d.controlCefal===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Control de tronco en sedente</label>
        <select class="sel" id="controlTronco">
          <option value=""></option>
          ${['Independiente','Con apoyo parcial','Con apoyo total','No mantiene sedestación'].map(v=>`<option ${d.controlTronco===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Equilibrio estático bipedestación</label>
        <select class="sel" id="eqEstatico">
          <option value=""></option>
          ${['Independiente','Con apoyo unilateral','Con apoyo bilateral','No logra bipedestación'].map(v=>`<option ${d.eqEstatico===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Equilibrio dinámico bipedestación</label>
        <select class="sel" id="eqDinamico">
          <option value=""></option>
          ${['Independiente','Con supervisión','Con ayuda técnica','No logra'].map(v=>`<option ${d.eqDinamico===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones posturales</label>
        <textarea class="ta" id="obsPostural" rows="2" placeholder="Reacciones de equilibrio, estrategias compensatorias...">${e2(d.obsPostural||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:6px;padding:8px;background:var(--surf3);border-radius:8px">
      Para cuantificar el equilibrio usa la <b>Escala de Berg</b> y el <b>TUG</b> en la sección de Escalas aplicadas.
    </div>`);
}

function secMarchaTransferencias(d){
  return secWrap('marcha_neuro','VIII. Marcha y transferencias','',`
    <div class="form-grid">
      <div class="field"><label>Tipo de marcha</label>
        <select class="sel" id="tipoMarcha">
          <option value=""></option>
          ${['No deambula','Asistida por persona','Con ayuda técnica','Independiente'].map(v=>`<option ${d.tipoMarcha===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Patrón de marcha</label>
        <select class="sel" id="patronMarcha">
          <option value=""></option>
          ${['Normal','Hemipléjica (guadañante)','Atáxica','Espástica en tijera','Festinante (Parkinson)','Steppage','Trendelenburg','Otra'].map(v=>`<option ${d.patronMarcha===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Ayuda técnica</label>
        <select class="sel" id="ayudaTecnica">
          <option value=""></option>
          ${['Ninguna','Bastón simple','Bastón de cuatro puntos','Andador sin ruedas','Andador con ruedas','Muletas','Silla de ruedas manual','Silla de ruedas eléctrica'].map(v=>`<option ${d.ayudaTecnica===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Transferencia cama ↔ silla</label>
        <select class="sel" id="transferenciaCS">
          <option value=""></option>
          ${['Independiente','Supervisión','Asistencia parcial','Asistencia total'].map(v=>`<option ${d.transferenciaCS===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Transferencia sentado ↔ pie</label>
        <select class="sel" id="transferenciaSP">
          <option value=""></option>
          ${['Independiente','Supervisión','Asistencia parcial','Asistencia total'].map(v=>`<option ${d.transferenciaSP===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones de marcha</label>
        <textarea class="ta" id="obsMarcha" rows="2" placeholder="Longitud de paso, cadencia, base de sustentación, asimetrías...">${e2(d.obsMarcha||'')}</textarea></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin:12px 0 8px;padding:8px 12px;background:var(--surf3);border-radius:8px">📝 Evaluación cualitativa de la marcha</div>
    <div class="form-grid">
      <div class="field form-full"><label>Descripción del patrón de marcha</label>
        <textarea class="ta" id="marchaDescripcion" rows="4" placeholder="Descripción del patrón de marcha: fases de apoyo y balanceo, cadencia, velocidad, análisis de tronco y MMSS, compensaciones observadas...">${e2(d.marchaDescripcion||d.marchaFaseApoyo||'')}</textarea></div>
    </div>`);
}

function secAVDNeuro(d){
  return secWrap('avd_neuro','IX. Actividades de la vida diaria','',`
    <div class="form-grid">
      <div class="field form-full"><label>AVD básicas afectadas</label>
        <textarea class="ta" id="avdBasicasAfect" rows="2" placeholder="Alimentación, higiene, vestido, continencia...">${e2(d.avdBasicasAfect||'')}</textarea></div>
      <div class="field form-full"><label>AVD instrumentales afectadas</label>
        <textarea class="ta" id="avdInstAfect" rows="2" placeholder="Uso de teléfono, transporte, manejo de medicación...">${e2(d.avdInstAfect||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:6px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica con el <b>Índice de Barthel</b> y/o <b>Lawton-Brody</b> en la sección de Escalas.
    </div>`);
}



// ══════════════════════════════════════════════════════════════
// SECCIÓN E: FICHA NEURO PEDIÁTRICA
// ══════════════════════════════════════════════════════════════

// ── SUNNYBROOK (Parálisis facial) ────────────────────────────
function renderEscalaSunnybrook(d){
  var items_d = d&&d.items ? d.items : {};
  var symRep = [
    {k:'sb_r_arruga',l:'Arrugas frente'},
    {k:'sb_r_ojo',l:'Hendidura palpebral'},
    {k:'sb_r_mejilla',l:'Pliegue nasolabial'},
    {k:'sb_r_comisura',l:'Comisura bucal'},
    {k:'sb_r_menton',l:'Mentón'},
  ];
  var movVol = [
    {k:'sb_v_ceja',l:'Elevar ceja'},
    {k:'sb_v_ojo',l:'Cerrar suavemente el ojo'},
    {k:'sb_v_sonrisa',l:'Sonrisa abierta'},
    {k:'sb_v_labio',l:'Fruncir labios'},
    {k:'sb_v_nariz',l:'Arrugar nariz'},
  ];
  var sinc = [
    {k:'sb_s_ojo_ceja',l:'Contracción frente al cerrar ojo'},
    {k:'sb_s_ojo_mejilla',l:'Movimiento mejilla al cerrar ojo'},
    {k:'sb_s_ojo_boca',l:'Movimiento boca al cerrar ojo'},
    {k:'sb_s_boca_ojo',l:'Cierre ocular al sonreír'},
    {k:'sb_s_boca_cuello',l:'Contracción cuello al sonreír'},
  ];
  var opsR = [{v:'',l:''},{v:'0',l:'0 — Normal'},{v:'1',l:'1 — Diferencia leve'},{v:'2',l:'2 — Diferencia obvia'}];
  var opsV = [{v:'',l:''},{v:'1',l:'1 — Sin movimiento'},{v:'2',l:'2 — Inicio'},{v:'3',l:'3 — Parcial'},{v:'4',l:'4 — Casi completo'},{v:'5',l:'5 — Completo'}];
  var opsS = [{v:'',l:''},{v:'0',l:'0 — Sin sincinesia'},{v:'1',l:'1 — Leve'},{v:'2',l:'2 — Moderada'},{v:'3',l:'3 — Grave'}];
  var html = '<div style="display:grid;gap:12px">';
  html += '<div style="font-size:11px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--bd);padding-bottom:4px">A — Simetría en reposo (0-2 por ítem)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">';
  symRep.forEach(function(it){
    html += _selItem(it.k, opsR, items_d[it.k]||'', it.l);
  });
  html += '</div>';
  html += '<div style="font-size:11px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--bd);padding-bottom:4px">B — Movimiento voluntario (1-5 por ítem)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">';
  movVol.forEach(function(it){
    html += _selItem(it.k, opsV, items_d[it.k]||'', it.l);
  });
  html += '</div>';
  html += '<div style="font-size:11px;font-weight:700;color:var(--n900);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--bd);padding-bottom:4px">C — Sincinesias (0-3 por ítem)</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">';
  sinc.forEach(function(it){
    html += _selItem(it.k, opsS, items_d[it.k]||'', it.l);
  });
  html += '</div></div>';
  return html;
}
function calcularSunnybrook(id){
  var b=g('escala_bloque_'+id); if(!b) return null;
  var reposo=['sb_r_arruga','sb_r_ojo','sb_r_mejilla','sb_r_comisura','sb_r_menton'];
  var movol=['sb_v_ceja','sb_v_ojo','sb_v_sonrisa','sb_v_labio','sb_v_nariz'];
  var sincs=['sb_s_ojo_ceja','sb_s_ojo_mejilla','sb_s_ojo_boca','sb_s_boca_ojo','sb_s_boca_cuello'];
  var sumR=0,sumV=0,sumS=0,countR=0,countV=0,countS=0;
  reposo.forEach(function(k){ var el=b.querySelector('[data-escala-item="'+k+'"]'); if(el&&el.value!==''){sumR+=Number(el.value);countR++;} });
  movol.forEach(function(k){ var el=b.querySelector('[data-escala-item="'+k+'"]'); if(el&&el.value!==''){sumV+=Number(el.value);countV++;} });
  sincs.forEach(function(k){ var el=b.querySelector('[data-escala-item="'+k+'"]'); if(el&&el.value!==''){sumS+=Number(el.value);countS++;} });
  if(!countR&&!countV&&!countS) return null;
  var scoreR = sumR*5;
  var scoreV = sumV*4;
  var scoreS = sumS*5;
  var composite = scoreV - scoreR - scoreS;
  if(composite < 0) composite = 0;
  var color = composite>=75?'var(--green)':composite>=50?'var(--amber)':'var(--red)';
  var interp = composite>=75?'Disfunción leve':composite>=50?'Disfunción moderada':'Disfunción grave';
  return {puntaje: composite+'/100', puntajeRaw: composite, interpretacion: interp, color: color};
}

// ══════════════════════════════════════════════════════════════
// FICHA PARÁLISIS FACIAL
// ══════════════════════════════════════════════════════════════

function secParalisisFacial(d){
  return secHistoriaFacial(d)
       + secExamenFacial(d)
       + secMusculaturaFacial(d)
}

function secHistoriaFacial(d){
  return secWrap('historia_facial','III. Historia clínica — Parálisis facial','',`
    <div class="form-grid">
      <div class="field form-full"><label>Diagnóstico médico (CIE-10)</label>
        <input class="inp" id="dxFacial" value="${e2(d.dxFacial||'')}"
          placeholder="Ej: G51.0 Parálisis de Bell, G51.8 Parálisis facial periférica..."></div>
      <div class="field"><label>Tipo de parálisis</label>
        <select class="sel" id="tipoParalisis">
          <option value=""></option>
          ${['Periférica (PNM)','Central (NMS)','Congénita','Traumática','Post-quirúrgica'].map(v=>`<option ${d.tipoParalisis===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Lado afectado</label>
        <select class="sel" id="ladoFacial">
          <option value=""></option>
          ${['Derecho','Izquierdo','Bilateral'].map(v=>`<option ${d.ladoFacial===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Tiempo de evolución</label>
        <select class="sel" id="tiempoEvolFacial">
          <option value=""></option>
          ${['Agudo (< 1 semana)','Subagudo (1-4 semanas)','Subagudo tardío (1-3 meses)','Crónico (> 3 meses)'].map(v=>`<option ${d.tiempoEvolFacial===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Etiología probable</label>
        <select class="sel" id="etiologiaFacial">
          <option value=""></option>
          ${['Idiopática (Parálisis de Bell)','Viral (herpes zóster — Ramsay Hunt)','Viral (herpes simple)','Otitis media','Parotiditis','Traumatismo','Tumor — compresión','Post-quirúrgica','Lyme','Sarcoidosis','Otra'].map(v=>`<option ${d.etiologiaFacial===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Grado House-Brackmann</label>
        <select class="sel" id="houseBrackmann">
          <option value=""></option>
          ${[
            'I — Normal: función normal en todos los territorios',
            'II — Disfunción leve: ligera debilidad al examen detallado',
            'III — Disfunción moderada: diferencia obvia pero sin desfiguración',
            'IV — Disfunción moderada-grave: debilidad obvia y asimetría desfigurante',
            'V — Disfunción grave: movimiento apenas perceptible',
            'VI — Parálisis total: sin movimiento'
          ].map(v=>`<option ${d.houseBrackmann===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Lagoftalmos (cierre incompleto del ojo)</label>
        <select class="sel" id="lagoftalmos">
          <option value=""></option>
          ${['Ausente','Leve (< 2 mm)','Moderado (2-5 mm)','Grave (> 5 mm)'].map(v=>`<option ${d.lagoftalmos===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Sincinesias</label>
        <select class="sel" id="sincinesias">
          <option value=""></option>
          ${['Ausentes','Leves','Moderadas','Graves'].map(v=>`<option ${d.sincinesias===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Simetría facial en reposo</label>
        <select class="sel" id="simetriaReposo">
          <option value=""></option>
          ${['Simétrico','Asimetría leve','Asimetría moderada','Asimetría grave'].map(v=>`<option ${d.simetriaReposo===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>`,true);
}

function secExamenFacial(d){
  const gradosFacial = [
    {v:'',l:''},
    {v:'0',l:'0 — Sin movimiento'},
    {v:'1',l:'1 — Inicio de movimiento'},
    {v:'2',l:'2 — Movimiento parcial'},
    {v:'3',l:'3 — Movimiento ≥ 50%'},
    {v:'4',l:'4 — Movimiento casi normal'},
    {v:'5',l:'5 — Normal'}
  ];
  function selGrado(id, val, label){
    var html = '<div class="field"><label>'+label+'</label><select class="sel" id="'+id+'">';
    gradosFacial.forEach(function(g){ html += '<option value="'+g.v+'"'+(String(val||'')===String(g.v)?' selected':'')+'>'+g.l+'</option>'; });
    html += '</select></div>';
    return html;
  }
  return secWrap('examen_facial','IV. Evaluación de la musculatura facial','',`
    <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;padding:8px;background:var(--surf3);border-radius:8px">
      Escala 0–5: 0 = sin movimiento · 1 = inicio · 2 = parcial · 3 = ≥50% · 4 = casi normal · 5 = normal
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--n900);margin-bottom:8px">Territorio superior — Nervio facial superior</div>
    <div class="form-grid">
      ${selGrado('arrugarFrente', d.arrugarFrente, 'Arrugar la frente')}
      ${selGrado('elevacionCeja', d.elevacionCeja, 'Elevación de la ceja')}
      ${selGrado('cierreOcular', d.cierreOcular, 'Cierre ocular completo')}
      ${selGrado('parpadeoFuerza', d.parpadeoFuerza, 'Parpadeo — fuerza')}
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--n900);margin:12px 0 8px">Territorio inferior — Nervio facial inferior</div>
    <div class="form-grid">
      ${selGrado('sonrisa', d.sonrisa, 'Sonrisa (elevación comisura)')}
      ${selGrado('elevacionComisura', d.elevacionComisura, 'Elevación comisura labial')}
      ${selGrado('mostrarDientes', d.mostrarDientes, 'Mostrar dientes')}
      ${selGrado('fruncirLabios', d.fruncirLabios, 'Fruncir labios / beso')}
      ${selGrado('inflarMejillas', d.inflarMejillas, 'Inflar mejillas')}
      ${selGrado('deprComisura', d.deprComisura, 'Descender comisura labial')}
    </div>
    <div class="form-grid" style="margin-top:12px">
      <div class="field form-full"><label>Observaciones clínicas</label>
        <textarea class="ta" id="observacionesFacial" rows="3"
          placeholder="Sincinesias, espasmos, dolor, sensación subjetiva, lágrimas de cocodrilo, hiperacusia...">${e2(d.observacionesFacial||'')}</textarea></div>
    </div>`);
}

function secMusculaturaFacial(d){
  return secWrap('musculatura_facial','V. Evaluación sensitiva y complementaria','',`
    <div class="form-grid">
      <div class="field"><label>Sensibilidad zona auricular / pabellón</label>
        <select class="sel" id="sensAuricular">
          <option value=""></option>
          ${['Normal','Hipoestesia leve','Hipoestesia moderada','Anestesia','Hiperestesia/alodinia'].map(v=>`<option ${d.sensAuricular===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Gusto (2/3 anteriores lengua)</label>
        <select class="sel" id="gustoLengua">
          <option value=""></option>
          ${['Normal','Ageusia parcial','Ageusia completa','No evaluado'].map(v=>`<option ${d.gustoLengua===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Reflejo corneal</label>
        <select class="sel" id="reflejoCorneal">
          <option value=""></option>
          ${['Presente y normal','Disminuido','Ausente'].map(v=>`<option ${d.reflejoCorneal===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Secreción lagrimal (test Schirmer)</label>
        <select class="sel" id="secLagrimal">
          <option value=""></option>
          ${['Normal','Disminuida','Aumentada (lágrimas cocodrilo)','No evaluado'].map(v=>`<option ${d.secLagrimal===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Dolor</label>
        <select class="sel" id="dolorFacial">
          <option value=""></option>
          ${['Ausente','Retroauricular','Facial','Cefálico difuso','Mandibular'].map(v=>`<option ${d.dolorFacial===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Hiperacusia</label>
        <select class="sel" id="hiperacusia">
          <option value=""></option>
          ${['Ausente','Presente leve','Presente moderada-grave'].map(v=>`<option ${d.hiperacusia===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>EMG — electromiografía</label>
        <select class="sel" id="emgFacial">
          <option value=""></option>
          ${['No realizada','Normal','Denervación parcial','Denervación total','Reinervación en curso'].map(v=>`<option ${d.emgFacial===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Reflejo de Schirmer</label>
        <select class="sel" id="schirmer">
          <option value=""></option>
          ${['Normal (> 10 mm/5 min)','Reducido (5-10 mm)','Muy reducido (< 5 mm)','No evaluado'].map(v=>`<option ${d.schirmer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:8px;padding:8px;background:var(--surf3);border-radius:8px">
      Registra la escala <b>House-Brackmann</b> en la sección III y las escalas <b>Sunnybrook</b> o <b>eFACE</b> en el módulo de Escalas si están disponibles.
    </div>`);
}

function secNeuroPediatrica(d){
  return secAnamnesisPed(d)
       + secDesarrolloPed(d)
       + secCognitivoPed(d)
       + secMotorPed(d)
       + secControlPosturalPed(d)
       + secMarchaPed(d)
       + secMMSSPed(d)
       + secAVDPed(d)
}

function secAnamnesisPed(d){
  const p = d||{};
  return secWrap('anam_ped','II. Antecedentes pediátricos','',`
    <div class="form-grid">
      <div class="field"><label>Diagnóstico médico (CIE-10)</label>
        <input class="inp" id="aDxMed" value="${e2(p.dxMedico||'')}" placeholder="Ej: G80.1 — Parálisis cerebral espástica"></div>
      <div class="field"><label>Tiempo de evolución</label>
        <input class="inp" id="tiempoEvol" value="${e2(p.tiempoEvol||'')}" placeholder="Ej: Desde el nacimiento, 2 años..."></div>
      <div class="field"><label>Tipo de parto</label>
        <select class="sel" id="tipoParto">
          <option value=""></option>
          ${['Eutócico (vaginal)','Cesárea programada','Cesárea de urgencia','Instrumentado (fórceps/ventosa)'].map(v=>`<option ${p.tipoParto===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Semanas de gestación</label>
        <input class="inp" id="semanasGest" type="number" min="20" max="44" value="${p.semanasGest||''}" placeholder="sem"></div>
      <div class="field"><label>Peso al nacer (gramos)</label>
        <input class="inp" id="pesoNacer" type="number" value="${p.pesoNacer||''}" placeholder="gramos"></div>
      <div class="field"><label>APGAR (1'/5')</label>
        <input class="inp" id="apgar" value="${e2(p.apgar||'')}" placeholder="Ej: 7/9"></div>
      <div class="field form-full"><label>Antecedentes prenatales</label>
        <textarea class="ta" id="antePrenatal" rows="2" placeholder="Infecciones TORCH, medicación, controles prenatales...">${e2(p.antePrenatal||'')}</textarea></div>
      <div class="field form-full"><label>Antecedentes posnatales</label>
        <textarea class="ta" id="antePosnatal" rows="2" placeholder="Convulsiones, TEC, meningitis, hospitalizaciones...">${e2(p.antePosnatal||'')}</textarea></div>
      <div class="field form-full"><label>Medicación actual</label>
        <textarea class="ta" id="medicacion" rows="2" placeholder="Medicamentos actuales y dosis...">${e2(p.medicacion||'')}</textarea></div>
    </div>`,true);
}

function secDesarrolloPed(d){
  const p=d||{};
  const hitos=[
    {id:'hitosSostenCef',l:'Sostén cefálico (esperado 3-4 meses)'},
    {id:'hitosSedest',l:'Sedestación (esperado 6-7 meses)'},
    {id:'hitosGateo',l:'Gateo (esperado 8-10 meses)'},
    {id:'hitosBiped',l:'Bipedestación (esperado 10-12 meses)'},
    {id:'hitosMarcha',l:'Marcha (esperado 12-15 meses)'},
    {id:'hitosLenguaje',l:'Lenguaje (balbuceo ~4-6m / primeras palabras ~12m / frases ~24m)'},
  ];
  return secWrap('desarrollo_ped','III. Historia del desarrollo motor','',`
    <div style="display:grid;gap:8px;margin-bottom:12px">
      ${hitos.map(h=>`<div style="padding:10px 12px;background:var(--surf);border-radius:10px;border:1px solid var(--bd)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <span style="font-size:12px;font-weight:600;flex:1">${h.l}</span>
          <input class="inp" id="${h.id}" value="${e2(p[h.id]||'')}" placeholder="Edad o 'No logrado'" style="max-width:150px;font-size:12px">
        </div>
        <textarea class="ta" id="${h.id}_obs" rows="2" placeholder="Descripción: calidad del movimiento, compensaciones, observaciones..." style="font-size:12px;min-height:54px">${e2(p[h.id+'_obs']||'')}</textarea>
      </div>`).join('')}
    </div>
    <div class="form-grid">
      <div class="field"><label>Escolarización</label>
        <select class="sel" id="escolarizacion">
          <option value=""></option>
          ${['No escolarizado','Educación especial','Regular con apoyo','Regular sin apoyo'].map(v=>`<option ${p.escolarizacion===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones generales del desarrollo</label>
        <textarea class="ta" id="obsDesarrollo" rows="2" placeholder="Regresiones, variaciones, contexto familiar...">${e2(p.obsDesarrollo||'')}</textarea></div>
    </div>`);
}

function secCognitivoPed(d){
  const p=d||{};
  return secWrap('cognitivo_ped','IV. Estado cognitivo y conductual','',`
    <div class="form-grid">
      <div class="field"><label>Nivel de alerta y atención</label>
        <select class="sel" id="alertaPed">
          <option value=""></option>
          ${['Alerta y atento','Hipoalerta','Hiperalerta','Fluctuante'].map(v=>`<option ${p.alertaPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Comprensión de órdenes</label>
        <select class="sel" id="comprensionPed">
          <option value=""></option>
          ${['Órdenes simples y complejas','Solo órdenes simples','Comprensión gestual','Sin comprensión aparente'].map(v=>`<option ${p.comprensionPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Conducta</label>
        <select class="sel" id="conductaPed">
          <option value=""></option>
          ${['Colaborador','Oposicionista','Fluctuante','Inhibido','Desinhibido'].map(v=>`<option ${p.conductaPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Comunicación</label>
        <select class="sel" id="comunicacionPed">
          <option value=""></option>
          ${['Verbal fluida','Verbal limitada','No verbal — gestos','PECS','Pictogramas','Comunicador de voz'].map(v=>`<option ${p.comunicacionPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones cognitivo-conductuales</label>
        <textarea class="ta" id="obsCognitivoPed" rows="2" placeholder="Estrategias de comunicación, motivadores, contexto...">${e2(p.obsCognitivoPed||'')}</textarea></div>
    </div>`);
}

function secMotorPed(d){
  const p=d||{};
  const segmentos=['MMSS D','MMSS I','MMII D','MMII I'];
  const tono=['Normal','Hipotónico leve','Hipotónico moderado','Hipotónico grave','Hipertónico leve','Espasticidad leve','Espasticidad moderada','Espasticidad grave','Fluctuante'];
  const mrc=['0 — Sin contracción','1 — Contracción visible','2 — Movimiento sin gravedad','3 — Vence gravedad','4 — Vence resistencia parcial','5 — Fuerza normal'];
  const reflexPrim=['Ausente','Presente e integrado','Persistente (anormal)'];
  return secWrap('motor_ped','V. Examen motor pediátrico','',`
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Tono muscular por segmento</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:14px">
      ${segmentos.map(seg=>`<div class="field"><label>${seg}</label>
        <select class="sel" id="tonoPed_${seg.replace(/\s/g,'_')}">
          <option value=""></option>
          ${tono.map(v=>`<option ${p['tonoPed_'+seg.replace(/\s/g,'_')]===v?'selected':''}>${v}</option>`).join('')}
        </select></div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Fuerza muscular — MRC adaptada</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:14px">
      ${segmentos.map(seg=>`<div class="field"><label>${seg}</label>
        <select class="sel" id="fuerzaPed_${seg.replace(/\s/g,'_')}">
          <option value=""></option>
          ${mrc.map(v=>`<option ${p['fuerzaPed_'+seg.replace(/\s/g,'_')]===v?'selected':''}>${v}</option>`).join('')}
        </select></div>`).join('')}
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Reflejos primitivos</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:14px">
      ${[{id:'refMoro',l:'Moro'},{id:'refTANC',l:'Tónico asimétrico del cuello'},{id:'refTL',l:'Tónico laberíntico'},{id:'refPrension',l:'Prensión palmar'}].map(r=>`<div class="field"><label>${r.l}</label>
        <select class="sel" id="${r.id}">
          <option value=""></option>
          ${reflexPrim.map(v=>`<option ${p[r.id]===v?'selected':''}>${v}</option>`).join('')}
        </select></div>`).join('')}
    </div>
    <div class="form-grid">
      <div class="field"><label>Reacciones de enderezamiento</label>
        <select class="sel" id="reaccEnderez">
          <option value=""></option>
          ${['Presentes y adecuadas','En desarrollo','Ausentes'].map(v=>`<option ${p.reaccEnderez===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Reacciones de equilibrio</label>
        <select class="sel" id="reaccEquilib">
          <option value=""></option>
          ${['Presentes y adecuadas','En desarrollo','Ausentes'].map(v=>`<option ${p.reaccEquilib===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Patrones de movimiento</label>
        <select class="sel" id="patronesMovPed">
          <option value=""></option>
          ${['Normal y variado','Levemente estereotipado','Estereotipado','Asimétrico','Muy limitado'].map(v=>`<option ${p.patronesMovPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones motor</label>
        <textarea class="ta" id="obsMotorPed" rows="2" placeholder="Patrones dominantes, asimetrías, compensaciones...">${e2(p.obsMotorPed||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:6px;padding:8px;background:var(--surf3);border-radius:8px">
      Clasifica el nivel funcional con <b>GMFCS</b> y <b>MACS</b> en la sección de Escalas.
    </div>`);
}

function secControlPosturalPed(d){
  const p=d||{};
  return secWrap('postural_ped','VI. Control postural','',`
    <div class="form-grid">
      <div class="field"><label>Control cefálico</label>
        <select class="sel" id="controlCefalPed">
          <option value=""></option>
          ${['Logrado','En proceso','No logrado'].map(v=>`<option ${p.controlCefalPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Sedestación</label>
        <select class="sel" id="sedestacionPed">
          <option value=""></option>
          ${['Independiente','Con apoyo parcial','Con apoyo total','No lograda'].map(v=>`<option ${p.sedestacionPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Bipedestación</label>
        <select class="sel" id="bipedPed">
          <option value=""></option>
          ${['Lograda e independiente','Con apoyo','Con bipedestador','No lograda'].map(v=>`<option ${p.bipedPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Ortesis / Adaptaciones</label>
        <select class="sel" id="ortesisPed">
          <option value=""></option>
          ${['Ninguna','DAFO','AFO','Corsé','Bipedestador','Silla postural adaptada'].map(v=>`<option ${p.ortesisPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones posturales</label>
        <textarea class="ta" id="obsPosturalPed" rows="2" placeholder="Estrategias de control, asimetrías, apoyos utilizados...">${e2(p.obsPosturalPed||'')}</textarea></div>
    </div>`);
}

function secMarchaPed(d){
  const p=d||{};
  return secWrap('marcha_ped','VII. Marcha y movilidad','',`
    <div class="form-grid">
      <div class="field"><label>Tipo de marcha</label>
        <select class="sel" id="tipoMarchaPed">
          <option value=""></option>
          ${['No deambula','Asistida por persona','Con ayuda técnica','Independiente'].map(v=>`<option ${p.tipoMarchaPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Patrón patológico</label>
        <select class="sel" id="patronMarchaPed">
          <option value=""></option>
          ${['Normal','En tijera','Equino','Agazapado','Trendelenburg','Atáxico','Hemipléjico','Otro'].map(v=>`<option ${p.patronMarchaPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Ayuda técnica</label>
        <select class="sel" id="ayudaTecPed">
          <option value=""></option>
          ${['Ninguna','Andador posterior','Andador anterior','Muletas','Bastón','Silla de ruedas manual','Silla de ruedas eléctrica'].map(v=>`<option ${p.ayudaTecPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones de marcha</label>
        <textarea class="ta" id="obsMarchaPed" rows="2" placeholder="Longitud de paso, cadencia, compensaciones observadas...">${e2(p.obsMarchaPed||'')}</textarea></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin:12px 0 8px;padding:8px 12px;background:var(--surf3);border-radius:8px">📝 Evaluación cualitativa de la marcha</div>
    <div class="form-grid">
      <div class="field form-full"><label>Descripción del patrón de marcha</label>
        <textarea class="ta" id="marchaPedDescripcion" rows="4" placeholder="Descripción del patrón de marcha: análisis de MMII, control de tronco, compensaciones, asimetrías observadas...">${e2(p.marchaPedDescripcion||'')}</textarea></div>
    </div>`);
}

function secMMSSPed(d){
  const p=d||{};
  return secWrap('mmss_ped','VIII. Función de miembro superior','',`
    <div class="form-grid">
      <div class="field"><label>Prensión dominante</label>
        <select class="sel" id="prensionPed">
          <option value=""></option>
          ${['Pinza fina','Pinza lateral','Prensión cilíndrica','Prensión palmar','Prensión esférica','No funcional'].map(v=>`<option ${p.prensionPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Lateralidad</label>
        <select class="sel" id="lateralidadPed">
          <option value=""></option>
          ${['Definida derecha','Definida izquierda','En proceso de definición','No definida'].map(v=>`<option ${p.lateralidadPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Alcance y manipulación</label>
        <select class="sel" id="alcancePed">
          <option value=""></option>
          ${['Normal','Levemente limitado','Moderadamente limitado','Gravemente limitado','Ausente'].map(v=>`<option ${p.alcancePed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Observaciones MMSS</label>
        <textarea class="ta" id="obsMMSSPed" rows="2" placeholder="Uso bimanual, compensaciones, habilidades finas...">${e2(p.obsMMSSPed||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:6px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica la función de mano con <b>MACS</b> en la sección de Escalas.
    </div>`);
}

function secAVDPed(d){
  const p=d||{};
  return secWrap('avd_ped','IX. AVD y participación','',`
    <div class="form-grid">
      <div class="field"><label>Alimentación</label>
        <select class="sel" id="alimentPed">
          <option value=""></option>
          ${['Independiente oral','Asistida oral','SNG','Gastrostomía'].map(v=>`<option ${p.alimentPed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label>Higiene y vestido</label>
        <select class="sel" id="higienePed">
          <option value=""></option>
          ${['Independiente','Con supervisión','Con asistencia parcial','Dependiente'].map(v=>`<option ${p.higienePed===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field form-full"><label>Juego y socialización</label>
        <textarea class="ta" id="juegoSoc" rows="2" placeholder="Tipo de juego, interacción con pares, actividades preferidas...">${e2(p.juegoSoc||'')}</textarea></div>
      <div class="field form-full"><label>Programa domiciliario / familia</label>
        <textarea class="ta" id="progDomiciliario" rows="2" placeholder="Rutinas, ejercicios en casa, indicaciones para cuidadores...">${e2(p.progDomiciliario||'')}</textarea></div>
    </div>
    <div style="font-size:11px;color:var(--tx4);margin-top:6px;padding:8px;background:var(--surf3);border-radius:8px">
      Cuantifica la independencia funcional con <b>WeeFIM</b> en la sección de Escalas.
    </div>`);
}

// ══════════════════════════════════════════════════════════════
// GERIATRÍA — secciones del formulario de evaluación
// ══════════════════════════════════════════════════════════════
function secGeriatria(d){
  return secExamenGeriatria(d) + secFuncionalGeriatria(d);
}

function secExamenGeriatria(d){
  return secWrap('examen_geriatria','III. Examen físico','',`
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Inspección general</div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="posturaGer">Postura general</label>
        <select class="sel" id="posturaGer" name="posturaGer"><option value=""></option>
          ${['Normal','Cifosis dorsal aumentada','Escoliosis','Hiperlordosis lumbar','Antepulsión de cabeza','Otra alteración'].map(v=>`<option ${d.posturaGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="pielGer">Estado de la piel</label>
        <select class="sel" id="pielGer" name="pielGer"><option value=""></option>
          ${['Normal','Xerosis / sequedad','Úlcera por presión','Edema','Hematoma / equimosis','Cicatrices relevantes'].map(v=>`<option ${d.pielGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="evaGer">Dolor (EVA 0-10)</label>
        <div class="eva-wrap" style="margin-top:6px">
          <div class="eva-track" style="position:relative">
            <input type="range" class="eva-sl" id="evaGer" min="0" max="10" step="1"
              value="${d.evaGer??0}" oninput="g('evaGerD').textContent=this.value" name="evaGer">
          </div>
          <div class="eva-val" id="evaGerD">${d.evaGer??0}</div>
        </div></div>
      <div class="field"><label for="dolLocGer">Localización del dolor</label>
        <input class="inp" id="dolLocGer" value="${e2(d.dolLocGer||'')}"
          placeholder="Ej. Rodillas, cadera, columna lumbar..." name="dolLocGer"></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Palpación y movilidad articular</div>
    <div class="field" style="margin-bottom:14px"><label for="palpacionGer">Hallazgos a la palpación</label>
      <textarea class="ta" id="palpacionGer" rows="3"
        placeholder="Dolor a la palpación, temperatura, edema, puntos gatillo, deformidades..." name="palpacionGer">${e2(d.palpacionGer||'')}</textarea></div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="movilCervGer">Movilidad columna cervical</label>
        <select class="sel" id="movilCervGer" name="movilCervGer"><option value=""></option>
          ${['Conservada','Levemente limitada','Moderadamente limitada','Gravemente limitada'].map(v=>`<option ${d.movilCervGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="movilLumGer">Movilidad columna lumbar</label>
        <select class="sel" id="movilLumGer" name="movilLumGer"><option value=""></option>
          ${['Conservada','Levemente limitada','Moderadamente limitada','Gravemente limitada'].map(v=>`<option ${d.movilLumGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="movilCaderaGer">Movilidad caderas</label>
        <select class="sel" id="movilCaderaGer" name="movilCaderaGer"><option value=""></option>
          ${['Conservada bilateral','Limitada derecha','Limitada izquierda','Limitada bilateral'].map(v=>`<option ${d.movilCaderaGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="movilRodGer">Movilidad rodillas</label>
        <select class="sel" id="movilRodGer" name="movilRodGer"><option value=""></option>
          ${['Conservada bilateral','Limitada derecha','Limitada izquierda','Limitada bilateral'].map(v=>`<option ${d.movilRodGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Fuerza muscular</div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="fuerzaMMSS_Ger">Fuerza MMSS (Daniels)</label>
        <select class="sel" id="fuerzaMMSS_Ger" name="fuerzaMMSS_Ger"><option value=""></option>
          ${['5/5 Normal','4/5 Resistencia disminuida','3/5 Vence gravedad','2/5 Sin vencer gravedad','1/5 Mínima','0/5 Sin contracción'].map(v=>`<option ${d.fuerzaMMSS_Ger===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="fuerzaMMII_Ger">Fuerza MMII (Daniels)</label>
        <select class="sel" id="fuerzaMMII_Ger" name="fuerzaMMII_Ger"><option value=""></option>
          ${['5/5 Normal','4/5 Resistencia disminuida','3/5 Vence gravedad','2/5 Sin vencer gravedad','1/5 Mínima','0/5 Sin contracción'].map(v=>`<option ${d.fuerzaMMII_Ger===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="fuerzaGer">Fuerza prensora (dinamometría)</label>
        <select class="sel" id="fuerzaGer" name="fuerzaGer"><option value=""></option>
          ${['Normal (>30 kg H / >20 kg M)','Reducida leve','Reducida moderada (sarcopenia probable)','Muy reducida'].map(v=>`<option ${d.fuerzaGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="trofismoGer">Trofismo muscular</label>
        <select class="sel" id="trofismoGer" name="trofismoGer"><option value=""></option>
          ${['Normal','Hipotrofia leve','Hipotrofia moderada','Hipotrofia severa (sarcopenia)','Atrofia'].map(v=>`<option ${d.trofismoGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Neurológico</div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="sensGer">Sensibilidad</label>
        <select class="sel" id="sensGer" name="sensGer"><option value=""></option>
          ${['Normal','Hipoestesia distal MMII','Hipoestesia generalizada','Parestesias','Anestesia'].map(v=>`<option ${d.sensGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="reflejosGer">Reflejos osteotendinosos</label>
        <select class="sel" id="reflejosGer" name="reflejosGer"><option value=""></option>
          ${['Normales','Hiperreflexia','Hiporreflexia','Arreflexia','Asimétricos'].map(v=>`<option ${d.reflejosGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Exámenes auxiliares</div>
    <div class="field"><label for="auxGer">Exámenes auxiliares relevantes</label>
      <textarea class="ta" id="auxGer" rows="3"
        placeholder="Densitometría, radiografías, laboratorio (vitamina D, albumina, hemoglobina...), otros..." name="auxGer">${e2(d.auxGer||'')}</textarea></div>
  `,true);
}

function secFuncionalGeriatria(d){
  return secWrap('funcional_geriatria','IV. Valoración funcional y cognitiva','',`
    <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;padding:8px;background:var(--surf3);border-radius:8px">
      Valoración geriátrica integral: función física, cognitiva y social.
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Función física</div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="velocidadMarchaGer">Velocidad de marcha</label>
        <select class="sel" id="velocidadMarchaGer" name="velocidadMarchaGer"><option value=""></option>
          ${['Normal (≥1 m/s)','Lenta (0.6–0.9 m/s)','Muy lenta (<0.6 m/s)','No deambula'].map(v=>`<option ${d.velocidadMarchaGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="patronMarchaGer">Patrón de marcha</label>
        <select class="sel" id="patronMarchaGer" name="patronMarchaGer"><option value=""></option>
          ${['Normal','Base ampliada','Pasos cortos','Arrastre de pies','Marcha parkinsónica','Marcha antiálgica','Uso de ayuda técnica'].map(v=>`<option ${d.patronMarchaGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="equilibrioEstGer">Equilibrio estático</label>
        <select class="sel" id="equilibrioEstGer" name="equilibrioEstGer"><option value=""></option>
          ${['Conservado','Levemente alterado','Moderadamente alterado','Gravemente alterado'].map(v=>`<option ${d.equilibrioEstGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="equilibrioDinGer">Equilibrio dinámico</label>
        <select class="sel" id="equilibrioDinGer" name="equilibrioDinGer"><option value=""></option>
          ${['Conservado','Levemente alterado','Moderadamente alterado','Gravemente alterado'].map(v=>`<option ${d.equilibrioDinGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="tugGer">Test TUG (segundos)</label>
        <input class="inp" id="tugGer" type="number" min="0" max="300" step="0.1"
          value="${e2(d.tugGer||'')}" placeholder="seg." name="tugGer"></div>
      <div class="field"><label for="chairStand">Chair Stand 30s (repeticiones)</label>
        <input class="inp" id="chairStand" type="number" min="0" max="30"
          value="${e2(d.chairStand||'')}" placeholder="rep." name="chairStand"></div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Función cognitiva y psicológica</div>
    <div class="form-grid" style="margin-bottom:14px">
      <div class="field"><label for="mmseGer">MMSE / MiniMental</label>
        <select class="sel" id="mmseGer" name="mmseGer"><option value=""></option>
          ${['Normal (27–30)','Deterioro leve (21–26)','Deterioro moderado (11–20)','Deterioro grave (≤10)','No evaluado'].map(v=>`<option ${d.mmseGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="gdsGer">Depresión (GDS)</label>
        <select class="sel" id="gdsGer" name="gdsGer"><option value=""></option>
          ${['Sin depresión (0–5)','Depresión leve (6–10)','Depresión establecida (11–15)','No evaluado'].map(v=>`<option ${d.gdsGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="friedGer">Nivel de fragilidad (Fried)</label>
        <select class="sel" id="friedGer" name="friedGer"><option value=""></option>
          ${['Robusto (0 criterios)','Pre-frágil (1–2 criterios)','Frágil (≥3 criterios)','No evaluado'].map(v=>`<option ${d.friedGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
      <div class="field"><label for="barthelGer">Índice de Barthel</label>
        <select class="sel" id="barthelGer" name="barthelGer"><option value=""></option>
          ${['Independiente (100)','Dependencia mínima (91–99)','Dependencia moderada (61–90)','Dependencia grave (21–60)','Dependencia total (0–20)'].map(v=>`<option ${d.barthelGer===v?'selected':''}>${v}</option>`).join('')}
        </select></div>
    </div>
    <div class="field form-full"><label for="obsGeriatria">Observaciones</label>
      <textarea class="ta" id="obsGeriatria" rows="3"
        placeholder="Hallazgos relevantes, riesgos identificados, recursos del paciente..." name="obsGeriatria">${e2(d.obsGeriatria||'')}</textarea></div>
  `,true);
}

function secPlanTratamiento(d){
  return secWrap('plan','IV. Plan de tratamiento','',`
    <div class="form-grid">
      <div class="field form-full"><label>META</label>
        <textarea class="ta" id="planMeta" rows="2" placeholder="Meta general del tratamiento fisioterapeutico...">${e2(d.meta||'')}</textarea></div>
      <div class="field form-full"><label>Objetivo General</label>
        <textarea class="ta" id="planObjG" rows="2" placeholder="Objetivo general del plan de tratamiento...">${e2(d.objGeneral||'')}</textarea></div>
      <div class="field form-full"><label>Objetivos Específicos</label>
        <textarea class="ta" id="planObjE" rows="3" placeholder="Objetivo especifico 1&#10;Objetivo especifico 2&#10;Objetivo especifico 3...">${e2(d.objEspecificos||'')}</textarea></div>
      <div class="field form-full">
        <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding:8px 12px;background:var(--surf3);border-radius:8px">Plan de Tratamiento</div>
        <textarea class="ta" id="planGeneral" rows="4" placeholder="Tecnicas, modalidades, progresion terapeutica...">${e2(d.planGeneral||'')}</textarea></div>
    </div>
  `);
}

// ── Actualizar tablas dinámicamente al marcar regiones ──

