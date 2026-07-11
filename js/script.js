// ensure window.scrollY accessor always exists (defensive)
if(typeof window.scrollY!=='number'){try{Object.defineProperty(window,'scrollY',{configurable:true,get:function(){return document.documentElement.scrollTop||document.body.scrollTop||0;}});}catch(e){}}

// nav scroll state
const nav=document.getElementById('nav');
addEventListener('scroll',()=>{nav.classList.toggle('scrolled',scrollY>40)},{passive:true});

// reveal — JS rAF tween (works even when CSS animation/transition timeline is throttled)
const reveals=[...document.querySelectorAll('[data-reveal]')];
const prefersReduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function animateIn(el){
  if(el._rev)return;el._rev=true;
  el.style.transition='none';
  if(prefersReduce){el.style.opacity='1';el.style.transform='none';return;}
  const delay=(parseInt(el.dataset.d)||0)*95;
  const dur=820;const start=performance.now()+delay;
  function frame(now){
    let p=(now-start)/dur;
    if(p<0){requestAnimationFrame(frame);return;}
    if(p>1)p=1;
    const e=1-Math.pow(1-p,3);
    el.style.opacity=String(e);
    el.style.transform='translateY('+(32*(1-e)).toFixed(2)+'px)';
    if(p<1)requestAnimationFrame(frame);else el.style.transform='none';
  }
  requestAnimationFrame(frame);
}
function checkReveal(){
  const vh=innerHeight||document.documentElement.clientHeight;
  for(let i=reveals.length-1;i>=0;i--){
    const el=reveals[i];const r=el.getBoundingClientRect();
    if(r.top<vh*0.9 && r.bottom>0){animateIn(el);reveals.splice(i,1);}
  }
}
addEventListener('scroll',checkReveal,{passive:true});
addEventListener('resize',checkReveal);
checkReveal();
// failsafe: force-reveal anything still hidden after 2.6s
setTimeout(()=>{document.querySelectorAll('[data-reveal]').forEach(el=>{if(!el._rev){el._rev=true;el.style.transition='none';el.style.opacity='1';el.style.transform='none';}});},2600);

// hero timecode (vanity)
const tc=document.getElementById('tcode');
const t0tc=performance.now();
function tick(now){
  if(!tc)return;
  const tt=(now-t0tc)/1000;
  const ff=Math.floor((tt*24)%24), s=Math.floor(tt)%60, m=Math.floor(tt/60)%60, h=Math.floor(tt/3600)%24;
  const p=n=>String(n).padStart(2,'0');
  tc.textContent=`${p(h)}:${p(m)}:${p(s)}:${p(ff)}`;
  requestAnimationFrame(tick);
}
if(tc)requestAnimationFrame(tick);

// lightbox for work pieces
const lb=document.getElementById('lb'),lbx=document.getElementById('lbx');
const lbCat=document.getElementById('lbCat'),lbTitle=document.getElementById('lbTitle'),lbDesc=document.getElementById('lbDesc');
document.querySelectorAll('.piece').forEach(p=>{
  const openBtn=p.querySelector('.open');
  if(!openBtn)return;
  openBtn.addEventListener('click',(ev)=>{
    ev.stopPropagation();
    lbCat.textContent=p.dataset.cat||'';
    lbTitle.textContent=p.querySelector('.pt').textContent;
    lbDesc.textContent=p.dataset.desc||'';
    lb.classList.add('on');
  });
});
const closeLb=()=>lb.classList.remove('on');
lbx.addEventListener('click',closeLb);
lb.addEventListener('click',e=>{if(e.target===lb)closeLb()});
addEventListener('keydown',e=>{if(e.key==='Escape')closeLb()});

// work-grid video pieces — click cover to swap in the real <source> and play
document.querySelectorAll('.piece.video').forEach(piece=>{
  const cover=piece.querySelector('.vid-cover');
  const video=piece.querySelector('.vid-wrap video');
  if(!cover||!video)return;
  cover.addEventListener('click',()=>{
    cover.classList.add('hidden');
    const source=video.querySelector('source');
    if(source && source.dataset.src && !source.getAttribute('src')){
      source.setAttribute('src',source.dataset.src);
      video.load();
    }
    video.muted=false;
    video.play().catch(()=>{});
  });
});

// showreel player (hero play button)
const reelEl=document.getElementById('reel'),reelVideo=document.getElementById('reelVideo'),
      reelX=document.getElementById('reelX'),reelStage=document.getElementById('reelStage');
function openReel(){
  reelEl.classList.add('on');
  reelStage.classList.remove('pop');void reelStage.offsetWidth;reelStage.classList.add('pop');
  reelVideo.currentTime=0;
  reelVideo.play().catch(()=>{});
}
function closeReel(){reelEl.classList.remove('on');reelVideo.pause();}
const playReelBtn=document.getElementById('playReel');
if(playReelBtn)playReelBtn.addEventListener('click',openReel);
reelX.addEventListener('click',closeReel);
reelEl.addEventListener('click',e=>{if(e.target===reelEl)closeReel();});
addEventListener('keydown',e=>{if(e.key==='Escape')closeReel();});

// === SCROLL MOTION ENGINE ===
// Parallax elements
document.querySelectorAll('.about-media').forEach(el=>el.setAttribute('data-parallax','0.15'));
document.querySelectorAll('.glow').forEach(el=>el.setAttribute('data-parallax','0.2'));

// Scroll-triggered class animations
const motionEls=[
  ...document.querySelectorAll('.svc'),
  ...document.querySelectorAll('.piece'),
  ...document.querySelectorAll('.stat'),
  ...document.querySelectorAll('.photo-grid .ph-item'),
  ...document.querySelectorAll('.founder-grid'),
  ...document.querySelectorAll('.marquee'),
  ...document.querySelectorAll('section.contact'),
  ...document.querySelectorAll('.sec-title'),
  ...document.querySelectorAll('.about')
];

// Counter animation for stats
function animateCounter(el){
  if(el._counted)return;el._counted=true;
  const numEl=el.querySelector('.num');
  if(!numEl)return;
  const text=numEl.textContent;
  const match=text.match(/(\d+)/);
  if(!match)return;
  const target=parseInt(match[1]);
  const dur=1200;const start=performance.now();
  function tick(now){
    let p=Math.min((now-start)/dur,1);
    p=1-Math.pow(1-p,3);
    const val=Math.round(target*p);
    numEl.innerHTML=text.replace(match[1],val);
    if(p<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function checkMotion(){
  const vh=innerHeight;
  motionEls.forEach((el)=>{
    const r=el.getBoundingClientRect();
    if(r.top<vh*0.88 && r.bottom>0 && !el.classList.contains('in')){
      const stagger=el.closest('.svc-list,.gal,.stats,.photo-grid,.founder')?
        Array.from(el.parentElement.children).indexOf(el)*100:0;
      setTimeout(()=>{
        el.classList.add('in');
        if(el.classList.contains('about'))el.classList.add('in-view');
      },stagger);
    }
  });
  // Counter animation for stats in view
  document.querySelectorAll('.stat.in').forEach(animateCounter);
  // Parallax
  document.querySelectorAll('[data-parallax]').forEach(el=>{
    const r=el.getBoundingClientRect();
    const speed=parseFloat(el.dataset.parallax)||0.2;
    const offset=(r.top-vh/2)*speed;
    el.style.transform=`translateY(${offset.toFixed(1)}px)`;
  });
}
addEventListener('scroll',checkMotion,{passive:true});
addEventListener('resize',checkMotion);
checkMotion();
setTimeout(checkMotion,100);

// === EDITORIAL HERO — mouse parallax + scroll motion ===
(function(){
  const big=document.querySelector('.ed-bigtype');
  const grad=document.querySelector('.ed-grad');
  const playEl=document.querySelector('.ed-play');
  if(!big)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let mx=0,my=0,tmx=0,tmy=0,sy=0;
  addEventListener('mousemove',e=>{mx=e.clientX/innerWidth-0.5;my=e.clientY/innerHeight-0.5;},{passive:true});
  addEventListener('scroll',()=>{sy=scrollY;},{passive:true});
  const t0=performance.now();
  function frame(now){
    tmx+=(mx-tmx)*0.06; tmy+=(my-tmy)*0.06;
    const t=(now-t0)/1000;
    const floatY=reduce?0:Math.sin(t*0.8)*9;
    const px=reduce?0:tmx*70, py=reduce?0:tmy*44;
    const par=Math.min(sy,900)*0.28;          // scroll parallax (drifts down)
    big.style.transform=`translate(calc(-50% + ${px.toFixed(1)}px), calc(-54% + ${(py+floatY+par).toFixed(1)}px))`;
    // opacity is owned by the particle-disintegration loop below
    if(grad)grad.style.transform=`translate(${(-tmx*26).toFixed(1)}px, ${(-tmy*18 - sy*0.12).toFixed(1)}px)`;
    if(playEl)playEl.style.transform=`translate(${(tmx*-30).toFixed(1)}px, ${(tmy*-22).toFixed(1)}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// === STAT TILES — high-motion 3D tilt + idle float + scale-in ===
(function(){
  const stats=[...document.querySelectorAll('.about .stat')];
  if(!stats.length)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  stats.forEach((s,i)=>{
    s._rev=true;                 // take over from the generic reveal
    s.style.opacity='0';
    let rx=0,ry=0,trx=0,tryv=0,thov=0,hov=0,shown=0;
    s.addEventListener('pointermove',e=>{
      const r=s.getBoundingClientRect();
      ry=(e.clientX-r.left)/r.width-0.5;
      rx=(e.clientY-r.top)/r.height-0.5;
      thov=1;
    });
    s.addEventListener('pointerleave',()=>{thov=0;rx=0;ry=0;});
    const t0=performance.now()+i*220;
    function loop(now){
      const r=s.getBoundingClientRect();
      if(r.top<innerHeight*0.92) shown=Math.min(1,shown+0.05);
      trx+=(rx-trx)*0.12; tryv+=(ry-tryv)*0.12; hov+=(thov-hov)*0.1;
      const t=(now-t0)/1000;
      const ease=1-Math.pow(1-shown,3);
      const floatY=reduce?0:Math.sin(t*1.1+i)*5*(1-hov);
      const inY=(1-ease)*38;
      const tilt=reduce?0:14*hov;
      const sc=(0.86+0.14*ease)*(1+0.05*hov);
      s.style.opacity=ease.toFixed(3);
      s.style.transform=
        `perspective(720px) translateY(${(inY+floatY-12*hov).toFixed(1)}px) `+
        `scale(${sc.toFixed(3)}) rotateX(${(-trx*tilt).toFixed(2)}deg) rotateY(${(tryv*tilt).toFixed(2)}deg)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
})();

// === HERO HEADLINE TYPING (overline fades in via data-reveal) ===
(function(){
  const h1=document.querySelector('.ed-over h1');
  if(!h1) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){ h1.classList.add('typed'); return; }
  const chars=[];
  (function wrap(node){
    [...node.childNodes].forEach(n=>{
      if(n.nodeType===3){
        const frag=document.createDocumentFragment();
        for(const ch of n.nodeValue){
          const s=document.createElement('span'); s.className='tych'; s.textContent=ch;
          frag.appendChild(s); chars.push(s);
        }
        node.replaceChild(frag,n);
      } else if(n.nodeType===1){ wrap(n); }
    });
  })(h1);
  const caret=document.createElement('span'); caret.className='tycaret';
  function type(){
    h1.appendChild(caret);
    let i=0;
    (function step(){
      if(i>=chars.length){ setTimeout(()=>{ caret.style.transition='opacity .5s'; caret.style.opacity='0'; },1400); return; }
      const c=chars[i]; c.style.opacity='1';
      if(c.nextSibling) c.parentNode.insertBefore(caret,c.nextSibling); else c.parentNode.appendChild(caret);
      i++; setTimeout(step,48);
    })();
  }
  setTimeout(type,800); // begin after the overline fade-in
})();

// === FRAME — scroll-triggered particle disintegration ===
(function(){
  const hero=document.getElementById('top');
  const bigtype=document.querySelector('.ed-bigtype');
  const canvas=document.getElementById('frameParticles');
  if(!hero||!bigtype||!canvas) return;
  const ctx=canvas.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const STOPS=[[0,'#E11D48'],[0.22,'#f43068'],[0.46,'#8B5CF6'],[0.62,'#c4b5fd'],[0.86,'#E11D48'],[1,'#f43068']];
  let dpr=Math.min(2,window.devicePixelRatio||1);
  let W=0,H=0,particles=[],rawP=0,built=false;

  function easeInOut(p){return p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;}

  function build(){
    W=hero.clientWidth; H=hero.clientHeight;
    if(!W||!H) return;
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const rect=bigtype.getBoundingClientRect();
    const hRect=hero.getBoundingClientRect();
    const x0=rect.left-hRect.left;
    const cy=rect.top-hRect.top+rect.height/2;
    const cs=getComputedStyle(bigtype);
    const fontPx=parseFloat(cs.fontSize)||300;
    const oc=document.createElement('canvas');
    oc.width=W; oc.height=H;
    const octx=oc.getContext('2d');
    octx.font=`800 ${fontPx}px "Bricolage Grotesque", sans-serif`;
    octx.textAlign='left'; octx.textBaseline='middle';
    try{ if('letterSpacing' in octx) octx.letterSpacing=cs.letterSpacing; }catch(e){}
    const tw=octx.measureText('FRAME').width;
    const grad=octx.createLinearGradient(x0,0,x0+tw,0);
    STOPS.forEach(s=>grad.addColorStop(s[0],s[1]));
    octx.fillStyle=grad;
    octx.fillText('FRAME',x0,cy);
    const img=octx.getImageData(0,0,W,H).data;
    const diag=Math.hypot(W,H);
    const step=Math.max(4,Math.round(fontPx/60));
    const base=step*0.64;
    const list=[];
    for(let y=0;y<H;y+=step){
      for(let x=0;x<W;x+=step){
        const idx=(y*W+x)*4;
        const a=img[idx+3];
        if(a<40) continue;
        const ang=Math.random()*Math.PI*2;
        list.push({
          hx:x+(Math.random()-0.5)*step,
          hy:y+(Math.random()-0.5)*step,
          col:`rgb(${img[idx]},${img[idx+1]},${img[idx+2]})`,
          baseA:Math.min(1,a/255)*(0.78+Math.random()*0.22),
          ang,
          dist:diag*(0.12+Math.random()*Math.random()*0.62),
          z:-0.6+Math.random()*2.0,
          size:base*(0.7+Math.random()*0.8),
          df:0.5+Math.random()*1.4,
          dp:Math.random()*Math.PI*2,
          da:reduce?0:(3+Math.random()*7)
        });
      }
    }
    particles=list;
    built=true;
  }

  function onScroll(){
    const h=hero.offsetHeight||1;
    rawP=Math.max(0,Math.min(1,window.scrollY/(h*0.62)));
  }

  function frame(now){
    const t=now/1000;
    const raw=rawP;
    const pe=easeInOut(raw);
    bigtype.style.opacity=Math.max(0,Math.min(1,1-raw/0.42)).toFixed(3);
    const layerA=Math.max(0,Math.min(1,raw/0.04));
    ctx.clearRect(0,0,W,H);
    if(built && layerA>0){
      for(let i=0;i<particles.length;i++){
        const p=particles[i];
        const spread=p.dist*pe;
        const dx=Math.cos(p.ang)*spread + Math.sin(t*p.df+p.dp)*p.da*(0.5+pe);
        const dy=Math.sin(p.ang)*spread + Math.cos(t*p.df*0.9+p.dp)*p.da*(0.5+pe);
        const scale=Math.max(0.18,1+p.z*pe);
        const a=p.baseA*(1-0.62*pe)*layerA;
        if(a<0.012) continue;
        const s=p.size*scale;
        ctx.globalAlpha=a;
        ctx.fillStyle=p.col;
        ctx.fillRect(p.hx+dx-s*0.5, p.hy+dy-s*0.5, s, s);
      }
      ctx.globalAlpha=1;
    }
    requestAnimationFrame(frame);
  }

  let rt;
  function rebuild(){ clearTimeout(rt); rt=setTimeout(()=>{ dpr=Math.min(2,window.devicePixelRatio||1); build(); },180); }

  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',rebuild);
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{
    build(); onScroll(); requestAnimationFrame(frame);
  });
})();

// === SCATTERED WORK SHOWCASE — reveal choreography + video modal ===
(function(){
  const stage=document.querySelector('.scatter-work');
  if(!stage) return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

  // reveal: topbar -> pill -> cards (back of pile first) -> headline -> hint
  const topbar=stage.querySelector('[data-scatter="topbar"]');
  const pill=stage.querySelector('[data-scatter="pill"]');
  const headline=stage.querySelector('[data-scatter="headline"]');
  const hint=stage.querySelector('[data-scatter="hint"]');
  const cards=[...stage.querySelectorAll('.scatter-card')].sort(
    (a,b)=>parseInt(a.dataset.z)-parseInt(b.dataset.z)
  ); // back-of-pile (lowest z) reveals first

  let played=false;
  function playReveal(){
    if(played) return; played=true;
    if(reduce){
      [topbar,pill,...cards,headline,hint].forEach(el=>el&&el.classList.add('in'));
      return;
    }
    const seq=[topbar,pill,...cards,headline,hint].filter(Boolean);
    seq.forEach((el,i)=>setTimeout(()=>el.classList.add('in'), i<2?i*140:280+(i-2)*90));
  }
  function checkStage(){
    const r=stage.getBoundingClientRect();
    if(r.top<innerHeight*0.8 && r.bottom>0) playReveal();
  }
  addEventListener('scroll',checkStage,{passive:true});
  addEventListener('resize',checkStage);
  checkStage();

  // video modal — one <video> reused for every card
  const modal=document.getElementById('scatterModal');
  const modalVideo=document.getElementById('scatterModalVideo');
  const modalTitle=document.getElementById('scatterModalTitle');
  const modalCat=document.getElementById('scatterModalCat');
  const modalClose=document.getElementById('scatterModalClose');

  function openScatterModal(btn){
    const src=btn.dataset.video, type=btn.dataset.videoType||'video/mp4';
    modalVideo.innerHTML=`<source src="${src}" type="${type}">`;
    modalVideo.load();
    modalTitle.textContent=btn.dataset.title||'';
    modalCat.textContent=btn.dataset.cat||'';
    modal.classList.add('on');
    modalVideo.play().catch(()=>{});
  }
  function closeScatterModal(){
    modal.classList.remove('on');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.innerHTML='';
  }
  stage.querySelectorAll('.scatter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openScatterModal(btn));
  });
  modalClose.addEventListener('click',closeScatterModal);
  modal.addEventListener('click',e=>{if(e.target===modal) closeScatterModal();});
  addEventListener('keydown',e=>{if(e.key==='Escape' && modal.classList.contains('on')) closeScatterModal();});

  // cursor parallax — cards nearer the front of the pile (higher data-z)
  // drift further, giving the pile a subtle sense of depth as the pointer
  // moves. Desktop pointer only; skipped entirely under reduced-motion.
  if(!reduce && matchMedia('(pointer:fine)').matches){
    const stageEl=stage.querySelector('.scatter-stage');
    if(stageEl){
      let tx=0,ty=0,cx=0,cy=0,raf=null;
      const btns=cards.map(c=>({btn:c.querySelector('.scatter-btn'),depth:(parseInt(c.dataset.z)||20)/45}));
      function tick(){
        cx+=(tx-cx)*0.08; cy+=(ty-cy)*0.08;
        btns.forEach(({btn,depth})=>{
          if(!btn) return;
          btn.style.setProperty('--px',(cx*10*depth).toFixed(2)+'px');
          btn.style.setProperty('--py',(cy*8*depth).toFixed(2)+'px');
        });
        raf=(Math.abs(tx-cx)>0.001||Math.abs(ty-cy)>0.001)?requestAnimationFrame(tick):null;
      }
      stageEl.addEventListener('mousemove',e=>{
        const r=stageEl.getBoundingClientRect();
        tx=((e.clientX-r.left)/r.width-0.5)*2;
        ty=((e.clientY-r.top)/r.height-0.5)*2;
        if(!raf) raf=requestAnimationFrame(tick);
      },{passive:true});
      stageEl.addEventListener('mouseleave',()=>{
        tx=0; ty=0;
        if(!raf) raf=requestAnimationFrame(tick);
      },{passive:true});
    }
  }
})();

// === PHOTOGRAPHY GALLERY CAROUSEL — center-card focus + arrow nav ===
(function(){
  const track=document.getElementById('gcarTrack');
  if(!track) return;
  const cards=[...track.querySelectorAll('.gcar-card')];
  const prevBtn=document.querySelector('.gcar-prev');
  const nextBtn=document.querySelector('.gcar-next');

  // "which card is centered" — shrink the observer's root to a vertical
  // sliver down the middle of the track, so only the card crossing that
  // line ever counts as intersecting.
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      entry.target.classList.toggle('is-active', entry.isIntersecting);
    });
  },{root:track,rootMargin:'0px -50% 0px -50%',threshold:0});
  cards.forEach(c=>io.observe(c));

  function scrollByCard(dir){
    const card=cards[0];
    if(!card) return;
    const amount=(card.getBoundingClientRect().width+16)*dir;
    track.scrollBy({left:amount,behavior:'smooth'});
  }
  prevBtn&&prevBtn.addEventListener('click',()=>scrollByCard(-1));
  nextBtn&&nextBtn.addEventListener('click',()=>scrollByCard(1));
})();
