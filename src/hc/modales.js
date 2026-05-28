// Modales de la app HC: selección de categoría, cálculo de edad, polling de pendientes

function abrirModalCategoria(){
  const m=g('modalCatSelect'), box=g('catSelectList');
  if(!m||!box)return;
  if(!cats.length){
    box.innerHTML='<div style="grid-column:1/-1;color:var(--tx4);font-size:13px;text-align:center;padding:12px">Sin categorías. Ejecuta inicializarHC() en el GAS primero.</div>';
    m.style.display='flex';return;
  }
  box.innerHTML=cats.map(c=>{
    const color=c.color||'#3b82f6';
    return `<div onclick="seleccionarCategoria('${esc(c.id)}','${esc(c.nombre)}')"
      style="background:${color}18;border:1.5px solid ${color}44;border-radius:12px;
             padding:14px 12px;cursor:pointer;transition:all .15s;text-align:center"
      onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='${color}44'">
      <div style="width:12px;height:12px;border-radius:50%;background:${color};margin:0 auto 8px"></div>
      <div style="font-size:12px;font-weight:700;color:var(--tx);line-height:1.3">${e2(c.nombre)}</div>
    </div>`;
  }).join('');
  m.style.display='flex';
}
function cerrarModalCategoria(){
  const m=g('modalCatSelect');if(m)m.style.display='none';
}
function seleccionarCategoria(catId, catNombre){
  cerrarModalCategoria();
  if(window._pacParaEval){
    var p=Object.assign({},window._pacParaEval,{_evalId:'',datosEspecificos:{},categoriaId:catId});
    window._pacParaEval=null;
    abrirFrmPac(p, catId, catNombre);
  } else {
    abrirFrmPac(null, catId, catNombre);
  }
}
function abrirModalCategoriaParaEval(pac){
  window._pacParaEval = pac;
  abrirModalCategoria();
}


document.addEventListener('click',function(e){var dd=g('regionDropdown');if(dd&&!dd.contains(e.target)&&e.target.id!=='regionSearch')dd.style.display='none';});

function calcularEdadAuto(){
  var fn=g('pFN'); var edadEl=g('pEdad');
  if(!fn||!edadEl||!fn.value) return;
  var hoy=new Date(); var nac=new Date(fn.value);
  if(isNaN(nac.getTime())) return;
  var a=hoy.getFullYear()-nac.getFullYear();
  var m=hoy.getMonth()-nac.getMonth();
  var dia=hoy.getDate()-nac.getDate();
  if(m<0||(m===0&&dia<0)) a--;
  var meses=((hoy.getFullYear()-nac.getFullYear())*12+(hoy.getMonth()-nac.getMonth()))+(hoy.getDate()>=nac.getDate()?0:-1);
  if(a<2){
    var mesResto=meses%12;
    edadEl.value=(meses<1?'< 1 mes':(a>0?(a+' año'+(a>1?'s':'')+(mesResto>0?' '+mesResto+' mes'+(mesResto>1?'es':''):'')):(meses+' mes'+(meses>1?'es':''))));
  } else {
    edadEl.value=a+' año'+(a>1?'s':'');
  }
}

var _pendCount=0;
function iniciarPollingPendientes(){
  if(session.rol==='estudiante') return;
  setInterval(async function(){
    try{
      var r=await apiGet('pendientesRevision').catch(function(){return {ok:false};});
      if(!r.ok) return;
      var evP=r.evaluaciones||[],sesP=r.sesiones||[];
      if(session.rol==='docente'){
        var myn=(session.nombre||'').toLowerCase(),myc=(session.codigo||'').toLowerCase();
        evP=evP.filter(function(e){
          var dn=(e.docente||'').toLowerCase(),dc=(e.docenteCodigo||'').toLowerCase();
          return dn===myn||dn===myc||dc===myc||dc===myn;
        });
        sesP=sesP.filter(function(s){
          var dn=(s.docente||'').toLowerCase(),dc=(s.docenteCodigo||'').toLowerCase();
          return dn===myn||dn===myc||dc===myc||dc===myn;
        });
      }
      var tot=evP.length+sesP.length;
      var b=g('sbBadge');
      if(b){b.textContent=tot;b.style.display=tot?'':'none';}
      if(tot>_pendCount&&_pendCount>=0){
        var nuevos=tot-_pendCount;
        toast('\uD83D\uDD14 '+nuevos+' nuevo'+(nuevos>1?'s':'')+(nuevos===1?' elemento':' elementos')+' pendiente'+(nuevos>1?'s':''),'Evalúa en la sección Pendientes','ok');
      }
      _pendCount=tot;
    }catch(e){}
  },30000);
}

// ════════════════════════════════════════════════════════════
// ─── Consentimiento Informado — funciones UI (adaptadas para GAS) ───────────
// GAS no acepta multipart → convertimos el archivo a base64 en el browser y lo mandamos como JSON

