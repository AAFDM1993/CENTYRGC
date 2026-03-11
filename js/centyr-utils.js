/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  centyr-utils.js                                         
 * ║  ── Dependencias: centyr-core.js ──                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

;(function () {
    'use strict';

function sincronizar() {
        mostrarNotificacion('🔄 Sincronizando...');
        cargarDatos(false).then(() => {
            if (CENTYR.selectedDni) {
                verHistorial(CENTYR.selectedDni);
            }
            renderLista();
        });
    }

    function exportarPDF() {
        if(!CENTYR.selectedDni) {
            alert("⚠️ Selecciona un paciente primero");
            return;
        }
        
        const filtrados = CENTYR.db.pacientes.filter(x => String(x.dni || '') === CENTYR.selectedDni);
        if(filtrados.length === 0) {
            alert("⚠️ No hay sesiones para exportar");
            return;
        }
        
        // Ordenar cronológicamente (más antigua primero)
        filtrados.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const logoUrl = baseUrl + 'logo.png';
        
        // Formatear fecha actual
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = String(ahora.getFullYear()).slice(-2); // Solo 2 dígitos
        let horas = ahora.getHours();
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        const horasStr = String(horas).padStart(2, '0');
        const fechaGeneracion = `${dia}/${mes}/${anio} ${horasStr}:${minutos} ${ampm}`;
        
        const colegiaturaInfo = CENTYR.currentUser && CENTYR.currentUser.colegiatura ? `<p><strong>Profesional:</strong> ${CENTYR.currentUser.nombre_completo} - ${CENTYR.currentUser.colegiatura}</p>` : CENTYR.currentUser ? `<p><strong>Profesional:</strong> ${CENTYR.currentUser.nombre_completo}</p>` : '';
        
        let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Historial - ${filtrados[0].paciente}</title><style>@page{margin:1cm}body{font-family:'Segoe UI',sans-serif;max-width:100%;margin:0;padding:0;line-height:1.6;color:#333}.header{text-align:center;border-bottom:3px solid #3498db;padding-bottom:20px;margin-bottom:30px}.logo{width:250px;height:auto;margin-bottom:15px}.info-paciente{background:#f8f9fa;padding:20px;border-radius:8px;margin-bottom:30px}.sesion{border:1px solid #e0e6ed;border-radius:10px;padding:20px;margin-bottom:25px;page-break-inside:avoid}.sesion-header{background:#3498db;color:white;padding:10px 15px;border-radius:6px;margin-bottom:15px;font-weight:bold}.sesion-header.evaluacion{background:#27ae60}.sesion-categoria{color:#3498db;font-weight:600;margin:10px 0}.sesion-notas{background:#f8f9fa;padding:15px;border-left:4px solid #3498db;border-radius:4px;white-space:pre-wrap}.sesion-notas.evaluacion{border-left-color:#27ae60}@media print{body{margin:0}.sesion{page-break-inside:avoid}}</style></head><body><div class="header"><img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'"><h2>HISTORIA CLÍNICA</h2></div><div class="info-paciente"><p><strong>Paciente:</strong> ${filtrados[0].paciente}</p><p><strong>DNI:</strong> ${CENTYR.selectedDni}</p><p><strong>Fecha de generación:</strong> ${fechaGeneracion}</p><p><strong>Total sesiones:</strong> ${filtrados.length}</p>${colegiaturaInfo}</div>`;
        
        filtrados.forEach((s, i) => {
            // Usar el campo tipo_atencion guardado, con fallback para datos antiguos
            let tipoAtencion = s.tipo_atencion;
            
            // Si no tiene tipo_atencion (datos antiguos), asignar basándose en posición
            if (!tipoAtencion) {
                // La primera atención (índice 0) es evaluación, el resto son sesiones
                tipoAtencion = i === 0 ? 'evaluacion' : 'sesion';
            }
            
            const esEvaluacion = tipoAtencion === 'evaluacion';
            
            // Contar sesiones hasta este punto (en orden cronológico)
            const sesionesAnteriores = filtrados.slice(0, i + 1)
                .filter((x, idx) => {
                    // Si tiene tipo_atencion, usarlo
                    if (x.tipo_atencion) {
                        return x.tipo_atencion === 'sesion';
                    }
                    // Si no tiene (datos antiguos), la primera es evaluación, el resto sesiones
                    return idx !== 0;
                }).length;
            
            const etiqueta = esEvaluacion ? 'EVALUACIÓN FISIOTERAPÉUTICA' : `SESIÓN #${sesionesAnteriores}`;
            const claseExtra = esEvaluacion ? ' evaluacion' : '';
            
            html += `<div class="sesion"><div class="sesion-header${claseExtra}">📅 ${etiqueta} - ${formatearFecha(s.fecha)}</div><div class="sesion-categoria">${s.categoria}</div><p style="color:#7f8c8d;font-size:14px">👨‍⚕️ ${s.atendido_por}</p><div class="sesion-notas${claseExtra}">${s.notas}</div></div>`;
        });
        
        html += `<div style="margin-top:40px;text-align:center;color:#7f8c8d;font-size:12px;border-top:1px solid #e0e6ed;padding-top:20px"><p>© ${new Date().getFullYear()}</p></div></body></html>`;
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Historial_${filtrados[0].paciente}_${CENTYR.selectedDni}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarNotificacion('📥 HTML Descargado - Ábrelo y presiona Ctrl+P para imprimir/guardar como PDF');
    }

    // ============================================
    // GENERAR INFORME FISIOTERAPÉUTICO
    // ============================================
    
    function generarInformeFisioterapeutico() {
        if(!CENTYR.selectedDni) {
            alert("⚠️ Selecciona un paciente primero");
            return;
        }
        
        const filtrados = CENTYR.db.pacientes.filter(x => String(x.dni || '') === CENTYR.selectedDni);
        if(filtrados.length === 0) {
            alert("⚠️ No hay sesiones para generar informe");
            return;
        }
        
        // Ordenar cronológicamente (más antigua primero)
        filtrados.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        // Separar evaluación y sesiones
        const evaluacion = filtrados.find(s => (s.tipo_atencion === 'evaluacion' || filtrados.indexOf(s) === 0));
        const sesiones = filtrados.filter((s, idx) => {
            if (s.tipo_atencion) {
                return s.tipo_atencion === 'sesion';
            }
            return idx !== 0; // Si no tiene tipo_atencion, la primera es evaluación
        });
        
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const logoUrl = baseUrl + 'logo.png';
        
        // Formatear fecha actual
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = String(ahora.getFullYear()).slice(-2);
        let horas = ahora.getHours();
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        const horasStr = String(horas).padStart(2, '0');
        const fechaGeneracion = `${dia}/${mes}/${anio} ${horasStr}:${minutos} ${ampm}`;
        
        const colegiaturaInfo = CENTYR.currentUser && CENTYR.currentUser.colegiatura ? ctmpLimpio(CENTYR.currentUser.colegiatura) : '';
        
        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Fisioterapéutico - ${filtrados[0].paciente}</title>
    <style>
        @page { margin: 1cm; }
        body { font-family: 'Segoe UI', sans-serif; max-width: 100%; margin: 0; padding: 0; line-height: 1.6; color: #333; font-size: 11pt; }
        .header { text-align: center; border-bottom: 3px solid #27ae60; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { width: 250px; height: auto; margin-bottom: 15px; }
        .titulo-informe { color: #27ae60; font-size: 24pt; font-weight: bold; margin: 10px 0; }
        .info-paciente { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #27ae60; }
        .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px; }
        .info-item strong { color: #2c3e50; }
        .seccion { margin-bottom: 30px; page-break-inside: avoid; }
        .seccion-titulo { background: #27ae60; color: white; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14pt; margin-bottom: 15px; }
        .evaluacion-content { background: #fff; padding: 20px; border: 2px solid #e0e6ed; border-radius: 8px; }
        .sesion { background: #f8f9fa; padding: 15px; margin-bottom: 15px; border-left: 4px solid #3498db; border-radius: 4px; page-break-inside: avoid; }
        .sesion-header { font-weight: bold; color: #3498db; margin-bottom: 8px; font-size: 11pt; }
        .sesion-meta { color: #7f8c8d; font-size: 9pt; margin-bottom: 10px; }
        .sesion-contenido { color: #333; white-space: pre-wrap; line-height: 1.5; }
        .resumen { background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; border-radius: 8px; margin-top: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e6ed; text-align: center; color: #7f8c8d; font-size: 9pt; }
        .firma { margin-top: 50px; text-align: center; }
        .linea-firma { border-top: 2px solid #333; width: 300px; margin: 0 auto 10px; }
        @media print { body { margin: 0; } .seccion { page-break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
        <div class="titulo-informe">INFORME FISIOTERAPÉUTICO</div>
    </div>
    
    <div class="info-paciente">
        <div class="info-row">
            <div class="info-item"><strong>Paciente:</strong> ${filtrados[0].paciente}</div>
            <div class="info-item"><strong>DNI:</strong> ${CENTYR.selectedDni}</div>
        </div>
        <div class="info-row">
            <div class="info-item"><strong>Fecha del informe:</strong> ${fechaGeneracion}</div>
            <div class="info-item"><strong>Total de sesiones:</strong> ${sesiones.length}</div>
        </div>
        ${CENTYR.currentUser ? `<div class="info-row"><div class="info-item"><strong>Profesional:</strong> ${CENTYR.currentUser.nombre_completo}</div>${colegiaturaInfo ? `<div class="info-item"><strong>Colegiatura:</strong> ${colegiaturaInfo}</div>` : ''}</div>` : ''}
    </div>`;
        
        // SECCIÓN DE EVALUACIÓN
        if (evaluacion) {
            html += `<div class="seccion"><div class="seccion-titulo">📋 EVALUACIÓN INICIAL FISIOTERAPÉUTICA</div><div class="evaluacion-content"><p><strong>Fecha:</strong> ${formatearFecha(evaluacion.fecha)}</p><p><strong>Categoría:</strong> ${evaluacion.categoria}</p><p><strong>Evaluado por:</strong> ${evaluacion.atendido_por}</p><hr style="margin: 15px 0; border: none; border-top: 1px solid #e0e6ed;"><div class="sesion-contenido">${evaluacion.notas}</div></div></div>`;
        }
        
        // SECCIÓN DE SESIONES
        if (sesiones.length > 0) {
            html += `<div class="seccion"><div class="seccion-titulo">💪 EVOLUCIÓN Y TRATAMIENTO (${sesiones.length} ${sesiones.length === 1 ? 'sesión' : 'sesiones'})</div>`;
            sesiones.forEach((s, idx) => {
                html += `<div class="sesion"><div class="sesion-header">Sesión #${idx + 1} - ${formatearFecha(s.fecha)}</div><div class="sesion-meta">📌 ${s.categoria} | 👨‍⚕️ ${s.atendido_por}</div><div class="sesion-contenido">${s.notas}</div></div>`;
            });
            html += `</div>`;
        }
        
        // RESUMEN
        html += `<div class="resumen"><h3 style="margin-top: 0; color: #856404;">📊 RESUMEN DEL TRATAMIENTO</h3><p><strong>Periodo de atención:</strong> ${formatearFecha(filtrados[0].fecha)} - ${formatearFecha(filtrados[filtrados.length - 1].fecha)}</p><p><strong>Total de sesiones realizadas:</strong> ${sesiones.length}</p><p><strong>Categorías de atención:</strong> ${[...new Set(filtrados.map(s => s.categoria))].join(', ')}</p></div>`;
        
        // FIRMA Y FOOTER
        html += `<div class="firma"><div class="linea-firma"></div><p style="margin: 5px 0; font-weight: bold;">${CENTYR.currentUser ? CENTYR.currentUser.nombre_completo : ''}</p>${colegiaturaInfo ? `<p style="margin: 5px 0;">${colegiaturaInfo}</p>` : ''}<p style="margin: 5px 0; color: #7f8c8d;">Fisioterapeuta</p></div><div class="footer"><p>Este informe es un documento profesional de carácter confidencial.</p><p>© ${new Date().getFullYear()}</p></div></body></html>`;
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_Fisioterapeutico_${filtrados[0].paciente.replace(/ /g, '_')}_${CENTYR.selectedDni}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarNotificacion('📋 Informe generado - Ábrelo y presiona Ctrl+P para imprimir/guardar como PDF');
    }
    function toggleCalendar() {
        const content = document.getElementById('calendar-content');
        const btn = document.getElementById('calendar-toggle-btn');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            btn.innerText = '▼';
            localStorage.setItem('calendarExpanded', 'true');
        } else {
            content.style.display = 'none';
            btn.innerText = '▶';
            localStorage.setItem('calendarExpanded', 'false');
        }
    }
    
    function restaurarEstadoCalendar() {
        const expanded = localStorage.getItem('calendarExpanded');
        const content = document.getElementById('calendar-content');
        const btn = document.getElementById('calendar-toggle-btn');
        
        // Por defecto, el calendario está expandido
        if (expanded === 'false') {
            content.style.display = 'none';
            btn.innerText = '▶';
        } else {
            content.style.display = 'block';
            btn.innerText = '▼';
        }
    }
    
    function renderCalendar() {
        const year = CENTYR.currentDate.getFullYear();
        const month = CENTYR.currentDate.getMonth();
        
        // Título del calendario
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('calendar-title').innerText = `${monthNames[month]} ${year}`;
        
        // Calcular días
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        // Headers de días
        const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.innerText = day;
            grid.appendChild(header);
        });
        
        // Días del mes anterior
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const dayEl = createDayElement(day, month - 1, year, true);
            grid.appendChild(dayEl);
        }
        
        // Días del mes actual
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && 
                           month === today.getMonth() && 
                           year === today.getFullYear();
            const dayEl = createDayElement(day, month, year, false, isToday);
            grid.appendChild(dayEl);
        }
        
        // Días del siguiente mes
        const remainingDays = 42 - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            const dayEl = createDayElement(day, month + 1, year, true);
            grid.appendChild(dayEl);
        }
        
        // Mostrar citas del día seleccionado
        if (CENTYR.selectedDate) {
            mostrarCitasDia(CENTYR.selectedDate);
        }
    }
    
    function createDayElement(day, month, year, otherMonth = false, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        if (otherMonth) dayEl.classList.add('other-month');
        if (isToday) dayEl.classList.add('today');
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Verificar si tiene citas
        const hasCitas = CENTYR.db.citas.some(c => c.fecha === dateStr);
        if (hasCitas) dayEl.classList.add('has-appointments');
        
        // Marcar si es la fecha seleccionada
        if (CENTYR.selectedDate === dateStr) dayEl.classList.add('selected');
        
        dayEl.innerText = day;
        dayEl.onclick = () => selectDay(dateStr);
        
        return dayEl;
    }
    
    function cambiarMes(direction) {
        CENTYR.currentDate.setMonth(CENTYR.currentDate.getMonth() + direction);
        renderCalendar();
    }
    
    function selectDay(dateStr) {
        CENTYR.selectedDate = dateStr;
        renderCalendar();
        mostrarCitasDia(dateStr);
    }
    
    function mostrarCitasDia(dateStr) {
        const citas = CENTYR.db.citas.filter(c => c.fecha === dateStr).sort((a, b) => a.hora.localeCompare(b.hora));
        const container = document.getElementById('appointments-list');
        
        if (citas.length === 0) {
            container.innerHTML = `
                <p style="text-align:center; color:#999; padding:20px; font-size:0.9rem;">
                    📅 Sin citas agendadas<br>
                    <button class="btn-save" onclick="abrirModalCita('${dateStr}')" style="margin-top:10px; padding:8px 15px; font-size:0.85rem;">
                        Agendar Cita
                    </button>
                </p>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <small style="color:var(--gray); font-weight:bold;">Citas del día</small>
                <button class="btn-save" onclick="abrirModalCita('${dateStr}')" style="padding:5px 10px; font-size:0.75rem;">+ Agregar</button>
            </div>
        ` + citas.map(c => `
            <div class="appointment-item">
                <div>
                    <div class="appointment-time">${c.hora}</div>
                    <div class="appointment-patient">${c.paciente_nombre}</div>
                    ${c.notas ? `<small style="color:var(--gray); font-size:0.75rem;">${c.notas}</small>` : ''}
                </div>
                <button class="appointment-delete" onclick="eliminarCita('${c.id}')" title="Eliminar cita">✕</button>
            </div>
        `).join('');
    }
    
    function abrirModalCita(dateStr) {
        if (!dateStr) dateStr = CENTYR.selectedDate || new Date().toISOString().split('T')[0];
        CENTYR.selectedDate = dateStr;
        
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                           'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        document.getElementById('cita-fecha-texto').innerText = 
            `${parseInt(day)} de ${monthNames[parseInt(month) - 1]} de ${year}`;
        
        document.getElementById('cita-hora').value = '';
        document.getElementById('cita-paciente-dni').value = '';
        document.getElementById('cita-paciente-nombre').value = '';
        document.getElementById('cita-notas').value = '';
        
        document.getElementById('modalCita').style.display = 'block';
    }
    
    function cerrarModalCita() {
        document.getElementById('modalCita').style.display = 'none';
    }
    
    function buscarPacienteCita(dni) {
        const paciente = CENTYR.db.pacientes.find(p => String(p.dni) === dni.trim());
        if (paciente) {
            document.getElementById('cita-paciente-nombre').value = paciente.paciente;
        }
    }
    
    async function agendarCita() {
        const hora = document.getElementById('cita-hora').value;
        const dni = document.getElementById('cita-paciente-dni').value.trim();
        const nombre = document.getElementById('cita-paciente-nombre').value.trim();
        const notas = document.getElementById('cita-notas').value.trim();
        
        if (!hora || !dni || !nombre) {
            alert('⚠️ Completa hora, DNI y nombre del paciente');
            return;
        }
        
        showLoad(true, 'Agendando cita...');
        
        const nuevaCita = {
            action: 'save_cita',
            id: String(Date.now()),
            fecha: CENTYR.selectedDate,
            hora: hora,
            paciente_dni: dni,
            paciente_nombre: nombre,
            notas: notas,
            agendado_por: CENTYR.currentUser.nombre_completo
        };
        
        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(nuevaCita)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Agregar localmente
                CENTYR.db.citas = [...CENTYR.db.citas, nuevaCita];
                
                cerrarModalCita();
                renderCalendar();
                mostrarCitasDia(CENTYR.selectedDate);
                showLoad(false);
                mostrarNotificacion('✅ Cita agendada');
                
                // Recargar en segundo plano
                setTimeout(() => cargarDatos(false), 500);
            } else {
                throw new Error(result.message || 'Error al agendar cita');
            }
        } catch (error) {
            showLoad(false);
            alert('❌ Error: ' + error.message);
        }
    }
    
    async function eliminarCita(id) {
        if (!confirm('¿Eliminar esta cita?')) return;
        
        showLoad(true, 'Eliminando cita...');
        
        const payload = {
            action: 'delete_cita',
            id: id
        };
        
        try {
            const response = await fetch(CENTYR.CONFIG.webAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Eliminar localmente
                CENTYR.db.citas = CENTYR.db.citas.filter(c => c.id !== id);
                
                renderCalendar();
                mostrarCitasDia(CENTYR.selectedDate);
                showLoad(false);
                mostrarNotificacion('✅ Cita eliminada');
                
                // Recargar en segundo plano
                setTimeout(() => cargarDatos(false), 500);
            } else {
                throw new Error(result.message || 'Error al eliminar cita');
            }
        } catch (error) {
            showLoad(false);
            alert('❌ Error: ' + error.message);
        }
    }

    // ============================================
    // MÓDULO DE EJERCICIOS PDF
    // ============================================
    
    let ejercicios = [];
    let imagenTemporal = null;
    
    function abrirModalEjercicios() {
        document.getElementById('modalEjercicios').style.display = 'block';
    }
    
    function cerrarModalEjercicios() {
        document.getElementById('modalEjercicios').style.display = 'none';
    }
    
    function previsualizarImagen(input) {
        const preview = document.getElementById('preview-imagen');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagenTemporal = e.target.result;
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; border-radius: 6px; margin: 10px 0;">`;
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    }
    
    function agregarEjercicio() {
        const nombre = document.getElementById('ejercicio-nombre').value.trim();
        const descripcion = document.getElementById('ejercicio-descripcion').value.trim();
        const indicaciones = document.getElementById('ejercicio-indicaciones').value.trim();
        
        if (!nombre) {
            alert('⚠️ Ingresa al menos el nombre del ejercicio');
            return;
        }
        
        const ejercicio = {
            id: Date.now(),
            nombre: nombre,
            imagen: imagenTemporal,
            descripcion: descripcion,
            indicaciones: indicaciones
        };
        
        ejercicios.push(ejercicio);
        
        // Limpiar formulario
        document.getElementById('ejercicio-nombre').value = '';
        document.getElementById('ejercicio-descripcion').value = '';
        document.getElementById('ejercicio-indicaciones').value = '';
        document.getElementById('ejercicio-imagen').value = '';
        document.getElementById('preview-imagen').innerHTML = '';
        imagenTemporal = null;
        
        renderizarEjercicios();
        mostrarNotificacion('✅ Ejercicio agregado');
    }
    
    function eliminarEjercicio(id) {
        ejercicios = ejercicios.filter(e => e.id !== id);
        renderizarEjercicios();
        mostrarNotificacion('🗑️ Ejercicio eliminado');
    }
    
    function limpiarEjercicios() {
        if (!confirm('¿Eliminar todos los ejercicios agregados?')) return;
        ejercicios = [];
        renderizarEjercicios();
        mostrarNotificacion('🗑️ Lista limpiada');
    }
    
    function renderizarEjercicios() {
        const lista = document.getElementById('lista-ejercicios');
        
        if (ejercicios.length === 0) {
            lista.innerHTML = `
                <p style="text-align: center; color: #95a5a6; padding: 40px 20px;">
                    No hay ejercicios agregados aún.<br>
                    <small>Usa el formulario de arriba para agregar ejercicios</small>
                </p>
            `;
            return;
        }
        
        lista.innerHTML = ejercicios.map((e, idx) => `
            <div class="ejercicio-item">
                <button class="btn-eliminar" onclick="eliminarEjercicio(${e.id})" title="Eliminar">×</button>
                <span class="ejercicio-numero">Ejercicio ${idx + 1}</span>
                <h4 style="color: var(--blue); margin: 10px 0;">${e.nombre}</h4>
                ${e.imagen ? `<img src="${e.imagen}" alt="${e.nombre}">` : ''}
                ${e.descripcion ? `<p style="margin: 10px 0;"><strong>Descripción:</strong><br>${e.descripcion}</p>` : ''}
                ${e.indicaciones ? `<p style="margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;"><strong>📌 Indicaciones:</strong><br>${e.indicaciones}</p>` : ''}
            </div>
        `).join('');
    }
    
    function generarPDFEjercicios() {
        if (ejercicios.length === 0) {
            alert('⚠️ Agrega al menos un ejercicio antes de generar el PDF');
            return;
        }
        
        // Solicitar nombre del paciente
        const nombrePaciente = prompt('Nombre del paciente:', CENTYR.selectedDni ? CENTYR.db.pacientes.find(p => String(p.dni) === CENTYR.selectedDni)?.paciente || '' : '');
        if (!nombrePaciente || !nombrePaciente.trim()) {
            alert('⚠️ Debes ingresar el nombre del paciente');
            return;
        }
        
        const titulo = document.getElementById('ejercicio-titulo-pdf').value.trim() || 'Plan de Ejercicios';
        
        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const logoUrl = baseUrl + 'logo.png';
        
        // Formatear fecha actual
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const anio = String(ahora.getFullYear()).slice(-2);
        const fechaGeneracion = `${dia}/${mes}/${anio}`;
        
        let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${titulo} - ${nombrePaciente}</title>
    <style>
        @page {
            margin: 1cm;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 100%;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #27ae60;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            width: 250px;
            height: auto;
            margin-bottom: 15px;
        }
        .info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .info p {
            margin: 5px 0;
        }
        .ejercicio {
            border: 2px solid #e0e6ed;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            page-break-inside: avoid;
            background: white;
        }
        .ejercicio-header {
            background: #27ae60;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            margin: -20px -20px 20px -20px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .ejercicio-content {
            display: flex;
            gap: 20px;
            align-items: flex-start;
        }
        .ejercicio-imagen {
            flex-shrink: 0;
            width: 5cm;
            height: 5cm;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            background: #f8f9fa;
        }
        .ejercicio-texto {
            flex-grow: 1;
        }
        .descripcion {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #3498db;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        .indicaciones {
            background: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }
        .indicaciones strong {
            color: #856404;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #e0e6ed;
            padding-top: 20px;
        }
        @media print {
            body {
                margin: 0;
            }
            .ejercicio {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
        <h1>${titulo}</h1>
    </div>
    
    <div class="info">
        <p><strong>Paciente:</strong> ${nombrePaciente}</p>
        <p><strong>Fecha:</strong> ${fechaGeneracion}</p>
        <p><strong>Total de ejercicios:</strong> ${ejercicios.length}</p>
        ${CENTYR.currentUser && CENTYR.currentUser.colegiatura ? `<p><strong>Profesional:</strong> ${CENTYR.currentUser.nombre_completo} - ${CENTYR.currentUser.colegiatura}</p>` : CENTYR.currentUser ? `<p><strong>Profesional:</strong> ${CENTYR.currentUser.nombre_completo}</p>` : ''}
    </div>
`;
        
        ejercicios.forEach((e, idx) => {
            html += `
    <div class="ejercicio">
        <div class="ejercicio-header">
            💪 Ejercicio ${idx + 1}: ${e.nombre}
        </div>
        
        <div class="ejercicio-content">
            ${e.imagen ? `<img src="${e.imagen}" alt="${e.nombre}" class="ejercicio-imagen">` : ''}
            
            <div class="ejercicio-texto">
                ${e.descripcion ? `
                <div class="descripcion">
                    <strong>📝 Descripción:</strong><br>
                    ${e.descripcion.replace(/\n/g, '<br>')}
                </div>
                ` : ''}
                
                ${e.indicaciones ? `
                <div class="indicaciones">
                    <strong>📌 Indicaciones:</strong><br>
                    ${e.indicaciones.replace(/\n/g, '<br>')}
                </div>
                ` : ''}
            </div>
        </div>
    </div>
`;
        });
        
        html += `
    <div class="footer">
        <p><strong>Importante:</strong> Realice estos ejercicios según las indicaciones. 
        Ante cualquier dolor o molestia, suspenda y consulte a su profesional de la salud.</p>
        <p>© ${new Date().getFullYear()}</p>
    </div>
</body>
</html>
`;
        
        // Crear un Blob y descargar
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ejercicios_${nombrePaciente.replace(/ /g, '_')}_${fechaGeneracion.replace(/\//g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarNotificacion('📥 HTML Descargado - Ábrelo y presiona Ctrl+P para imprimir/guardar como PDF');
    }

    window.onload = init;


    // ── Registro ─────────────────────────────────────────────────────────────
    const _fns = { sincronizar, exportarPDF, generarInformeFisioterapeutico, toggleCalendar, restaurarEstadoCalendar, renderCalendar, createDayElement, cambiarMes, selectDay, mostrarCitasDia, abrirModalCita, cerrarModalCita, buscarPacienteCita, agendarCita, eliminarCita, abrirModalEjercicios, cerrarModalEjercicios, previsualizarImagen, agregarEjercicio, eliminarEjercicio, limpiarEjercicios, renderizarEjercicios, generarPDFEjercicios };
    Object.assign(CENTYR.fn, _fns);
    Object.assign(window,    _fns);

    // ── Tests ─────────────────────────────────────────────────────────────────
    CENTYR.test['utils'] = function() {
        console.group('🧪 centyr-utils tests');
        let pass = 0, fail = 0;
        function assert(desc, cond) {
            if (cond) { console.log(`  ✅ ${desc}`); pass++; }
            else       { console.error(`  ❌ ${desc}`); fail++; }
        }
        assert('CENTYR.fn.sincronizar registrado', typeof CENTYR.fn.sincronizar === 'function');
        assert('CENTYR.fn.exportarPDF registrado', typeof CENTYR.fn.exportarPDF === 'function');
        assert('CENTYR.fn.generarInformeFisioterapeutico registrado', typeof CENTYR.fn.generarInformeFisioterapeutico === 'function');
        assert('CENTYR.fn.toggleCalendar registrado', typeof CENTYR.fn.toggleCalendar === 'function');
        assert('CENTYR.fn.restaurarEstadoCalendar registrado', typeof CENTYR.fn.restaurarEstadoCalendar === 'function');
        assert('CENTYR.fn.renderCalendar registrado', typeof CENTYR.fn.renderCalendar === 'function');

        assert('renderCalendar registrado',       typeof CENTYR.fn.renderCalendar === 'function');
        assert('agendarCita registrado',          typeof CENTYR.fn.agendarCita === 'function');
        assert('generarPDFEjercicios registrado', typeof CENTYR.fn.generarPDFEjercicios === 'function');
        console.groupEnd();
        console.log(`  Resultado: ${pass} ✅  ${fail} ❌`);
        return { pass, fail };
    };

    console.log('✅ centyr-utils.js cargado');
})();
