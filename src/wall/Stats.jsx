import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { wallApi } from "./api";
import { renderStatsCard } from "./storyCard";
import { shareImage, saveImage, copyImage } from "./share";
import { logoOnDark } from "../images";
import "./wall.css";

const TILES = [
  ["creatives", "Creatives on Asha"],
  ["projectsProtected", "Projects protected"],
  ["photosLocked", "Photos and designs locked"],
  ["released", "Released after approval"],
];
const STATS_URL = "https://asha.com.ng/stats";
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-NG") : "—");

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = "Live stats | Asha";
    let alive = true;
    const load = () => wallApi("/stats").then((d) => { if (alive) { setStats(d); setFailed(false); } }).catch(() => alive && setFailed(true));
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // The card is drawn as soon as the numbers arrive, so the button can hand it over at once (browsers only allow
  // copying to the clipboard right after a click).
  const [card, setCard] = useState(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!stats) return;
    let alive = true;
    const asOf = new Date(stats.updatedAt || Date.now()).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
    renderStatsCard({ tiles: TILES.map(([key, label]) => [label, fmt(stats[key])]), asOf }).then((c) => alive && setCard(c)).catch(() => {});
    return () => { alive = false; };
  }, [stats]);

  const post = async () => {
    if (!stats || !card) return;
    const text = `On Asha right now: ${fmt(stats.creatives)} creatives, ${fmt(stats.photosLocked)} photos and designs locked, ${fmt(stats.released)} released after approval. ${STATS_URL}`;
    // phone: the picture goes out through the share sheet with the link in the caption
    const result = await shareImage({ blob: card.blob, text, name: "asha-live-stats.png" });
    if (result === "shared" || result === "cancelled") return setNote("");
    // laptop: copy the picture, open WhatsApp with the words and link, and ask for a paste
    const ok = await copyImage(card.blob);
    if (!ok) saveImage(card.blob, "asha-live-stats.png");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setNote(ok ? "Card copied. In WhatsApp, paste it with Ctrl+V (Cmd+V on a Mac) to add the picture. The link is already in the text." : "Card saved. In WhatsApp, attach it from your downloads. The link is already in the text.");
  };

  return (
    <>
      <Navbar />
      <main className="wl wl--stats">
        <p className="wl-live"><span aria-hidden="true" /> LIVE <small>Updated every 30 seconds</small></p>
        <h1 className="wl-title">How creatives are protected, live.</h1>
        <p className="wl-sub">Real numbers from Asha. Nothing here is a client name or a file.</p>
        <ul className="wl-tiles">
          {TILES.map(([key, label]) => (
            <li key={key} className="wl-tile">
              <span>{label}</span>
              <strong aria-live="polite">{fmt(stats?.[key])}</strong>
            </li>
          ))}
        </ul>
        {failed && <p className="wl-note" role="alert">Couldn't reach the numbers just now. Trying again.</p>}
        <div className="wl-banner" data-nav-theme="dark">
          <img className="wl-banner__logo" src={logoOnDark} alt="Asha" />
          <p>LOCKED BY <strong>asha.com.ng</strong></p>
          <button type="button" className="wl-btn wl-btn--light" onClick={post} disabled={!card}>Post these numbers</button>
        </div>
        {note && <p className="wl-note" role="status">{note}</p>}
      </main>
      <Footer />
    </>
  );
}
