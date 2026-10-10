/** The app's world: the Studio (or its demo) and Shani's page, with the providers they need. Loaded on demand. */
import { AccountProvider } from "./account/AccountContext.jsx";
import { ToastProvider } from "./studio/Toasts.jsx";
import { DemoLockContext } from "./demo/DemoLock.jsx";
import App from "./App.jsx";

/** The demo's account: a subscriber over sample clients, in memory. */
const loadDemo = async () => (await import("./demo/sampleAccount.js")).demoService();

export default function AppWorld({ view, navigate }) {
  const demo = view === "demo";
  return (
    // the demo and the real account never share a provider: switching between them starts a new one
    <AccountProvider key={demo ? "demo" : "live"} active={demo ? true : undefined} loadService={demo ? loadDemo : undefined}>
      <ToastProvider>
        {/* the demo shows titles and numbers; its interpretations are blurred (demo/DemoLock.jsx) */}
        <DemoLockContext.Provider value={demo}>
          <App view={view} navigate={navigate} />
        </DemoLockContext.Provider>
      </ToastProvider>
    </AccountProvider>
  );
}
