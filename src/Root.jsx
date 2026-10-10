/**
 * What the address shows: the sales page (light, loaded at once) or the app (the Studio, its demo and Shani's
 * page, loaded on demand). The rules are in routes.js.
 */
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { nextRoute, hasSavedLogin, hashFor } from "./routes.js";
import { countView } from "./analytics.js";
import SalesPage from "./sales/SalesPage.jsx";
import LegalPage from "./legal/LegalPage.jsx";

const AppWorld = lazy(() => import("./AppWorld.jsx"));

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** The app failed to load (offline, or a deploy replaced its files): a way to try again, not a blank page. */
class LoadFailure extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { he } = this.props;
    return (
      <div className="root-message" role="alert" dir={he ? "rtl" : "ltr"}>
        <p>{he ? "לא הצלחנו לטעון. נסו לרענן את העמוד." : "The page did not load. Try reloading it."}</p>
        <button type="button" onClick={() => window.location.reload()}>{he ? "רענון" : "Reload"}</button>
      </div>
    );
  }
}

export default function Root({ storage = browserStorage() }) {
  const [route, setRoute] = useState(() => nextRoute(null, window.location.hash, { initial: true, signedIn: hasSavedLogin(storage) }));
  const [he, setHe] = useState(true);
  const routeRef = useRef(route);
  routeRef.current = route;
  // a legal page opened by a link here: closing it goes back to where the visitor was
  const legalOpenedHere = useRef(false);

  useEffect(() => {
    // a kept login opened the Studio from the plain address: say so in the address, so back and reload agree
    const { world, view } = routeRef.current;
    if (world === "app" && view === "studio" && !window.location.hash) window.history.replaceState(null, "", "#studio");
    const follow = () => {
      const current = routeRef.current;
      const next = nextRoute(current, window.location.hash);
      if (next === current) return;
      if (next.legal && !current.legal) legalOpenedHere.current = true;
      if (next.world !== current.world || next.view !== current.view) window.scrollTo(0, 0);
      routeRef.current = next;
      setRoute(next);
      countView(); // analytics counts loads and history pushes by itself, not a link to #demo or #privacy
    };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  /** Goes to a view, as a new step in the browser's history. */
  const navigate = useCallback((view) => {
    const hash = hashFor(view);
    window.history.pushState(null, "", hash || window.location.pathname + window.location.search);
    const next = nextRoute(routeRef.current, hash);
    routeRef.current = next;
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  const closeLegal = () => {
    if (legalOpenedHere.current) {
      legalOpenedHere.current = false;
      window.history.back(); // the hashchange that follows closes the page
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const next = nextRoute(routeRef.current, "");
    routeRef.current = next;
    setRoute(next);
  };

  if (route.world === "app") {
    return (
      <LoadFailure he={he}>
        <Suspense fallback={<div className="root-message" aria-busy="true" />}>
          <AppWorld view={route.view} navigate={navigate} />
        </Suspense>
      </LoadFailure>
    );
  }
  if (route.legal) return <LegalPage doc={route.legal} he={he} dk onBack={closeLegal} />;
  return <SalesPage he={he} onLanguage={() => setHe((value) => !value)} />;
}
