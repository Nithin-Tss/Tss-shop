import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Lock, Pause, Play, Search, ShoppingBag } from "lucide-react";
import ProductArt from "@/components/landing/ProductArt";

// The background of the sign-in and sign-up pages: a full-screen storefront built on TSS Shop, with the form floating
// over it (components/AuthShell.jsx). A small editor dock lets the visitor switch store, recolour it and publish;
// the headline is editable in place and the products can go in the cart. Left alone, a cursor does those things
// itself (playDemo). Pointing at the store or tabbing into it hands control to the visitor. Nothing is saved.
//
// The stores carry their own colourways rather than TSS brass and paper: they are merchants' shops, and the point
// is that a store on TSS can look like anything. Each colourway is checked for text contrast (ink on bg, onAccent
// on accent, white on deep).

const STORES = [
  {
    id: "beauty",
    label: "Beauty",
    name: "Lumen",
    font: "serif",
    announce: "Free shipping on orders over $50",
    nav: ["Skincare", "Make-up", "Refills", "Journal"],
    title: "Find the shade, keep the glow.",
    sub: "Serums, tints and refills, shipped in plastic-free packs.",
    cta: "Shop skincare",
    items: [
      ["Glow serum", "$38", "Bestseller"],
      ["Velvet tint", "$22", "New shade"],
      ["Skin kit", "$64", "Save 15%"],
    ],
    edits: [
      "Your shade, found in a minute.",
      "Skin first. Then everything else.",
      "Refills before you run out.",
    ],
    palettes: [
      {
        id: "blush",
        label: "Blush",
        bg: "#F3DDD3",
        ink: "#3B1F1A",
        accent: "#9E3F2A",
        onAccent: "#FFF3EE",
        deep: "#9E3F2A",
        light: "#F3DDD3",
      },
      {
        id: "clay",
        label: "Clay",
        bg: "#A9502F",
        ink: "#FFF4EC",
        accent: "#2B140F",
        onAccent: "#FFF4EC",
        deep: "#A9502F",
        light: "#FFF4EC",
      },
      {
        id: "cream",
        label: "Cream",
        bg: "#F6EFE4",
        ink: "#2A2320",
        accent: "#9E3F2A",
        onAccent: "#FFF3EE",
        deep: "#9E3F2A",
        light: "#F6EFE4",
      },
    ],
  },
  {
    id: "fashion",
    label: "Fashion",
    name: "Fieldwork",
    font: "sans",
    announce: "New season drop: free returns for 30 days",
    nav: ["New in", "Outerwear", "Bags", "Lookbook"],
    title: "Built for the walk, not the runway.",
    sub: "Outerwear and leather goods, made in small runs.",
    cta: "Shop the drop",
    items: [
      ["Wool coat", "$180", "New"],
      ["Court low", "$96", "Low stock"],
      ["Day bag", "$120", "Bestseller"],
    ],
    edits: [
      "The autumn drop lands Friday.",
      "Fewer pieces. Worn more often.",
      "Made to be worn out.",
    ],
    palettes: [
      {
        id: "olive",
        label: "Olive",
        bg: "#3B4529",
        ink: "#F1EEDD",
        accent: "#D9C27A",
        onAccent: "#23291A",
        deep: "#3B4529",
        light: "#F1EEDD",
      },
      {
        id: "stone",
        label: "Stone",
        bg: "#E4DFD3",
        ink: "#1E1E1A",
        accent: "#3B4529",
        onAccent: "#F1EEDD",
        deep: "#3B4529",
        light: "#E4DFD3",
      },
      {
        id: "navy",
        label: "Navy",
        bg: "#1D2A44",
        ink: "#EEF0F4",
        accent: "#E0B354",
        onAccent: "#1D2A44",
        deep: "#1D2A44",
        light: "#EEF0F4",
      },
    ],
  },
  {
    id: "grocery",
    label: "Grocery",
    name: "Larder",
    font: "italic",
    announce: "Order by 2pm for same-day delivery",
    nav: ["Fresh", "Bakery", "Cheese", "Pantry"],
    title: "Fresh by the gram, on time.",
    sub: "Produce, bread and cheese, delivered in the slot you pick.",
    cta: "Book a delivery slot",
    items: [
      ["Avocados", "$6/kg", "Ripe today"],
      ["Sourdough", "$7", "Baked today"],
      ["Aged cheddar", "$18/kg", "Local"],
    ],
    edits: [
      "Baked this morning. Home tonight.",
      "Pick a slot. We'll bring the rest.",
      "Sold by the gram, not the guess.",
    ],
    palettes: [
      {
        id: "leaf",
        label: "Leaf",
        bg: "#DDE9C9",
        ink: "#1F3318",
        accent: "#B83A22",
        onAccent: "#FFF6EE",
        deep: "#2E5A22",
        light: "#DDE9C9",
      },
      {
        id: "tomato",
        label: "Tomato",
        bg: "#B83A22",
        ink: "#FFF6EE",
        accent: "#1F3318",
        onAccent: "#FFF6EE",
        deep: "#B83A22",
        light: "#FFF6EE",
      },
      {
        id: "butter",
        label: "Butter",
        bg: "#F4E3A1",
        ink: "#2B2614",
        accent: "#2F6B3A",
        onAccent: "#FFFBEA",
        deep: "#2F6B3A",
        light: "#F4E3A1",
      },
    ],
  },
];

const slugFor = (name) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "your-store";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function AuthStorefront() {
  const [storeIndex, setStoreIndex] = useState(0);
  const store = STORES[storeIndex];
  const [paletteIndex, setPaletteIndex] = useState(0);
  const palette = store.palettes[paletteIndex];
  const [title, setTitle] = useState(store.title);
  const [editing, setEditing] = useState(false); // the visitor is typing in the headline
  const [demoTyping, setDemoTyping] = useState(false); // the demo is typing in it
  const [cart, setCart] = useState(0);
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState("");
  const [published, setPublished] = useState(true);

  const rootRef = useRef(null);
  const cursorRef = useRef(null);
  const storeIndexRef = useRef(0);
  const titleRef = useRef(title);
  storeIndexRef.current = storeIndex;
  titleRef.current = title;
  const editTurn = useRef(0);
  const toastTimer = useRef(0);

  const flash = (message) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const changed = () => setPublished(false);

  const switchStore = (index) => {
    if (index === storeIndexRef.current) return;
    setStoreIndex(index);
    setPaletteIndex(0);
    setTitle(STORES[index].title);
    setEditing(false);
    setCart(0);
    setPublished(true);
    editTurn.current = 0;
  };
  const recolour = (index) => {
    setPaletteIndex(index);
    changed();
  };
  const addToCart = (name) => {
    setCart((count) => count + 1);
    setBump((n) => n + 1);
    flash(`${name} added to cart`);
  };
  const publish = () => {
    setPublished(true);
    flash(`Published to ${slugFor(STORES[storeIndexRef.current].name)}.tss.shop`);
  };

  // Parallax: product art leans gently away from the pointer
  const onPointerMove = (event) => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    root.style.setProperty("--px", (event.clientX / window.innerWidth - 0.5).toFixed(3));
    root.style.setProperty("--py", (event.clientY / window.innerHeight - 0.5).toFixed(3));
  };

  /* ---- Self-running demo ---------------------------------------------------------------------------------------- */

  const demoRun = useRef(0); // bumped to cancel the running script
  const demoTimers = useRef([]);
  const resumeTimer = useRef(0);
  const [demoOn, setDemoOn] = useState(false);
  const [demoPaused, setDemoPaused] = useState(prefersReducedMotion); // "Pause" pressed, or reduced motion
  const pausedRef = useRef(demoPaused);
  pausedRef.current = demoPaused;

  const stopDemo = () => {
    demoRun.current += 1;
    demoTimers.current.forEach((id) => window.clearTimeout(id));
    demoTimers.current = [];
    setDemoTyping(false);
    setDemoOn(false);
  };

  // One pass per store: recolour, retitle, fill the cart, publish, then on to the next store. Loops until interrupted.
  const playDemo = async () => {
    const run = (demoRun.current += 1);
    const STOP = Symbol("stop");
    const wait = (ms) =>
      new Promise((resolve, reject) => {
        demoTimers.current.push(
          window.setTimeout(() => (run === demoRun.current ? resolve() : reject(STOP)), ms)
        );
      });
    const target = (id) => rootRef.current?.querySelector(`[data-demo="${id}"]`);

    const moveTo = async (id) => {
      const element = target(id);
      const cursor = cursorRef.current;
      if (!element || !cursor) return null;
      const box = element.getBoundingClientRect();
      const x = box.left + Math.min(box.width / 2, 56);
      const y = box.top + Math.min(box.height / 2, 36);
      cursor.style.transform = `translate(${x}px, ${y}px)`;
      await wait(prefersReducedMotion() ? 500 : 900);
      return element;
    };
    const click = async (id, act, pause = 1000) => {
      await moveTo(id);
      const cursor = cursorRef.current;
      if (cursor) {
        cursor.dataset.press = "false";
        void cursor.offsetWidth; // restart the press animation
        cursor.dataset.press = "true";
      }
      act();
      await wait(pause);
    };

    setDemoOn(true);
    try {
      await wait(800);
      for (;;) {
        const index = storeIndexRef.current;
        const current = STORES[index];
        await click("palette-1", () => recolour(1), 1700);

        // Retype the headline in place, the way a merchant edits their own page
        const next = current.edits[editTurn.current % current.edits.length];
        editTurn.current += 1;
        await click("headline", () => setDemoTyping(true), 400);
        for (let left = titleRef.current.length; left >= 0; left -= 3) {
          setTitle(titleRef.current.slice(0, left));
          await wait(16);
        }
        setTitle("");
        changed();
        for (let shown = 1; shown <= next.length; shown += 1) {
          setTitle(next.slice(0, shown));
          await wait(42);
        }
        setDemoTyping(false);
        await wait(900);

        await click("add-0", () => addToCart(current.items[0][0]), 800);
        await click("add-2", () => addToCart(current.items[2][0]), 1100);
        await click("palette-2", () => recolour(2), 1700);
        await click("publish", publish, 2300);
        const nextIndex = (index + 1) % STORES.length;
        await click(`store-${STORES[nextIndex].id}`, () => switchStore(nextIndex), 2000);
      }
    } catch (error) {
      if (error !== STOP) throw error;
    }
  };

  const takeOver = () => {
    window.clearTimeout(resumeTimer.current);
    if (demoOn) stopDemo();
  };
  const handBack = (delay = 3500) => {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      const root = rootRef.current;
      if (
        pausedRef.current ||
        !root ||
        root.matches(":hover") ||
        root.contains(document.activeElement)
      )
        return;
      playDemo();
    }, delay);
  };
  const toggleDemo = () => {
    if (demoPaused) {
      setDemoPaused(false);
      pausedRef.current = false;
      handBack(400);
    } else {
      setDemoPaused(true);
      window.clearTimeout(resumeTimer.current);
      stopDemo();
    }
  };

  useEffect(() => {
    // Hidden below 1024px, so the demo never runs there
    const visible = window.matchMedia?.("(min-width: 1024px)").matches ?? true;
    if (!pausedRef.current && visible) handBack(1000);
    const timers = demoTimers;
    return () => {
      window.clearTimeout(resumeTimer.current);
      window.clearTimeout(toastTimer.current);
      demoRun.current += 1;
      timers.current.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = {
    "--s-bg": palette.bg,
    "--s-ink": palette.ink,
    "--s-accent": palette.accent,
    "--s-on-accent": palette.onAccent,
    "--s-deep": palette.deep, // the form card's buttons and links: white text on it is at least 4.5:1
    "--s-light": palette.light, // the lighter of bg and ink, which tints the form card
  };

  // Share the colourway with the page around the store, so the form card's buttons and links follow it (index.css)
  useLayoutEffect(() => {
    const stage = rootRef.current?.parentElement;
    if (!stage) return;
    Object.entries(style).forEach(([name, value]) => stage.style.setProperty(name, value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  return (
    <div
      ref={rootRef}
      className="sf"
      style={style}
      data-font={store.font}
      data-demo-on={demoOn ? "true" : "false"}
      aria-label={`${store.name}, a demo store built on TSS Shop`}
      role="region"
      onPointerMove={onPointerMove}
      onPointerEnter={(event) => event.pointerType === "mouse" && takeOver()}
      onPointerLeave={(event) => event.pointerType === "mouse" && !demoPaused && handBack()}
      onPointerDown={takeOver}
      onFocus={takeOver}
      onBlur={(event) =>
        !event.currentTarget.contains(event.relatedTarget) && !demoPaused && handBack()
      }
    >
      <p className="sf-announce">{store.announce}</p>

      <header className="sf-header">
        <span className="sf-logo">{store.name}</span>
        <nav className="sf-nav" aria-label="Demo store">
          {store.nav.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </nav>
        <span className="sf-header__icons">
          <Search size={18} strokeWidth={1.7} aria-hidden="true" />
          <span className="sf-cart">
            <ShoppingBag size={18} strokeWidth={1.7} aria-hidden="true" />
            <span
              key={bump}
              className="sf-cart__count"
              data-numeric
              data-bump={bump ? "true" : "false"}
            >
              {cart}
            </span>
            <span className="sr-only"> in cart</span>
          </span>
        </span>
      </header>

      <div className="sf-main">
        <div className="sf-content" key={store.id}>
          <div className="sf-hero">
            {editing ? (
              <textarea
                className="sf-headline sf-headline--input"
                value={title}
                rows={2}
                maxLength={60}
                autoFocus
                aria-label="Store headline"
                onChange={(event) => {
                  setTitle(event.target.value);
                  changed();
                }}
                onBlur={() => setEditing(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") {
                    event.preventDefault();
                    setEditing(false);
                  }
                }}
              />
            ) : (
              <h2
                className="sf-headline"
                data-demo="headline"
                data-typing={demoTyping ? "true" : "false"}
                role="button"
                tabIndex={0}
                aria-label={`Headline: ${title}. Press to edit`}
                onClick={() => setEditing(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setEditing(true);
                  }
                }}
              >
                {title || " "}
                <span className="sf-caret" aria-hidden="true" />
                <span className="sf-edit-hint" aria-hidden="true">
                  Click to edit
                </span>
              </h2>
            )}
            <p className="sf-sub">{store.sub}</p>
            <span className="sf-cta">{store.cta}</span>
          </div>

          <ul className="sf-products">
            {store.items.map(([name, price, note], index) => (
              <li key={name} className="sf-product" style={{ "--i": index }}>
                <div className="sf-product__art">
                  <span className="sf-product__note">{note}</span>
                  <ProductArt name={name} />
                </div>
                <div className="sf-product__meta">
                  <span className="sf-product__name">{name}</span>
                  <span data-numeric>{price}</span>
                </div>
                <button
                  type="button"
                  className="sf-product__add"
                  data-demo={`add-${index}`}
                  onClick={() => addToCart(name)}
                >
                  Add to cart
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sf-dock" role="toolbar" aria-label="Edit this demo store">
          <span className="sf-dock__url">
            <Lock size={11} strokeWidth={2.2} aria-hidden="true" />
            {slugFor(store.name)}.tss.shop
          </span>

          <div className="sf-dock__group" role="group" aria-label="Store">
            {STORES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="sf-dock__tab"
                data-demo={`store-${item.id}`}
                aria-pressed={index === storeIndex}
                onClick={() => switchStore(index)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="sf-dock__swatches" role="group" aria-label="Colours">
            {store.palettes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="sf-swatch"
                data-demo={`palette-${index}`}
                aria-label={item.label}
                aria-pressed={index === paletteIndex}
                style={{ "--a": item.bg, "--b": item.accent }}
                onClick={() => recolour(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className="sf-dock__icon"
            onClick={toggleDemo}
            aria-label={demoPaused ? "Play the demo" : "Pause the demo"}
            title={demoPaused ? "Play the demo" : "Pause the demo"}
          >
            {demoPaused ? (
              <Play size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Pause size={14} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="sf-dock__publish"
            data-demo="publish"
            data-dirty={published ? "false" : "true"}
            onClick={publish}
          >
            {published ? "Published" : "Publish"}
          </button>
        </div>
      </div>

      <p className="sf-toast" data-show={toast ? "true" : "false"} role="status">
        <Check size={14} strokeWidth={2.4} aria-hidden="true" />
        {toast}
      </p>

      <svg
        ref={cursorRef}
        className="sf-cursor"
        viewBox="0 0 20 22"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2.5 1.8v15.6l4.1-3.9 2.7 6.3 3-1.3-2.7-6.2h5.7z" />
      </svg>
    </div>
  );
}
