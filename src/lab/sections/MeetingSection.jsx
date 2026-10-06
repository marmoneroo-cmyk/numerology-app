/**
 * Lab section for meeting mode: opens it over a made-up reading. The people and
 * texts are samples only; nothing here signs in or calls the network.
 */
import { useState } from "react";
import MeetingMode from "../../studio/MeetingMode.jsx";

const SAMPLES = {
  rachel: {
    person: "רחל כהן",
    main: { value: 7, label: "מספר מסלול החיים" },
    numbers: [
      { value: 3, label: "ביטוי" },
      { value: 5, label: "נשמה" },
      { value: 9, label: "שנה אישית" },
    ],
    text: "מסלול 7 הוא מסלול של חיפוש אחר אמת ועומק. הכוח שלו נמצא בשקט, בהתבוננות ובסקרנות שלא נגמרת.",
  },
  master: {
    person: "יוסי לוי",
    main: { value: 11, label: "מספר מסלול החיים" },
    numbers: [
      { value: 22, label: "ביטוי" },
      { value: 6, label: "נשמה" },
      { value: 4, label: "שנה אישית" },
    ],
    text: "מספר המאסטר 11 מביא אינטואיציה חדה, השראה ורגישות גבוהה. זהו מסלול שמבקש להקשיב לקול הפנימי ולתת לו מקום.",
  },
};

export default function MeetingSection() {
  const [sample, setSample] = useState(null);
  return (
    <div className="st-view" style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>
        לוחצים כדי לפתוח קריאה לדוגמה על כל החלון. Esc או הכפתור בפינה מסיימים את הפגישה, והמיקוד חוזר לכפתור שפתח אותה.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="fx lab-btn" onClick={() => setSample(SAMPLES.rachel)}>מצב פגישה</button>
        <button type="button" className="fx lab-btn" onClick={() => setSample(SAMPLES.master)}>מספר מאסטר 11</button>
      </div>
      <MeetingMode open={sample !== null} onClose={() => setSample(null)} he {...sample} />
    </div>
  );
}
