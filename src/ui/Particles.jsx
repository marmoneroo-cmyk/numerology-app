/**
 * The sky behind every page: twinkling stars with a little parallax, faint lines to the cursor and now and
 * then a shooting star. Under reduced motion the sky stands still: one frame, drawn again when the window
 * changes size, and the motion comes back if the setting is turned off (2026-10-12: it kept moving before).
 */
import { useEffect, useRef } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export default function Particles({ dk }) {
  const ref = useRef(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0, active: false });
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return undefined;
    let id;
    let W = 0, H = 0, dpr = 1;
    const stars = [];
    const shooters = [];
    const still = window.matchMedia?.(REDUCED_MOTION);
    function build() {
      stars.length = 0;
      const n = Math.min(230, Math.floor((W * H) / 8500));
      for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.3, depth: Math.random(), tw: Math.random() * 6.283, tws: 0.5 + Math.random() * 1.6, o: 0.18 + Math.random() * 0.55, dx: (Math.random() - 0.5) * 0.05, dy: (Math.random() - 0.5) * 0.05 });
    }
    const cl = dk ? "200,169,106" : "147,118,64";
    /** The sky as it stands: every star where it is, at its middle brightness. */
    function drawStill() {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.6 + s.depth * 0.8), 0, 6.283);
        ctx.fillStyle = `rgba(${cl},${s.o * 0.75 * (0.4 + s.depth * 0.6)})`;
        ctx.fill();
      }
    }
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + "px";
      c.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (still?.matches) drawStill();
    };
    resize();
    window.addEventListener("resize", resize);
    const onMove = (e) => {
      mouse.current.tx = e.clientX || 0;
      mouse.current.ty = e.clientY || 0;
      mouse.current.active = true;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    let frame = 0;
    function draw() {
      frame++;
      const m = mouse.current;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
      ctx.clearRect(0, 0, W, H);
      const ox = m.x - W / 2, oy = m.y - H / 2;
      for (const s of stars) {
        s.x += s.dx;
        s.y += s.dy;
        if (s.x < -10) s.x = W + 10;
        if (s.x > W + 10) s.x = -10;
        if (s.y < -10) s.y = H + 10;
        if (s.y > H + 10) s.y = -10;
        s.tw += 0.02 * s.tws;
        const tw = 0.55 + 0.45 * Math.sin(s.tw);
        const px = s.x + ox * s.depth * 0.025, py = s.y + oy * s.depth * 0.025;
        ctx.beginPath();
        ctx.arc(px, py, s.r * (0.6 + s.depth * 0.8), 0, 6.283);
        ctx.fillStyle = `rgba(${cl},${s.o * tw * (0.4 + s.depth * 0.6)})`;
        ctx.fill();
      }
      if (m.active) {
        const R = 140, near = [];
        for (const s of stars) {
          const px = s.x + ox * s.depth * 0.025, py = s.y + oy * s.depth * 0.025;
          const d = Math.hypot(px - m.x, py - m.y);
          if (d < R) near.push([px, py, d]);
        }
        for (let i = 0; i < near.length; i++) {
          const a = near[i];
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(a[0], a[1]);
          ctx.strokeStyle = `rgba(${cl},${0.13 * (1 - a[2] / R)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          for (let j = i + 1; j < near.length; j++) {
            const b = near[j];
            const dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
            if (dd < 72) {
              ctx.beginPath();
              ctx.moveTo(a[0], a[1]);
              ctx.lineTo(b[0], b[1]);
              ctx.strokeStyle = `rgba(${cl},${0.07 * (1 - dd / 72)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, R);
        g.addColorStop(0, `rgba(${cl},.05)`);
        g.addColorStop(1, `rgba(${cl},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, R, 0, 6.283);
        ctx.fill();
      }
      if (frame % 150 === 0 && shooters.length < 2) {
        const lr = Math.random() < 0.5;
        shooters.push({ x: Math.random() * W, y: Math.random() * H * 0.45, vx: (lr ? 1 : -1) * (5 + Math.random() * 3), vy: 1.8 + Math.random() * 1.6, life: 1 });
      }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life -= 0.012;
        if (sh.life <= 0 || sh.x < -60 || sh.x > W + 60 || sh.y > H + 60) {
          shooters.splice(i, 1);
          continue;
        }
        const tx = sh.x - sh.vx * 7, ty = sh.y - sh.vy * 7;
        const grd = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        grd.addColorStop(0, `rgba(255,248,232,${0.85 * sh.life})`);
        grd.addColorStop(1, `rgba(${cl},0)`);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 1.7, 0, 6.283);
        ctx.fillStyle = `rgba(255,248,232,${sh.life})`;
        ctx.fill();
      }
      id = requestAnimationFrame(draw);
    }
    /** Moving, or standing still under reduced motion; called again whenever that setting changes. */
    const start = () => {
      cancelAnimationFrame(id);
      if (still?.matches) drawStill();
      else draw();
    };
    start();
    still?.addEventListener?.("change", start);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      still?.removeEventListener?.("change", start);
    };
  }, [dk]);
  return <canvas ref={ref} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}
