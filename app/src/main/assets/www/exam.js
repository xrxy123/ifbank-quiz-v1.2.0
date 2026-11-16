/* ===== 模拟考试设置 + 程序初始化 ===== */
(function(){
'use strict';
const A=window.__app;
const {INDEX,TYPE_NAME,$,$$,ICONS,showPage,LS,beep}=A;
let cfg=null;

function renderExamSetup(){
  cfg=LS.get('examCfg',null)||{single:20,multiple:10,judge:10,blank:5,showExplain:false};
  const cap={single:INDEX.byType.single.length,multiple:INDEX.byType.multiple.length,judge:INDEX.byType.judge.length,blank:INDEX.byType.blank.length};
  ['single','multiple','judge','blank'].forEach(t=>{cfg[t]=Math.max(0,Math.min(cfg[t],cap[t]));});
  const page=$('#page-exam-setup');
  page.innerHTML=`
    <h2 class="h-title">模拟考试</h2>
    <p class="h-sub">自选题型与题量，随机抽题，交卷后自动评分。</p>
    <div class="tip">${ICONS.info}<span>考试过程中答错也会标记对错；是否即时显示解析由下方开关控制，关闭时交卷后可统一查看。</span></div>
    <div class="setup">
      ${['single','multiple','judge','blank'].map(t=>`
        <div class="setup-row">
          <div class="lb"><h4>${TYPE_NAME[t]}</h4><p>题库共 ${cap[t]} 题</p></div>
          <div class="stepper">
            <button data-dec="${t}">−</button>
            <span class="val" id="val-${t}">${cfg[t]}</span>
            <button data-inc="${t}">＋</button>
          </div>
        </div>`).join('')}
      <div class="setup-row">
        <div class="lb"><h4>答题后即时显示解析</h4><p>关闭则交卷后统一查看</p></div>
        <button class="switch ${cfg.showExplain?'on':''}" id="es-switch"><i></i></button>
      </div>
    </div>
    <div class="sum-box">本次考试共 <b id="es-total">0</b> 题 · 随机抽取 · 总分 100 分</div>
    <div class="btn-row">
      <button class="btn lg primary" id="es-start">${ICONS.exam} 开始考试</button>
      <button class="btn lg" id="es-reset">恢复默认</button>
    </div>
  `;
  const upd=()=>{ $('#es-total').textContent=cfg.single+cfg.multiple+cfg.judge+cfg.blank; }; upd();
  $$('[data-inc]',page).forEach(b=>b.onclick=()=>{const t=b.dataset.inc;if(cfg[t]<cap[t]){cfg[t]++;$('#val-'+t).textContent=cfg[t];upd();beep('tap');}});
  $$('[data-dec]',page).forEach(b=>b.onclick=()=>{const t=b.dataset.dec;if(cfg[t]>0){cfg[t]--;$('#val-'+t).textContent=cfg[t];upd();}});
  $('#es-switch').onclick=e=>{cfg.showExplain=!cfg.showExplain;e.currentTarget.classList.toggle('on',cfg.showExplain);};
  $('#es-reset').onclick=()=>{cfg={single:20,multiple:10,judge:10,blank:5,showExplain:false};LS.del('examCfg');renderExamSetup();};
  $('#es-start').onclick=()=>{
    const total=cfg.single+cfg.multiple+cfg.judge+cfg.blank;
    if(total===0){alert('请至少选择一道题');return;}
    LS.set('examCfg',cfg);
    const queue=[];
    ['single','multiple','judge','blank'].forEach(t=>queue.push(...A.shuffle(INDEX.byType[t]).slice(0,cfg[t])));
    A.__startQuiz(A.shuffle(queue),'模拟考试','模拟考试',{
      showExplain:cfg.showExplain,
      onExit:()=>{ if(window.__renderExamSetup) window.__renderExamSetup(); showPage('exam-setup',{root:true}); }
    });
  };
}

window.__renderExamSetup=renderExamSetup;
function boot(){
  renderExamSetup();
  if(window.__app2&&window.__app2.renderHome) window.__app2.renderHome();
  showPage('home',{root:true});
  A.initTopbar();
  if(A.startBgm) A.startBgm();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
window.__exam={renderExamSetup};
})();
