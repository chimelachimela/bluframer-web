# Live stats (asha.com.ng/stats): design notes

Modelled on a game-analytics "live stats" page that is meant to be shared: a LIVE pill, big numbers, a banner at the bottom with a "post these numbers" button. Code: `src/wall/Stats.jsx`, data from `GET /wall/stats` on bluframer-api.

## Layout
Navbar like the landing page, then a navy **LIVE** pill ("Updated every 30 seconds"), the title "How creatives are protected, live.", the line "Real numbers from Asha. Nothing here is a client name or a file.", the number tiles, and a dark banner: the Asha logo, "LOCKED BY asha.com.ng", and a **Post these numbers** button. The button shares a **picture** (`renderStatsCard` in `storyCard.js`, 1080 x 1920: logo, LIVE pill, the number cards, a navy banner with asha.com.ng/stats) with the link in the caption. On a phone it opens the share sheet; on a laptop it copies the picture and opens WhatsApp with the words and link, and asks for a paste.

## What is shown today (four tiles)
| Tile | Where the number comes from |
|---|---|
| Creatives on Asha | `profiles` with `onboarded = true` |
| Projects protected | `projects` with `restricted = true` and `status = 'published'` |
| Photos and designs locked | `project_assets` belonging to those projects |
| Released after approval | `access_requests` with `status = 'approved'` |

Counts only. Never a client name, email or file.

## Designed but not built: needs new tracking
The first design had six tiles. Two were dropped because the app can't tell us yet:
- **Active today**: there is no "last seen" field on a profile.
- **Client views today**: `project_views` only records views of projects that have a view timer, so it undercounts. A cheap fix would be a `viewed_at` event logged for every project open.

Other ideas once those exist: projects locked this week, median time from request to approval.

## Open check
The queries were written from the table and column names the existing API code already uses. They have **not** been run against the live database yet. Before launch, confirm against the real schema and look at the numbers for sense (for example, whether test accounts should be excluded).
