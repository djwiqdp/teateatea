// 데이터: 파일/경로/이름은 기존 그대로 유지 (특히 ":img/...") 
const DATA = [
  {
    id:"tp-001", title:"Twinings Earl Grey Tin", brand:"Twinings",
    year:"1970s", era:"Vintage", origin:"UK",
    material:["Tin"], form:"Tin Box",
    image:":img/tp-001-front.jpg",
    note:"틴의 재사용성과 헤리티지 타이포"
  },
  {
    id:"tp-002", title:"MUJI Green Tea Pouch", brand:"MUJI",
    year:"2010s", era:"2010s", origin:"JP",
    material:["Paper","Foil"], form:"Stand Pouch",
    image:":img/tp-002-front.jpg",
    note:"미니멀 라벨과 기능성 파우치 사용"
  },
  {
    id:"tp-003", title:"Paper Tube Sencha", brand:"Generic",
    year:"2020s", era:"2020s", origin:"KR",
    material:["Paper"], form:"Tube",
    image:":img/tp-003-front.png",
    note:"원형 종이 튜브의 선물용 보편화 시작"
  },
  {
    id:"tp-004", title:"Glass Jar Loose Leaf", brand:"Local Tea",
    year:"1990s", era:"1990s", origin:"FR",
    material:["Glass","Metal"], form:"Jar",
    image:":img/tp-004-front.jpg",
    note:"내용물 가시성이 높은 유리 보틀"
  }
];

const state = { filters: {} };

const $gallery = document.getElementById('gallery');
const $sheet = document.getElementById('sheet'); // 유지(미사용)
const $sheetClose = document.getElementById('sheetClose'); // 유지(미사용)
const $filters = document.getElementById('filters');

/* =========================
 * Chromatic Wash (avg color)
 * ========================= */
function dominantColorFromImage(img){
  try{
    const c=document.createElement('canvas'), w=40, h=40;
    c.width=w; c.height=h;
    const ctx=c.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data;
    let r=0,g=0,b=0,n=0;
    for(let i=0;i<d.length;i+=4){
      const a=d[i+3]; if(a<200) continue; // 투명/하이라이트 제외
      r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++;
    }
    if(n===0) return '#0a0a0a';
    r=Math.round(r/n); g=Math.round(g/n); b=Math.round(b/n);
    return `rgb(${r},${g},${b})`;
  }catch(_){
    return '#0a0a0a';
  }
}

/* =========================
 * Util: seeded pseudo-random
 * ========================= */
function mulberry32(seed){
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ===== Inline Description: 생성/토글 ===== */
function toggleDesc(fig, item){
  // 다른 열림들 닫기
  document.querySelectorAll('.item.open').forEach(el=>{
    if(el!==fig) collapseDesc(el);
  });

  if(fig.classList.contains('open')){
    collapseDesc(fig);
    return;
  }
  expandDesc(fig, item);
}

function expandDesc(fig, item){
  fig.classList.add('open');

  // desc 노드 없으면 생성
  let desc = fig.querySelector('.desc');
  if(!desc){
    desc = document.createElement('div');
    desc.className = 'desc';
    desc.innerHTML = `<p class="desc__text"><span class="desc__en"></span><span class="desc__sep"> — </span><span class="desc__ko"></span></p>`;
    fig.appendChild(desc);
  }

  // 텍스트(영문: 메타 요약 / 한글: note)
  const en = `${item.title}. ${item.brand} · ${item.year} · ${item.form} · ${item.origin}`;
  const ko = item.note || '';

  const enSpan = desc.querySelector('.desc__en');
  const koSpan = desc.querySelector('.desc__ko');
  const sepSpan = desc.querySelector('.desc__sep');

  // 텍스트를 즉시 세팅하고 "블렌드-인" 애니만 수행
  enSpan.textContent = en;
  koSpan.textContent = ` ${ko}`;
  sepSpan.style.visibility = 'visible';

  // 높이 전환: 실제 높이를 측정하여 max-height 부여
  desc.style.maxHeight = '0px';
  desc.style.opacity = '0';
  requestAnimationFrame(()=>{
    // 애니 중 넘치지 않도록 충분한 높이 확보 후 실제 높이로 스냅
    desc.style.maxHeight = '360px';
    desc.style.opacity = '1';

    // 텍스트에 잉크 퍼지듯 합쳐지는 애니메이션 클래스 부여
    const textEl = desc.querySelector('.desc__text');
    textEl.classList.remove('mix-in'); // 재실행 대비
    void textEl.offsetWidth;           // reflow로 애니 초기화
    textEl.classList.add('mix-in');

    autoHeight(desc);
  });

  // Chromatic Wash 유지
  const img = fig.querySelector('img');
  const setWash = (el)=> document.documentElement.style.setProperty('--wash', dominantColorFromImage(el));
  if(img.complete) setWash(img); else img.addEventListener('load', ()=> setWash(img), { once:true });
}

function collapseDesc(fig){
  const desc = fig.querySelector('.desc');
  if(!desc){ fig.classList.remove('open'); return; }

  // 현재 높이를 픽셀로 고정 → 0으로 애니
  const h = desc.scrollHeight;
  desc.style.maxHeight = h + 'px';
  requestAnimationFrame(()=>{
    desc.style.maxHeight = '0px';
    desc.style.opacity = '0';
  });

  setTimeout(()=>{
    fig.classList.remove('open');
  }, 400);
}

function autoHeight(el){
  const h = el.scrollHeight;
  el.style.maxHeight = h + 'px';
}

/* ===== 렌더 ===== */
function render() {
  const list = DATA.filter(matchFilter);
  $gallery.innerHTML = "";

  let baseDelay = 0;
  const useLab = document.body.classList.contains('grid-lab');

  list.forEach((item, idx) => {
    const fig = document.createElement('figure');
    fig.className = "item";
    fig.setAttribute('data-seq', String(idx+1).padStart(2,'0')); // Contact Sheet 넘버

    // Experimental Grid 변수: 기본은 "0" (기울임 없음),
    // grid-lab가 켜져 있을 때만 랜덤 오프셋/기울임 적용
    if(useLab){
      const rand = mulberry32(idx + 12345);
      const rot = (rand()*6 - 3).toFixed(2) + 'deg';         // -3° ~ 3°
      const skew = (rand()*4 - 2).toFixed(2) + 'deg';        // -2° ~ 2°
      const y = Math.round((rand()*24 - 12));                // -12 ~ 12 px
      fig.style.setProperty('--rot', rot);
      fig.style.setProperty('--skew', skew);
      fig.style.setProperty('--y', y + 'px');
    }else{
      fig.style.setProperty('--rot', '0deg');
      fig.style.setProperty('--skew', '0deg');
      fig.style.setProperty('--y', '0px');
    }

    // reveal 애니메이션 딜레이
    fig.style.animationDelay = (baseDelay + (idx%6)*0.04).toFixed(2) + 's';

    fig.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy" />
      <figcaption class="caption">
        <span class="t">${item.title}</span>
        <span class="m">${item.brand} · ${item.year}</span>
      </figcaption>
      <div class="desc" aria-live="polite">
        <p class="desc__text">
          <span class="desc__en"></span><span class="desc__sep"> — </span><span class="desc__ko"></span>
        </p>
      </div>
    `;

    // 클릭: 모달 대신 inline 설명 토글
    fig.addEventListener('click', () => toggleDesc(fig, item));

    // Chromatic Wash: hover 시 평균색으로 배경 물들이기
    fig.addEventListener('mouseenter', () => {
      const img = fig.querySelector('img');
      const set = (el) => {
        const col = dominantColorFromImage(el);
        document.documentElement.style.setProperty('--wash', col);
      };
      if (img.complete) set(img);
      else img.addEventListener('load', () => set(img), { once:true });
    });
    fig.addEventListener('mouseleave', () => {
      document.documentElement.style.setProperty('--wash', '#0a0a0a');
    });

    $gallery.appendChild(fig);
  });

  observeReveal();
}

/* ===== Intersection Observer: in-view 보정 ===== */
let io;
function observeReveal(){
  if (io) io.disconnect();
  io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.style.opacity = 1;
      }
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
  document.querySelectorAll('.item').forEach(el=> io.observe(el));
}

/* ===== 필터 매칭 ===== */
function matchFilter(item){
  const f = state.filters;
  for (const key in f) {
    const val = f[key];
    if (!val || val === "ALL") continue;
    if (Array.isArray(item[key])) {
      if (!item[key].includes(val)) return false;
    } else if (key === "material") {
      continue; // material은 배열이므로 아래에서 처리
    } else if (key in item) {
      if (item[key] !== val) return false;
    }
  }
  if (f.material && !item.material?.includes(f.material)) return false;
  return true;
}

/* ===== 글로벌 단축키 ===== */
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'p') document.body.classList.toggle('contact-sheet');   // Contact Sheet
  if (k === 'g') document.body.classList.toggle('design-grid');     // Design Grid
  if (k === 'l'){                                                   // Experimental Grid
    document.body.classList.toggle('grid-lab');
    render(); // 그리드 모드 변경 즉시 반영 (기본 기울임 제거 유지)
  }
  if (k === 'r'){                                                   // Shuffle
    shuffle(DATA);
    render();
  }
});

/* ===== Shuffle (Fisher–Yates) ===== */
function shuffle(arr){
  for(let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ===== 필터 핸들링 ===== */
$filters.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.id === 'clear') {
    state.filters = {};
    Array.from($filters.querySelectorAll('button')).forEach(b=>b.removeAttribute('aria-pressed'));
    render(); return;
  }

  const key = btn.dataset.key;
  const val = btn.dataset.val;
  const pressed = btn.getAttribute('aria-pressed') === 'true';

  Array.from($filters.querySelectorAll(`button[data-key="${key}"]`)).forEach(b=>b.removeAttribute('aria-pressed'));
  if (!pressed) {
    btn.setAttribute('aria-pressed', 'true');
    state.filters[key] = val;
  } else {
    btn.removeAttribute('aria-pressed');
    delete state.filters[key];
  }
  render();
});

/* 초기 렌더 */
document.addEventListener('DOMContentLoaded', render);


