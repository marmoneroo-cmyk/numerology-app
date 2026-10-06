/**
 * Today's card ritual: shuffle the deck, deal three cards face down, pick one.
 * The picked card opens and the other two step back until the next shuffle.
 * Each dealt card flies from the deck to its slot (a FLIP: measured, started
 * on the deck turned and smaller, then animated into place), one after another.
 * Under reduced motion the cards are simply there.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Card from "./Card.jsx";
import { prefersReducedMotion } from "../motion.js";
import "./deck.css";

const HAND = 3;
const SHUFFLE_MS = 900;
const FLY_MS = 700;
const FLY_STAGGER_MS = 150;
const FLY_EASING = "cubic-bezier(0.2, 0.9, 0.25, 1.15)";

const TEXT = {
  he: {
    deal: "ערבוב וחלוקה",
    again: "ערבוב מחדש",
    invite: "לוחצים על ׳ערבוב וחלוקה׳, ושלושה קלפים יוצאים מהחפיסה.",
    shuffling: "מערבבים…",
    choose: "בחרו קלף אחד.",
    yours: "הקלף שלך היום:",
  },
  en: {
    deal: "Shuffle and deal",
    again: "Shuffle again",
    invite: "Press Shuffle and deal and three cards come out of the deck.",
    shuffling: "Shuffling…",
    choose: "Choose one card.",
    yours: "Your card today:",
  },
};

/** Up to `count` different cards from `pool`, each chosen with `random`; the pool is left as it was. */
function draw(pool, count, random) {
  let left = pool;
  let hand = [];
  while (hand.length < count && left.length > 0) {
    const at = Math.min(left.length - 1, Math.max(0, Math.floor(random() * left.length)));
    hand = [...hand, left[at]];
    left = left.filter((_, i) => i !== at);
  }
  return hand;
}

const hasSize = (rect) => rect.width > 0 && rect.height > 0;

/**
 * Sends `el` from the deck's centre to where it already sits, `order` places behind the first.
 * When the deck or the slot has no size (hidden, or not laid out) the card is simply there:
 * a zero box would measure from the window's top left corner and fly the card in from it.
 */
function flyFromDeck(el, deck, order) {
  if (typeof el?.animate !== "function") return;
  const to = el.getBoundingClientRect();
  if (!hasSize(deck) || !hasSize(to)) return;
  const dx = deck.left + deck.width / 2 - (to.left + to.width / 2);
  const dy = deck.top + deck.height / 2 - (to.top + to.height / 2);
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) rotate(-12deg) scale(0.8)`, opacity: 0 },
      { transform: "none", opacity: 1 },
    ],
    { duration: FLY_MS, delay: order * FLY_STAGGER_MS, easing: FLY_EASING, fill: "backwards" },
  );
}

/** "idle" invites, "shuffling" says so, "dealt" asks for a choice, then names the card chosen. */
function statusFor(t, phase, chosen) {
  if (phase === "shuffling") return t.shuffling;
  if (phase !== "dealt") return t.invite;
  if (!chosen) return t.choose;
  return (
    <>
      {t.yours} <b>{chosen.number} · {chosen.title}</b>
    </>
  );
}

/** The ritual's state: the shuffle's timer, the hand dealt, the one card chosen, and each deal's flight. */
function useRitual(pool, random, onPick) {
  const [phase, setPhase] = useState("idle"); // "idle" | "shuffling" | "dealt"
  const [hand, setHand] = useState([]);
  const [picked, setPicked] = useState(-1);
  const [deals, setDeals] = useState(0); // also keys the cards, so every deal starts fresh
  const pickedRef = useRef(-1);
  const flyOnDeal = useRef(false);
  const deckRef = useRef(null);
  const flyers = useRef([]);
  const timers = useRef(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Once a deal is on the page, before it is painted, each card starts on the deck and flies to its slot.
  // Reduced motion is asked again here, since it may have been switched on during the shuffle and the
  // flight is a Web Animation, which the CSS reset in studio.css does not reach.
  useLayoutEffect(() => {
    const fly = flyOnDeal.current;
    flyOnDeal.current = false;
    if (!fly || prefersReducedMotion()) return;
    const deck = deckRef.current?.getBoundingClientRect();
    if (deck) flyers.current.forEach((el, i) => flyFromDeck(el, deck, i));
  }, [deals]);

  const deal = (fly) => {
    flyOnDeal.current = fly;
    setHand(draw(pool, HAND, random));
    setDeals((n) => n + 1);
    setPhase("dealt");
  };

  const shuffle = () => {
    // A press while the deck is shuffling lets that shuffle finish: starting it over would deal late,
    // after the riffle (which does not restart) had already stopped.
    if (timers.current.size > 0) return;
    pickedRef.current = -1;
    setPicked(-1);
    setHand([]);
    if (prefersReducedMotion()) return deal(false);
    setPhase("shuffling");
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      deal(true);
    }, SHUFFLE_MS);
    timers.current.add(timer);
  };

  // the first card chosen is the one; every other press waits for a new shuffle
  const choose = (index) => (next) => {
    if (!next || pickedRef.current !== -1) return;
    pickedRef.current = index;
    setPicked(index);
    onPick?.(hand[index]);
  };

  return { phase, hand, picked, deals, shuffle, choose, deckRef, flyers };
}

/**
 * @param {{ pool: Array<{ number: number, title: string, subtitle?: string, art?: import("react").ReactNode, accent?: string }>,
 *   he?: boolean, random?: () => number, onPick?: (card: object) => void, shuffleOnMount?: boolean }} props
 *   `shuffleOnMount`: the deck comes into view and shuffles as it appears (quick search's "today's card");
 *   a later change of the prop does nothing.
 */
export default function Deck({ pool = [], he = true, random = Math.random, onPick, shuffleOnMount = false }) {
  const t = he ? TEXT.he : TEXT.en;
  const { phase, hand, picked, deals, shuffle, choose, deckRef, flyers } = useRitual(pool, random, onPick);
  const rootRef = useRef(null);
  const followFirstDeal = useRef(shuffleOnMount);
  const bringIntoView = () => rootRef.current?.scrollIntoView?.({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });

  useEffect(() => {
    if (!shuffleOnMount) return;
    bringIntoView();
    shuffle();
    // once, as the deck appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // and once more as those cards land: what is above the deck may have grown meanwhile (a phone loading lists)
  useEffect(() => {
    if (deals === 0 || !followFirstDeal.current) return;
    followFirstDeal.current = false;
    bringIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  return (
    <div ref={rootRef} className="st-deck">
      <div className="st-deck-table">
        <div className="st-deck-side">
          <div ref={deckRef} className={phase === "shuffling" ? "st-deck-pile st-shuffling" : "st-deck-pile"} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="st-deck-back st-card-pattern" />
            ))}
          </div>
          <button type="button" className="st-deck-btn fx" onClick={shuffle}>
            {deals > 0 ? t.again : t.deal}
          </button>
        </div>
        <div className="st-deck-slots">
          {Array.from({ length: HAND }, (_, i) => (
            <div key={i} className={hand[i] ? "st-deck-slot st-filled" : "st-deck-slot"}>
              {hand[i] ? (
                <div key={deals} className="st-deck-fly" ref={(el) => { flyers.current[i] = el; }}>
                  <Card
                    number={hand[i].number}
                    title={hand[i].title}
                    subtitle={hand[i].subtitle}
                    art={hand[i].art}
                    accent={hand[i].accent}
                    he={he}
                    open={picked === i}
                    dimmed={picked !== -1 && picked !== i}
                    onToggle={choose(i)}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <p className="st-deck-status" role="status">
        {statusFor(t, phase, hand[picked])}
      </p>
    </div>
  );
}
