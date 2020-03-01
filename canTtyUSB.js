
"use strict";

function CBuf(len,ini) { //constructor for cycle buffer
  this.buf=new Array(len);
  this.len=len;
  this.wp=0;
  for(let i=0; i<len; i++) this.buf[i]=ini;
  this.put=function(val) {
    this.buf[this.wp]=val;
    this.wp++;
    if(this.wp==this.len) this.wp=0;
  }
  this.get=function(idx) {
    return this.buf[(this.len+this.wp+idx-1)%this.len];
  }
}

const fs = require("fs");
const http = require("http");
const util = require("util");

let rx;
let tx;
let fData = fs.createWriteStream("fData.txt");
fData.setDefaultEncoding("binary");

const br={20:1,50:2,100:3,125:4,250:5,500:6,800:7,1000:8};

function setSerial(dev,br,oth) {
  const {exec} = require("child_process");
  exec("stty -F "+dev+" ispeed "+br+" ospeed "+br+" "+oth,
    (error,stdout,stderr)=> {
      if(error) { console.log(error); return; }
      if(stderr) cosole.log(stderr);
      console.log(stdout);
    });
}

let rxF = {sumCount:0};

function rxFrame(data) {
  let time = new Date();
  let k=0;
  if(data[0]=="t" || data[0]=="r") k = 4;
  if(data[0]=="T" || data[0]=="R") k = 8;
  if(k==0) return;
  rxF.sumCount++;
  let head = data.substring(0,k);
  let load = data.substring(k,data.length-1);
  if(rxF[head]) {
    rxF[head].load = load;
    rxF[head].count++;
    rxF[head].time = time.getTime();
  }
  else rxF[head] = {"load":load, "count": 1, "time": time.getTime()};
  fData.write("RX "+time.getHours()+":"+time.getMinutes()+
    ":"+time.getSeconds()+"."+time.getMilliseconds()+" "+data+"\n");
}

let http1=http.createServer()
http1.on('request',routeServer);
http1.listen(8000);

function routeServer(req,res) {
  //console.log(req.url+"\n");
  let url = {name:"",arg:""};
  [url.name, url.arg] = req.url.toString().split("?");
  switch(url.name) {
    case "/can":
      res.writeHead(200);
      let html = fs.createReadStream("canListen.html");
      html.pipe(res);
      break;
    case "/canListen.js":
      res.writeHead(200);
      let js = fs.createReadStream("canListen.js");
      js.pipe(res);
      break;
    case "/scanDev":
      const {exec} = require("child_process");
      exec("ls /dev/ttyUSB*",(err,stdout,stderr)=>{
        res.writeHead(200);
        res.end(stdout);});
      break;
    case "/setDev":
      res.writeHead(200);
      if(rx) rx.destroy();
      if(tx) tx.destroy();
      setSerial(url.arg,115200,"eol 13 eof 255 -imaxbel -echo -flusho -cstopb -parenb cs8 cread clocal opost -icrnl");
      setTimeout(()=>{
        rx = fs.createReadStream(url.arg);
        rx.setEncoding("binary");
        rx.on("data",(data)=>rxFrame(data));
        tx = fs.createWriteStream(url.arg);
        tx.setDefaultEncoding("binary");
      },500);
      res.end(url.arg);
      break;
    case "/setBR":
      res.writeHead(204);
      tx.write("C\r");
      setTimeout(()=>tx.write("S"+br[url.arg]+"\r"),50);
      setTimeout(()=>tx.write("O\r"),100);
      res.end();
      break;
    case "/tx":
      let time = new Date();
      res.writeHead(204);
      tx.write(url.arg+"\r");
      res.end();
      fData.write("TX "+time.getHours()+":"+time.getMinutes()+
        ":"+time.getSeconds()+"."+time.getMilliseconds()+" "+url.arg+"\n");
      break;
    case "/rx":
      res.writeHead(200);
      if(rxF[url.arg]) res.end(rxF[url.arg].load+":"+rxF[url.arg].count+":"+rxF[url.arg].time);
      else res.end("");
      break;
    case "/sumCount":
      res.writeHead(200);
      res.end(rxF.sumCount.toString());
      break;
    default:
      res.writeHead(200);
      res.end(JSON.stringify(rxF));
  }
}










