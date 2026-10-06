/**
 * Short messages at the bottom of the screen ("Saved", "Copied"), read out
 * politely by screen readers. At most three at a time; each leaves by itself.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import "./toasts.css";

const ToastContext = createContext(() => {});

/** `toast(text)` shows a message; outside a ToastProvider it does nothing. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children, duration = 2600 }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Set());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const show = useCallback(
    (text) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list.slice(-2), { id, text }]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        setToasts((list) => list.filter((t) => t.id !== id));
      }, duration);
      timers.current.add(timer);
    },
    [duration],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="st-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="st-toast">{t.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
