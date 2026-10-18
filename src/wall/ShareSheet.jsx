import { useEffect, useState } from "react";
import { renderStoryCard } from "./storyCard";
import { shareImage, saveImage, copyImage } from "./share";
import { WALL_LINK, WALL_URL } from "./api";

const enc = encodeURIComponent;

// The card is drawn once and used for the preview, "Save", and the phone share sheet.
// On a phone, "Share card" sends the picture with a caption that holds the link (the link is not on the picture,
// like a WhatsApp Status or Instagram post). `link` is where the caption points: the Wall, or one story on it.
export default function ShareSheet({ kind, body, handle, shotTitle, shotUrl, extraShots, link = WALL_URL, intro, sent = true }) {
  const [card, setCard] = useState(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    renderStoryCard({ kind, body, handle, shotTitle, shotUrl, extraShots })
      .then((c) => alive && setCard(c))
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [kind, body, handle, shotTitle, shotUrl, extraShots]);

  const lead = intro ?? (kind === "fame"
    ? "I just added my story to Asha's Wall of Fame. How has Asha helped you?"
    : "I just added my story to Asha's Wall of Shame. What has a client done to you?");
  const caption = `${lead} ${link}`;

  const post = async (appName, fallback) => {
    if (!card) return;
    const result = await shareImage({ blob: card.blob, text: caption });
    if (result === "shared") return setNote("");
    if (result === "cancelled") return;
    if (fallback) return fallback();
    saveImage(card.blob);
    setNote(`Saved your card. Open ${appName}, add it to your story, and paste the link in the caption (use Copy link).`);
  };
  const open = (url) => window.open(url, "_blank", "noopener,noreferrer");
  // No phone share sheet (a laptop): copy the card, open the app's own post page with the words and link filled in,
  // and tell the person to paste the picture. If the browser won't copy, save the card instead.
  const withPicture = (appName, url) => async () => {
    const ok = await copyImage(card.blob);
    if (!ok) saveImage(card.blob);
    open(url);
    setNote(ok
      ? `Card copied. In ${appName}, paste it with Ctrl+V (Cmd+V on a Mac) to add the picture. The link is already in the text.`
      : `Card saved. In ${appName}, attach it from your downloads. The link is already in the text.`);
  };
  const whatsappText = withPicture("WhatsApp", `https://wa.me/?text=${enc(caption)}`);
  const facebookText = withPicture("Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`);
  const threadsText = withPicture("Threads", `https://www.threads.com/intent/post?text=${enc(lead)}&url=${enc(link)}`);
  const xText = withPicture("X", `https://x.com/intent/post?text=${enc(lead)}&url=${enc(link)}`);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); }
    catch { const t = document.createElement("textarea"); t.value = link; document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="wl-share" aria-labelledby="wl-sent">
      <h1 id="wl-sent" className="wl-title">{sent ? "Sent. A person will read it first." : "Share this story"}</h1>
      <p className="wl-sub">{sent ? "Your story card is ready. Post it and ask others to send theirs." : "The card goes out as a picture, with the link in the caption."}</p>

      <div className="wl-share__card">
        {card ? <img src={card.url} alt="The story card, ready to post" /> : <div className="wl-share__wait">{failed ? "Couldn't draw the card." : "Drawing the card…"}</div>}
      </div>

      <button type="button" className="wl-btn wl-btn--line wl-btn--wide" onClick={() => post("your app")} disabled={!card}>Share card</button>
      <div className="wl-share__row">
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("WhatsApp", whatsappText)} disabled={!card}>WhatsApp</button>
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("Instagram")} disabled={!card}>Instagram Story</button>
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("Snapchat")} disabled={!card}>Snapchat</button>
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("Facebook", facebookText)} disabled={!card}>Facebook</button>
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("Threads", threadsText)} disabled={!card}>Threads</button>
        <button type="button" className="wl-btn wl-btn--line" onClick={() => post("X", xText)} disabled={!card}>X</button>
      </div>
      <button type="button" className="wl-btn wl-btn--solid wl-btn--wide wl-btn--big" onClick={copy}>{copied ? "Link copied" : `Copy link: ${link.replace(/^https:\/\//, "")}`}</button>
      <button type="button" className="wl-btn wl-btn--line wl-btn--wide" onClick={() => card && saveImage(card.blob)} disabled={!card}>Save card as image</button>

      <p className="wl-note" role="status">{note || "On a phone, every button opens your share sheet with the picture and the link in the caption. On a laptop the card is copied so you can paste it into the app."}</p>
      {sent && <p className="wl-note"><a href={`/wall/${kind}`}>Read the wall</a></p>}
    </section>
  );
}

export { WALL_LINK };
