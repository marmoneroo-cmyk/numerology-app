// @vitest-environment jsdom
/* The sales page: what the Studio is, the demo, the way in, contact, price and the legal links. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import SalesPage from "../SalesPage.jsx";
import { Price, Worth } from "../sections.jsx";
import { SALES } from "../content.js";
import { PRICE_MONTHLY, TRIAL_DAYS, SALES_WHATSAPP } from "../config.js";

afterEach(cleanup);

describe("the sales page", () => {
  it("says what the Studio is, and offers the demo, contact and the way in", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: SALES.he.hero.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: SALES.he.hero.tryIt }).getAttribute("href")).toBe("#demo");
    expect(screen.getByRole("link", { name: SALES.he.signIn }).getAttribute("href")).toBe("#studio");
    const contact = screen.getAllByRole("link", { name: new RegExp(SALES.he.hero.contact) });
    expect(contact.length).toBeGreaterThan(0);
    // the owner's WhatsApp, in a new tab
    for (const link of contact) {
      expect(link.getAttribute("href").startsWith(`https://wa.me/${SALES_WHATSAPP}?text=`)).toBe(true);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
    const titles = [SALES.he.pillars, SALES.he.demo, SALES.he.map, SALES.he.care, SALES.he.worth, SALES.he.tools, SALES.he.privacy, SALES.he.price, SALES.he.faq, SALES.he.final].map((s) => s.title);
    for (const title of titles) expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: SALES.he.join.title })).toBeTruthy();
  });

  it("shows the real Studio: the map summary first, then how a number was calculated, then Today", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    const hero = screen.getByRole("img", { name: SALES.he.hero.shotAlt });
    expect(hero.getAttribute("src")).toBe("/sales/shot-summary-v2.webp");
    // lazy too (2026-10-12): the page is pre-drawn into every address, and the demo must not fetch it; the hero's
    // background is the first screen's largest element, and that one starts early (index.html)
    expect(hero.getAttribute("loading")).toBe("lazy");
    expect(hero.getAttribute("srcset")).toBe("/sales/shot-summary-v2-720.webp 720w, /sales/shot-summary-v2.webp 1280w");
    expect(screen.getByRole("img", { name: SALES.he.map.howAlt }).getAttribute("src")).toBe("/sales/shot-how-v2.webp");
    const today = screen.getByRole("img", { name: SALES.he.care.shotAlt });
    expect(today.getAttribute("src")).toBe("/sales/shot-today-v2.webp");
    expect(today.getAttribute("loading")).toBe("lazy");
    for (const img of screen.getAllByRole("img")) {
      expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
    }
  });

  it("states the trial, the price and personal joining under the hero's buttons", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    const facts = within(hero).getAllByRole("listitem").map((li) => li.textContent);
    expect(facts).toEqual([`${TRIAL_DAYS} ${SALES.he.hero.trialDays}`, `₪${PRICE_MONTHLY} ${SALES.he.hero.perMonth}`, SALES.he.hero.personal]);
  });

  it("links the legal pages and the privacy details", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.terms }).getAttribute("href")).toBe("#terms");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.privacy }).getAttribute("href")).toBe("#privacy");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.refunds }).getAttribute("href")).toBe("#refunds");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.accessibility }).getAttribute("href")).toBe("#accessibility");
    expect(screen.getByRole("link", { name: SALES.he.privacy.more }).getAttribute("href")).toBe("#privacy");
    // and the owner's WhatsApp, in a new tab
    const whatsapp = within(footer).getByRole("link", { name: SALES.he.footer.whatsapp });
    expect(whatsapp.getAttribute("href").startsWith(`https://wa.me/${SALES_WHATSAPP}?text=`)).toBe(true);
    expect([whatsapp.getAttribute("target"), whatsapp.getAttribute("rel")]).toEqual(["_blank", "noopener noreferrer"]);
  });

  it("links to Shani's own site, in both languages (2026-10-25: the two sites point at each other)", () => {
    for (const he of [true, false]) {
      const { unmount } = render(<SalesPage he={he} onLanguage={() => {}} />);
      const t = he ? SALES.he : SALES.en;
      const link = within(screen.getByRole("contentinfo")).getByRole("link", { name: t.footer.site });
      expect(link.getAttribute("href")).toBe("https://www.shani-cohen.com/");
      unmount();
    }
    expect(SALES.he.footer.site).toBe("שני כהן אזולאי · נומרולוגיה וערבי הפרשות חלה");
  });

  it("answers the common questions in place, each one opening by itself", () => {
    const { container } = render(<SalesPage he onLanguage={() => {}} />);
    const questions = container.querySelectorAll("details");
    expect(questions).toHaveLength(SALES.he.faq.items.length);
    expect(questions[0].querySelector("summary").textContent).toBe(SALES.he.faq.items[0].q);
  });

  it("shows the owner's price and trial from the settings", () => {
    expect(PRICE_MONTHLY).toBeGreaterThan(0);
    expect(TRIAL_DAYS).toBeGreaterThan(0);
    render(<SalesPage he onLanguage={() => {}} />);
    const price = screen.getByRole("heading", { level: 2, name: SALES.he.price.title }).closest("section");
    expect(within(price).getByText(`₪${PRICE_MONTHLY}`)).toBeTruthy();
    expect(within(price).getByText(`${TRIAL_DAYS} ${SALES.he.price.trialDays}`)).toBeTruthy();
    expect(screen.queryByText(SALES.he.price.onRequest)).toBeNull();
  });

  it("shows a price and trial once they are set, and words for them until then", () => {
    render(<Price t={SALES.he.price} contact={null} price={null} trialDays={null} />);
    expect(screen.getByText(SALES.he.price.onRequest)).toBeTruthy();
    expect(screen.getByText(SALES.he.price.trial)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: SALES.he.join.title })).toBeNull(); // no steps without them
    cleanup();
    render(<Price t={SALES.he.price} join={SALES.he.join} contact={null} price={149} trialDays={14} />);
    expect(screen.getByText("₪149")).toBeTruthy();
    expect(screen.getByText(`14 ${SALES.he.price.trialDays}`)).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(SALES.he.join.steps.map((s) => s.title));
  });

  it("switches language, right to left and back", () => {
    const onLanguage = vi.fn();
    const { container, rerender } = render(<SalesPage he onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("rtl");
    // named by what it shows ("EN") and then the language in full
    fireEvent.click(screen.getByRole("button", { name: `${SALES.he.language} ${SALES.he.languageLabel}` }));
    expect(onLanguage).toHaveBeenCalled();
    rerender(<SalesPage he={false} onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("heading", { level: 1, name: SALES.en.hero.title })).toBeTruthy();
  });
});

describe("is it worth it", () => {
  const t = SALES.he.worth;
  const show = () => render(<Worth t={t} price={149} />);
  const value = (id) => screen.getByTestId(id).textContent;

  it("starts from one extra session at 300: 300 in, 151 after the subscription, covered by one session", () => {
    show();
    expect([value("worth-income"), value("worth-after")]).toEqual(["₪300", "₪151"]);
    expect(screen.getByText(t.coveredOne)).toBeTruthy();
  });

  it("follows the visitor's numbers, and shows a shortfall as a minus", () => {
    show();
    fireEvent.change(screen.getByLabelText(t.priceLabel), { target: { value: "100" } });
    expect(screen.getByText(t.coveredMany.replace("{n}", "2"))).toBeTruthy();
    expect(value("worth-after")).toBe("−₪49");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "4" } });
    expect([value("worth-income"), value("worth-after")]).toEqual(["₪400", "₪251"]);
    fireEvent.change(screen.getByLabelText(t.priceLabel), { target: { value: "" } });
    expect(value("worth-income")).toBe("₪0");
    expect(screen.queryByText(t.coveredOne)).toBeNull();
  });

  it("says it is a scenario, not a promise, and hides without a price", () => {
    show();
    expect(screen.getByText(t.disclaimer)).toBeTruthy();
    cleanup();
    const { container } = render(<Worth t={t} price={null} />);
    expect(container.textContent).toBe("");
  });
});
