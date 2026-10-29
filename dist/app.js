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

const tourData=[['Choose the workload','Start with one of three equivalent programs. Each preset loads matching memory into both machines.'],['Control the clock','Step once to inspect a single instruction, or Run to watch both models advance together.'],['Inspect the machine','Follow pipeline stages, micro-operations, register changes, and memory writes highlighted in real time.'],['Read the trade-off','The live finding compares instructions, cycles, CPI, and code bytes. No architecture wins every dimension.']];let tourIndex=0;function showTour(){tourIndex=0;updateTour();$('#tour').hidden=false}function updateTour(){const [t,p]=tourData[tourIndex];$('#tourStep').textContent=`0${tourIndex+1} / 04`;$('#tourTitle').textContent=t;$('#tourText').textContent=p;$$('.tour-dots i').forEach((x,i)=>x.classList.toggle('active',i===tourIndex));$('#tourNext').textContent=tourIndex===3?'Open simulator ↓':'Next →'}$('#tourBtn').onclick=showTour;$('#tourClose').onclick=()=>$('#tour').hidden=true;$('#tourNext').onclick=()=>{if(tourIndex===3){$('#tour').hidden=true;location.hash='simulator'}else{tourIndex++;updateTour()}};

const quiz=[
  {q:'Which design typically uses fixed-length instructions?',a:['RISC','CISC','Both always do'],correct:0,why:'RISC instruction formats are usually fixed (such as 32 bits) with regular field positions, simplifying fetch and decode.'},
  {q:'Why can CISC achieve better code density?',a:['It has fewer registers','One instruction can encode more work','Its clock is always faster'],correct:1,why:'Variable-length, expressive instructions can combine address calculation, memory access, and arithmetic in fewer program bytes.'},
  {q:'What does a modern CISC core often do internally?',a:['Translate instructions into micro-ops','Remove its pipeline','Avoid registers entirely'],correct:0,why:'Modern x86-style cores decode complex instructions into smaller RISC-like internal micro-operations (µops) for pipelined out-of-order execution.'},
  {q:'In a load–store RISC architecture, which instructions access data memory?',a:['Every ALU instruction','Only explicit load and store commands','Only branch instructions'],correct:1,why:'Arithmetic and logical instructions operate strictly on registers; only dedicated load/store commands read or write data memory.'},
  {q:'What is the purpose of Register Renaming and the Reorder Buffer (ROB)?',a:['To eliminate false register dependencies while committing results in program order','To slow down the clock','To replace the instruction cache'],correct:0,why:'Renaming maps architectural registers onto a larger pool of physical registers for out-of-order execution, while the ROB retires instructions in order.'},
  {q:'Why does executing fewer architectural instructions not automatically make a program faster?',a:['Because CPU time depends on Instructions × CPI × Clock Period','Because memory is infinitely fast','Because compilers ignore instruction count'],correct:0,why:'Complex instructions may require more cycles per instruction (CPI) or deeper decoding; true performance depends on the product of instruction count, CPI, and clock cycle time.'}
];let qi=0;function renderQuiz(){const q=quiz[qi];$('#quizProgress').textContent=`${qi+1} / ${quiz.length}`;$('#quizQuestion').textContent=q.q;$('#quizFeedback').textContent='';$('#nextQuestion').hidden=true;$('#quizOptions').innerHTML=q.a.map((x,i)=>`<button data-i="${i}">${String.fromCharCode(65+i)}. ${x}</button>`).join('');$$('#quizOptions button').forEach(b=>b.onclick=()=>answerQuiz(+b.dataset.i))}function answerQuiz(i){const q=quiz[qi];$$('#quizOptions button').forEach((b,j)=>{b.disabled=true;if(j===q.correct)b.classList.add('correct');if(j===i&&i!==q.correct)b.classList.add('wrong')});$('#quizFeedback').textContent=(i===q.correct?'Correct — ':'Not quite — ')+q.why;$('#nextQuestion').hidden=false}$('#nextQuestion').onclick=()=>{qi=(qi+1)%quiz.length;renderQuiz()};
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
function renderDeep(){const d=deepData(),p=d.phases[deepPhase];$('#deep-dive').classList.toggle('cisc-mode',deepArch==='cisc');$$('[data-deep-arch]').forEach(b=>b.classList.toggle('active',b.dataset.deepArch===deepArch));$('#deepModelTitle').textContent=deepArch==='risc'?'RISC load–store model':'CISC x86-style model';$('#deepModelNote').textContent=deepArch==='risc'?'Fixed 32-bit instructions and a load–store datapath. Only explicit load/store commands access data memory.':'Variable-length instructions decoded into internal micro-operations. Some operands and state changes are implicit.';$('#deepAsm').textContent=d.asm;$('#deepAsm').style.color=deepArch==='risc'?'var(--risc)':'var(--cisc)';$('#deepPurpose').textContent=d.purpose;$('#binaryHex').textContent=d.hex;$('#binaryFields').innerHTML=d.fields.map(f=>`<i style="flex:${f[2]}"><small>${f[0]}</small><br>${f[1]}</i>`).join('');$('#phaseStrip').innerHTML=d.phases.map((x,i)=>`<div class="phase-chip ${i===deepPhase?'active':i<deepPhase?'done':''}"><small>0${i+1}</small><b>${x[0]}</b></div>`).join('');$('#phaseTitle').textContent=p[0];$('#phaseCounter').textContent=`${deepPhase+1} / ${d.phases.length}`;$('#phaseNumber').textContent=String(deepPhase+1).padStart(2,'0');$('#phaseHeading').textContent=p[1];$('#phaseExplanation').textContent=p[2];$('#busValue').textContent=p[3];
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
    {unit:'pc',title:'Program counter presents the address',text:'PC places 0x0040 on the instruction-address trace. The next sequential address (0x0044) is prepared in parallel.',value:'PC = 0x0040',xy:[11,20],path:[],bits:'0000000001000000'},
    {unit:'icache',title:'Instruction cache returns 32 bits',text:'Traveling beside the fetch trace into L1 I-Cache: one aligned 32-bit RISC instruction is read in a single cycle.',value:'0x002081B3',xy:[30,20],path:['pc-icache'],bits:'00000000001000001000000110110011'},
    {unit:'decoder',title:'Control decodes fixed fields',text:'Inside the Control Decoder: opcode 0110011 selects register arithmetic. Fixed bit positions immediately identify R1, R2, and R3.',value:'op=0110011 · rd=R3',xy:[53,20],path:['icache-decode'],bits:'011001100011000100010010'},
    {unit:'regs',title:'Register file releases two operands',text:'Riding beside the register-select traces into the 32×32 Register File: two read ports simultaneously place R1=7 and R2=12 onto the operand traces.',value:'R1=7 · R2=12',xy:[80,20],path:['decode-regs'],bits:'0000011100001100'},
    {unit:'alu',title:'ALU performs one addition',text:'Transported alongside operands 7 and 12 into the ALU: the adder computes 19 in one cycle and bypasses Data Memory entirely.',value:'7 + 12 = 19',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000000000010011'},
    {unit:'writeback',title:'Result travels on the writeback trace',text:'Riding beside the Writeback Bus with result 19: RegWrite and destination R3 are asserted.',value:'WB bus = 19',xy:[75,82],path:['alu-writeback'],bits:'0000000000010011'},
    {unit:'regs',title:'R3 commits on the clock edge',text:'Returning along the writeback trace to the Register File: R3 latches 19 on the rising clock edge.',value:'R3 ← 19',xy:[80,20],path:['writeback-regs'],bits:'0000000000010011'}]},
  load:{asm:'LW R4, 8(R1)',label:'Load from memory',steps:[
    {unit:'pc',title:'Program counter presents the address',text:'PC places 0x0044 on the fetch trace to request the load instruction.',value:'PC = 0x0044',xy:[11,20],path:[],bits:'0000000001000100'},
    {unit:'icache',title:'Instruction cache fetches LW',text:'Riding beside the fetch trace into L1 I-Cache: the fixed 32-bit LW encoding is returned.',value:'0x0080A203',xy:[30,20],path:['pc-icache'],bits:'00000000100000001010001000000011'},
    {unit:'decoder',title:'Decoder extracts base and offset',text:'Inside the Control Decoder: base register R1, destination R4, and sign-extended offset +8 are extracted.',value:'base=R1 · imm=8',xy:[53,20],path:['icache-decode'],bits:'000010000001010001000001'},
    {unit:'regs',title:'Register file reads the base address',text:'Traveling with the register index into the Register File: R1 supplies base address 1000.',value:'R1 = 1000',xy:[80,20],path:['decode-regs'],bits:'0000001111101000'},
    {unit:'alu',title:'ALU calculates effective memory address',text:'Riding beside base 1000 and offset 8 into the ALU: addition produces effective address 1008.',value:'EA = 1000 + 8 = 1008',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000001111110000'},
    {unit:'dcache',title:'Data cache reads word at 1008',text:'Transported alongside address 1008 on the memory trace into L1 Data Cache: the cache line returns word 42.',value:'MEM[1008] = 42',xy:[81,60],path:['alu-dcache'],bits:'0000000000101010'},
    {unit:'writeback',title:'Loaded word enters the writeback trace',text:'Riding beside the loaded value 42 onto the Writeback Bus toward destination R4.',value:'load bus = 42',xy:[75,82],path:['dcache-writeback'],bits:'0000000000101010'},
    {unit:'regs',title:'R4 receives the loaded word',text:'Following the writeback trace back to the Register File: R4 commits value 42.',value:'R4 ← 42',xy:[80,20],path:['writeback-regs'],bits:'0000000000101010'}]},
  store:{asm:'SW R2, 12(R1)',label:'Store to memory',steps:[
    {unit:'pc',title:'Program counter presents the address',text:'PC places 0x0048 on the fetch trace to begin the store instruction.',value:'PC = 0x0048',xy:[11,20],path:[],bits:'0000000001001000'},
    {unit:'icache',title:'Instruction cache fetches SW',text:'Riding beside the fetch trace into L1 I-Cache: the 32-bit store-word instruction is fetched.',value:'0x0020A623',xy:[30,20],path:['pc-icache'],bits:'00000000001000001010011000100011'},
    {unit:'decoder',title:'Decoder reconstructs split immediate',text:'Inside the Control Decoder: the two split immediate fields are joined into offset +12 and MemWrite is prepared.',value:'base=R1 · src=R2 · off=12',xy:[53,20],path:['icache-decode'],bits:'000011000001001000100011'},
    {unit:'regs',title:'Register file reads base and store data',text:'Traveling into the Register File: port A reads base R1=1000 while port B reads data value R2=12.',value:'R1=1000 · R2=12',xy:[80,20],path:['decode-regs'],bits:'000000111110100000001100'},
    {unit:'alu',title:'ALU forms destination memory address',text:'Riding beside R1=1000 and offset 12 into the ALU: addition forms target memory address 1012.',value:'EA = 1000 + 12 = 1012',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000001111110100'},
    {unit:'dcache',title:'Data cache writes R2 into MEM[1012]',text:'Transported beside address 1012 and data 12 into L1 Data Cache: MEM[1012] is updated to 12. Register writeback is skipped.',value:'MEM[1012] ← 12 (no WB)',xy:[81,60],path:['alu-dcache'],bits:'0000000000001100'}]},
  branch:{asm:'BEQ R1, R2, +16',label:'Conditional branch',steps:[
    {unit:'pc',title:'Program counter presents branch address',text:'PC places branch address 0x0050 on the fetch trace.',value:'PC = 0x0050',xy:[11,20],path:[],bits:'0000000001010000'},
    {unit:'icache',title:'Instruction cache fetches BEQ',text:'Riding beside the fetch trace into L1 I-Cache: the fixed-width BEQ encoding is returned.',value:'0x00208863',xy:[30,20],path:['pc-icache'],bits:'00000000001000001000100001100011'},
    {unit:'decoder',title:'Decoder selects branch controls',text:'Inside the Control Decoder: opcode 1100011 enables equality comparison and extracts branch offset +16.',value:'branch · offset=+16',xy:[53,20],path:['icache-decode'],bits:'11000110001000010000'},
    {unit:'regs',title:'Register file reads comparands',text:'Traveling alongside the register read traces: R1=12 and R2=12 are read in parallel.',value:'R1=12 · R2=12',xy:[80,20],path:['decode-regs'],bits:'0000110000001100'},
    {unit:'alu',title:'ALU tests equality',text:'Riding beside comparands 12 and 12 into the ALU: subtraction yields 0, asserting the Zero flag (Z=1).',value:'12 − 12 = 0 · Z=1',xy:[54,60],path:['regs-alu','decode-alu'],bits:'0000000000000001'},
    {unit:'branch',title:'Branch unit computes target address',text:'Transported beside the Zero flag into the Branch Unit: offset +16 is added to 0x0050 to form target 0x0060.',value:'target = 0x0060',xy:[22,62],path:['alu-branch'],bits:'0000000001100000'},
    {unit:'pc',title:'PC redirects instruction fetch',text:'Riding beside the branch redirect trace back to the Program Counter: PC latches 0x0060 without register writeback.',value:'PC ← 0x0060',xy:[11,20],path:['branch-pc'],bits:'0000000001100000'}]}
};
const CISC_CORE_PROGRAMS={
  mov:{asm:'MOV EAX, [0x1000]',label:'Memory-to-register move',steps:[
    {unit:'front',title:'Front end fetches a 16-byte window',text:'EIP selects a stream of raw instruction bytes. Variable instruction length means boundaries are not yet known.',value:'bytes = A1 00 10 00 00',xy:[9,20],path:[],bits:'10100001000000000001000000000000'},
    {unit:'length',title:'Length decoder identifies five bytes',text:'Riding beside the byte stream into the Length Decoder: opcode A1 plus a 32-bit address marks a 5-byte boundary.',value:'length = 5 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000101'},
    {unit:'decodec',title:'Complex decoder cracks MOV',text:'Traveling alongside the 5 instruction bytes into the Complex Decoder: opcode A1 and address 0x1000 are decoded.',value:'MOV · dst=EAX · [0x1000]',xy:[47,20],path:['c-length-decode'],bits:'1010000100010000'},
    {unit:'queue',title:'Decoder emits internal micro-ops',text:'Riding beside the decoded micro-operation trace into the µOp Queue: AGU, LOAD, and REG-WRITE µops are buffered.',value:'AGU → LOAD → WRITE',xy:[88,20],path:['c-decode-queue'],bits:'0001001001110001'},
    {unit:'rename',title:'EAX is renamed to physical register P37',text:'Transported beside the µops into the Register Renamer: architectural EAX maps to physical register P37.',value:'EAX → P37',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0000000000100101'},
    {unit:'sched',title:'Scheduler dispatches ready load µop',text:'Inside the Out-of-Order Scheduler: operands are ready, so the load micro-op issues along the dispatch trace.',value:'µop ready · issue LSU',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000001'},
    {unit:'lsu',title:'Load/store engine reads memory',text:'Riding beside address 0x1000 into the Load/Store Unit & L1 Data Cache: memory returns 32-bit value 42.',value:'MEM[0x1000] = 42',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000101010'},
    {unit:'retire',title:'Reorder buffer retires EAX in order',text:'Traveling beside result 42 into the Reorder Buffer: architectural EAX commits 42 and EIP advances by 5 bytes.',value:'EAX ← 42 · EIP + 5',xy:[76,84],path:['c-lsu-retire'],bits:'0000000000101010'}]},
  addm:{asm:'ADD EAX, [0x1004]',label:'Arithmetic with memory',steps:[
    {unit:'front',title:'Fetch window enters the front end',text:'The byte front end fetches opcode 03, ModR/M byte 05, and 4 displacement bytes from the instruction stream.',value:'03 05 FE 0F 00 00',xy:[9,20],path:[],bits:'00000011000001011111111000001111'},
    {unit:'length',title:'Length decoder measures six bytes',text:'Riding beside the raw bytes into the Length Decoder: ModR/M decoding detects a 32-bit displacement (6 bytes total).',value:'length = 6 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000110'},
    {unit:'decodec',title:'Complex decoder expands memory ADD',text:'Inside the Complex Decoder: one CISC ADD with a memory operand splits into load, add, flags, and commit micro-operations.',value:'5 decoded µops',xy:[47,20],path:['c-length-decode'],bits:'0000000000000101'},
    {unit:'queue',title:'Micro-ops enter the µop queue',text:'Traveling beside the internal µop stream into the Micro-op Queue.',value:'AGU · LD · ADD · FLAGS · WB',xy:[88,20],path:['c-decode-queue'],bits:'0001001010110111'},
    {unit:'rename',title:'Destination EAX and flags are renamed',text:'Riding beside the µops into the Register Alias Table: EAX maps to P38 and EFLAGS maps to P9.',value:'EAX→P38 · FLAGS→P9',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0010011000001001'},
    {unit:'sched',title:'Scheduler tracks load-to-add dependency',text:'Inside the Out-of-Order Scheduler: the load µop issues immediately while the ADD µop waits for memory data.',value:'LOAD issues → ADD waits',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000010'},
    {unit:'lsu',title:'Load/store engine fetches operand 8',text:'Riding beside address 0x1004 into the Load/Store Unit: L1 Data Cache returns memory operand 8.',value:'MEM[0x1004] = 8',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000001000'},
    {unit:'exec',title:'Integer cluster adds 42 + 8 and sets flags',text:'Transported beside operand 8 on the forwarding trace to the Integer ALU Cluster: 42 + 8 produces 50 and updates EFLAGS.',value:'42 + 8 = 50 · ZF=0',xy:[70,62],path:['c-lsu-exec'],bits:'0000000000110010'},
    {unit:'retire',title:'Reorder buffer commits EAX and EFLAGS',text:'Riding beside result 50 into the Reorder Buffer: the single architectural ADD retires in order.',value:'EAX ← 50 · EIP + 6',xy:[76,84],path:['c-exec-retire'],bits:'0000000000110010'}]},
  rep:{asm:'REP MOVSD',label:'Microcoded memory loop',steps:[
    {unit:'front',title:'Front end fetches prefix and opcode',text:'The front end reads prefix byte F3 (REP) and string opcode A5 (MOVSD).',value:'F3 A5',xy:[9,20],path:[],bits:'1111001110100101'},
    {unit:'length',title:'Length decoder marks a 2-byte boundary',text:'Riding beside the byte stream into the Length Decoder: just two instruction bytes encode an entire counted loop.',value:'length = 2 bytes',xy:[28,20],path:['c-front-length'],bits:'0000000000000010'},
    {unit:'decodec',title:'Decoder routes complex string op to microcode',text:'Inside the Complex Decoder: REP MOVSD requires repeated memory transfers and is steered to the Microcode ROM.',value:'complex = 1 → µROM',xy:[47,20],path:['c-length-decode'],bits:'0000000000000001'},
    {unit:'ucode',title:'Microcode ROM streams loop micro-ops',text:'Traveling beside the microcode sequencer trace into µCode ROM: load [ESI], store [EDI], pointer-advance, and ECX-decrement µops are emitted.',value:'µPC → string-copy loop',xy:[68,20],path:['c-decode-ucode'],bits:'1010110000111001'},
    {unit:'queue',title:'Micro-op queue buffers the loop sequence',text:'Riding beside the generated µop stream into the Micro-op Queue.',value:'LD · ST · INC · DEC · JNZ',xy:[88,20],path:['c-ucode-queue'],bits:'0001101011010111'},
    {unit:'rename',title:'Loop pointers ESI, EDI, ECX are mapped',text:'Transported beside the loop µops through Register Renaming so speculative iterations track physical state cleanly.',value:'ESI/EDI/ECX renamed',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0001010000101000'},
    {unit:'sched',title:'Scheduler dispatches repeated transfers',text:'Inside the Out-of-Order Scheduler: memory read/write pairs and pointer updates issue across four iterations.',value:'4 loop iterations issued',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000100'},
    {unit:'lsu',title:'Load/store engine copies four doublewords',text:'Riding beside the memory data traces in the Load/Store Unit: 4 reads from [ESI] and 4 writes to [EDI] move 16 bytes.',value:'4 × 4 B = 16 B copied',xy:[90,62],path:['c-sched-exec','c-exec-lsu'],bits:'0000000000010000'},
    {unit:'exec',title:'Integer units advance ESI/EDI and zero ECX',text:'Traveling beside the index traces into the Integer Cluster: ESI and EDI advance by 16 while ECX reaches 0.',value:'ECX=0 · ESI+16 · EDI+16',xy:[70,62],path:['c-lsu-exec'],bits:'0000000000010000'},
    {unit:'retire',title:'Reorder buffer retires completed REP MOVSD',text:'Riding beside the final state into the Reorder Buffer: all 16 bytes and updated pointers commit atomically.',value:'REP MOVSD retired',xy:[76,84],path:['c-exec-retire'],bits:'1111001110100101'}]},
  push:{asm:'PUSH EAX',label:'Implicit stack operation',steps:[
    {unit:'front',title:'Front end fetches 1-byte opcode',text:'EIP fetches single-byte opcode 0x50 from the instruction stream.',value:'byte = 50',xy:[9,20],path:[],bits:'0101000000000000'},
    {unit:'length',title:'Length decoder detects 1-byte command',text:'Riding beside byte 0x50 into the Length Decoder: the instruction boundary is immediately 1 byte.',value:'length = 1 byte',xy:[28,20],path:['c-front-length'],bits:'0000000000000001'},
    {unit:'decodec',title:'Decoder exposes implicit stack pointer ESP',text:'Inside the Complex Decoder: opcode 50 implicitly references stack pointer ESP, decrement 4, and source EAX.',value:'ESP − 4 · store EAX',xy:[47,20],path:['c-length-decode'],bits:'0101000000000100'},
    {unit:'queue',title:'Micro-ops enter the queue',text:'Traveling beside the decoded µops into the Micro-op Queue: stack-decrement and memory-store operations are queued.',value:'SUB ESP,4 → STORE [ESP]',xy:[88,20],path:['c-decode-queue'],bits:'0001010001110010'},
    {unit:'rename',title:'ESP is mapped to a new physical register',text:'Riding beside the stack µop into the Register Renamer: ESP receives a new physical register.',value:'ESP → P41',xy:[24,62],path:['c-queue-sched','c-retire-rename'],bits:'0000000000101001'},
    {unit:'sched',title:'Scheduler issues stack address & store',text:'Inside the Scheduler: the ESP subtraction and store data micro-ops are dispatched.',value:'issue ALU + LSU',xy:[49,62],path:['c-rename-sched'],bits:'0000000000000011'},
    {unit:'exec',title:'Integer unit decrements ESP by 4',text:'Riding beside ESP=0x8000 into the Integer Cluster: 0x8000 − 4 forms new stack top 0x7FFC.',value:'ESP = 0x7FFC',xy:[70,62],path:['c-sched-exec'],bits:'0111111111111100'},
    {unit:'lsu',title:'Load/store unit writes EAX to stack memory',text:'Transported beside address 0x7FFC and EAX=50 into the Load/Store Unit: MEM[0x7FFC] receives 50.',value:'MEM[0x7FFC] ← 50',xy:[90,62],path:['c-exec-lsu'],bits:'0000000000110010'},
    {unit:'retire',title:'Reorder buffer commits ESP and stack write',text:'Riding beside the commit signal into the Reorder Buffer: ESP=0x7FFC and the stack write become architecturally visible.',value:'ESP ← 0x7FFC · EIP + 1',xy:[76,84],path:['c-lsu-retire'],bits:'0111111111111100'}]}
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
  $('#corePulse').style.left=step.xy[0]+'%';
  $('#corePulse').style.top=step.xy[1]+'%';
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
  outside:['ELECTRONICS TEST BENCH','LAB','TEST BENCH','ENGINEER HANDS'],
  bench:['CONTROLLER & LOGIC PROBE','HAND','SIGNAL INJECT','COMMAND PULSE'],
  board:['MOTHERBOARD COPPER TRACES','PCB','TRACE TRANSPORT','BUS DATA STREAM'],
  package:['CPU SOCKET & PACKAGE','PKG','PACKAGE ENTRY','ELECTRICAL BUS'],
  pins:['GOLD CONTACT CORRIDOR','PINS','PIN TRANSPORT','PIN SIGNALS'],
  substrate:['SUBSTRATE & COPPER VIAS','VIAS','VIA DESCENT','MICRO-BUMP DATA'],
  die:['SILICON DIE INTERCONNECT','DIE','ON-DIE ENTRY','DIE DATA PACKET'],
  exit:['SYSTEM RESULT BUS','OUT','RETIRE & EXIT','ARCHITECTURAL RESULT'],
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

// 3D Checkpoints for the prelude & exit stages (camPos, lookAt, travelerPos, traceStart, traceEnd)
function getStage3DCoords(step,idx,route){
  const isCisc=coreArch==='cisc';
  const layout=DIE_LAYOUT_3D[coreArch];
  if(step.scene==='outside'){
    return {
      cam:[-58,185,-445],
      look:[-32,28,-165],
      traveler:[-55,34,-242],
      traceFrom:[-65,22,-250],
      traceTo:[-14,22,-165],
      dataLabel:`EXEC TRIGGER: ${journeyProgram().asm}`
    };
  }
  if(step.scene==='bench'){
    return {
      cam:[-52,68,-248],
      look:[-12,20,-135],
      traveler:[-24,25,-172],
      traceFrom:[-65,22,-245],
      traceTo:[-14,22,-145],
      dataLabel:`CONTROLLER SERIALIZER: ${journeyProgram().asm}`
    };
  }
  if(step.scene==='board'){
    return {
      cam:[-46,42,-165],
      look:[-4,20,-35],
      traveler:[-22,24,-96],
      traceFrom:[-14,22,-165],
      traceTo:[0,22,-24],
      dataLabel:`PCB TRACE DATA: ${step.value}`
    };
  }
  if(step.scene==='package'){
    return {
      cam:[-48,46,-92],
      look:[0,26,5],
      traveler:[-6,27,-34],
      traceFrom:[-14,22,-85],
      traceTo:[0,26,-8],
      dataLabel:`SOCKET → ${isCisc?'EDU-C86':'EDU-R32'}`
    };
  }
  if(step.scene==='pins'){
    return {
      cam:[-26,16,-48],
      look:[0,12,18],
      traveler:[0,14,-10],
      traceFrom:[0,22,-26],
      traceTo:[0,4,6],
      dataLabel:`PIN BUS: ${step.value}`
    };
  }
  if(step.scene==='substrate'){
    return {
      cam:[-34,-18,-42],
      look:[0,-72,15],
      traveler:[0,-45,-4],
      traceFrom:[0,6,-6],
      traceTo:[0,-112,-15],
      dataLabel:`COPPER VIA → DIE BUMP`
    };
  }
  if(step.scene==='die'){
    const firstUnit=layout[route[7]?.unit]||[-220,-125,85,34,64];
    return {
      cam:[-85,12,-335],
      look:[0,-115,5],
      traveler:[firstUnit[0]*0.6,-110,firstUnit[1]*0.6],
      traceFrom:[0,-112,-35],
      traceTo:[firstUnit[0],-114,firstUnit[1]],
      dataLabel:`ON-DIE BUS → ${firstUnit[5]||'FRONT END'}`
    };
  }
  if(step.scene==='exit'){
    const prevUnit=layout[route[idx-1]?.unit]||[100,155,130,32,60];
    return {
      cam:[0,-15,-290],
      look:[15,-112,25],
      traveler:[prevUnit[0]*0.4,-68,prevUnit[1]*0.4],
      traceFrom:[prevUnit[0],-112,prevUnit[1]],
      traceTo:[0,-40,-90],
      dataLabel:`ARCHITECTURAL RESULT: ${step.value}`
    };
  }
  // Internal silicon stage: camera rides right beside the active trace with clear view of silicon macro top arrays!
  const cur=layout[step.unit]||[0,0,90,36,68,'UNIT'];
  const prevStep=route[idx-1];
  const prev=prevStep&&layout[prevStep.unit]?layout[prevStep.unit]:[cur[0]-90,cur[1]-30,80,34,60];
  const mx=(prev[0]+cur[0])*0.5, mz=(prev[1]+cur[1])*0.5;
  const dx=cur[0]-prev[0], dz=cur[1]-prev[1];
  const dist=Math.hypot(dx,dz)||1;
  const nx=dx/dist, nz=dz/dist;
  const travX=cur[0]-nx*28, travZ=cur[1]-nz*28;
  const sideX=-nz*42, sideZ=nx*42;
  return {
    cam:[travX-nx*118+sideX*0.75, -46, travZ-nz*118+sideZ*0.75],
    look:[cur[0], -112, cur[1]],
    traveler:[travX, -108, travZ],
    traceFrom:[prev[0], -114, prev[1]],
    traceTo:[cur[0], -114, cur[1]],
    unitBox:cur,
    prevPos:[mx, -114, mz],
    dataLabel:step.value
  };
}

let journeyIndex=0,journeyAutoTimer=null,journeySoundOn=false,journeyAudio=null,journeyTraveling=false;
let jAnimFrame=null,jCamPos=[-45,255,-560],jCamLook=[0,62,-130],jTravPos=[-55,68,-265];
let jTargetCam=[-45,255,-560],jTargetLook=[0,62,-130],jTargetTrav=[-55,68,-265];
let jPrevTrav=[-95,68,-295],jTransitionProg=1,jUserYaw=0,jUserPitch=0;

function journeyProgram(){return coreProgram()}
function createJourneyParticles(){
  if(!$('#journeyStars').children.length){
    $('#journeyStars').innerHTML=Array.from({length:65},(_,i)=>`<i style="left:${(i*37)%100}%;top:${(i*61)%100}%;--duration:${3+(i%7)}s;--delay:-${i%6}s;--dx:${(i%2?1:-1)*(10+i%45)}px;--dy:${20+i%60}px"></i>`).join('');
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
    {unit:'outside',scene:'outside',route:'Lab Bench',title:'Engineer at the electronics test bench',text:`You begin at a live hardware test bench with an oscilloscope, power supply, and instruction controller. The engineer's hands position the logic probe and press EXECUTE to launch ${program.asm}.`,value:`Trigger · ${program.asm}`,bits:seed},
    {unit:'bench',scene:'bench',route:'Hands/Probe',title:'Hands inject the command into the controller',text:`The engineer's right hand presses the controller trigger while the left hand holds the probe on the bus header. The software command ${program.asm} becomes a live electrical bit stream entering the controller.`,value:`Probe pulse · ${program.asm}`,bits:seed},
    {unit:'board',scene:'board',route:'PCB Traces',title:'Transported beside the copper motherboard traces',text:'You shrink to board scale and ride right beside the glowing copper bus traces with the binary data packets as they race across the PCB from the controller toward the CPU socket.',value:`Bus trace · ${program.asm}`,bits:seed},
    {unit:'package',scene:'package',route:'CPU Package',title:'Enter the CPU socket and processor package',text:`Still traveling beside the copper trace, you reach the CPU socket and pass beneath the metallic heatspreader (${coreArch==='cisc'?'EDU-C86':'EDU-R32'}) that protects the silicon die inside.`,value:`Package · ${coreArch==='cisc'?'EDU-C86':'EDU-R32'}`,bits:seed},
    {unit:'pins',scene:'pins',route:'Contacts',title:'Ride beside the gold processor contacts',text:'You travel alongside the electrical signal up the gold package pins and contacts that carry power, clock edges, addresses, data, and control into the processor.',value:'Contacts · ADDR / DATA / CLK',bits:seed},
    {unit:'substrate',scene:'substrate',route:'Copper Vias',title:'Descend beside copper vias and micro-bumps',text:'Inside the multi-layer package substrate, you ride beside the copper redistribution traces and plunge down vertical copper vias and C4 die bumps onto the silicon.',value:'Via link · Substrate → Silicon',bits:seed},
    {unit:'die',scene:'die',route:'Silicon Die',title:'Arrive beside the on-die silicon interconnects',text:`You land directly beside the microscopic metal interconnect traces on the ${coreArch.toUpperCase()} silicon die. Ahead lie all the functional blocks that will process ${program.asm}.`,value:`On-die bus · ${program.asm}`,bits:seed}
  ];
  const internal=program.steps.map(step=>({...step,scene:'internal',route:JOURNEY_UNITS[step.unit]?.[1]||'CORE'}));
  const last=program.steps[program.steps.length-1];
  return [
    ...prelude,
    ...internal,
    {unit:'exit',scene:'exit',route:'Result Bus',title:'Exit beside the system result bus',text:`The ${coreArch.toUpperCase()} processor has finished executing ${program.asm}. You ride beside the final architectural result as it exits onto the system bus.`,value:`Completed · ${last.value}`,bits:last.bits}
  ];
}

function updateJourneyTargets(instant=false){
  const route=journeyRoute(),step=route[journeyIndex];
  const coords=getStage3DCoords(step,journeyIndex,route);
  jPrevTrav=[...jTravPos];
  jTargetCam=coords.cam;
  jTargetLook=coords.look;
  jTargetTrav=coords.traveler;
  if(instant){
    jCamPos=[...jTargetCam];
    jCamLook=[...jTargetLook];
    jTravPos=[...jTargetTrav];
    jPrevTrav=[...jTargetTrav];
    jTransitionProg=1;
  }else{
    jTransitionProg=0;
  }
}

function renderJourney(){
  const program=journeyProgram(),route=journeyRoute(),step=route[journeyIndex],meta=JOURNEY_UNITS[step.unit]||['PROCESSOR BLOCK','CPU','PROCESS','DATA'],last=route.length-1;
  const archLabel=coreArch==='cisc'?'CISC Journey':'RISC Journey';
  $('#cpuJourney').dataset.scene=step.scene;
  $('#cpuJourney').classList.toggle('cisc-journey',coreArch==='cisc');
  $('#cpuJourney').classList.toggle('journey-complete',journeyIndex===last);
  if($('#journeyHeaderLabel'))$('#journeyHeaderLabel').textContent=archLabel;
  $('#journeyPackageMark').textContent=coreArch==='cisc'?'CISC · EDU-C86':'RISC · EDU-R32';
  $('#journeyArch').textContent=`${archLabel} · ${program.asm}`;
  $('#journeyProgressText').textContent=`CHECKPOINT ${String(journeyIndex+1).padStart(2,'0')} / ${String(route.length).padStart(2,'0')}`;
  $('#journeyProgressBar').style.width=`${(journeyIndex+1)/route.length*100}%`;
  $('#journeyUnitType').textContent=meta[0];
  $('#journeySymbol').textContent=meta[1];
  $('#journeyTitle').textContent=step.title;
  $('#journeyShort').textContent=step.text.split('. ')[0]+'.';
  $('#journeyPayload').textContent=step.value;
  $('#journeyIndex').textContent=String(journeyIndex+1).padStart(2,'0');
  $('#journeyStage').textContent=`CHECKPOINT ${String(journeyIndex+1).padStart(2,'0')} · ${meta[2]}`;
  $('#journeyNarrationTitle').textContent=step.title;
  $('#journeyNarrationText').textContent=step.text+' (Educational model simplified for clarity.)';
  $('#journeyPacketState').textContent=meta[3];
  $('#journeyVelocity').textContent=journeyTraveling?'14.4 units/cycle (TRACE TRANSPORT)':journeyIndex===last?'0.0 · RESULT COMMITTED':'1.0 units/cycle (ALONGSIDE DATA)';
  $('#journeyPrevious').textContent=journeyIndex?(JOURNEY_UNITS[route[journeyIndex-1].unit]?.[0]||'Previous stage'):'Outside Test Bench';
  $('#journeyNext').textContent=journeyIndex<last?(JOURNEY_UNITS[route[journeyIndex+1].unit]?.[0]||'Next stage'):'Journey Complete';
  $('#journeyBack').disabled=journeyIndex===0;
  $('#journeyNextButton').disabled=journeyIndex===last;
  $('#journeyNextButton').innerHTML=journeyIndex===last?'Journey complete ✓':'Continue the route <b>→</b>';
  $('#journeyRouteMap').innerHTML=route.map((stop,i)=>`<span class="route-stop ${i<journeyIndex?'done':''} ${i===journeyIndex?'active':''}" data-stop-index="${i}" title="Jump to ${stop.title}"><b>${stop.route}</b></span>`).join('');
  $$('#journeyRouteMap .route-stop').forEach(el=>{
    el.onclick=()=>{
      const targetIdx=+el.dataset.stopIndex;
      if(targetIdx!==journeyIndex&&!journeyTraveling){
        jumpToJourneyIndex(targetIdx);
      }
    };
  });
  const bits=step.bits.padStart(32,'0').slice(-32);
  $('#journeyBits').innerHTML=[...bits].map((bit,i)=>`<i style="left:${4+(i*13)%92}%;top:${6+(i*19)%82}%;--speed:${3+i%4}s;--drift:${(i%2?1:-1)*(15+i%35)}px">${bit}</i>`).join('');
}

// ============================================================================
// REAL-TIME 60FPS 3D CANVAS SCENE RENDERER FOR #cpuJourney
// Renders:
// 1. Test Bench, Oscilloscope, Power Supply, Controller Pad & Engineer's 3D Hands
// 2. Motherboard PCB, RAM DIMMs, Controller IC, Copper Traces & Moving Data Blocks
// 3. CPU Socket, Heatspreader Package (EDU-R32 / EDU-C86), Gold Contact Pins
// 4. Multi-layer Package Substrate, Vertical Copper Vias & C4 Micro-bumps
// 5. Complete 3D Silicon Die Floorplan with all RISC/CISC 3D units & trace rails
// 6. The 3D Traveler ("YOU") riding right beside the traces with the data stream!
// ============================================================================
function startJourney3DLoop(){
  if(jAnimFrame)cancelAnimationFrame(jAnimFrame);
  const canvas=$('#journeyCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');

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
    const t=now*0.001;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=canvas.clientWidth||window.innerWidth;
    const h=canvas.clientHeight||window.innerHeight;
    if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){
      canvas.width=Math.floor(w*dpr);
      canvas.height=Math.floor(h*dpr);
    }
    ctx.save();
    ctx.scale(dpr,dpr);

    // Smooth camera interpolation along the route
    const lerpRate=journeyTraveling?0.095:0.075;
    for(let i=0;i<3;i++){
      jCamPos[i]+=(jTargetCam[i]-jCamPos[i])*lerpRate;
      jCamLook[i]+=(jTargetLook[i]-jCamLook[i])*lerpRate;
      jTravPos[i]+=(jTargetTrav[i]-jTravPos[i])*(lerpRate*1.15);
    }
    jTransitionProg=Math.min(1,jTransitionProg+0.032);

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

    // Camera basis with user interactive look offsets
    const camX=jCamPos[0], camY=jCamPos[1], camZ=jCamPos[2];
    let fx=jCamLook[0]-camX, fy=jCamLook[1]-camY, fz=jCamLook[2]-camZ;
    const flen=Math.hypot(fx,fy,fz)||1;
    fx/=flen; fy/=flen; fz/=flen;

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
    const focal=Math.min(w,h)*0.88;

    function project(px,py,pz){
      const dx=px-camX, dy=py-camY, dz=pz-camZ;
      const cz=dx*fx+dy*fy+dz*fz;
      if(cz<=4)return null;
      const cx=dx*rx+dy*ry+dz*rz;
      const cy=dx*ux+dy*uy+dz*uz;
      const s=focal/cz;
      return {x:w*0.5+cx*s, y:h*0.5-cy*s, z:cz, s};
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

    // Draw a smooth 3D shaded cylinder / tapered anatomical or metallic segment between p1 and p2
    function drawCylinder3D(p1,p2,r1,r2,baseColor,edgeColor=null,segs=8){
      const dx=p2[0]-p1[0], dy=p2[1]-p1[1], dz=p2[2]-p1[2];
      const len=Math.hypot(dx,dy,dz)||1;
      const dirX=dx/len, dirY=dy/len, dirZ=dz/len;
      // Orthonormal basis perpendicular to cylinder axis
      let ux1=-dirZ, uy1=0, uz1=dirX;
      if(Math.hypot(ux1,uy1,uz1)<0.1){ux1=1;uy1=0;uz1=0}
      const ul=Math.hypot(ux1,uy1,uz1)||1;
      ux1/=ul; uy1/=ul; uz1/=ul;
      const vx1=dirY*uz1-dirZ*uy1, vy1=dirZ*ux1-dirX*uz1, vz1=dirX*uy1-dirY*ux1;

      const ring1=[], ring2=[];
      for(let i=0;i<segs;i++){
        const ang=(i/segs)*Math.PI*2;
        const ca=Math.cos(ang), sa=Math.sin(ang);
        const nx=ux1*ca+vx1*sa, ny=uy1*ca+vy1*sa, nz=uz1*ca+vz1*sa;
        ring1.push([p1[0]+nx*r1, p1[1]+ny*r1, p1[2]+nz*r1, nx, ny, nz]);
        ring2.push([p2[0]+nx*r2, p2[1]+ny*r2, p2[2]+nz*r2, nx, ny, nz]);
      }
      const quads=[];
      for(let i=0;i<segs;i++){
        const ni=(i+1)%segs;
        const a=ring1[i], b=ring1[ni], c=ring2[ni], d=ring2[i];
        const mx=(a[0]+b[0]+c[0]+d[0])*0.25;
        const my=(a[1]+b[1]+c[1]+d[1])*0.25;
        const mz=(a[2]+b[2]+c[2]+d[2])*0.25;
        const mnx=(a[3]+b[3])*0.5, mny=(a[4]+b[4])*0.5, mnz=(a[5]+b[5])*0.5;
        // Overhead + front-left key light (-0.4, 0.8, -0.45)
        const dot=Math.max(0,mnx*(-0.4)+mny*0.8+mnz*(-0.45));
        const shade=0.58+dot*0.68;
        quads.push({
          pts:[[a[0],a[1],a[2]],[b[0],b[1],b[2]],[c[0],c[1],c[2]],[d[0],d[1],d[2]]],
          col:shadeColor(baseColor,shade),
          dist:Math.hypot(mx-camX,my-camY,mz-camZ)
        });
      }
      quads.sort((a,b)=>b.dist-a.dist);
      for(const q of quads){
        drawPoly3D(q.pts,q.col,edgeColor||q.col,0.6);
      }
      // End cap at p2
      drawPoly3D(ring2.map(p=>[p[0],p[1],p[2]]),shadeColor(baseColor,1.12),edgeColor,0.7);
    }

    // Draw a realistic multi-lane copper/silicon bus trace with metallic conductors & data capsules
    function drawTraceWithData(pStart,pEnd,isActive,isVisited,dataText,bitStr='10110010'){
      const dx=pEnd[0]-pStart[0], dy=pEnd[1]-pStart[1], dz=pEnd[2]-pStart[2];
      const len=Math.hypot(dx,dy,dz)||1;
      const sx=-dz/len*3.6, sz=dx/len*3.6;

      // Dark dielectric trench beneath the copper bus lanes
      drawLine3D(pStart,pEnd,'rgba(4,10,8,0.85)',isActive?11:7);
      // 4 Parallel etched copper / cobalt conductor tracks
      const baseTrackCol=isActive?copperBright:isVisited?copper:'rgba(180,130,60,0.42)';
      for(const lane of [-1.2,-0.4,0.4,1.2]){
        drawLine3D(
          [pStart[0]+sx*lane,pStart[1]+0.2,pStart[2]+sz*lane],
          [pEnd[0]+sx*lane,pEnd[1]+0.2,pEnd[2]+sz*lane],
          lane===0.4&&isActive?accentBright:baseTrackCol,
          isActive?2.1:1.2
        );
      }
      if(isActive){
        drawLine3D(pStart,pEnd,accent,3.2);
      }

      // Plated through-hole (PTH) / via termination pads at both ends of trace
      for(const pt of [pStart,pEnd]){
        const pr=project(pt[0],pt[1]+0.4,pt[2]);
        if(pr&&pr.z<700){
          const padR=Math.max(2.5,Math.min(8,420/pr.z));
          ctx.beginPath();
          ctx.fillStyle=isActive?accentBright:gold;
          ctx.strokeStyle='#451a03';
          ctx.lineWidth=1;
          ctx.arc(pr.x,pr.y,padR,0,Math.PI*2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Moving 3D Silicon Data Capsules convecting along the trace
      const count=isActive?5:isVisited?2:0;
      for(let i=0;i<count;i++){
        const u=((t*(isActive?0.46:0.20)+i/count)%1);
        const px=pStart[0]+dx*u, py=pStart[1]+dy*u+2.0, pz=pStart[2]+dz*u;
        if(isActive){
          drawBox3D(px,py-1.2,pz,7.2,3.6,7.2,accentBright,accent,'#ffffff',0.9);
        }
        const pr=project(px,py+2.2,pz);
        if(!pr)continue;
        const r=Math.max(2.5,Math.min(11,780/pr.z));
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle=isActive?'#ffffff':copperBright;
        ctx.shadowColor=isActive?accent:copper;
        ctx.shadowBlur=isActive?14:5;
        ctx.arc(pr.x,pr.y,r,0,Math.PI*2);
        ctx.fill();
        if(isActive&&pr.z<540){
          const bitChar=bitStr[i%bitStr.length]||'1';
          ctx.fillStyle='#020804';
          ctx.font=`900 ${Math.max(7,Math.round(r*0.95))}px ui-monospace,monospace`;
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText(bitChar,pr.x,pr.y);
        }
        ctx.restore();
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
      // HARDWARE INSTRUCTION LAUNCH CONTROLLER PAD at (-75, 0, -250)
      // ----------------------------------------------------------------------
      drawBox3D(-75,0,-250,102,16,72,'#1e293b','#0f172a','#475569',1.3,0.5);
      // Controller OLED status display strip
      drawPoly3D([[-118,16.5,-232],[-32,16.5,-232],[-32,16.5,-218],[-118,16.5,-218]],'#041a12',accent,1.1);
      // Tactile Mechanical Keycaps on Controller Pad
      const pressDip=Math.sin(t*5)*2.2;
      for(let kx=-105;kx<=-45;kx+=20){
        for(let kz=-272;kz<=-238;kz+=17){
          const isExec=(kx===-65&&kz===-255);
          const kh=isExec?Math.max(2,4.5+pressDip):5.5;
          drawBox3D(kx,16,kz,14.5,kh,12.5,isExec?accent:'#334155',isExec?shadeColor(accent,0.7):'#1e293b',isExec?'#ffffff':'#64748b',1);
        }
      }
      spatialPins.push({pos:[-75,28,-250],tag:'HARDWARE TRIGGER',label:`CONTROLLER PAD (${journeyProgram().asm})`,hi:step.scene==='outside'});

      // ----------------------------------------------------------------------
      // REALISTIC SCULPTED 3D ENGINEER'S HANDS (Cylindrical Phalanges & Joints)
      // ----------------------------------------------------------------------
      // RIGHT HAND: Forearm sleeve -> ESD grounding wrist strap -> Palm -> 5 Articulated Cylindrical Fingers
      drawCylinder3D([-104,74,-385],[-86,52,-318],17,14,'#1e293b','#334155',8); // Tailored dark lab coat sleeve
      drawCylinder3D([-86,52,-318],[-83,48,-306],13.5,12.5,'#0284c7','#38bdf8',8); // Blue anti-static ESD wrist strap
      drawCylinder3D([-83,48,-306],[-78,42,-282],12.5,14,'#d9a17c','#b87d56',8); // Sculpted wrist & palm dorsum
      drawBox3D(-78,36,-282,27,11,26,'#d9a17c','#b87d56','#c98f68',0.8); // Metacarpal hand arch

      // 5 Multi-segment anatomical right-hand fingers (knuckle -> proximal -> middle -> distal tip + fingernail)
      const rHandFingers=[
        {k:[-93,38,-282], m:[-101,34,-268], tip:[-98,29,-256], r:4.2, hi:false}, // Thumb
        {k:[-66,40,-270], m:[-65,33+pressDip*0.5,-258], tip:[-65,21+pressDip,-254], r:3.9, hi:true}, // Index pressing EXECUTE!
        {k:[-74,41,-270], m:[-74,35,-255], tip:[-74,28,-245], r:3.9, hi:false}, // Middle finger
        {k:[-82,40,-271], m:[-82,34,-257], tip:[-82,28,-248], r:3.7, hi:false}, // Ring finger
        {k:[-89,38,-273], m:[-90,33,-261], tip:[-90,27,-253], r:3.3, hi:false}  // Little finger
      ];
      for(const fg of rHandFingers){
        drawCylinder3D(fg.k,fg.m,fg.r,fg.r*0.9,fg.hi?'#eab896':'#d9a17c','#b87d56',8);
        drawCylinder3D(fg.m,fg.tip,fg.r*0.9,fg.r*0.76,fg.hi?accentBright:'#e0ab88',fg.hi?accent:'#c28760',8);
      }
      spatialPins.push({pos:[-76,64,-288],tag:'HUMAN OPERATOR',label:'ENGINEER HAND · PRESSING EXECUTE',hi:step.scene==='outside'});

      // LEFT HAND: Holding Machined Aluminum & Rubber High-Frequency Logic Probe onto Controller Header
      drawCylinder3D([-182,68,-260],[-146,46,-204],16,13,'#1e293b','#334155',8); // Left lab sleeve
      drawCylinder3D([-146,46,-204],[-134,39,-186],12,13,'#d9a17c','#b87d56',8); // Left wrist & palm
      // Sculpted left fingers wrapping around the Logic Probe grip
      drawCylinder3D([-132,42,-186],[-116,38,-178],3.8,3.2,'#e0ab88','#b87d56',8);
      drawCylinder3D([-134,36,-182],[-118,32,-175],3.8,3.2,'#d9a17c','#b87d56',8);
      drawCylinder3D([-136,31,-179],[-122,28,-173],3.5,3.0,'#d49972','#b87d56',8);

      // Machined 3D Logic Probe Barrel + Tapered Stainless Nose + Gold Pogo Needle Tip at (-14, 22, -165)
      drawCylinder3D([-132,45,-182],[-68,33,-172],4.2,3.4,'#334155','#64748b',8); // Rubberized probe body
      drawCylinder3D([-68,33,-172],[-28,25,-167],3.0,1.6,'#cbd5e1','#f8fafc',8); // Stainless probe barrel
      drawLine3D([-28,25,-167],[-14,22,-165],'#fde047',3.2); // Gold spring-loaded pogo needle tip
      // Coaxial cable from probe tail back to Oscilloscope CH1 BNC jack
      drawLine3D([-132,45,-182],[-185,55,-135],'#475569',3.2);
      drawLine3D([-185,55,-135],[-255,11,-83],'#475569',3.2);
      spatialPins.push({pos:[-68,46,-172],tag:'SIGNAL INJECTION',label:'HIGH-FREQ LOGIC PROBE → CONTROLLER',hi:step.scene==='outside'||step.scene==='bench'});

      // ======================================================================
      // REALISTIC MOTHERBOARD PCB, VRM CAPACITORS, RAM & CONTROLLER IC CUTAWAY
      // ======================================================================
      drawBox3D(0,2,0,348,14,288,'#0a2e1c','#061c11','#1e5e3a',1.5,0.3);
      // Gold-plated motherboard corner mounting holes / standoffs
      for(const [mx,mz] of [[-158,-128],[158,-128],[-158,128],[158,128]]){
        drawCylinder3D([mx,15.5,mz],[mx,17.2,mz],6,6,'#eab308','#fef08a',8);
      }

      // VRM Power Delivery Phase Inductors (Chokes) & Cylindrical Solid Polymer Capacitors around CPU Socket
      for(let vx=-48;vx<=48;vx+=24){
        drawBox3D(vx,16,74,14,11,14,'#334155','#1e293b','#64748b',1); // Ferrite VRM choke
        drawCylinder3D([vx,16,56],[vx,28,56],4.8,4.8,'#cbd5e1','#60a5fa',8); // Solid aluminum polymer capacitor
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

      // Bus Controller QFP IC (-14, 16, -165) with gull-wing metallic leads & X-Ray silicon cutaway
      const ctrlOpen=step.scene==='bench'||step.scene==='board';
      // QFP gull-wing solder pins along left and right sides of Controller IC
      for(let pz=-178;pz<=-152;pz+=5.2){
        drawLine3D([-42,16.5,pz],[-35,19,pz],'#cbd5e1',2.0);
        drawLine3D([7,19,pz],[14,16.5,pz],'#cbd5e1',2.0);
      }
      drawBox3D(-14,16,-165,48,11,38,ctrlOpen?'rgba(15,23,42,0.35)':'#1e293b','#0f172a',accent,ctrlOpen?2.0:1.2,16.1);
      // Internal Silicon Die, Gold Bond Wires, Command Latch & Bit Serializer inside the Controller IC!
      drawBox3D(-25,17,-168,15,7.5,14,accent,'#0f172a','#ffffff',1.1); // Command Latch macro
      drawBox3D(-3,17,-160,17,7.5,15,'#f59e0b','#78350f','#fef08a',1.1); // Bit Serializer macro
      spatialPins.push({pos:[-14,33,-165],tag:'INSIDE CONTROLLER IC',label:`SERIALIZING ${journeyProgram().asm}`,hi:step.scene==='bench'});

      // Etched Copper Bus Traces leading from Controller Pad -> Controller IC -> CPU Socket
      drawTraceWithData(
        [-65,22,-240],
        [-14,22,-165],
        step.scene==='outside'||step.scene==='bench',
        journeyIndex>1,
        journeyProgram().asm,
        step.bits
      );
      drawTraceWithData(
        [-14,22,-165],
        [0,22,-28],
        step.scene==='board'||step.scene==='package',
        journeyIndex>2,
        `BUS: ${journeyProgram().asm}`,
        step.bits
      );
      if(step.scene==='board'){
        spatialPins.push({pos:[-8,28,-95],tag:'MOTHERBOARD BUS',label:`COPPER TRACE · ${journeyProgram().asm}`,hi:true});
      }

      // ======================================================================
      // PROPER REALISTIC SILICON PROCESSOR PACKAGE (EDU-R32 / EDU-C86)
      // Multi-layer ABF Substrate + SMD Capacitors + Stepped Nickel-Copper IHS
      // ======================================================================
      // Socket Retention Frame (LGA Independent Loading Mechanism) + Steel Lever
      drawBox3D(0,16,0,114,6,114,'#475569','#1e293b','#94a3b8',1.2,16.1);
      drawCylinder3D([62,19,-54],[62,19,58],2.2,2.2,'#cbd5e1','#f8fafc',6); // Socket retention lever arm

      const pkgAlpha=(step.scene==='pins'||step.scene==='substrate')?0.24:0.96;
      // Organic ABF Green/Teal Package Substrate Base (96 x 4.5 x 96)
      drawBox3D(0,22,0,96,4.5,96,
        isCisc?`rgba(16,64,92,${pkgAlpha})`:`rgba(16,78,48,${pkgAlpha})`,
        `rgba(8,36,24,${pkgAlpha})`,
        gold,1.3
      );
      // 16 Miniature SMD Ceramic Decoupling Capacitors mounted on the package substrate perimeter
      if(pkgAlpha>0.5){
        for(let sc=-36;sc<=36;sc+=18){
          drawBox3D(sc,26.5,-43,4.2,2.2,2.4,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(sc,26.5,43,4.2,2.2,2.4,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(-43,26.5,sc,2.4,2.2,4.2,'#b45309','#78350f','#e2e8f0',0.7);
          drawBox3D(43,26.5,sc,2.4,2.2,4.2,'#b45309','#78350f','#e2e8f0',0.7);
        }
      }
      // Stepped Nickel-Plated Copper Integrated Heat Spreader (IHS): Lower flange + Upper plateau
      drawBox3D(0,26.5,0,78,5.5,78,
        `rgba(180,192,204,${pkgAlpha})`,
        `rgba(100,114,128,${pkgAlpha})`,
        `rgba(226,232,240,${pkgAlpha})`,1.3
      );
      drawBox3D(0,32,0,64,4.5,64,
        `rgba(212,222,232,${pkgAlpha})`,
        `rgba(125,138,152,${pkgAlpha})`,
        accent,1.5
      );
      // Laser-etched processor nomenclature on top of the nickel IHS lid
      const ihsTop=project(0,37.2,0);
      if(ihsTop&&ihsTop.z<560&&pkgAlpha>0.5){
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
      spatialPins.push({
        pos:[0,44,0],
        tag:'SILICON PROCESSOR PACKAGE',
        label:isCisc?'EDU-C86 · NICKEL IHS & ABF SUBSTRATE':'EDU-R32 · NICKEL IHS & ABF SUBSTRATE',
        hi:step.scene==='package'
      });
    }

    // ========================================================================
    // 2. MESO LAYER: 3D CYLINDRICAL GOLD PINS, ABF SUBSTRATE & COPPER VIAS
    // ========================================================================
    if(step.scene==='pins'||step.scene==='substrate'){
      // 3D Cylindrical Gold-Plated Contact Pins (y: +4 to +22)
      for(let px=-36;px<=36;px+=18){
        for(let pz=-36;pz<=36;pz+=18){
          if(Math.abs(px)<8&&Math.abs(pz)<8)continue;
          drawCylinder3D([px,4,pz],[px,22,pz],2.6,2.2,'#eab308','#fef08a',8);
          const pulseY=4+((t*18+(px+pz)*0.3)%17);
          drawLine3D([px-3.2,pulseY,pz],[px+3.2,pulseY,pz],accentBright,2.0);
        }
      }
      drawTraceWithData([0,24,-22],[0,4,0],step.scene==='pins',journeyIndex>4,'PIN SIGNAL · 1.2V',step.bits);
      if(step.scene==='pins'){
        spatialPins.push({pos:[-18,18,-18],tag:'GOLD LGA CONTACTS',label:'VDD / CLK / ADDR / DATA PINS',hi:true});
      }

      // Multi-layer Copper Redistribution Substrate Planes & Cylindrical TSV Copper Vias (y: -112 to +4)
      for(const ly of [-18,-48,-82]){
        drawPoly3D([[-78,ly,-68],[78,ly,-68],[78,ly,68],[-78,ly,68]],'rgba(180,115,35,0.14)','rgba(245,158,11,0.52)',1.2);
      }
      for(let vx=-45;vx<=45;vx+=30){
        for(let vz=-35;vz<=35;vz+=35){
          drawCylinder3D([vx,-112,vz],[vx,4,vz],2.0,2.0,'#d97706','#fbbf24',6);
          // C4 Flip-Chip Solder Micro-Bump at bottom of via (-114)
          drawBox3D(vx,-116,vz,5,4,5,'#cbd5e1','#64748b','#f8fafc',0.8);
        }
      }
      drawTraceWithData([0,4,0],[0,-112,-15],step.scene==='substrate',journeyIndex>5,'COPPER VIA → C4 BUMP',step.bits);
      if(step.scene==='substrate'){
        spatialPins.push({pos:[0,-45,0],tag:'PACKAGE SUBSTRATE',label:'COPPER VIAS & C4 FLIP-CHIP BUMPS',hi:true});
      }
    }

    // ========================================================================
    // 3. MICRO LAYER: PROPER PHOTOLITHOGRAPHY SILICON DIE & WAFER FLOORPLAN
    // ========================================================================
    if(step.scene==='substrate'||step.scene==='die'||step.scene==='internal'||step.scene==='exit'){
      const layout=DIE_LAYOUT_3D[coreArch];
      // Metallic Silicon Wafer Die Bulk Substrate Slab (with thickness & bevel)
      drawBox3D(0,-128,5,690,8,465,'#09131c','#1e293b','#eab308',1.8);
      // Iridescent Photolithography Silicon Die Top Surface at y = -120
      drawPoly3D(
        [[-338,-119.8,-220],[338,-119.8,-220],[338,-119.8,230],[-338,-119.8,230]],
        isCisc?'rgba(8,20,38,0.96)':'rgba(7,22,16,0.96)',
        '#eab308',2.0
      );

      // Perimeter Gold Flip-Chip Bond Pads & I/O Ring lining all 4 edges of the Silicon Die!
      for(let bx=-310;bx<=310;bx+=26){
        drawBox3D(bx,-119.5,-212,12,1.8,7,'#eab308','#a16207','#fef08a',0.7);
        drawBox3D(bx,-119.5,222,12,1.8,7,'#eab308','#a16207','#fef08a',0.7);
      }
      for(let bz=-195;bz<=205;bz+=25){
        drawBox3D(-328,-119.5,bz,7,1.8,12,'#eab308','#a16207','#fef08a',0.7);
        drawBox3D(328,-119.5,bz,7,1.8,12,'#eab308','#a16207','#fef08a',0.7);
      }

      // Fine Photolithography Reticle & M1/M2 Copper Power-Grid Mesh across the silicon wafer
      for(let gx=-300;gx<=300;gx+=30){
        drawLine3D([gx,-119.4,-205],[gx,-119.4,215],gx%60===0?'rgba(234,179,8,0.16)':'rgba(56,189,248,0.08)',gx%60===0?1.1:0.7);
      }
      for(let gz=-195;gz<=210;gz+=30){
        drawLine3D([-315,-119.4,gz],[315,-119.4,gz],gz%60===0?'rgba(234,179,8,0.16)':'rgba(56,189,248,0.08)',gz%60===0?1.1:0.7);
      }

      // Draw all internal on-die metal bus traces between sequential steps of the selected instruction
      const progSteps=journeyProgram().steps;
      for(let sIdx=0;sIdx<progSteps.length;sIdx++){
        const curS=progSteps[sIdx];
        const curU=layout[curS.unit];
        if(!curU)continue;
        const prevU=sIdx===0?[0,-175]:layout[progSteps[sIdx-1].unit];
        if(!prevU)continue;
        const routeIdx=sIdx+7;
        const isCurrentTrace=(journeyIndex===routeIdx);
        const isDoneTrace=(journeyIndex>routeIdx);
        drawTraceWithData(
          [prevU[0],-114,prevU[1]],
          [curU[0],-114,curU[1]],
          isCurrentTrace,
          isDoneTrace,
          curS.value,
          curS.bits
        );
      }

      // System Bus Exit Conduit rising from the last unit
      const lastUnitKey=progSteps[progSteps.length-1]?.unit;
      const lastU=layout[lastUnitKey];
      if(lastU){
        drawTraceWithData(
          [lastU[0],-108,lastU[1]],
          [0,-38,-90],
          step.scene==='exit',
          false,
          `RESULT: ${progSteps[progSteps.length-1].value}`,
          step.bits
        );
      }

      // Draw every 3D Photolithography Silicon Functional Macro Block on the Die Floorplan
      Object.entries(layout).forEach(([key,u])=>{
        const [ux,uz,uw,uh,ud,ulabel]=u;
        const isCurrent=(step.unit===key);
        const isVisited=route.slice(7,journeyIndex).some(s=>s.unit===key);

        // Realistic silicon macro colors (deep cobalt/emerald/gold photolithography tones)
        const topCol=isCurrent
          ?(isCisc?'#2563eb':'#16a34a')
          :isVisited
          ?(isCisc?'#1e3a8a':'#14532d')
          :(isCisc?'#0f2447':'#0d2b1d');
        const sideCol=isCurrent
          ?(isCisc?'#1d4ed8':'#15803d')
          :(isCisc?'#0b1933':'#081c13');
        const edgeCol=isCurrent?'#ffffff':isVisited?accent:'#d97706';
        const boxH=(isCurrent?uh+6:uh)*0.55; // Sleek, low-profile realistic silicon macro relief

        // Gold/Copper Power Ring pad framing the silicon block on the wafer
        drawPoly3D(
          [[ux-uw*0.54,-119.2,uz-ud*0.54],[ux+uw*0.54,-119.2,uz-ud*0.54],[ux+uw*0.54,-119.2,uz+ud*0.54],[ux-uw*0.54,-119.2,uz+ud*0.54]],
          'rgba(234,179,8,0.14)',isCurrent?accentBright:'rgba(234,179,8,0.55)',1.1
        );

        // Main Silicon Macro Block Volume
        drawBox3D(ux,-119,uz,uw,boxH,ud,topCol,sideCol,edgeCol,isCurrent?2.0:1.1,-119.1);

        // Dense Photolithography Internal Sub-Arrays on the top face of the silicon block!
        const topY=-119+boxH+0.4;
        const isMemBlock=(key==='icache'||key==='dcache'||key==='ucode'||key==='lsu'||key==='regs'||key==='rename'||key==='queue'||key==='retire');
        if(isMemBlock){
          // Render 2x3 3D SRAM Bitcell Sub-Banks with sense-amplifier stripes (looks like a real cache/register die shot!)
          const cols=3, rows=2;
          const cellW=(uw*0.76)/cols, cellD=(ud*0.72)/rows;
          for(let r=0;r<rows;r++){
            for(let c=0;c<cols;c++){
              const cx=ux-uw*0.38+cellW*(c+0.5)+(c-1)*2.2;
              const cz=uz-ud*0.36+cellD*(r+0.5)+(r-0.5)*2.5;
              drawBox3D(
                cx,topY,cz,cellW,2.2,cellD,
                isCurrent?'#38bdf8':(isCisc?'#1e40af':'#0f766e'),
                '#0f172a',
                isCurrent?'#ffffff':'#eab308',0.8
              );
            }
          }
        }else{
          // Render high-density ALU / Decoder standard-cell datapath rows & copper routing tracks
          for(let r=-2;r<=2;r++){
            const rz=uz+r*(ud*0.16);
            drawBox3D(
              ux,topY,rz,uw*0.82,1.6,ud*0.09,
              isCurrent?accentBright:'#eab308',
              '#1e293b',
              isCurrent?'#ffffff':copper,0.7
            );
          }
        }

        spatialPins.push({
          pos:[ux,topY+8,uz],
          tag:isCurrent?'ACTIVE SILICON MACRO':isVisited?'COMPLETED MACRO':'SILICON MACRO',
          label:ulabel,
          hi:isCurrent
        });
      });
    }

    // ========================================================================
    // 4. ACTIVE TRACE HIGHLIGHT & REALISTIC SILICON DATA FRAME (NO "YOU" SPHERE!)
    // ========================================================================
    const curCoords=getStage3DCoords(step,journeyIndex,route);
    if(curCoords.traceFrom&&curCoords.traceTo){
      drawTraceWithData(curCoords.traceFrom,curCoords.traceTo,true,true,curCoords.dataLabel,step.bits);
      // Draw the primary 3D Silicon Data Packet Frame gliding along the trace right beside the camera
      const tf=curCoords.traceFrom, tt=curCoords.traceTo;
      const uSync=0.56+Math.sin(t*3.0)*0.14;
      const dpx=tf[0]+(tt[0]-tf[0])*uSync;
      const dpy=tf[1]+(tt[1]-tf[1])*uSync+2.2;
      const dpz=tf[2]+(tt[2]-tf[2])*uSync;
      drawBox3D(dpx,dpy-1.5,dpz,10,4.5,10,'#ffffff',accent,'#fde047',1.4);
      const dpProj=project(dpx,dpy+6.5,dpz);
      if(dpProj&&dpProj.z<520){
        ctx.save();
        ctx.font='900 10px ui-monospace,monospace';
        const syncTxt=`SIGNAL ON TRACE · ${step.value}`;
        const stw=ctx.measureText(syncTxt).width+16;
        ctx.fillStyle='rgba(6,14,10,0.92)';
        ctx.strokeStyle='#eab308';
        ctx.lineWidth=1.3;
        ctx.fillRect(dpProj.x-stw*0.5,dpProj.y-22,stw,17);
        ctx.strokeRect(dpProj.x-stw*0.5,dpProj.y-22,stw,17);
        ctx.fillStyle='#fef08a';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(syncTxt,dpProj.x,dpProj.y-13.5);
        ctx.restore();
      }
    }

    // ========================================================================
    // 5. UPDATE 3D-PROJECTED SPATIAL CALLOUT PINS
    // ========================================================================
    const labelBox=$('#journeySpatialLabels');
    if(labelBox){
      const visiblePins=[];
      for(const pin of spatialPins){
        const pr=project(pin.pos[0],pin.pos[1],pin.pos[2]);
        if(!pr||pr.z>950||pr.z<15)continue;
        if(pr.x<60||pr.x>w-60||pr.y<55||pr.y>h-45)continue;
        if(pr.x<390&&pr.y<365)continue;
        visiblePins.push({...pin,x:Math.round(pr.x),y:Math.round(pr.y),z:pr.z});
      }
      visiblePins.sort((a,b)=>(b.hi?1:0)-(a.hi?1:0)||a.z-b.z);
      const placedPins=[];
      for(const p of visiblePins){
        if(placedPins.length>=5)break;
        if(placedPins.some(q=>Math.abs(p.x-q.x)<155&&Math.abs(p.y-q.y)<36))continue;
        placedPins.push(p);
      }
      labelBox.innerHTML=placedPins.map(p=>`<div class="spatial-pin ${p.hi?'highlight':''}" style="left:${p.x}px;top:${p.y}px"><small>${p.tag}</small>${p.label}</div>`).join('');
    }

    ctx.restore();
    jAnimFrame=requestAnimationFrame(frame);
  }
  jAnimFrame=requestAnimationFrame(frame);
}

// Interactive mouse/touch look-around on #journeyCanvas
(()=>{
  const canvas=$('#journeyCanvas');
  if(!canvas)return;
  let dragging=false,sx=0,sy=0,sYaw=0,sPitch=0;
  canvas.addEventListener('pointerdown',e=>{
    dragging=true;sx=e.clientX;sy=e.clientY;sYaw=jUserYaw;sPitch=jUserPitch;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    jUserYaw=Math.max(-0.85,Math.min(0.85,sYaw+(e.clientX-sx)*0.0035));
    jUserPitch=Math.max(-0.45,Math.min(0.45,sPitch-(e.clientY-sy)*0.0028));
  });
  const end=()=>{dragging=false};
  canvas.addEventListener('pointerup',end);
  canvas.addEventListener('pointercancel',end);
})();

function stopJourneyAuto(){clearInterval(journeyAutoTimer);journeyAutoTimer=null;$('#journeyAuto').innerHTML='Auto tour <b>▶</b>'}
function jumpToJourneyIndex(next){
  const route=journeyRoute();
  next=Math.max(0,Math.min(route.length-1,next));
  if(next===journeyIndex||journeyTraveling)return;
  journeyTraveling=true;
  jUserYaw=0;jUserPitch=0;
  $('#cpuJourney').classList.add('traveling');
  journeyIndex=next;
  updateJourneyTargets(false);
  renderJourney();
  journeyTone(coreArch==='cisc'?210:270,.26);
  setTimeout(()=>{
    journeyTraveling=false;
    $('#cpuJourney').classList.remove('traveling');
    renderJourney();
  },780);
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

// Support deep-linking into any 3D architecture mode, instruction, or journey checkpoint via URL params
(()=>{
  const params=new URLSearchParams(window.location.search);
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
