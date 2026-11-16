/* ===== 国际金融题库 · 核心逻辑 ===== */
(function(){
'use strict';

const BANK = window.BANK_DATA;
const TYPE_NAME = {single:'单选题', multiple:'多选题', judge:'判断题', blank:'填空题'};
const IMP_NAME = {core:'重点·常考', imp:'重要', normal:'了解'};

/* ---------- 数据索引 ---------- */
const INDEX = { parts: BANK.parts, chapters: [], allQuestions: [], byChapter: {}, byType: {} };
['single','multiple','judge','blank'].forEach(t=>INDEX.byType[t]=[]);
BANK.parts.forEach((part,pi)=>{
  part.chapters.forEach((ch,ci)=>{
    ch._pid = pi; ch._ci = ci;
    ch._globalIndex = INDEX.chapters.length;
    INDEX.chapters.push({part, ch});
    const key = ch.id;
    INDEX.byChapter[key] = [];
    ch.sections.forEach(sec=>{
      (sec.questions||[]).forEach((q,qi)=>{
        const item = Object.assign({}, q, {
          _qid: key+'_'+sec.id+'_'+qi,
          _chapterId: ch.id, _chapterName: ch.name, _partName: part.name,
          _sectionName: sec.name, _globalIndex: INDEX.allQuestions.length
        });
        INDEX.allQuestions.push(item);
        INDEX.byChapter[key].push(item);
        INDEX.byType[q.type] && INDEX.byType[q.type].push(item);
      });
    });
  });
});

/* ---------- 本地存储 ---------- */
const LS = {
  get(k,def){ try{ const v=localStorage.getItem('jf_'+k); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set(k,v){ try{ localStorage.setItem('jf_'+k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem('jf_'+k); }catch(e){} }
};

/* ---------- 工具 ---------- */
const $ = (s,el)=> (el||document).querySelector(s);
const $$ = (s,el)=> Array.from((el||document).querySelectorAll(s));
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function impClass(imp){ return imp==='core'?'core':(imp==='important'||imp==='imp')?'imp':'norm'; }
function impTag(imp){ const c=impClass(imp); return `<span class="pill ${c}">${IMP_NAME[c==='imp'?'imp':c]||IMP_NAME[c]||'了解'}</span>`; }

/* 重点词/短语加黑：数字与单位、引号/书名号内容、大写缩写、核心术语 */
const KEY_TERMS = [
  '外汇','汇率','结汇','售汇','结售汇','外汇买卖','外汇账户','外币现钞','外币支付凭证','外币有价证券',
  '特别提款权','自由兑换','经常项目','资本项目','国际收支','跨境人民币','经常转移','初次收入','二次收入',
  '展业三原则','了解客户','了解业务','尽职审查','负面清单','名录管理','分类管理','电子数据核查','实需原则',
  '真实性审核','一致性','合理性','原路退回','谁出口谁收汇','谁进口谁付汇','货物流','资金流',
  '反洗钱','反恐怖融资','反逃税','可疑交易','大额交易','金融制裁','受益所有人','风险等级','名单监控',
  '信用证','托收','汇款','押汇','福费廷','保理','保函','代付','打包贷款','提货担保','议付','跨境担保',
  '光票托收','跟单托收','海运提单','银行信用','商业信用','第一性付款责任','融资性担保','非融资性担保',
  '即期结售汇','远期结售汇','掉期交易','期权交易','期货交易','做市商','清算行','近端交易','远端交易',
  '协定价格','期权费','浮动盈亏','外汇头寸','挂牌汇价','择期交易','固定期限',
  '直接投资','间接投资','外债','OFDI','FDI','ODI','QFII','QDII','NRA','OSA','FT账户','自由贸易账户',
  '银行信用','远期信用证','即期信用证','跟单信用证','不可撤销','保兑','议付行','开证行','通知行','受益人','申请人',
  '不得','应当','必须','禁止','原则上','不得超','至少','合计','不得超过','真实','合规','一致','合理',
  '便利化','审慎监管','逐笔登记','宏观审慎','宏观审核','登记手续','税务备案','报关单','运输单据',
  '外汇局','监管机构','外汇管理条例','服务贸易','货物贸易','转口贸易','保税区','海关特殊监管区域'
];
function highlightText(text){
  let s = escapeHtml(text==null?'':String(text));
  // 先从原文角度构建匹配（在已转义文本上处理，注意实体）
  // 1) 数字+单位（含百分比、金额、期限）
  s = s.replace(/(\d+(?:\.\d+)?\s*(?:万美元|亿元|万元|亿|万|元|美元|%|个百分点|年|个月|月|日|个工作日|工作日|天|小时|位|类|种|档|个))/g, '<strong>$1</strong>');
  // 2) 大写英文缩写 / 代码（2位以上）
  s = s.replace(/\b([A-Z][A-Z0-9]{1,})\b/g, (m,p1)=>{
    if(/^(A|I)$/.test(p1)) return m;
    return '<strong>'+p1+'</strong>';
  });
  // 3) 引号 / 书名号内容
  s = s.replace(/(《[^》]{1,40}》|"[^"]{1,40}"|"[^"]{1,40}"|「[^」]{1,40}」)/g, '<strong>$1</strong>');
  // 4) 核心术语（在未被 strong 包裹的纯文本里做），按长度降序避免短词优先
  const terms = KEY_TERMS.slice().sort((a,b)=>b.length-a.length);
  terms.forEach(t=>{
    const re = new RegExp('(?![^<]*>)('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','g');
    s = s.replace(re, '<strong>$1</strong>');
  });
  // 清理：去掉嵌套 strong 造成的重复
  s = s.replace(/<strong>([^<]*)<strong>([^<]*)<\/strong>([^<]*)<\/strong>/g, '<strong>$1$2$3</strong>');
  s = s.replace(/<strong>\s*<\/strong>/g,'');
  return s;
}

/* ---------- 图标 ---------- */
const ICONS = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  graph:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6.8 7.6 10.5 16M17.2 7.6 13.5 16M7.2 6h9.6"/></svg>',
  single:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.5"/></svg>',
  multi:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  judge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
  blank:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h4l2-5 3 10 2-5h5"/></svg>',
  exam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 13 2 2 4-4"/></svg>',
  seq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m15 18-6-6 6-6"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m9 18 6-6-6-6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  src:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M4 6h16M4 12h16M4 18h12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m5 12 4 4L19 6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m15 18-6-6 6-6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m9 18 6-6-6-6"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/></svg>'
};
// 题型键名兼容：题库用 'multiple'，图标表用 'multi'
ICONS.multiple = ICONS.multi;
function logo(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'; }

/* ---------- 页面路由 + 顶栏 ---------- */
const PAGE_TITLE = {home:'国际金融题库', graph:'知识图谱', kp:'知识点', chapters:'章节练习', 'ch-qtype':'选择题型', quiz:'答题', 'exam-setup':'模拟考试'};
const stack = ['home'];
let topRightHtml = '';
function showPage(id, opts){
  opts = opts||{};
  $$('.page').forEach(p=>p.classList.remove('active'));
  const el = document.getElementById('page-'+id);
  if(el) el.classList.add('active');
  // 维护返回栈
  if(opts.root){ stack.length=0; stack.push(id); }
  else if(stack[stack.length-1]!==id){ stack.push(id); }
  window.scrollTo(0,0);
  updateTopbar();
}
function setTopTitle(t){ const el=document.getElementById('topbar-title'); if(el) el.textContent=t; }
function setTopRight(html){ topRightHtml=html||''; const el=document.getElementById('topbar-right'); if(el) el.innerHTML=topRightHtml; }
function updateTopbar(){
  const back=document.getElementById('topbar-back');
  const title=document.getElementById('topbar-title');
  if(!back||!title) return;
  const atRoot = stack.length<=1;
  back.innerHTML = atRoot?'':ICONS.back;
  back.style.visibility = atRoot?'hidden':'visible';
  title.textContent = PAGE_TITLE[stack[stack.length-1]] || title.textContent;
  const r=document.getElementById('topbar-right'); if(r) r.innerHTML=topRightHtml;
}
function goBack(){
  if(stack.length>1){
    stack.pop();
    topRightHtml='';
    const prev=stack[stack.length-1];
    showPage(prev,{back:true});
    if(window.__onPageEnter) window.__onPageEnter(prev);
  }
}
function initTopbar(){
  const back=document.getElementById('topbar-back');
  if(back) back.onclick=goBack;
  updateTopbar();
}
window.__appReady = {};

/* ---------- 音频系统（内嵌音频优先 + WebAudio 兜底） ---------- */
let audioCtx=null;
const AUDIO_BASE = 'audio/';
const SFX_FILE = {ok:'sfx_correct.wav', bad:'sfx_wrong.wav', tap:'sfx_click.wav', finish:'sfx_finish.wav'};
const VOICE_FILE = {ok:'voice_correct.mp3', bad:'voice_wrong.mp3', exam_start:'voice_exam_start.mp3',
  exam_end:'voice_exam_end.mp3', finish:'voice_finish.mp3', next:'voice_next.mp3'};
const _audioCache = {};
function _playFile(name, vol){
  try{
    let a = _audioCache[name];
    if(!a){ a = new Audio(AUDIO_BASE+name); a.preload='auto'; _audioCache[name]=a; }
    a.pause(); a.currentTime=0; a.volume = (vol==null?1:vol);
    const p=a.play(); if(p&&p.catch) p.catch(()=>{});
    return a;
  }catch(e){ return null; }
}
function beepFallback(type){
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const notes = type==='ok' ? [660,880] : type==='bad' ? [300,220] : [520];
    notes.forEach((f,i)=>{
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001, t+i*0.09);
      g.gain.exponentialRampToValueAtTime(0.13, t+i*0.09+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t+i*0.09+0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t+i*0.09); o.stop(t+i*0.09+0.18);
    });
  }catch(e){}
}
function beep(type){
  if(LS.get('sound',true)===false) return;
  const f = SFX_FILE[type];
  if(f && _playFile(f, 0.9)) return;
  beepFallback(type);
}
// 语音播报（受 voice 开关控制）
function speak(key){
  if(LS.get('voice',true)===false) return;
  const f = VOICE_FILE[key];
  if(f) _playFile(f, 1.0);
}
// 背景音控制
let bgmAudio=null;
function startBgm(){
  if(LS.get('bgm',false)===false) return;
  try{
    if(!bgmAudio){ bgmAudio=new Audio(AUDIO_BASE+'bgm.wav'); bgmAudio.loop=true; bgmAudio.volume=0.28; }
    const p=bgmAudio.play(); if(p&&p.catch) p.catch(()=>{});
  }catch(e){}
}
function stopBgm(){ if(bgmAudio){ try{bgmAudio.pause();}catch(e){} } }
function toggleBgm(on){
  LS.set('bgm', on);
  if(on) startBgm(); else stopBgm();
}

window.__app = {BANK, INDEX, TYPE_NAME, IMP_NAME, $, $$, escapeHtml, shuffle, impTag, impClass, highlightText, ICONS, logo, showPage, goBack, setTopTitle, setTopRight, initTopbar, updateTopbar, getStack:()=>stack.slice(), beep, speak, startBgm, stopBgm, toggleBgm, LS};

/* 后续模块在 app2.js 中继续 */
})();
