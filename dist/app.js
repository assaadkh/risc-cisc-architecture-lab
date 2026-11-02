const PRESETS={
  sum:{hint:'Accumulate four values from memory and store the result.',memory:[7,12,5,9,0,0],risc:[
    ['LOAD R1, [0]','Load first word into R1',2,4,['address','memory read','register write']],
    ['LOAD R2, [1]','Load second word into R2',2,4,['address','memory read','register write']],
    ['ADD R1, R1, R2','Add registers R1 and R2',1,4,['register read','ALU add','register write']],
    ['LOAD R2, [2]','Load third word into R2',2,4,['address','memory read','register write']],
    ['ADD R1, R1, R2','Accumulate the third value',1,4,['register read','ALU add','register write']],
    ['LOAD R2, [3]','Load fourth word into R2',2,4,['address','memory read','register write']],
    ['ADD R1, R1, R2','Finish the accumulation',1,4,['register read','ALU add','register write']],
    ['STORE R1, [4]','Write the sum back to memory',2,4,['register read','address','memory write']],
    ['HALT','Stop the processor',1,4,['control stop']]],
   cisc:[
    ['MOV EAX, [0]','Load the first value into EAX',3,5,['decode','address','memory read','register write']],
    ['ADD EAX, [1]','Add a memory operand directly',3,6,['decode','address','memory read','ALU add','register write']],
    ['ADD EAX, [2]','Add another memory operand',3,6,['decode','address','memory read','ALU add','register write']],
    ['ADD EAX, [3]','Add the final memory operand',3,6,['decode','address','memory read','ALU add','register write']],
    ['MOV [4], EAX','Store the accumulated result',3,5,['decode','address','register read','memory write']],
    ['HLT','Stop the processor',1,1,['control stop']]]},
  memadd:{hint:'Add a memory value to a register: explicit LW + ADD in RISC versus a single memory-operand ADD in CISC.',memory:[42,19,0,0,0,0],risc:[
    ['LOAD R1, [0]','Initialize R1 with 42 from memory[0]',2,4,['address','memory read','register write']],
    ['LOAD R2, [1]','Explicitly load memory[1] (19) into R2',2,4,['address','memory read','register write']],
    ['ADD R1, R1, R2','Register-to-register ALU addition: 42 + 19 = 61',1,4,['register read','ALU add','register write']],
    ['STORE R1, [2]','Explicitly store result 61 to memory[2]',2,4,['register read','address','memory write']],
    ['HALT','Stop the processor',1,4,['control stop']]],
   cisc:[
    ['MOV EAX, [0]','Load initial value 42 into EAX',3,5,['decode','address','memory read','register write']],
    ['ADD EAX, [1]','Read memory[1] and add to EAX in one instruction',3,6,['decode','address','memory read','ALU add','register write']],
    ['MOV [2], EAX','Store result 61 back to memory[2]',3,5,['decode','address','register read','memory write']],
    ['HLT','Stop the processor',1,1,['control stop']]]},
  expression:{hint:'Compute (A + B) × C and store the result.',memory:[8,4,3,0,0,0],risc:[
    ['LOAD R1, [0]','Load A',2,4,['address','memory read','register write']],['LOAD R2, [1]','Load B',2,4,['address','memory read','register write']],['ADD R1, R1, R2','Compute A + B',1,4,['register read','ALU add','register write']],['LOAD R2, [2]','Load C',2,4,['address','memory read','register write']],['MUL R1, R1, R2','Multiply the intermediate result by C',3,4,['register read','ALU multiply','register write']],['STORE R1, [3]','Store the result',2,4,['register read','address','memory write']],['HALT','Stop the processor',1,4,['control stop']]],
   cisc:[['MOV EAX, [0]','Load A',3,5,['decode','address','memory read','register write']],['ADD EAX, [1]','Add B directly from memory',3,6,['decode','address','memory read','ALU add','register write']],['IMUL EAX, [2]','Multiply by a memory operand',5,6,['decode','address','memory read','ALU multiply','register write']],['MOV [3], EAX','Store the result',3,5,['decode','address','register read','memory write']],['HLT','Stop the processor',1,1,['control stop']]]},
  copy:{hint:'Copy four words from addresses 0–3 into addresses 4–7.',memory:[21,34,55,89,0,0,0,0],risc:[
    ['LOAD R1, [0]','Load source word 0',2,4,['address','memory read','register write']],['STORE R1, [4]','Store destination word 0',2,4,['register read','address','memory write']],['LOAD R1, [1]','Load source word 1',2,4,['address','memory read','register write']],['STORE R1, [5]','Store destination word 1',2,4,['register read','address','memory write']],['LOAD R1, [2]','Load source word 2',2,4,['address','memory read','register write']],['STORE R1, [6]','Store destination word 2',2,4,['register read','address','memory write']],['LOAD R1, [3]','Load source word 3',2,4,['address','memory read','register write']],['STORE R1, [7]','Store destination word 3',2,4,['register read','address','memory write']],['HALT','Stop the processor',1,4,['control stop']]],
   cisc:[['MOV ECX, 4','Initialize repeat counter',1,5,['decode','immediate','register write']],['MOV ESI, 0','Point ESI at the source',1,5,['decode','immediate','register write']],['MOV EDI, 4','Point EDI at the destination',1,5,['decode','immediate','register write']],['REP MOVSW','Copy four words using a repeated complex instruction',12,2,['decode','repeat','memory read','memory write','index update']],['HLT','Stop the processor',1,1,['control stop']]]}
};

const STAGES={risc:['IF','ID','EX','MEM','WB'],cisc:['FETCH','DECODE','µOP','EXEC','RETIRE']};
const stageNames={risc:['Fetch','Decode','Execute','Memory','Writeback'],cisc:['Fetch','Variable decode','Microcode','Execute','Retire']};
const regNames={risc:['R0','R1','R2','R3','R4','R5','SP','PC'],cisc:['EAX','EBX','ECX','EDX','ESI','EDI','ESP','EIP']};
let selected='sum',running=false,timer=null,speed=620,stepCount=0;
let states={};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

function freshState(arch){return{arch,pc:0,cycles:0,executed:0,bytes:0,regs:Object.fromEntries(regNames[arch].map(n=>[n,0])),memory:[...PRESETS[selected].memory],done:false,lastReg:null,lastMem:null}}
function machine(arch){return document.querySelector(`[data-machine="${arch}"]`)}
function program(arch){return PRESETS[selected][arch]}
function editorText(arch){return program(arch).map((x,i)=>`${String(i).padStart(2,'0')}  ${x[0]}`).join('\n')}

function reset(){stop();stepCount=0;states={risc:freshState('risc'),cisc:freshState('cisc')};['risc','cisc'].forEach(a=>{const root=machine(a);root.querySelector('[data-role="editor"]').value=editorText(a);root.querySelector('[data-role="current"]').textContent='— waiting —';root.querySelector('[data-role="explain"]').textContent='Press Step or Run to begin execution.';root.querySelector('[data-role="microops"]').innerHTML='';root.querySelector('[data-role="pc"]').textContent='PC 0x00';root.querySelector('[data-role="pipe-status"]').textContent='IDLE';root.querySelector('[data-role="hazard"]').textContent=a==='risc'?'No active hazard':'Microcode sequencer inactive'});renderAll();$('#globalStatus').textContent='Ready'}

function renderAll(){renderMachine('risc');renderMachine('cisc');renderVerdict()}
function renderMachine(arch){const s=states[arch],root=machine(arch);['instructions','cycles','bytes'].forEach(k=>root.querySelector(`[data-metric="${k}"]`).textContent=k==='instructions'?s.executed:s[k]);root.querySelector('[data-metric="cpi"]').textContent=s.executed?(s.cycles/s.executed).toFixed(2):'—';
  root.querySelector('[data-role="registers"]').innerHTML=regNames[arch].map(n=>`<div class="reg ${s.lastReg===n?'changed':''}"><span>${n}</span><b>0x${(s.regs[n]>>>0).toString(16).padStart(4,'0').toUpperCase()}</b></div>`).join('');
  root.querySelector('[data-role="memory"]').innerHTML=s.memory.map((v,i)=>`<div class="mem-cell ${s.lastMem===i?'changed':''}"><span>[${i}]</span><b>${v}</b></div>`).join('');
  const idx=Math.min(s.pc,program(arch).length-1);root.querySelector('[data-role="pipeline"]').innerHTML=STAGES[arch].map((st,i)=>`<div class="stage ${s.done?'done':i===Math.min(idx%5,4)?'active':i<idx%5?'done':''}"><b>${st}</b><small>${stageNames[arch][i]}</small></div>`).join('')}

function execute(arch){const s=states[arch],p=program(arch);if(s.done||s.pc>=p.length){s.done=true;return}const [asm,explain,cycles,bytes,micro]=p[s.pc];const memoryOp=/LOAD|STORE|\[[0-9]+\]|MOVSW/.test(asm);const cachePenalty=!$('#cacheToggle').checked&&memoryOp?2:0;const actualCycles=cycles+cachePenalty;s.lastReg=s.lastMem=null;applySemantics(s,asm);s.executed++;s.cycles+=actualCycles;s.bytes+=bytes;s.pc++;if(/HALT|HLT/.test(asm)||s.pc>=p.length)s.done=true;const root=machine(arch);root.querySelector('[data-role="current"]').textContent=asm;root.querySelector('[data-role="explain"]').textContent=explain+(cachePenalty?' L1 disabled: +2 memory-wait cycles.':'');root.querySelector('[data-role="microops"]').innerHTML=micro.map(x=>`<span>${x}</span>`).join('');root.querySelector('[data-role="pc"]').textContent=`PC 0x${(s.pc*(arch==='risc'?4:3)).toString(16).padStart(2,'0').toUpperCase()}`;root.querySelector('[data-role="pipe-status"]').textContent=s.done?'HALTED':`${actualCycles} CYCLE${actualCycles>1?'S':''}`;
  const hazard=$('#hazardToggle').checked&&arch==='risc'&&/ADD|MUL/.test(asm);root.querySelector('[data-role="hazard"]').textContent=hazard?'RAW dependency resolved by forwarding':arch==='cisc'&&micro.length>3?`${micro.length} internal micro-operations issued`:'No structural stall';root.querySelector('[data-role="hazard"]').classList.toggle('warn',hazard)}

function applySemantics(s,asm){const nums=[...asm.matchAll(/\[(\d+)\]/g)].map(m=>+m[1]);const reg=(n,v)=>{s.regs[n]=v;s.lastReg=n};
  if(s.arch==='risc'){
    let m;if((m=asm.match(/^LOAD (R\d), \[(\d+)\]/)))reg(m[1],s.memory[+m[2]]||0);else if((m=asm.match(/^STORE (R\d), \[(\d+)\]/))){s.memory[+m[2]]=s.regs[m[1]];s.lastMem=+m[2]}else if((m=asm.match(/^ADD (R\d), (R\d), (R\d)/)))reg(m[1],s.regs[m[2]]+s.regs[m[3]]);else if((m=asm.match(/^MUL (R\d), (R\d), (R\d)/)))reg(m[1],s.regs[m[2]]*s.regs[m[3]])
  }else{
    let m;if((m=asm.match(/^MOV (E\w+), \[(\d+)\]/)))reg(m[1],s.memory[+m[2]]||0);else if((m=asm.match(/^MOV \[(\d+)\], (E\w+)/))){s.memory[+m[1]]=s.regs[m[2]];s.lastMem=+m[1]}else if((m=asm.match(/^MOV (E\w+), (\d+)/)))reg(m[1],+m[2]);else if((m=asm.match(/^ADD (E\w+), \[(\d+)\]/)))reg(m[1],s.regs[m[1]]+(s.memory[+m[2]]||0));else if((m=asm.match(/^IMUL (E\w+), \[(\d+)\]/)))reg(m[1],s.regs[m[1]]*(s.memory[+m[2]]||0));else if(asm==='REP MOVSW'){for(let i=0;i<s.regs.ECX;i++)s.memory[s.regs.EDI+i]=s.memory[s.regs.ESI+i];s.lastMem=s.regs.EDI+s.regs.ECX-1;reg('ESI',s.regs.ESI+s.regs.ECX);s.regs.EDI+=s.regs.ECX;s.regs.ECX=0}
  }}

function step(){if(states.risc.done&&states.cisc.done){stop();return}execute('risc');execute('cisc');stepCount++;renderAll();$('#globalStatus').textContent=states.risc.done&&states.cisc.done?'Complete':`Step ${stepCount}`;if(states.risc.done&&states.cisc.done)stop(true)}
function run(){if(states.risc.done&&states.cisc.done)reset();running=!running;$('#runBtn').textContent=running?'Ⅱ':'▶';$('#globalStatus').textContent=running?'Running':'Paused';if(running)timer=setInterval(step,speed);else clearInterval(timer)}
function stop(completed=false){running=false;clearInterval(timer);timer=null;$('#runBtn').textContent='▶';if(completed)$('#globalStatus').textContent='Complete'}
function renderVerdict(){const r=states.risc,c=states.cisc,maxC=Math.max(r.cycles,c.cycles,1),maxB=Math.max(r.bytes,c.bytes,1);$('#riscCycleBar').style.width=`${r.cycles/maxC*70}%`;$('#ciscCycleBar').style.width=`${c.cycles/maxC*70}%`;$('#riscByteBar').style.width=`${r.bytes/maxB*70}%`;$('#ciscByteBar').style.width=`${c.bytes/maxB*70}%`;if(!r.executed&&!c.executed)return;if(r.done&&c.done){const faster=r.cycles<c.cycles?'RISC completes in fewer modeled cycles':r.cycles>c.cycles?'CISC completes in fewer modeled cycles':'Both complete in the same cycles';$('#verdictTitle').textContent=faster;$('#verdictText').textContent=`RISC: ${r.executed} instructions, ${r.cycles} cycles, ${r.bytes} bytes. CISC: ${c.executed} instructions, ${c.cycles} cycles, ${c.bytes} bytes. Lower instruction count does not automatically mean lower latency.`}else{$('#verdictTitle').textContent='Comparison in progress';$('#verdictText').textContent=`RISC has retired ${r.executed} instruction${r.executed!==1?'s':''}; CISC has retired ${c.executed}. Watch both total work and instruction complexity.`}}

$('#presetSelect').addEventListener('change',e=>{selected=e.target.value;$('#presetHint').textContent=PRESETS[selected].hint;reset()});$('#resetBtn').onclick=reset;$('#stepBtn').onclick=step;$('#runBtn').onclick=run;$('#speedRange').oninput=e=>{const speeds=[1200,850,620,390,220];speed=speeds[e.target.value-1];$('#speedOut').textContent=['0.5×','0.75×','1.0×','1.5×','2.0×'][e.target.value-1];if(running){clearInterval(timer);timer=setInterval(step,speed)}};$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');

const tourData=[
  ['Choose the workload','Start with any of the four equivalent programs (Sum, Memory Add, Expression, or Block Copy). Each preset loads matching data into both machines.'],
  ['Step & compare in lockstep','Step once to inspect a single instruction, or Run to watch RISC (ARM/RISC-V style) and CISC (x86 style) execute side by side.'],
  ['Explore the 3D Silicon Core & Journey','Scroll to the 3D Core Cutaway or click BEGIN 3D JOURNEY to stand at the hardware bench, press the 3D controller switches, and ride beside the silicon bus traces.'],
  ['Read the trade-off','Compare instructions, cycles, CPI, and code bytes across the simulator, flowcharts, and reference matrix—no architecture wins every dimension.']
];
let tourIndex=0;function showTour(){tourIndex=0;updateTour();$('#tour').hidden=false}function updateTour(){const [t,p]=tourData[tourIndex];$('#tourStep').textContent=`0${tourIndex+1} / 04`;$('#tourTitle').textContent=t;$('#tourText').textContent=p;$$('.tour-dots i').forEach((x,i)=>x.classList.toggle('active',i===tourIndex));$('#tourNext').textContent=tourIndex===3?'Open simulator ↓':'Next →'}$('#tourBtn').onclick=showTour;$('#tourClose').onclick=()=>$('#tour').hidden=true;$('#tourNext').onclick=()=>{if(tourIndex===3){$('#tour').hidden=true;location.hash='simulator'}else{tourIndex++;updateTour()}};

const quiz=[
  {q:'Which design typically uses fixed-length instructions?',a:['RISC','CISC','Both always do'],correct:0,why:'RISC instruction formats are usually fixed (such as 32 bits) with regular field positions, simplifying fetch and decode.'},
  {q:'Why can CISC achieve better code density?',a:['It has fewer registers','One instruction can encode more work','Its clock is always faster'],correct:1,why:'Variable-length, expressive instructions can combine address calculation, memory access, and arithmetic in fewer program bytes.'},
  {q:'What does a modern CISC core often do internally?',a:['Translate instructions into micro-ops','Remove its pipeline','Avoid registers entirely'],correct:0,why:'Modern x86-style cores decode complex instructions into smaller RISC-like internal micro-operations (µops) for pipelined out-of-order execution.'},
  {q:'In a load–store RISC architecture, which instructions access data memory?',a:['Every ALU instruction','Only explicit load and store commands','Only branch instructions'],correct:1,why:'Arithmetic and logical instructions operate strictly on registers; only dedicated load/store commands read or write data memory.'},
  {q:'What is the purpose of Register Renaming and the Reorder Buffer (ROB)?',a:['To eliminate false register dependencies while committing results in program order','To slow down the clock','To replace the instruction cache'],correct:0,why:'Renaming maps architectural registers onto a larger pool of physical registers for out-of-order execution, while the ROB retires instructions in order.'},
  {q:'Why does executing fewer architectural instructions not automatically make a program faster?',a:['Because CPU time depends on Instructions × CPI × Clock Period','Because memory is infinitely fast','Because compilers ignore instruction count'],correct:0,why:'Complex instructions may require more cycles per instruction (CPI) or deeper decoding; true performance depends on the product of instruction count, CPI, and clock cycle time.'}
];
let qi=0, quizAnswers=new Array(quiz.length).fill(null);
function renderQuiz(){
  const q=quiz[qi];
  const score=quizAnswers.reduce((acc,ans,idx)=>acc+(ans===quiz[idx].correct?1:0),0);
  const answeredCount=quizAnswers.filter(x=>x!==null).length;
  $('#quizProgress').textContent=`${qi+1} / ${quiz.length}`;
  if($('#quizScore'))$('#quizScore').textContent=`SCORE ${score} / ${quiz.length}`;
  if($('#quizDots')){
    $('#quizDots').innerHTML=quiz.map((_,idx)=>{
      const st=quizAnswers[idx]===null?'':(quizAnswers[idx]===quiz[idx].correct?'answered-ok':'answered-err');
      return `<button type="button" class="${idx===qi?'active':''} ${st}" data-qidx="${idx}" aria-label="Question ${idx+1}"></button>`;
    }).join('');
    $$('#quizDots button').forEach(b=>b.onclick=()=>{qi=+b.dataset.qidx;renderQuiz()});
  }
  $('#quizQuestion').textContent=q.q;
  const prevAns=quizAnswers[qi];
  $('#quizOptions').innerHTML=q.a.map((x,i)=>{
    const cls=prevAns===null?'':(i===q.correct?'correct':(i===prevAns?'wrong':''));
    return `<button class="${cls}" ${prevAns!==null?'disabled':''} data-i="${i}">${String.fromCharCode(65+i)}. ${x}</button>`;
  }).join('');
  $$('#quizOptions button').forEach(b=>b.onclick=()=>answerQuiz(+b.dataset.i));
  if(prevAns!==null){
    $('#quizFeedback').textContent=(prevAns===q.correct?'Correct — ':'Not quite — ')+q.why;
    $('#nextQuestion').hidden=false;
    $('#nextQuestion').textContent=qi===quiz.length-1?'Review from Q1 →':'Next question →';
    if($('#restartQuiz'))$('#restartQuiz').hidden=answeredCount<quiz.length;
  }else{
    $('#quizFeedback').textContent='';
    $('#nextQuestion').hidden=true;
    if($('#restartQuiz'))$('#restartQuiz').hidden=answeredCount===0;
  }
}
function answerQuiz(i){
  quizAnswers[qi]=i;
  renderQuiz();
}
$('#nextQuestion').onclick=()=>{qi=(qi+1)%quiz.length;renderQuiz()};
if($('#restartQuiz'))$('#restartQuiz').onclick=()=>{qi=0;quizAnswers=new Array(quiz.length).fill(null);renderQuiz()};
reset();renderQuiz();

// Detailed single-instruction datapath explorer.
const DEEP_COMMANDS={
  risc:[
    {id:'r-add',asm:'ADD R3, R1, R2',short:'Register arithmetic',purpose:'Add the values in R1 and R2, then write the result to R3.',hex:'0x002081B3 · 32 bits',fields:[['funct7','0000000',22],['rs2','00010',16],['rs1','00001',16],['funct3','000',10],['rd','00011',16],['opcode','0110011',20]],length:'32 bits · fixed',uops:'5 pipeline phases',memory:'1 instruction fetch',takeaway:'The ADD instruction is regular and pipeline-friendly: decode fields sit in fixed positions and no data-memory access is required.',units:{pc:'0x0040',imem:'read 32 bits',decode:'opcode → ALU add',regs:'R1=7 · R2=12',alu:'7 + 12 = 19',memory:'no access',writeback:'R3 ← 19'},state:[['R1','7','7'],['R2','12','12'],['R3','0','19'],['PC','0x0040','0x0044']],phases:[
      ['Fetch','Fetch the instruction','The program counter supplies address 0x0040. Instruction memory returns the 32-bit ADD encoding while the next sequential PC is prepared.','0x002081B3',['InstrRead','PC+4'],['pc','imem'],['pc-imem']],
      ['Decode','Decode fixed fields','The decoder reads opcode 0110011, identifies an integer register operation, and selects R1, R2, and destination R3.','op=0110011',['RegRead','ALUSrc=REG'],['decode'],['imem-decode']],
      ['Read regs','Read both operands','The register file places R1=7 and R2=12 onto its two read ports during the same phase.','A=7 · B=12',['ReadA','ReadB'],['regs'],['decode-regs']],
      ['Execute','Perform the addition','The ALU receives both register values. ALUControl=ADD produces 19; no data-memory request is generated.','7 + 12 = 19',['ALUOp=ADD','MemRead=0'],['alu'],['regs-alu','decode-alu']],
      ['Writeback','Commit the result','RegWrite is asserted on the rising clock edge. The value 19 becomes architecturally visible in R3.','R3 ← 19',['RegWrite','rd=R3'],['writeback','regs'],['alu-writeback','writeback-regs']]]},
    {id:'r-load',asm:'LW R4, 8(R1)',short:'Load from memory',purpose:'Add offset 8 to base register R1, read one word, and place it in R4.',hex:'0x0080A203 · 32 bits',fields:[['imm[11:0]','000000001000',31],['rs1','00001',15],['funct3','010',10],['rd','00100',15],['opcode','0000011',20]],length:'32 bits · fixed',uops:'5 pipeline phases',memory:'1 fetch + 1 data read',takeaway:'RISC separates address calculation and memory access from arithmetic. LW is the dedicated data-transfer instruction.',units:{pc:'0x0044',imem:'read 32 bits',decode:'opcode → load word',regs:'R1=1000',alu:'1000 + 8 = 1008',memory:'MEM[1008] → 42',writeback:'R4 ← 42'},state:[['R1','1000','1000'],['R4','0','42'],['MAR','—','1008'],['PC','0x0044','0x0048']],phases:[
      ['Fetch','Fetch the load','The PC selects the next 32-bit instruction from instruction memory.','0x0080A203',['InstrRead','PC+4'],['pc','imem'],['pc-imem']],
      ['Decode','Extract base and offset','The decoder sign-extends immediate 8, selects base R1, and enables the load-word control path.','base=R1 · imm=8',['ImmGen','RegRead'],['decode','regs'],['imem-decode','decode-regs']],
      ['Address','Calculate effective address','The ALU adds R1=1000 and the sign-extended offset 8 to produce address 1008.','1000 + 8 = 1008',['ALUSrc=IMM','ALUOp=ADD'],['alu'],['regs-alu','decode-alu']],
      ['Memory','Read data memory','MemRead is asserted. The word stored at address 1008 is returned as 42.','MEM[1008] = 42',['MemRead','Width=WORD'],['memory'],['alu-memory']],
      ['Writeback','Write the loaded word','The memory result, rather than the ALU result, is selected and committed to destination R4.','R4 ← 42',['MemToReg','RegWrite'],['writeback','regs'],['memory-writeback','writeback-regs']]]},
    {id:'r-store',asm:'SW R2, 12(R1)',short:'Store to memory',purpose:'Calculate R1 + 12 and write the value from R2 into that memory address.',hex:'0x0020A623 · 32 bits',fields:[['imm[11:5]','0000000',22],['rs2','00010',16],['rs1','00001',16],['funct3','010',10],['imm[4:0]','01100',16],['opcode','0100011',20]],length:'32 bits · fixed',uops:'5 pipeline phases',memory:'1 fetch + 1 data write',takeaway:'The store keeps source data in a register and uses the ALU only to form the effective address.',units:{pc:'0x0048',imem:'read 32 bits',decode:'opcode → store word',regs:'R1=1000 · R2=12',alu:'1000 + 12 = 1012',memory:'MEM[1012] ← 12',writeback:'no register write'},state:[['R1','1000','1000'],['R2','12','12'],['MEM[1012]','0','12'],['PC','0x0048','0x004C']],phases:[
      ['Fetch','Fetch the store','Instruction memory returns the fixed-width SW encoding selected by the PC.','0x0020A623',['InstrRead','PC+4'],['pc','imem'],['pc-imem']],
      ['Decode','Recover split immediate','The decoder joins the two immediate fields into offset 12 and selects R1 and R2.','base=R1 · data=R2',['ImmGen','ReadA','ReadB'],['decode','regs'],['imem-decode','decode-regs']],
      ['Address','Calculate destination','The ALU adds base 1000 and offset 12, producing data-memory address 1012.','1000 + 12 = 1012',['ALUSrc=IMM','ALUOp=ADD'],['alu'],['regs-alu','decode-alu']],
      ['Memory','Write the word','MemWrite and the word byte-mask are asserted. R2=12 travels to data memory at address 1012.','MEM[1012] ← 12',['MemWrite','Width=WORD'],['memory'],['alu-memory']],
      ['Complete','Finish without writeback','A store changes memory, not a destination register. The instruction retires after the write is accepted.','store committed',['RegWrite=0','Retire'],['writeback'],['memory-writeback']]]},
    {id:'r-branch',asm:'BEQ R1, R2, +16',short:'Conditional branch',purpose:'Compare R1 and R2. If equal, replace the sequential PC with PC + 16.',hex:'0x00208863 · 32 bits',fields:[['imm','0000000',20],['rs2','00010',15],['rs1','00001',15],['funct3','000',10],['offset','10000',15],['opcode','1100011',20]],length:'32 bits · fixed',uops:'5 pipeline phases',memory:'1 instruction fetch',takeaway:'Branches introduce control hazards: the fetch unit may need to discard a sequential instruction when the branch is taken.',units:{pc:'0x0050',imem:'read 32 bits',decode:'opcode → compare',regs:'R1=12 · R2=12',alu:'12 − 12 = 0',memory:'no access',writeback:'PC ← 0x0060'},state:[['R1','12','12'],['R2','12','12'],['Zero','0','1'],['PC','0x0050','0x0060']],phases:[
      ['Fetch','Fetch branch and predict','The sequential instruction at PC+4 may be fetched while this branch begins decoding.','0x00208863',['InstrRead','PredictNT'],['pc','imem'],['pc-imem']],
      ['Decode','Read comparison operands','The opcode selects branch control. R1 and R2 are read and the branch offset is reconstructed.','R1=12 · R2=12',['Branch','ReadA','ReadB'],['decode','regs'],['imem-decode','decode-regs']],
      ['Compare','Test equality','The ALU subtracts 12−12. A zero result asserts the equality condition.','Zero=1',['ALUOp=SUB','ZeroTest'],['alu'],['regs-alu','decode-alu']],
      ['Target','Calculate branch target','The branch unit adds the signed offset 16 to the branch PC, producing target 0x0060.','0x0050 + 16',['TargetAdd','PCSrc=BRANCH'],['alu','pc'],['alu-writeback']],
      ['Redirect','Update PC and flush','Because equality is true, PC becomes 0x0060. Any wrong-path sequential fetch is invalidated.','PC ← 0x0060',['PCWrite','FlushIF'],['writeback','pc'],['writeback-regs']]]}
  ],
  cisc:[
    {id:'c-mov',asm:'MOV EAX, [0x1000]',short:'Memory-to-register move',purpose:'Decode a variable-length address, read memory, and load the value into EAX.',hex:'A1 00 10 00 00 · 5 bytes',fields:[['opcode','A1',24],['address','00 10 00 00',76]],length:'5 bytes · variable',uops:'4 decoded µops',memory:'variable fetch + data read',takeaway:'One compact assembly command hides instruction-length detection, address decoding, and several internal micro-operations.',units:{pc:'0x004000',imem:'fetch 5 bytes',decode:'A1 + 32-bit address',regs:'EAX=0',alu:'linear addr 0x1000',memory:'MEM[0x1000] → 42',writeback:'EAX ← 42'},state:[['EAX','0','42'],['MAR','—','0x1000'],['µops','0','4'],['EIP','0x004000','0x004005']],phases:[
      ['Fetch','Find instruction boundaries','The front end fetches a byte window, recognizes one-byte opcode A1, then collects the following four address bytes.','A1 00 10 00 00',['ByteFetch','Length=5'],['pc','imem'],['pc-imem']],
      ['Decode','Translate into micro-ops','Complex decode turns MOV into address-generation, memory-load, and register-write micro-operations.','3 execution µops',['VarDecode','µcodeEntry'],['decode'],['imem-decode']],
      ['Address','Generate linear address','The address-generation unit forms linear address 0x1000. A real x86 core would also apply segmentation and paging.','linear=0x1000',['AGU','LoadBuffer'],['regs','alu'],['decode-regs','regs-alu']],
      ['Memory','Read through the cache','The load micro-op requests 32 bits. The cache/memory subsystem returns value 42.','[0x1000] = 42',['MemRead','Width=32'],['memory'],['alu-memory']],
      ['Retire','Commit EAX in order','The retirement unit makes EAX=42 architecturally visible and advances EIP by five bytes.','EAX ← 42',['RegWrite','Retire'],['writeback','regs'],['memory-writeback','writeback-regs']]]},
    {id:'c-add',asm:'ADD EAX, [0x1004]',short:'Arithmetic with memory',purpose:'Read a memory operand, add it directly to EAX, and update the condition flags.',hex:'03 05 FE 0F 00 00 · 6 bytes',fields:[['opcode','03',18],['ModR/M','05',18],['disp32','FE 0F 00 00',64]],length:'6 bytes · variable',uops:'5 decoded µops',memory:'variable fetch + data read',takeaway:'The assembly instruction appears to add memory directly, but internally it splits into address, load, ALU, flags, and retirement work.',units:{pc:'0x004005',imem:'fetch 6 bytes',decode:'03 /r + ModR/M',regs:'EAX=42',alu:'42 + 8 = 50',memory:'MEM[0x1004] → 8',writeback:'EAX ← 50 · ZF=0'},state:[['EAX','42','50'],['ZF','1','0'],['CF','0','0'],['EIP','0x004005','0x00400B']],phases:[
      ['Fetch','Fetch variable bytes','The length decoder identifies opcode, ModR/M byte, and 32-bit displacement across six bytes.','03 05 FE 0F 00 00',['ByteFetch','Length=6'],['pc','imem'],['pc-imem']],
      ['Decode','Expand the command','The decoder emits address-generation, load, integer-add, flags, and retirement micro-operations.','5 µops',['VarDecode','Rename'],['decode'],['imem-decode']],
      ['Load','Resolve the memory operand','The address unit resolves 0x1004 and the load unit obtains the value 8 from cache or memory.','[0x1004] = 8',['AGU','MemRead'],['regs','alu','memory'],['decode-regs','regs-alu','alu-memory']],
      ['Execute','Add and calculate flags','The integer unit adds EAX=42 and loaded value 8. It computes result 50 and updates ZF, SF, OF, and CF.','42 + 8 = 50',['ALUOp=ADD','FlagsWrite'],['alu'],['memory-writeback']],
      ['Retire','Commit result and flags','The reorder buffer retires the instruction in program order. EAX and condition flags become visible together.','EAX ← 50 · ZF=0',['RegWrite','EFLAGSWrite','Retire'],['writeback','regs'],['alu-writeback','writeback-regs']]]},
    {id:'c-rep',asm:'REP MOVSD',short:'Repeated memory copy',purpose:'Copy ECX doublewords from [ESI] to [EDI], updating both indexes after every transfer.',hex:'F3 A5 · 2 bytes',fields:[['prefix','F3',50],['opcode','A5',50]],length:'2 bytes · variable',uops:'microcoded loop',memory:'1 fetch + 8 data transfers',takeaway:'Two instruction bytes can describe an entire loop. Modern implementations may use a specialized string-copy engine rather than literally repeating one µop at a time.',units:{pc:'0x00400B',imem:'fetch 2 bytes',decode:'REP prefix + MOVSD',regs:'ECX=4 · ESI=1000 · EDI=2000',alu:'indexes + 4 each loop',memory:'4 reads + 4 writes',writeback:'ECX=0 · ESI=1016 · EDI=2016'},state:[['ECX','4','0'],['ESI','1000','1016'],['EDI','2000','2016'],['bytes copied','0','16']],phases:[
      ['Fetch','Fetch prefix and opcode','The decoder recognizes F3 as the REP prefix modifying the following A5 string-move opcode.','F3 A5',['ByteFetch','Length=2'],['pc','imem'],['pc-imem']],
      ['Decode','Enter the repeat engine','Control forms a microcoded loop: load [ESI], store [EDI], update indexes, decrement ECX, and test for repetition.','repeat while ECX≠0',['µcodeEntry','LoopEnable'],['decode','regs'],['imem-decode','decode-regs']],
      ['Read','Load a source element','The first iteration reads a 32-bit doubleword from the address in ESI.','value ← MEM[1000]',['MemRead','Width=32'],['alu','memory'],['regs-alu','alu-memory']],
      ['Write/loop','Store and update state','The value is written to [EDI]. ESI and EDI advance by four, ECX decrements, and the engine repeats four times.','4 transfers × 4 B',['MemWrite','IndexAdd','CountDec'],['memory','alu'],['memory-writeback','writeback-regs']],
      ['Retire','Expose final indexes','After ECX reaches zero, the instruction retires once with all memory writes and final index values committed.','ECX=0 · copied=16 B',['Retire','EIPWrite'],['writeback','regs'],['alu-writeback','writeback-regs']]]},
    {id:'c-push',asm:'PUSH EAX',short:'Stack operation',purpose:'Decrease the stack pointer and store EAX at the new top of the stack.',hex:'50 · 1 byte',fields:[['opcode + reg','01010 000',100]],length:'1 byte · variable',uops:'3 decoded µops',memory:'1 fetch + data write',takeaway:'A single-byte command combines arithmetic on ESP with a memory write—an example of dense implicit-operand encoding.',units:{pc:'0x00400D',imem:'fetch 1 byte',decode:'50 → PUSH EAX',regs:'EAX=50 · ESP=0x8000',alu:'ESP − 4 = 0x7FFC',memory:'MEM[0x7FFC] ← 50',writeback:'ESP ← 0x7FFC'},state:[['EAX','50','50'],['ESP','0x8000','0x7FFC'],['MEM[0x7FFC]','—','50'],['EIP','0x00400D','0x00400E']],phases:[
      ['Fetch','Fetch compact opcode','Opcode 50 encodes both the PUSH operation and EAX register identity in one byte.','50',['ByteFetch','Length=1'],['pc','imem'],['pc-imem']],
      ['Decode','Expose implicit operands','The decoder supplies implicit stack register ESP, constant decrement 4, and source EAX.','src=EAX · stack=ESP',['VarDecode','ReadEAX','ReadESP'],['decode','regs'],['imem-decode','decode-regs']],
      ['Address','Move the stack pointer','The ALU calculates the pre-decremented stack address: 0x8000−4 = 0x7FFC.','0x8000 − 4',['ALUOp=SUB','StackOp'],['alu'],['regs-alu','decode-alu']],
      ['Memory','Write the stack value','EAX=50 is stored as a 32-bit value at the newly calculated stack address.','MEM[0x7FFC] ← 50',['MemWrite','Width=32'],['memory'],['alu-memory']],
      ['Retire','Commit the new ESP','The memory store and stack-pointer update become architecturally ordered; EIP advances one byte.','ESP ← 0x7FFC',['ESPWrite','Retire'],['writeback','regs'],['memory-writeback','writeback-regs']]]}
  ]
};

let deepArch='risc',deepCommand=0,deepPhase=0,deepTimer=null;
function deepData(){return DEEP_COMMANDS[deepArch][deepCommand]}
function renderDeepCommands(){const list=$('#deepCommandList');list.innerHTML=DEEP_COMMANDS[deepArch].map((c,i)=>`<button class="${i===deepCommand?'active':''}" data-command="${i}"><code>${c.asm}</code><span>${c.short}</span></button>`).join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>{deepCommand=+b.dataset.command;deepPhase=0;stopDeep();renderDeep()})}
function renderDeep(){const d=deepData(),p=d.phases[deepPhase];$('#deep-dive').classList.toggle('cisc-mode',deepArch==='cisc');$$('[data-deep-arch]').forEach(b=>b.classList.toggle('active',b.dataset.deepArch===deepArch));$('#deepModelTitle').textContent=deepArch==='risc'?'RISC load–store model':'CISC x86-style model';$('#deepModelNote').textContent=deepArch==='risc'?'Fixed 32-bit instructions and a load–store datapath. Only explicit load/store commands access data memory.':'Variable-length instructions decoded into internal micro-operations. Some operands and state changes are implicit.';$('#deepAsm').textContent=d.asm;$('#deepAsm').style.color=deepArch==='risc'?'var(--risc)':'var(--cisc)';$('#deepPurpose').textContent=d.purpose;$('#binaryHex').textContent=d.hex;$('#binaryFields').innerHTML=d.fields.map(f=>`<i style="flex:${f[2]}"><small>${f[0]}</small><br>${f[1]}</i>`).join('');$('#phaseStrip').innerHTML=d.phases.map((x,i)=>`<div class="phase-chip ${i===deepPhase?'active':i<deepPhase?'done':''}" data-phase-idx="${i}" title="Jump to phase ${i+1}: ${x[0]}"><small>0${i+1}</small><b>${x[0]}</b></div>`).join('');$$('#phaseStrip .phase-chip').forEach(ch=>ch.onclick=()=>{deepPhase=+ch.dataset.phaseIdx;stopDeep();renderDeep()});$('#phaseTitle').textContent=p[0];$('#phaseCounter').textContent=`${deepPhase+1} / ${d.phases.length}`;$('#phaseNumber').textContent=String(deepPhase+1).padStart(2,'0');$('#phaseHeading').textContent=p[1];$('#phaseExplanation').textContent=p[2];$('#busValue').textContent=p[3];
  const allSignals=[...new Set(d.phases.flatMap(x=>x[4]))];$('#controlSignals').innerHTML=allSignals.map(x=>`<span class="${p[4].includes(x)?'on':'off'}">${x}</span>`).join('');$('#deepState').innerHTML=d.state.map(x=>`<div class="state-row"><span>${x[0]}</span><b>${x[1]}</b><i>→</i><b>${deepPhase===d.phases.length-1?x[2]:x[1]}</b></div>`).join('');
  $$('.datapath .unit').forEach(x=>{x.classList.toggle('active',p[5].includes(x.dataset.unit));x.classList.toggle('complete',false);x.classList.toggle('processing',p[5].includes(x.dataset.unit))});$$('.datapath path').forEach(x=>x.classList.toggle('active',p[6].includes(x.dataset.path)));$('#unitPc').textContent=d.units.pc;$('#unitImem').textContent=d.units.imem;$('#unitDecode').textContent=d.units.decode;$('#unitRegs').textContent=d.units.regs;$('#unitAlu').textContent=d.units.alu;$('#unitMemory').textContent=d.units.memory;$('#unitWriteback').textContent=d.units.writeback;$('#decodeUnitName').textContent=deepArch==='risc'?'CONTROL':'µCODE';$('#deepLength').textContent=d.length;$('#deepUops').textContent=d.uops;$('#deepMemAccess').textContent=d.memory;$('#deepTakeaway').innerHTML=`<strong>Takeaway:</strong> ${d.takeaway}`;$('#deepStep').innerHTML=deepPhase===d.phases.length-1?'Restart <b>↺</b>':'Next phase <b>→</b>';renderDeepCommands()}
function stopDeep(){clearInterval(deepTimer);deepTimer=null;$('#deepRun').innerHTML='Run command <b>▶</b>'}
function stepDeep(){if(deepPhase===deepData().phases.length-1){deepPhase=0;stopDeep()}else deepPhase++;renderDeep()}
$$('[data-deep-arch]').forEach(b=>b.onclick=()=>{deepArch=b.dataset.deepArch;deepCommand=0;deepPhase=0;stopDeep();renderDeep()});$('#deepStep').onclick=stepDeep;$('#deepReset').onclick=()=>{deepPhase=0;stopDeep();renderDeep()};$('#deepRun').onclick=()=>{if(deepTimer){stopDeep();return}if(deepPhase===deepData().phases.length-1)deepPhase=0;$('#deepRun').innerHTML='Pause <b>Ⅱ</b>';deepTimer=setInterval(()=>{if(deepPhase===deepData().phases.length-1){stopDeep();return}deepPhase++;renderDeep()},900)};
renderDeep();

// Animate the architecture flowcharts one decision or processor action at a time.
const flowTimers={risc:null,cisc:null};
function clearFlow(arch,keepFinal=false){const card=document.querySelector(`[data-flow-card="${arch}"]`);clearInterval(flowTimers[arch]);flowTimers[arch]=null;card.classList.remove('animating');const button=document.querySelector(`[data-flow-run="${arch}"]`);button.innerHTML=`Animate ${arch.toUpperCase()} <b>▶</b>`;if(!keepFinal)card.querySelectorAll('[data-flow-step]').forEach(n=>n.classList.remove('active','visited'))}
function showFlowStep(arch,step){const card=document.querySelector(`[data-flow-card="${arch}"]`);card.querySelectorAll('[data-flow-step]').forEach(n=>{const nStep=+n.dataset.flowStep;n.classList.toggle('active',nStep===step);n.classList.toggle('visited',nStep<step)});const active=card.querySelector(`[data-flow-step="${step}"]`);if(active&&matchMedia('(max-width: 760px)').matches)active.scrollIntoView({behavior:'smooth',block:'center'})}
function runFlow(arch){if(flowTimers[arch]){clearFlow(arch,true);return}const card=document.querySelector(`[data-flow-card="${arch}"]`),button=document.querySelector(`[data-flow-run="${arch}"]`);['risc','cisc'].filter(x=>x!==arch).forEach(x=>clearFlow(x));let step=0,max=Math.max(...[...card.querySelectorAll('[data-flow-step]')].map(n=>+n.dataset.flowStep));card.classList.add('animating');button.classList.add('running');button.innerHTML='Pause flow <b>Ⅱ</b>';showFlowStep(arch,step);flowTimers[arch]=setInterval(()=>{step++;if(step>max){clearFlow(arch,true);card.querySelectorAll('[data-flow-step]').forEach(n=>{n.classList.remove('active');n.classList.add('visited')});return}showFlowStep(arch,step)},760)}
$$('[data-flow-run]').forEach(button=>button.onclick=()=>runFlow(button.dataset.flowRun));

// 3D processor cores: animate values through architecture-specific cutaways.
const RISC_CORE_PROGRAMS={
  add:{asm:'ADD R3, R1, R2',label:'Register arithmetic',steps:[
    {unit:'pc',title:'Program counter outputs fetch address',text:'The Program Counter drives 0x0040 onto the instruction address bus while the +4 adder computes the next sequential address (0x0044) in parallel.',value:'PC = 0x0040',xy:[11,20],path:[],bits:'0000000001000000'},
    {unit:'icache',title:'L1 instruction cache returns 32-bit word',text:'L1 Instruction Cache indexes address 0x0040 and outputs the aligned 32-bit RISC instruction word (0x002081B3) in a single clock cycle.',value:'0x002081B3',xy:[30,20],path:['pc-icache'],bits:'00000000001000001000000110110011'},
    {unit:'decoder',title:'Hardwired control decodes fixed fields',text:'The Control Decoder inspects opcode 0110011 to select register arithmetic while fixed bit positions directly wire rs1=R1, rs2=R2, and rd=R3.',value:'op=0110011 · rd=R3',xy:[53,20],path:['icache-decode'],bits:'011001100011000100010010'},
    {unit:'regs',title:'Register file drives dual source operands',text:'Two independent read ports in the 32×32 Register File simultaneously read R1=7 and R2=12 and drive both 32-bit operands onto the ALU input buses.',value:'R1=7 · R2=12',xy:[80,20],path:['decode-regs'],bits:'0000011100001100'},
    {unit:'alu',title:'ALU executes 32-bit integer addition',text:'The Arithmetic Logic Unit adds operands 7 and 12 in one clock cycle to produce 19, bypassing the Data Cache stage completely.',value:'7 + 12 = 19',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000000000010011'},
    {unit:'writeback',title:'Writeback bus routes ALU result',text:'The Writeback multiplexer selects ALU result 19 and asserts RegWrite along with destination index R3.',value:'WB bus = 19',xy:[75,82],path:['alu-writeback'],bits:'0000000000010011'},
    {unit:'regs',title:'Destination register R3 latches result',text:'On the rising clock edge, write port W1 commits value 19 into architectural register R3.',value:'R3 ← 19',xy:[80,20],path:['writeback-regs'],bits:'0000000000010011'}]},
  load:{asm:'LW R4, 8(R1)',label:'Load from memory',steps:[
    {unit:'pc',title:'Program counter outputs fetch address',text:'The Program Counter drives instruction address 0x0044 onto the fetch bus to initiate the load-word instruction.',value:'PC = 0x0044',xy:[11,20],path:[],bits:'0000000001000100'},
    {unit:'icache',title:'L1 instruction cache fetches LW word',text:'L1 Instruction Cache reads address 0x0044 and returns the fixed-width 32-bit LW instruction encoding (0x0080A203).',value:'0x0080A203',xy:[30,20],path:['pc-icache'],bits:'00000000100000001010001000000011'},
    {unit:'decoder',title:'Decoder extracts base register and offset',text:'The Control Decoder extracts base register R1, destination register R4, and sign-extends the 12-bit immediate offset (+8).',value:'base=R1 · imm=8',xy:[53,20],path:['icache-decode'],bits:'000010000001010001000001'},
    {unit:'regs',title:'Register file outputs base address',text:'Read port A accesses register R1 and outputs base memory pointer 1000 onto the operand bus.',value:'R1 = 1000',xy:[80,20],path:['decode-regs'],bits:'0000001111101000'},
    {unit:'alu',title:'AGU/ALU computes effective address',text:'The ALU adds base address 1000 and sign-extended offset 8 to generate effective memory address 1008.',value:'EA = 1000 + 8 = 1008',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000001111110000'},
    {unit:'dcache',title:'L1 data cache reads word at 1008',text:'L1 Data Cache accesses address 1008 and outputs the 32-bit data word (42) onto the memory read bus.',value:'MEM[1008] = 42',xy:[81,60],path:['alu-dcache'],bits:'0000000000101010'},
    {unit:'writeback',title:'Writeback multiplexer selects memory word',text:'The Writeback stage routes loaded memory word 42 onto the register writeback bus targeting R4.',value:'load bus = 42',xy:[75,82],path:['dcache-writeback'],bits:'0000000000101010'},
    {unit:'regs',title:'Register R4 commits loaded word',text:'The Register File latches loaded value 42 into destination register R4 on the clock edge.',value:'R4 ← 42',xy:[80,20],path:['writeback-regs'],bits:'0000000000101010'}]},
  store:{asm:'SW R2, 12(R1)',label:'Store to memory',steps:[
    {unit:'pc',title:'Program counter outputs fetch address',text:'The Program Counter drives 0x0048 onto the instruction fetch bus to start the store-word operation.',value:'PC = 0x0048',xy:[11,20],path:[],bits:'0000000001001000'},
    {unit:'icache',title:'L1 instruction cache fetches SW word',text:'L1 Instruction Cache returns the 32-bit S-type store instruction word (0x0020A623).',value:'0x0020A623',xy:[30,20],path:['pc-icache'],bits:'00000000001000001010011000100011'},
    {unit:'decoder',title:'Decoder reassembles split S-type immediate',text:'The Control Decoder combines the two split immediate fields into offset +12 and asserts the MemWrite control line.',value:'base=R1 · src=R2 · off=12',xy:[53,20],path:['icache-decode'],bits:'000011000001001000100011'},
    {unit:'regs',title:'Register file reads base and store data',text:'Port A reads base pointer R1=1000 while port B simultaneously reads source data R2=12.',value:'R1=1000 · R2=12',xy:[80,20],path:['decode-regs'],bits:'000000111110100000001100'},
    {unit:'alu',title:'ALU computes target memory address',text:'The ALU adds base pointer 1000 and offset 12 to form target byte address 1012.',value:'EA = 1000 + 12 = 1012',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000001111110100'},
    {unit:'dcache',title:'L1 data cache writes R2 into MEM[1012]',text:'L1 Data Cache writes value 12 into address 1012; RegWrite remains deasserted because stores do not modify registers.',value:'MEM[1012] ← 12 (no WB)',xy:[81,60],path:['alu-dcache'],bits:'0000000000001100'}]},
  branch:{asm:'BEQ R1, R2, +16',label:'Conditional branch',steps:[
    {unit:'pc',title:'Program counter outputs branch address',text:'The Program Counter drives 0x0050 onto the fetch bus to fetch the conditional branch instruction.',value:'PC = 0x0050',xy:[11,20],path:[],bits:'0000000001010000'},
    {unit:'icache',title:'L1 instruction cache returns BEQ word',text:'L1 Instruction Cache outputs the 32-bit B-type branch encoding (0x00208863).',value:'0x00208863',xy:[30,20],path:['pc-icache'],bits:'00000000001000001000100001100011'},
    {unit:'decoder',title:'Decoder extracts branch offset and controls',text:'The Control Decoder decodes opcode 1100011, enables equality comparison, and sign-extends branch offset +16.',value:'branch · offset=+16',xy:[53,20],path:['icache-decode'],bits:'11000110001000010000'},
    {unit:'regs',title:'Register file outputs both comparands',text:'Both register read ports access R1=12 and R2=12 in parallel and drive them to the comparator/ALU.',value:'R1=12 · R2=12',xy:[80,20],path:['decode-regs'],bits:'0000110000001100'},
    {unit:'alu',title:'ALU evaluates equality condition',text:'The ALU subtracts R2 from R1 (12 − 12 = 0) and asserts the Zero condition flag (Z=1).',value:'12 − 12 = 0 · Z=1',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000000000000001'},
    {unit:'branch',title:'Branch unit computes target PC',text:'With Z=1 asserted, the Branch Unit adds PC-relative offset +16 to 0x0050 to produce branch target 0x0060.',value:'target = 0x0060',xy:[22,62],path:['alu-branch'],bits:'0000000001100000'},
    {unit:'pc',title:'Program counter latches branch target',text:'The PC multiplexer selects branch target 0x0060, redirecting instruction fetch on the next clock edge.',value:'PC ← 0x0060',xy:[11,20],path:['branch-pc'],bits:'0000000001100000'}]}
};
const CISC_CORE_PROGRAMS={
  mov:{asm:'MOV EAX, [0x1000]',label:'Memory-to-register move',steps:[
    {unit:'front',title:'Byte front end fetches 16-byte window',text:'The x86 front end fetches an aligned 16-byte instruction window from L1 I-Cache; variable instruction lengths require pre-decode boundary scan.',value:'bytes = A1 00 10 00 00',xy:[9,20],path:[],bits:'10100001000000000001000000000000'},
    {unit:'length',title:'Length decoder marks 5-byte instruction',text:'The Length Decoder scans opcode A1 plus its 32-bit direct displacement and isolates a 5-byte instruction boundary.',value:'length = 5 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000101'},
    {unit:'decodec',title:'Complex decoder translates MOV opcode',text:'The Complex Decoder cracks opcode A1 and immediate address 0x1000 into internal load and register-write operations.',value:'MOV · dst=EAX · [0x1000]',xy:[47,20],path:['c-length-decode'],bits:'1010000100010000'},
    {unit:'queue',title:'Decoded micro-ops enter µOp queue',text:'The internal RISC-like micro-operations (AGU, LOAD, REG-WRITE) are buffered in the allocation queue.',value:'AGU → LOAD → WRITE',xy:[88,20],path:['c-decode-queue'],bits:'0001001001110001'},
    {unit:'rename',title:'RAT renames EAX to physical register P37',text:'The Register Alias Table maps architectural destination EAX to physical register P37 to eliminate false write-after-write hazards.',value:'EAX → P37',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0000000000100101'},
    {unit:'sched',title:'Out-of-order scheduler dispatches load µop',text:'The Reservation Station detects that address operands are ready and dispatches the load micro-op to the Load/Store Unit.',value:'µop ready · issue LSU',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000001'},
    {unit:'lsu',title:'Load/store engine reads MEM[0x1000]',text:'The Load/Store Unit computes address 0x1000, queries L1 Data Cache, and retrieves 32-bit value 42.',value:'MEM[0x1000] = 42',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000101010'},
    {unit:'retire',title:'Reorder buffer commits EAX in order',text:'The Reorder Buffer retires the instruction in program order, committing 42 to architectural EAX and advancing EIP by 5 bytes.',value:'EAX ← 42 · EIP + 5',xy:[76,84],path:['c-lsu-retire'],bits:'0000000000101010'}]},
  addm:{asm:'ADD EAX, [0x1004]',label:'Arithmetic with memory',steps:[
    {unit:'front',title:'Byte front end fetches instruction stream',text:'The front end fetches opcode 03, ModR/M byte 05, and 4 displacement bytes from the instruction byte stream.',value:'03 05 FE 0F 00 00',xy:[9,20],path:[],bits:'00000011000001011111111000001111'},
    {unit:'length',title:'Length decoder detects 6-byte encoding',text:'ModR/M inspection identifies a 32-bit displacement following the opcode, marking a 6-byte instruction length.',value:'length = 6 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000110'},
    {unit:'decodec',title:'Complex decoder cracks fused memory-ADD',text:'One architectural CISC ADD with a memory operand is cracked into separate memory-load, integer-add, and flag-update micro-operations.',value:'5 decoded µops',xy:[47,20],path:['c-length-decode'],bits:'0000000000000101'},
    {unit:'queue',title:'Micro-op queue buffers cracked sequence',text:'The Micro-op Queue buffers the AGU, LOAD, ADD, FLAGS, and WB micro-operations for allocation.',value:'AGU · LD · ADD · FLAGS · WB',xy:[88,20],path:['c-decode-queue'],bits:'0001001010110111'},
    {unit:'rename',title:'RAT renames EAX and EFLAGS registers',text:'The Register Alias Table maps architectural EAX to physical register P38 and EFLAGS to physical flags register P9.',value:'EAX→P38 · FLAGS→P9',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0010011000001001'},
    {unit:'sched',title:'Scheduler enforces load-to-add dependency',text:'The Out-of-Order Scheduler dispatches the memory load immediately while holding the dependent ADD micro-op until data arrives.',value:'LOAD issues → ADD waits',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000010'},
    {unit:'lsu',title:'Load/store engine reads MEM[0x1004]',text:'The Load/Store Unit accesses L1 Data Cache at address 0x1004 and forwards memory operand 8 to the execution cluster.',value:'MEM[0x1004] = 8',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000001000'},
    {unit:'exec',title:'Integer ALU adds 42 + 8 and updates EFLAGS',text:'The Integer ALU adds EAX (42) and memory operand (8) to produce 50 while updating arithmetic status flags (ZF, SF, CF, OF).',value:'42 + 8 = 50 · ZF=0',xy:[70,62],path:['c-lsu-exec'],bits:'0000000000110010'},
    {unit:'retire',title:'Reorder buffer retires EAX and EFLAGS',text:'The Reorder Buffer commits both EAX=50 and EFLAGS atomically in program order and advances EIP by 6 bytes.',value:'EAX ← 50 · EIP + 6',xy:[76,84],path:['c-exec-retire'],bits:'0000000000110010'}]},
  rep:{asm:'REP MOVSD',label:'Microcoded memory loop',steps:[
    {unit:'front',title:'Byte front end fetches prefix and opcode',text:'The byte front end reads repeat prefix F3 (REP) and string-move opcode A5 (MOVSD) from the instruction stream.',value:'F3 A5',xy:[9,20],path:[],bits:'1111001110100101'},
    {unit:'length',title:'Length decoder marks 2-byte instruction',text:'The Length Decoder isolates the 2-byte prefixed instruction that encodes a complete block memory copy.',value:'length = 2 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000010'},
    {unit:'decodec',title:'Decoder traps complex op to Microcode ROM',text:'Because REP MOVSD requires multi-iteration pointer and counter updates, the Complex Decoder transfers control to the Microcode ROM sequencer.',value:'complex = 1 → µROM',xy:[47,20],path:['c-length-decode'],bits:'0000000000000001'},
    {unit:'ucode',title:'Microcode ROM sequences string-copy µops',text:'The Microcode ROM sequencer emits the internal micro-op loop: load [ESI], store [EDI], increment pointers by 4, and decrement ECX.',value:'µPC → string-copy loop',xy:[68,20],path:['c-decode-ucode'],bits:'1010110000111001'},
    {unit:'queue',title:'Micro-op queue buffers loop micro-ops',text:'The streamed micro-op sequence (LD, ST, INC, DEC, JNZ) is buffered in the Micro-op Queue.',value:'LD · ST · INC · DEC · JNZ',xy:[88,20],path:['c-ucode-queue'],bits:'0001101011010111'},
    {unit:'rename',title:'RAT maps loop pointers ESI, EDI, and ECX',text:'Register Renaming assigns physical registers to each iteration of ESI, EDI, and ECX so speculative iterations can overlap.',value:'ESI/EDI/ECX renamed',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0001010000101000'},
    {unit:'sched',title:'Scheduler dispatches 4 copy iterations',text:'The Out-of-Order Scheduler dispatches the paired memory loads, stores, and pointer updates across four iterations.',value:'4 loop iterations issued',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000100'},
    {unit:'lsu',title:'Load/store engine transfers 16 bytes',text:'The Load/Store Unit executes four 32-bit reads from [ESI] and four 32-bit writes to [EDI], copying 16 bytes across L1 Data Cache.',value:'4 × 4 B = 16 B copied',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000010000'},
    {unit:'exec',title:'Integer cluster updates ESI, EDI, and ECX',text:'The Integer ALU Cluster increments ESI and EDI by 16 bytes and decrements loop counter ECX to 0.',value:'ECX=0 · ESI+16 · EDI+16',xy:[70,62],path:['c-lsu-exec'],bits:'0000000000010000'},
    {unit:'retire',title:'Reorder buffer retires completed string copy',text:'The Reorder Buffer commits all 16 transferred bytes and the updated architectural registers (ESI, EDI, ECX=0).',value:'REP MOVSD retired',xy:[76,84],path:['c-exec-retire'],bits:'1111001110100101'}]},
  push:{asm:'PUSH EAX',label:'Implicit stack operation',steps:[
    {unit:'front',title:'Byte front end fetches 1-byte opcode',text:'The front end reads compact single-byte opcode 0x50 (PUSH EAX) from the instruction stream.',value:'byte = 50',xy:[9,20],path:[],bits:'0101000000000000'},
    {unit:'length',title:'Length decoder marks 1-byte boundary',text:'The Length Decoder immediately marks a 1-byte instruction boundary for register push opcode 0x50.',value:'length = 1 byte',xy:[28,20],path:['c-front-length'],bits:'0000000000000001'},
    {unit:'decodec',title:'Decoder expands implicit ESP stack access',text:'The Complex Decoder unpacks implicit stack pointer register ESP, stack decrement (−4), and source register EAX.',value:'ESP − 4 · store EAX',xy:[47,20],path:['c-length-decode'],bits:'0101000000000100'},
    {unit:'queue',title:'Micro-op queue buffers stack decrement & store',text:'The pointer-decrement micro-op (SUB ESP, 4) and memory-store micro-op (STORE [ESP], EAX) enter the Micro-op Queue.',value:'SUB ESP,4 → STORE [ESP]',xy:[88,20],path:['c-decode-queue'],bits:'0001010001110010'},
    {unit:'rename',title:'RAT maps stack pointer ESP to P41',text:'The Register Renamer maps updated stack pointer ESP to physical register P41.',value:'ESP → P41',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0000000000101001'},
    {unit:'sched',title:'Scheduler issues stack update and store',text:'The Out-of-Order Scheduler dispatches the ESP subtraction to the Integer ALU and the stack write to the Load/Store Unit.',value:'issue ALU + LSU',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000011'},
    {unit:'exec',title:'Integer ALU decrements ESP by 4 bytes',text:'The Integer ALU subtracts 4 from ESP (0x8000 − 4) to form new top-of-stack address 0x7FFC.',value:'ESP = 0x7FFC',xy:[70,62],path:['c-sched-exec'],bits:'0111111111111100'},
    {unit:'lsu',title:'Load/store engine writes EAX to stack',text:'The Load/Store Unit writes EAX (50) into L1 Data Cache at new top-of-stack address MEM[0x7FFC].',value:'MEM[0x7FFC] ← 50',xy:[90,62],path:['c-exec-lsu'],bits:'0000000000110010'},
    {unit:'retire',title:'Reorder buffer commits ESP and stack store',text:'The Reorder Buffer commits ESP=0x7FFC and the stack memory write in program order, advancing EIP by 1 byte.',value:'ESP ← 0x7FFC · EIP + 1',xy:[76,84],path:['c-lsu-retire'],bits:'0111111111111100'}]}
};
const CORE_PROGRAMS={risc:RISC_CORE_PROGRAMS,cisc:CISC_CORE_PROGRAMS};
let coreArch='risc',coreInstruction='add',coreStepIndex=0,coreTimer=null,coreCycle=0,coreYaw=-28,corePitch=57;
$$('.pin-row').forEach(row=>{row.innerHTML='<span></span>'.repeat(18)});
function coreProgram(){return CORE_PROGRAMS[coreArch][coreInstruction]||Object.values(CORE_PROGRAMS[coreArch])[0]}
function stopCore(){clearInterval(coreTimer);coreTimer=null;$('#coreRun').innerHTML='Run inside core <b>▶</b>'}
function updateCoreTransform(){
  $('#chipModel').style.setProperty('--coreRotate',coreYaw+'deg');
  $('#chipModel').style.setProperty('--coreTilt',corePitch+'deg');
  if($('#coreRotation'))$('#coreRotation').value=coreYaw;
  if($('#coreRotationOut'))$('#coreRotationOut').textContent=Math.round(coreYaw)+'°';
  if($('#coreTilt'))$('#coreTilt').value=corePitch;
  if($('#coreTiltOut'))$('#coreTiltOut').textContent=Math.round(corePitch)+'°';
}
function renderCoreInstructionButtons(){
  const labels={add:'Register arithmetic',load:'Load from memory',store:'Store to memory',branch:'Conditional branch'};
  const box=$('.core3d-instructions');
  box.setAttribute('aria-label',`Choose a ${coreArch.toUpperCase()} instruction`);
  box.innerHTML=Object.entries(CORE_PROGRAMS[coreArch]).map(([key,p])=>`<button class="${key===coreInstruction?'active':''}" data-core-instruction="${key}"><code>${p.asm}</code><span>${p.label||labels[key]}</span></button>`).join('');
  box.querySelectorAll('button').forEach(button=>button.onclick=()=>{coreInstruction=button.dataset.coreInstruction;resetCore()});
}
function renderCore(){
  const program=coreProgram(),step=program.steps[coreStepIndex];
  const isCisc=coreArch==='cisc';
  $$('[data-core-arch]').forEach(b=>b.classList.toggle('active',b.dataset.coreArch===coreArch));
  $$('[data-core-instruction]').forEach(b=>b.classList.toggle('active',b.dataset.coreInstruction===coreInstruction));
  $$('.risc-core-element').forEach(x=>x.classList.toggle('hidden',isCisc));
  $$('.cisc-core-element').forEach(x=>x.classList.toggle('hidden',!isCisc));
  $('#chipModel').classList.toggle('cisc-core',isCisc);
  $('#core3d').classList.toggle('cisc-view',isCisc);
  $('#packageCode').textContent=isCisc?'EDU–C86':'EDU–R32';
  $('#packageTitle').textContent=isCisc?'CISC CORE':'RISC CORE';
  $('#packageMeta').textContent=isCisc?'VARIABLE-LENGTH · µOP · OUT-OF-ORDER':'32-BIT · 5-STAGE · LOAD/STORE';
  if($('#ihsLidMark'))$('#ihsLidMark').textContent=isCisc?'EDU-C86 · INTEGRATED HEAT SPREADER':'EDU-R32 · INTEGRATED HEAT SPREADER';
  $('#dieMark').textContent=isCisc?'X86-STYLE EDUCATIONAL µOP ENGINE · NOT TO SCALE':'RISC–V STYLE EDUCATIONAL DATAPATH · NOT TO SCALE';
  $('#coreCaptionTitle').textContent=isCisc?'What makes it CISC?':'What makes it RISC?';
  $('#coreCaptionText').textContent=isCisc?'Variable-length instructions enter a sophisticated front end, where complex commands become internal micro-operations. Renaming, scheduling, execution, and in-order retirement hide that complexity from software.':'Instructions use regular fields, arithmetic stays register-to-register, and only explicit load/store instructions enter the data cache. The five pipeline stages can overlap across different instructions.';
  $$('[data-core-unit]').forEach(u=>{
    u.classList.toggle('active',u.dataset.coreUnit===step.unit);
    u.classList.toggle('visited',program.steps.slice(0,coreStepIndex).some(s=>s.unit===u.dataset.coreUnit));
  });
  $$('[data-core-path]').forEach(p=>p.classList.toggle('active',step.path.includes(p.dataset.corePath)));
  const unitCenters={
    pc:[13.5,15],icache:[37,15],decoder:[61,15],regs:[85.5,15],
    branch:[19,47],alu:[51,47],dcache:[84,47],writeback:[51,73],
    front:[11.5,15],length:[30.5,15],decodec:[50,15],ucode:[69.5,15],queue:[88.5,15],
    rename:[14,47],sched:[38.5,47],exec:[62.5,47],lsu:[86.5,47],retire:[51,73]
  };
  const pulseXY=unitCenters[step.unit]||step.xy;
  $('#corePulse').style.left=pulseXY[0]+'%';
  $('#corePulse').style.top=pulseXY[1]+'%';
  $('#pulseValue').textContent=step.value.split(' · ')[0];
  $('#corePhaseNo').textContent=String(coreStepIndex+1).padStart(2,'0');
  $('#corePhaseTitle').textContent=step.title;
  $('#corePhaseText').textContent=step.text;
  $('#coreBusValue').textContent=step.value;
  $('#coreClock').textContent=`CYCLE ${coreCycle}`;
  $('#coreStep').innerHTML=coreStepIndex===program.steps.length-1?'Restart pulse <b>↺</b>':'Step pulse <b>→</b>';
  const bitString=step.bits.padStart(32,'0').slice(-32);
  $('#bitLights').innerHTML=[...bitString].map(bit=>`<i class="${bit==='1'?'on':''}"></i>`).join('');
}
function resetCore(){stopCore();coreStepIndex=0;coreCycle=0;renderCore()}
function stepCore(){const program=coreProgram();if(coreStepIndex===program.steps.length-1){resetCore();return}coreStepIndex++;coreCycle++;renderCore()}
function runCore(){if(coreTimer){stopCore();return}if(coreStepIndex===coreProgram().steps.length-1){coreStepIndex=0;coreCycle=0}$('#coreRun').innerHTML='Pause core <b>Ⅱ</b>';coreTimer=setInterval(()=>{if(coreStepIndex===coreProgram().steps.length-1){stopCore();return}coreStepIndex++;coreCycle++;renderCore()},900)}
$$('[data-core-arch]').forEach(button=>button.onclick=()=>{coreArch=button.dataset.coreArch;coreInstruction=coreArch==='risc'?'add':'mov';coreStepIndex=0;coreCycle=0;stopCore();renderCoreInstructionButtons();renderCore();if(!$('#cpuJourney').hidden){journeyIndex=0;renderJourney()}});
$('#coreStep').onclick=stepCore;$('#coreRun').onclick=runCore;$('#coreReset').onclick=resetCore;
$('#coreRotation').oninput=e=>{coreYaw=+e.target.value;updateCoreTransform()};
if($('#coreTilt'))$('#coreTilt').oninput=e=>{corePitch=+e.target.value;updateCoreTransform()};
$('#explodeCore').onclick=()=>{
  $('#chipModel').classList.toggle('exploded');
  $('#explodeCore').classList.toggle('active');
  const ex=$('#chipModel').classList.contains('exploded');
  $('#explodeCore span').textContent=ex?'Join layers':'Separate layers';
  if($('#coreViewMode'))$('#coreViewMode').textContent=ex?'EXPLODED LAYER STACK':'ISOMETRIC 3D CUTAWAY';
};
// Interactive 3D drag-to-orbit on #coreViewport
(()=>{
  const vp=$('#coreViewport');
  if(!vp)return;
  let dragging=false,sx=0,sy=0,sYaw=0,sPitch=0;
  vp.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,input'))return;
    dragging=true;sx=e.clientX;sy=e.clientY;sYaw=coreYaw;sPitch=corePitch;
    $('#chipModel').classList.add('dragging');
    vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener('pointermove',e=>{
    if(!dragging)return;
    coreYaw=Math.max(-180,Math.min(180,sYaw+(e.clientX-sx)*0.45));
    corePitch=Math.max(25,Math.min(78,sPitch-(e.clientY-sy)*0.32));
    updateCoreTransform();
  });
  const endDrag=()=>{dragging=false;$('#chipModel').classList.remove('dragging')};
  vp.addEventListener('pointerup',endDrag);
  vp.addEventListener('pointercancel',endDrag);
  $$('[data-core-unit]').forEach(u=>{
    u.addEventListener('click',e=>{
      if(Math.hypot(e.clientX-sx,e.clientY-sy)>6)return;
      const unitKey=u.dataset.coreUnit;
      const steps=coreProgram().steps;
      const idx=steps.findIndex(s=>s.unit===unitKey);
      if(idx!==-1){stopCore();coreStepIndex=idx;coreCycle=idx;renderCore()}
    });
  });
})();
renderCoreInstructionButtons();renderCore();

// ============================================================================
// IMMERSIVE 3D ARCHITECTURE JOURNEY ENGINE
// Starts at a realistic 3D hardware test bench with the engineer's 3D hands
// pressing the controller trigger & holding the logic probe, then shrinks
// inside the controller and rides right BESIDE the copper traces & internal
// silicon buses WITH the moving data packets through every stage.
// ============================================================================
const JOURNEY_UNITS={
  outside:['ELECTRONICS TEST BENCH','LAB','TEST BENCH','COMMAND QUEUED'],
  bench:['BUS CONTROLLER IC','CTRL','SIGNAL SERIALIZATION','DIFFERENTIAL BUS'],
  board:['MOTHERBOARD COPPER TRACES','PCB','PCB PROPAGATION','4-LANE BUS STREAM'],
  package:['CPU SOCKET & PACKAGE','PKG','PACKAGE ENTRY','LGA SOCKET BUS'],
  pins:['GOLD LGA CONTACTS','PINS','CONTACT INTERFACE','PIN SIGNALS'],
  substrate:['SUBSTRATE & COPPER VIAS','VIAS','TSV & C4 INTERCONNECT','MICRO-BUMP DATA'],
  die:['SILICON DIE INTERCONNECT','DIE','ON-DIE M1/M2 BUS','DIE DATA PACKET'],
  exit:['SYSTEM RESULT BUS','OUT','RETIRE & COMMIT','ARCHITECTURAL RESULT'],
  pc:['PROGRAM COUNTER','PC','FETCH STAGE','INSTRUCTION ADDRESS'],
  icache:['L1 INSTRUCTION CACHE','I$','FETCH STAGE','INSTRUCTION BYTES'],
  decoder:['CONTROL DECODER','DEC','DECODE STAGE','DECODED FIELDS'],
  regs:['32×32 REGISTER FILE','REGS','REGISTER STAGE','REGISTER OPERANDS'],
  alu:['ARITHMETIC LOGIC UNIT','ALU','EXECUTE STAGE','ALU CALCULATION'],
  dcache:['L1 DATA CACHE','D$','MEMORY STAGE','CACHE DATA WORD'],
  writeback:['WRITEBACK BUS','WB','WRITEBACK STAGE','COMMITTED RESULT'],
  branch:['BRANCH TARGET UNIT','BRU','BRANCH STAGE','BRANCH TARGET'],
  front:['16B BYTE FRONT END','16B','FETCH STAGE','INSTRUCTION BYTES'],
  length:['LENGTH DECODER','LEN','LENGTH STAGE','BOUNDARY LENGTH'],
  decodec:['COMPLEX DECODER','DEC','DECODE STAGE','CRACKED OPCODE'],
  ucode:['MICROCODE ROM','µROM','MICROCODE STAGE','µOP SEQUENCE'],
  queue:['MICRO-OP QUEUE','µQ','QUEUE STAGE','BUFFERED µOPS'],
  rename:['REGISTER RENAMER','REN','RENAME STAGE','PHYSICAL REG MAP'],
  sched:['OUT-OF-ORDER SCHEDULER','SCH','SCHEDULE STAGE','DISPATCHED µOP'],
  exec:['INTEGER ALU CLUSTER','ALU×3','EXECUTE STAGE','RESULT + EFLAGS'],
  lsu:['LOAD / STORE ENGINE','LSU','MEMORY STAGE','CACHE DATA'],
  retire:['REORDER BUFFER (ROB)','ROB','RETIRE STAGE','ARCHITECTURAL COMMIT']
};

// 3D Silicon Die coordinates (x, z) on the silicon floorplan (y = -120)
const DIE_LAYOUT_3D={
  risc:{
    pc:[-225,-125,86,34,64,'PC · 0x0040'],
    icache:[-75,-125,104,38,70,'L1 I-CACHE'],
    decoder:[75,-125,104,36,70,'DECODER / CTRL'],
    regs:[225,-95,108,44,96,'32×32 REGISTERS'],
    branch:[-165,35,96,32,68,'BRANCH UNIT'],
    alu:[35,35,114,42,82,'ALU / AGU'],
    dcache:[225,45,108,40,86,'L1 DATA CACHE'],
    writeback:[120,155,136,30,58,'WRITEBACK BUS']
  },
  cisc:{
    front:[-250,-135,90,34,64,'BYTE FRONT END'],
    length:[-125,-135,88,34,64,'LENGTH DECODER'],
    decodec:[0,-135,96,38,68,'COMPLEX DECODER'],
    ucode:[125,-145,88,52,64,'µCODE ROM'],
    queue:[240,-125,86,36,68,'µOP QUEUE'],
    rename:[-180,25,102,38,74,'REG RENAMER'],
    sched:[-30,25,110,38,76,'OOO SCHEDULER'],
    exec:[115,25,98,42,76,'ALU × 3 CLUSTER'],
    lsu:[245,35,96,42,82,'LOAD / STORE + D$'],
    retire:[95,155,145,34,62,'REORDER BUFFER']
  }
};

// 3D Checkpoints for the prelude, internal die, & exit stages (cam, look, traceFrom, traceTo)
function getStage3DCoords(step,idx,route){
  const layout=DIE_LAYOUT_3D[coreArch];
  if(step.scene==='outside'){
    return {
      cam:[0,138,-415],
      look:[0,22,-165],
      traceFrom:[0,18,-214],
      traceTo:[0,22,-165]
    };
  }
  if(step.scene==='bench'){
    return {
      cam:[0,56,-225],
      look:[0,20,-125],
      traceFrom:[0,18,-214],
      traceTo:[0,22,-145]
    };
  }
  if(step.scene==='board'){
    return {
      cam:[-36,40,-160],
      look:[0,20,-30],
      traceFrom:[0,22,-165],
      traceTo:[0,22,-24]
    };
  }
  if(step.scene==='package'){
    return {
      cam:[-48,46,-92],
      look:[0,26,5],
      traceFrom:[-14,22,-85],
      traceTo:[0,26,-8]
    };
  }
  if(step.scene==='pins'){
    return {
      cam:[-52,42,-82],
      look:[0,23,0],
      traceFrom:[0,19,-38],
      traceTo:[0,28,-6]
    };
  }
  if(step.scene==='substrate'){
    return {
      cam:[-95,-22,-310],
      look:[-30,-82,-180],
      traceFrom:[-54,-22,-190],
      traceTo:[-54,-114,-190]
    };
  }
  if(step.scene==='die'){
    const firstUnit=layout[route[7]?.unit]||[-235,-125,88,36,66];
    return {
      cam:[-85,12,-335],
      look:[0,-115,5],
      traceFrom:[firstUnit[0],-118.4,-198],
      traceTo:[firstUnit[0],-118.4,firstUnit[1]-32]
    };
  }
  if(step.scene==='exit'){
    const prevUnit=layout[route[idx-1]?.unit]||[100,155,130,32,60];
    return {
      cam:[0,-15,-290],
      look:[15,-112,25],
      traceFrom:[prevUnit[0],-112,prevUnit[1]],
      traceTo:[0,-40,-90]
    };
  }
  // Internal silicon stage: camera rides right beside the active trace with clear view of silicon macro top arrays
  const cur=layout[step.unit]||[0,0,90,36,68,'UNIT'];
  const prevStep=route[idx-1];
  const prev=prevStep&&layout[prevStep.unit]?layout[prevStep.unit]:[cur[0],-198,30,10,20];
  const dx=cur[0]-prev[0], dz=cur[1]-prev[1];
  const dist=Math.hypot(dx,dz)||1;
  const nx=dx/dist, nz=dz/dist;
  const startOff=prevStep&&layout[prevStep.unit]?Math.min(42,dist*0.28):8;
  const endOff=Math.min(42,dist*0.28);
  const tFrom=[prev[0]+nx*startOff, -114, prev[1]+nz*startOff];
  const tTo=[cur[0]-nx*endOff, -114, cur[1]-nz*endOff];
  const travX=cur[0]-nx*28, travZ=cur[1]-nz*28;
  const sideX=-nz*42, sideZ=nx*42;
  return {
    cam:[travX-nx*118+sideX*0.75, -46, travZ-nz*118+sideZ*0.75],
    look:[cur[0], -112, cur[1]],
    traceFrom:tFrom,
    traceTo:tTo,
    unitBox:cur
  };
}

let journeyIndex=0,journeyAutoTimer=null,journeySoundOn=false,journeyAudio=null,journeyTraveling=false;
let jAnimFrame=null,jCamPos=[-45,255,-560],jCamLook=[0,62,-130];
let jTargetCam=[-45,255,-560],jTargetLook=[0,62,-130];
let jStartCam=[-45,255,-560],jStartLook=[0,62,-130],jTransStartTime=0,jTransDur=680;
let jPrevScene='outside',jUserYaw=0,jUserPitch=0,jPkgAlpha=0.96;

function journeyProgram(){return coreProgram()}
function createJourneyParticles(){
  if(!$('#journeyStars').children.length){
    $('#journeyStars').innerHTML=Array.from({length:24},(_,i)=>`<i style="left:${(i*37)%100}%;top:${(i*61)%100}%;--duration:${4+(i%6)}s;--delay:-${i%5}s;--dx:${(i%2?1:-1)*(10+i%35)}px;--dy:${20+i%45}px"></i>`).join('');
  }
}
function journeyTone(frequency=240,duration=.16){
  if(!journeySoundOn)return;
  try{
    if(!journeyAudio)journeyAudio=new (window.AudioContext||window.webkitAudioContext)();
    const osc=journeyAudio.createOscillator(),gain=journeyAudio.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(frequency,journeyAudio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency*1.65,journeyAudio.currentTime+duration);
    gain.gain.setValueAtTime(.045,journeyAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,journeyAudio.currentTime+duration);
    osc.connect(gain).connect(journeyAudio.destination);
    osc.start();osc.stop(journeyAudio.currentTime+duration);
  }catch(e){journeySoundOn=false}
}

function journeyRoute(){
  const program=journeyProgram(),seed=(program.steps[0]?.bits||'1011010011010010').padStart(32,'0');
  const prelude=[
    {unit:'outside',scene:'outside',route:'Lab Bench',title:'Hardware controller queues instruction',text:`The 12-switch hardware controller encodes ${program.asm} into a 32-bit binary command frame while the bench oscilloscope monitors the system clock and bus voltage.`,value:`Queued · ${program.asm}`,bits:seed},
    {unit:'bench',scene:'bench',route:'Controller',title:'Bus controller IC serializes bit stream',text:`The QFP bus controller IC latches ${program.asm} and drives high-speed differential voltage pulses onto the motherboard copper bus lines.`,value:`Controller · ${program.asm}`,bits:seed},
    {unit:'board',scene:'board',route:'PCB Traces',title:'4-lane differential bus crosses motherboard',text:'Etched copper transmission lines carry the binary address, opcode, and control signals across the FR-4 motherboard PCB toward the CPU socket.',value:`Bus trace · ${program.asm}`,bits:seed},
    {unit:'package',scene:'package',route:'CPU Package',title:'Signals enter CPU socket and package',text:`The motherboard bus reaches the LGA processor socket beneath the nickel-plated integrated heatspreader (${coreArch==='cisc'?'EDU-C86':'EDU-R32'}) and multi-layer package substrate.`,value:`Package · ${coreArch==='cisc'?'EDU-C86':'EDU-R32'}`,bits:seed},
    {unit:'pins',scene:'pins',route:'Contacts',title:'Gold LGA contacts conduct bus signals',text:'Gold-plated socket contact pins transfer regulated VDD power, synchronous clock edges, addresses, and instruction bits into the processor package.',value:'Contacts · ADDR / DATA / CLK',bits:seed},
    {unit:'substrate',scene:'substrate',route:'Copper Vias',title:'Vertical TSV vias & C4 micro-bumps',text:'Multi-layer ABF copper redistribution planes route signals down vertical through-substrate vias (TSVs) and C4 flip-chip solder bumps onto the silicon die.',value:'Via link · Substrate → Silicon',bits:seed},
    {unit:'die',scene:'die',route:'Silicon Die',title:'On-die M1/M2 metal interconnect grid',text:`Signals arrive at the ${coreArch.toUpperCase()} silicon wafer perimeter bond pads and enter the on-die metal interconnect bus feeding the functional macro blocks for ${program.asm}.`,value:`On-die bus · ${program.asm}`,bits:seed}
  ];
  const internal=program.steps.map(step=>({...step,scene:'internal',route:JOURNEY_UNITS[step.unit]?.[1]||'CORE'}));
  const last=program.steps[program.steps.length-1];
  return [
    ...prelude,
    ...internal,
    {unit:'exit',scene:'exit',route:'Result Bus',title:'Architectural state committed to system bus',text:`The ${coreArch.toUpperCase()} datapath has completed ${program.asm}. The final architectural result (${last.value}) is committed and driven onto the system result bus.`,value:`Completed · ${last.value}`,bits:last.bits}
  ];
}

function updateJourneyTargets(instant=false){
  const route=journeyRoute(),step=route[journeyIndex];
  const coords=getStage3DCoords(step,journeyIndex,route);
  jStartCam=[...jCamPos];
  jStartLook=[...jCamLook];
  jTargetCam=coords.cam;
  jTargetLook=coords.look;
  jTransStartTime=performance.now();
  if(instant){
    jCamPos=[...jTargetCam];
    jCamLook=[...jTargetLook];
    jStartCam=[...jTargetCam];
    jStartLook=[...jTargetLook];
    jPrevScene=step.scene;
    jPkgAlpha=step.scene==='pins'?0.24:0.96;
    jTransStartTime=0;
  }
}

function renderJourney(){
  const program=journeyProgram(),route=journeyRoute(),step=route[journeyIndex],meta=JOURNEY_UNITS[step.unit]||['PROCESSOR BLOCK','CPU','PROCESS','DATA'],last=route.length-1;
  const archLabel=coreArch==='cisc'?'CISC Journey':'RISC Journey';
  $('#cpuJourney').dataset.scene=step.scene;
  $('#cpuJourney').classList.toggle('cisc-journey',coreArch==='cisc');
  $('#cpuJourney').classList.toggle('journey-complete',journeyIndex===last);
  if($('#journeyHeaderLabel'))$('#journeyHeaderLabel').textContent=archLabel;
  $('#journeyArch').textContent=`${archLabel} · ${program.asm}`;
  $('#journeyProgressText').textContent=`CHECKPOINT ${String(journeyIndex+1).padStart(2,'0')} / ${String(route.length).padStart(2,'0')}`;
  $('#journeyProgressBar').style.width=`${(journeyIndex+1)/route.length*100}%`;
  $('#journeyUnitType').textContent=meta[0];
  $('#journeySymbol').textContent=meta[1];
  $('#journeyTitle').textContent=step.title;
  const firstSent=step.text.split('. ')[0];
  $('#journeyShort').textContent=firstSent.endsWith('.')?firstSent:firstSent+'.';
  $('#journeyPayload').textContent=step.value;
  $('#journeyIndex').textContent=String(journeyIndex+1).padStart(2,'0');
  $('#journeyStage').textContent=`CHECKPOINT ${String(journeyIndex+1).padStart(2,'0')} · ${meta[2]}`;
  $('#journeyNarrationTitle').textContent=step.title;
  $('#journeyNarrationText').textContent=step.text;
  $('#journeyPacketState').textContent=meta[3];
  $('#journeyVelocity').textContent=journeyTraveling?'4.0 GT/s · BUS TRANSIT':journeyIndex===last?'COMMITTED · STATE LATCHED':'1.00 GHz · SYNC CLOCK';
  $('#journeyPrevious').textContent=journeyIndex?(JOURNEY_UNITS[route[journeyIndex-1].unit]?.[0]||'Previous stage'):'Hardware Test Bench';
  $('#journeyNext').textContent=journeyIndex<last?(JOURNEY_UNITS[route[journeyIndex+1].unit]?.[0]||'Next stage'):'Execution Complete';
  $('#journeyBack').disabled=journeyIndex===0;
  $('#journeyNextButton').disabled=journeyIndex===last;
  $('#journeyNextButton').innerHTML=journeyIndex===last?'Journey complete ✓':'Continue the route <b>→</b>';
  $('#journeyRouteMap').innerHTML=route.map((stop,i)=>`<span class="route-stop ${i<journeyIndex?'done':''} ${i===journeyIndex?'active':''}" data-stop-index="${i}" title="Jump to ${stop.title}"><b>${stop.route}</b></span>`).join('');
  $$('#journeyRouteMap .route-stop').forEach(el=>{
    el.onclick=()=>{
      const targetIdx=+el.dataset.stopIndex;
      if(targetIdx!==journeyIndex){
        jumpToJourneyIndex(targetIdx);
      }
    };
  });
  const bits=step.bits.padStart(32,'0').slice(-16);
  if($('#journeyBits').dataset.lastBits!==bits){
    $('#journeyBits').dataset.lastBits=bits;
    $('#journeyBits').innerHTML=[...bits].map((bit,i)=>`<i style="left:${6+(i*17)%88}%;top:${8+(i*23)%78}%;--speed:${3.5+i%4}s;--drift:${(i%2?1:-1)*(14+i%28)}px">${bit}</i>`).join('');
  }
}

// ============================================================================
// REAL-TIME 60FPS 3D CANVAS SCENE RENDERER FOR #cpuJourney
// Renders:
// 1. Test Bench, Oscilloscope, Power Supply, Interactive 12-Switch Controller Pad & 3D Hands
// 2. Motherboard PCB, RAM DIMMs, Controller IC, Copper Traces & Moving Data Blocks
// 3. CPU Socket, Heatspreader Package (EDU-R32 / EDU-C86), Gold Contact Pins
// 4. Multi-layer Package Substrate, Vertical Copper Vias & C4 Micro-bumps
// 5. Complete 3D Silicon Die Floorplan with all RISC/CISC 3D units & trace rails
// ============================================================================
let jPadSwitchRects=[];
let jHoveredSwitch=null;
let jPressedSwitch=null; // {id, time, desc}

function getPadSwitchDefs(){
  const isCisc=coreArch==='cisc';
  const row0=isCisc
    ?[
        {id:'cmd:mov',kx:-33,kz:-238,label:'MOV',desc:'SELECT MOV EAX, [0x1000]',active:coreInstruction==='mov'},
        {id:'cmd:addm',kx:-11,kz:-238,label:'ADDM',desc:'SELECT ADD EAX, [0x1004]',active:coreInstruction==='addm'},
        {id:'cmd:rep',kx:11,kz:-238,label:'REP',desc:'SELECT REP MOVSD LOOP',active:coreInstruction==='rep'},
        {id:'cmd:push',kx:33,kz:-238,label:'PUSH',desc:'SELECT PUSH EAX STACK OP',active:coreInstruction==='push'}
      ]
    :[
        {id:'cmd:add',kx:-33,kz:-238,label:'ADD',desc:'SELECT ADD R3, R1, R2',active:coreInstruction==='add'},
        {id:'cmd:load',kx:-11,kz:-238,label:'LW',desc:'SELECT LW R4, 0(R1)',active:coreInstruction==='load'},
        {id:'cmd:store',kx:11,kz:-238,label:'SW',desc:'SELECT SW R3, 4(R1)',active:coreInstruction==='store'},
        {id:'cmd:branch',kx:33,kz:-238,label:'BEQ',desc:'SELECT BEQ R3, R4, +8',active:coreInstruction==='branch'}
      ];
  const row1=[
    {id:'arch:risc',kx:-33,kz:-254,label:'RISC',desc:'SWITCH TO RISC (EDU-R32)',active:coreArch==='risc'},
    {id:'arch:cisc',kx:-11,kz:-254,label:'CISC',desc:'SWITCH TO CISC (EDU-C86)',active:coreArch==='cisc'},
    {id:'act:exec',kx:11,kz:-254,label:'EXEC ▶',desc:`LAUNCH ${journeyProgram().asm}`,primary:true},
    {id:'act:auto',kx:33,kz:-254,label:'AUTO',desc:'TOGGLE AUTO TOUR',active:!!journeyAutoTimer}
  ];
  const row2=[
    {id:'act:prev',kx:-33,kz:-270,label:'◀ PREV',desc:'STEP BACKWARD'},
    {id:'act:next',kx:-11,kz:-270,label:'NEXT ▶',desc:'STEP FORWARD'},
    {id:'act:reset',kx:11,kz:-270,label:'RESET',desc:'RETURN TO BENCH'},
    {id:'act:sound',kx:33,kz:-270,label:'SOUND',desc:'TOGGLE SYNTH AUDIO',active:journeySoundOn}
  ];
  return [...row0,...row1,...row2];
}

function playSwitchClickTone(freq=420){
  try{
    if(!journeyAudio)journeyAudio=new (window.AudioContext||window.webkitAudioContext)();
    const osc=journeyAudio.createOscillator(),gain=journeyAudio.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(freq,journeyAudio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq*1.45,journeyAudio.currentTime+0.085);
    gain.gain.setValueAtTime(0.055,journeyAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,journeyAudio.currentTime+0.085);
    osc.connect(gain).connect(journeyAudio.destination);
    osc.start();osc.stop(journeyAudio.currentTime+0.085);
  }catch(e){}
}

function pressPadSwitch(sw){
  if(!sw)return;
  jPressedSwitch={id:sw.id,time:performance.now(),desc:sw.desc};
  playSwitchClickTone(sw.primary?520:390);
  if(sw.id.startsWith('cmd:')){
    const cmd=sw.id.slice(4);
    if(CORE_PROGRAMS[coreArch]?.[cmd]){
      coreInstruction=cmd;
      coreStepIndex=0;coreCycle=0;
      renderCoreInstructionButtons();
      renderCore();
      renderJourney();
    }
  }else if(sw.id==='arch:risc'||sw.id==='arch:cisc'){
    const nextArch=sw.id.slice(5);
    if(coreArch!==nextArch){
      coreArch=nextArch;
      coreInstruction=coreArch==='risc'?'add':'mov';
      coreStepIndex=0;coreCycle=0;
      stopCore();
      renderCoreInstructionButtons();
      renderCore();
      updateJourneyTargets(true);
      renderJourney();
    }
  }else if(sw.id==='act:exec'||sw.id==='act:next'){
    setTimeout(()=>travelJourney(1),140);
  }else if(sw.id==='act:prev'){
    setTimeout(()=>travelJourney(-1),110);
  }else if(sw.id==='act:auto'){
    toggleJourneyAuto();
  }else if(sw.id==='act:reset'){
    restartJourney();
  }else if(sw.id==='act:sound'){
    $('#journeySound').click();
  }
}

function startJourney3DLoop(){
  if(jAnimFrame)cancelAnimationFrame(jAnimFrame);
  const canvas=$('#journeyCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const handCacheCanvas=document.createElement('canvas');
  const handCacheCtx=handCacheCanvas.getContext('2d');
  let handCacheKey='';
  let lastPinHTML='';

  // Helper to shade hex or rgb colors by a directional light factor
  function shadeColor(col,factor){
    if(!col||!col.startsWith('#')||col.length!==7)return col;
    const r=Math.min(255,Math.max(0,Math.round(parseInt(col.slice(1,3),16)*factor)));
    const g=Math.min(255,Math.max(0,Math.round(parseInt(col.slice(3,5),16)*factor)));
    const b=Math.min(255,Math.max(0,Math.round(parseInt(col.slice(5,7),16)*factor)));
    return `rgb(${r},${g},${b})`;
  }

  function frame(now){
    if($('#cpuJourney').hidden)return;
    if(document.hidden){
      jAnimFrame=requestAnimationFrame(frame);
      return;
    }
    const t=now*0.001;
    // Cap DPR at 1.5 for ultra-smooth 60fps canvas rendering without HiDPI lag
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    const w=canvas.clientWidth||window.innerWidth;
    const h=canvas.clientHeight||window.innerHeight;
    if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){
      canvas.width=Math.floor(w*dpr);
      canvas.height=Math.floor(h*dpr);
    }
    ctx.save();
    ctx.scale(dpr,dpr);

    // Smooth time-based cubic ease-in-out camera & look-target interpolation
    const elapsed=Math.max(0,now-(jTransStartTime||now));
    const rawT=jTransStartTime?Math.min(1,elapsed/jTransDur):1;
    const easeT=rawT<0.5?4*rawT*rawT*rawT:1-Math.pow(-2*rawT+2,3)/2;
    const horizDist=Math.hypot(jTargetCam[0]-jStartCam[0],jTargetCam[2]-jStartCam[2]);
    const arcLift=Math.sin(rawT*Math.PI)*Math.min(16,horizDist*0.055);
    for(let i=0;i<3;i++){
      jCamPos[i]=jStartCam[i]+(jTargetCam[i]-jStartCam[i])*easeT+(i===1?arcLift:0);
      jCamLook[i]=jStartLook[i]+(jTargetLook[i]-jStartLook[i])*easeT;
    }

    const isCisc=coreArch==='cisc';
    const accent=isCisc?'#60a5fa':'#4ade80';
    const accentBright=isCisc?'#dbeafe':'#dcfce7';
    const copper='#d97706';
    const copperBright='#fbbf24';
    const gold='#eab308';

    // Deep laboratory / cleanroom ambient background gradient
    const bg=ctx.createRadialGradient(w*0.5,h*0.42,30,w*0.5,h*0.5,Math.max(w,h)*0.78);
    bg.addColorStop(0,isCisc?'#0d1f38':'#0b2218');
    bg.addColorStop(0.5,isCisc?'#060e1a':'#05110b');
    bg.addColorStop(1,'#020403');
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,w,h);

    // Camera basis with user interactive look offsets & portrait mobile pullback
    const isMobile=w<680;
    let camX=jCamPos[0], camY=jCamPos[1], camZ=jCamPos[2];
    let fx=jCamLook[0]-camX, fy=jCamLook[1]-camY, fz=jCamLook[2]-camZ;
    const flen=Math.hypot(fx,fy,fz)||1;
    fx/=flen; fy/=flen; fz/=flen;

    if(w<h){
      // Pull camera back along view ray on portrait phones so full bench & silicon die fit horizontally
      const pullback=(1-w/Math.max(1,h))*150;
      camX-=fx*pullback;
      camY-=fy*pullback*0.75;
      camZ-=fz*pullback;
    }

    if(jUserYaw||jUserPitch){
      const cy=Math.cos(jUserYaw), sy=Math.sin(jUserYaw);
      const rfx=fx*cy-fz*sy, rfz=fx*sy+fz*cy;
      fx=rfx; fz=rfz;
      fy=Math.max(-0.92,Math.min(0.92,fy+jUserPitch));
      const nl=Math.hypot(fx,fy,fz)||1;
      fx/=nl; fy/=nl; fz/=nl;
    }

    let rx=fz, ry=0, rz=-fx;
    const rlen=Math.hypot(rx,ry,rz)||1;
    rx/=rlen; ry/=rlen; rz/=rlen;
    const ux=fy*rz-fz*ry, uy=fz*rx-fx*rz, uz=fx*ry-fy*rx;
    const focal=w<h?w*0.72:Math.min(w,h)*0.88;
    const projCenterY=isMobile?h*0.54:h*0.5;

    function project(px,py,pz){
      const dx=px-camX, dy=py-camY, dz=pz-camZ;
      const cz=dx*fx+dy*fy+dz*fz;
      if(cz<=4)return null;
      const cx=dx*rx+dy*ry+dz*rz;
      const cy=dx*ux+dy*uy+dz*uz;
      const s=focal/cz;
      return {x:w*0.5+cx*s, y:projCenterY-cy*s, z:cz, s};
    }

    function drawLine3D(p1,p2,color,width=1.5,dash=null){
      const a=project(p1[0],p1[1],p1[2]), b=project(p2[0],p2[1],p2[2]);
      if(!a||!b)return;
      ctx.beginPath();
      if(dash)ctx.setLineDash(dash);else ctx.setLineDash([]);
      ctx.strokeStyle=color;
      ctx.lineWidth=width;
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawPoly3D(pts,fill,stroke,lineWidth=1){
      const proj=[];
      for(const p of pts){
        const pr=project(p[0],p[1],p[2]);
        if(!pr)return null;
        proj.push(pr);
      }
      ctx.beginPath();
      ctx.moveTo(proj[0].x,proj[0].y);
      for(let i=1;i<proj.length;i++)ctx.lineTo(proj[i].x,proj[i].y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill()}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
      return proj;
    }

    // Draw a directionally-lit 3D box with per-face Lambertian shading & specular gradient
    function drawBox3D(cx,cy,cz,bw,bh,bd,topColor,sideColor,edgeColor,lineWidth=1.0,shadowY=null){
      const hw=bw*0.5, hd=bd*0.5, y0=cy, y1=cy+bh;
      if(shadowY!==null){
        const sw=hw*1.12, sd=hd*1.12;
        drawPoly3D(
          [[cx-sw,shadowY,cz-sd],[cx+sw,shadowY,cz-sd],[cx+sw,shadowY,cz+sd],[cx-sw,shadowY,cz+sd]],
          'rgba(0,0,0,0.42)',null,0
        );
      }
      const v=[
        [cx-hw,y0,cz-hd],[cx+hw,y0,cz-hd],[cx+hw,y0,cz+hd],[cx-hw,y0,cz+hd],
        [cx-hw,y1,cz-hd],[cx+hw,y1,cz-hd],[cx+hw,y1,cz+hd],[cx-hw,y1,cz+hd]
      ];
      const faces=[
        {idx:[0,1,5,4],col:shadeColor(sideColor,1.02)}, // front (-z, facing key light)
        {idx:[3,0,4,7],col:shadeColor(sideColor,0.88)}, // left (-x)
        {idx:[1,2,6,5],col:shadeColor(sideColor,0.72)}, // right (+x)
        {idx:[2,3,7,6],col:shadeColor(sideColor,0.58)}, // back (+z)
        {idx:[4,5,6,7],col:topColor,isTop:true}         // top (+y)
      ];
      faces.forEach(f=>{
        const c=f.idx.reduce((acc,i)=>[acc[0]+v[i][0]/4,acc[1]+v[i][1]/4,acc[2]+v[i][2]/4],[0,0,0]);
        f.dist=Math.hypot(c[0]-camX,c[1]-camY,c[2]-camZ);
      });
      faces.sort((a,b)=>b.dist-a.dist);
      for(const f of faces){
        let fillStyle=f.col;
        if(f.isTop&&typeof topColor==='string'&&topColor.startsWith('#')){
          const pA=project(v[4][0],v[4][1],v[4][2]);
          const pB=project(v[6][0],v[6][1],v[6][2]);
          if(pA&&pB){
            const g=ctx.createLinearGradient(pA.x,pA.y,pB.x,pB.y);
            g.addColorStop(0,shadeColor(topColor,1.18));
            g.addColorStop(0.5,topColor);
            g.addColorStop(1,shadeColor(topColor,0.82));
            fillStyle=g;
          }
        }
        drawPoly3D(f.idx.map(i=>v[i]),fillStyle,edgeColor,lineWidth);
      }
      return project(cx,y1+4,cz);
    }

    // Smooth 3D gradient capsule renderer (zero polygon facets, smooth anti-aliased silhouettes & 3D Phong shading)
    function drawSmoothCapsule3D(p1,p2,r1,r2,baseColor,highlightColor=null,rimColor=null){
      const a=project(p1[0],p1[1],p1[2]), b=project(p2[0],p2[1],p2[2]);
      if(!a||!b)return null;
      const ra=Math.max(1.2,r1*a.s), rb=Math.max(1.2,r2*b.s);
      const dx=b.x-a.x, dy=b.y-a.y;
      const len=Math.hypot(dx,dy);
      const hi=highlightColor||shadeColor(baseColor,1.26);
      const mid=baseColor;
      const dark=shadeColor(baseColor,0.58);
      ctx.save();
      if(len<0.5){
        const g=ctx.createRadialGradient(a.x-ra*0.3,a.y-ra*0.3,ra*0.1,a.x,a.y,ra);
        g.addColorStop(0,hi);
        g.addColorStop(0.55,mid);
        g.addColorStop(1,dark);
        ctx.fillStyle=g;
        ctx.beginPath();
        ctx.arc(a.x,a.y,ra,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
        return b;
      }
      const ang=Math.atan2(dy,dx);
      const nx=-dy/len, ny=dx/len;
      const rm=Math.max(ra,rb);
      const mx=(a.x+b.x)*0.5, my=(a.y+b.y)*0.5;
      const grad=ctx.createLinearGradient(mx-nx*rm,my-ny*rm,mx+nx*rm,my+ny*rm);
      grad.addColorStop(0,dark);
      grad.addColorStop(0.28,hi);
      grad.addColorStop(0.62,mid);
      grad.addColorStop(1,shadeColor(baseColor,0.48));

      ctx.beginPath();
      ctx.arc(a.x,a.y,ra,ang+Math.PI*0.5,ang+Math.PI*1.5);
      ctx.arc(b.x,b.y,rb,ang-Math.PI*0.5,ang+Math.PI*0.5);
      ctx.closePath();
      ctx.fillStyle=grad;
      ctx.fill();
      if(rimColor){
        ctx.strokeStyle=rimColor;
        ctx.lineWidth=0.75;
        ctx.stroke();
      }
      ctx.restore();
      return b;
    }

    // Draw a realistic glossy 3D fingernail at the tip of a finger
    function drawFingernail3D(pTip,pDip,radius,isHighlight=false){
      const a=project(pDip[0],pDip[1],pDip[2]), b=project(pTip[0],pTip[1],pTip[2]);
      if(!a||!b)return;
      const rb=Math.max(1.5,radius*b.s*0.72);
      const ang=Math.atan2(b.y-a.y,b.x-a.x);
      const nx=b.x-Math.cos(ang)*rb*0.35, ny=b.y-Math.sin(ang)*rb*0.35;
      ctx.save();
      ctx.translate(nx,ny);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0,0,rb*0.95,rb*0.68,0,0,Math.PI*2);
      ctx.fillStyle=isHighlight?'#ffffff':'#fcefe6';
      ctx.strokeStyle=isHighlight?accent:'rgba(165,105,75,0.55)';
      ctx.lineWidth=0.8;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw a smooth 3D shaded cylinder with depth-aware end-cap ordering (zero cap inversion!)
    function drawCylinder3D(p1,p2,r1,r2,baseColor,edgeColor=null){
      const d1=Math.hypot(p1[0]-camX,p1[1]-camY,p1[2]-camZ);
      const d2=Math.hypot(p2[0]-camX,p2[1]-camY,p2[2]-camZ);
      const nearPt=d2<=d1?p2:p1;
      const nearR=d2<=d1?r2:r1;
      drawSmoothCapsule3D(p1,p2,r1,r2,baseColor,edgeColor||shadeColor(baseColor,1.32),'rgba(0,0,0,0.35)');
      const b=project(nearPt[0],nearPt[1],nearPt[2]);
      if(b&&b.z<600){
        const ax=p2[0]-p1[0], ay=p2[1]-p1[1], az=p2[2]-p1[2];
        const alen=Math.hypot(ax,ay,az)||1;
        const vx=camX-nearPt[0], vy=camY-nearPt[1], vz=camZ-nearPt[2];
        const vlen=Math.hypot(vx,vy,vz)||1;
        const sign=d2<=d1?1:-1;
        const cosView=Math.abs((ax*sign*vx+ay*sign*vy+az*sign*vz)/(alen*vlen));
        if(cosView>0.12){
          const rb=Math.max(1.2,nearR*b.s);
          const ry=Math.max(0.8,rb*Math.min(0.85,cosView));
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(b.x,b.y,rb,ry,0,0,Math.PI*2);
          ctx.fillStyle=edgeColor||shadeColor(baseColor,1.25);
          ctx.strokeStyle=shadeColor(baseColor,0.65);
          ctx.lineWidth=0.7;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Draw a realistic 4-lane differential copper/silicon bus with high-speed voltage pulse streaks
    function drawTraceWithData(pStart,pEnd,isActive,isVisited,dataText,bitStr='10110010'){
      const dx=pEnd[0]-pStart[0], dy=pEnd[1]-pStart[1], dz=pEnd[2]-pStart[2];
      const len=Math.hypot(dx,dy,dz)||1;
      const sx=-dz/len*4.2, sz=dx/len*4.2;

      // Dark etched PCB dielectric channel beneath the 4 parallel copper bus lanes
      drawLine3D(pStart,pEnd,'rgba(4,12,9,0.88)',isActive?13:7.5);
      // Outer gold ground-shield guard rails
      for(const guard of [-1.65,1.65]){
        drawLine3D(
          [pStart[0]+sx*guard,pStart[1]+0.15,pStart[2]+sz*guard],
          [pEnd[0]+sx*guard,pEnd[1]+0.15,pEnd[2]+sz*guard],
          isActive?'rgba(234,179,8,0.55)':'rgba(180,130,60,0.25)',
          0.9
        );
      }

      // 4 Parallel etched copper / cobalt differential conductor lanes
      const lanes=[-1.15,-0.38,0.38,1.15];
      const baseTrackCol=isActive?'rgba(245,158,11,0.55)':isVisited?copper:'rgba(180,130,60,0.35)';
      for(let lIdx=0;lIdx<4;lIdx++){
        const lane=lanes[lIdx];
        const lStart=[pStart[0]+sx*lane,pStart[1]+0.25,pStart[2]+sz*lane];
        const lEnd=[pEnd[0]+sx*lane,pEnd[1]+0.25,pEnd[2]+sz*lane];
        drawLine3D(lStart,lEnd,baseTrackCol,isActive?1.5:1.1);

        // High-speed voltage pulse streaks (comet tail + bright wavefront) along each lane!
        if(isActive||isVisited){
          const pulsesPerLane=isActive?2:1;
          for(let p=0;p<pulsesPerLane;p++){
            const phaseOffset=lIdx*0.23+p*0.5;
            const uHead=((t*(isActive?0.72:0.25)+phaseOffset)%1);
            const tailLen=isActive?Math.min(0.24,14/len):Math.min(0.14,8/len);
            const uTail=Math.max(0,uHead-tailLen);
            const uMid=Math.max(0,uHead-tailLen*0.42);

            const ptTail=[lStart[0]+dx*uTail,lStart[1]+dy*uTail+0.5,lStart[2]+dz*uTail];
            const ptMid=[lStart[0]+dx*uMid,lStart[1]+dy*uMid+0.6,lStart[2]+dz*uMid];
            const ptHead=[lStart[0]+dx*uHead,lStart[1]+dy*uHead+0.7,lStart[2]+dz*uHead];

            // Outer comet tail -> bright core -> hot white leading edge (zero shadowBlur lag!)
            drawLine3D(ptTail,ptMid,isActive?accent:copper,isActive?2.2:1.4);
            drawLine3D(ptMid,ptHead,isActive?accentBright:copperBright,isActive?3.4:1.8);

            if(isActive){
              const pr=project(ptHead[0],ptHead[1]+0.4,ptHead[2]);
              if(pr&&pr.z<620){
                const bitIdx=(lIdx*2+p)%bitStr.length;
                const bitChar=bitStr[bitIdx]||'1';
                const isOne=bitChar==='1';
                const dotR=Math.max(2.0,Math.min(4.8,360/pr.z));
                ctx.beginPath();
                ctx.fillStyle=isOne?'#ffffff':accentBright;
                ctx.arc(pr.x,pr.y,dotR,0,Math.PI*2);
                ctx.fill();

                // Crisp micro-bit tag floating above the outer lanes (staggered so they never collide)
                if(p===0&&(lIdx===0||lIdx===3)&&pr.z<460){
                  ctx.fillStyle='rgba(4,12,9,0.88)';
                  ctx.strokeStyle=isOne?accentBright:'#eab308';
                  ctx.lineWidth=1;
                  ctx.fillRect(pr.x-7,pr.y-dotR-13,14,11);
                  ctx.strokeRect(pr.x-7,pr.y-dotR-13,14,11);
                  ctx.fillStyle=isOne?'#ffffff':'#fef08a';
                  ctx.font='900 8px ui-monospace,monospace';
                  ctx.textAlign='center';
                  ctx.textBaseline='middle';
                  ctx.fillText(bitChar,pr.x,pr.y-dotR-7.2);
                }
              }
            }
          }
        }
      }

      // Plated through-hole (PTH) / gold via termination pads at both ends of bus
      for(const pt of [pStart,pEnd]){
        const pr=project(pt[0],pt[1]+0.4,pt[2]);
        if(pr&&pr.z<700){
          const padR=Math.max(2.5,Math.min(6.5,380/pr.z));
          ctx.beginPath();
          ctx.fillStyle=isActive?accentBright:gold;
          ctx.strokeStyle='#451a03';
          ctx.lineWidth=1;
          ctx.arc(pr.x,pr.y,padR,0,Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    const route=journeyRoute();
    const step=route[journeyIndex];
    const spatialPins=[];

    // ========================================================================
    // 1. MACRO LAYER: REALISTIC HARDWARE TEST BENCH, INSTRUMENTS, HANDS & PCB
    // ========================================================================
    if(step.scene==='outside'||step.scene==='bench'||step.scene==='board'||step.scene==='package'||step.scene==='pins'){
      // Dark ESD Anti-Static Workbench Mat with bevel border & grounding snap
      drawPoly3D([[-380,0,-340],[380,0,-340],[380,0,280],[-380,0,280]],'#0e1713','#284235',2);
      drawPoly3D([[-365,0.2,-325],[365,0.2,-325],[365,0.2,265],[-365,0.2,265]],'#13201a','#345c46',1.2);
      for(let gx=-340;gx<=340;gx+=34){
        drawLine3D([gx,0.4,-320],[gx,0.4,260],'rgba(74,222,128,0.06)',1);
      }
      for(let gz=-320;gz<=260;gz+=34){
        drawLine3D([-360,0.4,gz],[360,0.4,gz],'rgba(74,222,128,0.06)',1);
      }

      // ----------------------------------------------------------------------
      // 4-CH DIGITAL STORAGE OSCILLOSCOPE (Keysight/Rigol style) at (-215, 0, -45)
      // ----------------------------------------------------------------------
      drawBox3D(-215,0,-45,126,86,68,'#334155','#1e293b','#64748b',1.2,0.5);
      // Recessed front instrument bezel
      drawBox3D(-215,6,-77,118,74,6,'#1e293b','#0f172a','#475569',1);
      // High-contrast phosphor TFT display screen
      drawPoly3D([[-268,16,-80.5],[-184,16,-80.5],[-184,70,-80.5],[-268,70,-80.5]],'#03120e','#38bdf8',1.3);
      // Graticule grid on oscilloscope screen
      for(let gx=-260;gx<=-190;gx+=14)drawLine3D([gx,17,-80.7],[gx,69,-80.7],'rgba(56,189,248,0.16)',0.8);
      for(let gy=24;gy<=64;gy+=10)drawLine3D([-267,gy,-80.7],[-185,gy,-80.7],'rgba(56,189,248,0.16)',0.8);
      // CH1 Yellow Clock Square-Wave + CH2 Active Instruction Waveform
      const wave1=[], wave2=[];
      for(let i=0;i<=20;i++){
        const wx=-265+i*3.9;
        const clk=((i+Math.floor(t*8))%2===0)?58:48;
        const sig=31+Math.sin(t*6+i*0.65)*8+Math.cos(t*3-i*0.4)*3;
        wave1.push([wx,clk,-81]);
        wave2.push([wx,sig,-81]);
      }
      for(let i=0;i<wave1.length-1;i++){
        drawLine3D(wave1[i],wave1[i+1],'#facc15',1.6);
        drawLine3D(wave2[i],wave2[i+1],accent,2.0);
      }
      // 3D Cylindrical Rotary Knobs & BNC Coax Connectors on Oscilloscope right panel
      for(const ky of [58,42,26]){
        drawCylinder3D([-168,ky,-79],[-168,ky,-85],4.5,4.0,'#94a3b8','#cbd5e1',8);
      }
      for(const bx of [-255,-235,-215,-195]){
        drawCylinder3D([bx,11,-79],[bx,11,-85],3.2,3.2,'#eab308','#fef08a',8);
      }
      spatialPins.push({pos:[-215,92,-45],tag:'BENCH INSTRUMENT',label:'4-CH DIGITAL STORAGE OSCILLOSCOPE'});

      // ----------------------------------------------------------------------
      // TRIPLE-OUTPUT BENCH DC POWER SUPPLY at (215, 0, -45)
      // ----------------------------------------------------------------------
      drawBox3D(215,0,-45,112,78,64,'#334155','#1e293b','#64748b',1.2,0.5);
      drawPoly3D([[166,26,-77.5],[264,26,-77.5],[264,64,-77.5],[166,64,-77.5]],'#040d1a','#38bdf8',1.2);
      // 3D Voltage/Current Adjustment Dials & Red/Black Terminal Posts
      drawCylinder3D([182,14,-77],[182,14,-83],4.2,3.8,'#94a3b8','#e2e8f0',8);
      drawCylinder3D([200,14,-77],[200,14,-83],4.2,3.8,'#94a3b8','#e2e8f0',8);
      drawCylinder3D([232,14,-77],[232,14,-83],3.5,3.5,'#ef4444','#fca5a5',8);
      drawCylinder3D([248,14,-77],[248,14,-83],3.5,3.5,'#1e293b','#94a3b8',8);
      spatialPins.push({pos:[215,84,-45],tag:'VCORE REGULATOR',label:'BENCH DC SUPPLY · 1.20V / 4.85A'});

      // ----------------------------------------------------------------------
      // INTERACTIVE 12-SWITCH HARDWARE INSTRUCTION CONTROLLER PAD at (0, 0, -252)
      // Click any switch on the 3D pad to select instructions, toggle RISC/CISC,
      // launch the signal (EXEC), step forward/back, or toggle auto-tour!
      // ----------------------------------------------------------------------
      drawBox3D(0,0,-252,102,15,72,'#1e293b','#0f172a','#475569',1.3,0.5);
      // Angled 3D OLED Status Display Bezel at back of Controller Pad
      drawBox3D(0,15,-222,90,6,12,'#041a12','#020d09',accent,1.2);
      const oledProj=project(0,19.8,-222);
      if(oledProj&&oledProj.z<520){
        ctx.save();
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.font=isMobile?'900 8.5px ui-monospace,monospace':'900 9.5px ui-monospace,monospace';
        const activeSw=(jPressedSwitch&&now-jPressedSwitch.time<550)?jPressedSwitch:jHoveredSwitch;
        const oledText=activeSw?`▶ ${activeSw.desc}`:(isMobile?`PAD READY · ${journeyProgram().asm}`:`PAD READY · ${journeyProgram().asm} (CLICK ANY SWITCH)`);
        const otw=ctx.measureText(oledText).width+16;
        ctx.fillStyle='rgba(2,13,9,0.92)';
        ctx.strokeStyle=accent;
        ctx.lineWidth=1.1;
        ctx.fillRect(oledProj.x-otw*0.5,oledProj.y-8,otw,16);
        ctx.strokeRect(oledProj.x-otw*0.5,oledProj.y-8,otw,16);
        ctx.fillStyle=accentBright;
        ctx.fillText(oledText,oledProj.x,oledProj.y);
        ctx.restore();
      }

      // Render all 12 Interactive Tactile Mechanical Switches & record 2D hit boxes
      const nextSwitchRects=[];
      const swDefs=getPadSwitchDefs();
      for(const sw of swDefs){
        const isHov=jHoveredSwitch&&jHoveredSwitch.id===sw.id;
        const isPress=jPressedSwitch&&jPressedSwitch.id===sw.id&&(now-jPressedSwitch.time<260);
        const keyY=isPress?12.2:(isHov?15.8:15.0);
        const keyH=isPress?3.2:5.4;
        const topFill=isPress
          ?'#ffffff'
          :sw.primary
          ?accent
          :sw.active
          ?(isCisc?'#2563eb':'#16a34a')
          :isHov
          ?'#475569'
          :'#334155';
        const sideFill=sw.primary?shadeColor(accent,0.68):sw.active?'#0f172a':'#1e293b';
        const edgeCol=(isPress||isHov||sw.primary||sw.active)?'#ffffff':'#64748b';

        // Draw switch housing well + 3D tactile keycap
        drawBox3D(sw.kx,keyY,sw.kz,16.5,keyH,12.5,topFill,sideFill,edgeCol,(isHov||sw.primary||sw.active)?1.5:1.0);

        // Compute 2D projected top face for keycap legend & pointer click hit-testing
        const c0=project(sw.kx-8.5,keyY+keyH,sw.kz-6.5);
        const c1=project(sw.kx+8.5,keyY+keyH,sw.kz-6.5);
        const c2=project(sw.kx+8.5,keyY+keyH,sw.kz+6.5);
        const c3=project(sw.kx-8.5,keyY+keyH,sw.kz+6.5);
        const centerTop=project(sw.kx,keyY+keyH+0.4,sw.kz);
        if(c0&&c1&&c2&&c3&&centerTop){
          const minX=Math.min(c0.x,c1.x,c2.x,c3.x)-3;
          const maxX=Math.max(c0.x,c1.x,c2.x,c3.x)+3;
          const minY=Math.min(c0.y,c1.y,c2.y,c3.y)-3;
          const maxY=Math.max(c0.y,c1.y,c2.y,c3.y)+4;
          nextSwitchRects.push({...sw,minX,maxX,minY,maxY});

          ctx.save();
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.font='900 8.5px ui-monospace,monospace';
          ctx.fillStyle=isPress?'#0f172a':(sw.primary?'#051b11':'#f8fafc');
          ctx.fillText(sw.label,centerTop.x,centerTop.y);
          ctx.restore();
        }
      }
      jPadSwitchRects=nextSwitchRects;

      // ======================================================================
      // REALISTIC MOTHERBOARD PCB, VRM CAPACITORS, RAM & CONTROLLER IC CUTAWAY
      // (Drawn BEFORE the resting hands so hands sit naturally in foreground!)
      // ======================================================================
      drawBox3D(0,2,0,348,14,288,'#0a2e1c','#061c11','#1e5e3a',1.5,0.3);
      // Gold-plated motherboard corner mounting holes / standoffs
      for(const [mx,mz] of [[-158,-128],[158,-128],[-158,128],[158,128]]){
        drawCylinder3D([mx,15.5,mz],[mx,17.2,mz],6,6,'#eab308','#fef08a');
      }

      // VRM Power Delivery Phase Inductors (Chokes) & Cylindrical Solid Polymer Capacitors around CPU Socket
      for(let vx=-48;vx<=48;vx+=24){
        drawBox3D(vx,16,74,14,11,14,'#334155','#1e293b','#64748b',1);
        drawCylinder3D([vx,16,56],[vx,28,56],4.8,4.8,'#cbd5e1','#60a5fa');
      }

      // 4 Realistic DDR4 RAM DIMM Modules with black BGA DRAM chips on each module
      for(let i=0;i<4;i++){
        const rx=-138+i*14;
        drawBox3D(rx,16,-20,6.5,34,128,'#14532d','#062e16','#eab308',1);
        for(let chipZ=-68;chipZ<=28;chipZ+=24){
          drawBox3D(rx+2,24,chipZ,3.5,14,14,'#0f172a','#090d16','#334155',0.7);
        }
      }
      spatialPins.push({pos:[-116,55,-20],tag:'SYSTEM MEMORY',label:'DDR4 DIMM BANKS (4 CHANNELS)'});

      // Bus Controller QFP IC centered at (0, 16, -165) with gull-wing metallic leads & X-Ray silicon cutaway
      const ctrlOpen=step.scene==='bench'||step.scene==='board';
      for(let pz=-178;pz<=-152;pz+=5.2){
        drawLine3D([-28,16.5,pz],[-21,19,pz],'#cbd5e1',2.0);
        drawLine3D([21,19,pz],[28,16.5,pz],'#cbd5e1',2.0);
      }
      drawBox3D(0,16,-165,48,11,38,ctrlOpen?'rgba(15,23,42,0.35)':'#1e293b','#0f172a',accent,ctrlOpen?2.0:1.2,16.1);
      drawBox3D(-11,17,-168,15,7.5,14,accent,'#0f172a','#ffffff',1.1);
      drawBox3D(11,17,-160,17,7.5,15,'#f59e0b','#78350f','#fef08a',1.1);
      spatialPins.push({pos:[0,33,-165],tag:'INSIDE CONTROLLER IC',label:`SERIALIZING ${journeyProgram().asm}`,hi:step.scene==='bench'});

      // Etched Copper Bus Traces leading straight from Controller Pad rear connector -> Controller IC -> CPU Socket
      drawTraceWithData(
        [0,18,-214],
        [0,22,-165],
        step.scene==='outside'||step.scene==='bench',
        journeyIndex>1,
        journeyProgram().asm,
        step.bits
      );
      drawTraceWithData(
        [0,22,-165],
        [0,22,-28],
        step.scene==='board'||step.scene==='package',
        journeyIndex>2,
        `BUS: ${journeyProgram().asm}`,
        step.bits
      );
      if(step.scene==='board'){
        spatialPins.push({pos:[0,28,-95],tag:'MOTHERBOARD BUS',label:`COPPER TRACE · ${journeyProgram().asm}`,hi:true});
      }

      // ======================================================================
      // PROPER REALISTIC SILICON PROCESSOR PACKAGE & GOLD LGA SOCKET CONTACTS
      // Multi-layer ABF Substrate + SMD Capacitors + Stepped Nickel-Copper IHS
      // ======================================================================
      drawBox3D(0,16,0,114,3.5,114,'#475569','#1e293b','#94a3b8',1.2,16.1);
      drawCylinder3D([62,19,-54],[62,19,58],2.2,2.2,'#cbd5e1','#f8fafc');

      const targetPkgAlpha=step.scene==='pins'?0.24:0.96;
      jPkgAlpha+=(targetPkgAlpha-jPkgAlpha)*0.14;
      const pkgAlpha=Number(jPkgAlpha.toFixed(3));

      // Depth-sorted 24 Gold LGA Contact Pins inside the socket (visible when package turns X-ray translucent!)
      if(pkgAlpha<0.92||step.scene==='pins'){
        const pinList=[];
        for(let px=-36;px<=36;px+=18){
          for(let pz=-36;pz<=36;pz+=18){
            if(Math.abs(px)<8&&Math.abs(pz)<8)continue;
            const dist=Math.hypot(px-camX,23-camY,pz-camZ);
            pinList.push({px,pz,dist});
          }
        }
        pinList.sort((a,b)=>b.dist-a.dist);
        for(const {px,pz} of pinList){
          drawBox3D(px,19.5,pz,5.5,1.0,5.5,'#eab308','#78350f','#fef08a',0.7);
          drawCylinder3D([px,20,pz],[px,28.5,pz],2.1,1.8,'#eab308','#fef08a');
        }
        if(step.scene==='pins'){
          drawTraceWithData([0,19.5,-44],[0,28,-6],true,true,'PIN SIGNAL · 1.2V',step.bits);
        }
      }

      drawBox3D(0,28.5,0,96,4.2,96,
        isCisc?`rgba(16,64,92,${pkgAlpha})`:`rgba(16,78,48,${pkgAlpha})`,
        `rgba(8,36,24,${pkgAlpha})`,
        gold,1.3
      );
      if(pkgAlpha>0.55){
        for(let sc=-36;sc<=36;sc+=18){
          drawBox3D(sc,32.7,-43,4.2,2.0,2.4,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(sc,32.7,43,4.2,2.0,2.4,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(-43,32.7,sc,2.4,2.0,4.2,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(43,32.7,sc,2.4,2.0,4.2,'#b45309','#78350f','#e2e8f0',0.7);
        }
      }
      drawBox3D(0,32.7,0,78,5.0,78,
        `rgba(180,192,204,${pkgAlpha})`,
        `rgba(100,114,128,${pkgAlpha})`,
        `rgba(226,232,240,${pkgAlpha})`,1.3
      );
      drawBox3D(0,37.7,0,64,4.2,64,
        `rgba(212,222,232,${pkgAlpha})`,
        `rgba(125,138,152,${pkgAlpha})`,
        accent,1.5
      );
      const ihsTop=project(0,42.5,0);
      if(ihsTop&&ihsTop.z<560&&pkgAlpha>0.55){
        ctx.save();
        ctx.textAlign='center';
        ctx.fillStyle='#0f172a';
        ctx.font='900 10px ui-monospace,monospace';
        ctx.fillText(isCisc?'EDU-C86':'EDU-R32',ihsTop.x,ihsTop.y-4);
        ctx.font='700 7.5px ui-monospace,monospace';
        ctx.fillStyle='#334155';
        ctx.fillText(isCisc?'x86 CISC SILICON':'RISC-V SILICON',ihsTop.x,ihsTop.y+6);
        ctx.restore();
      }
      if(step.scene==='pins'){
        spatialPins.push({pos:[-18,26,-18],tag:'GOLD LGA CONTACTS',label:'VDD / CLK / ADDR / DATA PINS',hi:true});
      }else{
        spatialPins.push({
          pos:[0,47,0],
          tag:'SILICON PROCESSOR PACKAGE',
          label:isCisc?'EDU-C86 · NICKEL IHS & ABF SUBSTRATE':'EDU-R32 · NICKEL IHS & ABF SUBSTRATE',
          hi:step.scene==='package'
        });
      }

      // ----------------------------------------------------------------------
      // UNIFIED 3D WEBXR HAND + WRIST + ESD CUFF + FOREARM SLEEVE MESH
      // Extruded directly from the 20 wrist perimeter vertices so the hand,
      // wrist, blue ESD cuff, and dark lab-coat sleeve form ONE seamless 3D
      // mesh, cached to an offscreen canvas for zero-lag 60fps rendering!
      // ----------------------------------------------------------------------
      if((step.scene==='outside'||step.scene==='bench')&&window.WEBXR_HAND_MESH){
        // Soft contact shadows under both resting hands/forearms on the ESD mat
        for(const s of [-1, 1]){
          drawPoly3D(
            [[s*78,0.6,-305],[s*132,0.6,-305],[s*116,0.6,-210],[s*72,0.6,-210]],
            'rgba(0,0,0,0.36)',null,0
          );
        }

        const cKey=[
          Math.round(w),Math.round(h),dpr,
          jCamPos[0].toFixed(1),jCamPos[1].toFixed(1),jCamPos[2].toFixed(1),
          jCamLook[0].toFixed(1),jCamLook[1].toFixed(1),jCamLook[2].toFixed(1),
          jUserYaw.toFixed(3),jUserPitch.toFixed(3)
        ].join('|');

        if(handCacheKey!==cKey){
          handCacheKey=cKey;
          handCacheCanvas.width=Math.floor(w*dpr);
          handCacheCanvas.height=Math.floor(h*dpr);
          handCacheCtx.setTransform(dpr,0,0,dpr,0,0);
          handCacheCtx.clearRect(0,0,w,h);
          handCacheCtx.lineJoin='round';

          const hm=window.WEBXR_HAND_MESH;
          const vArr=hm.v, nArr=hm.n, fArr=hm.f, mArr=hm.m;
          const vCount=vArr.length/3, fCount=fArr.length/3;
          const scale=355;
          const lxKey=0.0, lyKey=0.82, lzKey=-0.57;

          for(const s of [-1, 1]){
            const yaw=-s*0.24;
            const cy=Math.cos(yaw), sy=Math.sin(yaw);
            const wx0=s*110, wy0=15.5, wz0=-278;
            const projV=new Array(vCount);
            const worldN=new Array(vCount);

            for(let i=0;i<vCount;i++){
              const i3=i*3;
              const gx=vArr[i3], gy=vArr[i3+1], gz=vArr[i3+2];
              const ux=s*(gz-0.008)*scale;
              const uy=-(gx+0.035)*scale;
              const uz=-(gy-0.056)*scale;

              const wx=wx0+(ux*cy-uz*sy);
              const wy=wy0+uy+uz*0.04;
              const wz=wz0+(ux*sy+uz*cy);
              projV[i]=project(wx,wy,wz);

              const ngx=nArr[i3], ngy=nArr[i3+1], ngz=nArr[i3+2];
              const nux=s*ngz, nuy=-ngx, nuz=-ngy;
              worldN[i]=[nux*cy-nuz*sy, nuy, nux*sy+nuz*cy];
            }

            const tris=[];
            for(let f=0;f<fCount;f++){
              const f3=f*3;
              const ia=fArr[f3], ib=fArr[f3+1], ic=fArr[f3+2];
              const pa=projV[ia], pb=projV[ib], pc=projV[ic];
              if(!pa||!pb||!pc)continue;
              const na=worldN[ia], nb=worldN[ib], nc=worldN[ic];
              const nx=(na[0]+nb[0]+nc[0])*0.3333;
              const ny=(na[1]+nb[1]+nc[1])*0.3333;
              const nz=(na[2]+nb[2]+nc[2])*0.3333;
              if(ny<-0.45&&nz>0.2)continue;
              const zAvg=(pa.z+pb.z+pc.z)*0.3333;
              const mat=mArr?mArr[f]:0;
              tris.push({pa,pb,pc,nx,ny,nz,z:zAvg,mat});
            }
            tris.sort((a,b)=>b.z-a.z);

            // Batch triangles by quantized RGB shade (~35 buckets instead of 5,800 draw calls) for 60fps transitions
            const colorBuckets=new Map();
            for(const tr of tris){
              const ndotl=Math.max(0,tr.nx*lxKey+tr.ny*lyKey+tr.nz*lzKey);
              const rim=Math.max(0,1-Math.abs(tr.ny))*0.16;
              let r,g,b;
              if(tr.mat===1){
                // Material 1: Contoured Blue Anti-Static ESD Wristband Cuff
                const lit=0.45+ndotl*0.52+rim;
                const spec=Math.pow(ndotl,10)*0.28;
                r=Math.min(255,Math.round(14*lit+spec*220));
                g=Math.min(255,Math.round(155*lit+spec*245));
                b=Math.min(255,Math.round(235*lit+spec*255));
              }else if(tr.mat===2){
                // Material 2: Tailored Dark Slate Lab-Coat Forearm Sleeve
                const lit=0.42+ndotl*0.48+rim*0.8;
                r=Math.min(255,Math.round(42*lit));
                g=Math.min(255,Math.round(58*lit));
                b=Math.min(255,Math.round(82*lit));
              }else{
                // Material 0: Smooth Studio-Lit Anatomical Skin (warm subsurface tone)
                const lit=0.52+ndotl*0.42+rim*0.65;
                const spec=Math.pow(ndotl,14)*0.14;
                r=Math.min(255,Math.round(224*lit+spec*255));
                g=Math.min(255,Math.round(164*lit+spec*240));
                b=Math.min(255,Math.round(128*lit+spec*225));
              }
              const qr=(r>>2)<<2, qg=(g>>2)<<2, qb=(b>>2)<<2;
              const col=`rgb(${qr},${qg},${qb})`;
              let bucket=colorBuckets.get(col);
              if(!bucket){
                bucket=[];
                colorBuckets.set(col,bucket);
              }
              bucket.push(tr);
            }
            for(const [col,bucket] of colorBuckets){
              handCacheCtx.fillStyle=col;
              handCacheCtx.beginPath();
              for(let bIdx=0;bIdx<bucket.length;bIdx++){
                const tr=bucket[bIdx];
                const ax=tr.pa.x, ay=tr.pa.y, bx=tr.pb.x, by=tr.pb.y, cx=tr.pc.x, cy=tr.pc.y;
                const mx=(ax+bx+cx)*0.3333, my=(ay+by+cy)*0.3333;
                const dax=ax-mx, day=ay-my, la=Math.hypot(dax,day)||1;
                const dbx=bx-mx, dby=by-my, lb=Math.hypot(dbx,dby)||1;
                const dcx=cx-mx, dcy=cy-my, lc=Math.hypot(dcx,dcy)||1;
                handCacheCtx.moveTo(ax+(dax/la)*0.42,ay+(day/la)*0.42);
                handCacheCtx.lineTo(bx+(dbx/lb)*0.42,by+(dby/lb)*0.42);
                handCacheCtx.lineTo(cx+(dcx/lc)*0.42,cy+(dcy/lc)*0.42);
                handCacheCtx.closePath();
              }
              handCacheCtx.fill();
            }
          }
        }
        // Blit cached 3D hands + wrists + cuffs + forearms in 1 single drawImage call (<0.03ms!)
        ctx.drawImage(handCacheCanvas,0,0,w,h);
      }else{
        jPadSwitchRects=[];
      }
    }

    // ========================================================================
    // 2. MICRO LAYER: DEPTH-SORTED SILICON DIE FLOORPLAN, TSV VIAS & BUS TRACES
    // ========================================================================
    if(step.scene==='substrate'||step.scene==='die'||step.scene==='internal'||step.scene==='exit'){
      jPadSwitchRects=[];
      const layout=DIE_LAYOUT_3D[coreArch];
      // 3.1 Metallic Silicon Wafer Die Bulk Substrate Slab (with thickness & bevel)
      drawBox3D(0,-128,5,690,8,465,'#09131c','#1e293b','#eab308',1.8);
      // Iridescent Photolithography Silicon Die Top Surface at y = -120
      drawPoly3D(
        [[-338,-119.8,-220],[338,-119.8,-220],[338,-119.8,230],[-338,-119.8,230]],
        isCisc?'rgba(8,20,38,0.96)':'rgba(7,22,16,0.96)',
        '#eab308',2.0
      );

      // 3.2 Fine Photolithography Reticle & M1/M2 Copper Power-Grid Mesh across the silicon wafer
      for(let gx=-300;gx<=300;gx+=30){
        drawLine3D([gx,-119.4,-205],[gx,-119.4,215],gx%60===0?'rgba(234,179,8,0.16)':'rgba(56,189,248,0.08)',gx%60===0?1.1:0.7);
      }
      for(let gz=-195;gz<=210;gz+=30){
        drawLine3D([-315,-119.4,gz],[315,-119.4,gz],gz%60===0?'rgba(234,179,8,0.16)':'rgba(56,189,248,0.08)',gz%60===0?1.1:0.7);
      }

      // 3.3 Depth-Sorted Perimeter Gold Flip-Chip Bond Pads lining all 4 edges of the Silicon Die
      const bondPads=[];
      for(let bx=-310;bx<=310;bx+=26){
        bondPads.push({x:bx,z:-212,w:12,d:7});
        bondPads.push({x:bx,z:222,w:12,d:7});
      }
      for(let bz=-195;bz<=205;bz+=25){
        bondPads.push({x:-328,z:bz,w:7,d:12});
        bondPads.push({x:328,z:bz,w:7,d:12});
      }
      bondPads.sort((a,b)=>Math.hypot(b.x-camX,-119-camY,b.z-camZ)-Math.hypot(a.x-camX,-119-camY,a.z-camZ));
      for(const bp of bondPads){
        drawBox3D(bp.x,-119.5,bp.z,bp.w,1.8,bp.d,'#eab308','#a16207','#fef08a',0.7);
      }

      // 3.4 Draw On-Die 4-Lane Metal Bus Traces ON THE WAFER SURFACE (y = -118.5)
      // BEFORE the raised 3D Silicon Macro Blocks so background traces NEVER paint over foreground 3D blocks!
      const progSteps=journeyProgram().steps;
      for(let sIdx=0;sIdx<progSteps.length;sIdx++){
        const curS=progSteps[sIdx];
        const curU=layout[curS.unit];
        if(!curU)continue;
        const prevU=sIdx===0?[curU[0],-198]:layout[progSteps[sIdx-1].unit];
        if(!prevU)continue;
        const dx=curU[0]-prevU[0], dz=curU[1]-prevU[1];
        const dist=Math.hypot(dx,dz)||1;
        const nx=dx/dist, nz=dz/dist;
        const sOff=sIdx===0?8:Math.min(42,dist*0.28);
        const eOff=Math.min(42,dist*0.28);
        const routeIdx=sIdx+7;
        const isCurrentTrace=(journeyIndex===routeIdx)||(sIdx===0&&step.scene==='die');
        const isDoneTrace=(journeyIndex>routeIdx);
        drawTraceWithData(
          [prevU[0]+nx*sOff,-118.4,prevU[1]+nz*sOff],
          [curU[0]-nx*eOff,-118.4,curU[1]-nz*eOff],
          isCurrentTrace,
          isDoneTrace,
          curS.value,
          curS.bits
        );
      }

      // 3.5 Draw every 3D Photolithography Silicon Functional Macro Block SORTED BACK-TO-FRONT by camera distance!
      const sortedMacros=Object.entries(layout).map(([key,u])=>{
        const [ux,uz]=u;
        const dist=Math.hypot(ux-camX,-110-camY,uz-camZ);
        return {key,u,dist};
      }).sort((a,b)=>b.dist-a.dist);

      for(const {key,u} of sortedMacros){
        const [ux,uz,uw,uh,ud,ulabel]=u;
        const isCurrent=(step.unit===key);
        const isVisited=route.slice(7,journeyIndex).some(s=>s.unit===key);

        const topCol=isCurrent
          ?(isCisc?'#2563eb':'#16a34a')
          :isVisited
          ?(isCisc?'#1e3a8a':'#14532d')
          :(isCisc?'#0f2447':'#0d2b1d');
        const sideCol=isCurrent
          ?(isCisc?'#1d4ed8':'#15803d')
          :(isCisc?'#0b1933':'#081c13');
        const edgeCol=isCurrent?'#ffffff':isVisited?accent:'#d97706';
        const boxH=(isCurrent?uh+6:uh)*0.55;

        // Gold/Copper Power Ring pad framing the silicon block on the wafer
        drawPoly3D(
          [[ux-uw*0.54,-119.2,uz-ud*0.54],[ux+uw*0.54,-119.2,uz-ud*0.54],[ux+uw*0.54,-119.2,uz+ud*0.54],[ux-uw*0.54,-119.2,uz+ud*0.54]],
          'rgba(234,179,8,0.14)',isCurrent?accentBright:'rgba(234,179,8,0.55)',1.1
        );

        // Main Silicon Macro Block Volume
        drawBox3D(ux,-119,uz,uw,boxH,ud,topCol,sideCol,edgeCol,isCurrent?2.0:1.1,-119.1);

        // Dense Photolithography Internal Sub-Arrays on the top face, ALSO depth-sorted back-to-front!
        const topY=-119+boxH+0.4;
        const isMemBlock=(key==='icache'||key==='dcache'||key==='ucode'||key==='lsu'||key==='regs'||key==='rename'||key==='queue'||key==='retire');
        const subBoxes=[];
        if(isMemBlock){
          const cols=3, rows=2;
          const cellW=(uw*0.76)/cols, cellD=(ud*0.72)/rows;
          for(let r=0;r<rows;r++){
            for(let c=0;c<cols;c++){
              const cx=ux-uw*0.38+cellW*(c+0.5)+(c-1)*2.2;
              const cz=uz-ud*0.36+cellD*(r+0.5)+(r-0.5)*2.5;
              subBoxes.push({
                cx,cz,w:cellW,h:2.2,d:cellD,
                tCol:isCurrent?'#38bdf8':(isCisc?'#1e40af':'#0f766e'),
                sCol:'#0f172a',
                eCol:isCurrent?'#ffffff':'#eab308',
                lw:0.8,
                dist:Math.hypot(cx-camX,topY-camY,cz-camZ)
              });
            }
          }
        }else{
          for(let r=-2;r<=2;r++){
            const rz=uz+r*(ud*0.16);
            subBoxes.push({
              cx:ux,cz:rz,w:uw*0.82,h:1.6,d:ud*0.09,
              tCol:isCurrent?accentBright:'#eab308',
              sCol:'#1e293b',
              eCol:isCurrent?'#ffffff':copper,
              lw:0.7,
              dist:Math.hypot(ux-camX,topY-camY,rz-camZ)
            });
          }
        }
        subBoxes.sort((a,b)=>b.dist-a.dist);
        for(const sb of subBoxes){
          drawBox3D(sb.cx,topY,sb.cz,sb.w,sb.h,sb.d,sb.tCol,sb.sCol,sb.eCol,sb.lw);
        }

        if(step.scene!=='substrate'){
          spatialPins.push({
            pos:[ux,topY+8,uz],
            tag:isCurrent?'ACTIVE SILICON MACRO':isVisited?'COMPLETED MACRO':'SILICON MACRO',
            label:ulabel,
            hi:isCurrent
          });
        }
      }

      // 3.55 Package Substrate Copper TSV Vias & C4 Micro-Bumps descending onto the north I/O edge of the Silicon Die
      if(step.scene==='substrate'||(step.scene==='die'&&jPrevScene==='substrate'&&rawT<1)){
        for(const ly of [-92,-62,-32]){
          drawPoly3D([[-145,ly,-218],[65,ly,-218],[65,ly,-162],[-145,ly,-162]],'rgba(180,115,35,0.16)','rgba(245,158,11,0.55)',1.2);
        }
        const viaList=[];
        for(let vx=-126;vx<=42;vx+=42){
          for(let vz=-205;vz<=-175;vz+=30){
            const dist=Math.hypot(vx-camX,-65-camY,vz-camZ);
            viaList.push({vx,vz,dist});
          }
        }
        viaList.sort((a,b)=>b.dist-a.dist);
        for(const {vx,vz} of viaList){
          drawBox3D(vx,-119,vz,6.5,4.5,6.5,'#cbd5e1','#64748b','#f8fafc',0.9);
          drawCylinder3D([vx,-114,vz],[vx,-18,vz],2.1,2.1,'#d97706','#fbbf24');
        }
        drawTraceWithData([-54,-22,-190],[-54,-114,-190],step.scene==='substrate',step.scene==='die','COPPER VIA → C4 BUMP',step.bits);
        drawBox3D(-40,-18,-190,218,5,64,'rgba(16,78,48,0.48)','rgba(8,36,24,0.42)',gold,1.3);
        if(step.scene==='substrate'){
          spatialPins.push({pos:[-42,-58,-190],tag:'PACKAGE SUBSTRATE',label:'COPPER VIAS & C4 FLIP-CHIP BUMPS',hi:true});
        }
      }

      // 3.6 System Bus Exit Conduit (ONLY drawn during Checkpoint 15 'exit' so it never photobombs internal stages!)
      if(step.scene==='exit'){
        const lastUnitKey=progSteps[progSteps.length-1]?.unit;
        const lastU=layout[lastUnitKey];
        if(lastU){
          drawTraceWithData(
            [lastU[0],-104,lastU[1]-32],
            [0,-38,-90],
            true,
            false,
            `RESULT: ${progSteps[progSteps.length-1].value}`,
            step.bits
          );
        }
      }
    }

    // ========================================================================
    // 4. SYNCHRONIZED BUS PACKET TRANSPONDER & CALLOUT (NO DUPLICATE OVERDRAW)
    // ========================================================================
    const curCoords=getStage3DCoords(step,journeyIndex,route);
    let packetBannerPos=null;
    if(curCoords.traceFrom&&curCoords.traceTo&&step.scene!=='outside'){
      const tf=curCoords.traceFrom, tt=curCoords.traceTo;
      const dpx=(tf[0]+tt[0])*0.5;
      const dpy=(tf[1]+tt[1])*0.5+6.5;
      const dpz=(tf[2]+tt[2])*0.5;
      const dpProj=project(dpx,dpy,dpz);
      if(dpProj&&dpProj.z<520){
        ctx.save();
        ctx.font=isMobile?'900 8.5px ui-monospace,monospace':'900 10px ui-monospace,monospace';
        const syncTxt=isMobile?step.value:`BUS PACKET · ${step.value}`;
        const stw=ctx.measureText(syncTxt).width+16;
        const bx=Math.max(stw*0.5+8,Math.min(w-stw*0.5-8,dpProj.x));
        packetBannerPos={x:bx,y:dpProj.y-15};
        ctx.fillStyle='rgba(4,12,9,0.92)';
        ctx.strokeStyle=accentBright;
        ctx.lineWidth=1.2;
        ctx.fillRect(bx-stw*0.5,dpProj.y-24,stw,18);
        ctx.strokeRect(bx-stw*0.5,dpProj.y-24,stw,18);
        ctx.fillStyle='#ffffff';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(syncTxt,bx,dpProj.y-15);
        ctx.restore();
      }
    }

    // ========================================================================
    // 5. UPDATE 3D-PROJECTED SPATIAL CALLOUT PINS (DOM-CACHED FOR ZERO LAG)
    // ========================================================================
    const labelBox=$('#journeySpatialLabels');
    if(labelBox){
      if(isMobile){
        if(lastPinHTML!==''){lastPinHTML='';labelBox.innerHTML=''}
      }else{
        const visiblePins=[];
        for(const pin of spatialPins){
          const pr=project(pin.pos[0],pin.pos[1],pin.pos[2]);
          if(!pr||pr.z>950||pr.z<15)continue;
          if(pr.x<90||pr.x>w-90||pr.y<65||pr.y>h-55)continue;
          if(pr.x<485&&pr.y<340)continue;
          if(packetBannerPos&&Math.abs(pr.x-packetBannerPos.x)<165&&Math.abs(pr.y-packetBannerPos.y)<42)continue;
          visiblePins.push({...pin,x:Math.round(pr.x),y:Math.round(pr.y),z:pr.z});
        }
        visiblePins.sort((a,b)=>(b.hi?1:0)-(a.hi?1:0)||a.z-b.z);
        const placedPins=[];
        for(const p of visiblePins){
          if(placedPins.length>=5)break;
          if(placedPins.some(q=>Math.abs(p.x-q.x)<155&&Math.abs(p.y-q.y)<36))continue;
          placedPins.push(p);
        }
        const nextPinHTML=placedPins.map(p=>`<div class="spatial-pin ${p.hi?'highlight':''}" style="left:${p.x}px;top:${p.y}px"><small>${p.tag}</small>${p.label}</div>`).join('');
        if(nextPinHTML!==lastPinHTML){
          lastPinHTML=nextPinHTML;
          labelBox.innerHTML=nextPinHTML;
        }
      }
    }

    ctx.restore();
    jAnimFrame=requestAnimationFrame(frame);
  }
  jAnimFrame=requestAnimationFrame(frame);
}

// Interactive 3D switch clicking, hovering, and look-around on #journeyCanvas
(()=>{
  const canvas=$('#journeyCanvas');
  if(!canvas)return;
  let dragging=false,sx=0,sy=0,sYaw=0,sPitch=0,downSwitch=null;

  function findSwitchAt(clientX,clientY){
    if(!jPadSwitchRects.length)return null;
    const rect=canvas.getBoundingClientRect();
    const mx=clientX-rect.left;
    const my=clientY-rect.top;
    for(const sw of jPadSwitchRects){
      if(mx>=sw.minX&&mx<=sw.maxX&&my>=sw.minY&&my<=sw.maxY){
        return sw;
      }
    }
    return null;
  }

  canvas.addEventListener('pointerdown',e=>{
    const hit=findSwitchAt(e.clientX,e.clientY);
    downSwitch=hit;
    dragging=true;sx=e.clientX;sy=e.clientY;sYaw=jUserYaw;sPitch=jUserPitch;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging){
      const hit=findSwitchAt(e.clientX,e.clientY);
      jHoveredSwitch=hit;
      canvas.style.cursor=hit?'pointer':'grab';
      return;
    }
    const dist=Math.hypot(e.clientX-sx,e.clientY-sy);
    if(dist>6){
      downSwitch=null;
      canvas.style.cursor='grabbing';
      jUserYaw=Math.max(-0.85,Math.min(0.85,sYaw+(e.clientX-sx)*0.0035));
      jUserPitch=Math.max(-0.45,Math.min(0.45,sPitch-(e.clientY-sy)*0.0028));
    }
  });
  canvas.addEventListener('pointerup',e=>{
    if(downSwitch&&Math.hypot(e.clientX-sx,e.clientY-sy)<=8){
      pressPadSwitch(downSwitch);
    }
    downSwitch=null;
    dragging=false;
    const hit=findSwitchAt(e.clientX,e.clientY);
    jHoveredSwitch=hit;
    canvas.style.cursor=hit?'pointer':'grab';
  });
  canvas.addEventListener('pointercancel',()=>{downSwitch=null;dragging=false;canvas.style.cursor='grab'});
})();

let journeyTravelTimeout=null;
function stopJourneyAuto(){clearInterval(journeyAutoTimer);journeyAutoTimer=null;$('#journeyAuto').innerHTML='Auto tour <b>▶</b>'}
function jumpToJourneyIndex(next){
  const route=journeyRoute();
  next=Math.max(0,Math.min(route.length-1,next));
  if(next===journeyIndex)return;
  jPrevScene=route[journeyIndex]?.scene||'outside';
  journeyTraveling=true;
  jUserYaw=0;jUserPitch=0;
  $('#cpuJourney').classList.add('traveling');
  journeyIndex=next;
  updateJourneyTargets(false);
  renderJourney();
  journeyTone(coreArch==='cisc'?210:270,.22);
  clearTimeout(journeyTravelTimeout);
  journeyTravelTimeout=setTimeout(()=>{
    journeyTraveling=false;
    $('#cpuJourney').classList.remove('traveling');
    renderJourney();
  },jTransDur);
}
function travelJourney(direction){
  jumpToJourneyIndex(journeyIndex+direction);
}
function restartJourney(){
  stopJourneyAuto();
  journeyTraveling=false;
  jUserYaw=0;jUserPitch=0;
  $('#cpuJourney').classList.remove('traveling');
  journeyIndex=0;
  updateJourneyTargets(true);
  renderJourney();
  journeyTone(200,.22);
}
function openJourney(){
  journeyIndex=0;
  jUserYaw=0;jUserPitch=0;
  stopCore();
  createJourneyParticles();
  $('#cpuJourney').hidden=false;
  document.body.style.overflow='hidden';
  updateJourneyTargets(true);
  renderJourney();
  startJourney3DLoop();
  journeyTone(165,.38);
}
function closeJourney(){
  stopJourneyAuto();
  if(jAnimFrame){cancelAnimationFrame(jAnimFrame);jAnimFrame=null}
  $('#cpuJourney').hidden=true;
  document.body.style.overflow='';
  journeyTraveling=false;
  $('#cpuJourney').classList.remove('traveling');
}
function toggleJourneyAuto(){
  if(journeyAutoTimer){stopJourneyAuto();return}
  if(journeyIndex===journeyRoute().length-1){journeyIndex=0;updateJourneyTargets(true)}
  $('#journeyAuto').innerHTML='Pause tour <b>Ⅱ</b>';
  renderJourney();
  journeyAutoTimer=setInterval(()=>{
    if(journeyIndex===journeyRoute().length-1){stopJourneyAuto();journeyTone(520,.45);return}
    travelJourney(1);
  },2200);
}
$('#enterJourney').onclick=openJourney;
if($('#heroJourneyBtn'))$('#heroJourneyBtn').onclick=openJourney;
if($('#journeyRestart'))$('#journeyRestart').onclick=restartJourney;
$('#closeJourney').onclick=closeJourney;
$('#journeyNextButton').onclick=()=>travelJourney(1);
$('#journeyBack').onclick=()=>travelJourney(-1);
$('#journeyAuto').onclick=toggleJourneyAuto;
$('#journeySound').onclick=()=>{
  journeySoundOn=!journeySoundOn;
  $('#journeySound').textContent=journeySoundOn?'SOUND ON':'SOUND OFF';
  $('#journeySound').classList.toggle('active',journeySoundOn);
  journeyTone(330,.2);
};
document.addEventListener('keydown',e=>{
  if($('#cpuJourney').hidden)return;
  if(e.key==='Escape')closeJourney();
  if(e.key==='ArrowRight')travelJourney(1);
  if(e.key==='ArrowLeft')travelJourney(-1);
  if(e.code==='Space'){e.preventDefault();toggleJourneyAuto()}
});

// Support deep-linking into any 3D architecture mode, instruction, theme, or journey checkpoint via URL params
(()=>{
  const params=new URLSearchParams(window.location.search);
  if(params.get('theme')==='dark'){
    document.body.classList.add('dark');
  }
  const arch=params.get('arch');
  const rawCmd=params.get('cmd');
  const cmd=rawCmd==='memadd'?'addm':rawCmd;
  if(arch==='risc'||arch==='cisc'){
    coreArch=arch;
    coreInstruction=coreArch==='risc'?'add':'mov';
    $$('[data-core-arch]').forEach(b=>b.classList.toggle('active',b.dataset.coreArch===coreArch));
  }
  if(cmd&&CORE_PROGRAMS[coreArch]?.[cmd]){
    coreInstruction=cmd;
  }
  renderCoreInstructionButtons();
  resetCore();
  if(params.get('exploded')==='1'&&!$('#chipModel').classList.contains('exploded')){
    $('#explodeCore').click();
  }
  const scrollTarget=params.get('scroll');
  if(scrollTarget&&document.getElementById(scrollTarget)){
    $$('.reveal').forEach(el=>el.classList.add('visible'));
    document.getElementById(scrollTarget).scrollIntoView({behavior:'instant'});
  }
  const onlyTarget=params.get('only');
  if(onlyTarget==='core3d'){
    $$('.reveal').forEach(el=>el.classList.add('visible'));
    const vp=$('#coreViewport');
    if(vp){vp.style.position='fixed';vp.style.inset='0';vp.style.zIndex='99999';vp.style.height='100vh';vp.style.margin='0';}
  }else if(onlyTarget&&document.getElementById(onlyTarget)){
    $$('main > section').forEach(sec=>{if(sec.id!==onlyTarget)sec.style.display='none'});
  }
  if(params.get('journey')==='1'){
    openJourney();
    const stepParam=parseInt(params.get('step')||'0',10);
    if(!Number.isNaN(stepParam)&&stepParam>=0){
      const route=journeyRoute();
      journeyIndex=Math.min(route.length-1,stepParam);
      updateJourneyTargets(true);
      renderJourney();
    }
  }
})();
