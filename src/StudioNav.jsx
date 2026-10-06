/**
 * The Studio's tools as one block of buttons: every tool in view, wrapping
 * into rows instead of scrolling sideways. On wider screens it stays at the
 * top while the page scrolls (the .snav styles in App.jsx).
 *
 * @param {{tabs: {k: string, l: string, icon?: import("react").ReactNode}[], active: string, onSelect: (k: string) => void, label: string}} props
 */
export default function StudioNav({ tabs, active, onSelect, label }) {
  return (
    <nav className="snav" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.k}
          type="button"
          className={`ti snav-b${active === t.k ? " act" : ""}`}
          aria-current={active === t.k ? "page" : undefined}
          onClick={() => onSelect(t.k)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
            {t.icon}
            {t.l}
          </span>
        </button>
      ))}
    </nav>
  );
}
