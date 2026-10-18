import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ShareSheet from "./ShareSheet";
import PromptShare from "./PromptShare";
import { wallApi, APP_URL, WALL_LINK, WALL_URL } from "./api";
import "./wall.css";

const INTRO = {
  shame: "What clients did to us before Asha existed. Read yours in someone else's words, then add your own.",
  fame: "The ones Asha helped. The files stayed locked, the balance cleared, then the work was released.",
};
const PROMPT = { shame: "what has a client done to you?", fame: "how has Asha helped you?" };
const TILT = [-1.2, 0.8, -0.6, 1.4, -0.9, 0.5];

const EyeOff = () => (
  <svg className="wl-eye" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c5 0 8.6 3.4 10 7a11.6 11.6 0 0 1-2.5 3.8M6.5 6.6A11.5 11.5 0 0 0 2 12c1.4 3.6 5 7 10 7 1.5 0 2.9-.3 4.1-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

function Entry({ e, i, onShare, highlight }) {
  const hasText = !!e.body?.trim();
  const big = hasText && !e.shots.length && e.body.length <= 90; // a short line on its own is set large, like the design
  return (
    <article id={`story-${e.id}`} className={`wl-entry${highlight ? " wl-entry--pinned" : ""}`} style={{ "--r": `${TILT[i % TILT.length]}deg` }}>
      <span className="wl-tape" aria-hidden="true" />
      {!hasText && e.shotTitle && <h3 className="wl-entry__title">{e.shotTitle}</h3>}
      {hasText && <p className={`wl-entry__body${big ? " wl-entry__body--big" : ""}`}>{e.body}</p>}
      {e.shots.map((src, k) => (
        <figure className="wl-print" key={src} style={{ "--r": `${TILT[(i + k + 2) % TILT.length]}deg` }}>
          {e.shotTitle && k === 0 && hasText && <figcaption>{e.shotTitle}</figcaption>}
          <img src={src} alt={e.shotTitle ? `Screenshot: ${e.shotTitle}` : "Screenshot sent with this story"} loading="lazy" />
        </figure>
      ))}
      <div className="wl-entry__foot">
        <p className="wl-entry__who">
          {e.handle
            ? <a href={`${APP_URL}/${e.handle}`} target="_blank" rel="noopener noreferrer">@{e.handle} <span aria-hidden="true">&#8599;</span></a>
            : <><EyeOff /> Anonymous creative</>}
        </p>
        <button type="button" className="wl-entry__share" onClick={() => onShare(e)} aria-label="Share this story">Share</button>
      </div>
    </article>
  );
}

export default function Wall({ kind }) {
  const [state, setState] = useState({ status: "loading", entries: [] });
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(null);
  const [pinned, setPinned] = useState(null);

  useEffect(() => {
    document.title = `Wall of ${kind === "fame" ? "Fame" : "Shame"} | Asha`;
    let alive = true;
    wallApi(`/entries?kind=${kind}`)
      .then((d) => alive && setState({ status: "ready", entries: d.entries }))
      .catch(() => alive && setState({ status: "error", entries: [] }));
    return () => { alive = false; };
  }, [kind]);

  // A shared link ends in #<story id>. Show that story first, even if it is older than what the page loads.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!/^[0-9a-f-]{36}$/.test(id)) return;
    let alive = true;
    wallApi(`/entries/${id}`).then((e) => alive && e.kind === kind && setPinned(e)).catch(() => {});
    return () => { alive = false; };
  }, [kind]);

  useEffect(() => {
    if (!sharing) return;
    const onKey = (ev) => ev.key === "Escape" && setSharing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sharing]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(WALL_URL); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <>
      <Navbar />
      <div className="wl-dark" data-nav-theme="dark">
      <main className="wl wl--wall">
        <header className="wl-head">
          <h1 className="wl-title">The Wall.</h1>
          <p className="wl-sub">{INTRO[kind]}</p>
          <nav className="wl-tabs" aria-label="Which wall">
            <a className="wl-tab" href="/wall/shame" aria-current={kind === "shame" ? "page" : undefined}>Wall of Shame</a>
            <a className="wl-tab" href="/wall/fame" aria-current={kind === "fame" ? "page" : undefined}>Wall of Fame</a>
          </nav>
        </header>

        <section className="wl-add" aria-label="Add yours">
          <span className="wl-tape wl-tape--label">Add yours</span>
          <h2>{PROMPT[kind]}</h2>
          <p>Type it or upload screenshots. Anonymous by default, or add your @handle if you want the credit.</p>
          <div className="wl-add__link">
            <a href="/wall">{WALL_LINK}</a>
            <button type="button" className="wl-btn wl-btn--solid" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          </div>
          <PromptShare kind={kind} />
        </section>

        {state.status === "loading" && <p className="wl-note" role="status">Loading the wall…</p>}
        {state.status === "error" && <p className="wl-note" role="alert">Couldn't load the wall. Refresh to try again.</p>}
        {state.status === "ready" && !state.entries.length && <p className="wl-note">Nothing here yet. Be the first to add yours.</p>}
        {(pinned || state.entries.length > 0) && (
          <div className="wl-grid">
            {pinned && <Entry e={pinned} i={0} onShare={setSharing} highlight />}
            {state.entries.filter((e) => e.id !== pinned?.id).map((e, i) => <Entry key={e.id} e={e} i={i + 1} onShare={setSharing} />)}
          </div>
        )}
        <p className="wl-foot">Stories are sent in by creatives and reviewed before they go up. Names, phone numbers and faces are blurred or removed, so this wall is about what happened, not who did it.</p>
        {sharing && (
          <div className="wl-dialog" role="dialog" aria-modal="true" aria-label="Share this story" onClick={(ev) => ev.target === ev.currentTarget && setSharing(null)}>
            <div className="wl-dialog__box">
              <button type="button" className="wl-dialog__close" onClick={() => setSharing(null)} aria-label="Close">×</button>
              <ShareSheet
                sent={false}
                kind={sharing.kind}
                body={sharing.body}
                handle={sharing.handle}
                shotTitle={sharing.shotTitle}
                shotUrl={sharing.shots[0] ?? null}
                extraShots={Math.max(sharing.shots.length - 1, 0)}
                link={`${WALL_URL}/${sharing.kind}#${sharing.id}`}
                intro={sharing.kind === "fame" ? "Read this on Asha's Wall of Fame." : "Read this on Asha's Wall of Shame."}
              />
            </div>
          </div>
        )}
      </main>
      </div>
      <Footer />
    </>
  );
}
