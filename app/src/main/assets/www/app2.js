/* ===== 首页 / 知识图谱 / 知识点卡片 / 章节练习 ===== */
(function(){
'use strict';
const A = window.__app;
const {BANK, INDEX, TYPE_NAME, $, $$, escapeHtml, impTag, impClass, highlightText, ICONS, showPage, LS} = A;

/* ---------- 首页 ---------- */
function renderHome(){
  const kp=BANK.meta.totalKnowledge, q=BANK.meta.totalQuestions, ch=INDEX.chapters.length;
  const home=$('#page-home');
  home.innerHTML=`
    <div class="hero">
      <div class="eyebrow">CHINA CONSTRUCTION BANK · 初级</div>
      <h1>国际金融题库</h1>
      <p>依据建行《国际金融专业技术职务等级考试（初级复习资料）》编制，覆盖全部章节知识点。</p>
      <div class="stats">
        <div class="stat"><b>${ch}</b><span>章节</span></div>
        <div class="stat"><b>${kp}</b><span>知识点</span></div>
        <div class="stat"><b>${q}</b><span>试题</span></div>
        <div class="stat"><b>4</b><span>题型</span></div>
      </div>
    </div>

    <div class="sec">学习中心</div>
    <div class="grid g2">
      <button class="tile" data-go="graph">
        <span class="go">${ICONS.right}</span>
        <div class="ico violet">${ICONS.graph}</div>
        <h3>知识图谱</h3>
        <p>${kp} 个知识点，重点醒目标注</p>
      </button>
      <button class="tile" data-go="chapters">
        <span class="go">${ICONS.right}</span>
        <div class="ico sky">${ICONS.book}</div>
        <h3>章节练习</h3>
        <p>按 ${ch} 个章节逐章练习</p>
      </button>
    </div>

    <div class="sec">按题型练习</div>
    <div class="grid g4">
      ${['single','multiple','judge','blank'].map((t,i)=>{
        const c=['violet','rose','amber','teal'][i];
        return `<button class="tile qtype-tile" data-type="${t}"><div class="ico ${c}">${ICONS[t]}</div><h3>${TYPE_NAME[t].replace('题','')}</h3><div class="cnt">${INDEX.byType[t].length} 题</div></button>`;
      }).join('')}
    </div>

    <div class="sec">练习模式</div>
    <button class="feature-banner" data-go="exam-setup">
      <div class="ico rose">${ICONS.exam}</div>
      <div class="fb-txt"><h3>模拟考试</h3><p>自选题型题量 · 随机抽题 · 自动评分</p></div>
      <span class="go">${ICONS.right}</span>
    </button>
    <button class="feature-banner" data-go="seq" style="margin-top:10px">
      <div class="ico teal">${ICONS.seq}</div>
      <div class="fb-txt"><h3>顺序练习</h3><p id="seq-home-meta">从第一题依次练习，自动保存进度</p></div>
      <span class="go">${ICONS.right}</span>
    </button>

    <div class="sec">偏好设置</div>
    <div class="settings">
      <div class="set-row"><div class="ico violet">${ICONS.info}</div><div class="st"><h4>答题音效</h4><p>答对/答错的音效反馈</p></div>
        <button class="switch ${LS.get('sound',true)?'on':''}" data-sw="sound"><i></i></button></div>
      <div class="set-row"><div class="ico teal">${ICONS.judge}</div><div class="st"><h4>语音播报</h4><p>朗读"回答正确/错误"等</p></div>
        <button class="switch ${LS.get('voice',true)?'on':''}" data-sw="voice"><i></i></button></div>
      <div class="set-row"><div class="ico amber">${ICONS.seq}</div><div class="st"><h4>背景音乐</h4><p>轻柔循环背景音</p></div>
        <button class="switch ${LS.get('bgm',false)?'on':''}" data-sw="bgm"><i></i></button></div>
    </div>
  `;
  $$('[data-go]',home).forEach(b=>b.onclick=()=>{
    const g=b.dataset.go;
    if(g==='graph') renderGraph();
    else if(g==='chapters') renderChapters();
    else if(g==='exam-setup'){ if(window.__renderExamSetup) window.__renderExamSetup(); }
    else if(g==='seq'){ A.__startSequence(); return; }
    if(g!=='seq') showPage(g);
  });
  $$('[data-type]',home).forEach(b=>b.onclick=()=>openTypeQuestions(b.dataset.type));
  $$('[data-sw]',home).forEach(b=>b.onclick=()=>{
    const k=b.dataset.sw, cur=LS.get(k,k==='bgm'?false:true), v=!cur;
    LS.set(k,v); b.classList.toggle('on',v);
    if(k==='sound'&&v) A.beep('ok');
    if(k==='voice'&&v) A.speak&&A.speak('ok');
    if(k==='bgm'){ A.toggleBgm&&A.toggleBgm(v); }
  });
  const sp=LS.get('seqProgress',null), m=$('#seq-home-meta');
  if(m&&sp&&sp.idx>0) m.textContent=`继续第 ${sp.idx+1} 题 · 已自动保存进度`;
}

/* ---------- 知识图谱（列表） ---------- */
let gChapter='all', gFilter='all', gSearch='';
function flattenKnowledge(){
  const list=[];
  INDEX.chapters.forEach(({part,ch})=>{
    ch.sections.forEach(sec=>{
      (sec.knowledge||[]).forEach((k,i)=>list.push({
        title:k.title, content:k.content, importance:k.importance, source:k.source,
        chapterId:ch.id, chapterName:ch.name, partName:part.name, sectionName:sec.name,
        chapterIndex:ch._globalIndex, idxInChapter:list.length
      }));
    });
  });
  // 记录每章在扁平列表中的范围
  const ranges={};
  list.forEach((k,i)=>{ if(!ranges[k.chapterId]) ranges[k.chapterId]={start:i,end:i}; else ranges[k.chapterId].end=i; });
  return {list, ranges};
}
let KP_FLAT=null;

// 章节短名：去掉"第X章 / 个人第X章"前缀，用于图谱章节胶囊
function shortChapterName(ch){
  return ch.name.replace(/^(个人)?第[一二三四五六七八九十百]+章\s*/,'') || ch.name;
}

function renderGraph(){
  KP_FLAT=flattenKnowledge();
  const page=$('#page-graph');
  const opts=[['all','全部章节（22）'],...INDEX.chapters.map(({ch})=>[ch.id,`${ch._globalIndex+1}. ${ch.name}`])];
  page.innerHTML=`
    <h2 class="h-title">知识图谱</h2>
    <p class="h-sub">全部 ${BANK.meta.totalKnowledge} 个知识点，点击卡片可左右滑动浏览。</p>
    <div class="legend" style="margin-top:14px">
      <span><span class="pill core">重点·常考</span> 高频</span>
      <span><span class="pill imp">重要</span> 掌握</span>
      <span><span class="pill norm">了解</span> 一般</span>
    </div>
    <div class="filter-block">
      <div class="fb-label">级别筛选 <span class="fb-hint">按重要程度</span></div>
      <div class="segbar" id="g-seg">
        ${[['all','全部'],['core','重点·常考'],['imp','重要'],['norm','了解']].map(([v,l])=>{
          const dot = v==='all' ? '' : `<span class="seg-dot ${v}"></span>`;
          return `<button class="seg ${gFilter===v?'on':''}" data-filter="${v}">${dot}${l}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="filter-block">
      <div class="fb-label">章节选择 <span class="fb-hint">${INDEX.chapters.length} 个章节 · 左右滑动</span></div>
      <div class="chips" id="g-chips">
        ${opts.map(([v])=>{
          if(v==='all') return `<button class="chip ${gChapter==='all'?'on':''}" data-chapter="all">全部章节</button>`;
          const item=INDEX.chapters.find(x=>x.ch.id===v);
          return `<button class="chip ${gChapter===v?'on':''}" data-chapter="${v}">${item._globalIndex+1}. ${escapeHtml(shortChapterName(item.ch))}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="searchbar">${ICONS.search}<input id="g-search" placeholder="搜索知识点…" value="${escapeHtml(gSearch)}"></div>
    <div id="g-list"></div>
  `;
  const gpage=$('#page-graph');
  $$('[data-filter]',gpage).forEach(b=>b.onclick=()=>{
    gFilter=b.dataset.filter;
    $$('[data-filter]',gpage).forEach(x=>x.classList.toggle('on',x===b));
    drawGraphList();
  });
  $$('[data-chapter]',gpage).forEach(b=>b.onclick=()=>{
    gChapter=b.dataset.chapter;
    $$('[data-chapter]',gpage).forEach(x=>x.classList.toggle('on',x===b));
    drawGraphList();
    try{ if(b.scrollIntoView) b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}); }catch(e){}
  });
  $('#g-search').oninput=e=>{gSearch=e.target.value.trim();drawGraphList();};
  drawGraphList();
}
function filteredKpList(){
  const kw=gSearch.toLowerCase();
  return KP_FLAT.list.filter(k=>{
    if(gChapter!=='all'&&k.chapterId!==gChapter) return false;
    if(gFilter!=='all'&&impClass(k.importance)!==gFilter) return false;
    if(kw&&!(k.title+' '+k.content+' '+k.source).toLowerCase().includes(kw)) return false;
    return true;
  });
}
function drawGraphList(){
  const box=$('#g-list'); if(!box) return;
  const list=filteredKpList();
  if(!list.length){ box.innerHTML=`<div class="empty">${ICONS.search}<p>没有匹配的知识点，换个关键词试试。</p></div>`; return; }
  // 按章节分组显示
  let html='', lastCh=null, counter=0;
  list.forEach((k,i)=>{
    if(k.chapterId!==lastCh){
      if(lastCh!==null) html+='</div>';
      lastCh=k.chapterId;
      html+=`<div class="sec" style="margin-top:16px">${escapeHtml(k.chapterName)}</div><div class="kp-group">`;
    }
    counter++;
    const excerpt=k.content.length>70?k.content.slice(0,70)+'…':k.content;
    html+=`<div class="kp-row" data-kp="${i}">
      <div class="kr-top"><span class="kr-idx">${counter}</span><span class="kr-title">${escapeHtml(k.title)}</span>${impTag(k.importance)}</div>
      <div class="kr-excerpt">${escapeHtml(excerpt)}</div>
      <div class="kr-src">${escapeHtml(k.source||'')}</div>
    </div>`;
  });
  html+='</div>';
  box.innerHTML=html;
  $$('[data-kp]',box).forEach(el=>el.onclick=()=>openKpCard(list,+el.dataset.kp));
}

/* ---------- 知识点卡片（滑动切换 + 重点加黑） ---------- */
let CARD={list:[],idx:0};
function openKpCard(list,idx){
  CARD={list:list,idx:idx};
  renderKpCard(null);
  showPage('kp');
  A.setTopRight(`${idx+1}/${list.length}`);
}
function renderKpCard(dir){
  const page=$('#page-kp'); if(!page) return;
  const {list,idx}=CARD; if(!list.length) return;
  const k=list[idx];
  const impText=impClass(k.importance)==='core'?'重点·常考':impClass(k.importance)==='imp'?'重要':'了解';
  const animation=dir==='next'?'slide-left':dir==='prev'?'slide-right':'';
  page.innerHTML=`
    <div class="kp-cursor">
      <div class="kc-count"><b>${idx+1}</b> / ${list.length}</div>
      <div class="kp-dots">${dotsHtml(idx,list.length)}</div>
    </div>
    <div class="kp-stage" id="kp-stage">
      <div class="kp-card ${animation}" id="kp-card">
        <span class="kc-badge ${impClass(k.importance)}">${impText}</span>
        <h2>${escapeHtml(k.title)}</h2>
        <div class="kc-body">${A.highlightText(k.content)}</div>
        <div class="kc-src">${ICONS.src}<span><b>出处：</b>${escapeHtml(k.source||'')}</span></div>
      </div>
    </div>
    <div class="kp-nav">
      <button class="btn" id="kp-prev" ${idx<=0?'disabled':''}>${ICONS.left} 上一知识点</button>
      <button class="btn primary" id="kp-next" ${idx>=list.length-1?'disabled':''}>下一知识点 ${ICONS.right}</button>
    </div>
    <div class="kp-hint">← 左右滑动切换知识点 →</div>
  `;
  A.setTopRight(`${idx+1}/${list.length}`);
  $('#kp-prev').onclick=()=>switchKp(-1);
  $('#kp-next').onclick=()=>switchKp(1);
  bindSwipe();
}
function dotsHtml(idx,total){
  // 最多显示7个点，超出用省略
  if(total<=9){ let h=''; for(let i=0;i<total;i++) h+=`<i class="${i===idx?'on':''}"></i>`; return h; }
  let start=Math.max(0,Math.min(idx-3,total-7)); let h=start>0?'<i>…</i>':'';
  for(let i=start;i<Math.min(start+7,total);i++) h+=`<i class="${i===idx?'on':''}"></i>`;
  if(start+7<total) h+='<i>…</i>';
  return h;
}
function switchKp(step){
  const ni=CARD.idx+step;
  if(ni<0||ni>=CARD.list.length) return;
  CARD.idx=ni;
  renderKpCard(step>0?'next':'prev');
}
function bindSwipe(){
  const stage=$('#kp-stage'); if(!stage) return;
  let x0=null,y0=null;
  stage.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  stage.addEventListener('touchend',e=>{
    if(x0===null) return;
    const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0;
    x0=y0=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)) switchKp(dx<0?1:-1);
  },{passive:true});
  // 鼠标拖拽（桌面预览）
  let mx=null;
  stage.addEventListener('mousedown',e=>{mx=e.clientX;});
  stage.addEventListener('mouseup',e=>{ if(mx!==null){const dx=e.clientX-mx;mx=null;if(Math.abs(dx)>45) switchKp(dx<0?1:-1);} });
}

/* ---------- 章节练习（列表） ---------- */
// 个人外汇业务分部的章节名去掉开头"个人"二字
function displayChapterName(part, ch){
  return part && part.name === '个人外汇业务' ? ch.name.replace(/^个人/,'') : ch.name;
}
function renderChapters(){
  const page=$('#page-chapters');
  page.innerHTML=`
    <h2 class="h-title">章节练习</h2>
    <p class="h-sub">选择章节后，可自主选择题型进行练习。</p>
    ${INDEX.parts.map(part=>`
      <div class="sec" style="margin-top:18px">${escapeHtml(part.name)}</div>
      ${part.chapters.map(ch=>{
        const qs=INDEX.byChapter[ch.id]||[];
        const kp=ch.sections.reduce((s,x)=>s+(x.knowledge||[]).length,0);
        return `<div class="chapter"><div class="ch-hd" data-ch="${ch.id}">
          <span class="ch-num">${String(ch._globalIndex+1).padStart(2,'0')}</span>
          <span class="ch-name">${escapeHtml(displayChapterName(part,ch))}</span>
          <span class="ch-meta">${qs.length}题 · ${kp}点</span>
          <span class="ch-arrow">${ICONS.right}</span>
        </div></div>`;
      }).join('')}
    `).join('')}
  `;
  $$('[data-ch]',page).forEach(h=>h.onclick=()=>renderChapterTypes(h.dataset.ch));
}

/* ---------- 章节练习：章节内题型选择 ---------- */
function renderChapterTypes(id){
  const found=INDEX.chapters.find(x=>x.ch.id===id);
  if(!found) return;
  const {part,ch}=found;
  const qs=INDEX.byChapter[id]||[];
  const name=displayChapterName(part,ch);
  const types=['single','multiple','judge','blank'];
  const page=$('#page-ch-qtype');
  page.innerHTML=`
    <div class="ct-hero">
      <div class="ct-num">${String(ch._globalIndex+1).padStart(2,'0')}</div>
      <div class="ct-info">
        <div class="ct-part">${escapeHtml(part.name)}</div>
        <h2>${escapeHtml(name)}</h2>
        <p>本章共 ${qs.length} 题 · 请选择练习题型</p>
      </div>
    </div>
    <div class="sec">选择题型</div>
    <div class="ct-grid">
      ${types.map((t,i)=>{
        const c=['violet','rose','amber','teal'][i];
        const n=qs.filter(q=>q.type===t).length;
        return `<button class="ct-card" data-ct="${t}" ${n?'':'disabled'}>
          <div class="ico ${c}">${ICONS[t]}</div>
          <div class="ct-txt"><h3>${TYPE_NAME[t]}</h3><p>${n} 题</p></div>
          <span class="go">${ICONS.right}</span>
        </button>`;
      }).join('')}
    </div>
    <button class="ct-all" data-ct="all">
      ${ICONS.seq}<span>练习全部题型</span><b>${qs.length} 题</b>${ICONS.right}
    </button>
    <p class="ct-tip">选择后进入答题页，退出时自动保留进度。</p>
  `;
  $$('[data-ct]',page).forEach(b=>b.onclick=()=>{
    const t=b.dataset.ct;
    const list=t==='all'?qs.slice():qs.filter(q=>q.type===t);
    if(!list.length) return;
    const title=name+(t==='all'?'':' · '+TYPE_NAME[t]);
    A.__startQuiz(list,title,'章节练习',{onExit:()=>{renderChapters();showPage('chapters',{root:true});}});
  });
  showPage('ch-qtype');
}

/* ---------- 按题型练习 ---------- */
function openTypeQuestions(type){
  A.__startQuiz(INDEX.byType[type].slice(), TYPE_NAME[type], '题型练习',
    {onExit:()=>{renderHome();showPage('home',{root:true});}});
}

window.__app2={renderHome,renderGraph,drawGraphList,renderChapters,renderChapterTypes,displayChapterName,openTypeQuestions,openKpCard};
})();
