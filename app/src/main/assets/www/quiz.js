/* ===== 答题引擎：即时反馈 / 正误标记 / 解析 ===== */
(function(){
'use strict';
const A=window.__app;
const {INDEX,TYPE_NAME,$,$$,escapeHtml,impTag,ICONS,showPage,beep}=A;

let state=null;
/*
 state = {
  queue, idx, answers:{}, mode, title, showExplain, onExit,
  judged:{}, examSubmitted
 }
*/

function startQuiz(queue,title,mode,opts){
  opts=opts||{};
  state={
    queue:queue, idx:0, answers:{}, mode:mode, title:title,
    showExplain:opts.showExplain!==false,
    onExit:opts.onExit||(()=>{A.goBack();}),
    judged:{}, examSubmitted:false
  };
  if(opts.restore&&opts.restore.answers){
    state.answers=opts.restore.answers; state.idx=opts.restore.idx||0; state.judged=opts.restore.judged||{};
  }
  renderShell();
  renderQuestion();
  showPage('quiz');
}

function renderShell(){
  const page=$('#page-quiz');
  page.innerHTML=`
    <div class="quiz-top">
      <span class="qt-label" id="qt-mode">练习</span>
      <div class="qt-bar"><i id="qt-prog"></i></div>
      <span class="qt-num" id="qt-count"></span>
    </div>
    <div id="q-body"></div>
    <div class="qfoot">
      <button class="btn sm" id="q-sheet-btn">${ICONS.chart} 答题卡</button>
      <div class="spacer"></div>
      <button class="btn sm" id="q-prev">上一题</button>
      <button class="btn primary sm" id="q-next">下一题</button>
    </div>
    <div id="q-sheet-wrap"></div>
  `;
  $('#qt-mode').textContent=state.title;
  $('#q-prev').onclick=()=>{ if(state.idx>0){state.idx--;renderQuestion();} };
  $('#q-next').onclick=()=>{
    if(state.idx<state.queue.length-1){state.idx++;renderQuestion();}
    else { state.mode==='模拟考试'?submitExam():finishPractice(); }
  };
  $('#q-sheet-btn').onclick=()=>{ const w=$('#q-sheet-wrap'); w.innerHTML = w.innerHTML?'':sheetHtml(); };
}

function currentQ(){ return state.queue[state.idx]; }

function renderQuestion(){
  const q=currentQ(); if(!q) return;
  $('#qt-count').textContent=`${state.idx+1}/${state.queue.length}`;
  $('#qt-prog').style.width=((state.idx+1)/state.queue.length*100)+'%';
  $('#q-prev').disabled=state.idx===0;
  $('#q-next').textContent=state.idx===state.queue.length-1?(state.mode==='模拟考试'?'交卷':'完成'):'下一题';
  const judged=state.judged[q._qid], ans=state.answers[q._qid];
  const body=$('#q-body');
  let optionsHtml='';

  if(q.type==='single'||q.type==='multiple'||q.type==='judge'){
    const list=(q.type==='judge')?['正确','错误']:(q.options||[]);
    optionsHtml=`<div class="opts">${list.map((o,i)=>{
      const key=(q.type==='judge')?o:String.fromCharCode(65+i);
      const txt=(q.type==='judge')?o:String(o).replace(/^[A-Z]\.\s*/,'');
      let cls='opt';
      if(judged!==undefined){
        const isAns=isAnswer(q,key), chosen=isChosen(ans,key);
        if(isAns) cls+=' correct';
        else if(chosen) cls+=' wrong';
        else cls+=' dim';
        cls+=' locked';
      } else if(isChosen(ans,key)) cls+=' selected';
      else cls+=' clickable';
      const mark=(judged!==undefined)?
        (isAnswer(q,key)?`<span class="op-mark">${ICONS.check}</span>`:
         isChosen(ans,key)?`<span class="op-mark">${ICONS.x}</span>`:'<span class="op-mark"></span>'):'';
      const keyLabel=(q.type==='judge')?(i===0?'✓':'✕'):key;
      return `<div class="${cls}" data-key="${escapeHtml(key)}">
        <span class="op-key">${keyLabel}</span><span class="op-txt">${escapeHtml(txt)}</span>${mark}</div>`;
    }).join('')}</div>`;
    if(!judged&&q.type==='multiple'){
      optionsHtml+=`<div style="margin-top:14px"><button class="btn primary block" id="q-submit">确认作答</button></div>`;
    }
  } else if(q.type==='blank'){
    const answers=arr(q.answer);
    optionsHtml=`<div class="blank-wrap">${answers.map((_,i)=>{
      const v=(ans&&ans[i])||''; let cls='';
      if(judged!==undefined) cls=isBlankCorrect(q,i,v)?'ok':'bad';
      return `<div class="blank-field"><span class="bf-idx">${i+1}</span>
        <input class="bi" data-bi="${i}" value="${escapeHtml(v)}" ${judged!==undefined?'readonly':''}
        class="${cls}" placeholder="填入原文答案" /></div>`;
    }).join('')}</div>`;
    if(judged!==undefined){
      optionsHtml+=`<div class="blank-ref" style="margin-top:12px">参考答案：<b>${answers.map(a=>escapeHtml(a)).join('、')}</b></div>`;
    } else {
      optionsHtml+=`<div style="margin-top:14px"><button class="btn primary block" id="q-submit">确认作答</button></div>`;
    }
  }

  body.innerHTML=`
    <div class="qhead"><span class="qtype-chip">${TYPE_NAME[q.type]}</span>${impTag(q.importance)}</div>
    <div class="qstem">${escapeHtml(q.stem)}<span class="qstem-src">${escapeHtml(q._chapterName)} · ${escapeHtml(q._sectionName)}</span></div>
    ${optionsHtml}
    <div id="q-explain"></div>
  `;

  // 选项交互
  $$('#q-body .opt',body).forEach(el=>{
    if(judged!==undefined) return;
    el.onclick=()=>choose(q,el.dataset.key);
  });
  $$('#q-body .bi',body).forEach(inp=>inp.onclick=e=>e.stopPropagation());
  const sub=$('#q-submit',body); if(sub) sub.onclick=submitAnswer;

  if(judged!==undefined&&state.showExplain) renderExplain();
  const sw=$('#q-sheet-wrap'); if(sw&&sw.innerHTML) sw.innerHTML=sheetHtml();
  bindSheet();
}

function arr(a){return Array.isArray(a)?a:[a];}
function isAnswer(q,key){ const a=q.answer; return Array.isArray(a)?a.includes(key):a===key; }
function isChosen(ans,key){ return Array.isArray(ans)?ans.includes(key):ans===key; }
function isBlankCorrect(q,i,v){ return norm(v)===norm(arr(q.answer)[i]); }
function norm(s){ return String(s==null?'':s).trim().replace(/[\s，,。.；;、]/g,'').toLowerCase(); }

function choose(q,key){
  if(q.type==='multiple'){
    let a=Array.isArray(state.answers[q._qid])?state.answers[q._qid].slice():[];
    if(a.includes(key)) a=a.filter(x=>x!==key); else a.push(key);
    state.answers[q._qid]=a.sort();
    renderQuestion(); // 仅更新选中态
  } else {
    state.answers[q._qid]=key;
    // 单选/判断：立即判定
    commitAnswer(q);
  }
}

function judgeAnswer(q){
  if(q.type==='blank'){
    const ans=state.answers[q._qid]||[];
    return arr(q.answer).every((a,i)=>norm(ans[i])===norm(a));
  }
  const a=q.answer, ans=state.answers[q._qid];
  if(Array.isArray(a)){ const u=Array.isArray(ans)?ans:[]; return a.length===u.length&&a.every(x=>u.includes(x)); }
  return ans===a;
}

function submitAnswer(){
  const q=currentQ();
  if(q.type==='blank'){
    const vals=$$('#q-body .bi').map(i=>i.value);
    state.answers[q._qid]=vals;
    if(vals.every(v=>!v.trim())){ alert('请先填写答案'); return; }
  } else {
    const a=state.answers[q._qid];
    if(!a||(Array.isArray(a)&&!a.length)){ alert('请先作答'); return; }
  }
  commitAnswer(q);
}

function commitAnswer(q){
  const ok=judgeAnswer(q);
  state.judged[q._qid]=ok;
  beep(ok?'ok':'bad');
  if(A.speak) A.speak(ok?'ok':'bad');
  saveSeqProgress();
  renderQuestion();
}

function answerText(q){
  if(q.type==='blank') return arr(q.answer).join('、');
  return Array.isArray(q.answer)?q.answer.join(''):q.answer;
}
function renderExplain(){
  const q=currentQ(), ok=state.judged[q._qid];
  const box=$('#q-explain'); if(!box) return;
  box.innerHTML=`
    <div class="explain">
      <div class="ex-banner ${ok?'ok':'bad'}">
        <span class="ex-ic">${ok?ICONS.check:ICONS.x}</span>
        <span>${ok?'回答正确':'回答错误'}</span>
      </div>
      <div class="ex-body">
        <div class="ex-ans">正确答案：<b>${escapeHtml(answerText(q))}</b></div>
        <div class="ex-label">答案解析</div>
        <div class="ex-text">${escapeHtml(q.analysis||'暂无解析')}</div>
        <div class="ex-src">${ICONS.src}<span><b>出处：</b>${escapeHtml(q.source||'')}</span></div>
      </div>
    </div>`;
}

function sheetHtml(){
  return `<div class="sheet-panel"><h4>答题卡 · 点击跳转</h4><div class="sheet">${state.queue.map((q,i)=>{
    let cls='n';
    if(state.judged[q._qid]!==undefined) cls+=state.judged[q._qid]?' right':' wrong';
    else if(state.answers[q._qid]) cls+=' done';
    if(i===state.idx) cls+=' cur';
    return `<div class="${cls}" data-jump="${i}">${i+1}</div>`;
  }).join('')}</div></div>`;
}
function bindSheet(){
  $$('[data-jump]').forEach(el=>el.onclick=()=>{state.idx=+el.dataset.jump;renderQuestion();window.scrollTo(0,0);});
}

function saveSeqProgress(){
  if(state.mode==='顺序练习') A.LS.set('seqProgress',{idx:state.idx,answers:state.answers,judged:state.judged,total:state.queue.length});
}

function finishPractice(){
  const done=Object.keys(state.judged).length;
  const correct=Object.values(state.judged).filter(Boolean).length;
  if(A.speak) A.speak('finish');
  A.LS.del('seqProgress');
  const body=$('#q-body');
  body.innerHTML=`<div class="qcard" style="text-align:center">
    <div class="done-badge">${ICONS.check}</div>
    <h2 class="h-title" style="text-align:center">练习完成</h2>
    <p class="h-sub" style="margin-bottom:20px">共作答 ${done} 题，答对 <b style="color:var(--ok)">${correct}</b> 题，正确率 ${done?Math.round(correct/done*100):0}%</p>
    <div class="btn-row" style="justify-content:center">
      <button class="btn" id="fp-back">返回</button>
      <button class="btn primary" id="fp-retry">${ICONS.refresh} 再练一次</button>
    </div>
  </div>`;
  $('#fp-back').onclick=()=>state.onExit();
  $('#fp-retry').onclick=()=>startQuiz(state.queue,state.title,state.mode,{onExit:state.onExit,showExplain:state.showExplain});
}

function submitExam(){
  if(state.examSubmitted) return;
  const answered=Object.keys(state.answers).length;
  if(answered<state.queue.length&&!confirm(`还有 ${state.queue.length-answered} 题未作答，确定交卷吗？`)) return;
  state.examSubmitted=true;
  state.queue.forEach(q=>{ if(state.judged[q._qid]===undefined) state.judged[q._qid]=false; });
  const correct=Object.values(state.judged).filter(Boolean).length;
  const total=state.queue.length, score=total?Math.round(correct/total*100):0;
  if(A.speak) A.speak('exam_end');
  const byType={};
  ['single','multiple','judge','blank'].forEach(t=>{
    const qs=state.queue.filter(q=>q.type===t);
    byType[t]={total:qs.length,correct:qs.filter(q=>state.judged[q._qid]).length};
  });
  const color=score>=80?'var(--ok)':score>=60?'var(--imp)':'var(--bad)';
  const R=62,C=2*Math.PI*R,off=C*(1-score/100);
  const body=$('#q-body');
  body.innerHTML=`<div class="result-card">
    <h2 class="h-title" style="text-align:center">考试结束</h2>
    <p class="h-sub">${escapeHtml(state.title)}</p>
    <div class="ring"><svg width="156" height="156">
      <circle cx="78" cy="78" r="${R}" fill="none" stroke="var(--line)" stroke-width="13"/>
      <circle cx="78" cy="78" r="${R}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}"/>
    </svg><div class="rt"><b style="color:${color}">${score}</b><span>得分</span></div></div>
    <div class="res-stats">
      <div class="rs"><b>${total}</b><span>总题</span></div>
      <div class="rs"><b style="color:var(--ok)">${correct}</b><span>答对</span></div>
      <div class="rs"><b style="color:var(--bad)">${total-correct}</b><span>答错/未答</span></div>
      <div class="rs"><b>${answered}</b><span>已作答</span></div>
    </div>
    <div class="sec" style="text-align:left">各题型正确率</div>
    <div class="res-types">${['single','multiple','judge','blank'].map(t=>`<div class="rt"><b>${byType[t].correct}</b> / ${byType[t].total} ${TYPE_NAME[t]}</div>`).join('')}</div>
    <div class="btn-row" style="justify-content:center;margin-top:22px">
      <button class="btn" id="ex-back">返回首页</button>
      <button class="btn primary" id="ex-review">${ICONS.chart} 查看解析</button>
    </div>
  </div>`;
  $('#ex-back').onclick=()=>state.onExit();
  $('#ex-review').onclick=()=>{ state.showExplain=true;state.idx=0;state.examSubmitted=false;renderShell();renderQuestion(); };
}

function startSequence(){
  const all=INDEX.allQuestions.slice();
  const saved=A.LS.get('seqProgress',null);
  const opts={onExit:()=>{A.__app2&&A.__app2.renderHome();showPage('home',{root:true});},showExplain:true};
  if(saved&&saved.total===all.length&&saved.idx<all.length) opts.restore=saved;
  else A.LS.del('seqProgress');
  startQuiz(all,'顺序练习','顺序练习',opts);
}

A.__startQuiz=startQuiz;
A.__startSequence=startSequence;
})();
