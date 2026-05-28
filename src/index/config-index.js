// ── config-index.js: configuración del sistema + branding ───────────────────
// Depende de: core.js (g, vi, toast, showLoader, hideLoader)
//             session.js (session)
//             api.js (apiPost, apiGetCached, invalidateCache)
// Nota: se llama config-index.js para evitar conflicto con src/hc/config.js

// ── CONFIGURACIÓN DEL SISTEMA ────────────────────────────────
async function cargarConfigSistema(){
  const n=g('cfgNombre'), ini=g('cfgIniciales');
  if(n) n.value=''; if(ini) ini.value='';
  g('cfgLogoB64').textContent='';
  g('cfgLogoPreviewBox').style.display='none';
  g('cfgResult').style.display='none';
  try{
    const r=await apiGetCached('getBranding');
    if(r.ok){
      if(n) n.value=r.nombre||'';
      if(ini) ini.value=r.iniciales||'';
      const univ=g('cfgUniv'); if(univ) univ.value=r.univ||'';
      const fac =g('cfgFac');  if(fac)  fac.value =r.fac||'';
      const esc =g('cfgEsc');  if(esc)  esc.value =r.esc||'';
      if(r.logoUrl && r.logoUrl.startsWith('data:')){
        const prev=g('cfgLogoPreview');
        if(prev){prev.src=r.logoUrl;g('cfgLogoPreviewBox').style.display='block';}
        g('cfgLogoB64').textContent=r.logoUrl;
        cfgMostrarTamano(r.logoUrl);
      }
    }
  }catch(e){console.warn('No se pudo cargar config:',e.message);}
}

function cfgHandleLogo(input){
  const file=input.files[0]; if(!file)return;
  const MAX_W=400, MAX_H=200, QUALITY=0.82, MAX_B64=45000;
  const reader=new FileReader();
  reader.onload=function(ev){
    const img=new Image();
    img.onload=function(){
      let w=img.width, h=img.height;
      const ratio=Math.min(MAX_W/w, MAX_H/h, 1);
      w=Math.round(w*ratio); h=Math.round(h*ratio);
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);

      // Detectar si la imagen tiene pixeles transparentes
      function tieneTransparencia(){
        const data=ctx.getImageData(0,0,w,h).data;
        for(let i=3;i<data.length;i+=4){ if(data[i]<255) return true; }
        return false;
      }

      let b64='';
      if(tieneTransparencia()){
        // PNG: mantiene transparencia, no tiene "calidad" ajustable
        // Si supera el limite, reducir dimensiones progresivamente
        b64=canvas.toDataURL('image/png');
        if(b64.length>MAX_B64){
          let scale=0.9;
          while(b64.length>MAX_B64 && scale>0.3){
            const c2=document.createElement('canvas');
            c2.width=Math.round(w*scale); c2.height=Math.round(h*scale);
            c2.getContext('2d').drawImage(canvas,0,0,c2.width,c2.height);
            b64=c2.toDataURL('image/png');
            scale-=0.1;
          }
        }
      } else {
        // JPEG: sin transparencia, comprimir por calidad
        let q=QUALITY;
        do { b64=canvas.toDataURL('image/jpeg',q); q-=0.05; } while(b64.length>MAX_B64 && q>0.2);
      }

      g('cfgLogoB64').textContent=b64;
      const prev=g('cfgLogoPreview');
      if(prev){prev.src=b64; g('cfgLogoPreviewBox').style.display='block';}
      cfgMostrarTamano(b64);
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

function cfgMostrarTamano(b64){
  const el=g('cfgLogoSize'); if(!el)return;
  const kb=Math.round(b64.length*0.75/1024);
  el.textContent='Tamaño aprox.: '+kb+' KB'+(kb>35?' ⚠ podría no guardarse en Sheets':'');
}

async function guardarConfigSistema(){
  const nombre=(g('cfgNombre')||{}).value||'';
  const iniciales=((g('cfgIniciales')||{}).value||'').toUpperCase();
  const logoB64=(g('cfgLogoB64')||{}).textContent||'';
  const univ=(g('cfgUniv')||{}).value||'';
  const fac =(g('cfgFac') ||{}).value||'';
  const esc =(g('cfgEsc') ||{}).value||'';
  const res=g('cfgResult');
  if(!nombre.trim()){res.style.display='block';res.style.color='var(--red)';res.textContent='El nombre es obligatorio.';return;}
  showLoader('Guardando configuración...');
  try{
    const r=await apiPost({action:'guardarBranding',nombre,iniciales,logoB64,univ,fac,esc});
    hideLoader();
    res.style.display='block';
    if(r.ok){
      invalidateCache('getBranding');
      res.style.color='var(--green)';
      res.textContent='✓ Configuración guardada. Aplicando cambios...';
      applyBranding({nombre, iniciales, logoUrl: logoB64||undefined});
    } else {
      res.style.color='var(--red)';
      res.textContent='Error: '+(r.error||'No se pudo guardar');
    }
  }catch(e){hideLoader();res.style.display='block';res.style.color='var(--red)';res.textContent='Error: '+e.message;}
}

// ── BRANDING (logo + nombre del sistema) ──────────────────────
// Cargado desde GAS via action:'getBranding'
// GAS debe retornar: { ok:true, nombre:'...', iniciales:'...', logoUrl:'...' }

function applyLogo(url){
  const show = url && url.length > 0;
  ['logoImg','logoLogin'].forEach(id=>{
    const el=g(id);if(!el)return;
    if(show){
      el.src=url;
      el.style.display='';
      el.onerror=function(){
        el.style.display='none';
        const fbId=id==='logoImg'?'logoFallback':'logoLoginFallback';
        const fb=g(fbId);if(fb)fb.style.display='';
      };
    } else {
      el.src='';el.style.display='none';
    }
  });
  ['logoFallback','logoLoginFallback'].forEach(id=>{
    const el=g(id);if(!el)return;
    el.style.display=show?'none':'';
  });
}

function applyBranding(cfg){
  if(cfg.nombre){
    document.title=cfg.nombre;
    const t=g('appTitle');if(t)t.textContent=cfg.nombre;
    ['logoImg','logoLogin'].forEach(id=>{const el=g(id);if(el)el.alt=cfg.nombre;});
    window._brandingNombre=cfg.nombre;
  }
  if(cfg.iniciales){
    ['logoInitials','logoInitialsHdr'].forEach(id=>{const el=g(id);if(el)el.textContent=cfg.iniciales;});
    window._brandingIniciales=cfg.iniciales;
  }
  if(cfg.logoUrl){applyLogo(cfg.logoUrl);window._brandingLogoUrl=cfg.logoUrl;}
  // Actualizar campos inst en el panel si están disponibles en DOM
  if(cfg.univ!==undefined){const e=g('cfgUniv');if(e)e.value=cfg.univ;}
  if(cfg.fac!==undefined) {const e=g('cfgFac'); if(e)e.value=cfg.fac;}
  if(cfg.esc!==undefined) {const e=g('cfgEsc'); if(e)e.value=cfg.esc;}
}

// Cargar branding desde GAS al iniciar la página
(async function initBranding(){
  try{
    const r=await fetch(GAS_URL+'?'+new URLSearchParams({action:'getBranding'}));
    if(r.ok){const data=await r.json();if(data.ok)applyBranding(data);}
  }catch(e){console.warn('Branding no disponible:',e.message);}
})();

