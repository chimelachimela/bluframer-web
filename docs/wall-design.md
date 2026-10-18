# The Wall (asha.com.ng/wall): design notes

A campaign pair: **Wall of Shame** ("what has a client done to you?") and **Wall of Fame** ("how has Asha helped you?"). Creatives send a short story, anonymous or with their @handle. A person at Asha reads every one before it goes up.

The code is in `src/wall/`. This file records the design decisions so they survive after the design canvas is gone.

## Pages
| Address | What it is |
|---|---|
| `/wall` | Send page. Tabs: Wall of Shame / Wall of Fame. Story box (300 characters, optional when there is a screenshot), up to 3 screenshots, optional title above the screenshots, Anonymous or "Use my @handle". A screenshot-only story is valid. |
| `/wall/shame`, `/wall/fame` | The walls. Approved stories only, newest first. |
| `/stats` | Live numbers. See `stats-design.md`. |
| app `/wall/review` | Moderators only (in the bluframer app repo). |
| app `/wall/handle` | Sign-in step for "Use my @handle" (in the bluframer app repo). |

## Look
- Same two-tone palette as the landing page: light `#f7f7f3`, dark navy `#1c283e`, mid grey `#949aa2` for the tape. Not the bright blue.
- Fonts: Indie Flower for display and buttons, Instrument Sans for text.
- Cards are the hero's taped prints: slight tilt (about -1 to -2 degrees), a hard offset shadow, a strip of tape on top. The question sits on a navy header, the story on white.
- Pills and nav match the landing page. The Asha logo (dark on light backgrounds, light on dark) replaces the old "A" icon everywhere.
- No emoji. Real buttons and inputs, 44px minimum touch targets.

## Story card (what gets shared)
1080 x 1920, drawn in the browser (`storyCard.js`). **Layout B** was chosen:
1. Asha logo at the top, then "Wall of Shame" or "Wall of Fame" under it.
2. The story card (question on navy, story on white, "Anonymous creative" or @handle). **It has a fixed position and is read first.**
3. The first screenshot in a taped print under it, with its title above the picture.
4. "+N more on the wall" if there are more screenshots.
5. `asha.com.ng/wall` at the bottom.

Rule: the text card never moves down to make room. Screenshots only use the space left below it, so one screenshot is shown large enough to read without squinting, and the rest stay on the wall. (This is why the story card shows one screenshot.) With no screenshot, the story is set larger in Indie Flower and centred. With a screenshot and no words (a screenshot-only story), the question card keeps its place with only the name line, and the screenshot gets the room, sized to its own shape so it isn't cropped.

An alternative, **Layout A** (title at the top, logo at the bottom), was designed and not chosen.

## Limits
Story 300 characters, screenshot title 60, up to 3 screenshots, 5 MB each (images only), 5 stories per hour per connection. Screenshots are crop-and-blur-it-yourself first: the form says to crop to the lines that matter and blur names, numbers and faces.

## Identity
- **Anonymous** is the default.
- **Use my @handle** needs an Asha account. If they aren't signed in, the page says why (their @handle goes on the story and opens their Asha portfolio, so readers can find their work) and offers "Sign in or sign up" or "Stay anonymous".
- The handle is never typed in. It comes from a short-lived signed ticket the API issues to the signed-in account, and the handle shown is read from the account when the card is displayed. Only creatives who finished profile setup can use one.
- Clicking a handle on the wall opens `app.asha.com.ng/<username>`.

## Review (privacy)
Nothing is public until a moderator publishes it. The review page flags phone numbers and emails or @names in the text, and lets the moderator draw boxes over names, numbers and faces; the blurred copy replaces the file and the original is deleted. No client names on the wall.

## Sharing
The point of the card is brand identity: people post it to their WhatsApp Status, Instagram or Snapchat story and it carries the Asha logo and `asha.com.ng/wall` with it. The picture has the link printed as words only. The real, tappable link goes in the **caption**.
- **Share card** (and the WhatsApp, Instagram Story and Snapchat buttons): on a phone this opens the phone's share sheet with the picture and a caption that contains the link. That is how it reaches WhatsApp Status or a story. On a laptop the card is saved (or WhatsApp opens with the text and link) so it can be posted by hand.
- **Facebook, Threads, X**: open a post with the words and the link. They can't take the picture from a website; Save card as image covers that.
- **Copy link**, **Save card as image**.
- **After sending**: shows the person's own story card with the link to the Wall.
- **On every story on the wall**: a Share button opens the same sheet for that story. Its caption links to that story (`/wall/shame#<id>`), and that page shows the story first.
- **Prompt card**: "Share this prompt as a story" (on `/wall` and the wall pages) draws the prompt card (logo and wall name at the top, the question, the link) and shares or saves it the same way, so friends know to send theirs.
- **Link previews**: `/wall` shows its own title and picture when pasted into WhatsApp, Facebook, X or Threads (`public/wall-preview.html` and `public/og/wall.png`, served to those apps' crawlers by `vercel.json`).

Instagram's own Stories sharing (a background and sticker image handed to the Instagram app) works only from native iOS and Android apps, which is why a website can't add a tappable link sticker for the person.

## Not designed or built yet
Edit/withdraw a story after sending, "Same here" reactions (shown in the early design only), a dedicated page per story.
