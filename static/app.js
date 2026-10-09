const $=id=>document.getElementById(id), key=p=>p.join(","), parse=k=>k.split(",").map(Number);
let n=10,start=[0,0],exitCell=[9,9],agent=[0,0],walls=new Set(),hazards=new Set(),targets=new Set(),path=[],pathIndex=0,steps=0,rescued=0,timer=null,visited=new Set(),running=false;
function log(s){const li=document.createElement("li");li.textContent=s;$("log").prepend(li);while($("log").children.length>12)$("log").lastChild.remove()}
function pause(){if(timer)clearInterval(timer);timer=null;running=false;$("run").textContent="▶ Run mission"}
function status(s){$("statusBadge").textContent=s.toUpperCase()}
function render(){
 const grid=$("grid");grid.style.setProperty("--cols",n);grid.innerHTML="";
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  const p=[r,c],k=key(p),b=document.createElement("button");b.type="button";b.className="cell";b.title=`Row ${r+1}, column ${c+1}`;
  if(walls.has(k))b.classList.add("wall");if(hazards.has(k))b.classList.add("hazard");if(targets.has(k))b.classList.add("target");
  if(path.slice(pathIndex).some(q=>key(q)===k))b.classList.add("path");
  if(key(p)===key(start))b.classList.add("start");if(key(p)===key(exitCell))b.classList.add("exit");if(key(p)===key(agent))b.classList.add("agent");
  b.textContent=key(p)===key(agent)?"A":key(p)===key(exitCell)?"E":targets.has(k)?"+":"";b.addEventListener("click",()=>edit(p));grid.appendChild(b);
 }
 $("rescued").textContent=rescued;$("steps").textContent=steps;$("hazards").textContent=hazards.size;$("length").textContent=path.length?path.length-1:"—";
 $("progress").style.width=(rescued+targets.size?100*rescued/(rescued+targets.size):0)+"%";
 $("objective").textContent=targets.size?`${rescued} rescue target(s) completed; ${targets.size} remaining.`:(key(agent)===key(exitCell)?"Mission complete — exit reached.":"No targets remaining; route to the exit.");
}
function edit(p){
 pause();const k=key(p),t=$("tool").value;
 if(t==="wall"||t==="hazard"){if(k===key(start)||k===key(exitCell)||targets.has(k))return;const s=t==="wall"?walls:hazards,other=t==="wall"?hazards:walls;s.has(k)?s.delete(k):s.add(k);other.delete(k)}
 else if(t==="target"){if(!walls.has(k)&&!hazards.has(k)&&k!==key(start)&&k!==key(exitCell))targets.has(k)?targets.delete(k):targets.add(k)}
 else if(t==="start"){start=p.slice();agent=p.slice();walls.delete(k);hazards.delete(k);targets.delete(k)}
 else if(t==="exit"){exitCell=p.slice();walls.delete(k);hazards.delete(k);targets.delete(k)}
 else{walls.delete(k);hazards.delete(k);targets.delete(k)}
 path=[];pathIndex=0;render();
}
async function findPath(goal){
 const response=await fetch("/api/path",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rows:n,cols:n,start:agent,goal,blocked:[...walls,...hazards].map(parse)})});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Path request failed");return data.path;
}
async function nextStep(){
 try{
  if(!path.length||pathIndex>=path.length){
   let nearest=null,nearestPath=null;
   for(const t of targets){const candidate=await findPath(parse(t));if(candidate.length&&(!nearestPath||candidate.length<nearestPath.length)){nearest=t;nearestPath=candidate}}
   if(nearest!==null){targets.delete(nearest);path=nearestPath;log("Route planned to nearest rescue target.")}
   else{path=await findPath(exitCell);if(path.length)log("All targets handled; routing to exit.")}
   pathIndex=0;
   if(!path.length){pause();status("NO PATH");log("No safe route found. Check for blocked cells.");render();return false}
  }
  if(pathIndex<path.length-1){pathIndex++;agent=path[pathIndex].slice();steps++;visited.add(key(agent));if(key(agent)===key(exitCell)&&targets.size===0){pause();status("COMPLETE");log("Mission complete: exit reached.");render();return false}}
  render();return true;
 }catch(e){pause();status("ERROR");log(e.message);return false}
}
$("run").addEventListener("click",async()=>{if(running){pause();status("PAUSED");return}running=true;$("run").textContent="Ⅱ Pause";status("RUNNING");if(!path.length||pathIndex>=path.length){try{let nearest=null,route=null;for(const t of targets){const p=await findPath(parse(t));if(p.length&&(!route||p.length<route.length)){nearest=t;route=p}}if(nearest!==null){targets.delete(nearest);path=route}else path=await findPath(exitCell);pathIndex=0;if(!path.length){pause();status("NO PATH");log("No safe route found.");render();return}}catch(e){pause();log(e.message);return}}timer=setInterval(async()=>{const ok=await nextStep();if(!ok)pause()},350)});
$("step").addEventListener("click",()=>{pause();status("STEP");nextStep()});
$("reset").addEventListener("click",()=>{pause();agent=start.slice();path=[];pathIndex=0;steps=rescued=0;visited.clear();status("READY");log("Agent reset to start.");render()});
$("clear").addEventListener("click",()=>{pause();walls.clear();hazards.clear();targets.clear();path=[];pathIndex=0;steps=rescued=0;render();log("Map cleared.")});
$("sample").addEventListener("click",()=>{pause();n=Number($("size").value);start=[0,0];agent=start.slice();exitCell=[n-1,n-1];walls.clear();hazards.clear();targets.clear();for(let r=1;r<n-1;r++)if(r!==3&&r!==n-3)walls.add(key([r,Math.floor(n/2)]));hazards.add(key([2,2]));hazards.add(key([n-3,n-3]));targets.add(key([1,n-2]));targets.add(key([n-2,1]));path=[];pathIndex=0;steps=rescued=0;status("READY");log("Sample environment loaded.");render()});
$("size").addEventListener("change",()=>{n=Number($("size").value);start=[0,0];agent=start.slice();exitCell=[n-1,n-1];walls.clear();hazards.clear();targets.clear();path=[];pathIndex=0;steps=rescued=0;render();log(`Grid resized to ${n} × ${n}.`)});
$("sample").click();
