/*
 * Calculation fragments that lived inside App.jsx event handlers and JSX
 * (commit 857461a), wrapped in functions so they can serve as an oracle.
 * Inside each wrapper the lines are verbatim; only the inputs became
 * parameters and the final setState({...}) became a return. The interpretation
 * lookups (LP_COMPAT / getCompat) are left to the caller, as in the new code.
 * Do not edit.
 */
import { LP, LPm, NV, SU, EX, PY } from "./legacy.js";

// doMatchCalc, App.jsx lines 653–669
export function doMatchCalc(d1, d2, m1name, m2name, type) {
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
    return {k1,res:{lp1,lp2,nv1,nv2,su1,su2,ex1,ex2,lpm1,lpm2,score,type,
      harmony:Math.min(10,Math.round(score/10)),tension:Math.min(10,Math.round((100-score)/12)),growth:Math.min(10,Math.round(Math.abs(lp1-lp2)+Math.abs(su1-su2)/2+2))}};
}

// calcCouple, App.jsx lines 2296–2313
export function calcCouple(d1, d2, c1name, c2name) {
      const lp1=LP(d1.d,d1.m,d1.y),lp2=LP(d2.d,d2.m,d2.y);
      const nv1=NV(c1name),nv2=NV(c2name);
      const su1=SU(c1name),su2=SU(c2name);
      const ex1=EX(c1name),ex2=EX(c2name);
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
      return {lp1,lp2,nv1,nv2,su1,su2,ex1,ex2,score,harmony,tension,growth};
}

// calcPC, App.jsx lines 2338–2348
export function calcPC(dp, dc, parentName, childName) {
      const lpP=LP(dp.d,dp.m,dp.y),lpC=LP(dc.d,dc.m,dc.y);
      const nvP=NV(parentName),nvC=NV(childName);
      const suP=SU(parentName),suC=SU(childName);
      let score=55;
      if(lpP===lpC)score+=18;else if(Math.abs(lpP-lpC)<=2)score+=12;
      if(suP===suC)score+=10;
      const teachPairs={1:4,2:8,3:7,4:5,5:6,6:1,7:3,8:9,9:2};
      if(teachPairs[lpP]===lpC||teachPairs[lpC]===lpP)score+=10;
      score=Math.max(25,Math.min(99,score));
      return {lpP,lpC,nvP,nvC,suP,suC,score};
}

// TablesWidget "personal year cycle" button, App.jsx line 886
export function yearCycleButton(d, addOne) {
  const cy=new Date().getFullYear();const proj=[];for(let i=-2;i<=10;i++){const yr=cy+i;proj.push({year:yr,py:PY(d.d,d.m,yr,addOne),isCurrent:yr===cy});}
  return proj;
}

// Daily tab ritual number, App.jsx line 2005
export const ritualNumber = () => ((new Date().getDate()%9)||9);

// share image: the meaning a master life path borrows, App.jsx line 459
export function shareImageBase(r) {
  const base=r.lp>9?[...String(r.lp)].reduce((a,d)=>a+ +d,0):r.lp;
  return base;
}
