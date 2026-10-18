import { useRef, useState } from "react";
import Footer from "../components/Footer";
import ShareSheet from "./ShareSheet";
import PromptShare from "./PromptShare";
import { wallApi, uploadShot, APP_URL, WALL_LINK } from "./api";
import { prepareImage } from "./image";
import { logoOnLight } from "../images";
import "./wall.css";

const MAX_BODY = 300, MAX_SHOTS = 3, MAX_TITLE = 60;
const DRAFT_KEY = "asha_wall_draft";

// When someone signs in through the app to use their @handle, the app sends them back here with a short-lived
// ticket in the #hash (so it never reaches a server log). Read it once, then clear the address bar.
function readHandoff() {
  const out = { ticket: null, username: null, kind: null };
  try {
    const p = new URLSearchParams(window.location.hash.slice(1));
    if (p.get("ticket")) {
      out.ticket = p.get("ticket"); out.username = p.get("u"); out.kind = p.get("kind");
      window.history.replaceState(null, "", window.location.pathname);
    }
  } catch { /* no hash to read */ }
  return out;
}
const HANDOFF = readHandoff();
function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}
const DRAFT = readDraft();

const COPY = {
  shame: { head: "what has a client done to you?", ph: "Tell it how it happened. Leave out names and numbers." },
  fame: { head: "how has Asha helped you?", ph: "Tell us how it went. Leave out names and numbers." },
};

export default function Send() {
  const [kind, setKind] = useState(["shame", "fame"].includes(HANDOFF.kind) ? HANDOFF.kind : ["shame", "fame"].includes(DRAFT.kind) ? DRAFT.kind : "shame");
  const [body, setBody] = useState(DRAFT.body || "");
  const [shotTitle, setShotTitle] = useState(DRAFT.shotTitle || "");
  const [shots, setShots] = useState([]);
  const [ticket, setTicket] = useState(HANDOFF.ticket ? { value: HANDOFF.ticket, username: HANDOFF.username } : null);
  const [identity, setIdentity] = useState(HANDOFF.ticket ? "handle" : "anon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const fileRef = useRef(null);

  const addFiles = async (files) => {
    setError("");
    const room = MAX_SHOTS - shots.length;
    const picked = [...files].slice(0, room);
    if (files.length > room) setError(`You can add up to ${MAX_SHOTS} screenshots.`);
    try {
      const prepared = await Promise.all(picked.map(prepareImage));
      setShots((s) => [...s, ...prepared].slice(0, MAX_SHOTS));
    } catch (e) { setError(e.message); }
  };
  const removeShot = (i) => setShots((s) => s.filter((_, k) => k !== i));

  const signIn = () => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ kind, body, shotTitle })); } catch { /* private mode */ }
  };

  const send = async (e) => {
    e.preventDefault();
    // a screenshot is a story on its own: the words are only needed when there is no screenshot
    if (!body.trim() && !shots.length) return setError("Write your story or add a screenshot.");
    setBusy(true); setError("");
    try {
      let paths = [];
      if (shots.length) {
        const { uploads } = await wallApi("/sign", { method: "POST", body: JSON.stringify({ count: shots.length }) });
        await Promise.all(uploads.map((u, i) => uploadShot(u, shots[i].blob)));
        paths = uploads.map((u) => u.path);
      }
      const useHandle = identity === "handle" && ticket;
      await wallApi("/entries", { method: "POST", body: JSON.stringify({ kind, body: body.trim(), shotTitle: shotTitle.trim(), shots: paths, ticket: useHandle ? ticket.value : undefined }) });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setSent({ kind, body: body.trim(), handle: useHandle ? ticket.username : null, shotTitle: shotTitle.trim(), shotUrl: shots[0]?.url ?? null, extraShots: Math.max(shots.length - 1, 0) });
    } catch (err) {
      if (/sign-in expired/i.test(err.message)) { setTicket(null); setIdentity("handle"); }
      setError(err.message);
    } finally { setBusy(false); }
  };

  const c = COPY[kind];
  const needsSignIn = identity === "handle" && !ticket;

  return (
    <>
      <main className="wl wl--send">
        <header className="wl-top">
          <a href="/" aria-label="Asha home"><img src={logoOnLight} alt="Asha" /></a>
          <a className="wl-btn wl-btn--solid wl-btn--sm" href="/wall/shame">Read the wall</a>
        </header>
        {sent ? <ShareSheet {...sent} /> : (
          <form className="wl-form" onSubmit={send}>
            <div className="wl-tabs" role="group" aria-label="Which wall">
              <button type="button" className="wl-tab" aria-pressed={kind === "shame"} onClick={() => setKind("shame")}>Wall of Shame</button>
              <button type="button" className="wl-tab" aria-pressed={kind === "fame"} onClick={() => setKind("fame")}>Wall of Fame</button>
            </div>

            <div className="wl-prompt">
              <span className="wl-tape" aria-hidden="true" />
              <div className="wl-prompt__head"><h1>{c.head}</h1></div>
              <div className="wl-prompt__body">
                <label className="wl-sr" htmlFor="wl-body">Your story (optional if you add a screenshot)</label>
                <textarea id="wl-body" value={body} maxLength={MAX_BODY} placeholder={c.ph} onChange={(e) => setBody(e.target.value)} />
                <span className="wl-count" aria-live="polite">{body.length}/{MAX_BODY}</span>
              </div>
            </div>

            <fieldset className="wl-field">
              <legend>Screenshots <span>(optional)</span></legend>
              <span className="wl-field__count">{shots.length} of {MAX_SHOTS}</span>
              <div className="wl-thumbs">
                {shots.map((s, i) => (
                  <div className="wl-thumb" key={s.url}>
                    <img src={s.url} alt={`Screenshot ${i + 1}`} />
                    <button type="button" className="wl-thumb__x" aria-label={`Remove screenshot ${i + 1}`} onClick={() => removeShot(i)}>×</button>
                    {i === 0 && <span className="wl-thumb__tag">On the card</span>}
                  </div>
                ))}
                {shots.length < MAX_SHOTS && (
                  <button type="button" className="wl-add-shot" onClick={() => fileRef.current?.click()}>+ Add</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </div>
              <label className="wl-sr" htmlFor="wl-shot-title">Title for your screenshots</label>
              <input id="wl-shot-title" className="wl-input" type="text" maxLength={MAX_TITLE} value={shotTitle} placeholder="Title, if you want one" onChange={(e) => setShotTitle(e.target.value)} />
              <p className="wl-hint">The first screenshot goes on your story card, the rest on the wall. Crop it to the lines that matter, and blur names, numbers and faces, before sending.</p>
            </fieldset>

            <div className="wl-tabs wl-tabs--id" role="group" aria-label="Who sends this">
              <button type="button" className="wl-tab" aria-pressed={identity === "anon"} onClick={() => setIdentity("anon")}>Anonymous</button>
              <button type="button" className="wl-tab" aria-pressed={identity === "handle"} onClick={() => setIdentity("handle")}>Use my @handle</button>
            </div>

            {needsSignIn && (
              <div className="wl-panel">
                <h2>Sign in to use your @handle</h2>
                <p>Your @handle goes on your story and opens your Asha portfolio, so people who read it can find your work. An anonymous story can't do that.</p>
                <div className="wl-panel__row">
                  <a className="wl-btn wl-btn--solid" href={`${APP_URL}/wall/handle?kind=${kind}`} onClick={signIn}>Sign in or sign up</a>
                  <button type="button" className="wl-btn wl-btn--line" onClick={() => setIdentity("anon")}>Stay anonymous</button>
                </div>
              </div>
            )}
            {identity === "handle" && ticket && (
              <div className="wl-panel wl-panel--ok"><p>Sending as <strong>@{ticket.username}</strong>. Your name on the card opens your Asha portfolio.</p></div>
            )}

            {error && <p className="wl-error" role="alert">{error}</p>}
            <button className="wl-btn wl-btn--solid wl-btn--wide wl-btn--big" type="submit" disabled={busy || needsSignIn}>{busy ? "Sending…" : "Send to the wall"}</button>
            <p className="wl-note">A person reads every story before it goes up. Your story lives at {WALL_LINK}.</p>
            <PromptShare kind={kind} />
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
