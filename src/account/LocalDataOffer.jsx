/**
 * Client files saved on this device before there were accounts (step 2) can
 * move into the account, where every device of the subscriber sees them.
 * The upload is a merge restore: nothing in the account is replaced. The
 * device copy stays as it was.
 */
import { useState } from "react";
import { openWorkspaceStore } from "../data/open.js";
import { Card, useLoad, colors, btnPrimary, btnGhost } from "../workspace/ui.jsx";
import { countLabel } from "../workspace/format.js";

const flagFor = (userId) => `numerology_device_data_uploaded_${userId}`;
function uploadedBefore(userId) {
  try {
    return localStorage.getItem(flagFor(userId)) !== null;
  } catch {
    return false;
  }
}
function rememberUpload(userId) {
  try {
    localStorage.setItem(flagFor(userId), new Date().toISOString());
  } catch {
    /* storage refused: the offer may appear again, and uploading again changes nothing */
  }
}

export default function LocalDataOffer({ store, userId, he, dk, logEvent, onUploaded, openDeviceStore = openWorkspaceStore }) {
  const c = colors(dk);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const found = useLoad(async () => {
    if (uploadedBefore(userId)) return null;
    const device = await openDeviceStore();
    if (!device.persistent) return null;
    const clients = await device.clients.list({ includeArchived: true });
    return clients.length ? { device, count: clients.length } : null;
  }, [userId]);

  if (hidden || (!found.data && !result)) return null;

  const upload = async () => {
    setBusy(true);
    try {
      const counts = await store.importAll(await found.data.device.exportAll());
      rememberUpload(userId);
      await logEvent("local_data_uploaded").catch(() => {});
      const parts = [countLabel(counts.clients, "clients", he), countLabel(counts.readings, "readings", he), countLabel(counts.attachments, "files", he)];
      setResult({ ok: true, text: he ? `הועברו לחשבון: ${parts.join(", ")}` : `Moved to the account: ${parts.join(", ")}` });
      onUploaded();
    } catch {
      setResult({ ok: false, text: he ? "ההעברה נכשלה, ושום דבר לא השתנה. נסו שוב." : "Moving failed and nothing changed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ borderColor: c.ac }}>
      {result?.ok ? (
        <p role="status" style={{ margin: 0, color: c.ok, fontSize: 14 }}>{result.text}</p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", lineHeight: 1.7, fontSize: 14 }}>
            {he
              ? `נמצאו במכשיר הזה ${found.data.count} תיקי לקוחות שנשמרו לפני שהיה חשבון. להעביר אותם לחשבון, כדי שיהיו זמינים בכל מכשיר?`
              : `This device holds ${found.data.count} client files saved before the account. Move them into the account, so every device has them?`}
          </p>
          {result && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{result.text}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gb" style={btnPrimary} onClick={upload} disabled={busy}>{he ? "העברה לחשבון" : "Move to the account"}</button>
            <button className="ghost" style={btnGhost} onClick={() => setHidden(true)} disabled={busy}>{he ? "לא עכשיו" : "Not now"}</button>
          </div>
        </>
      )}
    </Card>
  );
}
