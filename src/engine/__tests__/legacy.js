/*
 * Verbatim copy of the calculation code from App.jsx v7 (commit 857461a) —
 * the oracle the engine is checked against. Do not edit, reformat or "fix"
 * anything here: its only job is to be exactly what shipped. The single change
 * from the original is the `export` keyword in front of each definition.
 */

// App.jsx lines 90–146
export const LV={"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":1,"כ":2,"ך":2,"ל":3,"מ":4,"ם":4,"נ":5,"ן":5,"ס":6,"ע":7,"פ":8,"ף":8,"צ":9,"ץ":9,"ק":1,"ר":2,"ש":3,"ת":4};
export const VOW=new Set(["א","ו","י","ע"]);
export function R(n){if(n===0)return 0;while(n>=10||n<=-10)n=[...String(Math.abs(n))].reduce((a,d)=>a+ +d,0);return n;}
// master-aware reduction: keeps 11/22/33
export function Rm(n){if(n===11||n===22||n===33)return n;let x=Math.abs(n);while(x>=10){x=[...String(x)].reduce((a,d)=>a+ +d,0);if(x===11||x===22||x===33)return x;}return x;}
export function NV(s){return Rm([...s].reduce((a,c)=>a+(LV[c]||0),0));}
export function SU(s){return Rm([...s].filter(c=>VOW.has(c)).reduce((a,c)=>a+(LV[c]||0),0));}
export function EX(s){return Rm([...s].filter(c=>!VOW.has(c)&&LV[c]).reduce((a,c)=>a+(LV[c]||0),0));}
export function LP(d,m,y){return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${y}`].reduce((a,c)=>a+ +c,0));}
export function CA(d,m,y){const n=new Date();let a=n.getFullYear()-y;if(n.getMonth()+1<m||(n.getMonth()+1===m&&n.getDate()<d))a--;return a;}
export function PY(d,m,yr,add){let p=R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${yr}`].reduce((a,c)=>a+ +c,0));if(add)p=R(p+1);return p;}
export function PM(d,m){return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${new Date().getMonth()+1}`].reduce((a,c)=>a+ +c,0));}
export function PD(d,m){const t=new Date();return R([...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${t.getDate()}${t.getMonth()+1}${t.getFullYear()}`].reduce((a,c)=>a+ +c,0));}
export function CH(a,b){return a===b?0:R(Math.abs(a-b));}

export function karmicDebt(d,m,y,nm){
  const dbs=[];const f=[...`${d}${m}${y}`].reduce((a,c)=>a+ +c,0);
  const nf=[...nm].reduce((a,c)=>a+(LV[c]||0),0);
  [13,14,16,19].forEach(k=>{if(f===k||nf===k)dbs.push(k)});
  if([13,14,16,19].includes(d))dbs.push(d);
  return[...new Set(dbs)];
}

export function loShu(d,m,y){
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

export function fullCalc(d,m,y,nm,add){
  const nv=NV(nm),lp=LPm(d,m,y),age=CA(d,m,y),cy=new Date().getFullYear();
  const py=PY(d,m,cy,add),hy=R(lp+age),su=SU(nm),ex=EX(nm),pm=PM(d,m),pd=PD(d,m);
  const rd=R(d),rm=R(m),ry=R(y);
  const pk=[R(rd+rm),R(rd+ry),0,R(rm+ry)];pk[2]=R(pk[0]+pk[1]);
  const ch=[CH(rd,rm),CH(rd,ry),0,CH(rm,ry)];ch[2]=CH(ch[0],ch[1]);
  const hp=pk.map((v,i)=>R(v+ch[i])),hc=hp.map(v=>R(v+lp));
  const kd=karmicDebt(d,m,y,nm);const ls=loShu(d,m,y);
  const proj=[];for(let i=-2;i<=10;i++){const yr=cy+i;proj.push({year:yr,py:PY(d,m,yr,add),isCurrent:yr===cy});}
  const _nv=R(nv),_lp=R(lp),_su=R(su),_ex=R(ex);
  const psych={leadership:Math.min(10,((_nv===1||_nv===8?3:0)+(_lp===1||_lp===8?3:0)+(_su===1?2:0)+(_ex===8?2:0))),
    intuition:Math.min(10,((_nv===2||_nv===7?3:0)+(_lp===2||_lp===7?3:0)+(_su===7?2:0)+(_su===2?2:0))),
    creativity:Math.min(10,((_nv===3||_nv===5?3:0)+(_lp===3||_lp===5?3:0)+(_su===3?2:0)+(_ex===5?2:0))),
    stability:Math.min(10,((_nv===4||_nv===6?3:0)+(_lp===4||_lp===6?3:0)+(_su===6?2:0)+(_ex===4?2:0))),
    ambition:Math.min(10,((_nv===8||_nv===1?3:0)+(_lp===8?3:0)+(py===8||py===1?2:0)+(_ex===8?2:0))),
    wisdom:Math.min(10,((_nv===7||_nv===9?3:0)+(_lp===7||_lp===9?3:0)+(_su===9?2:0)+(_su===7?2:0)))};
  const pseed=Math.abs(_nv*7+_lp*13+_su*17+_ex*19+py*23+d*3+m*5+y);
  Object.keys(psych).forEach((k,i)=>{if(psych[k]<2)psych[k]=2+((pseed+i*37)%3);});
  return{nv,lp,age,py,hy,su,ex,pm,pd,pk,ch,hp,hc,exit:27-_lp,kd,ls,proj,psych,d,m,y};
}

// App.jsx lines 250–264
export function getRecommendations(r, lang) {
  const he = lang === "he";
  r = { ...r, lp: R(r.lp), nv: R(r.nv), su: R(r.su), ex: R(r.ex) };
  const recs = [];
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

// App.jsx lines 362–369
export function liveNum(s) {
  let sum = 0;
  for (const ch of s) {
    if (LV[ch]) sum += LV[ch];
    else { const u = ch.toUpperCase(); if (u >= "A" && u <= "Z") sum += ((u.charCodeAt(0) - 65) % 9) + 1; }
  }
  return sum ? R(sum) : 0;
}

// App.jsx line 575
export function LPm(d,m,y){const s=[...`${String(d).padStart(2,"0")}${String(m).padStart(2,"0")}${y}`].reduce((a,c)=>a+ +c,0);if(s===11||s===22||s===33)return s;let n=s;while(n>=10){n=[...String(n)].reduce((a,c)=>a+ +c,0);if(n===11||n===22||n===33)return n;}return n;}
