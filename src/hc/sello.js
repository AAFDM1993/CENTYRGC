// Sello digital de docentes, resolución de firmas y panel de administración

var _exportCallback = null;
var _exportando = false;
var _firmasDocentes = [];
var _firmaCache = {};

// ─── SELLO DIGITAL ASYNC (para vista inline — carga firma lazy) ──────────────
function mkSelloInline(nombreOCodigo, uid){
  // Genera placeholder y lanza carga async de firma
  var doc = (_firmasDocentes||[]).find(function(d){
    return d.nombre===nombreOCodigo || d.codigo===nombreOCodigo;
  });
  if(!doc) doc = (window._listaUsuariosCache||[]).find(function(u){
    return u.nombre===nombreOCodigo || u.codigo===nombreOCodigo;
  });
  if(!doc) return ''; // docente no encontrado en sistema

  var grado  = doc.gradoAcademico ? doc.gradoAcademico+' ' : '';
  var nombre = (grado + (doc.nombre||doc.codigo||'')).trim();
  var ctmp   = doc.ctmp||'';
  var cargo  = doc.cargo||'';
  var selloId = 'sello_'+uid;

  // Si ya tiene firma resuelta (base64) renderizar directo
  if(doc.firma && doc.firma.startsWith('data:image')){
    return _mkSelloHTML(selloId, nombre, ctmp, cargo, doc.firma);
  }

  // Render placeholder y resolver async
  var placeholder = _mkSelloHTML(selloId, nombre, ctmp, cargo, '');
  if(doc.firma && !doc.firma.startsWith('data:image')){
    // fileId → resolver async y actualizar DOM
    resolverFirma_(doc.firma).then(function(b64){
      var el = document.getElementById(selloId);
      if(el && b64){
        el.outerHTML = _mkSelloHTML(selloId, nombre, ctmp, cargo, b64);
      }
    });
  }
  return placeholder;
}

function _mkSelloHTML(id, nombre, ctmp, cargo, firma){
  var imgTag = firma ? '<img src="'+firma+'" style="max-width:110px;max-height:55px;display:block;margin:0 auto 4px;mix-blend-mode:multiply;background:transparent">' : '';
  return '<div id="'+id+'" style="border:1px solid var(--bd);border-radius:8px;background:transparent;padding:10px 14px;display:inline-block;text-align:center;min-width:140px">'
    + imgTag
    + '<div style="border-top:1.5px solid var(--n500);width:130px;margin:0 auto 3px"></div>'
    + '<div style="font-size:11px;font-weight:700;color:var(--tx)">'+e2(nombre)+'</div>'
    + (ctmp?'<div style="font-size:10px;color:var(--tx3)">CTMP: '+e2(ctmp)+'</div>':'')
    + (cargo?'<div style="font-size:9px;color:var(--tx4);max-width:160px;line-height:1.3;margin-top:2px">'+e2(cargo)+'</div>':'')
    + '</div>';
}


function mkSelloDocente(doc){
  if(!doc) return '';
  var grado  = doc.gradoAcademico ? doc.gradoAcademico+' ' : '';
  var nombre = (grado + (doc.nombre||doc.codigo||'')).trim();
  var ctmp   = doc.ctmp||'';
  var cargo  = doc.cargo||'';
  var firma  = doc.firma||'';
  var imgTag = '';
  if(firma && firma.startsWith('data:image')){
    imgTag = '<img src="'+firma+'" style="max-width:130px;max-height:65px;display:block;margin:0 auto 6px;mix-blend-mode:multiply;background:transparent">';
  }
  return '<div class="sello-doc" style="border:1px solid #e2e8f0;border-radius:8px;background:transparent;display:inline-block">'
    +imgTag
    +'<div style="border-top:1.5px solid #1e3a5f;width:160px;margin:0 auto 4px"></div>'
    +'<div style="font-weight:700;font-size:11px;text-align:center;color:#0f172a">'+e2(nombre)+'</div>'
    +(ctmp?'<div style="font-size:10px;text-align:center;color:#475569">CTMP: '+e2(ctmp)+'</div>':'')
    +(cargo?'<div style="font-size:9px;text-align:center;color:#475569;max-width:180px;line-height:1.3;margin-top:2px">'+e2(cargo)+'</div>':'')
    +'</div>';
}

// ─── EXPORTAR COMO VENTANA IMPRIMIBLE ─────────────────

function abrirModalFirmaExport(callback){
  _exportCallback = callback;
  var nom = g('firmaExNombre');
  var grd = g('firmaExGrado');
  var busca = g('firmaExBusca');
  if(nom && !nom.value && session && session.nombre) nom.value = session.nombre;
  if(busca) busca.value = '';
  var dd = g('firmaExDD'); if(dd) dd.style.display = 'none';
  var m = g('modalFirmaExport');
  if(m) m.style.display = 'flex';
  // Precargar lista de usuarios para el buscador
  if(!window._listaUsuariosCache){
    apiGet('listarUsuarios').then(function(rU){
      if(rU.ok) window._listaUsuariosCache = rU.usuarios||[];
      // Pre-rellenar grado del usuario logueado
      if(grd && window._listaUsuariosCache){
        var me = window._listaUsuariosCache.find(function(u){
          return u.codigo === (session&&session.codigo);
        });
        if(me){
          if(me.gradoAcademico && grd) grd.value = me.gradoAcademico;
          if(me.cargo){ var c=g('firmaExCargo'); if(c&&!c.value) c.value=me.cargo; }
          if(me.ctmp){ var ct=g('firmaExCtmp'); if(ct&&!ct.value) ct.value=me.ctmp; }
        }
      }
    }).catch(function(){});
  } else {
    var me = (window._listaUsuariosCache||[]).find(function(u){
      return u.codigo === (session&&session.codigo);
    });
    if(me){
      if(me.gradoAcademico && grd) grd.value = me.gradoAcademico;
      if(me.cargo){ var c=g('firmaExCargo'); if(c&&!c.value) c.value=me.cargo; }
      if(me.ctmp){ var ct=g('firmaExCtmp'); if(ct&&!ct.value) ct.value=me.ctmp; }
    }
  }
  if(busca) setTimeout(function(){ busca.focus(); }, 150);
}

function filtrarFirmaExBusca(val){
  var dd = g('firmaExDD'); if(!dd) return;
  if(!val||!val.trim()){dd.style.display='none';return;}
  var v = val.toLowerCase();
  var usuarios = window._listaUsuariosCache || [];
  var matches = usuarios.filter(function(u){
    return (u.nombre||'').toLowerCase().includes(v)
        || (u.ctmp||'').toLowerCase().includes(v)
        || (u.codigo||'').toLowerCase().includes(v);
  });
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML = matches.slice(0,8).map(function(u){
    var grado = u.gradoAcademico ? u.gradoAcademico+' ' : '';
    return '<div data-ucod="'+e2(u.codigo)+'" style="padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
      +'<span>'+e2(grado+u.nombre)+'</span>'
      +(u.ctmp?'<span style="font-size:10px;color:var(--tx4)">CTMP '+e2(u.ctmp)+'</span>':'')
      +'</div>';
  }).join('');
  dd.style.display = 'block';
  dd.querySelectorAll('[data-ucod]').forEach(function(el){
    el.addEventListener('click', function(){
      seleccionarFirmaEx(el.getAttribute('data-ucod'));
    });
  });
}

function seleccionarFirmaEx(codigo){
  var usuarios = window._listaUsuariosCache || [];
  var u = usuarios.find(function(x){ return x.codigo === codigo; });
  if(!u) return;
  var nom = g('firmaExNombre'); if(nom) nom.value = u.nombre||'';
  var ctmp = g('firmaExCtmp'); if(ctmp) ctmp.value = u.ctmp||'';
  var grd = g('firmaExGrado'); if(grd) grd.value = u.gradoAcademico||'';
  var cargo = g('firmaExCargo');
  if(cargo && u.cargo) cargo.value = u.cargo;
  var busca = g('firmaExBusca'); if(busca) busca.value = u.nombre||'';
  var dd = g('firmaExDD'); if(dd) dd.style.display = 'none';
}

async function confirmarExportConFirma(){
  var nombre = (g('firmaExNombre')?.value||'').trim();
  var ctmp   = (g('firmaExCtmp')?.value||'').trim();
  var cargo  = (g('firmaExCargo')?.value||'').trim();
  var grado  = (g('firmaExGrado')?.value||'').trim();
  if(!nombre){ toast('Ingresa los apellidos y nombres','','warn'); return; }

  var docFirmante = {nombre, ctmp, cargo, gradoAcademico:grado, firma:''};
  try{
    if(!window._listaUsuariosCache){
      const rU = await apiGet('listarUsuarios').catch(()=>({ok:false}));
      if(rU.ok) window._listaUsuariosCache = rU.usuarios||[];
    }
    const match = (window._listaUsuariosCache||[]).find(u=>
      (u.nombre||'').toLowerCase()===nombre.toLowerCase() || (u.ctmp||'')===ctmp
    );
    if(match){
      // Resolver firma si todavía es fileId de Drive
      if(match.firma && !match.firma.startsWith('data:image')){
        match.firma = await resolverFirma_(match.firma);
      }
      if(match.firma) docFirmante.firma = match.firma;
      if(!grado && match.gradoAcademico) docFirmante.gradoAcademico = match.gradoAcademico;
      if(!cargo  && match.cargo)         docFirmante.cargo           = match.cargo;
      if(!ctmp   && match.ctmp)          docFirmante.ctmp            = match.ctmp;
    }
  }catch(e){}
  const cb = _exportCallback;
  cerrarModalFirmaExport();
  if(cb) cb(docFirmante);
}

function cerrarModalFirmaExport(){
  var m=g('modalFirmaExport'); if(m) m.style.display='none';
  _exportCallback = null;
  _exportando = false;
}

function _quitarFondoFirma_(b64){
  return new Promise(function(resolve){
    var img = new Image();
    img.onload = function(){
      var canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var d = data.data;
      for(var i = 0; i < d.length; i += 4){
        var r = d[i], g = d[i+1], b = d[i+2];
        // Si el píxel es muy claro (fondo blanco o casi blanco), hacerlo transparente
        if(r > 200 && g > 200 && b > 200){
          d[i+3] = 0; // alpha = 0 (transparente)
        }
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function(){ resolve(b64); }; // si falla, devolver original
    img.src = b64;
  });
}

async function resolverFirma_(firma){
  if(!firma||firma.length<5) return '';
  if(firma.startsWith('data:image')) return firma;
  if(_firmaCache[firma]) return _firmaCache[firma];
  try{
    // Usar POST igual que el resto de la API para evitar bloqueo CORS con GET
    var rF = await apiPost({action:'getFirma', fileId:firma}).catch(function(){return {ok:false};});
    if(rF.ok && rF.data){
      var b64raw = 'data:'+(rF.mimeType||'image/png')+';base64,'+rF.data;
      var b64 = await _quitarFondoFirma_(b64raw);
      _firmaCache[firma] = b64;
      return b64;
    }
    if(rF.ok && rF.url){
      _firmaCache[firma] = rF.url;
      return rF.url;
    }
    console.warn('resolverFirma_: no se pudo cargar fileId='+firma, rF);
  }catch(err){console.warn('resolverFirma_ error:',err);}
  return '';
}
async function resolverFirmaDoc_(doc){
  if(doc&&doc.firma) doc.firma=await resolverFirma_(doc.firma);
  return doc;
}
async function previsualizarFirma(codigo,idx){
  var docs=_firmasDocentes||[];
  var doc=docs.find(function(d){return d.codigo===codigo;});
  if(!doc||!doc.firma){toast('Sin firma registrada','','warn');return;}
  var b64=await resolverFirma_(doc.firma);
  if(!b64){toast('No se pudo cargar la firma','Verifica el GAS','err');return;}
  var cards=document.querySelectorAll('#vFirmas .card');
  if(!cards[idx]) return;
  var box=cards[idx].querySelector('[style*="min-height"]');
  if(!box) return;
  var img=box.querySelector('img.fp')||document.createElement('img');
  img.className='fp'; img.src=b64;
  img.style.cssText='max-width:130px;max-height:52px;object-fit:contain;display:block;margin:0 auto 4px';
  if(!img.parentNode) box.insertBefore(img,box.firstChild);
}

async function renderFirmas(){
  var v=g('vFirmas');
  v.innerHTML='<div class="loader">Cargando...</div>';
  var r=await apiGet('listarUsuarios').catch(function(){return {ok:false,error:'Error de red'};});
  if(!r.ok){
    v.innerHTML='<div class="card-hdr"><div class="card-title">Firmas</div></div>'
      +'<div class="err-box">'+e2(r.error||'Error')+'<br><small>Verifica que <b>listarUsuarios</b> esté en doGet del GAS y redesplegar.</small></div>';
    return;
  }
  var docs=(r.usuarios||[]).filter(function(u){return u.rol==='docente';});
  _firmasDocentes=docs;
  // Guardar en caché para el modal de exportación
  window._listaUsuariosCache = r.usuarios||[];
  if(!docs.length){
    v.innerHTML='<div class="card-hdr"><div class="card-title">Firmas</div></div>'
      +'<div class="empty" style="padding:32px;text-align:center">'
      +'<b>No hay docentes registrados</b><br><span style="font-size:12px;color:var(--tx4)">Crea usuarios con rol <b>docente</b> en el Sheet (_usuarios).</span></div>';
    return;
  }
  var gradosOpts = ['','Lic.','Mtra.','Mtro.','Dra.','Dr.'].map(function(g){
    return '<option value="'+g+'">'+( g||'— Sin grado —')+'</option>';
  }).join('');

  v.innerHTML='<div class="card-hdr"><div class="card-title">Firmas y Sellos de Docentes</div>'
    +'<div style="font-size:12px;color:var(--tx4)">'+docs.length+' docente'+(docs.length!==1?'s':'')+'</div></div>'
    +'<div style="background:var(--surf3);border:1px solid var(--bd2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--tx3)">'
    +'Sube PNG/JPG (máx 40KB) o pega Base64. El CTMP es la colegiatura del docente.</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">'
    +docs.map(function(doc,i){
      var ini=(doc.nombre||doc.codigo||'?').split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
      var hasFirma=!!(doc.firma&&doc.firma.length>10);
      return '<div class="card">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
        +'<div style="width:38px;height:38px;border-radius:50%;background:var(--n100);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:var(--n500);flex-shrink:0">'+ini+'</div>'
        +'<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;color:var(--tx)">'+e2(doc.nombre||doc.codigo)+'</div>'
        +'<div style="font-size:11px;color:var(--tx4)">'+e2(doc.codigo)+(doc.ctmp?' · CTMP: <b>'+e2(doc.ctmp)+'</b>':'')+'</div></div></div>'
        // Sello preview
        +'<div id="selloPreview_'+i+'" style="border:1px solid var(--bd);border-radius:8px;padding:12px;background:var(--surf2);min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:10px">'
        +(hasFirma?'<div style="font-size:11px;color:var(--tx4)">Cargando...</div>'
          :'<div style="font-size:11px;color:var(--tx4);margin-bottom:4px">Sin firma</div>'
            +'<div style="border-top:1.5px solid #1e3a5f;width:130px;margin:0 auto 3px"></div>'
            +'<div style="font-size:10px;font-weight:700;text-align:center;color:var(--tx)">'+e2(doc.nombre||doc.codigo)+'</div>'
            +(doc.ctmp?'<div style="font-size:10px;text-align:center;color:var(--tx3)">CTMP: '+e2(doc.ctmp)+'</div>':''))
        +'</div>'
        // Fields: CTMP, Grado, Cargo
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div class="field"><label style="font-size:11px">Grado académico</label>'
        +'<select class="sel" id="grado_'+i+'">'
        +gradosOpts.replace('value="'+(doc.gradoAcademico||'')+'"','value="'+(doc.gradoAcademico||'')+'" selected')
        +'</select></div>'
        +'<div class="field"><label style="font-size:11px">N&deg; Colegiatura CTMP</label>'
        +'<input class="inp" id="ctmp_'+i+'" value="'+e2(doc.ctmp||'')+'" placeholder="Ej: 123456"></div>'
        +'</div>'
        +'<div class="field" style="margin-bottom:8px"><label style="font-size:11px">Cargo (aparece en el sello)</label>'
        +'<input class="inp" id="cargo_'+i+'" value="'+e2(doc.cargo||'')+'" placeholder="Ej: Docente supervisor · Fisioterapeuta" style="font-size:11px"></div>'
        +'<div class="field" style="margin-bottom:10px"><label style="font-size:11px">Pegar Base64 <span style="color:var(--tx4);font-weight:400">(alternativa)</span></label>'
        +'<textarea class="ta" id="b64_'+i+'" rows="2" placeholder="data:image/png;base64,..." style="font-size:10px;font-family:monospace"></textarea></div>'
        +'<div class="btn-group" style="flex-wrap:wrap;gap:6px">'
        +'<label class="btn btn-ghost btn-sm" style="cursor:pointer;flex:1">Subir imagen'
        +'<input type="file" accept="image/png,image/jpeg,image/gif" style="display:none" onchange="subirFirma(this,\''+e2(doc.codigo)+'\','+i+')"></label>'
        +'<button class="btn btn-ghost btn-sm" style="flex:1" onclick="guardarB64(\''+e2(doc.codigo)+'\','+i+')">Base64</button>'
        +(hasFirma?'<button class="btn btn-ghost btn-sm" onclick="eliminarFirma(\''+e2(doc.codigo)+'\','+i+')" style="color:var(--red)">Eliminar</button>':'')
        +'</div>'
        +'<div style="margin-top:8px"><button class="btn btn-primary btn-sm" style="width:100%" onclick="guardarDatosDocente(\''+e2(doc.codigo)+'\','+i+')">Guardar datos del sello</button></div>'
        +(hasFirma?'<div style="font-size:10px;color:var(--green);margin-top:6px">Firma registrada</div>':'')
        +'</div>';
    }).join('')+'</div>';
  // Cargar previews async
  docs.forEach(function(doc,i){
    if(doc.firma&&doc.firma.length>10) _cargarPreviewFirma(doc,i);
  });
}

async function _cargarPreviewFirma(doc,idx){
  var box=g('selloPreview_'+idx);
  if(!box) return;
  var b64=await resolverFirma_(doc.firma);
  if(!b64){
    box.innerHTML='<div style="font-size:11px;color:var(--red)">&#9888; No se pudo cargar la imagen</div>'
      +'<div style="border-top:1.5px solid #1e3a5f;width:130px;margin:6px auto 3px"></div>'
      +'<div style="font-size:10px;font-weight:700;text-align:center;color:var(--tx)">'+e2(doc.nombre||doc.codigo)+'</div>'
      +(doc.ctmp?'<div style="font-size:10px;text-align:center;color:var(--tx3)">CTMP: '+e2(doc.ctmp)+'</div>':'');
    return;
  }
  box.innerHTML='<img src="'+b64+'" style="max-width:130px;max-height:52px;object-fit:contain;display:block;margin:0 auto 4px">'
    +'<div style="border-top:1.5px solid #1e3a5f;width:130px;margin:0 auto 3px"></div>'
    +'<div style="font-size:10px;font-weight:700;text-align:center;color:var(--tx)">'+e2(doc.nombre||doc.codigo)+'</div>'
    +(doc.ctmp?'<div style="font-size:10px;text-align:center;color:var(--tx3)">CTMP: '+e2(doc.ctmp)+'</div>':'');
}

function subirFirma(input, codigo, idx){
  var file=input.files[0]; if(!file) return;
  // Comprimir/redimensionar antes de enviar a Sheets (límite ~50K chars = ~37KB imagen)
  var MAX_B64=35000; // ~26KB imagen para dejar margen (firmas de docentes)
  var reader=new FileReader();
  reader.onload=function(e){
    var src=e.target.result;
    // Usar canvas para redimensionar
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      var MAX_DIM=300; // max 300px en cualquier dimensión
      var w=img.width, h=img.height;
      if(w>MAX_DIM||h>MAX_DIM){
        if(w>h){h=Math.round(h*MAX_DIM/w);w=MAX_DIM;}
        else{w=Math.round(w*MAX_DIM/h);h=MAX_DIM;}
      }
      canvas.width=w; canvas.height=h;
      var ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      // Intentar calidad progresiva hasta que quepa
      var q=0.85, b64='';
      do{
        b64=canvas.toDataURL('image/png');
        if(b64.length>MAX_B64) b64=canvas.toDataURL('image/jpeg',q);
        q-=0.1;
      }while(b64.length>MAX_B64&&q>0.2);
      if(b64.length>MAX_B64){
        toast('Imagen muy grande incluso comprimida','Usa una firma m\u00e1s simple o menor resoluci\u00f3n','warn');
        return;
      }
      _enviarFirma(codigo,idx,b64);
    };
    img.src=src;
  };
  reader.readAsDataURL(file);
}

async function guardarB64(codigo, idx){
  var raw=(g('b64_'+idx)?.value||'').trim();
  if(!raw){toast('Pega el c\u00f3digo Base64 primero','','warn');return;}
  var b64=raw;
  if(!b64.startsWith('data:')){
    // Detectar tipo
    var tipo='image/png';
    if(b64.startsWith('/9j/')) tipo='image/jpeg';
    else if(b64.startsWith('R0lGOD')) tipo='image/gif';
    b64='data:'+tipo+';base64,'+b64;
  }
  if(b64.length>38000){
    toast('Base64 demasiado largo para Google Sheets','Usa una imagen más pequeña o simplifica el diseño.','warn');
    return;
  }
  _enviarFirma(codigo,idx,b64);
}

async function _enviarFirma(codigo,idx,b64){
  toast('\u23F3 Guardando firma en Drive...','','ok');
  var r=await apiPost({action:'guardarFirmaDocente',codigo:codigo,firma:b64}).catch(function(){return {ok:false,error:'Error de red'};});
  if(!r.ok){toast('Error al guardar',r.error||'Verifica el GAS','err');return;}
  toast('\u2705 Firma guardada en Drive','','ok');
  renderFirmas();
}

async function eliminarFirma(codigo, idx){
  if(!confirm('¿Eliminar la firma de este docente?')) return;
  var r=await apiPost({action:'guardarFirmaDocente',codigo:codigo,firma:''}).catch(function(){return {ok:false};});
  if(!r.ok){toast('Error',r.error||'','err');return;}
  toast('Firma eliminada','','ok'); renderFirmas();
}

async function guardarDatosDocente(codigo, idx){
  var ctmp  = (g('ctmp_'+idx)?.value||'').trim();
  var grado = (g('grado_'+idx)?.value||'').trim();
  var cargo = (g('cargo_'+idx)?.value||'').trim();
  var r = await apiPost({action:'guardarCtmpDocente',codigo,ctmp,gradoAcademico:grado,cargo})
    .catch(function(){return {ok:false,error:'Error de red'};});
  if(!r.ok){toast('Error al guardar',r.error||'Verifica el GAS','err');return;}
  toast('Datos del sello guardados para '+codigo,'','ok');
  renderFirmas();
}

// Mantener alias por compatibilidad
async function guardarCtmp(codigo, idx){ return guardarDatosDocente(codigo, idx); }
