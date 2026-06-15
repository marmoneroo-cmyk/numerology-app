import { useState, useEffect, useRef, useCallback } from "react";

/* ╔══════════════════════════════════════════════════════════════╗
   ║  N U M E R O L O G Y   O R A C L E   —   V 7              ║
   ║  A psychologically intelligent digital oracle               ║
   ╚══════════════════════════════════════════════════════════════╝ */

// ═══════════════════ ICON SYSTEM (thin line, no emoji) ═══════════════════
const ICON_PATHS = {
  star:"M12 3.2l2.35 5.1 5.6.55-4.2 3.75 1.2 5.5L12 20.4 7.05 18.1l1.2-5.5-4.2-3.75 5.6-.55z",
  sparkle:"M12 3v18 M3 12h18 M6.5 6.5l11 11 M17.5 6.5l-11 11",
  orb:"M12 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M8.5 20h7 M10 22h4 M10 8.5a3 3 0 0 1 2.5-2",
  moon:"M20.5 13.2A8 8 0 1 1 10.8 3.5a6.3 6.3 0 0 0 9.7 9.7z",
  sun:"M12 6.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8z M12 1.5v2.5 M12 20v2.5 M3.2 12H5.7 M18.3 12h2.5 M5.2 5.2l1.8 1.8 M17 17l1.8 1.8 M18.8 5.2L17 7 M7 17l-1.8 1.8",
  wave:"M2.5 9c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0 3.2-2.4 4.8 0 3.2 2.4 4.8 0 M2.5 15c1.6-2.4 3.2-2.4 4.8 0s3.2 2.4 4.8 0 3.2-2.4 4.8 0 3.2 2.4 4.8 0",
  map:"M9 4L3.5 6v14l5.5-2 6 2 5.5-2V4l-5.5 2-6-2z M9 4v14 M15 6v14",
  mind:"M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z M12 11.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2z",
  cart:"M2.5 4h2.2l2.3 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.78L20.5 8H6 M9.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M16.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  plus:"M12 5v14 M5 12h14",
  minus:"M5 12h14",
  chart:"M3.5 20h17 M7 20v-7 M12 20V6 M17 20v-10",
  calculator:"M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M7.5 7h9 M8 12h.01 M12 12h.01 M16 12h.01 M8 16h.01 M12 16h.01 M16 16h.01",
  cards:"M8.5 6l9 2.5a1 1 0 0 1 .7 1.2l-2.2 8a1 1 0 0 1-1.2.7l-9-2.5 M6.5 5h7a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  calendar:"M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M4 10h16 M8.5 3v4 M15.5 3v4",
  heart:"M12 20.3l-1.4-1.3C5.4 14.4 2.5 11.8 2.5 8.5 2.5 6 4.4 4 7 4c1.7 0 3.2.9 4 2.2C11.8 4.9 13.3 4 15 4c2.6 0 4.5 2 4.5 4.5 0 3.3-2.9 5.9-8.1 10.5z",
  palette:"M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.7-1 1.1-1.9-.6-1 .1-2.3 1.3-2.3H16a4 4 0 0 0 4-4c0-4.8-3.6-8.8-8-8.8z M7.5 11a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z M11 8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z M15 8.5a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z",
  compass:"M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z M15.6 8.4l-2 5.2-5.2 2 2-5.2z",
  mail:"M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3.5 6.5l8.5 6 8.5-6",
  gift:"M4.5 9.5h15v2a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5z M5.5 12h13v8a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5z M12 9.5v11 M12 9.5C11 6.5 7 6.5 7 8.7c0 1.5 2.5 1.5 5 .8 M12 9.5c1-3 5-3 5-.8 0 1.5-2.5 1.5-5 .8",
  phone:"M5 3.5h3.2l1.6 4-2 1.3a11 11 0 0 0 4.9 4.9l1.3-2 4 1.6V17a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5z",
  pen:"M4 20l1-4L16 5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8 19z M14 7l3 3",
  lock:"M6 11h12a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-8A.5.5 0 0 1 6 11z M8 11V8a4 4 0 0 1 8 0v3",
  chat:"M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  eye:"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z",
  door:"M6 3.5h9a.5.5 0 0 1 .5.5v16a.5.5 0 0 1-.5.5H6z M15.5 4l3 1v14l-3 1 M9 12h.01",
  crown:"M3.5 7.5l3.8 3.8L12 4.5l4.7 6.8 3.8-3.8L18.5 19h-13z",
  target:"M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z",
  bulb:"M9.5 18.5h5 M10 21.5h4 M12 3a6 6 0 0 0-3.8 10.6c.8.7 1.3 1.4 1.3 2.4h5c0-1 .5-1.7 1.3-2.4A6 6 0 0 0 12 3z",
  book:"M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20z M19 18.5H6.5A1.5 1.5 0 0 0 5 20",
  refresh:"M20 11a8 8 0 0 0-14-4.2L4 9 M4 4v5h5 M4 13a8 8 0 0 0 14 4.2L20 15 M20 20v-5h-5",
  share:"M12 15.5V4 M8 8l4-4 4 4 M5 13.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-5.5",
  trending:"M3.5 16.5l6-6 4 4 7-7 M17.5 7.5h4v4",
  soundOn:"M4 9.5h3.5L13 5v14l-5.5-4.5H4z M16.5 8.5a5 5 0 0 1 0 7 M18.8 6.5a8 8 0 0 1 0 11",
  soundOff:"M4 9.5h3.5L13 5v14l-5.5-4.5H4z M17 9.5l4 5 M21 9.5l-4 5",
  user:"M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4.5 20.5a7.5 7.5 0 0 1 15 0",
  users:"M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 5a3.5 3.5 0 0 1 0 7 M17.5 13.6a6.5 6.5 0 0 1 4 6.4",
  dna:"M7 3c0 5 10 5 10 10S7 18 7 21 M17 3c0 5-10 5-10 10s10 5 10 8 M8.5 6.5h7 M8.5 17.5h7 M10 9.5h4 M10 14.5h4",
  link:"M9.5 14.5l5-5 M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2 M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2",
  mirror:"M12 3c3.6 0 6.5 3.4 6.5 7.5S15.6 18 12 18s-6.5-3.4-6.5-7.5S8.4 3 12 3z M9 21h6 M12 18v3",
  candle:"M9 10h6v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z M12 10V7 M12 4c1.5 1 1.5 2.5 0 3.2C10.5 6.5 10.5 5 12 4z",
  temple:"M3.5 9L12 4l8.5 5 M5 9v8 M9.5 9v8 M14.5 9v8 M19 9v8 M3.5 20.5h17 M3.5 17h17",
  infinity:"M9 9.2c-1.8 0-3.2 1.3-3.2 2.8S7.2 14.8 9 14.8s2.6-2.8 3-2.8 1.2 2.8 3 2.8 3.2-1.3 3.2-2.8S16.8 9.2 15 9.2s-2.6 2.8-3 2.8-1.2-2.8-3-2.8z",
  flame:"M12 3.5c2.5 3.5 4.2 5.5 4.2 8.7a4.2 4.2 0 0 1-8.4 0c0-1.4.6-2.5 1.5-3.4-.2 1.7.8 2.6 1.6 2.6.9 0 1.1-.9 1.1-1.8 0-2.3-1.6-4-0-6.1z",
  tools:"M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6L21 13l-2 2-1.9-1.9a3.5 3.5 0 0 0-4.6-4.6z M11 11l-6 6 2 2 6-6 M5.5 6.5L9 10",
  doc:"M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M14 3v4h4 M9 12h6 M9 16h6",
  dove:"M3 13c4 1 6-1 7-3 1 3 3 4 6 4l4-3-2-1c0-2-1.5-4-4-4-3 0-4 2-5 4-2 0-4-1-6-1z M11 14l-1 6",
  seed:"M12 21V10 M12 14c-3 0-5-2-5-5 3 0 5 2 5 5z M12 11c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z",
  globe:"M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z M3.5 12h17 M12 3.2c2.5 2.4 2.5 14.4 0 17.6 M12 3.2c-2.5 2.4-2.5 14.4 0 17.6",
  coin:"M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z M12 7v10 M9.5 9.2c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.5-2.5.6-2.5 1.6 1 1.7 2.5 1.7 2.5-.7 2.5-1.7",
  check:"M5 12.5l4.5 4.5L19 7",
  arrowBack:"M14 6l-6 6 6 6",
  layers:"M12 3.5l8.5 4.5L12 12.5 3.5 8z M3.5 12l8.5 4.5 8.5-4.5 M3.5 16l8.5 4.5 8.5-4.5",
  gem:"M5.5 9.5L9 5h6l3.5 4.5L12 19.5z M5.5 9.5h13 M9 5l-1.6 4.5L12 19.5l4.6-10L15 5",
  briefcase:"M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M3 13h18 M11 13h2",
  instagram:"M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4z M17 6.7h.01",
  whatsapp:"M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.3 20.7l4.3-1.1A8.8 8.8 0 1 0 12 3.2z M8.8 7.9c.2 0 .5 0 .7.5l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.6 1 1.4 1.7 2.4 2.2.3.1.4 0 .6-.1l.6-.7c.2-.2.3-.2.6-.1l1.5.7c.2.1.3.3.3.5 0 .9-.7 1.6-1.5 1.7-.6 0-1.3 0-3-.8-2.2-1.1-3.7-3.3-4.2-4.8-.2-.7-.2-1.3.1-1.8.2-.4.5-.5.8-.5z",
  sparkles:"M12 3v18 M3 12h18 M6.5 6.5l11 11 M17.5 6.5l-11 11",
};
function Icon({ name, size = 20, stroke = 1.5, style }) {
  const d = ICON_PATHS[name] || ICON_PATHS.sparkle;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }} aria-hidden="true">
      {d.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}

// ═══════════════════ SOUND ENGINE ═══════════════════
const AU={c:null,on:true,
init(){if(!this.c)try{this.c=new(window.AudioContext||window.webkitAudioContext)}catch(e){}},
p(t){if(!this.on||!this.c)return;try{const n=this.c.currentTime;
if(t==="reveal")[440,554,659,880].forEach((f,i)=>{const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.setValueAtTime(f,n+i*.13);g.gain.setValueAtTime(0,n+i*.13);g.gain.linearRampToValueAtTime(.04,n+i*.13+.05);g.gain.exponentialRampToValueAtTime(.001,n+i*.13+1.2);o.connect(g).connect(this.c.destination);o.start(n+i*.13);o.stop(n+i*.13+1.2)});
else if(t==="click"){const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.setValueAtTime(880,n);g.gain.setValueAtTime(.025,n);g.gain.exponentialRampToValueAtTime(.001,n+.08);o.connect(g).connect(this.c.destination);o.start(n);o.stop(n+.1)}
else if(t==="chapter")[261,329,392,523].forEach((f,i)=>{const o=this.c.createOscillator(),g=this.c.createGain();o.type="triangle";o.frequency.setValueAtTime(f,n+i*.25);g.gain.setValueAtTime(0,n+i*.25);g.gain.linearRampToValueAtTime(.035,n+i*.25+.06);g.gain.exponentialRampToValueAtTime(.001,n+i*.25+2);o.connect(g).connect(this.c.destination);o.start(n+i*.25);o.stop(n+i*.25+2)});
else if(t==="card")[330,392,494].forEach((f,i)=>{const o=this.c.createOscillator(),g=this.c.createGain();o.type="triangle";o.frequency.setValueAtTime(f,n+i*.2);g.gain.setValueAtTime(0,n+i*.2);g.gain.linearRampToValueAtTime(.03,n+i*.2+.04);g.gain.exponentialRampToValueAtTime(.001,n+i*.2+1.4);o.connect(g).connect(this.c.destination);o.start(n+i*.2);o.stop(n+i*.2+1.4)});
}catch(e){}}};

// ═══════════════════ NUMEROLOGY CORE ═══════════════════
const LV={"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":1,"כ":2,"ך":2,"ל":3,"מ":4,"ם":4,"נ":5,"ן":5,"ס":6,"ע":7,"פ":8,"ף":8,"צ":9,"ץ":9,"ק":1,"ר":2,"ש":3,"ת":4};
const VOW=new Set(["א","ו","י","ע"]);
function R(n){if(n===0)return 0;while(n>=10||n<=-10)n=[...String(Math.abs(n))].reduce((a,d)=>a+ +d,0);return n;}
function NV(s){return R([...s].reduce((a,c)=>a+(LV[c]||0),0));}
function SU(s){return R([...s].filter(c=>VOW.has(c)).reduce((a,c)=>a+(LV[c]||0),0));}
function EX(s){return R([...s].filter(c=>!VOW.has(c)&&LV[c]).reduce((a,c)=>a+(LV[c]||0),0));}
function LP(d,m,y){return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${y}`].reduce((a,c)=>a+ +c,0));}
function CA(d,m,y){const n=new Date();let a=n.getFullYear()-y;if(n.getMonth()+1<m||(n.getMonth()+1===m&&n.getDate()<d))a--;return a;}
function PY(d,m,yr,add){let p=R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${yr}`].reduce((a,c)=>a+ +c,0));if(add)p=R(p+1);return p;}
function PM(d,m){return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${new Date().getMonth()+1}`].reduce((a,c)=>a+ +c,0));}
function PD(d,m){const t=new Date();return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${t.getDate()}${t.getMonth()+1}${t.getFullYear()}`].reduce((a,c)=>a+ +c,0));}
function CH(a,b){return a===b?0:R(Math.abs(a-b));}

function karmicDebt(d,m,y,nm){
  const dbs=[];const f=[...`${d}${m}${y}`].reduce((a,c)=>a+ +c,0);
  const nf=[...nm].reduce((a,c)=>a+(LV[c]||0),0);
  [13,14,16,19].forEach(k=>{if(f===k||nf===k)dbs.push(k)});
  if([13,14,16,19].includes(d))dbs.push(d);
  return[...new Set(dbs)];
}

function loShu(d,m,y){
  const dg=[...`${d}${m}${y}`].filter(c=>c!=="0").map(Number);
  const lp=LP(d,m,y),dr=R(d);
  const all=[...dg,lp,dr];
  const g={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
  all.forEach(n=>{if(n>=1&&n<=9)g[n]++});
  const miss=Object.entries(g).filter(([,v])=>v===0).map(([k])=>+k);
  const planes=[];
  if(g[4]&&g[9]&&g[2])planes.push("mind");
  if(g[3]&&g[5]&&g[7])planes.push("emotional");
  if(g[8]&&g[1]&&g[6])planes.push("practical");
  return{g,miss,planes};
}

function fullCalc(d,m,y,nm,add){
  const nv=NV(nm),lp=LP(d,m,y),age=CA(d,m,y),cy=new Date().getFullYear();
  const py=PY(d,m,cy,add),hy=R(lp+age),su=SU(nm),ex=EX(nm),pm=PM(d,m),pd=PD(d,m);
  const rd=R(d),rm=R(m),ry=R(y);
  const pk=[R(rd+rm),R(rd+ry),0,R(rm+ry)];pk[2]=R(pk[0]+pk[1]);
  const ch=[CH(rd,rm),CH(rd,ry),0,CH(rm,ry)];ch[2]=CH(ch[0],ch[1]);
  const hp=pk.map((v,i)=>R(v+ch[i])),hc=hp.map(v=>R(v+lp));
  const kd=karmicDebt(d,m,y,nm);const ls=loShu(d,m,y);
  const proj=[];for(let i=-2;i<=10;i++){const yr=cy+i;proj.push({year:yr,py:PY(d,m,yr,add),isCurrent:yr===cy});}
  const psych={leadership:Math.min(10,((nv===1||nv===8?3:0)+(lp===1||lp===8?3:0)+(su===1?2:0)+(ex===8?2:0))),
    intuition:Math.min(10,((nv===2||nv===7?3:0)+(lp===2||lp===7?3:0)+(su===7?2:0)+(su===2?2:0))),
    creativity:Math.min(10,((nv===3||nv===5?3:0)+(lp===3||lp===5?3:0)+(su===3?2:0)+(ex===5?2:0))),
    stability:Math.min(10,((nv===4||nv===6?3:0)+(lp===4||lp===6?3:0)+(su===6?2:0)+(ex===4?2:0))),
    ambition:Math.min(10,((nv===8||nv===1?3:0)+(lp===8?3:0)+(py===8||py===1?2:0)+(ex===8?2:0))),
    wisdom:Math.min(10,((nv===7||nv===9?3:0)+(lp===7||lp===9?3:0)+(su===9?2:0)+(su===7?2:0)))};
  const pseed=Math.abs(nv*7+lp*13+su*17+ex*19+py*23+d*3+m*5+y);
  Object.keys(psych).forEach((k,i)=>{if(psych[k]<2)psych[k]=2+((pseed+i*37)%3);});
  return{nv,lp,age,py,hy,su,ex,pm,pd,pk,ch,hp,hc,exit:27-lp,kd,ls,proj,psych,d,m,y};
}

// ═══════════════════ DATA LAYER ═══════════════════
const D = {
  1:{t:"המנהיג",te:"The Leader",s:"מנהיגות · עצמאות · חדשנות",se:"Leadership · Independence · Innovation",
    narrative:"אתה נולדת להוביל. לא מתוך כוח, אלא מתוך ראייה. כשהעולם מהסס — אתה צועד קדימה.",
    narrativeE:"You were born to lead. Not through force, but through vision. When the world hesitates — you step forward.",
    shadow:"נטייה לבדידות, שליטתיות, חוסר סבלנות",shadowE:"Tendency toward isolation, control, impatience",
    growth:"ללמוד להאציל, לסמוך, לשתף פעולה",growthE:"Learn to delegate, trust, collaborate",
    c:"#FFD700",el:"אש",stone:"רובי",crystal:"סיטרין",color:"אדום וזהב",career:"יזם, מנכ״ל, מנהיג, מעצב",luck:"ראשון",
    ritual:{word:"התחלה",wordE:"Begin",act:"התחל דבר אחד חדש היום",actE:"Start one new thing today",reflect:"מה אני ממתין לו?",reflectE:"What am I waiting for?",micro:"הדלק נר בזריחה והגדר כוונה אחת",microE:"Light a candle at dawn and set one intention"}},
  2:{t:"המגשר",te:"The Mediator",s:"שותפות · אינטואיציה · הרמוניה",se:"Partnership · Intuition · Harmony",
    narrative:"אתה הגשר בין עולמות. הרגישות שלך היא לא חולשה — היא כוח-על.",
    narrativeE:"You are the bridge between worlds. Your sensitivity is not weakness — it is a superpower.",
    shadow:"תלות רגשית, חוסר החלטיות, ויתור עצמי",shadowE:"Emotional dependency, indecisiveness, self-sacrifice",
    growth:"לפתח קול עצמאי, להציב גבולות",growthE:"Develop an independent voice, set boundaries",
    c:"#C0C0C0",el:"מים",stone:"פנינה",crystal:"מונסטון",color:"לבן וכסף",career:"יועץ, מטפל, דיפלומט",luck:"שני",
    ritual:{word:"הקשבה",wordE:"Listen",act:"הקשב לאדם אחד בלי לשפוט",actE:"Listen to one person without judgment",reflect:"למי אני צריך לסלוח?",reflectE:"Who do I need to forgive?",micro:"שב בשקט 5 דקות ותן למחשבות לזרום",microE:"Sit quietly for 5 minutes and let thoughts flow"}},
  3:{t:"היוצר",te:"The Creator",s:"ביטוי · תקשורת · שמחה",se:"Expression · Communication · Joy",
    narrative:"היקום נתן לך את מתנת הביטוי. המילים שלך, הצבעים שלך, הצחוק שלך — כולם כלי בריאה.",
    narrativeE:"The universe gave you the gift of expression. Your words, colors, laughter — all tools of creation.",
    shadow:"פיזור, שטחיות, בריחה מרגשות עמוקים",shadowE:"Scattering, superficiality, avoidance of deep emotion",
    growth:"למקד את האנרגיה היצירתית, להעמיק",growthE:"Focus creative energy, go deeper",
    c:"#FF6B6B",el:"אש",stone:"אמטיסט",crystal:"טורמלין",color:"סגול וצהוב",career:"אמן, סופר, שחקן, מרצה",luck:"שלישי",
    ritual:{word:"ביטוי",wordE:"Express",act:"צור משהו — כתוב, צייר, שיר",actE:"Create something — write, draw, sing",reflect:"מה אני מפחד לומר?",reflectE:"What am I afraid to say?",micro:"כתוב 3 משפטים על מה שאתה מרגיש עכשיו",microE:"Write 3 sentences about what you feel right now"}},
  4:{t:"הבונה",te:"The Builder",s:"יציבות · סדר · מסירות",se:"Stability · Order · Devotion",
    narrative:"אתה עמוד התווך. מה שאתה בונה — נשאר. הסבלנות שלך, הנאמנות שלך, העקביות שלך — אלה הם היסודות.",
    narrativeE:"You are the cornerstone. What you build — endures. Your patience, loyalty, consistency — these are the foundations.",
    shadow:"נוקשות, פחד משינוי, עבודת יתר",shadowE:"Rigidity, fear of change, overwork",
    growth:"ללמוד גמישות, לשחרר שליטה",growthE:"Learn flexibility, release control",
    c:"#4ECDC4",el:"אדמה",stone:"אמרלד",crystal:"ג׳ייד",color:"ירוק וחום",career:"מהנדס, אדריכל, מנהל",luck:"רביעי",
    ritual:{word:"בנייה",wordE:"Build",act:"סיים משימה אחת שנשארה פתוחה",actE:"Complete one unfinished task",reflect:"מה אני בונה שישאר?",reflectE:"What am I building that will last?",micro:"סדר פינה אחת בבית בכוונה מלאה",microE:"Organize one corner of your home with full intention"}},
  5:{t:"החופשי",te:"The Free Spirit",s:"חופש · הרפתקה · שינוי",se:"Freedom · Adventure · Change",
    narrative:"הרוח נושאת אותך. חמשת החושים שלך חיים ופועמים. אתה כאן כדי לטעום, לגעת, לחוות — את הכל.",
    narrativeE:"The wind carries you. Your five senses are alive and pulsing. You are here to taste, touch, experience — everything.",
    shadow:"חוסר מחויבות, חיפוש תמידי, חוסר שקט",shadowE:"Lack of commitment, constant seeking, restlessness",
    growth:"למצוא חופש בתוך מחויבות",growthE:"Find freedom within commitment",
    c:"#45B7D1",el:"אוויר",stone:"יהלום",crystal:"אקוומרין",color:"תכלת ולבן",career:"נוסע, עיתונאי, יזם",luck:"חמישי",
    ritual:{word:"חופש",wordE:"Freedom",act:"עשה משהו ספונטני היום",actE:"Do something spontaneous today",reflect:"ממה אני באמת בורח?",reflectE:"What am I truly running from?",micro:"צא להליכה ללא מסלול, עקוב אחרי הסקרנות",microE:"Take a walk with no route, follow curiosity"}},
  6:{t:"המטפל",te:"The Nurturer",s:"אהבה · אחריות · יופי",se:"Love · Responsibility · Beauty",
    narrative:"הלב שלך הוא מקדש. אתה נושא אנרגיית אהבה ללא תנאים. המשפחה, הקהילה, היופי — זה העולם שלך.",
    narrativeE:"Your heart is a sanctuary. You carry the energy of unconditional love. Family, community, beauty — that is your world.",
    shadow:"שליטה דרך אהבה, הקרבה עצמית, נטל אחריות",shadowE:"Control through love, self-sacrifice, burden of responsibility",
    growth:"ללמוד לאהוב בלי לשלוט",growthE:"Learn to love without controlling",
    c:"#96CEB4",el:"אדמה",stone:"ספיר",crystal:"רוז קוורץ",color:"ורוד וכחול",career:"מורה, רופא, מעצב, שף",luck:"שישי",
    ritual:{word:"אהבה",wordE:"Love",act:"אמור לאדם אחד שאתה אוהב אותו",actE:"Tell one person you love them",reflect:"האם אני נותן לעצמי מספיק?",reflectE:"Am I giving enough to myself?",micro:"הכן משהו יפה — אוכל, פרח, סידור",microE:"Prepare something beautiful — food, flower, arrangement"}},
  7:{t:"המיסטיקן",te:"The Mystic",s:"רוחניות · חכמה · חקירה",se:"Spirituality · Wisdom · Inquiry",
    narrative:"שבעה שערי חכמה פתוחים לפניך. אתה צולל לעומקים שרוב האנשים לא מעזים. האמת — היא המצפן שלך.",
    narrativeE:"Seven gates of wisdom stand open before you. You dive into depths most dare not explore. Truth — is your compass.",
    shadow:"ניתוק רגשי, ביקורתיות, בדידות נבחרת",shadowE:"Emotional detachment, criticism, chosen solitude",
    growth:"לאזן שכל ולב, לפתוח לאחרים",growthE:"Balance mind and heart, open to others",
    c:"#9B59B6",el:"מים",stone:"עין החתול",crystal:"אמטיסט",color:"סגול ולבן",career:"חוקר, פילוסוף, מדען",luck:"שני",
    ritual:{word:"חקירה",wordE:"Inquire",act:"למד משהו חדש לחלוטין היום",actE:"Learn something completely new today",reflect:"מה אני מפחד לדעת?",reflectE:"What am I afraid to know?",micro:"קרא פסקה אחת ממקור חכמה עתיק",microE:"Read one passage from an ancient wisdom source"}},
  8:{t:"בעל הכוח",te:"The Powerhouse",s:"כוח · שפע · הגשמה",se:"Power · Abundance · Manifestation",
    narrative:"סמל האינסוף הוא שלך. יש לך את הכוח להפוך חזונות למציאות. השפע זורם אליך כשאתה מיישר קו עם הייעוד.",
    narrativeE:"The infinity symbol is yours. You have the power to turn visions into reality. Abundance flows when you align with purpose.",
    shadow:"אובססיה לכוח, חומרנות, שליטה",shadowE:"Power obsession, materialism, control",
    growth:"להשתמש בכוח לטובת הכלל",growthE:"Use power for the collective good",
    c:"#E67E22",el:"אש",stone:"יהלום צהוב",crystal:"טייגר אי",color:"כתום וזהב",career:"משקיע, בנקאי, מנהל בכיר",luck:"שבת",
    ritual:{word:"הגשמה",wordE:"Manifest",act:"כתוב את המטרה הגדולה שלך בבהירות",actE:"Write your biggest goal with clarity",reflect:"מה אני מוכן להקריב?",reflectE:"What am I willing to sacrifice?",micro:"החזק מטבע ביד, דמיין את השפע זורם אליך",microE:"Hold a coin, visualize abundance flowing to you"}},
  9:{t:"החכם",te:"The Sage",s:"חמלה · סיום · חכמה עליונה",se:"Compassion · Completion · Higher Wisdom",
    narrative:"תשע הוא מספר ההשלמה. אתה נשמה ותיקה. החמלה שלך אינסופית והראייה שלך חוצה זמן.",
    narrativeE:"Nine is the number of completion. You are an old soul. Your compassion is infinite and your vision transcends time.",
    shadow:"התנשאות, קושי לשחרר, עצב עולמי",shadowE:"Superiority, difficulty letting go, world-weariness",
    growth:"ללמוד לשחרר בשלום, לחיות בהווה",growthE:"Learn to release in peace, live in the present",
    c:"#E74C3C",el:"מים",stone:"גארנט",crystal:"לאפיס לזולי",color:"אדום כהה וכחול",career:"מנהיג רוחני, רופא, אמן",luck:"שלישי",
    ritual:{word:"שחרור",wordE:"Release",act:"שחרר דבר אחד שכבר לא משרת אותך",actE:"Release one thing that no longer serves you",reflect:"מה אני מוכן לסיים?",reflectE:"What am I ready to complete?",micro:"כתוב מכתב סליחה — ואז שרוף אותו",microE:"Write a forgiveness letter — then burn it"}},
};

const KARMA={
  13:{he:"חוב של עצלות — בגלגול קודם נמנעת מעמל. בחיים אלה המציאות דורשת ממך התמדה.",en:"Laziness debt — You avoided effort before. This life demands perseverance."},
  14:{he:"חוב של שליטה — ניצלת חופש. עליך ללמוד משמעת עצמית.",en:"Control debt — You misused freedom. You must learn self-discipline."},
  16:{he:"חוב של אגו — האגו שלט. עליך ללמוד ענווה וחיבור.",en:"Ego debt — Ego ruled you. You must learn humility and connection."},
  19:{he:"חוב של כוח — ניצלת אחרים. עליך לעמוד לבד ולקחת אחריות.",en:"Power debt — You exploited others. You must stand alone with responsibility."},
};

const YEAR_ENERGY={
  1:{he:"שנת התחלות חדשות. הזמן לפעול.",en:"Year of new beginnings. Time to act.",level:8},
  2:{he:"שנת סבלנות ושיתוף פעולה. המתן.",en:"Year of patience and cooperation. Wait.",level:4},
  3:{he:"שנת ביטוי ויצירתיות. תן לאור לזרום.",en:"Year of expression and creativity. Let light flow.",level:7},
  4:{he:"שנת בנייה ועבודה. הנח יסודות.",en:"Year of building and work. Lay foundations.",level:5},
  5:{he:"שנת שינוי והרפתקה. אל תירא.",en:"Year of change and adventure. Don't fear.",level:8},
  6:{he:"שנת אחריות ואהבה. חזור הביתה.",en:"Year of responsibility and love. Come home.",level:6},
  7:{he:"שנת התבוננות פנימית. צלול פנימה.",en:"Year of inner reflection. Dive within.",level:3},
  8:{he:"שנת כוח והגשמה. הזמן שלך.",en:"Year of power and manifestation. Your time.",level:9},
  9:{he:"שנת סיום ושחרור. שחרר.",en:"Year of completion and release. Let go.",level:5},
};

const AFFIRMATIONS=[
  {he:"האור שבתוכי מאיר את דרכי",en:"The light within me illuminates my path"},
  {he:"אני בדיוק במקום הנכון",en:"I am exactly where I need to be"},
  {he:"הכוח לשנות נמצא בתוכי",en:"The power to change lies within me"},
  {he:"היקום תומך בכל צעד שלי",en:"The universe supports my every step"},
  {he:"אני מושך שפע ואהבה",en:"I attract abundance and love"},
  {he:"החכמה הפנימית שלי מנחה אותי",en:"My inner wisdom guides me"},
  {he:"כל יום הוא הזדמנות להתחדשות",en:"Every day is a chance for renewal"},
  {he:"אני ראוי לכל הטוב שמגיע אלי",en:"I am worthy of all good coming my way"},
  {he:"הנשמה שלי יודעת את הדרך",en:"My soul knows the way"},
  {he:"אני סומך על התזמון של היקום",en:"I trust the universe's timing"},
  {he:"אני פותח שערים חדשים",en:"I open new doors"},
  {he:"האנרגיה שלי יוצרת את המציאות שלי",en:"My energy creates my reality"},
];

// ═══════════════════ SMART RECOMMENDATIONS ═══════════════════
function getRecommendations(r, lang) {
  const recs = [];const he = lang === "he";
  if (r.kd.length > 0 && r.py === 7) recs.push({icon:"orb",t:he?"שנת תיקון עמוק":"Deep repair year",d:he?"השנה הנוכחית מזמינה אותך להתמודד עם חובות קארמיים.":"This year invites you to face karmic debts."});
  if ((r.nv===1||r.nv===8)&&(r.lp===1||r.lp===8)) recs.push({icon:"crown",t:he?"מסלול מנהיגות חזק":"Strong leadership track",d:he?"השילוב שלך מצביע על פוטנציאל מנהיגות יוצא דופן.":"Your combination indicates exceptional leadership potential."});
  if ([3,5].includes(r.py) && [3,5].includes(r.lp)) recs.push({icon:"palette",t:he?"גל יצירתי":"Creative surge",d:he?"האנרגיה היצירתית שלך בשיא.":"Your creative energy peaks."});
  if (r.py === 9) recs.push({icon:"wave",t:he?"שנת מעבר":"Transition year",d:he?"מחזור מסתיים. שחרר מה שכבר לא משרת אותך.":"A cycle ends. Release what no longer serves you."});
  if (r.py === 8) recs.push({icon:"coin",t:he?"חלון שפע":"Abundance window",d:he?"האנרגיה של 8 תומכת בהגשמה חומרית.":"The energy of 8 supports material manifestation."});
  if (r.su === 2 && r.py === 6) recs.push({icon:"heart",t:he?"ריפוי רגשי":"Emotional healing",d:he?"השנה מזמינה ריפוי של מערכות יחסים.":"This year invites healing of relationships."});
  if ([7,9].includes(r.lp) && [7,9].includes(r.py)) recs.push({icon:"sparkle",t:he?"יקיצה רוחנית":"Spiritual awakening",d:he?"אתה בנקודת שיא רוחנית.":"You are at a spiritual peak."});
  if (r.ls.miss.includes(4) && r.ls.miss.includes(8)) recs.push({icon:"globe",t:he?"צורך בהארקה":"Grounding needed",d:he?"חסרות לך אנרגיות של יציבות וכוח.":"You lack stability and power energies."});
  if (recs.length === 0) recs.push({icon:"star",t:he?"האנרגיה שלך מאוזנת":"Your energy is balanced",d:he?"המספרים שלך מצביעים על תקופה של הרמוניה.":"Your numbers indicate a period of harmony."});
  return recs;
}

// ═══════════════════ UI HELPERS ═══════════════════
function SR({children,delay=0}){const ref=useRef(null);const[v,setV]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);o.disconnect();}},{threshold:.08});o.observe(el);return()=>o.disconnect();},[]);return <div ref={ref} style={{opacity:v?1:0,transform:v?"translateY(0)":"translateY(35px)",transition:`all 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`}}>{children}</div>;}

function AN({value,delay=0}){const[d,setD]=useState("—");const[v,setV]=useState(false);useEffect(()=>{const t1=setTimeout(()=>setV(true),delay);let c=0;const iv=setInterval(()=>{setD(Math.floor(Math.random()*9)+1);c++;if(c>12){clearInterval(iv);setD(value);}},45);const t2=setTimeout(()=>{clearInterval(iv);setD(value);},delay+600);return()=>{clearTimeout(t1);clearTimeout(t2);clearInterval(iv);};},[value,delay]);return <span style={{opacity:v?1:0,transform:v?"scale(1)":"scale(0.4)",transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",display:"inline-block"}}>{d}</span>;}

// ═══════════════════ PARTICLES ═══════════════════
// Living galaxy: parallax twinkling stars, cursor constellations, shooting stars
function Particles({dk}){
  const ref=useRef(null);
  const mouse=useRef({x:0,y:0,tx:0,ty:0,active:false});
  useEffect(()=>{
    const c=ref.current;if(!c)return;const ctx=c.getContext("2d");let id;
    let W=0,H=0,dpr=1;const stars=[];const shooters=[];
    function build(){stars.length=0;const n=Math.min(230,Math.floor(W*H/8500));for(let i=0;i<n;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+.3,depth:Math.random(),tw:Math.random()*6.283,tws:.5+Math.random()*1.6,o:.18+Math.random()*.55,dx:(Math.random()-.5)*.05,dy:(Math.random()-.5)*.05});}
    const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;c.width=W*dpr;c.height=H*dpr;c.style.width=W+"px";c.style.height=H+"px";ctx.setTransform(dpr,0,0,dpr,0,0);build();};
    resize();window.addEventListener("resize",resize);
    const onMove=e=>{mouse.current.tx=e.clientX||0;mouse.current.ty=e.clientY||0;mouse.current.active=true;};
    window.addEventListener("mousemove",onMove,{passive:true});
    const cl=dk?"200,169,106":"147,118,64";let frame=0;
    function draw(){
      frame++;const m=mouse.current;m.x+=(m.tx-m.x)*.06;m.y+=(m.ty-m.y)*.06;
      ctx.clearRect(0,0,W,H);
      const ox=m.x-W/2,oy=m.y-H/2;
      for(const s of stars){
        s.x+=s.dx;s.y+=s.dy;if(s.x<-10)s.x=W+10;if(s.x>W+10)s.x=-10;if(s.y<-10)s.y=H+10;if(s.y>H+10)s.y=-10;
        s.tw+=.02*s.tws;const tw=.55+.45*Math.sin(s.tw);
        const px=s.x+ox*s.depth*.025,py=s.y+oy*s.depth*.025;
        ctx.beginPath();ctx.arc(px,py,s.r*(.6+s.depth*.8),0,6.283);
        ctx.fillStyle=`rgba(${cl},${s.o*tw*(.4+s.depth*.6)})`;ctx.fill();
      }
      if(m.active){
        const R=140,near=[];
        for(const s of stars){const px=s.x+ox*s.depth*.025,py=s.y+oy*s.depth*.025;const d=Math.hypot(px-m.x,py-m.y);if(d<R)near.push([px,py,d]);}
        for(let i=0;i<near.length;i++){
          const a=near[i];
          ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(a[0],a[1]);ctx.strokeStyle=`rgba(${cl},${.13*(1-a[2]/R)})`;ctx.lineWidth=.6;ctx.stroke();
          for(let j=i+1;j<near.length;j++){const b=near[j];const dd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(dd<72){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=`rgba(${cl},${.07*(1-dd/72)})`;ctx.lineWidth=.5;ctx.stroke();}}
        }
        const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,R);g.addColorStop(0,`rgba(${cl},.05)`);g.addColorStop(1,`rgba(${cl},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x,m.y,R,0,6.283);ctx.fill();
      }
      if(frame%150===0&&shooters.length<2){const lr=Math.random()<.5;shooters.push({x:Math.random()*W,y:Math.random()*H*.45,vx:(lr?1:-1)*(5+Math.random()*3),vy:1.8+Math.random()*1.6,life:1});}
      for(let i=shooters.length-1;i>=0;i--){const sh=shooters[i];sh.x+=sh.vx;sh.y+=sh.vy;sh.life-=.012;if(sh.life<=0||sh.x<-60||sh.x>W+60||sh.y>H+60){shooters.splice(i,1);continue;}
        const tx=sh.x-sh.vx*7,ty=sh.y-sh.vy*7;const grd=ctx.createLinearGradient(sh.x,sh.y,tx,ty);grd.addColorStop(0,`rgba(255,248,232,${.85*sh.life})`);grd.addColorStop(1,`rgba(${cl},0)`);ctx.strokeStyle=grd;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(sh.x,sh.y);ctx.lineTo(tx,ty);ctx.stroke();
        ctx.beginPath();ctx.arc(sh.x,sh.y,1.7,0,6.283);ctx.fillStyle=`rgba(255,248,232,${sh.life})`;ctx.fill();
      }
      id=requestAnimationFrame(draw);
    }
    draw();
    return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize);window.removeEventListener("mousemove",onMove);};
  },[dk]);
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

// Glowing aura that trails the cursor (desktop only)
function CursorAura({dk}){
  const ref=useRef(null);
  useEffect(()=>{
    if(window.matchMedia&&window.matchMedia("(pointer:coarse)").matches)return;
    const el=ref.current;if(!el)return;let x=0,y=0,tx=0,ty=0,id;
    const onMove=e=>{tx=e.clientX;ty=e.clientY;el.style.opacity="1";};
    const onLeave=()=>{el.style.opacity="0";};
    window.addEventListener("mousemove",onMove,{passive:true});document.addEventListener("mouseleave",onLeave);
    const loop=()=>{x+=(tx-x)*.16;y+=(ty-y)*.16;el.style.transform=`translate(${x}px,${y}px)`;id=requestAnimationFrame(loop);};loop();
    return()=>{cancelAnimationFrame(id);window.removeEventListener("mousemove",onMove);document.removeEventListener("mouseleave",onLeave);};
  },[]);
  const ac=dk?"200,169,106":"147,118,64";
  return <div ref={ref} style={{position:"fixed",top:0,left:0,zIndex:55,pointerEvents:"none",opacity:0,transition:"opacity .5s"}}><div style={{position:"absolute",width:300,height:300,marginLeft:-150,marginTop:-150,borderRadius:"50%",background:`radial-gradient(circle,rgba(${ac},.11),rgba(${ac},0) 64%)`}}/></div>;
}

// Scroll progress bar
function ScrollProgress({dk}){
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const onScroll=()=>{const h=document.documentElement;const max=h.scrollHeight-h.clientHeight;el.style.transform=`scaleX(${max>0?h.scrollTop/max:0})`;};
    onScroll();window.addEventListener("scroll",onScroll,{passive:true});window.addEventListener("resize",onScroll);
    return()=>{window.removeEventListener("scroll",onScroll);window.removeEventListener("resize",onScroll);};
  },[]);
  const ac=dk?"#c8a96a":"#937640";
  return <div style={{position:"fixed",top:0,left:0,right:0,height:2.5,zIndex:400,pointerEvents:"none"}}><div ref={ref} style={{height:"100%",background:`linear-gradient(90deg,${ac},#fff6e0,${ac})`,transformOrigin:"left",transform:"scaleX(0)",boxShadow:`0 0 12px ${ac}`}}/></div>;
}

// Cinematic per-character reveal
// Odometer digit (0-9) that rolls when the value changes
function RollDigit({ value }) {
  const v = Math.max(0, Math.min(9, value | 0));
  return (
    <span style={{ display: "inline-block", height: "1em", lineHeight: "1em", overflow: "hidden", verticalAlign: "-0.06em" }}>
      <span style={{ display: "block", transition: "transform .7s cubic-bezier(.34,1.56,.64,1)", transform: `translateY(${-v}em)` }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ display: "block", height: "1em", lineHeight: "1em" }}>{i}</span>)}
      </span>
    </span>
  );
}

// Live numerology of a typed string (Hebrew via LV, else A-Z Pythagorean)
function liveNum(s) {
  let sum = 0;
  for (const ch of s) {
    if (LV[ch]) sum += LV[ch];
    else { const u = ch.toUpperCase(); if (u >= "A" && u <= "Z") sum += ((u.charCodeAt(0) - 65) % 9) + 1; }
  }
  return sum ? R(sum) : 0;
}

// Magnetic wrapper — child drifts toward the cursor (desktop only)
function Magnetic({ children, strength = 22, style }) {
  const ref = useRef(null);
  const coarse = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
  if (coarse) return <span style={{ display: "inline-block", ...style }}>{children}</span>;
  const onMove = (e) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); const x = e.clientX - (r.left + r.width / 2); const y = e.clientY - (r.top + r.height / 2); el.style.transform = `translate(${(x / r.width) * strength}px,${(y / r.height) * strength}px)`; };
  const onLeave = () => { const el = ref.current; if (el) el.style.transform = ""; };
  return <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "inline-block", transition: "transform .35s cubic-bezier(.16,1,.3,1)", ...style }}>{children}</span>;
}

// Scroll-driven parallax wrapper
function Parallax({ children, speed = 0.15, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return; let raf = 0;
    const update = () => { const r = el.getBoundingClientRect(); const off = window.innerHeight / 2 - (r.top + r.height / 2); el.style.transform = `translate3d(0,${off * speed}px,0)`; raf = 0; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [speed]);
  return <div ref={ref} style={{ willChange: "transform", ...style }}>{children}</div>;
}

function RevealChars({text,delay=0}){
  return <span style={{display:"inline-block"}}>{[...text].map((ch,i)=>(
    <span key={i} style={{display:"inline-block",whiteSpace:"pre",opacity:0,animation:`charRise .7s cubic-bezier(.16,1,.3,1) ${delay+i*0.045}s forwards`}}>{ch===" "?" ":ch}</span>
  ))}</span>;
}

// ═══════════════════ CARD ART ═══════════════════
function CardArt({number,size=140}){
  const s=size,cx=s/2,cy=s/2;const col=D[number]?.c||"#c8a96a";
  const arts={
    1:<g><circle cx={cx} cy={cy-6} r={32} fill="none" stroke={col} strokeWidth="1" opacity=".45"/>{Array.from({length:12},(_,i)=>{const a=Math.PI*2/12*i;return <line key={i} x1={cx+35*Math.cos(a)} y1={cy-6+35*Math.sin(a)} x2={cx+46*Math.cos(a)} y2={cy-6+46*Math.sin(a)} stroke={col} strokeWidth={i%3===0?"1.3":".5"} opacity=".5"/>})}<circle cx={cx} cy={cy-6} r={16} fill={col} opacity=".1"/><text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">1</text></g>,
    2:<g><circle cx={cx-18} cy={cy-12} r={16} fill="none" stroke={col} strokeWidth=".7" opacity=".35"/><circle cx={cx+18} cy={cy-12} r={16} fill={col} opacity=".06"/><text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">2</text><path d={`M${cx-30} ${cy+30} Q${cx} ${cy+20} ${cx+30} ${cy+30}`} fill="none" stroke={col} strokeWidth=".7" opacity=".3"/></g>,
    3:<g><polygon points={`${cx},${cy-35} ${cx-32},${cy+22} ${cx+32},${cy+22}`} fill="none" stroke={col} strokeWidth="1" opacity=".4"/><text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">3</text></g>,
    4:<g><rect x={cx-26} y={cy-26} width={52} height={52} fill="none" stroke={col} strokeWidth="1" opacity=".4" rx="2"/><text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">4</text></g>,
    5:<g>{Array.from({length:5},(_,i)=>{const a1=Math.PI*2/5*i-Math.PI/2,a2=Math.PI*2/5*((i+2)%5)-Math.PI/2;return <line key={i} x1={cx+30*Math.cos(a1)} y1={cy-2+30*Math.sin(a1)} x2={cx+30*Math.cos(a2)} y2={cy-2+30*Math.sin(a2)} stroke={col} strokeWidth=".7" opacity=".35"/>})}<text x={cx} y={cy+6} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">5</text></g>,
    6:<g><polygon points={`${cx},${cy-32} ${cx-28},${cy+16} ${cx+28},${cy+16}`} fill="none" stroke={col} strokeWidth=".6" opacity=".25"/><polygon points={`${cx},${cy+32} ${cx-28},${cy-16} ${cx+28},${cy-16}`} fill="none" stroke={col} strokeWidth=".6" opacity=".25"/><text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">6</text></g>,
    7:<g><ellipse cx={cx} cy={cy-4} rx={32} ry={18} fill="none" stroke={col} strokeWidth=".9" opacity=".35"/><circle cx={cx} cy={cy-4} r={8} fill={col} opacity=".12"/><text x={cx} y={cy+8} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">7</text></g>,
    8:<g><path d={`M${cx} ${cy-2} C${cx-10} ${cy-22} ${cx-36} ${cy-22} ${cx-36} ${cy-2} C${cx-36} ${cy+16} ${cx-10} ${cy+16} ${cx} ${cy-2} C${cx+10} ${cy-22} ${cx+36} ${cy-22} ${cx+36} ${cy-2} C${cx+36} ${cy+16} ${cx+10} ${cy+16} ${cx} ${cy-2}`} fill="none" stroke={col} strokeWidth="1" opacity=".4"/><text x={cx} y={cy+6} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">8</text></g>,
    9:<g>{Array.from({length:9},(_,i)=>{const a=Math.PI*2/9*i-Math.PI/2;return <ellipse key={i} cx={cx+22*Math.cos(a)} cy={cy-3+22*Math.sin(a)} rx={5} ry={14} fill={col} opacity=".05" stroke={col} strokeWidth=".4" transform={`rotate(${i*40+90} ${cx+22*Math.cos(a)} ${cy-3+22*Math.sin(a)})`}/>})}<text x={cx} y={cy+5} textAnchor="middle" fontSize="32" fontWeight="300" fill={col} fontFamily="serif">9</text></g>,
  };
  return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>{arts[number]||arts[1]}</svg>;
}

function TarotCard({number,dk,flipped:ext,size="sm"}){
  const[f,setF]=useState(ext||false);const info=D[number]||D[1];
  const sm=size==="sm";const w=sm?115:190;const h=sm?165:275;const ac=dk?"#c8a96a":"#937640";
  return(<div onClick={()=>{setF(!f);AU.init();AU.p("card");}} style={{perspective:800,cursor:"pointer",width:w,height:h,flexShrink:0}}>
    <div style={{width:"100%",height:"100%",position:"relative",transformStyle:"preserve-3d",transition:"transform 0.85s cubic-bezier(0.34,1.56,0.64,1)",transform:f?"rotateY(180deg)":"rotateY(0)"}}>
      <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:dk?"linear-gradient(135deg,#1a1a35,#0d0d1a)":"linear-gradient(135deg,#f5f0e8,#e8dcc8)",border:`1.5px solid ${ac}33`,borderRadius:sm?10:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:dk?`0 6px 30px rgba(0,0,0,.35)`:`0 6px 25px rgba(0,0,0,.08)`}}>
        <div style={{position:"absolute",inset:sm?6:10,border:`1px solid ${ac}18`,borderRadius:sm?6:10}}/>
        <div style={{fontSize:sm?22:34,color:ac,opacity:.4}}>✦</div>
      </div>
      <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",transform:"rotateY(180deg)",background:dk?`linear-gradient(160deg,#1a1a35,${info.c}0e,#0d0d1a)`:`linear-gradient(160deg,#fff,${info.c}12,#f5f0e8)`,border:`1.5px solid ${info.c}44`,borderRadius:sm?10:14,display:"flex",flexDirection:"column",alignItems:"center",padding:sm?"8px 4px":"14px 10px",boxShadow:`0 6px 30px ${info.c}1a`,overflow:"hidden"}}>
        <div style={{fontSize:sm?7:10,color:info.c,opacity:.4,letterSpacing:3}}>{D[number]?.el}</div>
        <div style={{flex:sm?undefined:1,display:"flex",alignItems:"center"}}><CardArt number={number} size={sm?80:130}/></div>
        <div style={{fontSize:sm?11:17,fontWeight:600,color:info.c,textAlign:"center",fontFamily:"'Cormorant Garamond',serif"}}>{info.t}</div>
        <div style={{fontSize:sm?7:10,color:dk?"rgba(232,224,208,.4)":"rgba(0,0,0,.35)",textAlign:"center",lineHeight:1.3}}>{info.s}</div>
      </div>
    </div>
  </div>);
}

// ═══════════════════ PSYCHOLOGICAL RADAR ═══════════════════
function PsychRadar({psych,dk,he}){
  const ac=dk?"#c8a96a":"#937640";const s=300;const cx=s/2;const cy=s/2;const r=110;
  const axes=he?["מנהיגות","אינטואיציה","יצירתיות","יציבות","שאיפה","חכמה"]:["Leadership","Intuition","Creativity","Stability","Ambition","Wisdom"];
  const keys=["leadership","intuition","creativity","stability","ambition","wisdom"];
  const cols=["#FFD700","#9B59B6","#FF6B6B","#4ECDC4","#E67E22","#45B7D1"];
  const pts=keys.map((k,i)=>{const a=Math.PI*2/6*i-Math.PI/2;const v=psych[k]/10;return{x:cx+r*v*Math.cos(a),y:cy+r*v*Math.sin(a),ax:cx+r*Math.cos(a),ay:cy+r*Math.sin(a),lx:cx+(r+20)*Math.cos(a),ly:cy+(r+20)*Math.sin(a),v:psych[k],col:cols[i]};});
  const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
  return(<svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{display:"block",margin:"0 auto"}}>
    {[.25,.5,.75,1].map(f=><polygon key={f} points={keys.map((_,i)=>{const a=Math.PI*2/6*i-Math.PI/2;return`${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`;}).join(" ")} fill="none" stroke={ac} strokeWidth=".4" opacity={f===1?.2:.1}/>)}
    {pts.map((p,i)=><line key={i} x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke={ac} strokeWidth=".3" opacity=".15"/>)}
    <polygon points={poly} fill={ac} fillOpacity=".08" stroke={ac} strokeWidth="1.5" strokeOpacity=".5"><animate attributeName="opacity" values=".7;1;.7" dur="4s" repeatCount="indefinite"/></polygon>
    {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={4} fill={p.col} opacity=".7"><animate attributeName="r" values="3;5;3" dur={`${3+i*.5}s`} repeatCount="indefinite"/></circle></g>)}
    {pts.map((p,i)=><text key={`l${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={p.col} opacity=".7" fontFamily="sans-serif">{axes[i]}<tspan x={p.lx} dy="13" fontSize="12" fontWeight="700" fill={p.col}>{p.v}/10</tspan></text>)}
  </svg>);
}

// ═══════════════════ YEARLY WAVE TIMELINE ═══════════════════
function YearWave({proj,dk,he}){
  const ac=dk?"#c8a96a":"#937640";
  const w=520,h=200,pad=40;const usable=w-pad*2;const step=usable/(proj.length-1);
  const points=proj.map((p,i)=>{const x=pad+i*step;const e=YEAR_ENERGY[p.py]||{level:5};const y=h-pad-(e.level/10)*(h-pad*2);return{...p,x,y,energy:e};});
  let pathD=`M${points[0].x},${points[0].y}`;
  for(let i=1;i<points.length;i++){const prev=points[i-1],curr=points[i];const cpx=(prev.x+curr.x)/2;pathD+=` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;}
  const areaD=pathD+` L${points[points.length-1].x},${h-pad} L${points[0].x},${h-pad} Z`;
  const[hover,setHover]=useState(null);
  return(<div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"8px 0"}}>
    <svg width={w} height={h+30} viewBox={`0 0 ${w} ${h+30}`} style={{display:"block",minWidth:w}}>
      {[.25,.5,.75].map(f=><line key={f} x1={pad} y1={h-pad-(f)*(h-pad*2)} x2={w-pad} y2={h-pad-(f)*(h-pad*2)} stroke={ac} strokeWidth=".3" opacity=".08"/>)}
      <path d={areaD} fill={`url(#waveGrad)`} opacity=".15"/><defs><linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ac}/><stop offset="1" stopColor={ac} stopOpacity="0"/></linearGradient></defs>
      <path d={pathD} fill="none" stroke={ac} strokeWidth="2" opacity=".6" strokeLinecap="round"/>
      {points.map((p,i)=>(<g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>setHover(hover===i?null:i)} style={{cursor:"pointer"}}>
        <circle cx={p.x} cy={p.y} r={p.isCurrent?7:hover===i?6:3.5} fill={p.isCurrent?ac:hover===i?ac:`${ac}88`} opacity={p.isCurrent?1:hover===i?.9:.6}>{p.isCurrent&&<animate attributeName="r" values="6;9;6" dur="3s" repeatCount="indefinite"/>}</circle>
        <text x={p.x} y={h-pad+16} textAnchor="middle" fontSize="9" fill={p.isCurrent?ac:`${ac}55`} fontWeight={p.isCurrent?"700":"400"}>{p.year}</text>
        <text x={p.x} y={p.y-12} textAnchor="middle" fontSize="11" fontWeight="700" fill={ac} opacity={p.isCurrent||hover===i?1:0} style={{transition:"opacity .3s"}}>{p.py}</text>
        {hover===i&&!p.isCurrent&&(<foreignObject x={p.x-80} y={p.y-65} width={160} height={50}><div style={{background:dk?"rgba(15,15,30,.95)":"rgba(255,255,255,.95)",border:`1px solid ${ac}33`,borderRadius:8,padding:"6px 10px",textAlign:"center",fontSize:10,color:dk?"#e8e0d0":"#2a2520",backdropFilter:"blur(10px)"}}><div style={{fontWeight:700,color:ac}}>{p.year} — {he?D[p.py]?.t:D[p.py]?.te}</div><div style={{opacity:.6,marginTop:2}}>{p.energy[he?"he":"en"]}</div></div></foreignObject>)}
      </g>))}
    </svg>
  </div>);
}

// ═══════════════════ LO SHU GRID ═══════════════════
function LoShu({ls,dk,he}){
  const ac=dk?"#c8a96a":"#937640";
  const layout=[[4,9,2],[3,5,7],[8,1,6]];
  const meanings={1:he?"קריירה":"Career",2:he?"יחסים":"Relationships",3:he?"ידע":"Knowledge",4:he?"יציבות":"Stability",5:he?"בריאות":"Health",6:he?"אחריות":"Responsibility",7:he?"רוחניות":"Spirituality",8:he?"כוח":"Power",9:he?"חכמה":"Wisdom"};
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,maxWidth:260,margin:"0 auto"}}>
    {layout.flat().map((num,i)=>{const ct=ls.g[num];const miss=ct===0;return(
      <div key={i} style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,border:`1.5px solid ${miss?`${ac}12`:ac+"44"}`,background:miss?(dk?"rgba(10,10,20,.3)":"rgba(200,200,200,.15)"):`${ac}${ct>1?"18":"08"}`,position:"relative",transition:"all .3s"}}>
        {ct>1&&<div style={{position:"absolute",top:3,right:5,fontSize:8,color:ac,opacity:.5}}>×{ct}</div>}
        <div style={{fontSize:26,fontWeight:700,color:miss?(dk?"rgba(232,224,208,.12)":"rgba(0,0,0,.08)"):ac,fontFamily:"'Cormorant Garamond',serif"}}>{num}</div>
        <div style={{fontSize:7.5,color:dk?"rgba(232,224,208,.25)":"rgba(0,0,0,.2)",textAlign:"center"}}>{meanings[num]}</div>
      </div>);})}
  </div>);
}

// ═══════════════════ CHAPTER SYSTEM ═══════════════════
function Chapter({index,title,subtitle,icon,children,isActive,isRevealed,onReveal,dk}){
  const ac=dk?"#c8a96a":"#937640";
  if(!isRevealed)return(
    <div style={{textAlign:"center",padding:"40px 20px",opacity:isActive?1:.3,transition:"opacity .8s",cursor:isActive?"pointer":"default"}} onClick={isActive?onReveal:undefined}>
      <div style={{marginBottom:12,opacity:isActive?.55:.3,filter:isActive?"none":"blur(3px)",transition:"filter .5s,opacity .5s",color:ac,display:"flex",justifyContent:"center"}}><Icon name={icon} size={34} stroke={1.3}/></div>
      <div style={{fontSize:18,fontWeight:600,color:ac,opacity:isActive?1:.3,transition:"opacity .5s"}}>{title}</div>
      <div style={{fontSize:13,color:dk?"rgba(232,224,208,.3)":"rgba(0,0,0,.2)",marginTop:4}}>{subtitle}</div>
      {isActive&&<div style={{marginTop:16,fontSize:13,color:ac,opacity:.6,animation:"pulse 2s ease-in-out infinite"}}>{dk?"לחץ לחשיפה ▾":"Tap to reveal ▾"}</div>}
    </div>);
  return(<div style={{animation:"fadeInUp .8s ease-out",padding:"12px 0"}}>
    <div style={{textAlign:"center",marginBottom:20}}>
      <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:4,marginBottom:4}}>{`— ${index < 10 ? "0" : ""}${index} —`}</div>
      <div style={{marginBottom:8,color:ac,display:"flex",justifyContent:"center"}}><Icon name={icon} size={26} stroke={1.3}/></div>
      <h3 style={{fontSize:22,fontWeight:600,color:ac,marginBottom:4,fontFamily:"'Cormorant Garamond',serif"}}>{title}</h3>
      <div style={{fontSize:13,color:dk?"rgba(232,224,208,.35)":"rgba(0,0,0,.3)"}}>{subtitle}</div>
    </div>
    <div className="gc">{children}</div>
  </div>);
}

// ═══════════════════ INTRO ═══════════════════
function Intro({onDone,he,dk}){
  const[p,setP]=useState(0);const ac=dk?"#c8a96a":"#937640";
  useEffect(()=>{const ts=[setTimeout(()=>setP(1),400),setTimeout(()=>setP(2),1800),setTimeout(()=>setP(3),3200),setTimeout(()=>setP(4),4500),setTimeout(()=>onDone(),5200)];return()=>ts.forEach(clearTimeout);},[onDone]);
  return(<div style={{position:"fixed",inset:0,zIndex:9999,background:dk?"#080812":"#f5f0e8",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 1s ease",opacity:p>=4?0:1,pointerEvents:p>=4?"none":"all"}}>
    <div style={{fontSize:80,color:ac,opacity:p>=1?1:0,transform:`scale(${p>=1?1:.2})`,transition:"all 1.2s cubic-bezier(.34,1.56,.64,1)",textShadow:`0 0 80px ${ac}33`,marginBottom:30}}>✦</div>
    <h1 style={{fontSize:52,fontWeight:300,letterSpacing:10,color:ac,opacity:p>=2?1:0,transform:`translateY(${p>=2?0:25}px)`,transition:"all 1s ease .3s",fontFamily:"'Cormorant Garamond',serif",textTransform:"uppercase"}}>{he?"נומרולוגיה":"Numerology"}</h1>
    <p style={{fontSize:16,fontWeight:300,color:dk?"rgba(232,224,208,.35)":"rgba(0,0,0,.3)",opacity:p>=3?1:0,transition:"all .8s ease",marginTop:14,fontStyle:"italic",fontFamily:"'Cormorant Garamond',serif",letterSpacing:2}}>{he?"המספרים מדברים... האם אתה מוכן?":"The numbers speak... Are you ready?"}</p>
  </div>);
}

// ═══════════════════ EXPORT ═══════════════════
function exportReport(r,name,he,interp){
  const c=document.createElement("canvas");const w=1080,h=1920;c.width=w;c.height=h;const ctx=c.getContext("2d");
  const grd=ctx.createLinearGradient(0,0,w,h);grd.addColorStop(0,"#080812");grd.addColorStop(.5,"#0f0f28");grd.addColorStop(1,"#080812");ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
  for(let i=0;i<100;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,Math.random()*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(200,169,106,${Math.random()*.2})`;ctx.fill();}
  ctx.strokeStyle="rgba(200,169,106,.12)";ctx.lineWidth=1;ctx.strokeRect(50,50,w-100,h-100);
  ctx.textAlign="center";ctx.fillStyle="#c8a96a";ctx.font="100 58px serif";ctx.fillText("✦ "+(he?"נומרולוגיה":"NUMEROLOGY")+" ✦",w/2,140);
  ctx.fillStyle="rgba(232,224,208,.45)";ctx.font="32px serif";ctx.fillText(name,w/2,200);
  let yp=320;
  const nums=[{l:he?"שביל הגורל":"Life Path",v:r.lp},{l:he?"ערך השם":"Name Value",v:r.nv},{l:he?"קול הנשמה":"Soul Urge",v:r.su},{l:he?"מספר הביטוי":"Expression",v:r.ex},{l:he?"שנה אישית":"Personal Year",v:r.py},{l:he?"שנה נסתרת":"Hidden Year",v:r.hy}];
  nums.forEach(it=>{ctx.beginPath();ctx.arc(w/2,yp,36,0,Math.PI*2);ctx.fillStyle="rgba(200,169,106,.06)";ctx.fill();ctx.strokeStyle="rgba(200,169,106,.2)";ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle="#c8a96a";ctx.font="bold 30px serif";ctx.fillText(String(it.v),w/2,yp+10);ctx.fillStyle="rgba(232,224,208,.35)";ctx.font="18px sans-serif";ctx.fillText(it.l,w/2,yp+50);yp+=100;});
  const li=interp[r.lp];if(li){yp+=30;ctx.fillStyle="#c8a96a";ctx.font="bold 26px serif";ctx.fillText(`— ${he?li.t:li.te} —`,w/2,yp);}
  ctx.fillStyle="rgba(200,169,106,.15)";ctx.font="16px serif";ctx.fillText("✦  ✦  ✦",w/2,h-80);
  const link=document.createElement("a");link.download=`oracle-${name}.png`;link.href=c.toDataURL("image/png");link.click();
}

// ═══════════════════ MASTER NUMBERS ═══════════════════
const MASTER={
  11:{t:"המאיר",te:"The Illuminator",he:"ערוץ רוחני עוצמתי. אינטואיציה חריפה, כריזמה רוחנית, יכולת להאיר את הדרך לאחרים. האתגר: עצבנות, רגישות יתר, חרדה.",en:"Powerful spiritual channel. Sharp intuition, spiritual charisma, ability to illuminate the path for others. Challenge: nervousness, oversensitivity, anxiety.",c:"#E0B0FF"},
  22:{t:"בונה המאסטר",te:"The Master Builder",he:"הכוח להפוך חלומות גדולים למציאות מוחשית. חזון גלובלי עם יכולת מעשית. האתגר: לחץ עצום, ציפיות מעצמו גבוהות מדי.",en:"The power to turn grand dreams into tangible reality. Global vision with practical ability. Challenge: immense pressure, expectations too high.",c:"#FFD700"},
  33:{t:"המרפא",te:"The Master Healer",he:"אנרגיית אהבה אוניברסלית. יכולת ריפוי עמוקה, מורה רוחני מלידה. האתגר: הקרבה עצמית קיצונית, נטל רגשי כבד.",en:"Universal love energy. Deep healing ability, born spiritual teacher. Challenge: extreme self-sacrifice, heavy emotional burden.",c:"#7FFFD4"},
};

const NUM_LIB={
  1:{icon:"sun",he:{k:"התחלה, עצמאות, מנהיגות",p:"אנרגיה חלוצית של פעולה ויוזמה. מספר 1 מייצג את הניצוץ הראשוני של הבריאה."},en:{k:"Beginning, Independence, Leadership",p:"Pioneering energy of action and initiative. Number 1 represents the initial spark of creation."}},
  2:{icon:"moon",he:{k:"שותפות, אינטואיציה, איזון",p:"אנרגיה נשית של קבלה והקשבה. מספר 2 מייצג את הדואליות וההרמוניה."},en:{k:"Partnership, Intuition, Balance",p:"Feminine energy of receptivity and listening. Number 2 represents duality and harmony."}},
  3:{icon:"palette",he:{k:"יצירתיות, ביטוי, שמחה",p:"אנרגיה של ביטוי עצמי ותקשורת. מספר 3 מייצג את שילוש הבריאה."},en:{k:"Creativity, Expression, Joy",p:"Energy of self-expression and communication. Number 3 represents the trinity of creation."}},
  4:{icon:"temple",he:{k:"יציבות, סדר, עבודה",p:"אנרגיה של בנייה ויסודות. מספר 4 מייצג את ארבע הפינות, את המוצק והבטוח."},en:{k:"Stability, Order, Work",p:"Energy of building and foundations. Number 4 represents the four corners, the solid and secure."}},
  5:{icon:"wave",he:{k:"חופש, שינוי, הרפתקה",p:"אנרגיה דינמית של תנועה ושינוי. מספר 5 מייצג את חמשת החושים ואת החופש."},en:{k:"Freedom, Change, Adventure",p:"Dynamic energy of movement and change. Number 5 represents the five senses and freedom."}},
  6:{icon:"heart",he:{k:"אהבה, אחריות, משפחה",p:"אנרגיה מטפחת של אהבה ללא תנאים. מספר 6 מייצג את הבית, המשפחה והיופי."},en:{k:"Love, Responsibility, Family",p:"Nurturing energy of unconditional love. Number 6 represents home, family and beauty."}},
  7:{icon:"orb",he:{k:"רוחניות, חקירה, חכמה",p:"אנרגיה פנימית של חיפוש אחר אמת. מספר 7 מייצג את המסתורין ואת העומק."},en:{k:"Spirituality, Inquiry, Wisdom",p:"Inner energy of truth-seeking. Number 7 represents mystery and depth."}},
  8:{icon:"infinity",he:{k:"כוח, שפע, הגשמה",p:"אנרגיה של כוח ואינסוף. מספר 8 מייצג את הזרימה בין הרוחני לחומרי."},en:{k:"Power, Abundance, Manifestation",p:"Energy of power and infinity. Number 8 represents the flow between spiritual and material."}},
  9:{icon:"dove",he:{k:"חמלה, סיום, חכמה עליונה",p:"אנרגיה של השלמה ואוניברסליות. מספר 9 מייצג את סוף המחזור ואת החכמה שנצברה."},en:{k:"Compassion, Completion, Higher Wisdom",p:"Energy of completion and universality. Number 9 represents the end of the cycle and accumulated wisdom."}},
  11:{icon:"bolt",he:{k:"אינטואיציה, השראה, הארה",p:"מספר מאסטר. ערוץ רוחני שמחבר בין עולמות. רגישות גבוהה במיוחד ויכולת לראות מעבר."},en:{k:"Intuition, Inspiration, Illumination",p:"Master number. Spiritual channel connecting worlds. Exceptionally high sensitivity and ability to see beyond."}},
  22:{icon:"layers",he:{k:"בנייה גדולה, חזון, הגשמה",p:"מספר מאסטר. הכוח להפוך חזון גדול למציאות. שילוב נדיר של רוחניות ומעשיות."},en:{k:"Grand Building, Vision, Manifestation",p:"Master number. Power to turn grand vision into reality. Rare combination of spirituality and practicality."}},
  33:{icon:"sparkle",he:{k:"ריפוי, אהבה אוניברסלית, הוראה",p:"מספר מאסטר. אנרגיית אהבה ברמה הגבוהה ביותר. מורה ומרפא מלידה."},en:{k:"Healing, Universal Love, Teaching",p:"Master number. Love energy at the highest level. Born teacher and healer."}},
};

// Master-aware LP
function LPm(d,m,y){const s=[...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${y}`].reduce((a,c)=>a+ +c,0);if(s===11||s===22||s===33)return s;let n=s;while(n>=10){n=[...String(n)].reduce((a,c)=>a+ +c,0);if(n===11||n===22||n===33)return n;}return n;}

// Name generator by target number
function genNames(target,he){
  const hNames={1:["אורי","אילן","אדם","עדי"],2:["נועה","מיכל","דניאל","רוני"],3:["יובל","שיר","אלה","ליאור"],4:["עומר","תמר","דוד","רות"],5:["גיל","ניר","הדר","רון"],6:["אהבה","שלום","נעמי","חנה"],7:["אור","עדן","יונתן","מורן"],8:["שגב","עוז","אמיר","גבריאל"],9:["נתן","חיים","רחל","שרה"]};
  const eNames={1:["Adam","Ava","Ian","Una"],2:["Beth","Dana","Noah","Ruth"],3:["Joy","Leo","Maya","Sky"],4:["Dean","Kate","Mark","Sara"],5:["Alex","Iris","Noel","Vera"],6:["Anna","Emma","Luke","Rosa"],7:["Alan","Gaia","Seth","Zara"],8:["Brock","Diana","Hugo","Stella"],9:["Grace","Ira","Luna","Sage"]};
  return(he?hNames:eNames)[target]||[];
}

// ═══════════════════ TABLES WIDGET ═══════════════════
function TablesWidget({he,dk}){
  const ac=dk?"#c8a96a":"#937640";
  const tm=dk?"#e8e0d0":"#2a2520";
  const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const isRtl=he;
  const[firstName,setFirstName]=useState("");
  const[lastName,setLastName]=useState("");
  const[dob,setDob]=useState("");
  const[addOne,setAddOne]=useState(false);
  const[results,setResults]=useState(null);
  const[error,setError]=useState("");
  const[animIn,setAnimIn]=useState(false);
  const[showExtra,setShowExtra]=useState(false);
  const doCalc=()=>{
    try{setError("");const parts=dob.split(".");if(parts.length!==3)throw 0;const[d,m,y]=parts.map(Number);if(!d||!m||!y||d>31||m>12||y<1900)throw 0;const fullName=(firstName+" "+lastName).trim();AU.init();AU.p("reveal");const r=fullCalc(d,m,y,fullName,addOne);setResults(r);setShowExtra(false);setAnimIn(false);setTimeout(()=>setAnimIn(true),50);}catch{setError(he?"אנא ודא שכל הנתונים הוזנו כהלכה":"Please check all data is entered correctly");}
  };
  const thStyle={padding:"11px 14px",fontSize:12,fontWeight:700,color:ac,textAlign:"center",borderBottom:`2px solid ${ac}22`,letterSpacing:.3};
  const tdStyle={padding:"11px 14px",fontSize:14,fontWeight:500,color:tm,textAlign:"center",borderBottom:`1px solid ${ac}08`};
  const tdLabel={...tdStyle,fontWeight:600,color:ts,fontSize:13,textAlign:isRtl?"right":"left"};
  const tdValue={...tdStyle,fontSize:20,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"};
  const cycleLabels=he?["חיפוש","מציאה","יתד","שיא"]:["Search","Discovery","Anchor","Summit"];
  return(<div style={{animation:"fadeInUp .5s ease-out"}}>
    <div className="gc" style={{marginBottom:20}}>
      <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:4,marginBottom:6}}>{he?"פרטים למילוי":"Enter Details"}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"שם פרטי":"First Name"}</label><input className="gi" placeholder={he?"שם פרטי...":"First name..."} value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
        <div><label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"שם משפחה":"Last Name"}</label><input className="gi" placeholder={he?"שם משפחה...":"Last name..."} value={lastName} onChange={e=>setLastName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end",marginBottom:14}}>
        <div><label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" placeholder="dd.mm.yyyy" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" style={{textAlign:"center",letterSpacing:3,fontFamily:"'Cormorant Garamond',serif"}} onKeyDown={e=>{if(e.key==="Enter")doCalc();}}/></div>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",paddingBottom:4,height:54,paddingTop:22}} onClick={()=>setAddOne(!addOne)}>
          <div style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${ac}44`,background:addOne?`${ac}1a`:dk?"rgba(8,8,18,.6)":"rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",flexShrink:0}}>{addOne&&<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke={ac} strokeWidth="2" strokeLinecap="round"/></svg>}</div>
          <span style={{fontSize:11,color:ts,whiteSpace:"nowrap"}}>{he?"הוסף 1":"Add 1"}</span>
        </div>
      </div>
      {error&&<div style={{padding:"10px 14px",background:"rgba(180,50,50,.12)",border:"1px solid rgba(180,50,50,.25)",borderRadius:10,color:"#e8a0a0",fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}
      <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doCalc}>{he?"חשב":"Calculate"}</button>
    </div>
    {results&&animIn&&(<div style={{animation:"fadeInUp .7s ease-out"}}>
      <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"תוצאות כלליות":"General Results"}</h4></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(147,118,64,.02)"}}><th style={{...thStyle,textAlign:isRtl?"right":"left",paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{he?"קטגוריה":"Category"}</th><th style={thStyle}>{he?"ערך":"Value"}</th></tr></thead>
          <tbody>{[{l:he?"ערך השם":"Name Value",v:results.nv},{l:he?"שביל הגורל":"Life Path",v:results.lp},{l:he?"שנה אישית":"Personal Year",v:results.py},{l:he?"שנה נסתרת":"Hidden Year",v:results.hy},{l:he?"גיל נוכחי":"Current Age",v:results.age}].map((row,i)=>(
            <tr key={i} style={{background:i%2===0?"transparent":(dk?"rgba(200,169,106,.015)":"rgba(147,118,64,.01)")}}><td style={{...tdLabel,paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{row.l}</td><td style={tdValue}>{row.v}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
      <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מחזורי חיים | פסגות ואתגרים":"Life Cycles | Peaks & Challenges"}</h4></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(147,118,64,.02)"}}><th style={{...thStyle,fontSize:11}}>{he?"מחזור חיים":"Life Cycle"}</th><th style={{...thStyle,fontSize:11}}>{he?"פסגה":"Peak"}</th><th style={{...thStyle,fontSize:11}}>{he?"אתגר":"Challenge"}</th><th style={{...thStyle,fontSize:11}}>{he?"פסגה נסתרת":"Hidden Peak"}</th><th style={{...thStyle,fontSize:11}}>{he?"אתגר נסתר":"Hidden Chal."}</th></tr></thead>
          <tbody>{cycleLabels.map((label,i)=>{const sa=results.exit+i*9;const active=results.age>=sa&&results.age<sa+9;return(
            <tr key={i} style={{background:active?(dk?"rgba(200,169,106,.06)":"rgba(200,169,106,.05)"):(i%2===0?"transparent":(dk?"rgba(200,169,106,.015)":"rgba(147,118,64,.01)"))}}><td style={{...tdStyle,fontWeight:600,color:active?ac:ts,fontSize:12,whiteSpace:"nowrap"}}><div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>{active&&<span style={{display:"inline-block",width:5,height:5,borderRadius:3,background:ac,boxShadow:`0 0 6px ${ac}66`,flexShrink:0}}/>}<span>{label}</span><span style={{fontSize:9,color:ts,opacity:.5}}>{sa}-{sa+9}</span></div></td><td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{results.pk[i]}</td><td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?"#e88":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.ch[i]}</td><td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?`${ac}bb`:ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hp[i]}</td><td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?"#e88bb":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hc[i]}</td></tr>
          );})}</tbody>
        </table></div>
      </div>
      <div style={{textAlign:"center",margin:"20px 0"}}><button className="ghost" onClick={()=>{setShowExtra(!showExtra);AU.init();AU.p("click");}} style={{display:"inline-flex",alignItems:"center",gap:8}}><span>{he?(showExtra?"הסתר תוצאות נוספות":"הצג תוצאות נוספות"):(showExtra?"Hide Extra Results":"Show Extra Results")}</span><span style={{transform:showExtra?"rotate(180deg)":"rotate(0)",transition:"transform .3s",display:"inline-block"}}>▾</span></button></div>
      {showExtra&&(<div style={{animation:"fadeInUp .5s ease-out"}}>
        <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"נשמה וביטוי":"Soul & Expression"}</h4></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(147,118,64,.02)"}}><th style={{...thStyle,textAlign:isRtl?"right":"left",paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{he?"קטגוריה":"Category"}</th><th style={thStyle}>{he?"ערך":"Value"}</th><th style={thStyle}>{he?"ארכיטיפ":"Archetype"}</th></tr></thead>
            <tbody>{[{l:he?"קול הנשמה":"Soul Urge",v:results.su},{l:he?"מספר הביטוי":"Expression",v:results.ex},{l:he?"חודש אישי":"Personal Month",v:results.pm},{l:he?"יום אישי":"Personal Day",v:results.pd}].map((row,i)=>(
              <tr key={i} style={{background:i%2===0?"transparent":(dk?"rgba(200,169,106,.015)":"rgba(147,118,64,.01)")}}><td style={{...tdLabel,paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{row.l}</td><td style={tdValue}>{row.v}</td><td style={{...tdStyle,fontSize:12,color:D[row.v]?.c||ac,opacity:.8}}>{row.v>0&&row.v<=9?(he?D[row.v]?.t:D[row.v]?.te):""}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
        <div className="gc" style={{marginBottom:16}}>
          <div style={{textAlign:"center",marginBottom:12}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"חובות קארמיים":"Karmic Debts"}</h4></div>
          {results.kd.length===0?(<div style={{textAlign:"center",padding:"16px",background:`${ac}06`,borderRadius:12}}><span style={{color:ac,display:"inline-flex"}}><Icon name="dove" size={16}/></span><span style={{fontSize:13,color:ts,marginRight:8,marginLeft:8}}>{he?"אין חוב קארמי":"No karmic debt"}</span></div>):(<div style={{display:"flex",flexDirection:"column",gap:8}}>{results.kd.map(k=>(<div key={k} style={{padding:"12px 14px",background:"rgba(180,50,50,.05)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20,fontWeight:700,color:"#e88",fontFamily:"'Cormorant Garamond',serif",flexShrink:0}}>{k}</span><span style={{fontSize:12,lineHeight:1.7,color:ts}}>{KARMA[k]?.[he?"he":"en"]}</span></div>))}</div>)}
        </div>
        <div className="gc" style={{marginBottom:16}}>
          <div style={{textAlign:"center",marginBottom:12}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>Lo Shu Grid</h4>{results.ls.miss.length>0&&<p style={{fontSize:11,color:ts,marginTop:4}}>{he?"חסרים: ":"Missing: "}{results.ls.miss.join(", ")}</p>}</div>
          <LoShu ls={results.ls} dk={dk} he={he}/>
        </div>
        <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מחזור שנים אישי":"Personal Year Cycle"}</h4></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(147,118,64,.02)"}}><th style={thStyle}>{he?"שנה":"Year"}</th><th style={thStyle}>{he?"שנה אישית":"P. Year"}</th><th style={thStyle}>{he?"אנרגיה":"Energy"}</th></tr></thead>
            <tbody>{results.proj.map((p,i)=>(
              <tr key={i} style={{background:p.isCurrent?(dk?"rgba(200,169,106,.06)":"rgba(200,169,106,.05)"):(i%2===0?"transparent":(dk?"rgba(200,169,106,.015)":"rgba(147,118,64,.01)"))}}><td style={{...tdStyle,fontWeight:p.isCurrent?700:400,color:p.isCurrent?ac:ts,fontSize:13}}>{p.year}{p.isCurrent&&<span style={{fontSize:8,color:ac,opacity:.6,marginRight:4,marginLeft:4}}>◀</span>}</td><td style={{...tdStyle,fontSize:18,fontWeight:700,color:p.isCurrent?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{p.py}</td><td style={{...tdStyle,fontSize:11,color:p.isCurrent?ac:ts}}>{he?D[p.py]?.t:D[p.py]?.te}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      </div>)}
      <div style={{textAlign:"center",marginTop:8}}><button className="ghost" onClick={()=>{setResults(null);setFirstName("");setLastName("");setDob("");setAddOne(false);setShowExtra(false);AU.init();AU.p("click");}}>{he?"חישוב חדש":"New Calculation"}</button></div>
    </div>)}
  </div>);
}

// ═══════════════════ CALCULATORS WIDGET ═══════════════════
function CalculatorsWidget({he,dk}){
  const ac=dk?"#c8a96a":"#937640";
  const tm=dk?"#e8e0d0":"#2a2520";
  const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const isRtl=he;

  const[cat,setCat]=useState(0);
  const[calc,setCalc]=useState(null); // which calculator is open
  const[error,setError]=useState("");

  // Shared input state
  const[firstName,setFirstName]=useState("");
  const[lastName,setLastName]=useState("");
  const[dob,setDob]=useState("");
  const[addOne,setAddOne]=useState(false);
  const[results,setResults]=useState(null);
  const[animIn,setAnimIn]=useState(false);

  // Match inputs
  const[m1name,setM1name]=useState("");const[m1dob,setM1dob]=useState("");
  const[m2name,setM2name]=useState("");const[m2dob,setM2dob]=useState("");
  const[matchRes,setMatchRes]=useState(null);

  // Number library
  const[libNum,setLibNum]=useState(null);

  // Name generator
  const[genTarget,setGenTarget]=useState(1);

  const parseDob=(s)=>{const p=s.split(".");if(p.length!==3)return null;const[d,m,y]=p.map(Number);if(!d||!m||!y||d>31||m>12||y<1900)return null;return{d,m,y};};

  const labelSt={display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500};
  const thSt={padding:"10px 12px",fontSize:11,fontWeight:700,color:ac,textAlign:"center",borderBottom:`2px solid ${ac}22`};
  const tdSt={padding:"10px 12px",fontSize:14,fontWeight:500,color:tm,textAlign:"center",borderBottom:`1px solid ${ac}08`};
  const tdLb={...tdSt,fontWeight:600,color:ts,fontSize:12,textAlign:isRtl?"right":"left"};
  const tdVl={...tdSt,fontSize:19,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"};

  const categories=[
    {i:"chart",l:he?"נומרולוגיה אישית":"Personal Numerology"},
    {i:"heart",l:he?"התאמה":"Compatibility"},
    {i:"book",l:he?"משמעות מספרים":"Number Meanings"},
    {i:"cards",l:he?"קלפים":"Cards"},
    {i:"tools",l:he?"כלים":"Tools"},
  ];

  // ── PERSONAL CALC ──
  const doPersonalCalc=()=>{
    setError("");const d=parseDob(dob);
    if(!d||!firstName.trim()){setError(he?"מלא שם ותאריך לידה":"Enter name and date of birth");return;}
    AU.init();AU.p("reveal");
    const nm=(firstName+" "+lastName).trim();
    const r=fullCalc(d.d,d.m,d.y,nm,addOne);
    r.lpm=LPm(d.d,d.m,d.y); // master-aware LP
    setResults(r);setAnimIn(false);setTimeout(()=>setAnimIn(true),50);
  };

  // ── MATCH CALC ──
  const doMatchCalc=(type)=>{
    setError("");const d1=parseDob(m1dob),d2=parseDob(m2dob);
    if(!d1||!d2||!m1name.trim()||!m2name.trim()){setError(he?"מלא את כל השדות":"Fill all fields");return;}
    AU.init();AU.p("reveal");
    const lp1=LP(d1.d,d1.m,d1.y),lp2=LP(d2.d,d2.m,d2.y);
    const nv1=NV(m1name),nv2=NV(m2name),su1=SU(m1name),su2=SU(m2name),ex1=EX(m1name),ex2=EX(m2name);
    const lpm1=LPm(d1.d,d1.m,d1.y),lpm2=LPm(d2.d,d2.m,d2.y);
    let score=50;
    if(lp1===lp2)score+=20;else if(Math.abs(lp1-lp2)<=2)score+=15;else if(Math.abs(lp1-lp2)>=5)score-=5;
    if(su1===su2)score+=15;else if(Math.abs(su1-su2)<=1)score+=8;
    if(nv1===nv2)score+=10;
    const compPairs=[[1,2],[3,4],[5,6],[7,8],[1,9]];
    if(compPairs.some(p=>(p[0]===lp1&&p[1]===lp2)||(p[1]===lp1&&p[0]===lp2)))score+=12;
    if(type==="twin"&&lp1===lp2)score+=10;
    if(type==="twin"&&lpm1===lpm2&&[11,22,33].includes(lpm1))score+=8;
    if(type==="biz"){score-=5;if([4,8].includes(lp1)&&[4,8].includes(lp2))score+=15;if([1,8].includes(lp1)&&[1,8].includes(lp2))score+=10;}
    score=Math.max(20,Math.min(99,score));
    const k1=`${Math.min(lp1,lp2)}-${Math.max(lp1,lp2)}`;
    const compat=LP_COMPAT[k1]||null;
    setMatchRes({lp1,lp2,nv1,nv2,su1,su2,ex1,ex2,lpm1,lpm2,score,compat,type,
      harmony:Math.min(10,Math.round(score/10)),tension:Math.min(10,Math.round((100-score)/12)),growth:Math.min(10,Math.round(Math.abs(lp1-lp2)+Math.abs(su1-su2)/2+2))});
  };

  const resetCalc=()=>{setCalc(null);setResults(null);setMatchRes(null);setError("");setAnimIn(false);};

  // ── CARD: calculator tile ──
  const CalcTile=({icon,title,desc,onClick})=>(
    <div onClick={onClick} style={{padding:16,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.45)",border:`1px solid ${ac}0a`,borderRadius:16,cursor:"pointer",transition:"all .3s",textAlign:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor=ac+"44"} onMouseLeave={e=>e.currentTarget.style.borderColor=ac+"0a"}>
      <div style={{color:ac,marginBottom:8,display:"flex",justifyContent:"center"}}><Icon name={icon} size={24} stroke={1.3}/></div>
      <div style={{fontSize:13,fontWeight:600,color:ac,marginBottom:3}}>{title}</div>
      <div style={{fontSize:10,color:ts,lineHeight:1.5}}>{desc}</div>
    </div>
  );

  // ── BACK BUTTON ──
  const BackBtn=()=>(<button className="ghost" onClick={resetCalc} style={{marginBottom:14,fontSize:12,padding:"8px 16px"}}>← {he?"חזרה":"Back"}</button>);

  // ══════ RENDER ══════
  return(<div style={{animation:"fadeInUp .5s ease-out"}}>

    {/* Category tabs */}
    <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",padding:"2px 0"}}>
      {categories.map((c,i)=>(
        <div key={i} onClick={()=>{setCat(i);resetCalc();AU.init();AU.p("click");}} style={{flex:"0 0 auto",padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .3s",whiteSpace:"nowrap",background:cat===i?(dk?"rgba(200,169,106,.1)":"rgba(147,118,64,.06)"):"transparent",color:cat===i?ac:ts,border:`1px solid ${cat===i?ac+"33":"transparent"}`}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name={c.i} size={13}/>{c.l}</span></div>
      ))}
    </div>

    {error&&<div style={{padding:"10px 14px",background:"rgba(180,50,50,.12)",border:"1px solid rgba(180,50,50,.25)",borderRadius:10,color:"#e8a0a0",fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}

    {/* ═══════ CATEGORY 1: Personal Numerology ═══════ */}
    {cat===0&&!calc&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <CalcTile icon="chart" title={he?"כל המספרים שלי":"All My Numbers"} desc={he?"LP, גורל, נשמה, ביטוי ועוד":"LP, Destiny, Soul, Expression & more"} onClick={()=>setCalc("allnums")}/>
        <CalcTile icon="calendar" title={he?"נומרוסקופ יומי":"Daily Numeroscope"} desc={he?"אנרגיות יום/חודש/שנה":"Day/Month/Year energies"} onClick={()=>setCalc("daily")}/>
        <CalcTile icon="refresh" title={he?"מחזורי חיים":"Life Cycles"} desc={he?"פסגות, אתגרים, תקופות":"Peaks, Challenges, Periods"} onClick={()=>setCalc("cycles")}/>
        <CalcTile icon="chart" title={he?"Lo Shu Grid":"Lo Shu Grid"} desc={he?"רשת האיזון האנרגטי":"Energy balance grid"} onClick={()=>setCalc("loshu")}/>
        <CalcTile icon="bolt" title={he?"חובות קארמיים":"Karmic Debts"} desc={he?"מה הנשמה באה לתקן":"What the soul came to fix"} onClick={()=>setCalc("karma")}/>
        <CalcTile icon="trending" title={he?"מחזור שנים":"Year Cycle"} desc={he?"13 שנים קדימה":"13 years ahead"} onClick={()=>setCalc("yearcycle")}/>
      </div>
    )}

    {/* ── ALL NUMBERS CALC ── */}
    {cat===0&&calc==="allnums"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="chart" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"כל המספרים שלי":"All My Numbers"}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={labelSt}>{he?"שם פרטי":"First Name"}</label><input className="gi" value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}} placeholder={he?"שם פרטי...":"First name..."}/></div>
          <div><label style={labelSt}>{he?"שם משפחה":"Last Name"}</label><input className="gi" value={lastName} onChange={e=>setLastName(e.target.value)} dir="rtl" style={{textAlign:"right"}} placeholder={he?"שם משפחה...":"Last name..."}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:12}}>
          <div><label style={labelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3,fontFamily:"'Cormorant Garamond',serif"}} onKeyDown={e=>{if(e.key==="Enter")doPersonalCalc();}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none",paddingBottom:4,height:54,paddingTop:22}} onClick={()=>setAddOne(!addOne)}>
            <div style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${ac}44`,background:addOne?`${ac}1a`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>{addOne&&<span style={{color:ac,fontSize:12}}>✓</span>}</div>
            <span style={{fontSize:10,color:ts}}>{he?"הוסף 1":"Add 1"}</span>
          </div>
        </div>
        <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doPersonalCalc}>{he?"חשב מספרים":"Calculate Numbers"}</button>
      </div>

      {results&&animIn&&(<div style={{animation:"fadeInUp .6s ease-out"}}>
        {/* Master number alert */}
        {[11,22,33].includes(results.lpm)&&(<div className="gc" style={{marginBottom:14,padding:14,textAlign:"center",background:`${MASTER[results.lpm].c}08`,border:`1px solid ${MASTER[results.lpm].c}33`}}>
          <div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="bolt" size={20} stroke={1.3}/></div>
          <div style={{fontSize:16,fontWeight:700,color:MASTER[results.lpm].c,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מספר מאסטר":"Master Number"} {results.lpm} — {he?MASTER[results.lpm].t:MASTER[results.lpm].te}</div>
          <p style={{fontSize:12,color:ts,lineHeight:1.7,marginTop:6}}>{MASTER[results.lpm][he?"he":"en"]}</p>
        </div>)}

        {/* Core numbers */}
        <div className="gc" style={{marginBottom:14,padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px 8px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}>
            <h4 style={{fontSize:16,fontWeight:700,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"תוצאות כלליות":"General Results"}</h4>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(0,0,0,.015)"}}>
              <th style={{...thSt,textAlign:isRtl?"right":"left",paddingRight:isRtl?18:12,paddingLeft:isRtl?12:18}}>{he?"קטגוריה":"Category"}</th>
              <th style={thSt}>{he?"ערך":"Value"}</th>
              <th style={thSt}>{he?"ארכיטיפ":"Archetype"}</th>
            </tr></thead>
            <tbody>
              {[{l:he?"שביל הגורל":"Life Path",v:results.lp},{l:he?"ערך השם":"Name Value",v:results.nv},{l:he?"קול הנשמה":"Soul Urge",v:results.su},{l:he?"מספר הביטוי":"Expression",v:results.ex},{l:he?"שנה אישית":"Personal Year",v:results.py},{l:he?"שנה נסתרת":"Hidden Year",v:results.hy},{l:he?"חודש אישי":"Personal Month",v:results.pm},{l:he?"יום אישי":"Personal Day",v:results.pd},{l:he?"גיל נוכחי":"Current Age",v:results.age}].map((r,i)=>(
                <tr key={i} style={{background:i%2?(dk?"rgba(200,169,106,.015)":"rgba(0,0,0,.01)"):"transparent"}}>
                  <td style={{...tdLb,paddingRight:isRtl?18:12,paddingLeft:isRtl?12:18}}>{r.l}</td>
                  <td style={tdVl}>{r.v}</td>
                  <td style={{...tdSt,fontSize:11,color:D[r.v]?.c||ac,opacity:.8}}>{r.v>0&&r.v<=9?(he?D[r.v]?.t:D[r.v]?.te):""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual orbs */}
        <div className="gc" style={{marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[{l:he?"שביל":"Path",v:results.lp},{l:he?"נשמה":"Soul",v:results.su},{l:he?"ביטוי":"Expr.",v:results.ex},{l:he?"שם":"Name",v:results.nv},{l:he?"שנה":"Year",v:results.py},{l:he?"יום":"Day",v:results.pd}].map((it,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div className="orb" style={{margin:"0 auto 4px",width:48,height:48,fontSize:18,color:D[it.v]?.c||ac,borderColor:(D[it.v]?.c||ac)+"44"}}>{it.v}</div>
                <div style={{fontSize:9,color:ts}}>{it.l}</div>
                {it.v>0&&it.v<=9&&<div style={{fontSize:8,color:D[it.v]?.c||ac,opacity:.6}}>{he?D[it.v]?.t:D[it.v]?.te}</div>}
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:14,padding:12,background:`${ac}06`,borderRadius:12}}>
            <p style={{fontSize:13,lineHeight:1.9,color:ts,fontStyle:"italic"}}>{he?D[results.lp]?.narrative:D[results.lp]?.narrativeE}</p>
          </div>
        </div>
      </div>)}
    </div>)}

    {/* ── DAILY NUMEROSCOPE ── */}
    {cat===0&&calc==="daily"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="calendar" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"נומרוסקופ יומי":"Daily Numeroscope"}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={labelSt}>{he?"שם פרטי":"First Name"}</label><input className="gi" value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
          <div><label style={labelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}} onKeyDown={e=>{if(e.key==="Enter")doPersonalCalc();}}/></div>
        </div>
        <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doPersonalCalc}>{he?"חשב":"Calculate"}</button>
      </div>
      {results&&animIn&&(<div style={{animation:"fadeInUp .6s ease-out"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[{l:he?"יום":"Day",v:results.pd,desc:he?"האנרגיה של היום":"Today's energy"},{l:he?"חודש":"Month",v:results.pm,desc:he?"האנרגיה החודשית":"Monthly energy"},{l:he?"שנה":"Year",v:results.py,desc:he?"האנרגיה השנתית":"Yearly energy"}].map((it,i)=>(
            <div key={i} className="gc" style={{textAlign:"center",padding:16}}>
              <div style={{fontSize:9,color:ts,letterSpacing:1}}>{it.l}</div>
              <div style={{fontSize:36,fontWeight:700,color:D[it.v]?.c||ac,fontFamily:"'Cormorant Garamond',serif",margin:"4px 0"}}>{it.v}</div>
              <div style={{fontSize:12,fontWeight:600,color:D[it.v]?.c||ac}}>{he?D[it.v]?.t:D[it.v]?.te}</div>
              <div style={{fontSize:10,color:ts,marginTop:4}}>{it.desc}</div>
              <div style={{marginTop:8,padding:"8px",background:`${ac}06`,borderRadius:8}}><p style={{fontSize:11,lineHeight:1.7,color:ts}}>{YEAR_ENERGY[it.v]?.[he?"he":"en"]}</p></div>
            </div>
          ))}
        </div>
      </div>)}
    </div>)}

    {/* ── LIFE CYCLES ── */}
    {cat===0&&calc==="cycles"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="refresh" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"מחזורי חיים":"Life Cycles"}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={labelSt}>{he?"שם":"Name"}</label><input className="gi" value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
          <div><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}} onKeyDown={e=>{if(e.key==="Enter")doPersonalCalc();}}/></div>
        </div>
        <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doPersonalCalc}>{he?"חשב":"Calculate"}</button>
      </div>
      {results&&animIn&&(<div style={{animation:"fadeInUp .6s ease-out"}}>
        <div className="gc" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px 8px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:16,fontWeight:700,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"פסגות ואתגרים":"Peaks & Challenges"}</h4></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(0,0,0,.015)"}}>
              <th style={{...thSt,fontSize:10}}>{he?"מחזור":"Cycle"}</th><th style={{...thSt,fontSize:10}}>{he?"פסגה":"Peak"}</th><th style={{...thSt,fontSize:10}}>{he?"אתגר":"Chal."}</th><th style={{...thSt,fontSize:10}}>{he?"פ.נסתרת":"H.Peak"}</th><th style={{...thSt,fontSize:10}}>{he?"א.נסתר":"H.Chal."}</th>
            </tr></thead>
            <tbody>
              {(he?["חיפוש","מציאה","יתד","שיא"]:["Search","Discovery","Anchor","Summit"]).map((lb,i)=>{
                const sa=results.exit+i*9,active=results.age>=sa&&results.age<sa+9;
                return(<tr key={i} style={{background:active?(dk?"rgba(200,169,106,.06)":"rgba(200,169,106,.05)"):(i%2?"rgba(200,169,106,.015)":"transparent")}}>
                  <td style={{...tdSt,fontWeight:600,color:active?ac:ts,fontSize:11}}><div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>{active&&<span style={{width:5,height:5,borderRadius:3,background:ac,boxShadow:`0 0 6px ${ac}66`,display:"inline-block"}}/>}{lb}<span style={{fontSize:8,color:ts,opacity:.5,marginRight:2,marginLeft:2}}>{sa}-{sa+9}</span></div></td>
                  <td style={{...tdSt,fontSize:17,fontWeight:700,color:active?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{results.pk[i]}</td>
                  <td style={{...tdSt,fontSize:17,fontWeight:700,color:active?"#e88":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.ch[i]}</td>
                  <td style={{...tdSt,fontSize:17,fontWeight:700,color:active?`${ac}bb`:ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hp[i]}</td>
                  <td style={{...tdSt,fontSize:17,fontWeight:700,color:active?"#e88bb":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hc[i]}</td>
                </tr>);
              })}
            </tbody>
          </table></div>
        </div>
      </div>)}
    </div>)}

    {/* ── LO SHU ── */}
    {cat===0&&calc==="loshu"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="chart" size={26} stroke={1.3}/></div></div>
        <div style={{marginBottom:12}}><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}}/></div>
        <button className="gb" disabled={!dob.trim()} onClick={()=>{setError("");const d=parseDob(dob);if(!d){setError(he?"תאריך לא תקין":"Invalid date");return;}AU.init();AU.p("reveal");const ls=loShu(d.d,d.m,d.y);setResults({ls,lp:LP(d.d,d.m,d.y)});setAnimIn(false);setTimeout(()=>setAnimIn(true),50);}}>{he?"חשב":"Calculate"}</button>
      </div>
      {results&&animIn&&results.ls&&(<div style={{animation:"fadeInUp .6s ease-out"}}><div className="gc">
        <div style={{textAlign:"center",marginBottom:12}}><h4 style={{fontSize:16,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"}}>Lo Shu Grid</h4>{results.ls.miss.length>0&&<p style={{fontSize:11,color:ts,marginTop:4}}>{he?"חסרים: ":"Missing: "}{results.ls.miss.join(", ")}</p>}</div>
        <LoShu ls={results.ls} dk={dk} he={he}/>
      </div></div>)}
    </div>)}

    {/* ── KARMIC DEBTS ── */}
    {cat===0&&calc==="karma"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="bolt" size={26} stroke={1.3}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={labelSt}>{he?"שם":"Name"}</label><input className="gi" value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
          <div><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}}/></div>
        </div>
        <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doPersonalCalc}>{he?"חשב":"Calculate"}</button>
      </div>
      {results&&animIn&&(<div style={{animation:"fadeInUp .6s ease-out"}}><div className="gc">
        {results.kd?.length===0?(<div style={{textAlign:"center",padding:16,background:`${ac}06`,borderRadius:12}}><span style={{color:ac,display:"inline-flex"}}><Icon name="dove" size={20}/></span><div style={{fontSize:14,color:ts,marginTop:6}}>{he?"אין חוב קארמי — הנשמה שלך נקייה!":"No karmic debt — your soul is clear!"}</div></div>):(
          <div>{results.kd?.map(k=>(<div key={k} style={{padding:14,background:"rgba(180,50,50,.05)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24,fontWeight:700,color:"#e88",fontFamily:"'Cormorant Garamond',serif",flexShrink:0}}>{k}</span>
            <span style={{fontSize:12,lineHeight:1.8,color:ts}}>{KARMA[k]?.[he?"he":"en"]}</span>
          </div>))}</div>
        )}
      </div></div>)}
    </div>)}

    {/* ── YEAR CYCLE ── */}
    {cat===0&&calc==="yearcycle"&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="trending" size={26} stroke={1.3}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end",marginBottom:12}}>
          <div><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none",paddingBottom:4,height:54,paddingTop:22}} onClick={()=>setAddOne(!addOne)}>
            <div style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${ac}44`,background:addOne?`${ac}1a`:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{addOne&&<span style={{color:ac,fontSize:12}}>✓</span>}</div>
            <span style={{fontSize:10,color:ts}}>{he?"הוסף 1":"Add 1"}</span>
          </div>
        </div>
        <button className="gb" disabled={!dob.trim()} onClick={()=>{setError("");const d=parseDob(dob);if(!d){setError(he?"תאריך לא תקין":"Invalid date");return;}AU.init();AU.p("reveal");const cy=new Date().getFullYear();const proj=[];for(let i=-2;i<=10;i++){const yr=cy+i;proj.push({year:yr,py:PY(d.d,d.m,yr,addOne),isCurrent:yr===cy});}setResults({proj});setAnimIn(false);setTimeout(()=>setAnimIn(true),50);}}>{he?"חשב":"Calculate"}</button>
      </div>
      {results&&animIn&&results.proj&&(<div style={{animation:"fadeInUp .6s ease-out"}}><div className="gc" style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 18px 8px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}><h4 style={{fontSize:16,fontWeight:700,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מחזור שנים אישי":"Personal Year Cycle"}</h4></div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(0,0,0,.015)"}}><th style={thSt}>{he?"שנה":"Year"}</th><th style={thSt}>{he?"שנה אישית":"P.Y."}</th><th style={thSt}>{he?"אנרגיה":"Energy"}</th></tr></thead>
          <tbody>{results.proj.map((p,i)=>(
            <tr key={i} style={{background:p.isCurrent?(dk?"rgba(200,169,106,.06)":"rgba(200,169,106,.05)"):(i%2?"rgba(200,169,106,.015)":"transparent")}}>
              <td style={{...tdSt,fontWeight:p.isCurrent?700:400,color:p.isCurrent?ac:ts,fontSize:12}}>{p.year}{p.isCurrent&&<span style={{fontSize:8,color:ac,marginRight:3,marginLeft:3}}>◀</span>}</td>
              <td style={{...tdSt,fontSize:18,fontWeight:700,color:p.isCurrent?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{p.py}</td>
              <td style={{...tdSt,fontSize:11,color:p.isCurrent?ac:ts}}>{he?D[p.py]?.t:D[p.py]?.te}</td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>)}
    </div>)}

    {/* ═══════ CATEGORY 2: Compatibility ═══════ */}
    {cat===1&&!calc&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <CalcTile icon="heart" title={he?"התאמה זוגית":"Love Match"} desc={he?"שבילי גורל + נשמה + ביטוי":"Life paths + soul + expression"} onClick={()=>setCalc("love")}/>
        <CalcTile icon="flame" title={he?"להבה תאומה":"Twin Flame"} desc={he?"חיבור נשמתי עמוק":"Deep soul connection"} onClick={()=>setCalc("twin")}/>
        <CalcTile icon="briefcase" title={he?"שותפות עסקית":"Business Match"} desc={he?"התאמה מקצועית":"Professional compatibility"} onClick={()=>setCalc("biz")}/>
        <CalcTile icon="users" title={he?"הורה-ילד":"Parent-Child"} desc={he?"החיבור הנשמתי":"The soul connection"} onClick={()=>setCalc("parent")}/>
      </div>
    )}

    {/* ── MATCH CALCULATORS (love/twin/biz/parent) ── */}
    {cat===1&&calc&&(<div>
      <BackBtn/>
      <div className="gc" style={{marginBottom:16}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name={calc==="love"?"heart":calc==="twin"?"flame":calc==="biz"?"briefcase":"users"} size={26} stroke={1.3}/></div>
          <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>
            {calc==="love"?(he?"התאמה זוגית":"Love Compatibility"):calc==="twin"?(he?"להבה תאומה":"Twin Flame"):calc==="biz"?(he?"שותפות עסקית":"Business Match"):(he?"הורה-ילד":"Parent-Child")}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{padding:14,background:dk?"rgba(18,18,38,.3)":"rgba(255,255,255,.3)",border:`1px solid ${ac}0a`,borderRadius:14}}>
            <div style={{textAlign:"center",fontSize:11,fontWeight:600,color:ac,marginBottom:8}}>{calc==="parent"?(he?"הורה":"Parent"):(he?"צד א":"Person A")}</div>
            <div style={{marginBottom:8}}><label style={labelSt}>{he?"שם":"Name"}</label><input className="gi" value={m1name} onChange={e=>setM1name(e.target.value)} dir="rtl" style={{textAlign:"right"}} placeholder={he?"שם בעברית...":"Name..."}/></div>
            <div><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={m1dob} onChange={e=>setM1dob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}}/></div>
          </div>
          <div style={{padding:14,background:dk?"rgba(18,18,38,.3)":"rgba(255,255,255,.3)",border:`1px solid ${ac}0a`,borderRadius:14}}>
            <div style={{textAlign:"center",fontSize:11,fontWeight:600,color:ac,marginBottom:8}}>{calc==="parent"?(he?"ילד/ה":"Child"):(he?"צד ב":"Person B")}</div>
            <div style={{marginBottom:8}}><label style={labelSt}>{he?"שם":"Name"}</label><input className="gi" value={m2name} onChange={e=>setM2name(e.target.value)} dir="rtl" style={{textAlign:"right"}} placeholder={he?"שם בעברית...":"Name..."}/></div>
            <div><label style={labelSt}>{he?"תאריך לידה":"DOB"}</label><input className="gi" value={m2dob} onChange={e=>setM2dob(e.target.value)} dir="ltr" placeholder="dd.mm.yyyy" style={{textAlign:"center",letterSpacing:3}}/></div>
          </div>
        </div>
        <button className="gb" disabled={!m1name.trim()||!m2name.trim()||!m1dob.trim()||!m2dob.trim()} onClick={()=>doMatchCalc(calc)}>{he?"חשב התאמה":"Check Match"}</button>
      </div>

      {matchRes&&(<div style={{animation:"fadeInUp .7s ease-out"}}>
        <div className="gc">
          {/* Score ring */}
          <div style={{position:"relative",width:130,height:130,margin:"0 auto 14px"}}><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="57" fill="none" stroke={`${ac}10`} strokeWidth="5"/><circle cx="65" cy="65" r="57" fill="none" stroke={matchRes.score>=75?"#4ECDC4":matchRes.score>=50?ac:"#E67E22"} strokeWidth="5" strokeDasharray={`${matchRes.score*114*Math.PI/100} ${114*Math.PI}`} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"stroke-dasharray 1.5s ease"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:30,fontWeight:700,color:ac}}>{matchRes.score}%</span><span style={{fontSize:9,color:ts}}>{he?"התאמה":"Match"}</span></div></div>

          {/* LP comparison */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:14,alignItems:"center"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:ts}}>{m1name.split(" ")[0]}</div><div style={{fontSize:26,fontWeight:700,color:D[matchRes.lp1]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{matchRes.lp1}</div><div style={{fontSize:10,color:D[matchRes.lp1]?.c||ac,opacity:.7}}>{he?D[matchRes.lp1]?.t:D[matchRes.lp1]?.te}</div></div>
            <div style={{fontSize:18,color:`${ac}66`,display:"flex",justifyContent:"center"}}>{calc==="parent"?<Icon name="heart" size={16}/>:"⟷"}</div>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:ts}}>{m2name.split(" ")[0]}</div><div style={{fontSize:26,fontWeight:700,color:D[matchRes.lp2]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{matchRes.lp2}</div><div style={{fontSize:10,color:D[matchRes.lp2]?.c||ac,opacity:.7}}>{he?D[matchRes.lp2]?.t:D[matchRes.lp2]?.te}</div></div>
          </div>

          {/* Twin flame badge */}
          {calc==="twin"&&matchRes.lpm1===matchRes.lpm2&&[11,22,33].includes(matchRes.lpm1)&&(<div style={{textAlign:"center",padding:12,background:`${MASTER[matchRes.lpm1].c}08`,border:`1px solid ${MASTER[matchRes.lpm1].c}33`,borderRadius:12,marginBottom:12}}><div style={{color:MASTER[matchRes.lpm1].c,display:"flex",justifyContent:"center",marginBottom:4}}><Icon name="flame" size={18}/></div><div style={{fontSize:13,fontWeight:700,color:MASTER[matchRes.lpm1].c}}>{he?"מספר מאסטר משותף!":"Shared Master Number!"} {matchRes.lpm1}</div></div>)}

          {/* Bars */}
          {[{l:he?"הרמוניה":"Harmony",v:matchRes.harmony,c:"#4ECDC4"},{l:he?"מתח":"Tension",v:matchRes.tension,c:"#E74C3C"},{l:he?"צמיחה":"Growth",v:matchRes.growth,c:"#FFD700"}].map((it,i)=>(
            <div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:ts}}>{it.l}</span><span style={{fontSize:11,fontWeight:700,color:it.c}}>{it.v}/10</span></div><div style={{height:5,background:dk?"rgba(20,20,40,.4)":"rgba(0,0,0,.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${it.v*10}%`,background:it.c,borderRadius:3,transition:"width 1.5s ease"}}/></div></div>
          ))}

          {/* Connection & Challenges */}
          {matchRes.compat&&(<div style={{marginTop:14}}>
            <div style={{padding:12,background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:12,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{color:"#4ECDC4",display:"inline-flex"}}><Icon name="heart" size={14}/></span><span style={{fontSize:12,fontWeight:600,color:"#4ECDC4"}}>{he?"מה מחבר":"Connection"}</span></div>
              <p style={{fontSize:12,lineHeight:1.8,color:ts}}>{matchRes.compat[he?"he":"en"].con}</p>
            </div>
            <div style={{padding:12,background:"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{color:"#E74C3C",display:"inline-flex"}}><Icon name="bolt" size={14}/></span><span style={{fontSize:12,fontWeight:600,color:"#E74C3C"}}>{he?"אתגרים":"Challenges"}</span></div>
              <p style={{fontSize:12,lineHeight:1.8,color:ts}}>{matchRes.compat[he?"he":"en"].ch}</p>
            </div>
            <div style={{padding:12,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}15`,borderRadius:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{color:ac,display:"inline-flex"}}><Icon name="bulb" size={14}/></span><span style={{fontSize:12,fontWeight:600,color:ac}}>{he?"עצה":"Advice"}</span></div>
              <p style={{fontSize:12,lineHeight:1.8,color:ts}}>{matchRes.compat[he?"he":"en"].tip}</p>
            </div>
          </div>)}

          {/* Numbers table */}
          <div style={{marginTop:14,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(0,0,0,.015)"}}><th style={{...thSt,fontSize:10}}></th><th style={{...thSt,fontSize:10}}>{m1name.split(" ")[0]}</th><th style={{...thSt,fontSize:10}}>{m2name.split(" ")[0]}</th></tr></thead><tbody>
            {[{l:he?"שביל":"Path",a:matchRes.lp1,b:matchRes.lp2},{l:he?"שם":"Name",a:matchRes.nv1,b:matchRes.nv2},{l:he?"נשמה":"Soul",a:matchRes.su1,b:matchRes.su2},{l:he?"ביטוי":"Expr.",a:matchRes.ex1,b:matchRes.ex2}].map((r,i)=>(
              <tr key={i} style={{borderBottom:`1px solid ${ac}08`}}><td style={{...tdSt,fontSize:11,color:ts,fontWeight:600}}>{r.l}</td><td style={{...tdSt,fontSize:17,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"}}>{r.a}</td><td style={{...tdSt,fontSize:17,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"}}>{r.b}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      </div>)}
    </div>)}

    {/* ═══════ CATEGORY 3: Number Meanings ═══════ */}
    {cat===2&&(<div>
      <div className="gc">
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="book" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"ספריית המספרים":"Number Library"}</div></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[1,2,3,4,5,6,7,8,9].map(n=>(
            <div key={n} onClick={()=>{setLibNum(libNum===n?null:n);AU.init();AU.p("click");}} style={{textAlign:"center",padding:"14px 6px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${libNum===n?(D[n]?.c||ac)+"66":ac+"0a"}`,background:libNum===n?`${D[n]?.c||ac}0a`:"transparent",transition:"all .3s"}}>
              <div style={{fontSize:24,fontWeight:700,color:D[n]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{n}</div>
              <div style={{fontSize:9,color:D[n]?.c||ac,opacity:.7}}>{he?D[n]?.t:D[n]?.te}</div>
            </div>
          ))}
        </div>
        {/* Master numbers */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[11,22,33].map(n=>(
            <div key={n} onClick={()=>{setLibNum(libNum===n?null:n);AU.init();AU.p("click");}} style={{textAlign:"center",padding:"12px 6px",borderRadius:12,cursor:"pointer",border:`1.5px solid ${libNum===n?(MASTER[n]?.c||ac)+"66":ac+"0a"}`,background:libNum===n?`${MASTER[n]?.c||ac}0a`:"transparent",transition:"all .3s"}}>
              <div style={{fontSize:9,color:MASTER[n]?.c,letterSpacing:1}}>{he?"מאסטר":"MASTER"}</div>
              <div style={{fontSize:22,fontWeight:700,color:MASTER[n]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{n}</div>
              <div style={{fontSize:9,color:MASTER[n]?.c||ac,opacity:.7}}>{he?MASTER[n]?.t:MASTER[n]?.te}</div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {libNum&&NUM_LIB[libNum]&&(<div style={{animation:"fadeInUp .4s ease-out",padding:16,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${(libNum<=9?D[libNum]?.c:MASTER[libNum]?.c)||ac}22`,borderRadius:14}}>
          <div style={{textAlign:"center",marginBottom:10}}>
            <span style={{color:ac,display:"inline-flex"}}><Icon name={NUM_LIB[libNum].icon} size={26}/></span>
            <div style={{fontSize:28,fontWeight:700,color:(libNum<=9?D[libNum]?.c:MASTER[libNum]?.c)||ac,fontFamily:"'Cormorant Garamond',serif"}}>{libNum}</div>
            <div style={{fontSize:12,fontWeight:600,color:(libNum<=9?D[libNum]?.c:MASTER[libNum]?.c)||ac}}>{libNum<=9?(he?D[libNum]?.t:D[libNum]?.te):(he?MASTER[libNum]?.t:MASTER[libNum]?.te)}</div>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:ac,marginBottom:6}}>{NUM_LIB[libNum][he?"he":"en"].k}</div>
          <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{NUM_LIB[libNum][he?"he":"en"].p}</p>
          {libNum<=9&&(<div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{i:"gem",l:he?"אבן":"Stone",v:D[libNum]?.stone},{i:"palette",l:he?"צבע":"Color",v:D[libNum]?.color},{i:"flame",l:he?"יסוד":"Element",v:D[libNum]?.el},{i:"briefcase",l:he?"קריירה":"Career",v:D[libNum]?.career}].map((it,i)=>(
              <div key={i} style={{padding:8,background:`${ac}05`,borderRadius:8,textAlign:"center"}}><span style={{color:ac,display:"inline-flex"}}><Icon name={it.i} size={14}/></span><div style={{fontSize:9,color:ts}}>{it.l}</div><div style={{fontSize:11,fontWeight:600,color:ac}}>{it.v}</div></div>
            ))}
          </div>)}
        </div>)}
      </div>
    </div>)}

    {/* ═══════ CATEGORY 4: Cards ═══════ */}
    {cat===3&&(<div>
      <div className="gc" style={{marginBottom:14}}>
        <div style={{textAlign:"center",marginBottom:14}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="cards" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"קלפי נומרולוגיה":"Numerology Cards"}</div><p style={{fontSize:11,color:ts,marginTop:4}}>{he?"לחץ על קלף להפיכה":"Tap a card to flip"}</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,justifyItems:"center"}}>
          {[1,2,3,4,5,6,7,8,9].map(n=><TarotCard key={n} number={n} dk={dk}/>)}
        </div>
      </div>
    </div>)}

    {/* ═══════ CATEGORY 5: Tools ═══════ */}
    {cat===4&&!calc&&(
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <CalcTile icon="sparkle" title={he?"מחולל שמות":"Name Generator"} desc={he?"שמות לפי מספר נומרולוגי":"Names by numerology number"} onClick={()=>setCalc("namegen")}/>
        <CalcTile icon="share" title={he?"ייצוא תוצאות":"Export Results"} desc={he?"שמור את הקריאה שלך":"Save your reading"} onClick={()=>setCalc("export")}/>
      </div>
    )}

    {/* ── NAME GENERATOR ── */}
    {cat===4&&calc==="namegen"&&(<div>
      <BackBtn/>
      <div className="gc">
        <div style={{textAlign:"center",marginBottom:16}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="sparkle" size={26} stroke={1.3}/></div><div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3,marginTop:4}}>{he?"מחולל שמות":"Name Generator"}</div></div>
        <div style={{marginBottom:14}}>
          <label style={labelSt}>{he?"בחר מספר יעד":"Choose target number"}</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:4}}>
            {[1,2,3,4,5,6,7,8,9].map(n=>(
              <div key={n} onClick={()=>{setGenTarget(n);AU.init();AU.p("click");}} style={{textAlign:"center",padding:"10px 4px",borderRadius:10,cursor:"pointer",border:`1.5px solid ${genTarget===n?(D[n]?.c||ac)+"66":"transparent"}`,background:genTarget===n?`${D[n]?.c||ac}0a`:"transparent",transition:"all .3s"}}>
                <div style={{fontSize:18,fontWeight:700,color:genTarget===n?(D[n]?.c||ac):`${ac}55`,fontFamily:"'Cormorant Garamond',serif"}}>{n}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:16,background:dk?"rgba(18,18,38,.3)":"rgba(255,255,255,.3)",borderRadius:14,border:`1px solid ${ac}0a`}}>
          <div style={{textAlign:"center",marginBottom:10}}><div style={{fontSize:14,fontWeight:600,color:D[genTarget]?.c||ac}}>{he?D[genTarget]?.t:D[genTarget]?.te} — {genTarget}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {genNames(genTarget,he).map((name,i)=>(
              <div key={i} style={{textAlign:"center",padding:"12px",background:`${ac}06`,borderRadius:10}}>
                <div style={{fontSize:16,fontWeight:600,color:ac}}>{name}</div>
                <div style={{fontSize:10,color:ts}}>{he?"ערך: ":"Value: "}{NV(name)}</div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:10}}><p style={{fontSize:10,color:ts,fontStyle:"italic"}}>{he?"שמות אלה מותאמים לאנרגיה של מספר "+genTarget:"These names are aligned with the energy of number "+genTarget}</p></div>
        </div>
      </div>
    </div>)}

    {/* ── EXPORT ── */}
    {cat===4&&calc==="export"&&(<div>
      <BackBtn/>
      <div className="gc" style={{textAlign:"center"}}>
        <div style={{color:ac,marginBottom:10,display:"flex",justifyContent:"center"}}><Icon name="share" size={26} stroke={1.3}/></div>
        <p style={{fontSize:13,color:ts,lineHeight:1.8,marginBottom:16}}>{he?"כדי לייצא תוצאות, ערוך קריאה בטאב הקריאה ולחץ על ״שמור דו״ח״ בסוף הקריאה.":"To export results, run a reading in the Reading tab and click 'Save Report' at the end."}</p>
        <div style={{color:ac,opacity:.18,margin:"20px 0",display:"flex",justifyContent:"center"}}><Icon name="doc" size={40} stroke={1.2}/></div>
      </div>
    </div>)}

  </div>);
}

// ═══════════════════ SHOP / CHECKOUT CONFIG ═══════════════════
// ┌─────────────────────────────────────────────────────────────┐
// │  הגדרת מערכת הסליקה — Grow / משולם                          │
// │  1. עדכן WHATSAPP_PHONE למספר שלך (פורמט: 9725XXXXXXXX)      │
// │  2. ב-Grow (grow.business) ← "עמודי תשלום" צור עמוד תשלום     │
// │     לכל מוצר (שם, מחיר, חשבונית מס אוטומטית).                 │
// │  3. הדבק את הלינק של כל עמוד בשדה link של המוצר למטה.         │
// │  • כפתור "שלם עכשיו" → ישר לעמוד הסליקה של המוצר.            │
// │  • "הוסף לעגלה" + "סיום הזמנה" → שולח הזמנה מרוכזת בוואטסאפ   │
// │     ואז שולחים ללקוח לינק תשלום אחד / בקשת Bit.              │
// └─────────────────────────────────────────────────────────────┘
const WHATSAPP_PHONE = "972547640203"; // שני כהן אזולאי — 054-764-0203
const CONTACT_URL = `https://wa.me/${WHATSAPP_PHONE}`;
const BUSINESS_EMAIL = "shani@example.com"; // 👈 החליפי לאימייל שלך
const OWNER_STORE_KEY = "numerology_owner_mode";
const CART_STORE_KEY = "numerology_cart_v1";

// Photographic backdrops (Unsplash CDN, hotlink-allowed). Swap freely with your own photos.
const U = (id, w) => `https://images.unsplash.com/photo-${id}?w=${w}&q=68&auto=format&fit=crop`;
const IMG = {
  hero: U("1462331940025-496dfbfc7564", 1600),
  heroAlt: U("1419242902214-272b3f66ee7a", 1600),
  "full-map": U("1470071459604-3b5ec3a7fe05", 800),
  "year-forecast": U("1532693322450-2cb5c511067d", 800),
  couple: U("1483347756197-71ef80e95f73", 800),
  name: U("1543722530-d2c3201371e7", 800),
  "intro-call": U("1419242902214-272b3f66ee7a", 800),
  "deep-consult": U("1502134249126-9f3755a50d78", 800),
  mentoring: U("1444703686981-a3abbc4d4fe3", 800),
  gift: U("1462331940025-496dfbfc7564", 800),
  "monthly-insight": U("1483347756197-71ef80e95f73", 800),
  bundle: U("1543722530-d2c3201371e7", 800),
  vip: U("1419242902214-272b3f66ee7a", 800),
  band: U("1444703686981-a3abbc4d4fe3", 1600),
};

const SHOP = [
  {
    cat: { he: "חבילות משתלמות", en: "Value Bundles" },
    sub: { he: "המסלול המלא במחיר מיוחד", en: "The full path at a special price" },
    items: [
      { id:"bundle", icon:"sparkles", featured:true, badge:{he:"חיסכון ₪99",en:"Save ₪99"}, priceNum:449,
        name:{he:"חבילת המסע המלא — מפה + שיחה מעמיקה",en:"Full Journey — Map + Deep Call"},
        desc:{he:"מפה נומרולוגית אישית מלאה + ייעוץ מעמיק 75 דק׳ עם שני. הדרך השלמה להבין את עצמך ולקבל כיוון. (₪498 בנפרד)",en:"Full personal map + 75-min deep consultation with Shani. (₪498 separately)"},
        price:{he:"₪449",en:"$135"}, link:"" },
      { id:"vip", icon:"crown", featured:true, badge:{he:"פרימיום",en:"Premium"}, priceNum:1290,
        name:{he:"קריאת עומק מלאה — חבילת VIP",en:"Full Depth Reading — VIP"},
        desc:{he:"החבילה המקיפה ביותר: מפה אישית מלאה + תחזית שנתית + שיחת עומק 90 דק׳ + דוח PDF מורחב + חודש ליווי אישי בוואטסאפ. הכול במקום אחד.",en:"The most comprehensive package: full personal map + yearly forecast + 90-min deep call + extended PDF + a month of personal WhatsApp guidance."},
        price:{he:"₪1,290",en:"$390"}, link:"" },
    ],
  },
  {
    cat: { he: "מפות ודוחות דיגיטליים", en: "Digital Maps & Reports" },
    sub: { he: "נשלח אליך כ-PDF מעוצב תוך 48 שעות", en: "Delivered as a designed PDF within 48h" },
    items: [
      { id:"full-map", icon:"map", featured:true, badge:{he:"הכי נמכר",en:"Best seller"}, priceNum:149,
        name:{he:"מפה נומרולוגית אישית מלאה",en:"Full Personal Numerology Map"},
        desc:{he:"ניתוח מעמיק של כל המספרים שלך — שביל גורל, נשמה, ביטוי, חובות קארמיים, מחזורי חיים ומפת לו-שו, עם פרשנות אישית כתובה.",en:"In-depth analysis of all your numbers — life path, soul, expression, karmic debts, life cycles and Lo Shu, with written personal interpretation."},
        price:{he:"₪149",en:"$45"}, link:"" },
      { id:"year-forecast", icon:"orb", priceNum:99,
        name:{he:"תחזית שנתית אישית (12 חודשים)",en:"Personal Year Forecast (12 months)"},
        desc:{he:"מה צופן לך השנה — חודש-חודש: הזדמנויות, אתגרים ותזמון נכון לצעדים גדולים.",en:"What this year holds — month by month: opportunities, challenges and right timing for big moves."},
        price:{he:"₪99",en:"$29"}, link:"" },
      { id:"couple", icon:"heart", priceNum:129,
        name:{he:"דוח התאמה זוגית",en:"Couple Compatibility Report"},
        desc:{he:"ניתוח דינמיקה בין שני אנשים — נקודות חוזק, אתגרים וטיפים מעשיים לזוגיות.",en:"Dynamic analysis between two people — strengths, challenges and practical relationship tips."},
        price:{he:"₪129",en:"$39"}, link:"" },
      { id:"name", icon:"pen", priceNum:179,
        name:{he:"נומרולוגיה לבחירת שם",en:"Name Selection Numerology"},
        desc:{he:"בחירת/תיקון שם לתינוק, לעסק או למותג — כדי שהאנרגיה של השם תתמוך ביעד שלך.",en:"Choosing/correcting a name for a baby, business or brand — so the name's energy supports your goal."},
        price:{he:"₪179",en:"$54"}, link:"" },
    ],
  },
  {
    cat: { he: "שיחות וייעוץ אישי איתי", en: "1-on-1 Calls & Consulting" },
    sub: { he: "פגישת זום / טלפון — תיאום אחרי הרכישה", en: "Zoom / phone — scheduled after purchase" },
    items: [
      { id:"intro-call", icon:"phone", priceNum:149,
        name:{he:"שיחת אבחון 1:1 (30 דק׳)",en:"Diagnostic Call 1:1 (30 min)"},
        desc:{he:"שיחה ממוקדת על השאלה הכי בוערת שלך כרגע — תשובה נומרולוגית ברורה וכיוון לפעולה.",en:"A focused call on your most pressing question — a clear numerological answer and direction."},
        price:{he:"₪149",en:"$45"}, link:"" },
      { id:"deep-consult", icon:"star", featured:true, badge:{he:"מומלץ",en:"Recommended"}, priceNum:349,
        name:{he:"ייעוץ נומרולוגי מעמיק (75 דק׳)",en:"Deep Numerology Consultation (75 min)"},
        desc:{he:"צלילה מלאה למפה שלך — מטרת חיים, יחסים, קריירה ותזמון. כולל מפה אישית מלאה והקלטה.",en:"A full dive into your map — life purpose, relationships, career and timing. Includes the full map + recording."},
        price:{he:"₪349",en:"$99"}, link:"" },
      { id:"mentoring", icon:"compass", priceNum:690,
        name:{he:"ליווי חודשי (4 שיחות)",en:"Monthly Mentoring (4 sessions)"},
        desc:{he:"ליווי צמוד לאורך חודש — 4 שיחות + זמינות בוואטסאפ לשאלות בין הפגישות.",en:"Close guidance over a month — 4 sessions + WhatsApp availability between meetings."},
        price:{he:"₪690",en:"$199"}, link:"" },
    ],
  },
  {
    cat: { he: "מתנות ומנויים", en: "Gifts & Subscriptions" },
    sub: { he: "", en: "" },
    items: [
      { id:"gift", icon:"gift", priceNum:149,
        name:{he:"שובר מתנה — מפה אישית",en:"Gift Voucher — Personal Map"},
        desc:{he:"מתנה מקורית ומרגשת. השובר נשלח אליך/למקבל/ת עם הוראות מימוש.",en:"A meaningful, original gift. The voucher is sent with redemption instructions."},
        price:{he:"₪149",en:"$45"}, link:"" },
      { id:"monthly-insight", icon:"mail", priceNum:29, recurring:true,
        name:{he:"מנוי תובנה חודשית",en:"Monthly Insight Subscription"},
        desc:{he:"דוח נומרולוגי קצר ומותאם אישית בכל ראש חודש, ישירות למייל. ביטול בכל עת.",en:"A short, personalized numerology report each month, straight to your inbox. Cancel anytime."},
        price:{he:"₪29 / חודש",en:"$9 / mo"}, link:"" },
    ],
  },
];

// ── checkout + cart helpers ──
const allProducts = () => SHOP.flatMap((g) => g.items);
const findProduct = (id) => allProducts().find((p) => p.id === id);
const productLink = (p) => (p && p.link && p.link.trim() && p.link.trim() !== "#") ? p.link.trim() : CONTACT_URL;
const goToCheckout = (p) => { AU.init(); AU.p("reveal"); window.open(productLink(p), "_blank", "noopener,noreferrer"); };
const cartEntries = (cart) => Object.entries(cart || {}).filter(([, q]) => q > 0).map(([id, qty]) => ({ product: findProduct(id), qty })).filter((x) => x.product);
const cartCount = (cart) => Object.values(cart || {}).reduce((a, q) => a + (q > 0 ? q : 0), 0);
const cartTotal = (cart) => cartEntries(cart).reduce((a, { product, qty }) => a + (product.priceNum || 0) * qty, 0);
function waOrderLink(cart, he) {
  const entries = cartEntries(cart);
  const lines = entries.map(({ product, qty }) => `• ${product.name[he ? "he" : "en"]} ×${qty} — ${product.price[he ? "he" : "en"]}`);
  const total = cartTotal(cart);
  const hasRecurring = entries.some(({ product }) => product.recurring);
  const head = he ? "היי! אני רוצה להזמין:" : "Hi! I'd like to order:";
  const tot = he ? `סה"כ: ₪${total}${hasRecurring ? " (+ מנוי חודשי)" : ""}` : `Total: ₪${total}${hasRecurring ? " (+ monthly)" : ""}`;
  const msg = `${head}\n${lines.join("\n")}\n\n${tot}`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
}

// ═══════════════════ LANDING: HERO ═══════════════════
function NumWheel({ ac, size = 520 }) {
  const c = size / 2, r1 = size * 0.46, r2 = size * 0.36, r3 = size * 0.25;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={c} r={r1} stroke={ac} strokeWidth="1"/>
      <circle cx={c} cy={c} r={r2} stroke={ac} strokeWidth=".6"/>
      <circle cx={c} cy={c} r={r3} stroke={ac} strokeWidth=".4"/>
      {Array.from({ length: 36 }, (_, i) => { const a = (Math.PI * 2 / 36) * i; return <line key={i} x1={c + r2 * Math.cos(a)} y1={c + r2 * Math.sin(a)} x2={c + r1 * Math.cos(a)} y2={c + r1 * Math.sin(a)} stroke={ac} strokeWidth={i % 9 === 0 ? "1.4" : ".4"}/>; })}
      {Array.from({ length: 9 }, (_, i) => { const a = (Math.PI * 2 / 9) * i - Math.PI / 2; const rr = (r2 + r3) / 2; return <text key={i} x={c + rr * Math.cos(a)} y={c + rr * Math.sin(a) + 7} textAnchor="middle" fontSize={size * 0.045} fill={ac} fontFamily="'Cormorant Garamond',serif">{i + 1}</text>; })}
    </svg>
  );
}

function Hero({ he, dk, onStart, onShop, onUseName, onReveal }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.62)" : "rgba(42,37,32,.6)";
  const [nm, setNm] = useState("");
  const [dob, setDob] = useState("");
  const num = nm.trim() ? liveNum(nm) : 0;
  const dP = dob.split(".");
  const dValid = dP.length === 3 && +dP[0] > 0 && +dP[0] <= 31 && +dP[1] > 0 && +dP[1] <= 12 && +dP[2] >= 1900;
  const lp = dValid ? LPm(+dP[0], +dP[1], +dP[2]) : 0;
  const bothReady = nm.trim() && dValid;
  const inputSt = { flex: 1, minWidth: 0, background: dk ? "rgba(8,8,18,.6)" : "rgba(255,255,255,.8)", border: `1px solid ${ac}33`, borderRadius: 12, padding: "12px 14px", color: tm, fontSize: 16, fontFamily: "inherit", outline: "none" };
  const circleSt = (v) => ({ width: 64, height: 64, flexShrink: 0, borderRadius: "50%", border: `1.5px solid ${ac}55`, display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 35% 30%,${ac}26,transparent 70%)`, boxShadow: v ? `0 0 24px ${ac}55` : "none", transition: "box-shadow .5s" });
  const numSt = { fontSize: 28, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 };
  const lblSt = { fontSize: 8.5, color: ts, textTransform: "uppercase", letterSpacing: 1, marginTop: 3 };
  const floats = [{ n: 7, x: "8%", y: "18%", s: 64, d: 0 }, { n: 3, x: "84%", y: "24%", s: 52, d: 1.2 }, { n: 9, x: "16%", y: "74%", s: 58, d: 2.1 }, { n: 1, x: "82%", y: "72%", s: 46, d: .6 }, { n: 5, x: "50%", y: "10%", s: 40, d: 1.7 }];
  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 26, minHeight: "86vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "70px 18px 56px", boxShadow: dk ? "0 30px 80px rgba(0,0,0,.45)" : "0 30px 80px rgba(0,0,0,.12)" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img src={IMG.hero} alt="" loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: dk ? .6 : .42, transform: "scale(1.05)" }}/>
        <div style={{ position: "absolute", inset: 0, background: dk ? "radial-gradient(ellipse at center,rgba(8,8,20,.25),rgba(8,8,18,.82) 80%)" : "radial-gradient(ellipse at center,rgba(245,240,232,.45),rgba(245,240,232,.92) 80%)" }}/>
      </div>
      <Parallax speed={0.16} style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: "min(560px,120vw)", height: "min(560px,120vw)", color: ac, opacity: dk ? .14 : .12, animation: "rotateSlow 120s linear infinite" }}><NumWheel ac={ac} size={560}/></div>
        {floats.map((f, i) => (
          <span key={i} style={{ position: "absolute", left: f.x, top: f.y, fontSize: f.s, color: ac, opacity: .13, fontFamily: "'Cormorant Garamond',serif", animation: `floatY ${5 + i}s ease-in-out ${f.d}s infinite`, textShadow: `0 0 30px ${ac}55` }}>{f.n}</span>
        ))}
      </Parallax>
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 580, animation: "fadeInUp 1s ease-out" }}>
        <div className="chip" style={{ marginBottom: 22, letterSpacing: 2 }}>✦ {he ? "נומרולוגיה אישית" : "Personal Numerology"}</div>
        <h1 style={{ fontSize: "clamp(32px,8vw,72px)", fontWeight: he ? 700 : 400, lineHeight: 1.12, fontFamily: "'Cormorant Garamond',serif", margin: "0 auto", color: ac, textShadow: `0 0 45px ${ac}55`, maxWidth: "100%", overflowWrap: "break-word" }}>
          {(he ? "המספרים שלך מספרים סיפור" : "Your Numbers Tell a Story").split(" ").flatMap((w, wi, arr) => {
            const word = <span key={"w" + wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}><RevealChars text={w} delay={.2 + wi * .22}/></span>;
            return wi < arr.length - 1 ? [word, <span key={"s" + wi}> </span>] : [word];
          })}
        </h1>
        <p style={{ fontSize: "clamp(14px,2.3vw,18px)", color: ts, fontWeight: 300, marginTop: 16, lineHeight: 1.8, maxWidth: 480, marginInline: "auto" }}>
          {he ? "התחל עכשיו — הקלד שם ותאריך לידה וצפה במספרים שלך מתגלים." : "Start now — enter your name and birth date and watch your numbers reveal."}
        </p>

        <div style={{ marginTop: 24, marginInline: "auto", maxWidth: 460, padding: "18px 18px 20px", borderRadius: 20, border: `1px solid ${ac}3a`, background: dk ? "rgba(12,12,28,.5)" : "rgba(255,255,255,.6)", backdropFilter: "blur(14px)", boxShadow: `0 18px 55px rgba(0,0,0,${dk ? .42 : .12})` }}>
          <div style={{ fontSize: 10.5, color: `${ac}cc`, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{he ? "מחשבון חי · גלה את המספרים שלך" : "Live · discover your numbers"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <input value={nm} onChange={(e) => setNm(e.target.value)} placeholder={he ? "השם המלא שלך…" : "Your full name…"} dir={he ? "rtl" : "ltr"} style={{ ...inputSt, textAlign: he ? "right" : "left" }}/>
            <div style={circleSt(num)}><div style={{ textAlign: "center" }}><div style={numSt}>{num ? <RollDigit value={num}/> : "—"}</div><div style={lblSt}>{he ? "שם" : "Name"}</div></div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder={he ? "תאריך לידה · dd.mm.yyyy" : "Birth date · dd.mm.yyyy"} dir="ltr" onKeyDown={(e) => { if (e.key === "Enter" && bothReady) onReveal(nm, dob); }} style={{ ...inputSt, textAlign: "center", letterSpacing: 2 }}/>
            <div style={circleSt(lp)}><div style={{ textAlign: "center" }}><div style={numSt}>{lp ? (lp > 9 ? lp : <RollDigit value={lp}/>) : "—"}</div><div style={lblSt}>{he ? "שביל" : "Path"}</div></div></div>
          </div>
          {(num > 0 || lp > 0) && <div style={{ marginTop: 11, fontSize: 12.5, color: ts, lineHeight: 1.6, animation: "fadeInUp .4s ease-out" }}>
            {num > 0 && <span>{he ? `שם: ${D[num]?.t}` : `Name: ${D[num]?.te}`}</span>}
            {num > 0 && lp > 0 && <span style={{ opacity: .5 }}> · </span>}
            {lp > 0 && <span>{he ? `שביל: ${(lp <= 9 ? D[lp]?.t : MASTER[lp]?.t) || ""}` : `Path: ${(lp <= 9 ? D[lp]?.te : MASTER[lp]?.te) || ""}`}</span>}
          </div>}
          <button className="gb" onClick={() => (bothReady ? onReveal(nm, dob) : (nm.trim() ? onUseName(nm) : onStart()))} style={{ width: "100%", marginTop: 14, padding: "14px", fontSize: 15 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="orb" size={16}/>{bothReady ? (he ? "גלה את הקריאה המלאה שלי" : "Reveal my full reading") : (he ? "קבל את הקריאה המלאה" : "Get the full reading")}</span></button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Magnetic><button className="ghost shine" onClick={onShop} style={{ padding: "13px 26px", fontSize: 14, backdropFilter: "blur(6px)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon name="cart" size={15}/>{he ? "לחנות ולמחירים" : "Shop & prices"}</span></button></Magnetic>
        </div>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 24, fontSize: 12.5, color: ts }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="check" size={13}/>{he ? "תוצאה מיידית" : "Instant result"}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="lock" size={13}/>{he ? "תשלום מאובטח" : "Secure checkout"}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="doc" size={13}/>{he ? "חשבונית מס" : "Tax invoice"}</span>
        </div>
      </div>
      <div onClick={onStart} style={{ position: "absolute", bottom: 18, zIndex: 2, color: ac, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: "bob 2.2s ease-in-out infinite" }}>
        <span style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: .7 }}>{he ? "גלול" : "Scroll"}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </div>
  );
}

// ═══════════════════ LANDING: HOW IT WORKS ═══════════════════
function HowItWorks({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.45)" : "rgba(42,37,32,.5)";
  const steps = he ? [
    { i: "pen", t: "מזינים שם ותאריך לידה", d: "תוך דקה, בלי הרשמה" },
    { i: "orb", t: "מקבלים קריאה חינמית", d: "המספרים, האישיות והשנה שלך" },
    { i: "star", t: "משדרגים למפה מלאה / שיחה", d: "תובנות עמוקות והכוונה אישית" },
  ] : [
    { i: "pen", t: "Enter name & birth date", d: "In a minute, no signup" },
    { i: "orb", t: "Get a free reading", d: "Your numbers, personality & year" },
    { i: "star", t: "Upgrade to a full map / call", d: "Deep insights & personal guidance" },
  ];
  return (
    <SR><div className="gc" style={{ marginBottom: 16 }}>
      <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: he ? 700 : 500, color: ac, fontFamily: "'Cormorant Garamond',serif", marginBottom: 18 }}>{he ? "איך זה עובד" : "How it works"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ textAlign: "center", padding: "16px 8px", background: dk ? "rgba(18,18,38,.4)" : "rgba(255,255,255,.4)", border: `1px solid ${ac}10`, borderRadius: 14 }}>
            <div style={{ color: ac, marginBottom: 10, display: "flex", justifyContent: "center" }}><Icon name={s.i} size={26} stroke={1.3}/></div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tm, lineHeight: 1.4 }}>{s.t}</div>
            <div style={{ fontSize: 11, color: ts, marginTop: 4, lineHeight: 1.4 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </div></SR>
  );
}

// ═══════════════════ LANDING: WHY NUMEROLOGY (explainer + number library) ═══════════════════
function WhyNumerology({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.5)" : "rgba(42,37,32,.5)";
  const [open, setOpen] = useState(null);
  return (
    <SR><div className="gc" style={{ marginBottom: 16 }}>
      <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: he ? 700 : 500, color: ac, fontFamily: "'Cormorant Garamond',serif", marginBottom: 8 }}>{he ? "מה זו נומרולוגיה?" : "What is numerology?"}</h2>
      <p style={{ textAlign: "center", fontSize: 14, lineHeight: 1.9, color: ts, maxWidth: 480, marginInline: "auto", marginBottom: 18 }}>
        {he ? "נומרולוגיה היא שפה עתיקה שמתרגמת את השם ותאריך הלידה שלך למספרים בעלי משמעות. כל מספר נושא אנרגיה, אופי ומסר — וביחד הם מציירים מפה של מי שאתה, מה הייעוד שלך ומה התזמון הנכון לצעדים הגדולים בחיים." : "Numerology is an ancient language that translates your name and birth date into meaningful numbers. Each number carries energy, character and a message — together they map who you are, your purpose, and the right timing for life's big moves."}
      </p>
      <div style={{ fontSize: 11, textAlign: "center", color: `${ac}99`, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{he ? "לחץ על מספר לגלות את המשמעות" : "Tap a number to reveal its meaning"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const info = NUM_LIB[n]; const isOpen = open === n;
          return (
            <div key={n} onClick={() => { AU.init(); AU.p("click"); setOpen(isOpen ? null : n); }} style={{ cursor: "pointer", padding: "12px 8px", background: isOpen ? `${ac}12` : (dk ? "rgba(18,18,38,.4)" : "rgba(255,255,255,.4)"), border: `1px solid ${isOpen ? ac + "55" : ac + "10"}`, borderRadius: 12, textAlign: "center", transition: "all .3s" }}>
              <div style={{ color: ac, display: "flex", justifyContent: "center", marginBottom: 2 }}><Icon name={info.icon} size={22} stroke={1.3}/></div>
              <div style={{ fontSize: 22, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif" }}>{n}</div>
              <div style={{ fontSize: 10, color: tm, fontWeight: 600, lineHeight: 1.3 }}>{info[he ? "he" : "en"].k.split(",")[0]}</div>
              {isOpen && <div style={{ fontSize: 10.5, color: ts, lineHeight: 1.6, marginTop: 6, textAlign: "center" }}>{info[he ? "he" : "en"].p}</div>}
            </div>
          );
        })}
      </div>
    </div></SR>
  );
}

// ═══════════════════ LANDING: TESTIMONIALS ═══════════════════
function Testimonials({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.5)" : "rgba(42,37,32,.5)";
  const list = he ? [
    { n: "מאיה ל׳", t: "המפה האישית פשוט פגעה בול. הרגשתי שמישהו סוף סוף מבין אותי. תודה!" },
    { n: "דניאל כ׳", t: "השיחה האישית נתנה לי בהירות על החלטה שהתלבטתי בה חודשים. שווה כל שקל." },
    { n: "נועה ר׳", t: "קניתי מתנה לחברה והיא התרגשה עד דמעות. חוויה מדויקת ומרגשת." },
  ] : [
    { n: "Maya L.", t: "The personal map hit the nail on the head. I finally felt understood. Thank you!" },
    { n: "Daniel C.", t: "The 1-on-1 call gave me clarity on a decision I'd agonized over for months. Worth every shekel." },
    { n: "Noa R.", t: "I bought it as a gift and she was moved to tears. Precise and touching." },
  ];
  return (
    <SR><div className="gc" style={{ marginBottom: 16 }}>
      <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: he ? 700 : 500, color: ac, fontFamily: "'Cormorant Garamond',serif", marginBottom: 16 }}>{he ? "מה אומרים עליי" : "What people say"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
        {list.map((r, i) => (
          <div key={i} style={{ padding: 16, background: dk ? "rgba(18,18,38,.4)" : "rgba(255,255,255,.4)", border: `1px solid ${ac}10`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: ac, marginBottom: 4 }}>★★★★★</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.8, color: tm, fontStyle: "italic" }}>"{r.t}"</p>
            <div style={{ fontSize: 12, color: ts, marginTop: 6, fontWeight: 600 }}>— {r.n}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: ts, textAlign: "center", marginTop: 12, opacity: .6 }}>{he ? "* החלף בביקורות אמיתיות שלך" : "* Replace with your real reviews"}</p>
    </div></SR>
  );
}

// ═══════════════════ LANDING: FAQ ═══════════════════
function FAQ({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.5)" : "rgba(42,37,32,.5)";
  const [open, setOpen] = useState(null);
  const qa = he ? [
    { q: "איך אני מקבל את המוצר?", a: "דוחות ומפות נשלחים כ-PDF מעוצב לאימייל/וואטסאפ תוך 48 שעות. שיחות מתואמות איתך אישית לאחר הרכישה." },
    { q: "איך מתבצע התשלום?", a: "התשלום מאובטח דרך מערכת הסליקה Grow — כרטיס אשראי, Bit, Apple/Google Pay. מקבלים חשבונית מס כחוק." },
    { q: "הקריאה החינמית — באמת חינם?", a: "כן, לגמרי. היא נותנת לך טעימה אמיתית מהמספרים שלך, בלי התחייבות ובלי הרשמה." },
    { q: "אפשר לבטל מנוי?", a: "בהחלט. מנוי התובנה החודשית ניתן לביטול בכל עת, ללא קנסות." },
    { q: "המידע שלי בטוח?", a: "הפרטים משמשים אך ורק להכנת הקריאה/המפה ולא מועברים לאף גורם שלישי." },
  ] : [
    { q: "How do I receive my product?", a: "Reports and maps are sent as a designed PDF to email/WhatsApp within 48h. Calls are scheduled with you personally after purchase." },
    { q: "How does payment work?", a: "Secure checkout via Grow — credit card, Bit, Apple/Google Pay. You receive a proper tax invoice." },
    { q: "Is the free reading really free?", a: "Yes, completely. It gives you a real taste of your numbers — no commitment, no signup." },
    { q: "Can I cancel a subscription?", a: "Absolutely. The monthly insight subscription can be cancelled anytime, no penalties." },
    { q: "Is my data safe?", a: "Your details are used only to prepare your reading/map and are never shared with third parties." },
  ];
  return (
    <SR><div className="gc" style={{ marginBottom: 16 }}>
      <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: he ? 700 : 500, color: ac, fontFamily: "'Cormorant Garamond',serif", marginBottom: 16 }}>{he ? "שאלות נפוצות" : "FAQ"}</h2>
      {qa.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: `1px solid ${ac}10` }}>
            <div onClick={() => { AU.init(); AU.p("click"); setOpen(isOpen ? null : i); }} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "14px 4px", cursor: "pointer" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: isOpen ? ac : tm, textAlign: "center" }}>{item.q}</span>
              <span style={{ fontSize: 18, color: ac, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .3s", flexShrink: 0 }}>+</span>
            </div>
            {isOpen && <p style={{ fontSize: 13, lineHeight: 1.8, color: ts, padding: "0 4px 14px", textAlign: "center" }}>{item.a}</p>}
          </div>
        );
      })}
    </div></SR>
  );
}

// ═══════════════════ LANDING: FOOTER ═══════════════════
function LandingFooter({ he, dk, onOwner }) {
  const ac = dk ? "#c8a96a" : "#937640"; const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.45)" : "rgba(42,37,32,.5)";
  const link = { color: ts, textDecoration: "none", fontSize: 12.5, transition: "color .3s" };
  return (
    <div style={{ marginTop: 24, paddingTop: 26, borderTop: `1px solid ${ac}14`, textAlign: "center" }}>
      <div style={{ fontSize: 24, color: ac, opacity: .8 }}>✦</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif", marginTop: 6 }}>{he ? "שני כהן אזולאי" : "Shani Cohen Azulai"}</h3>
      <p style={{ fontSize: 12, color: ts, marginTop: 3 }}>{he ? "נומרולוגיה · מסרים · אימון אישי · הפרשת חלה" : "Numerology · Messages · Coaching · Challah"}</p>

      <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ ...link, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="whatsapp" size={15}/>{he ? "וואטסאפ" : "WhatsApp"}</a>
        <a href="https://www.instagram.com/shani_cohen_8/" target="_blank" rel="noopener noreferrer" style={{ ...link, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="instagram" size={15}/>{he ? "אינסטגרם" : "Instagram"}</a>
        <a href={`mailto:${BUSINESS_EMAIL}`} style={{ ...link, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="mail" size={15}/>{he ? "אימייל" : "Email"}</a>
      </div>

      <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 14, fontSize: 11.5 }}>
        <a href="#" style={link}>{he ? "תקנון" : "Terms"}</a>
        <span style={{ color: `${ac}33` }}>·</span>
        <a href="#" style={link}>{he ? "מדיניות פרטיות" : "Privacy"}</a>
        <span style={{ color: `${ac}33` }}>·</span>
        <a href="#" style={link}>{he ? "מדיניות החזרים" : "Refunds"}</a>
      </div>

      <p style={{ fontSize: 10.5, color: ts, opacity: .7, marginTop: 16 }}>© {2026} {he ? "שני כהן אזולאי · כל הזכויות שמורות" : "Shani Cohen Azulai · All rights reserved"}</p>
      <div style={{ marginTop: 12, fontSize: 10, color: `${ac}22`, letterSpacing: 3 }}>✦ ✦ ✦</div>
      <span onDoubleClick={onOwner} title="owner" style={{ display: "inline-block", marginTop: 10, fontSize: 14, color: `${ac}26`, cursor: "default", userSelect: "none" }}>·</span>
    </div>
  );
}

// ═══════════════════ FLOATING CART BUTTON ═══════════════════
function FloatingCart({ he, dk, cart, onOpen }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const count = cartCount(cart);
  if (count === 0) return null;
  return (
    <button onClick={onOpen} style={{ position: "fixed", bottom: 20, [he ? "left" : "right"]: 18, zIndex: 200, display: "flex", alignItems: "center", gap: 8, padding: "13px 20px", background: `linear-gradient(135deg,${dk ? "#c8a96a" : "#b8942e"},${dk ? "#b8942e" : "#937640"})`, color: dk ? "#080812" : "#fff", border: "none", borderRadius: 30, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 30px ${ac}55`, animation: "fadeInUp .4s ease-out" }}>
      <Icon name="cart" size={16}/> <span>{he ? "עגלה" : "Cart"}</span>
      <span style={{ background: dk ? "#080812" : "#fff", color: ac, borderRadius: 12, minWidth: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{count}</span>
      <span style={{ fontSize: 13, opacity: .9 }}>₪{cartTotal(cart)}</span>
    </button>
  );
}

// ═══════════════════ CART DRAWER ═══════════════════
function CartDrawer({ he, dk, cart, open, onClose, onQty, onRemove, onClear }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.5)" : "rgba(42,37,32,.5)";
  const entries = cartEntries(cart);
  const total = cartTotal(cart);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", display: "flex", justifyContent: he ? "flex-start" : "flex-end", animation: "fadeInUp .25s ease-out" }}>
      <div onClick={(e) => e.stopPropagation()} dir={he ? "rtl" : "ltr"} style={{ width: "min(420px,92vw)", height: "100%", overflowY: "auto", background: dk ? "linear-gradient(160deg,#12122a,#0a0a1a)" : "linear-gradient(160deg,#fff,#f0ebe0)", borderInlineStart: `1px solid ${ac}33`, padding: "22px 18px", boxShadow: "0 0 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif", display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="cart" size={18}/>{he ? "העגלה שלי" : "My Cart"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: ts, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {entries.length === 0 ? (
          <p style={{ textAlign: "center", color: ts, fontSize: 14, padding: "40px 0" }}>{he ? "העגלה ריקה" : "Your cart is empty"}</p>
        ) : (
          <>
            {entries.map(({ product, qty }) => (
              <div key={product.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${ac}10` }}>
                <div style={{ color: ac, marginTop: 1 }}><Icon name={product.icon} size={22}/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: tm }}>{product.name[he ? "he" : "en"]}</div>
                  <div style={{ fontSize: 12, color: ac, marginTop: 2 }}>{product.price[he ? "he" : "en"]}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <button onClick={() => onQty(product.id, -1)} style={qtyBtn(ac, dk)}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: tm, minWidth: 18, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => onQty(product.id, 1)} style={qtyBtn(ac, dk)}>+</button>
                    <button onClick={() => onRemove(product.id)} style={{ background: "none", border: "none", color: ts, fontSize: 12, cursor: "pointer", marginInlineStart: "auto" }}>{he ? "הסר" : "Remove"}</button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 0 6px" }}>
              <span style={{ fontSize: 14, color: ts }}>{he ? 'סה"כ לתשלום' : "Total"}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif" }}>₪{total}</span>
            </div>

            <a href={waOrderLink(cart, he)} target="_blank" rel="noopener noreferrer" onClick={() => { AU.init(); AU.p("reveal"); }} className="gb" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12, padding: "15px" }}>
              {he ? "סיום הזמנה ←" : "Complete order →"}
            </a>
            <p style={{ fontSize: 11, color: ts, textAlign: "center", marginTop: 10, lineHeight: 1.7 }}>
              {he ? "ההזמנה תישלח אליי בוואטסאפ ואחזור אליך עם לינק תשלום מאובטח / בקשת Bit. רוצה לשלם מיד בכרטיס? לחץ \"שלם עכשיו\" על המוצר." : "Your order is sent to me on WhatsApp and I'll reply with a secure payment link / Bit request. Want to pay by card now? Use \"Pay now\" on the product."}
            </p>
            <button onClick={onClear} style={{ background: "none", border: "none", color: ts, fontSize: 12, cursor: "pointer", display: "block", margin: "12px auto 0" }}>{he ? "רוקן עגלה" : "Clear cart"}</button>
          </>
        )}
      </div>
    </div>
  );
}
const qtyBtn = (ac, dk) => ({ width: 26, height: 26, borderRadius: 8, border: `1px solid ${ac}44`, background: dk ? "rgba(8,8,18,.6)" : "rgba(255,255,255,.7)", color: ac, fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" });

// ═══════════════════ ABOUT — SHANI COHEN AZULAI ═══════════════════
function AboutShani({ he, dk, onBook }) {
  const ac = dk ? "#c8a96a" : "#937640"; const tm = dk ? "#e8e0d0" : "#2a2520"; const ts = dk ? "rgba(232,224,208,.6)" : "rgba(42,37,32,.6)";
  const [noPhoto, setNoPhoto] = useState(false);
  return (<SR><div className="gc" style={{ marginBottom: 16, textAlign: "center" }}>
    <div style={{ width: 124, height: 124, margin: "0 auto 14px", borderRadius: "50%", border: `2px solid ${ac}`, padding: 4, boxShadow: `0 0 34px ${ac}40` }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: `radial-gradient(circle at 30% 28%,${ac}3a,${dk ? "#14142e" : "#ece3d4"})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!noPhoto && <img src="/shani.jpg" alt="שני כהן אזולאי" onError={() => setNoPhoto(true)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%" }}/>}
        {noPhoto && <span style={{ fontSize: 48, color: ac, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>ש</span>}
      </div>
    </div>
    <div className="chip" style={{ marginBottom: 10 }}>✦ {he ? "מי אני" : "About"}</div>
    <h2 className="shimmer-text" style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{he ? "שני כהן אזולאי" : "Shani Cohen Azulai"}</h2>
    <div style={{ fontSize: 12.5, color: ac, marginTop: 5, letterSpacing: .5 }}>{he ? "נומרולוגיה · מסרים · אימון אישי · הפרשת חלה" : "Numerology · Messages · Coaching · Challah"}</div>
    <p style={{ fontSize: 14, lineHeight: 1.9, color: ts, maxWidth: 460, margin: "14px auto 0" }}>{he ? "נעים להכיר, אני שני. כבר שנים אני מלווה אנשים דרך שפת המספרים — עוזרת להם להבין מי הם, מה הייעוד שלהם, ואיך לקבל החלטות מתוך בהירות וביטחון. סביבי נבנתה קהילה של אלפי עוקבים, ועכשיו גם אתם מוזמנים למסע אישי איתי." : "I'm Shani. For years I've been guiding people through the language of numbers — helping them understand who they are, their purpose, and how to make decisions with clarity and confidence."}</p>
    <p style={{ fontSize: 10, color: ts, opacity: .55, marginTop: 8 }}>{he ? "* ניתן לערוך את הטקסט ולהוסיף תמונה (קובץ public/shani.jpg)" : "* Editable text; add public/shani.jpg"}</p>
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
      <a href="https://www.instagram.com/shani_cohen_8/" target="_blank" rel="noopener noreferrer" className="ghost" style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}><Icon name="instagram" size={16}/>{he ? "אינסטגרם · 14K" : "Instagram · 14K"}</a>
      <button className="gb" onClick={onBook} style={{ width: "auto", padding: "13px 24px", fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="phone" size={15}/>{he ? "לשיחה אישית איתי" : "Book a session"}</span></button>
    </div>
  </div></SR>);
}

// ═══════════════════ TRUST BAR ═══════════════════
function TrustBar({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640"; const ts = dk ? "rgba(232,224,208,.62)" : "rgba(42,37,32,.6)";
  const items = he ? [{ i: "lock", t: "תשלום מאובטח" }, { i: "doc", t: "חשבונית מס" }, { i: "share", t: "אספקה תוך 48 שעות" }, { i: "heart", t: "ליווי אישי" }] : [{ i: "lock", t: "Secure payment" }, { i: "doc", t: "Tax invoice" }, { i: "share", t: "48h delivery" }, { i: "heart", t: "Personal care" }];
  return (<SR><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
    {items.map((it, i) => (<div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 14, border: `1px solid ${ac}14`, background: dk ? "rgba(18,18,38,.4)" : "rgba(255,255,255,.4)" }}><span style={{ color: ac, display: "inline-flex" }}><Icon name={it.i} size={20} stroke={1.3}/></span><span style={{ fontSize: 11.5, color: ts, textAlign: "center" }}>{it.t}</span></div>))}
  </div></SR>);
}

// ═══════════════════ LEAD CAPTURE ═══════════════════
function LeadCapture({ he, dk }) {
  const ac = dk ? "#c8a96a" : "#937640"; const tm = dk ? "#e8e0d0" : "#2a2520"; const ts = dk ? "rgba(232,224,208,.6)" : "rgba(42,37,32,.6)";
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  const submit = () => { if (!email.trim()) return; AU.init(); AU.p("reveal"); const msg = he ? `היי שני! אשמח להצטרף לרשימת התפוצה. המייל שלי: ${email}` : `Hi Shani! I'd like to join your list. My email: ${email}`; window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer"); setSent(true); };
  return (<SR><div className="gc" style={{ marginBottom: 16, textAlign: "center" }}>
    <div style={{ color: ac, display: "flex", justifyContent: "center", marginBottom: 8 }}><Icon name="mail" size={26} stroke={1.3}/></div>
    <h2 style={{ fontSize: 21, fontWeight: he ? 700 : 500, color: ac, fontFamily: "'Cormorant Garamond',serif" }}>{he ? "תחזית חודשית — חינם" : "Free monthly forecast"}</h2>
    <p style={{ fontSize: 13, color: ts, maxWidth: 380, margin: "6px auto 14px", lineHeight: 1.7 }}>{he ? "השאירו מייל וקבלו ממני מסר נומרולוגי בכל ראש חודש — חינם, וניתן לבטל בכל עת." : "Leave your email for a monthly numerology message — free, cancel anytime."}</p>
    {sent ? <div style={{ fontSize: 14, color: ac, fontWeight: 600 }}>{he ? "תודה! ההצטרפות נשלחה בוואטסאפ ✦" : "Thank you! Sent via WhatsApp ✦"}</div> :
      <div style={{ display: "flex", gap: 8, maxWidth: 400, margin: "0 auto" }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder={he ? "המייל שלך…" : "Your email…"} dir="ltr" onKeyDown={e => { if (e.key === "Enter") submit(); }} style={{ flex: 1, minWidth: 0, background: dk ? "rgba(8,8,18,.6)" : "rgba(255,255,255,.8)", border: `1px solid ${ac}33`, borderRadius: 12, padding: "12px 14px", color: tm, fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "center" }}/>
        <button className="gb" onClick={submit} style={{ width: "auto", padding: "12px 18px", fontSize: 13 }}>{he ? "הצטרפו" : "Join"}</button>
      </div>}
    <p style={{ fontSize: 10, color: ts, opacity: .55, marginTop: 10 }}>{he ? "* כרגע נשלח לוואטסאפ; ניתן לחבר לרשימת תפוצה אמיתית" : "* Currently sent to WhatsApp; can connect a real mailing list"}</p>
  </div></SR>);
}

// ═══════════════════ FLOATING WHATSAPP ═══════════════════
function FloatingWhatsApp({ he }) {
  return (<a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" title={he ? "דברו איתי בוואטסאפ" : "Chat on WhatsApp"} style={{ position: "fixed", bottom: 20, [he ? "right" : "left"]: 18, zIndex: 200, width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 26px rgba(37,211,102,.5)", textDecoration: "none" }}><Icon name="whatsapp" size={28} stroke={1.6}/></a>);
}

// ═══════════════════ SAMPLE MAP PREVIEW ═══════════════════
function SampleMap({ he, dk, onBuy }) {
  const ac = dk ? "#c8a96a" : "#937640"; const tm = dk ? "#e8e0d0" : "#2a2520"; const ts = dk ? "rgba(232,224,208,.6)" : "rgba(42,37,32,.6)";
  let demo; try { demo = fullCalc(7, 3, 1988, "אורה לוי", false); } catch (e) { demo = null; }
  if (!demo) return null;
  const nums = [
    { l: he ? "שביל הגורל" : "Life Path", v: demo.lp }, { l: he ? "ערך השם" : "Name", v: demo.nv },
    { l: he ? "קול הנשמה" : "Soul", v: demo.su }, { l: he ? "מספר הביטוי" : "Expression", v: demo.ex },
    { l: he ? "שנה אישית" : "Personal Year", v: demo.py },
  ];
  return (<SR><div className="gc" style={{ marginBottom: 16 }}>
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <div className="chip" style={{ marginBottom: 10 }}>✦ {he ? "הצצה למפה" : "Sample map"}</div>
      <h2 className="shimmer-text" style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Cormorant Garamond',serif" }}>{he ? "מה מחכה לך במפה האישית" : "What's inside your personal map"}</h2>
      <p style={{ fontSize: 12.5, color: ts, marginTop: 4 }}>{he ? "דוגמה אמיתית — כך נראית המפה שתקבל/י" : "A real example of the map you'll receive"}</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, alignItems: "center" }}>
      <div>
        {nums.map((it, i) => (
          <div key={i} className="rrow" style={{ gap: 12 }}>
            <div className="orb" style={{ width: 46, height: 46, fontSize: 19 }}>{it.v}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: tm }}>{it.l}</div>{it.v > 0 && it.v <= 9 && <div className="badge">{he ? D[it.v]?.t : D[it.v]?.te}</div>}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: `${ac}99`, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>{he ? "המפה הפסיכולוגית" : "Psychological map"}</div>
        <div style={{ transform: "scale(.92)" }}><PsychRadar psych={demo.psych} dk={dk} he={he}/></div>
      </div>
    </div>
    <div className="divider"/>
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 13, color: ts, lineHeight: 1.8, maxWidth: 480, margin: "0 auto 14px" }}>{he ? "וזו רק ההתחלה — המפה המלאה כוללת גם פרשנות אישית כתובה, מחזורי חיים, חובות קארמיים, מפת לו-שו וטקסים מותאמים." : "And that's just the start — the full map also includes written interpretation, life cycles, karmic debts, Lo Shu grid and tailored rituals."}</p>
      <button className="gb" onClick={onBuy} style={{ width: "auto", padding: "13px 28px", fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="map" size={16}/>{he ? "הזמן את המפה שלך" : "Order your map"}</span></button>
    </div>
  </div></SR>);
}

// ═══════════════════ CINEMATIC CTA BAND ═══════════════════
function CtaBand({ he, dk, onShop }) {
  const ac = dk ? "#c8a96a" : "#937640";
  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 22, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "8px 0 20px", backgroundImage: `url(${IMG.band})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div style={{ position: "absolute", inset: 0, background: dk ? "linear-gradient(180deg,rgba(8,8,18,.82),rgba(10,10,24,.6),rgba(8,8,18,.88))" : "linear-gradient(180deg,rgba(245,240,232,.88),rgba(245,240,232,.7),rgba(245,240,232,.92))" }}/>
      <SR><div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "44px 22px", maxWidth: 560 }}>
        <div style={{ color: ac, marginBottom: 14, display: "flex", justifyContent: "center" }}><Icon name="sparkle" size={30} stroke={1.2}/></div>
        <h2 className="shimmer-text" style={{ fontSize: "clamp(26px,5.5vw,42px)", fontWeight: he ? 700 : 400, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1.18 }}>{he ? "המסע שלך אל המספרים מתחיל כאן" : "Your journey into the numbers starts here"}</h2>
        <p style={{ fontSize: 15, color: dk ? "rgba(232,224,208,.72)" : "rgba(42,37,32,.65)", margin: "14px auto 24px", maxWidth: 440, lineHeight: 1.85 }}>{he ? "מפה אישית, שיחה אחד-על-אחד, או ליווי מתמשך — בחר את הדרך שלך." : "A personal map, a 1-on-1 call, or ongoing guidance — choose your path."}</p>
        <button className="gb" onClick={onShop} style={{ width: "auto", padding: "15px 34px", fontSize: 16 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 9, justifyContent: "center" }}><Icon name="cart" size={17}/>{he ? "גלה את החבילות" : "Explore the offerings"}</span></button>
      </div></SR>
    </div>
  );
}

// ═══════════════════ SHOP SECTION (cart-aware) ═══════════════════
// onAdd present → customer mode (add-to-cart). Absent → owner mode (buy-now).
// ═══════════════════ PRODUCT DETAIL MODAL ═══════════════════
function ProductModal({ product, he, dk, onClose, onAdd }) {
  const ac = dk ? "#c8a96a" : "#937640"; const tm = dk ? "#e8e0d0" : "#2a2520"; const ts = dk ? "rgba(232,224,208,.6)" : "rgba(42,37,32,.6)";
  const customer = typeof onAdd === "function";
  const kind = product.recurring ? "sub" : (["intro-call", "deep-consult", "mentoring"].includes(product.id) ? "call" : product.id === "gift" ? "gift" : product.id === "vip" ? "vip" : product.id === "bundle" ? "bundle" : "report");
  const incl = (he ? {
    report: ["קובץ PDF מעוצב ואישי", "פרשנות כתובה ומפורטת", "אספקה תוך 48 שעות", "אפשרות לשאלות המשך"],
    bundle: ["מפה אישית מלאה (PDF)", "שיחת ייעוץ 75 דקות", "הקלטה של השיחה", "חיסכון של ₪99"],
    vip: ["מפה אישית מלאה", "תחזית שנתית 12 חודשים", "שיחת עומק 90 דקות + הקלטה", "דוח PDF מורחב", "חודש ליווי אישי בוואטסאפ"],
    call: ["פגישת זום או טלפון", "תיאום גמיש לפי הזמן שלך", "ליווי אישי וחם", "סיכום וכיווני פעולה"],
    gift: ["שובר מתנה אלגנטי", "נשלח אליך או למקבל/ת", "הוראות מימוש פשוטות", "ללא תאריך תפוגה"],
    sub: ["מסר חודשי מותאם אישית", "ישירות למייל בכל ראש חודש", "ביטול בכל עת", "ללא התחייבות"],
  } : {
    report: ["Designed personal PDF", "Detailed written interpretation", "Delivery within 48h", "Follow-up questions"],
    bundle: ["Full personal map (PDF)", "75-min consultation", "Call recording", "Save ₪99"],
    vip: ["Full personal map", "12-month forecast", "90-min deep call + recording", "Extended PDF report", "A month of WhatsApp guidance"],
    call: ["Zoom or phone session", "Flexible scheduling", "Warm personal guidance", "Summary & next steps"],
    gift: ["Elegant gift voucher", "Sent to you or recipient", "Simple redemption", "No expiry"],
    sub: ["Monthly personalized message", "Straight to your inbox", "Cancel anytime", "No commitment"],
  })[kind];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,.62)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeInUp .25s ease-out" }}>
      <div onClick={e => e.stopPropagation()} dir={he ? "rtl" : "ltr"} style={{ width: "min(520px,96vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 22, background: dk ? "linear-gradient(180deg,#14142e,#0c0c1c)" : "linear-gradient(180deg,#fff,#f4efe6)", border: `1px solid ${ac}44`, boxShadow: "0 30px 80px rgba(0,0,0,.55)" }}>
        <div style={{ position: "relative", height: 210 }}>
          <img src={IMG[product.id] || IMG.band} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          <div style={{ position: "absolute", inset: 0, background: dk ? "linear-gradient(180deg,rgba(8,8,20,.15),rgba(12,12,26,.92))" : "linear-gradient(180deg,rgba(255,255,255,.1),rgba(244,239,230,.92))" }}/>
          <button onClick={onClose} style={{ position: "absolute", top: 12, insetInlineEnd: 12, width: 34, height: 34, borderRadius: "50%", border: `1px solid ${ac}55`, background: dk ? "rgba(8,8,18,.5)" : "rgba(255,255,255,.7)", color: ac, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
          <div style={{ position: "absolute", top: 14, insetInlineStart: 14, width: 44, height: 44, borderRadius: "50%", background: dk ? "rgba(8,8,18,.5)" : "rgba(255,255,255,.65)", border: `1px solid ${ac}66`, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", color: ac }}><Icon name={product.icon} size={24} stroke={1.3}/></div>
          <div style={{ position: "absolute", bottom: 10, insetInlineStart: 16, fontSize: 30, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond',serif", textShadow: "0 2px 14px rgba(0,0,0,.7)" }}>{product.price[he ? "he" : "en"]}</div>
          {product.badge && <div style={{ position: "absolute", bottom: 14, insetInlineEnd: 16, background: ac, color: dk ? "#080812" : "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>{product.badge[he ? "he" : "en"]}</div>}
        </div>
        <div style={{ padding: "20px 22px 24px", textAlign: "center" }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: ac, fontFamily: "'Cormorant Garamond',serif" }}>{product.name[he ? "he" : "en"]}</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.9, color: ts, margin: "10px auto 16px", maxWidth: 420 }}>{product.desc[he ? "he" : "en"]}</p>
          <div style={{ textAlign: he ? "right" : "left", maxWidth: 340, margin: "0 auto 18px" }}>
            <div style={{ fontSize: 12, color: ac, fontWeight: 700, marginBottom: 9, letterSpacing: 1, textAlign: "center" }}>{he ? "מה כלול" : "What's included"}</div>
            {incl.map((it, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}><span style={{ color: ac, display: "inline-flex", flexShrink: 0 }}><Icon name="check" size={16}/></span><span style={{ fontSize: 13, color: tm }}>{it}</span></div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {customer && <button className="gb" onClick={() => { onAdd(product.id); onClose(); }} style={{ width: "auto", padding: "13px 24px", fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="plus" size={15}/>{he ? "הוסף לעגלה" : "Add to cart"}</span></button>}
            <button className="gb" onClick={() => goToCheckout(product)} style={{ width: "auto", padding: "13px 24px", fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="lock" size={14}/>{he ? "שלם עכשיו" : "Pay now"}</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopSection({ he, dk, onAdd, cart }) {
  const ac = dk ? "#c8a96a" : "#937640";
  const tm = dk ? "#e8e0d0" : "#2a2520";
  const ts = dk ? "rgba(232,224,208,.45)" : "rgba(42,37,32,.5)";
  const customer = typeof onAdd === "function";
  const [modal, setModal] = useState(null);
  return (
    <div style={{ animation: "fadeInUp .5s ease-out" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: ac, marginBottom: 8, display: "flex", justifyContent: "center" }}><Icon name="cart" size={28} stroke={1.3}/></div>
        <h2 style={{ fontSize: he ? 24 : 26, fontWeight: he ? 700 : 400, color: ac, fontFamily: "'Cormorant Garamond',serif" }}>{he ? "החנות" : "The Shop"}</h2>
        <p style={{ fontSize: 13, color: ts, marginTop: 4 }}>{he ? "מפות אישיות, שיחות וייעוץ — תשלום מאובטח בכרטיס אשראי / Bit" : "Personal maps, calls & consulting — secure card / Bit checkout"}</p>
      </div>

      {SHOP.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h3 className="shimmer-text" style={{ fontSize: 21, fontWeight: 600, fontFamily: "'Cormorant Garamond',serif" }}>{group.cat[he ? "he" : "en"]}</h3>
            {group.sub[he ? "he" : "en"] && <div style={{ fontSize: 11.5, color: ts, marginTop: 3 }}>{group.sub[he ? "he" : "en"]}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(238px,1fr))", gap: 14 }}>
            {group.items.map((p, pi) => {
              const qty = customer ? (cart?.[p.id] || 0) : 0;
              return (
                <SR key={p.id} delay={pi * 80}>
                  <div className="pcard" style={p.featured ? { borderColor: `${ac}55`, boxShadow: `0 0 30px ${ac}1a`, transformStyle: "preserve-3d" } : { transformStyle: "preserve-3d" }}
                    onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5; const py = (e.clientY - r.top) / r.height - .5; e.currentTarget.style.transition = "transform .1s ease-out"; e.currentTarget.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-8px)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transition = "transform .5s cubic-bezier(.16,1,.3,1),box-shadow .45s,border-color .45s"; e.currentTarget.style.transform = ""; }}>
                    <div className="pmedia" style={{ cursor: "pointer" }} onClick={() => { AU.init(); AU.p("click"); setModal(p); }} title={he ? "פרטים מלאים" : "Full details"}>
                      <img src={IMG[p.id] || IMG.band} alt="" loading="lazy"/>
                      <div style={{ position: "absolute", inset: 0, background: dk ? "linear-gradient(180deg,rgba(8,8,20,.1),rgba(12,12,26,.9))" : "linear-gradient(180deg,rgba(255,255,255,.1),rgba(245,240,232,.9))" }}/>
                      <div style={{ position: "absolute", top: 12, insetInlineStart: 12, width: 42, height: 42, borderRadius: "50%", background: dk ? "rgba(8,8,18,.45)" : "rgba(255,255,255,.6)", border: `1px solid ${ac}66`, backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", color: ac }}><Icon name={p.icon} size={22} stroke={1.3}/></div>
                      {p.badge && <div style={{ position: "absolute", top: 14, insetInlineEnd: 12, background: ac, color: dk ? "#080812" : "#fff", fontSize: 10, fontWeight: 700, padding: "4px 11px", borderRadius: 20, letterSpacing: .5, boxShadow: `0 4px 16px ${ac}77` }}>{p.badge[he ? "he" : "en"]}</div>}
                      <div style={{ position: "absolute", bottom: 9, insetInlineStart: 15, fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond',serif", textShadow: "0 2px 14px rgba(0,0,0,.7)" }}>{p.price[he ? "he" : "en"]}</div>
                      <div style={{ position: "absolute", bottom: 12, insetInlineEnd: 14, fontSize: 11, color: "#fff", opacity: .9, display: "inline-flex", alignItems: "center", gap: 3, textShadow: "0 1px 8px rgba(0,0,0,.7)" }}>{he ? "פרטים" : "Details"}<span>{he ? "‹" : "›"}</span></div>
                    </div>
                    <div style={{ padding: "14px 16px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: tm, marginBottom: 5 }}>{p.name[he ? "he" : "en"]}</div>
                      <p style={{ fontSize: 12.5, lineHeight: 1.7, color: ts, marginBottom: 13, minHeight: customer ? 54 : undefined }}>{p.desc[he ? "he" : "en"]}</p>
                      {customer ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="gb" onClick={() => onAdd(p.id)} style={{ flex: 1, width: "auto", padding: "11px 12px", fontSize: 13 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                              <Icon name={qty > 0 ? "check" : "plus"} size={15}/>
                              {qty > 0 ? (he ? `בעגלה · ${qty}` : `In cart · ${qty}`) : (he ? "לעגלה" : "Add")}
                            </span>
                          </button>
                          <button className="ghost" onClick={() => goToCheckout(p)} style={{ padding: "11px 14px", fontSize: 13, whiteSpace: "nowrap" }}>{he ? "שלם" : "Pay"}</button>
                        </div>
                      ) : (
                        <button className="gb" onClick={() => goToCheckout(p)} style={{ width: "100%", padding: "11px", fontSize: 14 }}>{he ? "קנה עכשיו ←" : "Buy now →"}</button>
                      )}
                    </div>
                  </div>
                </SR>
              );
            })}
          </div>
        </div>
      ))}

      <p style={{ textAlign: "center", fontSize: 11, color: ts, marginTop: 4, lineHeight: 1.8 }}>
        <Icon name="lock" size={11} style={{ verticalAlign: "-1px", marginInlineEnd: 4 }}/>{he ? "התשלום מתבצע בעמוד מאובטח של Grow (משולם). יש שאלה לפני רכישה? " : "Payment via a secure Grow checkout page. Questions before buying? "}
        <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ color: ac, fontWeight: 600 }}>{he ? "דברו איתי" : "Contact me"}</a>
      </p>
      {modal && <ProductModal product={modal} he={he} dk={dk} onClose={() => setModal(null)} onAdd={onAdd}/>}
    </div>
  );
}

// ═══════════════════ MAIN APP ═══════════════════
export default function App(){
  const[lang,setLang]=useState("he");const[dk,setDk]=useState(true);const[snd,setSnd]=useState(true);const[intro,setIntro]=useState(true);
  const[step,setStep]=useState(1);const[tab,setTab]=useState("reading");const[name,setName]=useState("");const[dob,setDob]=useState("");const[addOne,setAddOne]=useState(false);
  const[results,setResults]=useState(null);const[showRes,setShowRes]=useState(false);const[error,setError]=useState("");
  const[chapters,setChapters]=useState([false,false,false,false,false,false]);
  const[streak,setStreak]=useState(0);
  const[owner,setOwner]=useState(()=>{try{const h=location.hash+location.search;if(/customer/i.test(h))return false;if(/owner|studio|admin/i.test(h))return true;return localStorage.getItem(OWNER_STORE_KEY)!=="customer";}catch(e){return true;}});const[previewCustomer,setPreviewCustomer]=useState(false);
  const[cart,setCart]=useState({});const[cartOpen,setCartOpen]=useState(false);

  const he=lang==="he";const isRtl=he;const ac=dk?"#c8a96a":"#937640";const tm=dk?"#e8e0d0":"#2a2520";const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  useEffect(()=>{AU.on=snd;},[snd]);

  // ── cart persistence; owner/customer view preference is read in the useState initializer above ──
  useEffect(()=>{try{
    const saved=localStorage.getItem(CART_STORE_KEY);if(saved)setCart(JSON.parse(saved)||{});
  }catch(e){}},[]);
  useEffect(()=>{try{localStorage.setItem(CART_STORE_KEY,JSON.stringify(cart));}catch(e){}},[cart]);
  const enterOwner=()=>{AU.init();AU.p("reveal");setOwner(true);setPreviewCustomer(false);try{localStorage.setItem(OWNER_STORE_KEY,"owner");}catch(e){}};
  const exitOwner=()=>{AU.init();AU.p("click");setOwner(false);setPreviewCustomer(false);try{localStorage.setItem(OWNER_STORE_KEY,"customer");}catch(e){}};
  const addToCart=(id)=>{AU.init();AU.p("card");setCart(c=>({...c,[id]:(c[id]||0)+1}));};
  const setQty=(id,delta)=>setCart(c=>{const q=(c[id]||0)+delta;const n={...c};if(q<=0)delete n[id];else n[id]=q;return n;});
  const removeFromCart=(id)=>setCart(c=>{const n={...c};delete n[id];return n;});
  const clearCart=()=>setCart({});
  const scrollToId=(id)=>{try{document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}};

  useEffect(()=>{
    (async()=>{try{const r=await window.storage?.get("streak");if(r){const d=JSON.parse(r.value);const today=new Date().toDateString();if(d.last===today)setStreak(d.count);else if(d.last===new Date(Date.now()-86400000).toDateString())setStreak(d.count+1);else setStreak(1);}}catch(e){}})();
  },[]);

  const saveStreak=useCallback(async()=>{
    try{const today=new Date().toDateString();await window.storage?.set("streak",JSON.stringify({count:streak||1,last:today}));}catch(e){}
  },[streak]);

  const revealChapter=(i)=>{AU.init();AU.p("chapter");const next=[...chapters];next[i]=true;setChapters(next);};

  const runReading=useCallback((nm,dobStr,add)=>{
    try{setError("");const parts=String(dobStr).split(".");if(parts.length!==3)throw 0;const[d,m,y]=parts.map(Number);if(!d||!m||!y||d>31||m>12||y<1900)throw 0;
      AU.init();AU.p("reveal");const r=fullCalc(d,m,y,nm,add);setResults(r);setShowRes(true);
      setChapters([false,false,false,false,false,false]);
      setTimeout(()=>{setChapters(c=>{const n=[...c];n[0]=true;return n;});AU.p("chapter");},800);saveStreak();
      return true;
    }catch{setError(he?"אנא ודא שכל הנתונים הוזנו כהלכה":"Please check that all data is entered correctly");return false;}
  },[he,saveStreak]);
  const doCalc=useCallback(()=>{runReading(name,dob,addOne);},[name,dob,addOne,runReading]);

  const goHome=()=>{
    AU.init();AU.p("click");
    setShowRes(false);setResults(null);setStep(1);setName("");setDob("");setAddOne(false);
    setChapters([false,false,false,false,false,false]);setTab("reading");
  };

  const nextUnrevealed=chapters.findIndex(c=>!c);
  const chapterDefs=results?[
    {icon:"star",title:he?"מהות":"Essence",sub:he?"מי את/ה באמת":"Who you truly are"},
    {icon:"orb",title:he?"גורל":"Destiny",sub:he?"השביל שלך":"Your path"},
    {icon:"wave",title:he?"העונה הנוכחית":"Current Season",sub:he?"האנרגיה של עכשיו":"The energy of now"},
    {icon:"map",title:he?"מפת החיים":"Life Map",sub:he?"מחזורים ותחנות":"Cycles and stations"},
    {icon:"mind",title:he?"העולם הפנימי":"Inner World",sub:he?"הפסיכולוגיה שלך":"Your psychology"},
    {icon:"compass",title:he?"הדרך קדימה":"Path Forward",sub:he?"המלצות וטקסים":"Guidance and rituals"},
  ]:[];

  const showOwnerUI = owner && !previewCustomer; // owner console vs. public customer landing

  return(<div dir={isRtl?"rtl":"ltr"} style={{minHeight:"100vh",background:dk?"linear-gradient(170deg,#080812 0%,#0f0f28 35%,#0a0a1a 65%,#080812 100%)":"linear-gradient(170deg,#f5f0e8 0%,#ede5d8 35%,#f0ebe0 65%,#f5f0e8 100%)",color:tm,fontFamily:isRtl?"'Noto Sans Hebrew','Heebo',sans-serif":"'Cormorant Garamond','Georgia',serif",position:"relative",overflow:"hidden",transition:"background .7s,color .4s"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Hebrew:wght@300;400;500;600;700&family=Heebo:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}html,body{overflow-x:hidden;max-width:100%}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${ac}33;border-radius:3px}
@media(prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
:focus-visible{outline:2px solid ${ac};outline-offset:2px;border-radius:6px}
button,a,input{-webkit-tap-highlight-color:transparent}
@keyframes fadeInUp{from{opacity:0;transform:translateY(35px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes glow{0%,100%{box-shadow:0 0 15px ${ac}12}50%{box-shadow:0 0 35px ${ac}28}}
@keyframes drift{0%{transform:translate(0,0) scale(1)}33%{transform:translate(6vw,4vh) scale(1.15)}66%{transform:translate(-5vw,6vh) scale(.9)}100%{transform:translate(0,0) scale(1)}}
@keyframes drift2{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-7vw,-5vh) scale(1.2)}100%{transform:translate(0,0) scale(1)}}
@keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes shineSweep{0%{transform:translateX(-130%) skewX(-18deg)}60%,100%{transform:translateX(230%) skewX(-18deg)}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes rotateSlow{to{transform:rotate(360deg)}}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.9}}
@keyframes bob{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(7px);opacity:1}}
@keyframes charRise{from{opacity:0;transform:translateY(26px) rotateX(50deg)}to{opacity:1;transform:translateY(0) rotateX(0)}}
.shimmer-text{background:linear-gradient(100deg,${ac},${dk?"#f4e4b8":"#c9a86a"},${ac},${dk?"#fff6e0":"#b8902e"},${ac});background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 6s linear infinite}
.nebula{position:fixed;border-radius:50%;filter:blur(70px);pointer-events:none;z-index:0;opacity:${dk?.5:.4};mix-blend-mode:${dk?"screen":"multiply"}}
.shine{position:relative;overflow:hidden}.shine::after{content:'';position:absolute;top:0;left:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-130%) skewX(-18deg);pointer-events:none}.shine:hover::after{animation:shineSweep .9s ease}
.lift{transition:transform .45s cubic-bezier(.16,1,.3,1),box-shadow .45s,border-color .45s}.lift:hover{transform:translateY(-7px)}
.pcard{position:relative;border-radius:20px;overflow:hidden;border:1px solid ${ac}1f;background:${dk?"linear-gradient(180deg,rgba(20,20,42,.9),rgba(12,12,26,.92))":"linear-gradient(180deg,rgba(255,255,255,.92),rgba(245,240,232,.92))"};transition:transform .45s cubic-bezier(.16,1,.3,1),box-shadow .45s,border-color .45s}.pcard:hover{transform:translateY(-8px);border-color:${ac}66;box-shadow:0 24px 60px rgba(0,0,0,${dk?.5:.18}),0 0 40px ${ac}1f}
.pmedia{position:relative;height:170px;overflow:hidden}.pmedia img{width:100%;height:100%;object-fit:cover;transition:transform 1.1s cubic-bezier(.16,1,.3,1);transform:scale(1.05)}.pcard:hover .pmedia img{transform:scale(1.16)}
.gb{position:relative;overflow:hidden}.gb::after{content:'';position:absolute;top:0;left:0;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);transform:translateX(-140%) skewX(-18deg);pointer-events:none}.gb:hover::after{animation:shineSweep 1s ease}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:30px;border:1px solid ${ac}33;background:${ac}0d;font-size:12px;color:${ac};font-weight:600}
.gc{background:${dk?"linear-gradient(135deg,rgba(18,18,38,.75),rgba(12,12,28,.55))":"linear-gradient(135deg,rgba(255,255,255,.88),rgba(245,240,232,.72))"};backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid ${dk?"rgba(200,169,106,.1)":"rgba(147,118,64,.12)"};border-radius:22px;padding:28px;position:relative;overflow:hidden;transition:background .4s}.gc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${ac}44,transparent)}
.gi{width:100%;background:${dk?"rgba(8,8,18,.7)":"rgba(255,255,255,.75)"};border:1px solid ${dk?"rgba(200,169,106,.18)":"rgba(147,118,64,.18)"};border-radius:14px;padding:16px 20px;color:${tm};font-size:17px;font-family:inherit;outline:none;transition:all .4s}.gi::placeholder{color:${ts}}.gi:focus{border-color:${ac}88;box-shadow:0 0 30px ${ac}12}
.gb{width:100%;padding:17px 30px;background:linear-gradient(135deg,${dk?"#c8a96a":"#b8942e"},${dk?"#b8942e":"#937640"},${dk?"#c8a96a":"#b8942e"});background-size:200% 100%;color:${dk?"#080812":"#fff"};font-family:inherit;font-size:17px;font-weight:600;border:none;border-radius:14px;cursor:pointer;transition:all .4s;letter-spacing:.5px}.gb:hover{background-position:100% 0;box-shadow:0 8px 40px ${ac}44;transform:translateY(-2px)}.gb:active{transform:translateY(0)}.gb:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none}
.ghost{padding:13px 24px;background:transparent;color:${ac};font-family:inherit;font-size:15px;font-weight:500;border:1px solid ${ac}44;border-radius:12px;cursor:pointer;transition:all .3s}.ghost:hover{background:${ac}0e;border-color:${ac}88}
.orb{width:60px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle at 30% 30%,${ac}1a,${ac}06);border:1px solid ${ac}33;font-size:23px;font-weight:700;color:${ac};animation:glow 5s ease-in-out infinite;flex-shrink:0;cursor:pointer;transition:all .3s}.orb:hover{transform:scale(1.1)}
.tbar{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:${dk?"rgba(8,8,18,.85)":"rgba(245,240,232,.92)"};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid ${ac}0a;transition:background .4s}
.tbtn{padding:6px 11px;background:${dk?"rgba(18,18,38,.8)":"rgba(255,255,255,.7)"};border:1px solid ${ac}1a;border-radius:8px;color:${ac};font-size:11px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit}.tbtn:hover{background:${ac}12}.tbtn.act{background:${ac}1a;border-color:${ac}55}
.home-btn{padding:6px 14px;background:${dk?"rgba(200,169,106,.08)":"rgba(147,118,64,.06)"};border:1px solid ${ac}33;border-radius:8px;color:${ac};font-size:12px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit;display:flex;align-items:center;gap:5px}.home-btn:hover{background:${ac}1a;border-color:${ac}66;transform:scale(1.02)}
.tabs{display:flex;gap:2px;padding:2px;background:${dk?"rgba(18,18,38,.4)":"rgba(0,0,0,.03)"};border-radius:12px;margin-bottom:22px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.ti{flex:1;text-align:center;padding:10px 6px;border-radius:10px;font-size:12px;font-weight:${isRtl?600:500};cursor:pointer;transition:all .3s;color:${ts};border:1px solid transparent;white-space:nowrap}.ti.act{background:${dk?"rgba(200,169,106,.08)":"rgba(147,118,64,.06)"};color:${ac};border-color:${ac}28}
.rrow{display:flex;align-items:center;gap:16px;padding:14px 8px;border-bottom:1px solid ${ac}06;transition:background .3s;border-radius:10px}.rrow:hover{background:${ac}04}.rrow:last-child{border-bottom:none}
.badge{display:inline-block;padding:4px 11px;background:${ac}0a;border:1px solid ${ac}15;border-radius:16px;font-size:11px;color:${ac}bb;margin-top:2px}
.divider{height:1px;background:linear-gradient(90deg,transparent,${ac}33,transparent);margin:20px 0}
.si{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:26}.sd{width:10px;height:10px;border-radius:50%;background:${ac}12;border:1px solid ${ac}1a;transition:all .5s}.sd.act{background:${ac};box-shadow:0 0 10px ${ac}55;width:12px;height:12px}.sl{width:36px;height:1px;background:${ac}1a}
.nar-line{font-size:16px;line-height:2.2;color:${dk?"rgba(232,224,208,.55)":"rgba(0,0,0,.45)"};font-style:italic;text-align:center;margin:14px 0}
.rec-card{padding:16px;background:${dk?"rgba(18,18,38,.5)":"rgba(255,255,255,.45)"};border:1px solid ${ac}10;border-radius:14px;margin-bottom:10px;transition:all .3s}.rec-card:hover{border-color:${ac}33}
.ritual-item{padding:16px;background:${dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)"};border:1px solid ${ac}0a;border-radius:12px;text-align:center}
@media(max-width:600px){.gc{padding:22px 14px;border-radius:18px}.gb{padding:15px 22px;font-size:15px}.orb{width:50px;height:50px;font-size:19px}.nar-line{font-size:14px;line-height:2}}
`}</style>

    {intro&&<Intro onDone={()=>setIntro(false)} he={he} dk={dk}/>}
    <div className="nebula" style={{width:"55vw",height:"55vw",top:"-12vh",[isRtl?"right":"left"]:"-12vw",background:`radial-gradient(circle,${ac}66,transparent 70%)`,animation:"drift 26s ease-in-out infinite"}}/>
    <div className="nebula" style={{width:"48vw",height:"48vw",bottom:"-10vh",[isRtl?"left":"right"]:"-10vw",background:`radial-gradient(circle,${dk?"#5b3fa6":"#b98cf0"}55,transparent 70%)`,animation:"drift2 32s ease-in-out infinite"}}/>
    <div className="nebula" style={{width:"40vw",height:"40vw",top:"40vh",left:"30vw",background:`radial-gradient(circle,${dk?"#1f5e8c":"#7fb6e0"}40,transparent 70%)`,animation:"drift 38s ease-in-out infinite reverse"}}/>
    <Particles dk={dk}/>
    <CursorAura dk={dk}/>
    <ScrollProgress dk={dk}/>

    {/* ═══ TOP BAR with HOME BUTTON ═══ */}
    <div className="tbar">
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <button className="home-btn" onClick={goHome}>
          <span style={{fontSize:14}}>✦</span>
          <span>{he?"בית":"Home"}</span>
        </button>
      </div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {streak>1&&<span style={{fontSize:10,color:ac,opacity:.6,display:"inline-flex",alignItems:"center",gap:3}}><Icon name="flame" size={12}/>{streak}</span>}
        <button className="tbtn" onClick={()=>{setLang(lang==="he"?"en":"he");AU.init();AU.p("click");}}>{he?"EN":"עב"}</button>
        <button className="tbtn" onClick={()=>{setDk(!dk);AU.init();AU.p("click");}} style={{display:"inline-flex",alignItems:"center"}}>{dk?<Icon name="sun" size={14}/>:<Icon name="moon" size={14}/>}</button>
        <button className={`tbtn ${snd?"act":""}`} onClick={()=>{AU.init();setSnd(!snd);AU.p("click");}} style={{display:"inline-flex",alignItems:"center"}}>{snd?<Icon name="soundOn" size={14}/>:<Icon name="soundOff" size={14}/>}</button>
        {owner&&<button className="tbtn act" title={he?"מעבר בין סטודיו לתצוגת לקוח":"Toggle Studio / Customer"} onClick={()=>{const next=!previewCustomer;setPreviewCustomer(next);if(next){setTab("reading");setShowRes(false);}AU.init();AU.p("click");window.scrollTo({top:0,behavior:"smooth"});}} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name={previewCustomer?"crown":"eye"} size={13}/><span style={{fontSize:10.5,fontWeight:700}}>{previewCustomer?(he?"סטודיו":"Studio"):(he?"תצוגת לקוח":"Customer")}</span></button>}
        <button className={`tbtn ${owner?"":"act"}`} title={owner?(he?"יציאה ממצב בעל עסק":"Exit owner mode"):(he?"כניסת בעל עסק":"Owner login")} onClick={()=>{AU.init();AU.p("click");owner?exitOwner():enterOwner();}} style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name={owner?"door":"crown"} size={13}/><span style={{fontSize:10.5,fontWeight:700}}>{owner?(he?"יציאה":"Exit"):(he?"סטודיו":"Studio")}</span></button>
      </div>
    </div>

    <div style={{position:"relative",zIndex:1,maxWidth:showOwnerUI?600:1040,margin:"0 auto",padding:"62px 20px 70px",minHeight:"100vh"}}>

      {/* Header (owner) / Hero (customer) */}
      {showOwnerUI?(
        <div style={{textAlign:"center",marginBottom:18,animation:"fadeInUp .6s ease-out"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:9,color:ac}}><Icon name="crown" size={20}/><h1 style={{fontSize:isRtl?28:32,fontWeight:700,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"הסטודיו שלי":"My Studio"}</h1></div>
          <p style={{fontSize:12.5,color:ts,marginTop:5}}>{he?"כל הכלים שלך — בחר מסך:":"All your tools — choose a screen:"}</p>
        </div>
      ):(
        <>
          <Hero he={he} dk={dk} onStart={()=>scrollToId("reading-section")} onShop={()=>scrollToId("shop-section")} onUseName={(n)=>{AU.init();AU.p("click");setName(n);setStep(2);setTimeout(()=>scrollToId("reading-section"),60);}} onReveal={(n,d)=>{setName(n);setDob(d);setStep(2);const ok=runReading(n,d,addOne);if(ok)setTimeout(()=>scrollToId("reading-section"),90);}}/>
          <HowItWorks he={he} dk={dk}/>
          <div style={{textAlign:"center",margin:"4px 0 14px"}}><span style={{fontSize:11,color:`${ac}99`,textTransform:"uppercase",letterSpacing:3}}>{he?"✦ קריאה חינמית · נסה עכשיו ✦":"✦ Free reading · try now ✦"}</span></div>
        </>
      )}
      <div id="reading-section" style={{scrollMarginTop:70}}/>

      {/* ═══ STUDIO NAV (owner — always visible) ═══ */}
      {showOwnerUI&&<div className="tabs" style={{animation:"fadeInUp .5s ease-out .1s both",marginBottom:18}}>
        {[{k:"reading",i:"orb",l:he?"קריאה":"Reading"},{k:"shop",i:"cart",l:he?"חנות":"Shop"},{k:"tables",i:"chart",l:he?"טבלאות":"Tables"},{k:"match",i:"heart",l:he?"התאמה":"Match"},{k:"daily",i:"sun",l:he?"יומי":"Daily"},{k:"cards",i:"cards",l:he?"קלפים":"Cards"},{k:"calc",i:"calculator",l:he?"מחשבונים":"Calculators"}].map(tb=>(
          <div key={tb.k} className={`ti ${tab===tb.k?"act":""}`} onClick={()=>{setTab(tb.k);AU.init();AU.p("click");if(tb.k!=="reading")setShowRes(false);}}><span style={{display:"inline-flex",alignItems:"center",gap:5,justifyContent:"center"}}><Icon name={tb.i} size={14} stroke={1.4}/>{tb.l}</span></div>
        ))}
      </div>}

      {/* ═══ INPUT TABS ═══ */}
      {!showRes&&(<>
        {/* Studio nav rendered above (always visible in owner mode) */}

        {showOwnerUI&&tab==="shop"&&<ShopSection he={he} dk={dk}/>}

        {tab==="tables"&&<TablesWidget he={he} dk={dk}/>}

        {tab==="calc"&&<CalculatorsWidget he={he} dk={dk}/>}

        {tab==="match"&&<CompatWidget he={he} dk={dk}/>}

        {tab==="daily"&&(
          <div className="gc" style={{animation:"fadeInUp .5s ease-out"}}>
            <AffirmWidget he={he} dk={dk}/>
            <div className="divider"/>
            <RitualWidget number={((new Date().getDate()%9)||9)} he={he} dk={dk}/>
          </div>
        )}

        {tab==="cards"&&(
          <div className="gc" style={{animation:"fadeInUp .5s ease-out"}}>
            <p style={{textAlign:"center",fontSize:12,color:ts,marginBottom:14}}>{he?"לחץ להפיכה":"Tap to flip"}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,justifyItems:"center"}}>
              {[1,2,3,4,5,6,7,8,9].map(n=><TarotCard key={n} number={n} dk={dk}/>)}
            </div>
          </div>
        )}

        {(tab==="reading"||!showOwnerUI)&&(
          <div style={{animation:"fadeInUp .6s ease-out",maxWidth:620,margin:"0 auto"}}>
            <div className="si"><div className={`sd ${step>=1?"act":""}`}/><div className="sl"/><div className={`sd ${step>=2?"act":""}`}/></div>
            {step===1&&(<div className="gc" style={{animation:"fadeInUp .5s ease-out"}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:10,color:`${ac}66`,textTransform:"uppercase",letterSpacing:4,marginBottom:5}}>{he?"שלב 1":"Step 1"}</div>
                <h2 style={{fontSize:isRtl?24:26,fontWeight:isRtl?600:400,color:tm}}>{he?"מי את/ה?":"Who are you?"}</h2>
              </div>
              <label style={{display:"block",marginBottom:8,fontSize:12,color:`${ac}99`,fontWeight:500}}>{he?"שם מלא":"Full Name"}</label>
              <input className="gi" placeholder={he?"הכנס את שמך בעברית...":"Enter your name in Hebrew..."} value={name} onChange={e=>setName(e.target.value)} dir="rtl" style={{marginBottom:24,textAlign:"right"}} onKeyDown={e=>{if(e.key==="Enter"&&name.trim()){setStep(2);AU.init();AU.p("click");}}}/>
              <button className="gb" disabled={!name.trim()} onClick={()=>{setStep(2);AU.init();AU.p("click");}}>{he?"המשך ←":"Continue →"}</button>
            </div>)}
            {step===2&&(<div className="gc" style={{animation:"fadeInUp .5s ease-out"}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:10,color:`${ac}66`,textTransform:"uppercase",letterSpacing:4,marginBottom:5}}>{he?"שלב 2":"Step 2"}</div>
                <h2 style={{fontSize:isRtl?24:26,fontWeight:isRtl?600:400,color:tm}}>{he?"מתי נולדת?":"When were you born?"}</h2>
              </div>
              <label style={{display:"block",marginBottom:8,fontSize:12,color:`${ac}99`,fontWeight:500}}>{he?"תאריך לידה":"Date of Birth"}</label>
              <input className="gi" placeholder="dd.mm.yyyy" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" style={{marginBottom:18,textAlign:"center",letterSpacing:3,fontFamily:"'Cormorant Garamond',serif"}} onKeyDown={e=>{if(e.key==="Enter"&&dob.trim())doCalc();}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none",marginBottom:24}} onClick={()=>setAddOne(!addOne)}>
                <div style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${ac}44`,background:addOne?`${ac}1a`:dk?"rgba(8,8,18,.6)":"rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>{addOne&&<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke={ac} strokeWidth="2" strokeLinecap="round"/></svg>}</div>
                <span style={{fontSize:13,color:ts}}>{he?"הוסף 1 לשנה אישית":"Add 1 to personal year"}</span>
              </div>
              {error&&<div style={{padding:"10px 14px",background:"rgba(180,50,50,.12)",border:"1px solid rgba(180,50,50,.25)",borderRadius:10,color:"#e8a0a0",fontSize:13,marginBottom:16,textAlign:"center"}}>{error}</div>}
              <div style={{display:"flex",gap:10}}>
                <button className="ghost" onClick={()=>{setStep(1);AU.p("click");}}>{he?"→ חזרה":"← Back"}</button>
                <button className="gb" disabled={!dob.trim()} onClick={doCalc} style={{flex:1}}>{he?"גלה את הייעוד שלך":"Reveal Your Destiny"}</button>
              </div>
            </div>)}
          </div>
        )}
      </>)}

      {/* ═══ NARRATIVE RESULTS ═══ */}
      {showRes&&results&&(<div style={{maxWidth:640,margin:"0 auto"}}>
        <SR><div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:5,marginBottom:6}}>{he?"הקריאה של":"The reading of"}</div>
          <div style={{fontSize:isRtl?26:30,fontWeight:isRtl?700:400,color:ac,fontFamily:"'Cormorant Garamond',serif",letterSpacing:isRtl?0:3}}>{name}</div>
        </div></SR>
        <SR><div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
          {chapterDefs.map((_,i)=>(<div key={i} style={{width:chapters[i]?28:10,height:4,borderRadius:2,background:chapters[i]?ac:`${ac}1a`,transition:"all .5s ease"}}/>))}
        </div></SR>

        {/* CHAPTER 1 */}
        <Chapter index={1} title={chapterDefs[0]?.title} subtitle={chapterDefs[0]?.sub} icon={chapterDefs[0]?.icon} isActive={nextUnrevealed===0} isRevealed={chapters[0]} onReveal={()=>revealChapter(0)} dk={dk}>
          <div style={{textAlign:"center",marginBottom:20}}><TarotCard number={results.lp||1} dk={dk} flipped={true} size="lg"/></div>
          <p className="nar-line">{he?D[results.lp]?.narrative:D[results.lp]?.narrativeE}</p>
          <div className="divider"/>
          {[{l:he?"ערך השם":"Name Value",v:results.nv},{l:he?"שביל הגורל":"Life Path",v:results.lp},{l:he?"קול הנשמה":"Soul Urge",v:results.su},{l:he?"מספר הביטוי":"Expression",v:results.ex}].map((it,i)=>(
            <div key={i} className="rrow"><div className="orb"><AN value={it.v} delay={i*200}/></div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:isRtl?600:500,color:tm}}>{it.l}</div>{it.v>0&&it.v<=9&&<div className="badge">{he?D[it.v]?.t:D[it.v]?.te}</div>}</div></div>
          ))}
        </Chapter>

        {/* CHAPTER 2 */}
        <Chapter index={2} title={chapterDefs[1]?.title} subtitle={chapterDefs[1]?.sub} icon={chapterDefs[1]?.icon} isActive={nextUnrevealed===1} isRevealed={chapters[1]} onReveal={()=>revealChapter(1)} dk={dk}>
          <p className="nar-line">{he?"שביל הגורל שלך מספר "+results.lp+" חושף את הייעוד העמוק שלך":"Your Life Path "+results.lp+" reveals your deepest purpose"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"16px 0"}}>
            <div style={{padding:"16px",background:dk?"rgba(180,50,50,.06)":"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.12)",borderRadius:14,textAlign:"center"}}><div style={{color:"#d98a8a",marginBottom:7,display:"flex",justifyContent:"center"}}><Icon name="moon" size={18}/></div><div style={{fontSize:11,fontWeight:600,color:"#e88",marginBottom:4}}>{he?"צד צל":"Shadow"}</div><div style={{fontSize:12,lineHeight:1.7,color:ts}}>{he?D[results.lp]?.shadow:D[results.lp]?.shadowE}</div></div>
            <div style={{padding:"16px",background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:14,textAlign:"center"}}><div style={{color:ac,marginBottom:7,display:"flex",justifyContent:"center"}}><Icon name="seed" size={18}/></div><div style={{fontSize:11,fontWeight:600,color:ac,marginBottom:4}}>{he?"צמיחה":"Growth"}</div><div style={{fontSize:12,lineHeight:1.7,color:ts}}>{he?D[results.lp]?.growth:D[results.lp]?.growthE}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
            {[{i:"gem",l:he?"אבן":"Stone",v:D[results.lp]?.stone},{i:"orb",l:he?"קריסטל":"Crystal",v:D[results.lp]?.crystal},{i:"palette",l:he?"צבע":"Color",v:D[results.lp]?.color},{i:"calendar",l:he?"יום מזל":"Lucky Day",v:D[results.lp]?.luck}].map((it,i)=>(
              <div key={i} style={{padding:"12px",background:dk?"rgba(18,18,38,.35)":"rgba(255,255,255,.4)",border:`1px solid ${ac}0a`,borderRadius:11,textAlign:"center"}}><div style={{color:ac,display:"flex",justifyContent:"center",marginBottom:3}}><Icon name={it.i} size={18}/></div><div style={{fontSize:9,color:ts,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{it.l}</div><div style={{fontSize:12,fontWeight:600,color:ac,marginTop:2}}>{it.v}</div></div>
            ))}
          </div>
          {results.kd.length>0&&(<div style={{marginTop:16}}><div className="divider"/><div style={{textAlign:"center",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{color:"#e88",display:"inline-flex"}}><Icon name="bolt" size={18}/></span><span style={{fontSize:15,fontWeight:600,color:"#e88"}}>{he?"חוב קארמי":"Karmic Debt"}</span></div>{results.kd.map(k=><div key={k} style={{padding:"14px",background:"rgba(180,50,50,.05)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,marginBottom:8}}><div style={{fontSize:13,lineHeight:1.8,color:ts}}><strong style={{color:"#e88"}}>{k}</strong> — {KARMA[k]?.[he?"he":"en"]}</div></div>)}</div>)}
          {results.kd.length===0&&(<div style={{textAlign:"center",marginTop:14,padding:"14px",background:`${ac}06`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{color:ac,display:"inline-flex"}}><Icon name="dove" size={18}/></span><span style={{fontSize:13,color:ts}}>{he?"אין חוב קארמי":"No karmic debt"}</span></div>)}
        </Chapter>

        {/* CHAPTER 3 */}
        <Chapter index={3} title={chapterDefs[2]?.title} subtitle={chapterDefs[2]?.sub} icon={chapterDefs[2]?.icon} isActive={nextUnrevealed===2} isRevealed={chapters[2]} onReveal={()=>revealChapter(2)} dk={dk}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            {[{l:he?"יום":"Day",v:results.pd},{l:he?"חודש":"Month",v:results.pm},{l:he?"שנה":"Year",v:results.py}].map((it,i)=>(
              <div key={i} style={{textAlign:"center",padding:"18px 8px",background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}0a`,borderRadius:14}}><div style={{fontSize:9,color:ts,textTransform:"uppercase",letterSpacing:1}}>{it.l}</div><div style={{fontSize:32,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif",margin:"4px 0"}}><AN value={it.v} delay={i*200}/></div><div style={{fontSize:11,color:D[it.v]?.c||ac,opacity:.7}}>{he?D[it.v]?.t:D[it.v]?.te}</div></div>
            ))}
          </div>
          <div style={{textAlign:"center",padding:"16px",background:`${ac}06`,borderRadius:14,marginBottom:16}}><p style={{fontSize:14,lineHeight:1.9,color:ts}}>{YEAR_ENERGY[results.py]?.[he?"he":"en"]}</p></div>
          <div className="divider"/><RitualWidget number={results.pd} he={he} dk={dk}/>
        </Chapter>

        {/* CHAPTER 4 */}
        <Chapter index={4} title={chapterDefs[3]?.title} subtitle={chapterDefs[3]?.sub} icon={chapterDefs[3]?.icon} isActive={nextUnrevealed===3} isRevealed={chapters[3]} onReveal={()=>revealChapter(3)} dk={dk}>
          <p className="nar-line">{he?"גלול קדימה כדי לראות את האנרגיה שלך ב-10 השנים הקרובות":"Scroll forward to see your energy over the next 10 years"}</p>
          <YearWave proj={results.proj} dk={dk} he={he}/>
          <div className="divider"/>
          <div style={{textAlign:"center",marginBottom:14}}><h4 style={{fontSize:17,fontWeight:isRtl?600:400,color:ac}}>{he?"מחזורי חיים":"Life Cycles"}</h4></div>
          {[he?"חיפוש":"Search",he?"מציאה":"Discovery",he?"יתד":"Anchor",he?"שיא":"Summit"].map((label,i)=>{const sa=results.exit+i*9;const active=results.age>=sa&&results.age<sa+9;return(<div key={i} style={{padding:"14px 16px",background:active?`${ac}0a`:"transparent",border:`1px solid ${active?ac+"33":ac+"08"}`,borderRadius:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all .3s"}}><div><div style={{fontSize:15,fontWeight:600,color:active?ac:tm}}>{label}</div><div style={{fontSize:10,color:ts}}>{he?"גילאים":"Ages"} {sa}–{sa+9}</div></div><div style={{display:"flex",gap:8}}><div style={{textAlign:"center"}}><div style={{fontSize:8,color:ts}}>{he?"פסגה":"Peak"}</div><div style={{fontSize:20,fontWeight:700,color:ac}}>{results.pk[i]}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:8,color:ts}}>{he?"אתגר":"Chal."}</div><div style={{fontSize:20,fontWeight:700,color:ts}}>{results.ch[i]}</div></div></div>{active&&<div style={{padding:"2px 8px",background:`${ac}15`,border:`1px solid ${ac}33`,borderRadius:8,fontSize:8,color:ac,letterSpacing:1,textTransform:"uppercase"}}>{he?"עכשיו":"NOW"}</div>}</div>);})}
          <div className="divider"/><div style={{textAlign:"center",marginBottom:12}}><h4 style={{fontSize:17,fontWeight:isRtl?600:400,color:ac}}>Lo Shu Grid</h4></div><LoShu ls={results.ls} dk={dk} he={he}/>
        </Chapter>

        {/* CHAPTER 5 */}
        <Chapter index={5} title={chapterDefs[4]?.title} subtitle={chapterDefs[4]?.sub} icon={chapterDefs[4]?.icon} isActive={nextUnrevealed===4} isRevealed={chapters[4]} onReveal={()=>revealChapter(4)} dk={dk}>
          <p className="nar-line">{he?"המפה הפסיכולוגית שלך":"Your psychological map"}</p>
          <PsychRadar psych={results.psych} dk={dk} he={he}/>
          {(()=>{const max=Object.entries(results.psych).sort((a,b)=>b[1]-a[1])[0];const names={leadership:he?"מנהיגות":"Leadership",intuition:he?"אינטואיציה":"Intuition",creativity:he?"יצירתיות":"Creativity",stability:he?"יציבות":"Stability",ambition:he?"שאיפה":"Ambition",wisdom:he?"חכמה":"Wisdom"};return(<div style={{textAlign:"center",marginTop:14,padding:"14px",background:`${ac}06`,borderRadius:12}}><div style={{fontSize:13,fontWeight:600,color:ac,marginBottom:4}}>{he?"הכוח הדומיננטי שלך":"Your dominant strength"}</div><div style={{fontSize:22,fontWeight:700,color:ac}}>{names[max[0]]} — {max[1]}/10</div></div>);})()}
        </Chapter>

        {/* CHAPTER 6 */}
        <Chapter index={6} title={chapterDefs[5]?.title} subtitle={chapterDefs[5]?.sub} icon={chapterDefs[5]?.icon} isActive={nextUnrevealed===5} isRevealed={chapters[5]} onReveal={()=>revealChapter(5)} dk={dk}>
          <p className="nar-line">{he?"תובנות מותאמות אישית":"Personalized insights"}</p>
          {getRecommendations(results,lang).map((rec,i)=>(<div key={i} className="rec-card"><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{color:ac,display:"inline-flex"}}><Icon name={rec.icon} size={20}/></span><span style={{fontSize:15,fontWeight:600,color:ac}}>{rec.t}</span></div><p style={{fontSize:13,lineHeight:1.8,color:ts}}>{rec.d}</p></div>))}
          <div className="divider"/>
          <div style={{textAlign:"center",marginBottom:14}}><div style={{color:ac,display:"flex",justifyContent:"center"}}><Icon name="target" size={22} stroke={1.3}/></div><div style={{fontSize:15,fontWeight:600,color:ac,marginTop:4}}>{he?"קריירות מתאימות":"Ideal Careers"}</div><div style={{fontSize:14,color:ts,marginTop:6,lineHeight:1.8}}>{D[results.lp]?.career}</div></div>
        </Chapter>

        {chapters[5]&&(<SR delay={150}>
          <div className="gc" style={{marginTop:26,textAlign:"center",border:`1px solid ${ac}44`,background:dk?`linear-gradient(135deg,${ac}10,rgba(12,12,28,.6))`:`linear-gradient(135deg,${ac}10,rgba(255,255,255,.7))`}}>
            <div style={{fontSize:30,marginBottom:8}}>✦</div>
            <h3 style={{fontSize:isRtl?21:23,fontWeight:isRtl?700:500,color:ac,fontFamily:"'Cormorant Garamond',serif",marginBottom:6}}>{he?"רוצה לרדת לעומק?":"Want to go deeper?"}</h3>
            <p style={{fontSize:13.5,lineHeight:1.85,color:ts,maxWidth:420,margin:"0 auto 18px"}}>{he?`${name?name+", ":""}הקריאה החינמית היא רק ההתחלה. אני יכול להכין לך מפה נומרולוגית אישית מלאה, או לצלול יחד איתך בשיחה אישית — על מטרת החיים, יחסים, קריירה ותזמון.`:`${name?name+", ":""}this free reading is just the start. I can prepare your full personal numerology map, or dive deep together in a 1-on-1 call — life purpose, relationships, career and timing.`}</p>
            {(()=>{const recId=[2,6].includes(results.lp)?"couple":[3,5].includes(results.lp)?"name":[1,8].includes(results.lp)?"deep-consult":"full-map";const rp=findProduct(recId);return rp?(
              <div style={{margin:"0 auto 16px",maxWidth:430,padding:"12px 16px",borderRadius:14,border:`1px solid ${ac}44`,background:`${ac}0d`,display:"flex",alignItems:"center",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <span style={{color:ac,display:"inline-flex"}}><Icon name="sparkles" size={18}/></span>
                <span style={{fontSize:12.5,color:tm,lineHeight:1.6}}>{he?`מומלץ עבורך (מספר ${results.lp}): `:`Recommended for you (number ${results.lp}): `}<strong style={{color:ac}}>{he?rp.name.he:rp.name.en}</strong> · {he?rp.price.he:rp.price.en}</span>
                <button className="gb" onClick={()=>goToCheckout(rp)} style={{width:"auto",padding:"8px 16px",fontSize:12.5}}>{he?"לרכישה ←":"Get it →"}</button>
              </div>):null;})()}
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="gb" onClick={()=>goToCheckout(findProduct("full-map"))} style={{width:"auto",padding:"13px 22px",fontSize:14}}><span style={{display:"inline-flex",alignItems:"center",gap:8,justifyContent:"center"}}><Icon name="map" size={16}/>{he?"הזמן מפה אישית מלאה":"Order full map"}</span></button>
              <button className="gb" onClick={()=>goToCheckout(findProduct("deep-consult"))} style={{width:"auto",padding:"13px 22px",fontSize:14}}><span style={{display:"inline-flex",alignItems:"center",gap:8,justifyContent:"center"}}><Icon name="star" size={16}/>{he?"קבע שיחה 1:1":"Book a 1:1 call"}</span></button>
            </div>
            <div style={{marginTop:12}}>
              <button className="ghost" onClick={()=>{AU.init();AU.p("click");setShowRes(false);setTab("shop");window.scrollTo({top:0,behavior:"smooth"});}} style={{fontSize:13}}>{he?"לכל המוצרים בחנות ←":"See all products →"}</button>
            </div>
          </div>
        </SR>)}
        {chapters[5]&&(<SR delay={250}><div style={{display:"flex",gap:10,justifyContent:"center",marginTop:18,flexWrap:"wrap"}}>
          <button className="gb" onClick={()=>{AU.init();AU.p("chapter");exportReport(results,name,he,D);}} style={{width:"auto",padding:"12px 24px",fontSize:14}}><span style={{display:"inline-flex",alignItems:"center",gap:8,justifyContent:"center"}}><Icon name="share" size={15}/>{he?"שמור דו״ח":"Save Report"}</span></button>
          <button className="ghost" onClick={goHome}>{he?"קריאה חדשה":"New Reading"}</button>
        </div></SR>)}
      </div>)}

      {/* ═══ CUSTOMER LANDING SECTIONS ═══ */}
      {!showOwnerUI&&(<>
        <div style={{height:10}}/>
        <div style={{maxWidth:760,margin:"0 auto"}}><AboutShani he={he} dk={dk} onBook={()=>scrollToId("shop-section")}/></div>
        <div style={{maxWidth:760,margin:"0 auto"}}><WhyNumerology he={he} dk={dk}/></div>
        <div style={{maxWidth:920,margin:"0 auto"}}><SampleMap he={he} dk={dk} onBuy={()=>scrollToId("shop-section")}/></div>
        <CtaBand he={he} dk={dk} onShop={()=>scrollToId("shop-section")}/>
        <div id="shop-section" style={{scrollMarginTop:70}}/>
        <ShopSection he={he} dk={dk} onAdd={addToCart} cart={cart}/>
        <TrustBar he={he} dk={dk}/>
        <div style={{maxWidth:920,margin:"0 auto"}}><Testimonials he={he} dk={dk}/></div>
        <div style={{maxWidth:620,margin:"0 auto"}}><LeadCapture he={he} dk={dk}/></div>
        <div style={{maxWidth:760,margin:"0 auto"}}><FAQ he={he} dk={dk}/></div>
        <LandingFooter he={he} dk={dk} onOwner={enterOwner}/>
      </>)}

      {showOwnerUI&&<div style={{marginTop:40,textAlign:"center",fontSize:10,color:`${ac}15`,letterSpacing:3}}>✦ ✦ ✦</div>}
    </div>

    {/* ═══ CART (customer only) ═══ */}
    {!showOwnerUI&&(<>
      <FloatingWhatsApp he={he}/>
      <FloatingCart he={he} dk={dk} cart={cart} onOpen={()=>{AU.init();AU.p("click");setCartOpen(true);}}/>
      <CartDrawer he={he} dk={dk} cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)} onQty={setQty} onRemove={removeFromCart} onClear={clearCart}/>
    </>)}

    {/* Owner controls now live in the top bar */}
  </div>);
}

// ═══════════════════ COMPAT WIDGET ═══════════════════
// ═══════════════════ COMPATIBILITY DATA ═══════════════════
const LP_COMPAT = {
  "1-1":{he:{con:"שני מנהיגים חזקים — כוח אדיר כשפועלים יחד",ch:"מאבקי אגו ותחרות על שליטה",tip:"למדו לחלק תחומי אחריות ולתת כבוד לעצמאות של כל אחד"},en:{con:"Two strong leaders — immense power together",ch:"Ego battles and competition for control",tip:"Learn to divide responsibilities and respect each other's independence"}},
  "1-2":{he:{con:"מנהיג ומגשר — שילוב מושלם של כוח ורגישות",ch:"ה-1 עלול לדרוס את ה-2 הרגיש, ה-2 עלול להרגיש בלתי נראה",tip:"ה-1 צריך להאט ולהקשיב, ה-2 צריך לבטא צרכים בבירור"},en:{con:"Leader and mediator — perfect blend of strength and sensitivity",ch:"The 1 may overpower the sensitive 2",tip:"The 1 needs to slow down and listen, the 2 needs to express needs clearly"}},
  "1-3":{he:{con:"אנרגיה גבוהה, יצירתיות ופעולה — זוג מלהיב",ch:"שניהם רוצים תשומת לב ועלולים להתפזר",tip:"מקדו את האנרגיה המשותפת לפרויקטים יצירתיים"},en:{con:"High energy, creativity and action — exciting pair",ch:"Both want attention and may scatter",tip:"Focus shared energy on creative projects"}},
  "1-4":{he:{con:"חזון ומעשה — ה-1 מוביל וה-4 בונה",ch:"ה-1 חסר סבלנות, ה-4 איטי ושיטתי — חיכוכים בקצב",tip:"כבדו את הקצב השונה — שניכם חיוניים להצלחה"},en:{con:"Vision and action — the 1 leads, the 4 builds",ch:"The 1 is impatient, the 4 is slow and methodical",tip:"Respect the different pace — you're both essential"}},
  "1-5":{he:{con:"הרפתקה, חופש ואנרגיה בלתי נגמרת — שילוב מרגש",ch:"שניהם לא אוהבים שגרה — מי מייצב?",tip:"צרו בסיס יציב שממנו אתם יוצאים להרפתקאות"},en:{con:"Adventure, freedom and endless energy",ch:"Neither likes routine — who stabilizes?",tip:"Create a stable base from which you launch adventures"}},
  "1-6":{he:{con:"ה-1 מוביל בחוץ, ה-6 מנהל את הבית — שותפות קלאסית",ch:"ה-1 עלול להזניח את הבית, ה-6 עלול להרגיש מנוצל",tip:"איזון בין שאיפות אישיות לצרכי המשפחה"},en:{con:"The 1 leads outside, the 6 manages home — classic partnership",ch:"The 1 may neglect home, the 6 may feel exploited",tip:"Balance personal ambitions with family needs"}},
  "1-7":{he:{con:"פעולה ומחשבה — שילוב עוצמתי של עשייה וחכמה",ch:"ה-1 חיצוני, ה-7 פנימי — קושי בתקשורת רגשית",tip:"תנו מרחב זה לזה ומצאו שפה משותפת"},en:{con:"Action and thought — powerful blend of doing and wisdom",ch:"The 1 is external, the 7 is internal — emotional communication gap",tip:"Give each other space and find a common language"}},
  "1-8":{he:{con:"שני כוחות — יחד יכולים לכבוש עולמות",ch:"מאבקי כוח אינטנסיביים, שניהם רוצים לשלוט",tip:"הפנו את הכוח החוצה — לפרויקטים משותפים, לא אחד נגד השני"},en:{con:"Two powerhouses — together they can conquer worlds",ch:"Intense power struggles, both want control",tip:"Direct power outward — to shared projects, not against each other"}},
  "1-9":{he:{con:"ה-1 מתחיל, ה-9 משלים — מעגל שלם",ch:"ה-9 גדול מדי לדברים קטנים, ה-1 לא תמיד רואה את התמונה הגדולה",tip:"למדו מהפרספקטיבה של השני"},en:{con:"The 1 begins, the 9 completes — a full circle",ch:"The 9 is too big for small things, the 1 doesn't always see the big picture",tip:"Learn from each other's perspective"}},
  "2-2":{he:{con:"רגישות כפולה, אמפתיה עמוקה ושותפות הרמונית",ch:"חוסר החלטיות כפול, תלות רגשית",tip:"פתחו עצמאות אישית לצד הקשר"},en:{con:"Double sensitivity, deep empathy, harmonious partnership",ch:"Double indecisiveness, emotional dependency",tip:"Develop personal independence alongside the bond"}},
  "2-3":{he:{con:"ה-2 מקשיב וה-3 מבטא — שילוב יצירתי ורגשי",ch:"ה-3 עלול להיות שטחי מדי עבור ה-2 הרגיש",tip:"ה-3 צריך להעמיק, ה-2 צריך להקל"},en:{con:"The 2 listens, the 3 expresses — creative emotional blend",ch:"The 3 may be too superficial for the sensitive 2",tip:"The 3 needs to go deeper, the 2 needs to lighten up"}},
  "2-4":{he:{con:"יציבות רגשית — שניהם מחפשים ביטחון ונאמנות",ch:"עלולים להיתקע בשגרה ולהימנע משינוי",tip:"הכניסו ספונטניות ושינוי לשגרה"},en:{con:"Emotional stability — both seek security and loyalty",ch:"May get stuck in routine and avoid change",tip:"Introduce spontaneity into the routine"}},
  "2-5":{he:{con:"ה-5 מרגש את ה-2 ומוציא אותו מאזור הנוחות",ch:"ה-2 רוצה יציבות, ה-5 רוצה חופש — מתח בסיסי",tip:"מצאו את האיזון בין הרפתקה לביטחון"},en:{con:"The 5 excites the 2 and pushes them out of comfort zone",ch:"The 2 wants stability, the 5 wants freedom — basic tension",tip:"Find balance between adventure and security"}},
  "2-6":{he:{con:"שני לבבות אוהבים — קשר מלא חום ודאגה הדדית",ch:"הקרבה עצמית כפולה — מי דואג לעצמו?",tip:"למדו לקבל, לא רק לתת"},en:{con:"Two loving hearts — warm and caring bond",ch:"Double self-sacrifice — who takes care of themselves?",tip:"Learn to receive, not just give"}},
  "2-7":{he:{con:"אינטואיציה כפולה — חיבור רוחני עמוק",ch:"שניהם פנימיים — קושי להוציא רגשות",tip:"צרו טקסים של שיתוף רגשי"},en:{con:"Double intuition — deep spiritual connection",ch:"Both are inward — difficulty expressing emotions",tip:"Create rituals for emotional sharing"}},
  "2-8":{he:{con:"ה-2 מרכך את ה-8 — כוח עם לב",ch:"ה-8 עלול לשלוט, ה-2 עלול לוותר על עצמו",tip:"ה-2 חייב לשמור על גבולות"},en:{con:"The 2 softens the 8 — power with heart",ch:"The 8 may dominate, the 2 may lose themselves",tip:"The 2 must maintain boundaries"}},
  "2-9":{he:{con:"חמלה כפולה — שניהם רוצים לתקן את העולם",ch:"מי דואג לזוגיות עצמה?",tip:"שימו את הזוגיות במרכז, לא רק אחרים"},en:{con:"Double compassion — both want to heal the world",ch:"Who takes care of the relationship itself?",tip:"Put the relationship at the center, not just others"}},
  "3-3":{he:{con:"יצירתיות כפולה, שמחה ותקשורת מצוינת",ch:"פיזור, שטחיות, בריחה מעומק",tip:"העמיקו — מאחורי השמחה יש עומק לגלות"},en:{con:"Double creativity, joy and excellent communication",ch:"Scattering, superficiality, avoidance of depth",tip:"Go deeper — behind the joy there's depth to discover"}},
  "3-4":{he:{con:"ה-3 מביא צבע וה-4 מביא מבנה — יופי מאורגן",ch:"ה-3 רואה את ה-4 משעמם, ה-4 רואה את ה-3 לא רציני",tip:"למדו להעריך את המתנה ההפוכה"},en:{con:"The 3 brings color, the 4 brings structure",ch:"The 3 sees the 4 as boring, the 4 sees the 3 as unserious",tip:"Learn to appreciate the opposite gift"}},
  "3-5":{he:{con:"חיים כמו חגיגה — יצירתיות, הרפתקה ועוצמה",ch:"אין עוגן — שניהם עפים, מי נוחת?",tip:"בנו שורשים, גם אם קטנים"},en:{con:"Life as celebration — creativity, adventure, intensity",ch:"No anchor — both fly, who lands?",tip:"Build roots, even small ones"}},
  "3-6":{he:{con:"אהבה, יופי ויצירה — בית מלא חיים",ch:"ה-6 עלול לחנוק את ה-3 החופשי",tip:"תנו מרחב יצירתי בתוך מסגרת אוהבת"},en:{con:"Love, beauty and creation — a home full of life",ch:"The 6 may smother the free 3",tip:"Give creative space within a loving framework"}},
  "3-7":{he:{con:"ביטוי ומחשבה — שילוב של אמנות ופילוסופיה",ch:"ה-3 חברתי, ה-7 בודד — קונפליקט בסיסי",tip:"כבדו את הצורך השונה — לפעמים יחד, לפעמים לבד"},en:{con:"Expression and thought — art meets philosophy",ch:"The 3 is social, the 7 is solitary — basic conflict",tip:"Respect the different needs — sometimes together, sometimes apart"}},
  "3-8":{he:{con:"כריזמה וכוח — זוג שמושך תשומת לב",ch:"שניהם אוהבים את הבמה — מי מאחורי הקלעים?",tip:"חלקו את האור הזרקורים"},en:{con:"Charisma and power — an attention-drawing couple",ch:"Both love the spotlight — who's backstage?",tip:"Share the spotlight"}},
  "3-9":{he:{con:"יצירתיות ברמה הגבוהה — שניהם מבטאים את הנשמה",ch:"רגשות חזקים מדי לפעמים — דרמה",tip:"תעלו רגשות ליצירה במקום לקונפליקט"},en:{con:"High-level creativity — both express the soul",ch:"Sometimes emotions are too intense — drama",tip:"Channel emotions into creation, not conflict"}},
  "4-4":{he:{con:"יציבות מוחלטת — בניין מוצק של אמון",ch:"נוקשות כפולה, פחד משינוי",tip:"שברו שגרה מדי פעם — זה לא מסוכן"},en:{con:"Absolute stability — solid foundation of trust",ch:"Double rigidity, fear of change",tip:"Break routine sometimes — it's not dangerous"}},
  "4-5":{he:{con:"ה-4 מעגן וה-5 מרגש — מתח יצירתי",ch:"קונפליקט בסיסי בין יציבות לחופש",tip:"ה-4 צריך להרפות, ה-5 צריך להתחייב קצת"},en:{con:"The 4 anchors, the 5 excites — creative tension",ch:"Basic conflict between stability and freedom",tip:"The 4 needs to loosen up, the 5 needs to commit a bit"}},
  "4-6":{he:{con:"בית חלומות — שניהם בונים ומטפחים",ch:"עבודת יתר למען המשפחה — שוכחים את עצמם",tip:"השקיעו גם בזוגיות, לא רק במשפחה"},en:{con:"Dream home — both build and nurture",ch:"Overworking for family — forgetting themselves",tip:"Invest in the couple, not just the family"}},
  "4-7":{he:{con:"שיטתיות ועומק — קשר אינטלקטואלי חזק",ch:"שניהם רציניים מדי — איפה הקלילות?",tip:"הכניסו צחוק והנאה"},en:{con:"Method and depth — strong intellectual bond",ch:"Both too serious — where's the lightness?",tip:"Bring in laughter and fun"}},
  "4-8":{he:{con:"בנייה וכוח — יחד יכולים להקים אימפריה",ch:"עבודה, עבודה, עבודה — איפה האהבה?",tip:"קבעו זמן קדוש לרומנטיקה"},en:{con:"Building and power — together they can build an empire",ch:"Work, work, work — where's the love?",tip:"Set sacred time for romance"}},
  "4-9":{he:{con:"מעשיות וחכמה — ה-4 בונה את חזון ה-9",ch:"ה-9 חולם בגדול, ה-4 חושב בקטן",tip:"שלבו בין הפרקטי לרוחני"},en:{con:"Practicality and wisdom — the 4 builds the 9's vision",ch:"The 9 dreams big, the 4 thinks small",tip:"Combine practical with spiritual"}},
  "5-5":{he:{con:"הרפתקה כפולה — חיים מלאי ריגוש",ch:"אין יציבות בכלל — כאוס",tip:"בנו מבנה מינימלי — גם חופשיים צריכים בסיס"},en:{con:"Double adventure — life full of excitement",ch:"No stability at all — chaos",tip:"Build minimal structure — even free spirits need a base"}},
  "5-6":{he:{con:"ה-5 מביא ריגוש וה-6 מביא חום ביתי",ch:"ה-5 בורח, ה-6 נצמד — מרחק רגשי",tip:"מצאו את הנוסחה בין מרחב לקרבה"},en:{con:"The 5 brings excitement, the 6 brings warmth",ch:"The 5 runs, the 6 clings — emotional distance",tip:"Find the formula between space and closeness"}},
  "5-7":{he:{con:"חופש וחכמה — שניהם חוקרים את העולם",ch:"ה-5 חוקר בחוץ, ה-7 חוקר בפנים",tip:"שתפו את הגילויים שלכם"},en:{con:"Freedom and wisdom — both explore the world",ch:"The 5 explores outside, the 7 inside",tip:"Share your discoveries with each other"}},
  "5-8":{he:{con:"אנרגיה ושאיפה — זוג דינמי שמושך הצלחה",ch:"שניהם עסוקים מדי — הזוגיות נשחקת",tip:"הזוגיות היא ההשקעה הכי חשובה"},en:{con:"Energy and ambition — dynamic couple attracting success",ch:"Both too busy — relationship erodes",tip:"The relationship is the most important investment"}},
  "5-9":{he:{con:"חיבור מבוסס חופש ואידיאלים משותפים",ch:"שניהם מתפזרים — חסר מיקוד",tip:"בחרו כיוון אחד ולכו בו יחד"},en:{con:"Connection based on freedom and shared ideals",ch:"Both scatter — lack of focus",tip:"Choose one direction and walk it together"}},
  "6-6":{he:{con:"אהבה ללא תנאים — בית מלא חום",ch:"שליטה הדדית דרך אהבה, הקרבה כפולה",tip:"אהבו בלי לשלוט, תנו בלי לצפות"},en:{con:"Unconditional love — home full of warmth",ch:"Mutual control through love, double sacrifice",tip:"Love without controlling, give without expecting"}},
  "6-7":{he:{con:"לב ושכל — ה-6 מרפא וה-7 מאיר",ch:"ה-6 רוצה קרבה, ה-7 רוצה מרחב",tip:"תנו זמן — החיבור הזה מעמיק עם השנים"},en:{con:"Heart and mind — the 6 heals, the 7 illuminates",ch:"The 6 wants closeness, the 7 wants space",tip:"Give it time — this connection deepens with years"}},
  "6-8":{he:{con:"אהבה וכוח — בניית חיים מרשימים יחד",ch:"ויכוחים על כסף ואחריות",tip:"חלקו אחריות בשקיפות מלאה"},en:{con:"Love and power — building impressive lives together",ch:"Arguments about money and responsibility",tip:"Share responsibilities with full transparency"}},
  "6-9":{he:{con:"שני לבבות גדולים — חמלה ואהבה לעולם כולו",ch:"מי דואג לזוגיות כשדואגים לכולם?",tip:"שימו את עצמכם ראשונים לפעמים"},en:{con:"Two big hearts — compassion and love for the whole world",ch:"Who cares for the relationship when caring for everyone?",tip:"Put yourselves first sometimes"}},
  "7-7":{he:{con:"חיבור רוחני עמוק ונדיר — שתי נשמות מתקדמות",ch:"שניהם בעולמות פנימיים — בדידות בתוך הזוגיות",tip:"צרו גשר רגשי, לא רק אינטלקטואלי"},en:{con:"Deep and rare spiritual connection",ch:"Both in inner worlds — loneliness within the relationship",tip:"Create an emotional bridge, not just intellectual"}},
  "7-8":{he:{con:"חכמה וכוח — שילוב נדיר של עומק והגשמה",ch:"עולמות שונים — ה-7 רוחני, ה-8 חומרי",tip:"למדו מהעולם של השני"},en:{con:"Wisdom and power — rare blend of depth and manifestation",ch:"Different worlds — the 7 spiritual, the 8 material",tip:"Learn from each other's world"}},
  "7-9":{he:{con:"שתי נשמות ותיקות — חיבור מעבר לזמן",ch:"שניהם בעולמות גבוהים — מי על הקרקע?",tip:"עשו שורשים ביחד, גם אם רחוקים מהמון"},en:{con:"Two old souls — connection beyond time",ch:"Both in higher realms — who's grounded?",tip:"Put down roots together"}},
  "8-8":{he:{con:"זוג כוח — יחד שולטים בעולם",ch:"מאבקי שליטה אינטנסיביים ובלתי פוסקים",tip:"הפנו את הכוח לפרויקט משותף גדול"},en:{con:"Power couple — together they rule the world",ch:"Intense, unrelenting power struggles",tip:"Direct power toward a grand shared project"}},
  "8-9":{he:{con:"כוח עם חכמה — שילוב של עשייה ומשמעות",ch:"ה-8 רוצה תוצאות, ה-9 רוצה משמעות",tip:"שלבו בין הצלחה חומרית לתרומה לעולם"},en:{con:"Power with wisdom — doing meets meaning",ch:"The 8 wants results, the 9 wants meaning",tip:"Combine material success with contribution"}},
  "9-9":{he:{con:"שני חכמים — חיבור נשמתי ברמה הגבוהה ביותר",ch:"שניהם מוותרים — מי נלחם על הזוגיות?",tip:"הזוגיות שלכם גם היא שליחות"},en:{con:"Two sages — soul connection at the highest level",ch:"Both give in — who fights for the relationship?",tip:"Your relationship is also a mission"}},
};
function getCompat(a,b){const k1=`${Math.min(a,b)}-${Math.max(a,b)}`;return LP_COMPAT[k1]||LP_COMPAT[`${a}-${b}`]||LP_COMPAT[`${b}-${a}`]||null;}

const TRAITS={
  1:{he:{str:["עצמאות ויוזמה","כושר מנהיגות טבעי","אומץ ונחישות"],ch:["קושי בשיתוף פעולה","חוסר סבלנות","נטייה לבדידות"],soul:"ללמוד שמנהיגות אמיתית היא שירות, לא שליטה"},en:{str:["Independence and initiative","Natural leadership","Courage and determination"],ch:["Difficulty in cooperation","Impatience","Tendency to isolation"],soul:"To learn that true leadership is service, not control"}},
  2:{he:{str:["רגישות ואמפתיה עמוקה","כושר הקשבה יוצא דופן","דיפלומטיות"],ch:["חוסר החלטיות","תלות רגשית","ויתור על עצמו"],soul:"לפתח קול עצמאי ולהציב גבולות בריאים"},en:{str:["Deep sensitivity and empathy","Exceptional listening ability","Diplomacy"],ch:["Indecisiveness","Emotional dependency","Self-sacrifice"],soul:"To develop an independent voice and set healthy boundaries"}},
  3:{he:{str:["כושר ביטוי מבריק","יצירתיות ודמיון","אופטימיות וכריזמה"],ch:["פיזור אנרגיה","שטחיות","בריחה מרגשות כבדים"],soul:"ללמוד שעומק ושמחה יכולים לדור יחד"},en:{str:["Brilliant expression ability","Creativity and imagination","Optimism and charisma"],ch:["Energy scattering","Superficiality","Avoidance of heavy emotions"],soul:"To learn that depth and joy can coexist"}},
  4:{he:{str:["אמינות ויציבות","חריצות ומסירות","חשיבה שיטתית"],ch:["נוקשות ופחד משינוי","עבודת יתר","קושי לשחרר שליטה"],soul:"ללמוד שגמישות היא חוזק, לא חולשה"},en:{str:["Reliability and stability","Diligence and devotion","Systematic thinking"],ch:["Rigidity and fear of change","Overwork","Difficulty releasing control"],soul:"To learn that flexibility is strength, not weakness"}},
  5:{he:{str:["כושר הסתגלות מדהים","תשוקה לחיים","מגנטיות ומשיכה"],ch:["חוסר מחויבות","חוסר שקט פנימי","התמכרות לגירויים"],soul:"למצוא את החופש האמיתי בתוך מחויבות"},en:{str:["Amazing adaptability","Passion for life","Magnetism and attraction"],ch:["Lack of commitment","Inner restlessness","Addiction to stimulation"],soul:"To find true freedom within commitment"}},
  6:{he:{str:["אהבה ללא תנאים","אחריות ומסירות","חוש אסתטי מפותח"],ch:["שליטה דרך אהבה","הקרבה עצמית","נטל אחריות מוגזם"],soul:"ללמוד שאהבה אמיתית כוללת גם אהבה עצמית"},en:{str:["Unconditional love","Responsibility and devotion","Developed aesthetic sense"],ch:["Control through love","Self-sacrifice","Excessive burden of responsibility"],soul:"To learn that true love includes self-love"}},
  7:{he:{str:["חכמה ותבונה פנימית","אינטואיציה חדה","יכולת ניתוח עמוקה"],ch:["ניתוק רגשי","ביקורתיות","בדידות נבחרת"],soul:"לאזן בין שכל ללב ולפתוח את הלב לאחרים"},en:{str:["Wisdom and inner insight","Sharp intuition","Deep analytical ability"],ch:["Emotional detachment","Criticism","Chosen solitude"],soul:"To balance mind and heart, and open the heart to others"}},
  8:{he:{str:["כוח הגשמה עצום","ראייה עסקית חדה","כריזמה ואוטוריטה"],ch:["אובססיה לכוח","חומרנות","קושי בפגיעות רגשית"],soul:"ללמוד שהכוח האמיתי הוא ביכולת לתת ולשרת"},en:{str:["Immense manifestation power","Sharp business vision","Charisma and authority"],ch:["Power obsession","Materialism","Difficulty with emotional vulnerability"],soul:"To learn that true power is in the ability to give and serve"}},
  9:{he:{str:["חמלה אינסופית","ראייה רחבה וגלובלית","חכמה של נשמה ותיקה"],ch:["קושי לשחרר","תחושת עליונות","נטילת עול העולם"],soul:"ללמוד לשחרר בשלום ולחיות בהווה"},en:{str:["Infinite compassion","Broad global vision","Old soul wisdom"],ch:["Difficulty letting go","Sense of superiority","Taking on the world's burden"],soul:"To learn to release in peace and live in the present"}},
};

// ═══════════════════ COMPAT WIDGET (FULL REWRITE) ═══════════════════
function CompatWidget({he,dk}){
  const ac=dk?"#c8a96a":"#937640";
  const tm=dk?"#e8e0d0":"#2a2520";
  const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const isRtl=he;

  const[mode,setMode]=useState("couple"); // couple | profile | parent
  const[anim,setAnim]=useState(false);

  // Couple state
  const[c1name,setC1name]=useState("");const[c1dob,setC1dob]=useState("");
  const[c2name,setC2name]=useState("");const[c2dob,setC2dob]=useState("");
  const[coupleRes,setCoupleRes]=useState(null);

  // Profile state
  const[pName,setPName]=useState("");const[pDob,setPDob]=useState("");
  const[profileRes,setProfileRes]=useState(null);

  // Parent-child state
  const[parentName,setParentName]=useState("");const[parentDob,setParentDob]=useState("");
  const[childName,setChildName]=useState("");const[childDob,setChildDob]=useState("");
  const[pcRes,setPcRes]=useState(null);

  const[error,setError]=useState("");

  const parseDob=(s)=>{const p=s.split(".");if(p.length!==3)return null;const[d,m,y]=p.map(Number);if(!d||!m||!y||d>31||m>12||y<1900)return null;return{d,m,y};};

  const calcCouple=()=>{
    setError("");
    const d1=parseDob(c1dob),d2=parseDob(c2dob);
    if(!d1||!d2||!c1name.trim()||!c2name.trim()){setError(he?"אנא מלא את כל השדות":"Please fill all fields");return;}
    AU.init();AU.p("reveal");setAnim(true);setCoupleRes(null);
    setTimeout(()=>{
      const lp1=LP(d1.d,d1.m,d1.y),lp2=LP(d2.d,d2.m,d2.y);
      const nv1=NV(c1name),nv2=NV(c2name);
      const su1=SU(c1name),su2=SU(c2name);
      const ex1=EX(c1name),ex2=EX(c2name);
      const compat=getCompat(lp1,lp2);
      // Score calculation
      let score=50;
      if(lp1===lp2)score+=20;else if(Math.abs(lp1-lp2)<=2)score+=15;else if(Math.abs(lp1-lp2)>=5)score-=5;
      if(su1===su2)score+=15;else if(Math.abs(su1-su2)<=1)score+=8;
      if(nv1===nv2)score+=10;else if(Math.abs(nv1-nv2)<=2)score+=5;
      // Complementary pairs
      const compPairs=[[1,2],[3,4],[5,6],[7,8],[1,9]];
      if(compPairs.some(p=>(p[0]===lp1&&p[1]===lp2)||(p[1]===lp1&&p[0]===lp2)))score+=12;
      score=Math.max(20,Math.min(99,score));
      const harmony=Math.min(10,Math.round(score/10));
      const tension=Math.min(10,Math.round((100-score)/12));
      const growth=Math.min(10,Math.round(Math.abs(lp1-lp2)+Math.abs(su1-su2)/2+2));
      setCoupleRes({lp1,lp2,nv1,nv2,su1,su2,ex1,ex2,score,harmony,tension,growth,compat});
      setAnim(false);AU.p("chapter");
    },1200);
  };

  const calcProfile=()=>{
    setError("");
    const d=parseDob(pDob);
    if(!d||!pName.trim()){setError(he?"אנא מלא את כל השדות":"Please fill all fields");return;}
    AU.init();AU.p("reveal");setAnim(true);setProfileRes(null);
    setTimeout(()=>{
      const lp=LP(d.d,d.m,d.y),nv=NV(pName),su=SU(pName),ex=EX(pName);
      const age=CA(d.d,d.m,d.y);
      const traits=TRAITS[lp];
      setProfileRes({lp,nv,su,ex,age,traits});
      setAnim(false);AU.p("chapter");
    },1000);
  };

  const calcPC=()=>{
    setError("");
    const dp=parseDob(parentDob),dc=parseDob(childDob);
    if(!dp||!dc||!parentName.trim()||!childName.trim()){setError(he?"אנא מלא את כל השדות":"Please fill all fields");return;}
    AU.init();AU.p("reveal");setAnim(true);setPcRes(null);
    setTimeout(()=>{
      const lpP=LP(dp.d,dp.m,dp.y),lpC=LP(dc.d,dc.m,dc.y);
      const nvP=NV(parentName),nvC=NV(childName);
      const suP=SU(parentName),suC=SU(childName);
      const compat=getCompat(lpP,lpC);
      let score=55;
      if(lpP===lpC)score+=18;else if(Math.abs(lpP-lpC)<=2)score+=12;
      if(suP===suC)score+=10;
      const teachPairs={1:4,2:8,3:7,4:5,5:6,6:1,7:3,8:9,9:2};
      if(teachPairs[lpP]===lpC||teachPairs[lpC]===lpP)score+=10;
      score=Math.max(25,Math.min(99,score));
      setPcRes({lpP,lpC,nvP,nvC,suP,suC,score,compat});
      setAnim(false);AU.p("chapter");
    },1200);
  };

  const inputLabelSt={display:"block",marginBottom:5,fontSize:11,color:`${ac}99`,fontWeight:500};
  const personBlockSt={padding:16,background:dk?"rgba(18,18,38,.3)":"rgba(255,255,255,.3)",border:`1px solid ${ac}0a`,borderRadius:16};
  const personTitleSt={textAlign:"center",marginBottom:10};
  const dobInputSt={textAlign:"center",letterSpacing:3,fontFamily:"'Cormorant Garamond',serif"};
  const numBadgeSt={textAlign:"center",padding:"10px 6px",background:dk?"rgba(18,18,38,.3)":"rgba(255,255,255,.35)",border:`1px solid ${ac}0a`,borderRadius:12};

  return(<div style={{animation:"fadeInUp .5s ease-out"}}>
    {/* Sub-tabs */}
    <div className="gc" style={{padding:"6px",marginBottom:16}}>
      <div style={{display:"flex",gap:2}}>
        {[{k:"couple",i:"heart",l:he?"זוגיות":"Couple"},{k:"profile",i:"dna",l:he?"פרופיל אישי":"Profile"},{k:"parent",i:"users","l":he?"הורה-ילד":"Parent-Child"}].map(t=>(
          <div key={t.k} className={`ti ${mode===t.k?"act":""}`} onClick={()=>{setMode(t.k);setError("");AU.init();AU.p("click");}} style={{flex:1}}><span style={{display:"inline-flex",alignItems:"center",gap:5,justifyContent:"center"}}><Icon name={t.i} size={13}/>{t.l}</span></div>
        ))}
      </div>
    </div>

    {error&&<div style={{padding:"10px 14px",background:"rgba(180,50,50,.12)",border:"1px solid rgba(180,50,50,.25)",borderRadius:10,color:"#e8a0a0",fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}

    {/* ═══ COUPLE MODE ═══ */}
    {mode==="couple"&&(<div>
      <div className="gc">
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3}}>{he?"התאמה זוגית":"Couple Compatibility"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={personBlockSt}>
            <div style={personTitleSt}><span style={{color:ac,display:"inline-flex"}}><Icon name="user" size={20}/></span><div style={{fontSize:13,fontWeight:600,color:ac,marginTop:2}}>{he?"בן/בת זוג 1":"Partner 1"}</div></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"שם מלא":"Full Name"}</label><input className="gi" value={c1name} onChange={e=>setC1name(e.target.value)} placeholder={he?"שם בעברית...":"Name in Hebrew..."} dir="rtl" style={{textAlign:"right"}}/></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={c1dob} onChange={e=>setC1dob(e.target.value)} placeholder="dd.mm.yyyy" dir="ltr" style={dobInputSt}/></div>
          </div>
          <div style={personBlockSt}>
            <div style={personTitleSt}><span style={{color:ac,display:"inline-flex"}}><Icon name="user" size={20}/></span><div style={{fontSize:13,fontWeight:600,color:ac,marginTop:2}}>{he?"בן/בת זוג 2":"Partner 2"}</div></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"שם מלא":"Full Name"}</label><input className="gi" value={c2name} onChange={e=>setC2name(e.target.value)} placeholder={he?"שם בעברית...":"Name in Hebrew..."} dir="rtl" style={{textAlign:"right"}}/></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={c2dob} onChange={e=>setC2dob(e.target.value)} placeholder="dd.mm.yyyy" dir="ltr" style={dobInputSt}/></div>
          </div>
        </div>
        <button className="gb" onClick={calcCouple} disabled={!c1name.trim()||!c2name.trim()||!c1dob.trim()||!c2dob.trim()}>{he?"בדוק התאמה":"Check Compatibility"}</button>
      </div>

      {anim&&<div style={{textAlign:"center",marginTop:24}}><div style={{width:50,height:50,border:`2px solid ${ac}33`,borderTopColor:ac,borderRadius:"50%",margin:"0 auto",animation:"spin 1s linear infinite"}}/></div>}

      {coupleRes&&!anim&&(<div style={{marginTop:16,animation:"fadeInUp .7s ease-out"}}>
        <div className="gc">
          <div style={{position:"relative",width:130,height:130,margin:"0 auto 16px"}}><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="57" fill="none" stroke={`${ac}10`} strokeWidth="5"/><circle cx="65" cy="65" r="57" fill="none" stroke={coupleRes.score>=75?"#4ECDC4":coupleRes.score>=50?ac:"#E67E22"} strokeWidth="5" strokeDasharray={`${coupleRes.score*114*Math.PI/100} ${114*Math.PI}`} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"stroke-dasharray 1.5s ease"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,fontWeight:700,color:ac}}>{coupleRes.score}%</span><span style={{fontSize:9,color:ts}}>{he?"התאמה":"Match"}</span></div></div>

          {/* Life Path comparison */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,marginBottom:16,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:ts}}>{c1name.split(" ")[0]}</div>
              <div style={{fontSize:28,fontWeight:700,color:D[coupleRes.lp1]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{coupleRes.lp1}</div>
              <div style={{fontSize:11,color:D[coupleRes.lp1]?.c||ac,opacity:.7}}>{he?D[coupleRes.lp1]?.t:D[coupleRes.lp1]?.te}</div>
            </div>
            <div style={{fontSize:20,color:`${ac}44`}}>⟷</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:ts}}>{c2name.split(" ")[0]}</div>
              <div style={{fontSize:28,fontWeight:700,color:D[coupleRes.lp2]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{coupleRes.lp2}</div>
              <div style={{fontSize:11,color:D[coupleRes.lp2]?.c||ac,opacity:.7}}>{he?D[coupleRes.lp2]?.t:D[coupleRes.lp2]?.te}</div>
            </div>
          </div>

          {/* Bars */}
          {[{l:he?"הרמוניה":"Harmony",v:coupleRes.harmony,c:"#4ECDC4"},{l:he?"מתח":"Tension",v:coupleRes.tension,c:"#E74C3C"},{l:he?"צמיחה":"Growth",v:coupleRes.growth,c:"#FFD700"}].map((it,i)=>(
            <div key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:ts}}>{it.l}</span><span style={{fontSize:12,fontWeight:700,color:it.c}}>{it.v}/10</span></div><div style={{height:6,background:dk?"rgba(20,20,40,.4)":"rgba(0,0,0,.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${it.v*10}%`,background:it.c,borderRadius:3,transition:"width 1.5s ease"}}/></div></div>
          ))}

          {/* Connection & Challenge */}
          {coupleRes.compat&&(<div style={{marginTop:16}}>
            <div style={{padding:14,background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:"#4ECDC4",display:"inline-flex"}}><Icon name="heart" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:"#4ECDC4"}}>{he?"מה מחבר אתכם":"What connects you"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{coupleRes.compat[he?"he":"en"].con}</p>
            </div>
            <div style={{padding:14,background:"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.1)",borderRadius:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:"#E74C3C",display:"inline-flex"}}><Icon name="bolt" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:"#E74C3C"}}>{he?"האתגרים":"Challenges"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{coupleRes.compat[he?"he":"en"].ch}</p>
            </div>
            <div style={{padding:14,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}15`,borderRadius:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:ac,display:"inline-flex"}}><Icon name="bulb" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:ac}}>{he?"עצה":"Advice"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{coupleRes.compat[he?"he":"en"].tip}</p>
            </div>
          </div>)}

          {/* Number comparison table */}
          <div style={{marginTop:16,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:dk?"rgba(200,169,106,.03)":"rgba(0,0,0,.02)"}}>
                <th style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:ac,textAlign:"center"}}></th>
                <th style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:ac,textAlign:"center"}}>{c1name.split(" ")[0]||"1"}</th>
                <th style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:ac,textAlign:"center"}}>{c2name.split(" ")[0]||"2"}</th>
              </tr></thead>
              <tbody>
                {[{l:he?"שביל הגורל":"Life Path",a:coupleRes.lp1,b:coupleRes.lp2},{l:he?"ערך השם":"Name",a:coupleRes.nv1,b:coupleRes.nv2},{l:he?"קול הנשמה":"Soul",a:coupleRes.su1,b:coupleRes.su2},{l:he?"ביטוי":"Expression",a:coupleRes.ex1,b:coupleRes.ex2}].map((r,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${ac}08`}}>
                    <td style={{padding:"8px 10px",fontSize:12,color:ts,fontWeight:600}}>{r.l}</td>
                    <td style={{padding:"8px 10px",fontSize:18,fontWeight:700,color:ac,textAlign:"center",fontFamily:"'Cormorant Garamond',serif"}}>{r.a}</td>
                    <td style={{padding:"8px 10px",fontSize:18,fontWeight:700,color:ac,textAlign:"center",fontFamily:"'Cormorant Garamond',serif"}}>{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>)}
    </div>)}

    {/* ═══ PROFILE MODE ═══ */}
    {mode==="profile"&&(<div>
      <div className="gc">
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3}}>{he?"פרופיל אישיותי":"Personality Profile"}</div>
        </div>
        <div style={personBlockSt}>
          <div style={personTitleSt}><span style={{color:ac,display:"inline-flex"}}><Icon name="dna" size={20}/></span><div style={{fontSize:13,fontWeight:600,color:ac,marginTop:2}}>{he?"הפרטים שלך":"Your Details"}</div></div>
          <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"שם מלא":"Full Name"}</label><input className="gi" value={pName} onChange={e=>setPName(e.target.value)} placeholder={he?"שם בעברית...":"Name in Hebrew..."} dir="rtl" style={{textAlign:"right"}}/></div>
          <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={pDob} onChange={e=>setPDob(e.target.value)} placeholder="dd.mm.yyyy" dir="ltr" style={dobInputSt}/></div>
        </div>
        <button className="gb" onClick={calcProfile} disabled={!pName.trim()||!pDob.trim()} style={{marginTop:12}}>{he?"גלה את עצמך":"Discover Yourself"}</button>
      </div>

      {anim&&<div style={{textAlign:"center",marginTop:24}}><div style={{width:50,height:50,border:`2px solid ${ac}33`,borderTopColor:ac,borderRadius:"50%",margin:"0 auto",animation:"spin 1s linear infinite"}}/></div>}

      {profileRes&&!anim&&(<div style={{marginTop:16,animation:"fadeInUp .7s ease-out"}}>
        <div className="gc">
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:10,color:ts}}>{pName}</div>
            <div style={{fontSize:36,fontWeight:700,color:D[profileRes.lp]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{profileRes.lp}</div>
            <div style={{fontSize:16,color:D[profileRes.lp]?.c||ac,fontWeight:600}}>{he?D[profileRes.lp]?.t:D[profileRes.lp]?.te}</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[{l:he?"ערך השם":"Name",v:profileRes.nv},{l:he?"קול הנשמה":"Soul",v:profileRes.su},{l:he?"ביטוי":"Expression",v:profileRes.ex}].map((it,i)=>(
              <div key={i} style={numBadgeSt}><div style={{fontSize:9,color:ts,letterSpacing:.5}}>{it.l}</div><div style={{fontSize:22,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif",margin:"2px 0"}}>{it.v}</div>{it.v>0&&it.v<=9&&D[it.v]&&<div style={{fontSize:9,color:D[it.v].c,opacity:.7}}>{he?D[it.v].t:D[it.v].te}</div>}</div>
            ))}
          </div>

          {/* Strengths */}
          <div style={{padding:14,background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:14,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{color:"#4ECDC4",display:"inline-flex"}}><Icon name="star" size={16}/></span><span style={{fontSize:14,fontWeight:600,color:"#4ECDC4"}}>{he?"חוזקות":"Strengths"}</span></div>
            {profileRes.traits?.[he?"he":"en"]?.str?.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}><span style={{color:"#4ECDC4",fontSize:10}}>✦</span><span style={{fontSize:13,color:ts}}>{s}</span></div>))}
          </div>

          {/* Challenges */}
          <div style={{padding:14,background:"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.1)",borderRadius:14,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{color:"#E74C3C",display:"inline-flex"}}><Icon name="flame" size={16}/></span><span style={{fontSize:14,fontWeight:600,color:"#E74C3C"}}>{he?"אתגרים":"Challenges"}</span></div>
            {profileRes.traits?.[he?"he":"en"]?.ch?.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}><span style={{color:"#E74C3C",fontSize:10}}>✦</span><span style={{fontSize:13,color:ts}}>{s}</span></div>))}
          </div>

          {/* Soul Lesson */}
          <div style={{padding:16,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}15`,borderRadius:14,textAlign:"center"}}>
            <div style={{color:ac,marginBottom:6,display:"flex",justifyContent:"center"}}><Icon name="star" size={20} stroke={1.3}/></div>
            <div style={{fontSize:12,fontWeight:600,color:ac,marginBottom:6}}>{he?"שיעור הנשמה":"Soul Lesson"}</div>
            <p style={{fontSize:14,lineHeight:1.9,color:ts,fontStyle:"italic"}}>{profileRes.traits?.[he?"he":"en"]?.soul}</p>
          </div>
        </div>
      </div>)}
    </div>)}

    {/* ═══ PARENT-CHILD MODE ═══ */}
    {mode==="parent"&&(<div>
      <div className="gc">
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:3}}>{he?"חיבור הורה-ילד":"Parent-Child Connection"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={personBlockSt}>
            <div style={personTitleSt}><span style={{color:ac,display:"inline-flex"}}><Icon name="users" size={20}/></span><div style={{fontSize:13,fontWeight:600,color:ac,marginTop:2}}>{he?"הורה":"Parent"}</div></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"שם מלא":"Full Name"}</label><input className="gi" value={parentName} onChange={e=>setParentName(e.target.value)} placeholder={he?"שם בעברית...":"Name in Hebrew..."} dir="rtl" style={{textAlign:"right"}}/></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={parentDob} onChange={e=>setParentDob(e.target.value)} placeholder="dd.mm.yyyy" dir="ltr" style={dobInputSt}/></div>
          </div>
          <div style={personBlockSt}>
            <div style={personTitleSt}><span style={{color:ac,display:"inline-flex"}}><Icon name="user" size={20}/></span><div style={{fontSize:13,fontWeight:600,color:ac,marginTop:2}}>{he?"ילד/ה":"Child"}</div></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"שם מלא":"Full Name"}</label><input className="gi" value={childName} onChange={e=>setChildName(e.target.value)} placeholder={he?"שם בעברית...":"Name in Hebrew..."} dir="rtl" style={{textAlign:"right"}}/></div>
            <div style={{marginBottom:12}}><label style={inputLabelSt}>{he?"תאריך לידה":"Date of Birth"}</label><input className="gi" value={childDob} onChange={e=>setChildDob(e.target.value)} placeholder="dd.mm.yyyy" dir="ltr" style={dobInputSt}/></div>
          </div>
        </div>
        <button className="gb" onClick={calcPC} disabled={!parentName.trim()||!childName.trim()||!parentDob.trim()||!childDob.trim()}>{he?"בדוק חיבור":"Check Connection"}</button>
      </div>

      {anim&&<div style={{textAlign:"center",marginTop:24}}><div style={{width:50,height:50,border:`2px solid ${ac}33`,borderTopColor:ac,borderRadius:"50%",margin:"0 auto",animation:"spin 1s linear infinite"}}/></div>}

      {pcRes&&!anim&&(<div style={{marginTop:16,animation:"fadeInUp .7s ease-out"}}>
        <div className="gc">
          <div style={{position:"relative",width:130,height:130,margin:"0 auto 16px"}}><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="57" fill="none" stroke={`${ac}10`} strokeWidth="5"/><circle cx="65" cy="65" r="57" fill="none" stroke={pcRes.score>=75?"#4ECDC4":pcRes.score>=50?ac:"#E67E22"} strokeWidth="5" strokeDasharray={`${pcRes.score*114*Math.PI/100} ${114*Math.PI}`} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"stroke-dasharray 1.5s ease"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,fontWeight:700,color:ac}}>{pcRes.score}%</span><span style={{fontSize:9,color:ts}}>{he?"התאמה":"Match"}</span></div></div>

          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,marginBottom:16,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:ts}}>{he?"הורה":"Parent"}</div>
              <div style={{fontSize:28,fontWeight:700,color:D[pcRes.lpP]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{pcRes.lpP}</div>
              <div style={{fontSize:11,color:D[pcRes.lpP]?.c||ac,opacity:.7}}>{he?D[pcRes.lpP]?.t:D[pcRes.lpP]?.te}</div>
            </div>
            <div style={{color:`${ac}66`,display:"flex",justifyContent:"center"}}><Icon name="heart" size={18}/></div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:ts}}>{he?"ילד/ה":"Child"}</div>
              <div style={{fontSize:28,fontWeight:700,color:D[pcRes.lpC]?.c||ac,fontFamily:"'Cormorant Garamond',serif"}}>{pcRes.lpC}</div>
              <div style={{fontSize:11,color:D[pcRes.lpC]?.c||ac,opacity:.7}}>{he?D[pcRes.lpC]?.t:D[pcRes.lpC]?.te}</div>
            </div>
          </div>

          {pcRes.compat&&(<div>
            <div style={{padding:14,background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:"#4ECDC4",display:"inline-flex"}}><Icon name="link" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:"#4ECDC4"}}>{he?"מה מחבר ביניכם":"What connects you"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{pcRes.compat[he?"he":"en"].con}</p>
            </div>
            <div style={{padding:14,background:"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.1)",borderRadius:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:"#E74C3C",display:"inline-flex"}}><Icon name="bolt" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:"#E74C3C"}}>{he?"אתגרים בקשר":"Relationship challenges"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{pcRes.compat[he?"he":"en"].ch}</p>
            </div>
            <div style={{padding:14,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}15`,borderRadius:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{color:ac,display:"inline-flex"}}><Icon name="bulb" size={16}/></span><span style={{fontSize:13,fontWeight:600,color:ac}}>{he?"עצה להורה":"Advice for parent"}</span></div>
              <p style={{fontSize:13,lineHeight:1.9,color:ts}}>{pcRes.compat[he?"he":"en"].tip}</p>
            </div>
          </div>)}

          {/* What the child teaches the parent */}
          <div style={{marginTop:14,padding:16,background:dk?"rgba(18,18,38,.4)":"rgba(255,255,255,.4)",border:`1px solid ${ac}15`,borderRadius:14,textAlign:"center"}}>
            <div style={{color:ac,marginBottom:6,display:"flex",justifyContent:"center"}}><Icon name="sparkle" size={20} stroke={1.3}/></div>
            <div style={{fontSize:12,fontWeight:600,color:ac,marginBottom:6}}>{he?"מה הילד בא ללמד אותך":"What the child comes to teach you"}</div>
            <p style={{fontSize:14,lineHeight:1.9,color:ts,fontStyle:"italic"}}>{he?D[pcRes.lpC]?.growth:D[pcRes.lpC]?.growthE}</p>
          </div>
        </div>
      </div>)}
    </div>)}
  </div>);
}

// ═══════════════════ AFFIRMATION WIDGET ═══════════════════
function AffirmWidget({he,dk}){
  const ac=dk?"#c8a96a":"#937640";const[rev,setRev]=useState(false);
  const today=new Date();const seed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();
  const msg=AFFIRMATIONS[seed%AFFIRMATIONS.length];
  return(<div style={{textAlign:"center",padding:"16px 0"}}>
    <div style={{color:ac,marginBottom:12,opacity:.3,display:"flex",justifyContent:"center"}}><Icon name="sparkle" size={28} stroke={1.2}/></div>
    <p style={{fontSize:12,color:dk?"rgba(232,224,208,.35)":"rgba(0,0,0,.3)",marginBottom:16}}>{he?"ההודעה שלך להיום":"Your message today"}</p>
    {!rev?(<div onClick={()=>{setRev(true);AU.init();AU.p("card");}} style={{cursor:"pointer",padding:"28px 20px",background:dk?"rgba(18,18,38,.5)":"rgba(255,255,255,.6)",border:`1.5px solid ${ac}28`,borderRadius:16,maxWidth:300,margin:"0 auto",transition:"all .3s"}}><div style={{color:ac,opacity:.4,marginBottom:8,display:"flex",justifyContent:"center"}}><Icon name="orb" size={20}/></div><div style={{fontSize:13,color:ac,letterSpacing:2}}>{he?"חשוף":"Reveal"}</div></div>):(<div style={{animation:"fadeInUp .8s ease-out",padding:"24px 20px",background:`${ac}06`,border:`1px solid ${ac}1a`,borderRadius:16,maxWidth:320,margin:"0 auto"}}><div style={{fontSize:17,lineHeight:2.2,color:dk?"#e8e0d0":"#2a2520",fontWeight:500,fontStyle:"italic"}}>"{msg[he?"he":"en"]}"</div><div style={{marginTop:10,fontSize:10,color:`${ac}55`,letterSpacing:2}}>✦ {today.toLocaleDateString(he?"he-IL":"en-US")} ✦</div></div>)}
  </div>);
}

// ═══════════════════ RITUAL WIDGET ═══════════════════
function RitualWidget({number,he,dk}){
  const ac=dk?"#c8a96a":"#937640";const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const info=D[number]||D[1];const r=info.ritual;
  return(<div><div style={{textAlign:"center",marginBottom:14}}><div style={{color:ac,display:"flex",justifyContent:"center",marginBottom:2}}><Icon name="candle" size={18}/></div><div style={{fontSize:14,fontWeight:600,color:ac,marginTop:4}}>{he?"טקס יומי":"Daily Ritual"}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {[{i:"target",l:he?"מילת מפתח":"Focus Word",v:he?r.word:r.wordE},{i:"bolt",l:he?"פעולה":"Action",v:he?r.act:r.actE},{i:"mirror",l:he?"התבוננות":"Reflection",v:he?r.reflect:r.reflectE},{i:"candle",l:he?"מיקרו-טקס":"Micro Ritual",v:he?r.micro:r.microE}].map((it,i)=>(
        <div key={i} className="ritual-item"><div style={{color:ac,display:"flex",justifyContent:"center",marginBottom:5}}><Icon name={it.i} size={16}/></div><div style={{fontSize:9,color:ts,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{it.l}</div><div style={{fontSize:12,lineHeight:1.7,color:dk?"rgba(232,224,208,.55)":"rgba(0,0,0,.45)"}}>{it.v}</div></div>
      ))}
    </div>
  </div>);
}
