
function addTabInput(tr,size,val) {
  let itxt = document.createElement("input");
  itxt.setAttribute("type","text");
  itxt.setAttribute("size",size);
  itxt.setAttribute("value",val);
  let td = document.createElement("td");
  td.appendChild(itxt);
  tr.appendChild(td);
}

function addTabButton(tr,nam,onclick) {
  let td = document.createElement("td");
  let name = document.createTextNode(nam);
  var butt = document.createElement("button");
  butt.setAttribute("type","button");
  butt.setAttribute("onclick",onclick+"(this)");
  butt.appendChild(name);
  td.appendChild(butt);
  tr.appendChild(td);
  return butt;
}

function addRxRow() {
  if(!document.brSet) return;
  let tr = document.createElement("tr");
  addTabInput(tr,9,"t000");
  addTabInput(tr,28,"b[0]");
  addTabInput(tr,16,"");
  addTabInput(tr,40,"");
  addTabInput(tr,12,"");
  let kb = addTabButton(tr,"Kill","killRow");
  let tb = addTabButton(tr,"Trend","trend");
  tr.rxInterval = setInterval(function() { readFrame(tr); },300);
  let rxTab = document.getElementById("rxTab");
  rxTab.appendChild(tr);
}

function trend(th) {
  let tr = th.parentElement.parentElement;
  if(tr.ttr) {
    tr.ttr.remove();
    tr.ttr = null;
    tr.ttd.remove();
    tr.ttd = null;
    tr.tnd.remove();
    tr.tnd = null;
  }
  else {
    let tab = tr.parentElement;
    tr.ttr = document.createElement("tr");
    tr.ttd = document.createElement("td");
    tr.ttd.setAttribute("colspan","9");
    tr.ttr.appendChild(tr.ttd);
    tr.tnd = document.createElement("canvas");
    tr.tnd.lastCount = 0;
    tr.tnd.av = [];
    tr.tnd.at = [];
    tr.tnd.minVal = null;
    tr.tnd.maxVal = null;
    tr.tnd.setAttribute("height","100");
    tr.tnd.setAttribute("width",tr.offsetWidth-10);
    tr.tnd.setAttribute("style","border:1px solid #000000;");
    tr.tnd.setAttribute("onmousemove","selectX(this,event)");
    tr.tnd.setAttribute("onmouseout","clearX(this)");
    tr.ttd.appendChild(tr.tnd);
    tab.insertBefore(tr.ttr,tr);
    //console.log(tab);
  }
}

function selectX(th,ev) { th.Xs = ev.clientX; }
function clearX(th) { th.Xs = null; }

function addTxRow() {
  if(!document.brSet) return;
  var tr = document.createElement("tr");
  addTabInput(tr,9,"t000");
  addTabInput(tr,16,"");
  addTabInput(tr,7,"100");
  addTabInput(tr,12,"");
  addTabButton(tr,"Send","tx");
  addTabButton(tr,"Kill","killRow");
  addTabInput(tr,40,"");
  var rxTab = document.getElementById("txTab");
  rxTab.appendChild(tr);
}

function killRow(t) {
  let tr = t.parentElement.parentElement;
  if(tr.txInterval) clearInterval(tr.txInterval);
  if(tr.rxInterval) clearInterval(tr.rxInterval);
  if(tr.tnd) tr.tnd.remove();
  if(tr.ttd) tr.ttd.remove();
  if(tr.ttr) tr.ttr.remove();
  tr.remove();
}

function tx(t) {
  let r = t.parentElement.parentElement;
  let head = r.children[0].children[0].value;
  let period = r.children[2].children[0].value;
  if(r.txInterval) {
    clearInterval(r.txInterval);
    r.txInterval = null;
    t.style.backgroundColor = "gray";
    t.style.color = "black";
    t.innerText = "Start";
  } 
  else {
    if(isFinite(period) && period > 0 && head) {
      r.txInterval = setInterval(()=>sendFrame(r),0+period);
      t.style.backgroundColor = "blue";
      t.style.color = "white"
      t.innerText = "Stop";
    } 
    else if(head) {
      sendFrame(r);
    }
  }
}

function sendFrame(r) {
  let head = r.children[0].children[0].value;
  head = head[0] + head.substring(1,10).toUpperCase();
  if( !((head.length==4 && (head[0]=="t" || head[0]=="r")) || (head.length==9 && (head[0]=="T" || head[0]=="R")) )) return;
  if(!isFinite( "0x"+head.substring(1,10) )) return; 
  let data = r.children[1].children[0].value.toUpperCase();
  if( data.length%2 !=0 ) return;
  if(data!="" && !isFinite( "0x"+data )) return;
  let frame = head+data.length/2+data;
  r.children[3].children[0].value++;
  let req = new XMLHttpRequest();
  req.onerror = function() { console.log("link error"); }
  req.open("GET","tx?"+frame+"\r");
  req.send();
}

function toHexDig(s,k) {
  let n = parseInt(s);
  let s16 = n.toString(16).toUpperCase();
  while(s16.length < k) s16 = "0"+s16;
  return s16;
}

function readFrame(tr) {
  let c = tr.children;
  let head = c[0].children[0].value;
  if( !((head.length==4 && (head[0]=="t" || head[0]=="r")) || (head.length==9 && (head[0]=="T" || head[0]=="R")) )) return;
  head = head[0] + head.substring(1,10).toUpperCase();
  if(!isFinite( "0x"+head.substring(1,10) )) return; 
  let req = new XMLHttpRequest();
  req.onload = function() { parseFrame(this.responseText,tr); }
  req.onerror = function() { console.log("readFrame link error"); }
  req.open("GET","rx?"+head);
  req.send();
}

function parseFrame(d,tr) {
  if(d=="") return;
  let equation = tr.children[1].children[0].value;
  let dc = d.split(":"); //load:counts:time
  tr.children[4].children[0].value = dc[1]; //counts
  let b =[]; //load bytes
  for(let i=0; i<dc[0][0]; i++) b[i] = "0x"+dc[0][2*i+1]+dc[0][2*i+2];
  let val = xD(eval(tr.children[1].children[0].value),6);
  tr.children[2].children[0].value = val;
  //trend route
  if(tr.tnd && tr.tnd.lastCount < dc[1]) {
    //canvas draw
    //console.log(d);
    let tnd = tr.tnd;
    tnd.av.push(val); //val
    tnd.at.push(dc[2]); //time
    tnd.lastCount=dc[1]; //last count
    if(tnd.minVal == null || tnd.minVal > val) tnd.minVal = val;
    if(tnd.maxVal == null || tnd.maxVal < val) tnd.maxVal = val;
    let ctx = tnd.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.font = "10px Serif";
    ctx.textAlign = "start";
    let cw = ctx.canvas.width;
    let ch = ctx.canvas.height;
    ctx.clearRect(0,0,cw,ch);
    let timeRep = (tnd.at[tnd.at.length-1]-tnd.at[0])/9;
    let valRep = (tnd.minVal+tnd.maxVal)/2;
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality="high";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    for(let i=1; i<10; i++) {
      ctx.fillText(xD(timeRep*i/1000,4),(cw-30)/9*i+1,ch-1);
      ctx.moveTo((cw-30)/9*i,0);
      ctx.lineTo((cw-30)/9*i,ch);
    }
    ctx.fillText(xD(tnd.minVal,4),1,ch-1);
    ctx.fillText(xD(valRep,4),1,ch/2-1);
    ctx.fillText(xD(tnd.maxVal,4),1,11);
    ctx.moveTo(0,ch/2);
    ctx.lineTo(cw,ch/2);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 1;
    ctx.moveTo(0,norm(tnd.minVal,tnd.maxVal,ch,0,tnd.av[0]));
    for(let i=1; i<tnd.at.length; i++) {
      ctx.lineTo(norm(tnd.at[0],tnd.at[tnd.at.length-1],0,cw-30,tnd.at[i]),norm(tnd.minVal,tnd.maxVal,ch,0,tnd.av[i]));
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 0.5;
    if(tnd.Xs != null) {
      ctx.moveTo(tnd.Xs,0);
      ctx.lineTo(tnd.Xs,ch);
      let timeX = norm(0,cw-30,tnd.at[0],tnd.at[tnd.at.length-1],tnd.Xs);
      //console.log(timeX-tnd.at[0]);
      for(let i=0; i<tnd.at.length; i++) {
        if(tnd.at[i]>=timeX) {
          ctx.fillText(xD(norm(tnd.at[i-1],tnd.at[i],tnd.av[i-1],tnd.av[i],timeX),4),tnd.Xs,11);
          break;
        }
      }
      ctx.stroke();
    }
  }
}

function xD(x,d) {
  let idx = x.toString().indexOf(".");
  if(idx==-1) return x;
  if(idx > d-1) return Math.round(x);
  let m = Math.pow(10,(d-idx));
  return Math.round(x*m)/m;
}

function norm(x0,x1,y0,y1,x) {
  let d=x0-x1;
  let a=(y0-y1)/d;
  let b=-(x1*y0-x0*y1)/d;
  return a*x+b;
}

function scanDev() {
  var req = new XMLHttpRequest();
  req.onload = function() { showDevs(this.responseText) }
  req.onerror = () => { console.log("scanDev link error"); }
  req.open("GET","scanDev");
  req.send();
}

function showDevs(txt) {
  let p = document.getElementById("devSelect");
  let ds = txt.split("\n");
  for(let i=0; i<ds.length; i++) {
    if(ds[i]) {
      let b = document.createElement("button");
      b.setAttribute("class","devButton");
      b.setAttribute("onclick","selectDev('"+ds[i]+"')");
      let t = document.createTextNode(ds[i]);
      b.appendChild(t);
      p.appendChild(b);
    }
  }
}

function selectDev(dev) {
  let p = document.getElementById("devSelect");
  let t = document.createTextNode(dev);
  var req = new XMLHttpRequest();
  req.onerror = () => { console.log("link error"); }
  req.open("GET","setDev?"+dev);
  req.send();
  p.innerHTML = dev.toString();
  document.getElementById("scanDevButton").remove();
  setInterval(()=>{
    let reqsc = new XMLHttpRequest();
    reqsc.onerror = () => { console.log("link error"); }
    reqsc.onload = ()=> p.innerHTML = reqsc.responseText;
    reqsc.open("GET","sumCount");
    reqsc.send();},500);
  showBR();
}

function showBR() {
  let brl = [20,50,100,125,250,500,800,1000];
  let p = document.getElementById("bitRate");
  for(let i=0; i<brl.length; i++) {
    let rb = document.createElement("button");
    rb.innerHTML = brl[i];
    rb.setAttribute("type","button");
    rb.setAttribute("class","brButton");
    rb.setAttribute("onclick","setBR(this,"+brl[i]+")");
    p.appendChild(rb);
  }
}

function setBR(t,br) {
  let p = t.parentElement;
  let b = p.getElementsByClassName("brButton");
  for(let i=0; i<b.length; i++) { b[i].style.backgroundColor = "gray"; b[i].style.color = "black"; } 
  t.style.backgroundColor = "blue";
  t.style.color = "white";
  let req = new XMLHttpRequest();
  req.onerror = () => { console.log("link error"); }
  req.open("GET","setBR?"+br);
  req.send();
  document.brSet = true;
}


