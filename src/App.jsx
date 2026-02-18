import { useState, useEffect, useRef, useCallback } from "react";

/* ╔══════════════════════════════════════════════════════════════╗
   ║  N U M E R O L O G Y   O R A C L E   —   V 7              ║
   ║  A psychologically intelligent digital oracle               ║
   ╚══════════════════════════════════════════════════════════════╝ */

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
  Object.keys(psych).forEach(k=>{if(psych[k]<2)psych[k]=2+Math.round(Math.random()*2)});
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
  if (r.kd.length > 0 && r.py === 7) recs.push({icon:"🔮",t:he?"שנת תיקון עמוק":"Deep repair year",d:he?"השנה הנוכחית מזמינה אותך להתמודד עם חובות קארמיים.":"This year invites you to face karmic debts."});
  if ((r.nv===1||r.nv===8)&&(r.lp===1||r.lp===8)) recs.push({icon:"👑",t:he?"מסלול מנהיגות חזק":"Strong leadership track",d:he?"השילוב שלך מצביע על פוטנציאל מנהיגות יוצא דופן.":"Your combination indicates exceptional leadership potential."});
  if ([3,5].includes(r.py) && [3,5].includes(r.lp)) recs.push({icon:"🎨",t:he?"גל יצירתי":"Creative surge",d:he?"האנרגיה היצירתית שלך בשיא.":"Your creative energy peaks."});
  if (r.py === 9) recs.push({icon:"🌊",t:he?"שנת מעבר":"Transition year",d:he?"מחזור מסתיים. שחרר מה שכבר לא משרת אותך.":"A cycle ends. Release what no longer serves you."});
  if (r.py === 8) recs.push({icon:"💰",t:he?"חלון שפע":"Abundance window",d:he?"האנרגיה של 8 תומכת בהגשמה חומרית.":"The energy of 8 supports material manifestation."});
  if (r.su === 2 && r.py === 6) recs.push({icon:"💚",t:he?"ריפוי רגשי":"Emotional healing",d:he?"השנה מזמינה ריפוי של מערכות יחסים.":"This year invites healing of relationships."});
  if ([7,9].includes(r.lp) && [7,9].includes(r.py)) recs.push({icon:"✨",t:he?"יקיצה רוחנית":"Spiritual awakening",d:he?"אתה בנקודת שיא רוחנית.":"You are at a spiritual peak."});
  if (r.ls.miss.includes(4) && r.ls.miss.includes(8)) recs.push({icon:"🌍",t:he?"צורך בהארקה":"Grounding needed",d:he?"חסרות לך אנרגיות של יציבות וכוח.":"You lack stability and power energies."});
  if (recs.length === 0) recs.push({icon:"🌟",t:he?"האנרגיה שלך מאוזנת":"Your energy is balanced",d:he?"המספרים שלך מצביעים על תקופה של הרמוניה.":"Your numbers indicate a period of harmony."});
  return recs;
}

// ═══════════════════ UI HELPERS ═══════════════════
function SR({children,delay=0}){const ref=useRef(null);const[v,setV]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){setV(true);o.disconnect();}},{threshold:.08});o.observe(el);return()=>o.disconnect();},[]);return <div ref={ref} style={{opacity:v?1:0,transform:v?"translateY(0)":"translateY(35px)",transition:`all 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`}}>{children}</div>;}

function AN({value,delay=0}){const[d,setD]=useState("—");const[v,setV]=useState(false);useEffect(()=>{const t1=setTimeout(()=>setV(true),delay);let c=0;const iv=setInterval(()=>{setD(Math.floor(Math.random()*9)+1);c++;if(c>12){clearInterval(iv);setD(value);}},45);const t2=setTimeout(()=>{clearInterval(iv);setD(value);},delay+600);return()=>{clearTimeout(t1);clearTimeout(t2);clearInterval(iv);};},[value,delay]);return <span style={{opacity:v?1:0,transform:v?"scale(1)":"scale(0.4)",transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",display:"inline-block"}}>{d}</span>;}

// ═══════════════════ PARTICLES ═══════════════════
function Particles({dk}){
  const ref=useRef(null);const mouse=useRef({x:0,y:0});
  useEffect(()=>{
    const c=ref.current;if(!c)return;const ctx=c.getContext("2d");let id;
    const ps=[];const resize=()=>{c.width=window.innerWidth;c.height=window.innerHeight};resize();
    window.addEventListener("resize",resize);
    const onMove=(e)=>{mouse.current={x:e.clientX||0,y:e.clientY||0}};
    window.addEventListener("mousemove",onMove);
    for(let i=0;i<50;i++)ps.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.8+.2,dx:(Math.random()-.5)*.15,dy:(Math.random()-.5)*.15,o:Math.random()*.3+.05,depth:Math.random()});
    const cl=dk?"212,175,55":"130,100,25";
    function draw(){ctx.clearRect(0,0,c.width,c.height);const mx=mouse.current.x,my=mouse.current.y;for(const p of ps){const px=p.x+p.dx+(mx-c.width/2)*p.depth*.008;const py=p.y+p.dy+(my-c.height/2)*p.depth*.008;p.x+=p.dx;p.y+=p.dy;if(p.x<-20)p.x=c.width+20;if(p.x>c.width+20)p.x=-20;if(p.y<-20)p.y=c.height+20;if(p.y>c.height+20)p.y=-20;ctx.beginPath();ctx.arc(px,py,p.r*(0.5+p.depth*0.5),0,Math.PI*2);ctx.fillStyle=`rgba(${cl},${p.o*(0.3+p.depth*0.7)})`;ctx.fill();}for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<120){ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.strokeStyle=`rgba(${cl},${.025*(1-d/120)})`;ctx.lineWidth=.5;ctx.stroke();}}id=requestAnimationFrame(draw);}draw();
    return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize);window.removeEventListener("mousemove",onMove);};
  },[dk]);
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

// ═══════════════════ CARD ART ═══════════════════
function CardArt({number,size=140}){
  const s=size,cx=s/2,cy=s/2;const col=D[number]?.c||"#d4af37";
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
  const sm=size==="sm";const w=sm?115:190;const h=sm?165:275;const ac=dk?"#d4af37":"#8B6914";
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
  const ac=dk?"#d4af37":"#8B6914";const s=300;const cx=s/2;const cy=s/2;const r=110;
  const axes=he?["מנהיגות","אינטואיציה","יצירתיות","יציבות","שאיפה","חכמה"]:["Leadership","Intuition","Creativity","Stability","Ambition","Wisdom"];
  const keys=["leadership","intuition","creativity","stability","ambition","wisdom"];
  const cols=["#FFD700","#9B59B6","#FF6B6B","#4ECDC4","#E67E22","#45B7D1"];
  const pts=keys.map((k,i)=>{const a=Math.PI*2/6*i-Math.PI/2;const v=psych[k]/10;return{x:cx+r*v*Math.cos(a),y:cy+r*v*Math.sin(a),ax:cx+r*Math.cos(a),ay:cy+r*Math.sin(a),lx:cx+(r+20)*Math.cos(a),ly:cy+(r+20)*Math.sin(a),v:psych[k],col:cols[i]};});
  const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
  return(<svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{display:"block",margin:"0 auto"}}>
    {[.25,.5,.75,1].map(f=><polygon key={f} points={keys.map((_,i)=>{const a=Math.PI*2/6*i-Math.PI/2;return`${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`;}).join(" ")} fill="none" stroke={ac} strokeWidth=".4" opacity={f===1?.2:.1}/>)}
    {pts.map((p,i)=><line key={i} x1={cx} y1={cy} x2={p.ax} y2={p.ay} stroke={ac} strokeWidth=".3" opacity=".15"/>)}
    <polygon points={poly} fill={ac} opacity=".08" stroke={ac} strokeWidth="1.5" opacity=".5"><animate attributeName="opacity" values=".04;.12;.04" dur="4s" repeatCount="indefinite"/></polygon>
    {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={4} fill={p.col} opacity=".7"><animate attributeName="r" values="3;5;3" dur={`${3+i*.5}s`} repeatCount="indefinite"/></circle></g>)}
    {pts.map((p,i)=><text key={`l${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={p.col} opacity=".7" fontFamily="sans-serif">{axes[i]}<tspan x={p.lx} dy="13" fontSize="12" fontWeight="700" fill={p.col}>{p.v}/10</tspan></text>)}
  </svg>);
}

// ═══════════════════ YEARLY WAVE TIMELINE ═══════════════════
function YearWave({proj,dk,he}){
  const ac=dk?"#d4af37":"#8B6914";
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
  const ac=dk?"#d4af37":"#8B6914";
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
  const ac=dk?"#d4af37":"#8B6914";
  if(!isRevealed)return(
    <div style={{textAlign:"center",padding:"40px 20px",opacity:isActive?1:.3,transition:"opacity .8s",cursor:isActive?"pointer":"default"}} onClick={isActive?onReveal:undefined}>
      <div style={{fontSize:40,marginBottom:12,opacity:.3,filter:isActive?"none":"blur(4px)",transition:"filter .5s"}}>{icon}</div>
      <div style={{fontSize:18,fontWeight:600,color:ac,opacity:isActive?1:.3,transition:"opacity .5s"}}>{title}</div>
      <div style={{fontSize:13,color:dk?"rgba(232,224,208,.3)":"rgba(0,0,0,.2)",marginTop:4}}>{subtitle}</div>
      {isActive&&<div style={{marginTop:16,fontSize:13,color:ac,opacity:.6,animation:"pulse 2s ease-in-out infinite"}}>{dk?"לחץ לחשיפה ▾":"Tap to reveal ▾"}</div>}
    </div>);
  return(<div style={{animation:"fadeInUp .8s ease-out",padding:"12px 0"}}>
    <div style={{textAlign:"center",marginBottom:20}}>
      <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:4,marginBottom:4}}>{`— ${index < 10 ? "0" : ""}${index} —`}</div>
      <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
      <h3 style={{fontSize:22,fontWeight:600,color:ac,marginBottom:4,fontFamily:"'Cormorant Garamond',serif"}}>{title}</h3>
      <div style={{fontSize:13,color:dk?"rgba(232,224,208,.35)":"rgba(0,0,0,.3)"}}>{subtitle}</div>
    </div>
    <div className="gc">{children}</div>
  </div>);
}

// ═══════════════════ INTRO ═══════════════════
function Intro({onDone,he,dk}){
  const[p,setP]=useState(0);const ac=dk?"#d4af37":"#8B6914";
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
  for(let i=0;i<100;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,Math.random()*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(212,175,55,${Math.random()*.2})`;ctx.fill();}
  ctx.strokeStyle="rgba(212,175,55,.12)";ctx.lineWidth=1;ctx.strokeRect(50,50,w-100,h-100);
  ctx.textAlign="center";ctx.fillStyle="#d4af37";ctx.font="100 58px serif";ctx.fillText("✦ "+(he?"נומרולוגיה":"NUMEROLOGY")+" ✦",w/2,140);
  ctx.fillStyle="rgba(232,224,208,.45)";ctx.font="32px serif";ctx.fillText(name,w/2,200);
  let yp=320;
  const nums=[{l:he?"שביל הגורל":"Life Path",v:r.lp},{l:he?"ערך השם":"Name Value",v:r.nv},{l:he?"קול הנשמה":"Soul Urge",v:r.su},{l:he?"מספר הביטוי":"Expression",v:r.ex},{l:he?"שנה אישית":"Personal Year",v:r.py},{l:he?"שנה נסתרת":"Hidden Year",v:r.hy}];
  nums.forEach(it=>{ctx.beginPath();ctx.arc(w/2,yp,36,0,Math.PI*2);ctx.fillStyle="rgba(212,175,55,.06)";ctx.fill();ctx.strokeStyle="rgba(212,175,55,.2)";ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle="#d4af37";ctx.font="bold 30px serif";ctx.fillText(String(it.v),w/2,yp+10);ctx.fillStyle="rgba(232,224,208,.35)";ctx.font="18px sans-serif";ctx.fillText(it.l,w/2,yp+50);yp+=100;});
  const li=interp[r.lp];if(li){yp+=30;ctx.fillStyle="#d4af37";ctx.font="bold 26px serif";ctx.fillText(`— ${he?li.t:li.te} —`,w/2,yp);}
  ctx.fillStyle="rgba(212,175,55,.15)";ctx.font="16px serif";ctx.fillText("✦  ✦  ✦",w/2,h-80);
  const link=document.createElement("a");link.download=`oracle-${name}.png`;link.href=c.toDataURL("image/png");link.click();
}

// ═══════════════════ TABLES WIDGET ═══════════════════
function TablesWidget({he,dk}){
  const ac=dk?"#d4af37":"#8B6914";
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
    try{
      setError("");
      const parts=dob.split(".");if(parts.length!==3)throw 0;
      const[d,m,y]=parts.map(Number);
      if(!d||!m||!y||d>31||m>12||y<1900)throw 0;
      const fullName=(firstName+" "+lastName).trim();
      AU.init();AU.p("reveal");
      const r=fullCalc(d,m,y,fullName,addOne);
      setResults(r);setShowExtra(false);setAnimIn(false);
      setTimeout(()=>setAnimIn(true),50);
    }catch{setError(he?"אנא ודא שכל הנתונים הוזנו כהלכה":"Please check all data is entered correctly");}
  };

  const thStyle={padding:"11px 14px",fontSize:12,fontWeight:700,color:ac,textAlign:"center",borderBottom:`2px solid ${ac}22`,letterSpacing:.3};
  const tdStyle={padding:"11px 14px",fontSize:14,fontWeight:500,color:tm,textAlign:"center",borderBottom:`1px solid ${ac}08`};
  const tdLabel={...tdStyle,fontWeight:600,color:ts,fontSize:13,textAlign:isRtl?"right":"left"};
  const tdValue={...tdStyle,fontSize:20,fontWeight:700,color:ac,fontFamily:"'Cormorant Garamond',serif"};

  const cycleLabels=he?["חיפוש","מציאה","יתד","שיא"]:["Search","Discovery","Anchor","Summit"];

  return(<div style={{animation:"fadeInUp .5s ease-out"}}>
    {/* Input Form */}
    <div className="gc" style={{marginBottom:20}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:10,color:`${ac}55`,textTransform:"uppercase",letterSpacing:4,marginBottom:6}}>{he?"פרטים למילוי":"Enter Details"}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"שם פרטי":"First Name"}</label>
          <input className="gi" placeholder={he?"שם פרטי...":"First name..."} value={firstName} onChange={e=>setFirstName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/>
        </div>
        <div>
          <label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"שם משפחה":"Last Name"}</label>
          <input className="gi" placeholder={he?"שם משפחה...":"Last name..."} value={lastName} onChange={e=>setLastName(e.target.value)} dir="rtl" style={{textAlign:"right"}}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end",marginBottom:14}}>
        <div>
          <label style={{display:"block",marginBottom:6,fontSize:11,color:`${ac}99`,fontWeight:500}}>{he?"תאריך לידה":"Date of Birth"}</label>
          <input className="gi" placeholder="dd.mm.yyyy" value={dob} onChange={e=>setDob(e.target.value)} dir="ltr" style={{textAlign:"center",letterSpacing:3,fontFamily:"'Cormorant Garamond',serif"}} onKeyDown={e=>{if(e.key==="Enter")doCalc();}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",paddingBottom:4,height:54,paddingTop:22}} onClick={()=>setAddOne(!addOne)}>
          <div style={{width:20,height:20,borderRadius:6,border:`1.5px solid ${ac}44`,background:addOne?`${ac}1a`:dk?"rgba(8,8,18,.6)":"rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",flexShrink:0}}>{addOne&&<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke={ac} strokeWidth="2" strokeLinecap="round"/></svg>}</div>
          <span style={{fontSize:11,color:ts,whiteSpace:"nowrap"}}>{he?"הוסף 1":"Add 1"}</span>
        </div>
      </div>
      {error&&<div style={{padding:"10px 14px",background:"rgba(180,50,50,.12)",border:"1px solid rgba(180,50,50,.25)",borderRadius:10,color:"#e8a0a0",fontSize:13,marginBottom:14,textAlign:"center"}}>{error}</div>}
      <button className="gb" disabled={!firstName.trim()||!dob.trim()} onClick={doCalc}>{he?"חשב":"Calculate"}</button>
    </div>

    {/* ═══ RESULTS ═══ */}
    {results&&animIn&&(<div style={{animation:"fadeInUp .7s ease-out"}}>

      {/* ── TABLE 1: General Results (Core) ── */}
      <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}>
          <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"תוצאות כלליות":"General Results"}</h4>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:dk?"rgba(212,175,55,.03)":"rgba(139,105,20,.02)"}}>
                <th style={{...thStyle,textAlign:isRtl?"right":"left",paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{he?"קטגוריה":"Category"}</th>
                <th style={thStyle}>{he?"ערך":"Value"}</th>
              </tr>
            </thead>
            <tbody>
              {[
                {l:he?"ערך השם":"Name Value",v:results.nv},
                {l:he?"שביל הגורל":"Life Path",v:results.lp},
                {l:he?"שנה אישית":"Personal Year",v:results.py},
                {l:he?"שנה נסתרת":"Hidden Year",v:results.hy},
                {l:he?"גיל נוכחי":"Current Age",v:results.age},
              ].map((row,i)=>(
                <tr key={i} style={{background:i%2===0?"transparent":(dk?"rgba(212,175,55,.015)":"rgba(139,105,20,.01)")}}>
                  <td style={{...tdLabel,paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{row.l}</td>
                  <td style={tdValue}>{row.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLE 2: Life Cycles (Core) ── */}
      <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}>
          <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מחזורי חיים | פסגות ואתגרים":"Life Cycles | Peaks & Challenges"}</h4>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:dk?"rgba(212,175,55,.03)":"rgba(139,105,20,.02)"}}>
                <th style={{...thStyle,fontSize:11}}>{he?"מחזור חיים":"Life Cycle"}</th>
                <th style={{...thStyle,fontSize:11}}>{he?"פסגה":"Peak"}</th>
                <th style={{...thStyle,fontSize:11}}>{he?"אתגר":"Challenge"}</th>
                <th style={{...thStyle,fontSize:11}}>{he?"פסגה נסתרת":"Hidden Peak"}</th>
                <th style={{...thStyle,fontSize:11}}>{he?"אתגר נסתר":"Hidden Chal."}</th>
              </tr>
            </thead>
            <tbody>
              {cycleLabels.map((label,i)=>{
                const sa=results.exit+i*9;
                const active=results.age>=sa&&results.age<sa+9;
                return(
                  <tr key={i} style={{background:active?(dk?"rgba(212,175,55,.06)":"rgba(212,175,55,.05)"):(i%2===0?"transparent":(dk?"rgba(212,175,55,.015)":"rgba(139,105,20,.01)"))}}>
                    <td style={{...tdStyle,fontWeight:600,color:active?ac:ts,fontSize:12,whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
                        {active&&<span style={{display:"inline-block",width:5,height:5,borderRadius:3,background:ac,boxShadow:`0 0 6px ${ac}66`,flexShrink:0}}/>}
                        <span>{label}</span>
                        <span style={{fontSize:9,color:ts,opacity:.5}}>{sa}-{sa+9}</span>
                      </div>
                    </td>
                    <td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{results.pk[i]}</td>
                    <td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?"#e88":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.ch[i]}</td>
                    <td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?`${ac}bb`:ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hp[i]}</td>
                    <td style={{...tdStyle,fontSize:18,fontWeight:700,color:active?"#e88bb":ts,fontFamily:"'Cormorant Garamond',serif"}}>{results.hc[i]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EXPAND BUTTON for extras ── */}
      <div style={{textAlign:"center",margin:"20px 0"}}>
        <button className="ghost" onClick={()=>{setShowExtra(!showExtra);AU.init();AU.p("click");}} style={{display:"inline-flex",alignItems:"center",gap:8}}>
          <span>{he?(showExtra?"הסתר תוצאות נוספות":"הצג תוצאות נוספות"):(showExtra?"Hide Extra Results":"Show Extra Results")}</span>
          <span style={{transform:showExtra?"rotate(180deg)":"rotate(0)",transition:"transform .3s",display:"inline-block"}}>▾</span>
        </button>
      </div>

      {/* ── EXTRA SECTION (expandable) ── */}
      {showExtra&&(<div style={{animation:"fadeInUp .5s ease-out"}}>

        {/* Extra: Soul & Expression */}
        <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}>
            <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"נשמה וביטוי":"Soul & Expression"}</h4>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:dk?"rgba(212,175,55,.03)":"rgba(139,105,20,.02)"}}>
                  <th style={{...thStyle,textAlign:isRtl?"right":"left",paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{he?"קטגוריה":"Category"}</th>
                  <th style={thStyle}>{he?"ערך":"Value"}</th>
                  <th style={thStyle}>{he?"ארכיטיפ":"Archetype"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {l:he?"קול הנשמה":"Soul Urge",v:results.su},
                  {l:he?"מספר הביטוי":"Expression",v:results.ex},
                  {l:he?"חודש אישי":"Personal Month",v:results.pm},
                  {l:he?"יום אישי":"Personal Day",v:results.pd},
                ].map((row,i)=>(
                  <tr key={i} style={{background:i%2===0?"transparent":(dk?"rgba(212,175,55,.015)":"rgba(139,105,20,.01)")}}>
                    <td style={{...tdLabel,paddingRight:isRtl?20:14,paddingLeft:isRtl?14:20}}>{row.l}</td>
                    <td style={tdValue}>{row.v}</td>
                    <td style={{...tdStyle,fontSize:12,color:D[row.v]?.c||ac,opacity:.8}}>{row.v>0&&row.v<=9?(he?D[row.v]?.t:D[row.v]?.te):""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extra: Karmic Debts */}
        <div className="gc" style={{marginBottom:16}}>
          <div style={{textAlign:"center",marginBottom:12}}>
            <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"חובות קארמיים":"Karmic Debts"}</h4>
          </div>
          {results.kd.length===0?(
            <div style={{textAlign:"center",padding:"16px",background:`${ac}06`,borderRadius:12}}>
              <span style={{fontSize:18}}>🕊</span>
              <span style={{fontSize:13,color:ts,marginRight:8,marginLeft:8}}>{he?"אין חוב קארמי":"No karmic debt"}</span>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {results.kd.map(k=>(
                <div key={k} style={{padding:"12px 14px",background:"rgba(180,50,50,.05)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20,fontWeight:700,color:"#e88",fontFamily:"'Cormorant Garamond',serif",flexShrink:0}}>{k}</span>
                  <span style={{fontSize:12,lineHeight:1.7,color:ts}}>{KARMA[k]?.[he?"he":"en"]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extra: Lo Shu Grid */}
        <div className="gc" style={{marginBottom:16}}>
          <div style={{textAlign:"center",marginBottom:12}}>
            <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>Lo Shu Grid</h4>
            {results.ls.miss.length>0&&<p style={{fontSize:11,color:ts,marginTop:4}}>{he?"חסרים: ":"Missing: "}{results.ls.miss.join(", ")}</p>}
          </div>
          <LoShu ls={results.ls} dk={dk} he={he}/>
        </div>

        {/* Extra: Year Projection */}
        <div className="gc" style={{marginBottom:16,padding:0,overflow:"hidden"}}>
          <div style={{padding:"16px 20px 10px",textAlign:"center",borderBottom:`1px solid ${ac}0a`}}>
            <h4 style={{fontSize:17,fontWeight:isRtl?700:500,color:ac,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{he?"מחזור שנים אישי":"Personal Year Cycle"}</h4>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:dk?"rgba(212,175,55,.03)":"rgba(139,105,20,.02)"}}>
                  <th style={thStyle}>{he?"שנה":"Year"}</th>
                  <th style={thStyle}>{he?"שנה אישית":"P. Year"}</th>
                  <th style={thStyle}>{he?"אנרגיה":"Energy"}</th>
                </tr>
              </thead>
              <tbody>
                {results.proj.map((p,i)=>(
                  <tr key={i} style={{background:p.isCurrent?(dk?"rgba(212,175,55,.06)":"rgba(212,175,55,.05)"):(i%2===0?"transparent":(dk?"rgba(212,175,55,.015)":"rgba(139,105,20,.01)"))}}>
                    <td style={{...tdStyle,fontWeight:p.isCurrent?700:400,color:p.isCurrent?ac:ts,fontSize:13}}>
                      {p.year}{p.isCurrent&&<span style={{fontSize:8,color:ac,opacity:.6,marginRight:4,marginLeft:4}}>◀</span>}
                    </td>
                    <td style={{...tdStyle,fontSize:18,fontWeight:700,color:p.isCurrent?ac:tm,fontFamily:"'Cormorant Garamond',serif"}}>{p.py}</td>
                    <td style={{...tdStyle,fontSize:11,color:p.isCurrent?ac:ts}}>{he?D[p.py]?.t:D[p.py]?.te}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>)}

      {/* Reset */}
      <div style={{textAlign:"center",marginTop:8}}>
        <button className="ghost" onClick={()=>{setResults(null);setFirstName("");setLastName("");setDob("");setAddOne(false);setShowExtra(false);AU.init();AU.p("click");}}>
          {he?"חישוב חדש":"New Calculation"}
        </button>
      </div>
    </div>)}
  </div>);
}

// ═══════════════════ MAIN APP ═══════════════════
export default function App(){
  const[lang,setLang]=useState("he");const[dk,setDk]=useState(true);const[snd,setSnd]=useState(true);const[intro,setIntro]=useState(true);
  const[step,setStep]=useState(1);const[tab,setTab]=useState("reading");const[name,setName]=useState("");const[dob,setDob]=useState("");const[addOne,setAddOne]=useState(false);
  const[results,setResults]=useState(null);const[showRes,setShowRes]=useState(false);const[error,setError]=useState("");
  const[chapters,setChapters]=useState([false,false,false,false,false,false]);
  const[streak,setStreak]=useState(0);

  const he=lang==="he";const isRtl=he;const ac=dk?"#d4af37":"#8B6914";const tm=dk?"#e8e0d0":"#2a2520";const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  useEffect(()=>{AU.on=snd;},[snd]);

  useEffect(()=>{
    try{const raw=localStorage.getItem("streak");if(raw){const d=JSON.parse(raw);const today=new Date().toDateString();if(d.last===today)setStreak(d.count);else if(d.last===new Date(Date.now()-86400000).toDateString())setStreak(d.count+1);else setStreak(1);}}catch(e){}
  },[]);

  const saveStreak=useCallback(()=>{
    try{const today=new Date().toDateString();localStorage.setItem("streak",JSON.stringify({count:streak||1,last:today}));}catch(e){}
  },[streak]);

  const revealChapter=(i)=>{AU.init();AU.p("chapter");const next=[...chapters];next[i]=true;setChapters(next);};

  const doCalc=useCallback(()=>{
    try{setError("");const parts=dob.split(".");if(parts.length!==3)throw 0;const[d,m,y]=parts.map(Number);if(!d||!m||!y||d>31||m>12||y<1900)throw 0;
      AU.init();AU.p("reveal");const r=fullCalc(d,m,y,name,addOne);setResults(r);setShowRes(true);
      setChapters([false,false,false,false,false,false]);
      setTimeout(()=>{setChapters(c=>{const n=[...c];n[0]=true;return n;});AU.p("chapter");},800);saveStreak();
    }catch{setError(he?"אנא ודא שכל הנתונים הוזנו כהלכה":"Please check that all data is entered correctly");}
  },[name,dob,addOne,he,saveStreak]);

  const goHome=()=>{
    AU.init();AU.p("click");
    setShowRes(false);setResults(null);setStep(1);setName("");setDob("");setAddOne(false);
    setChapters([false,false,false,false,false,false]);setTab("reading");
  };

  const nextUnrevealed=chapters.findIndex(c=>!c);
  const chapterDefs=results?[
    {icon:"🌟",title:he?"מהות":"Essence",sub:he?"מי את/ה באמת":"Who you truly are"},
    {icon:"🔮",title:he?"גורל":"Destiny",sub:he?"השביל שלך":"Your path"},
    {icon:"🌊",title:he?"העונה הנוכחית":"Current Season",sub:he?"האנרגיה של עכשיו":"The energy of now"},
    {icon:"🗺",title:he?"מפת החיים":"Life Map",sub:he?"מחזורים ותחנות":"Cycles and stations"},
    {icon:"🧠",title:he?"העולם הפנימי":"Inner World",sub:he?"הפסיכולוגיה שלך":"Your psychology"},
    {icon:"⚡",title:he?"הדרך קדימה":"Path Forward",sub:he?"המלצות וטקסים":"Guidance and rituals"},
  ]:[];

  return(<div dir={isRtl?"rtl":"ltr"} style={{minHeight:"100vh",background:dk?"linear-gradient(170deg,#080812 0%,#0f0f28 35%,#0a0a1a 65%,#080812 100%)":"linear-gradient(170deg,#f5f0e8 0%,#ede5d8 35%,#f0ebe0 65%,#f5f0e8 100%)",color:tm,fontFamily:isRtl?"'Noto Sans Hebrew','Heebo',sans-serif":"'Cormorant Garamond','Georgia',serif",position:"relative",overflow:"hidden",transition:"background .7s,color .4s"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Hebrew:wght@300;400;500;600;700&family=Heebo:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${ac}33;border-radius:3px}
@keyframes fadeInUp{from{opacity:0;transform:translateY(35px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes glow{0%,100%{box-shadow:0 0 15px ${ac}12}50%{box-shadow:0 0 35px ${ac}28}}
.gc{background:${dk?"linear-gradient(135deg,rgba(18,18,38,.75),rgba(12,12,28,.55))":"linear-gradient(135deg,rgba(255,255,255,.88),rgba(245,240,232,.72))"};backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid ${dk?"rgba(212,175,55,.1)":"rgba(139,105,20,.12)"};border-radius:22px;padding:28px;position:relative;overflow:hidden;transition:background .4s}.gc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${ac}44,transparent)}
.gi{width:100%;background:${dk?"rgba(8,8,18,.7)":"rgba(255,255,255,.75)"};border:1px solid ${dk?"rgba(212,175,55,.18)":"rgba(139,105,20,.18)"};border-radius:14px;padding:16px 20px;color:${tm};font-size:17px;font-family:inherit;outline:none;transition:all .4s}.gi::placeholder{color:${ts}}.gi:focus{border-color:${ac}88;box-shadow:0 0 30px ${ac}12}
.gb{width:100%;padding:17px 30px;background:linear-gradient(135deg,${dk?"#d4af37":"#b8942e"},${dk?"#b8942e":"#8B6914"},${dk?"#d4af37":"#b8942e"});background-size:200% 100%;color:${dk?"#080812":"#fff"};font-family:inherit;font-size:17px;font-weight:600;border:none;border-radius:14px;cursor:pointer;transition:all .4s;letter-spacing:.5px}.gb:hover{background-position:100% 0;box-shadow:0 8px 40px ${ac}44;transform:translateY(-2px)}.gb:active{transform:translateY(0)}.gb:disabled{opacity:.3;cursor:not-allowed;transform:none;box-shadow:none}
.ghost{padding:13px 24px;background:transparent;color:${ac};font-family:inherit;font-size:15px;font-weight:500;border:1px solid ${ac}44;border-radius:12px;cursor:pointer;transition:all .3s}.ghost:hover{background:${ac}0e;border-color:${ac}88}
.orb{width:60px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle at 30% 30%,${ac}1a,${ac}06);border:1px solid ${ac}33;font-size:23px;font-weight:700;color:${ac};animation:glow 5s ease-in-out infinite;flex-shrink:0;cursor:pointer;transition:all .3s}.orb:hover{transform:scale(1.1)}
.tbar{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:${dk?"rgba(8,8,18,.85)":"rgba(245,240,232,.92)"};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid ${ac}0a;transition:background .4s}
.tbtn{padding:6px 11px;background:${dk?"rgba(18,18,38,.8)":"rgba(255,255,255,.7)"};border:1px solid ${ac}1a;border-radius:8px;color:${ac};font-size:11px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit}.tbtn:hover{background:${ac}12}.tbtn.act{background:${ac}1a;border-color:${ac}55}
.home-btn{padding:6px 14px;background:${dk?"rgba(212,175,55,.08)":"rgba(139,105,20,.06)"};border:1px solid ${ac}33;border-radius:8px;color:${ac};font-size:12px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit;display:flex;align-items:center;gap:5px}.home-btn:hover{background:${ac}1a;border-color:${ac}66;transform:scale(1.02)}
.tabs{display:flex;gap:2px;padding:2px;background:${dk?"rgba(18,18,38,.4)":"rgba(0,0,0,.03)"};border-radius:12px;margin-bottom:22px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.ti{flex:1;text-align:center;padding:10px 6px;border-radius:10px;font-size:12px;font-weight:${isRtl?600:500};cursor:pointer;transition:all .3s;color:${ts};border:1px solid transparent;white-space:nowrap}.ti.act{background:${dk?"rgba(212,175,55,.08)":"rgba(139,105,20,.06)"};color:${ac};border-color:${ac}28}
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
    <Particles dk={dk}/>

    {/* ═══ TOP BAR with HOME BUTTON ═══ */}
    <div className="tbar">
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <button className="home-btn" onClick={goHome}>
          <span style={{fontSize:14}}>✦</span>
          <span>{he?"בית":"Home"}</span>
        </button>
      </div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {streak>1&&<span style={{fontSize:10,color:ac,opacity:.5}}>🔥{streak}</span>}
        <button className="tbtn" onClick={()=>{setLang(lang==="he"?"en":"he");AU.init();AU.p("click");}}>{he?"EN":"עב"}</button>
        <button className="tbtn" onClick={()=>{setDk(!dk);AU.init();AU.p("click");}}>{dk?"☀":"🌙"}</button>
        <button className={`tbtn ${snd?"act":""}`} onClick={()=>{AU.init();setSnd(!snd);AU.p("click");}}>{snd?"🔊":"🔇"}</button>
      </div>
    </div>

    <div style={{position:"relative",zIndex:1,maxWidth:580,margin:"0 auto",padding:"62px 16px 70px",minHeight:"100vh"}}>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:30,animation:"fadeInUp .9s ease-out"}}>
        <h1 style={{fontSize:isRtl?42:48,fontWeight:isRtl?700:300,color:ac,letterSpacing:isRtl?0:8,textTransform:isRtl?"none":"uppercase",textShadow:`0 0 60px ${ac}33`,lineHeight:1.2,fontFamily:"'Cormorant Garamond',serif"}}>{he?"נומרולוגיה":"Numerology"}</h1>
        <p style={{fontSize:isRtl?13:15,color:ts,fontWeight:300,marginTop:5,letterSpacing:isRtl?0:3,fontStyle:isRtl?"normal":"italic"}}>{he?"גלה את סודות המספרים שלך":"Discover the secrets of your numbers"}</p>
      </div>

      {/* ═══ INPUT TABS ═══ */}
      {!showRes&&(<>
        <div className="tabs" style={{animation:"fadeInUp .5s ease-out .2s both"}}>
          {[{k:"reading",i:"🔮",l:he?"קריאה":"Reading"},{k:"tables",i:"📊",l:he?"טבלאות":"Tables"},{k:"match",i:"💫",l:he?"התאמה":"Match"},{k:"daily",i:"✨",l:he?"יומי":"Daily"},{k:"cards",i:"🃏",l:he?"קלפים":"Cards"}].map(tb=>(
            <div key={tb.k} className={`ti ${tab===tb.k?"act":""}`} onClick={()=>{setTab(tb.k);AU.init();AU.p("click");}}>{tb.i} {tb.l}</div>
          ))}
        </div>

        {tab==="tables"&&<TablesWidget he={he} dk={dk}/>}

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

        {tab==="reading"&&(
          <div style={{animation:"fadeInUp .6s ease-out"}}>
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
      {showRes&&results&&(<div>
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
            <div style={{padding:"16px",background:dk?"rgba(180,50,50,.06)":"rgba(180,50,50,.04)",border:"1px solid rgba(180,50,50,.12)",borderRadius:14,textAlign:"center"}}><div style={{fontSize:20,marginBottom:6}}>🌑</div><div style={{fontSize:11,fontWeight:600,color:"#e88",marginBottom:4}}>{he?"צד צל":"Shadow"}</div><div style={{fontSize:12,lineHeight:1.7,color:ts}}>{he?D[results.lp]?.shadow:D[results.lp]?.shadowE}</div></div>
            <div style={{padding:"16px",background:`${ac}06`,border:`1px solid ${ac}12`,borderRadius:14,textAlign:"center"}}><div style={{fontSize:20,marginBottom:6}}>🌱</div><div style={{fontSize:11,fontWeight:600,color:ac,marginBottom:4}}>{he?"צמיחה":"Growth"}</div><div style={{fontSize:12,lineHeight:1.7,color:ts}}>{he?D[results.lp]?.growth:D[results.lp]?.growthE}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
            {[{i:"💎",l:he?"אבן":"Stone",v:D[results.lp]?.stone},{i:"🔮",l:he?"קריסטל":"Crystal",v:D[results.lp]?.crystal},{i:"🎨",l:he?"צבע":"Color",v:D[results.lp]?.color},{i:"📅",l:he?"יום מזל":"Lucky Day",v:D[results.lp]?.luck}].map((it,i)=>(
              <div key={i} style={{padding:"12px",background:dk?"rgba(18,18,38,.35)":"rgba(255,255,255,.4)",border:`1px solid ${ac}0a`,borderRadius:11,textAlign:"center"}}><div style={{fontSize:18}}>{it.i}</div><div style={{fontSize:9,color:ts,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{it.l}</div><div style={{fontSize:12,fontWeight:600,color:ac,marginTop:2}}>{it.v}</div></div>
            ))}
          </div>
          {results.kd.length>0&&(<div style={{marginTop:16}}><div className="divider"/><div style={{textAlign:"center",marginBottom:10}}><span style={{fontSize:20}}>⚡</span><span style={{fontSize:15,fontWeight:600,color:"#e88",marginLeft:8,marginRight:8}}>{he?"חוב קארמי":"Karmic Debt"}</span></div>{results.kd.map(k=><div key={k} style={{padding:"14px",background:"rgba(180,50,50,.05)",border:"1px solid rgba(180,50,50,.1)",borderRadius:12,marginBottom:8}}><div style={{fontSize:13,lineHeight:1.8,color:ts}}><strong style={{color:"#e88"}}>{k}</strong> — {KARMA[k]?.[he?"he":"en"]}</div></div>)}</div>)}
          {results.kd.length===0&&(<div style={{textAlign:"center",marginTop:14,padding:"14px",background:`${ac}06`,borderRadius:12}}><span style={{fontSize:18}}>🕊</span><span style={{fontSize:13,color:ts,marginLeft:8,marginRight:8}}>{he?"אין חוב קארמי":"No karmic debt"}</span></div>)}
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
          {getRecommendations(results,lang).map((rec,i)=>(<div key={i} className="rec-card"><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><span style={{fontSize:22}}>{rec.icon}</span><span style={{fontSize:15,fontWeight:600,color:ac}}>{rec.t}</span></div><p style={{fontSize:13,lineHeight:1.8,color:ts}}>{rec.d}</p></div>))}
          <div className="divider"/>
          <div style={{textAlign:"center",marginBottom:14}}><div style={{fontSize:24}}>🎯</div><div style={{fontSize:15,fontWeight:600,color:ac,marginTop:4}}>{he?"קריירות מתאימות":"Ideal Careers"}</div><div style={{fontSize:14,color:ts,marginTop:6,lineHeight:1.8}}>{D[results.lp]?.career}</div></div>
        </Chapter>

        {chapters[5]&&(<SR delay={200}><div style={{display:"flex",gap:10,justifyContent:"center",marginTop:24,flexWrap:"wrap"}}>
          <button className="gb" onClick={()=>{AU.init();AU.p("chapter");exportReport(results,name,he,D);}} style={{width:"auto",padding:"12px 24px",fontSize:14}}>📤 {he?"שמור דו״ח":"Save Report"}</button>
          <button className="ghost" onClick={goHome}>{he?"קריאה חדשה":"New Reading"}</button>
        </div></SR>)}
      </div>)}

      <div style={{marginTop:40,textAlign:"center",fontSize:10,color:`${ac}15`,letterSpacing:3}}>✦ ✦ ✦</div>
    </div>
  </div>);
}

// ═══════════════════ COMPAT WIDGET ═══════════════════
function CompatWidget({he,dk}){
  const ac=dk?"#d4af37":"#8B6914";const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const[n1,setN1]=useState("");const[n2,setN2]=useState("");const[res,setRes]=useState(null);const[anim,setAnim]=useState(false);
  const check=()=>{if(!n1.trim()||!n2.trim())return;AU.init();AU.p("reveal");setAnim(true);setRes(null);setTimeout(()=>{const v1=NV(n1),v2=NV(n2);let s=100-Math.abs(v1-v2)*8;if(v1===v2)s=98;s=Math.max(15,Math.min(99,s));const harmony=Math.min(10,s/10);const tension=Math.min(10,(100-s)/12);const growth=Math.min(10,Math.abs(v1-v2)+3);setRes({v1,v2,score:s,harmony,tension,growth});setAnim(false);AU.p("chapter");},1500);};
  const desc=(s)=>s>=85?(he?"התאמה יוצאת דופן!":"Exceptional match!"):s>=65?(he?"התאמה טובה מאוד.":"Very good match."):s>=40?(he?"התאמה מעניינת עם פוטנציאל.":"Interesting match with potential."):(he?"התאמה מאתגרת — אבל הניגודים יוצרים עומק.":"Challenging match — opposites create depth.");
  return(<div className="gc" style={{marginTop:12,animation:"fadeInUp .5s ease-out"}}>
    <h3 style={{textAlign:"center",fontSize:20,color:ac,marginBottom:20,fontWeight:600}}>{he?"מטריצת יחסים":"Relationship Matrix"}</h3>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
      <div><label style={{fontSize:11,color:`${ac}99`,marginBottom:4,display:"block"}}>{he?"שם ראשון":"First Name"}</label><input className="gi" value={n1} onChange={e=>setN1(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
      <div><label style={{fontSize:11,color:`${ac}99`,marginBottom:4,display:"block"}}>{he?"שם שני":"Second Name"}</label><input className="gi" value={n2} onChange={e=>setN2(e.target.value)} dir="rtl" style={{textAlign:"right"}}/></div>
    </div>
    <button className="gb" onClick={check} disabled={!n1.trim()||!n2.trim()}>{he?"בדוק":"Check"}</button>
    {anim&&<div style={{textAlign:"center",marginTop:24}}><div style={{width:50,height:50,border:`2px solid ${ac}33`,borderTopColor:ac,borderRadius:"50%",margin:"0 auto",animation:"spin 1s linear infinite"}}/></div>}
    {res&&!anim&&(<div style={{marginTop:24,textAlign:"center",animation:"fadeInUp .6s ease-out"}}>
      <div style={{position:"relative",width:120,height:120,margin:"0 auto 16px"}}><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="53" fill="none" stroke={`${ac}10`} strokeWidth="4"/><circle cx="60" cy="60" r="53" fill="none" stroke={ac} strokeWidth="4" strokeDasharray={`${res.score*3.33} 333`} strokeLinecap="round" transform="rotate(-90 60 60)" style={{transition:"stroke-dasharray 1.5s ease"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:30,fontWeight:700,color:ac}}>{res.score}%</span></div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,margin:"16px 0"}}>
        {[{l:he?"הרמוניה":"Harmony",v:res.harmony,c:"#4ECDC4"},{l:he?"מתח":"Tension",v:res.tension,c:"#E74C3C"},{l:he?"צמיחה":"Growth",v:res.growth,c:"#FFD700"}].map((it,i)=>(
          <div key={i} style={{textAlign:"center"}}><div style={{fontSize:10,color:ts,marginBottom:4}}>{it.l}</div><div style={{height:6,background:dk?"rgba(20,20,40,.4)":"rgba(0,0,0,.05)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${it.v*10}%`,background:it.c,borderRadius:3,transition:"width 1.5s ease"}}/></div><div style={{fontSize:12,fontWeight:700,color:it.c,marginTop:4}}>{it.v}/10</div></div>
        ))}
      </div>
      <p style={{fontSize:14,color:ts,lineHeight:1.8}}>{desc(res.score)}</p>
    </div>)}
  </div>);
}

// ═══════════════════ AFFIRMATION WIDGET ═══════════════════
function AffirmWidget({he,dk}){
  const ac=dk?"#d4af37":"#8B6914";const[rev,setRev]=useState(false);
  const today=new Date();const seed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();
  const msg=AFFIRMATIONS[seed%AFFIRMATIONS.length];
  return(<div style={{textAlign:"center",padding:"16px 0"}}>
    <div style={{fontSize:32,marginBottom:12,opacity:.25}}>✨</div>
    <p style={{fontSize:12,color:dk?"rgba(232,224,208,.35)":"rgba(0,0,0,.3)",marginBottom:16}}>{he?"ההודעה שלך להיום":"Your message today"}</p>
    {!rev?(<div onClick={()=>{setRev(true);AU.init();AU.p("card");}} style={{cursor:"pointer",padding:"28px 20px",background:dk?"rgba(18,18,38,.5)":"rgba(255,255,255,.6)",border:`1.5px solid ${ac}28`,borderRadius:16,maxWidth:300,margin:"0 auto",transition:"all .3s"}}><div style={{fontSize:20,color:ac,opacity:.35,marginBottom:6}}>🔮</div><div style={{fontSize:13,color:ac,letterSpacing:2}}>{he?"חשוף":"Reveal"}</div></div>):(<div style={{animation:"fadeInUp .8s ease-out",padding:"24px 20px",background:`${ac}06`,border:`1px solid ${ac}1a`,borderRadius:16,maxWidth:320,margin:"0 auto"}}><div style={{fontSize:17,lineHeight:2.2,color:dk?"#e8e0d0":"#2a2520",fontWeight:500,fontStyle:"italic"}}>"{msg[he?"he":"en"]}"</div><div style={{marginTop:10,fontSize:10,color:`${ac}55`,letterSpacing:2}}>✦ {today.toLocaleDateString(he?"he-IL":"en-US")} ✦</div></div>)}
  </div>);
}

// ═══════════════════ RITUAL WIDGET ═══════════════════
function RitualWidget({number,he,dk}){
  const ac=dk?"#d4af37":"#8B6914";const ts=dk?"rgba(232,224,208,.4)":"rgba(42,37,32,.4)";
  const info=D[number]||D[1];const r=info.ritual;
  return(<div><div style={{textAlign:"center",marginBottom:14}}><div style={{fontSize:18}}>🕯</div><div style={{fontSize:14,fontWeight:600,color:ac,marginTop:4}}>{he?"טקס יומי":"Daily Ritual"}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {[{i:"🎯",l:he?"מילת מפתח":"Focus Word",v:he?r.word:r.wordE},{i:"⚡",l:he?"פעולה":"Action",v:he?r.act:r.actE},{i:"🪞",l:he?"התבוננות":"Reflection",v:he?r.reflect:r.reflectE},{i:"🕯",l:he?"מיקרו-טקס":"Micro Ritual",v:he?r.micro:r.microE}].map((it,i)=>(
        <div key={i} className="ritual-item"><div style={{fontSize:18,marginBottom:4}}>{it.i}</div><div style={{fontSize:9,color:ts,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{it.l}</div><div style={{fontSize:12,lineHeight:1.7,color:dk?"rgba(232,224,208,.55)":"rgba(0,0,0,.45)"}}>{it.v}</div></div>
      ))}
    </div>
  </div>);
}
