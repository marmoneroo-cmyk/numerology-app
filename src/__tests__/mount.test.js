// @vitest-environment jsdom
/*
 * Starting React in #root (main.jsx): the build draws the sales page there (scripts/prerender.mjs). The sales page is
 * taken over as it is; an address or a kept login that opens the app (or a legal page) starts from an empty root.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "../mount.js";
import { SAVED_LOGIN_KEY } from "../routes.js";

const APP = { app: true };

function setup({ drawn = true, mark = true } = {}) {
  const container = document.createElement("div");
  if (drawn) container.innerHTML = '<div class="sales"><h1>Sales</h1></div>';
  if (mark) document.documentElement.setAttribute("data-first-screen", "app");
  const render = vi.fn();
  const react = { hydrate: vi.fn(), create: vi.fn(() => ({ render })) };
  return { container, react, render };
}
const storageWith = (entries = {}) => ({ getItem: (key) => entries[key] ?? null });

afterEach(() => document.documentElement.removeAttribute("data-first-screen"));

describe("mount", () => {
  it("takes over the drawn sales page as it is", () => {
    const { container, react } = setup();
    const heading = container.querySelector("h1");
    mount(container, APP, { hash: "", storage: storageWith(), ...react });
    expect(react.hydrate).toHaveBeenCalledWith(container, APP);
    expect(react.create).not.toHaveBeenCalled();
    expect(container.querySelector("h1")).toBe(heading);
  });

  it("starts the app, or a legal page, from an empty root", () => {
    for (const hash of ["#demo", "#studio", "#customer", "#privacy"]) {
      const { container, react, render } = setup();
      mount(container, APP, { hash, storage: storageWith(), ...react });
      expect([hash, container.childElementCount, react.hydrate.mock.calls.length]).toEqual([hash, 0, 0]);
      expect(react.create).toHaveBeenCalledWith(container);
      expect(render).toHaveBeenCalledWith(APP);
    }
  });

  it("starts the Studio from an empty root for a kept login at the plain address", () => {
    const { container, react } = setup();
    mount(container, APP, { hash: "", storage: storageWith({ [SAVED_LOGIN_KEY]: "{}" }), ...react });
    expect(container.childElementCount).toBe(0);
    expect(react.create).toHaveBeenCalled();
  });

  it("draws from nothing where the build drew nothing (the dev server)", () => {
    const { container, react } = setup({ drawn: false });
    mount(container, APP, { hash: "", storage: null, ...react });
    expect(react.hydrate).not.toHaveBeenCalled();
    expect(react.create).toHaveBeenCalled();
  });

  it("removes the first-screen mark, so the sales page shows when the visitor goes back to it", () => {
    const { container, react } = setup();
    mount(container, APP, { hash: "#demo", storage: null, ...react });
    expect(document.documentElement.hasAttribute("data-first-screen")).toBe(false);
  });
});
