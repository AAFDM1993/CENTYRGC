// Región anatómica y tablas ROM/Fuerza del formulario HC

function filtrarRegiones(val){
  var dd=g('regionDropdown');
  if(!val||!val.trim()){dd.style.display='none';return;}
  var v=val.toLowerCase();
  var sel=Array.from(document.querySelectorAll('#regionesWrap span[data-r]')).map(function(s){return s.getAttribute('data-r');});
  var matches=TODAS_REGIONES.filter(function(r){return r.toLowerCase().indexOf(v)!==-1;});
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map(function(r){
    var ya=sel.indexOf(r)!==-1;
    return '<div onclick="agregarRegion(\'' + encodeURIComponent(r) + '\')" style="padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:space-between'+(ya?';color:var(--tx4)':'')+'">'
      +r+(ya?' <b style=\"color:var(--n500)\">&#10003;</b>':'')+'</div>';
  }).join('');
  dd.style.display='block';
}
function agregarRegion(rEnc){
  var r=decodeURIComponent(rEnc);
  var wrap=g('regionesWrap');
  var sel=Array.from(wrap.querySelectorAll('span[data-r]')).map(function(s){return s.getAttribute('data-r');});
  if(sel.indexOf(r)===-1){
    sel.push(r);
    _renderRegWrap(wrap,sel);
    actualizarTablas();
  }
  var inp=g('regionSearch'); if(inp) inp.value='';
  var dd=g('regionDropdown'); if(dd) dd.style.display='none';
}
function quitarRegion(rEnc,evt){
  if(evt&&evt.stopPropagation) evt.stopPropagation();
  var r=decodeURIComponent(rEnc);
  var wrap=g('regionesWrap');
  var sel=Array.from(wrap.querySelectorAll('span[data-r]')).map(function(s){return s.getAttribute('data-r');}).filter(function(x){return x!==r;});
  _renderRegWrap(wrap,sel);
  actualizarTablas();
}
function _renderRegWrap(wrap,sel){
  if(!wrap) return;
  wrap.innerHTML=sel.map(function(r){
    return '<span data-r="'+r+'" style="display:inline-flex;align-items:center;gap:4px;background:var(--n500);color:#fff;border-radius:20px;padding:4px 10px 4px 12px;font-size:12px;font-weight:600">'+r+'<button type="button" onclick="quitarRegion(\'' + encodeURIComponent(r) + '\',event)" style="background:none;border:none;color:rgba(255,255,255,.75);cursor:pointer;font-size:16px;line-height:1;padding:0 0 0 2px">&#215;</button></span>';
  }).join('')+(sel.length===0?'<span style="font-size:12px;color:var(--tx4)">Sin regiones &mdash; usa el buscador</span>':'');
}
function mkRomParalelo(sel,data,tipo){
  if(!sel||!sel.length) return '<p style="text-align:center;color:var(--tx4);font-size:12px;padding:16px">Selecciona regiones afectadas</p>';
  var mapa=tipo==='fuerza'?FUERZA_GRP:ROM_MOV;
  var thMov=tipo==='fuerza'?'Grupo muscular':'Movimiento';
  var ph=tipo==='fuerza'?'0-5':'&deg;';
  var da=tipo==='fuerza'?'data-fuerza':'data-rom';
  var it=tipo==='fuerza'?'number':'text';
  var ie=tipo==='fuerza'?'min="0" max="5"':'';
  var grupos=[];
  for(var i=0;i<sel.length;i+=3) grupos.push(sel.slice(i,i+3));
  return grupos.map(function(grp){
    var movsPorReg=grp.map(function(r){return mapa[r]||[];});
    var maxM=Math.max.apply(null,movsPorReg.map(function(m){return m.length;}).concat([0]));
    var h='<table class="tbl" style="margin-bottom:12px"><thead><tr>';
    grp.forEach(function(r){h+='<th colspan="2" style="text-align:center;background:var(--n900);color:#fff;padding:7px 8px;font-size:11px;font-weight:700">'+r+'</th>';});
    h+='</tr><tr>';
    grp.forEach(function(){h+='<th style="font-size:11px;padding:5px 8px">'+thMov+'</th><th style="text-align:center;width:68px;font-size:11px;padding:5px 4px">Valor</th>';});
    h+='</tr></thead><tbody>';
    for(var ri=0;ri<maxM;ri++){
      h+='<tr>';
      grp.forEach(function(r,gi){
        var movs=movsPorReg[gi];
        if(ri<movs.length){
          var m=movs[ri]; var key=r+'_'+m;
          var val=data&&data[key]!==undefined?e2(String(data[key])):'';
          h+='<td style="font-size:12px;padding:4px 8px">'+m+'</td>';
          h+='<td style="padding:3px 4px;text-align:center"><input type="'+it+'" '+ie+' class="ri" '+da+'="'+e2(key)+'" value="'+val+'" placeholder="'+ph+'" style="width:60px;text-align:center"></td>';
        } else {
          h+='<td colspan="2" style="background:var(--surf2)"></td>';
        }
      });
      h+='</tr>';
    }
    return h+'</tbody></table>';
  }).join('');
}
function actualizarTablas(){
  var sel=Array.from(document.querySelectorAll('#regionesWrap span[data-r]')).map(function(s){return s.getAttribute('data-r');});
  var vROM={},vF={};
  document.querySelectorAll('[data-rom]').forEach(function(el){if(el.value)vROM[el.dataset.rom]=el.value;});
  document.querySelectorAll('[data-fuerza]').forEach(function(el){if(el.value)vF[el.dataset.fuerza]=el.value;});
  var rw=g('tablaROMWrap'); if(rw) rw.innerHTML=mkRomParalelo(sel,vROM,'rom');
  var fw=g('tablaFuerzaWrap'); if(fw) fw.innerHTML=mkRomParalelo(sel,vF,'fuerza');
  actualizarPruebas();
}

// ── Guardar historia clínica unificada ────────────
// que incluye la lectura de escalas:
