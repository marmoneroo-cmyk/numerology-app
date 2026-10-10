// @vitest-environment jsdom
/* The sales page: what the Studio is, the demo, the way in, contact, price and the legal links. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import SalesPage from "../SalesPage.jsx";
import { Price } from "../sections.jsx";
import { SALES } from "../content.js";
import { PRICE_MONTHLY, TRIAL_DAYS } from "../config.js";

afterEach(cleanup);

describe("the sales page", () => {
  it("says what the Studio is, and offers the demo, contact and the way in", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: SALES.he.hero.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: SALES.he.hero.tryIt }).getAttribute("href")).toBe("#demo");
    expect(screen.getByRole("link", { name: SALES.he.signIn }).getAttribute("href")).toBe("#studio");
    const contact = screen.getAllByRole("link", { name: new RegExp(SALES.he.hero.contact) });
    expect(contact.length).toBeGreaterThan(0);
    for (const link of contact) expect(link.getAttribute("href").startsWith("mailto:")).toBe(true); // no WhatsApp number yet: email
    for (const title of [SALES.he.features.title, SALES.he.join.title, SALES.he.privacy.title, SALES.he.price.title, SALES.he.faq.title]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
    }
    expect(screen.getByRole("img", { name: SALES.he.hero.shotAlt }).getAttribute("src")).toBe("/sales/studio-today.webp");
  });

  it("links the legal pages and the privacy details", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.terms }).getAttribute("href")).toBe("#terms");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.privacy }).getAttribute("href")).toBe("#privacy");
    expect(within(footer).getByRole("link", { name: SALES.he.footer.refunds }).getAttribute("href")).toBe("#refunds");
    expect(screen.getByRole("link", { name: SALES.he.privacy.more }).getAttribute("href")).toBe("#privacy");
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
    expect(screen.getByText(`₪${PRICE_MONTHLY}`)).toBeTruthy();
    expect(screen.getByText(`${TRIAL_DAYS} ${SALES.he.price.trialDays}`)).toBeTruthy();
    expect(screen.queryByText(SALES.he.price.onRequest)).toBeNull();
  });

  it("shows a price and trial once they are set, and words for them until then", () => {
    render(<Price t={SALES.he.price} contact={null} price={null} trialDays={null} />);
    expect(screen.getByText(SALES.he.price.onRequest)).toBeTruthy();
    expect(screen.getByText(SALES.he.price.trial)).toBeTruthy();
    cleanup();
    render(<Price t={SALES.he.price} contact={null} price={149} trialDays={14} />);
    expect(screen.getByText("₪149")).toBeTruthy();
    expect(screen.getByText(`14 ${SALES.he.price.trialDays}`)).toBeTruthy();
  });

  it("switches language, right to left and back", () => {
    const onLanguage = vi.fn();
    const { container, rerender } = render(<SalesPage he onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("rtl");
    fireEvent.click(screen.getByRole("button", { name: SALES.he.languageLabel }));
    expect(onLanguage).toHaveBeenCalled();
    rerender(<SalesPage he={false} onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("heading", { level: 1, name: SALES.en.hero.title })).toBeTruthy();
  });
});
