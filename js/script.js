// ensure window.scrollY accessor always exists (defensive)
if(typeof window.scrollY!=='number'){try{Object.defineProperty(window,'scrollY',{configurable:true,get:function(){return document.documentElement.scrollTop||document.body.scrollTop||0;}});}catch(e){}}

// nav scroll state
const nav=document.getElementById('nav');
addEventListener('scroll',()=>{nav.classList.toggle('scrolled',scrollY>40)},{passive:true});

// curtain: while the statement covers the pinned hero, the hero drifts up and recedes slightly
const curtainHero=document.querySelector('.curtain>.hero-cards');
if(curtainHero&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  let ticking=false;
  const pops=[...document.querySelectorAll('.curtain .pop')];
  const clamp01=v=>Math.min(Math.max(v,0),1);
  const drift=()=>{
    ticking=false;
    const p=clamp01(scrollY/innerHeight);
    curtainHero.style.transform=p?`translate3d(0,${-p*6}vh,0) scale(${1-p*.05})`:'';
    // the people climb out of their photos once scrolling starts, staggered left then right
    pops.forEach((el,i)=>{
      const t=clamp01((p-.06-i*.08)/.45);
      el.style.setProperty('--rise',(1-Math.pow(1-t,3)).toFixed(4));
    });
  };
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(drift)}},{passive:true});
  drift();
}

// section transitions: as the next sheet slides over a section, its content recedes (--cover 0 -> 1, styled in CSS)
const receders=[...document.querySelectorAll('[data-recede]')];
if(receders.length&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  let queued=false;
  const recede=()=>{
    queued=false;
    const vh=innerHeight;
    receders.forEach(el=>{
      const b=el.getBoundingClientRect().bottom;
      const q=Math.min(Math.max((vh-b)/vh,0),1);
      if(q!==el._cover){el._cover=q;el.style.setProperty('--cover',q.toFixed(4))}
    });
  };
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(recede)}},{passive:true});
  addEventListener('resize',recede);
  recede();
}

// mobile menu: toggle the links sheet; close it on link tap or Escape
const menuBtn=nav.querySelector('.menu-toggle');
function setMenu(open){
  nav.classList.toggle('menu-open',open);
  menuBtn.setAttribute('aria-expanded',open);
  menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
  if(open)nav.classList.add('scrolled');else nav.classList.toggle('scrolled',scrollY>40);
}
menuBtn.addEventListener('click',()=>setMenu(!nav.classList.contains('menu-open')));
nav.querySelectorAll('nav.links a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});

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
let revealQueued=false;
const queueReveal=()=>{if(!revealQueued){revealQueued=true;requestAnimationFrame(()=>{revealQueued=false;checkReveal()})}};
addEventListener('scroll',queueReveal,{passive:true});
addEventListener('resize',queueReveal);
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

// passion-text footage tiles: play only while on screen (posters stand in under reduced motion)
(function(){
  const tiles=[...document.querySelectorAll('video[data-tile]')];
  if(!tiles.length||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const io=new IntersectionObserver(entries=>entries.forEach(({target:v,isIntersecting})=>{
    if(isIntersecting){v.preload='auto';v.play().catch(()=>{})}else v.pause();
  }),{rootMargin:'200px 0px'});
  tiles.forEach(v=>io.observe(v));
})();

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
  // Parallax — written to `translate`, not `transform`, so it never fights the reveal tween
  // (or CSS transforms like the contact glow's scale) on the same element. Read all, then write.
  const offsets=parallaxEls.map(el=>(el.getBoundingClientRect().top-vh/2)*(parseFloat(el.dataset.parallax)||0.2));
  parallaxEls.forEach((el,i)=>{el.style.translate=`0 ${offsets[i].toFixed(1)}px`});
}
const parallaxEls=[...document.querySelectorAll('[data-parallax]')];
let motionQueued=false;
const queueMotion=()=>{if(!motionQueued){motionQueued=true;requestAnimationFrame(()=>{motionQueued=false;checkMotion()})}};
addEventListener('scroll',queueMotion,{passive:true});
addEventListener('resize',queueMotion);
checkMotion();
setTimeout(checkMotion,100);

// === EDITORIAL HERO — ambient background-gradient parallax ===
(function(){
  const grad=document.querySelector('.ed-grad');
  if(!grad)return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let mx=0,my=0,tmx=0,tmy=0,sy=0;
  addEventListener('mousemove',e=>{mx=e.clientX/innerWidth-0.5;my=e.clientY/innerHeight-0.5;},{passive:true});
  addEventListener('scroll',()=>{sy=scrollY;},{passive:true});
  function frame(){
    tmx+=(mx-tmx)*0.06; tmy+=(my-tmy)*0.06;
    if(!reduce) grad.style.transform=`translate(${(-tmx*26).toFixed(1)}px, ${(-tmy*18 - sy*0.12).toFixed(1)}px)`;
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
      // off-screen: skip the write so the blurred glass tile isn't repainted every frame
      if(shown>=1 && (r.bottom<0 || r.top>innerHeight)){requestAnimationFrame(loop);return;}
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

// contact picker: the chosen answers become a one-line brief that prefills the Calendly booking
// (as the first custom question, a1) and the WhatsApp message. Calendly only loads on "Book".
(function(){
  const form=document.getElementById('brief');
  if(!form)return;
  const summary=document.getElementById('briefSummary');
  const waLink=document.getElementById('briefWa');
  const bookBtn=document.getElementById('briefBook');
  const WA='https://wa.me/212600276312';
  const CAL='https://calendly.com/contact-ecoframesvision/30min?hide_gdpr_banner=1&background_color=f7f2eb&text_color=262820&primary_color=5d6a45';
  const pick=name=>form.querySelector(`input[name="${name}"]:checked`);

  function brief(){
    const [what,when,where]=['what','when','where'].map(pick);
    const labels=[what,when,where].filter(Boolean).map(i=>i.value);
    const sentence=`I'm planning ${what?what.dataset.say:'a project'}`+
      (when?` ${when.dataset.say}`:'')+(where?`, ${where.dataset.say}`:'')+'.';
    return {labels,sentence};
  }
  function update(){
    const {labels,sentence}=brief();
    summary.textContent=labels.length?labels.join(' · '):'Pick what fits — or skip straight to a call.';
    waLink.href=`${WA}?text=${encodeURIComponent(`Hi EcoFrames! ${sentence} Could we talk about it?`)}`;
  }
  form.addEventListener('change',update);
  update();

  // load Calendly's popup widget once, the first time someone shows intent to book
  let calendly;
  function loadCalendly(){
    if(calendly)return calendly;
    const css=document.createElement('link');
    css.rel='stylesheet';css.href='https://assets.calendly.com/assets/external/widget.css';
    document.head.appendChild(css);
    calendly=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://assets.calendly.com/assets/external/widget.js';s.async=true;
      s.onload=()=>window.Calendly?resolve(window.Calendly):reject();
      s.onerror=reject;
      document.head.appendChild(s);
    });
    return calendly;
  }
  bookBtn.addEventListener('pointerenter',loadCalendly,{once:true});
  bookBtn.addEventListener('focus',loadCalendly,{once:true});
  bookBtn.addEventListener('click',()=>{
    const url=`${CAL}&a1=${encodeURIComponent(brief().sentence)}`;
    loadCalendly().then(C=>C.initPopupWidget({url})).catch(()=>window.open(url,'_blank','noopener'));
  });
})();
