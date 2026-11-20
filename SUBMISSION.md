# Devpost submission: CSC Winter Sparkathon

Paste-ready answers, written in first person. Replace anything in [brackets].

---

## Project name
Kindling

## Tagline (short description)
A shared campfire that keeps drifting friend groups close: when a friend goes quiet, their seat cools, and everyone else gets nudged to toss them a no-reply-needed spark.

## Inspiration / the problem
Friendships rarely end with a fight. They drift. You change schools, a sports season ends, someone moves to a new city. Nobody decides to stop talking. Everyone just assumes someone else will text first, and a few months later the group chat is dead.

The U.S. Surgeon General's 2023 advisory on loneliness found that people aged 15–24 spent 70% less time with friends in 2020 than in 2003. Group chats don't solve this, because they're loud for the people who are active and silent about the person who stopped talking. The friend who's struggling is usually the one least likely to speak up, and the friends who care often don't reach out because it feels awkward ("what do I even say after three weeks?").

I wanted a tool that notices who went quiet, and that makes reaching out feel small and safe instead of awkward.

## What it does
Kindling gives a small friend group (up to 12 people) a shared campfire. Each friend has a seat around it.

- **One tap a night.** You log how your day felt (bright, okay or heavy) and answer a fun nightly question ("What snack would you bring to this fire?"). Everyone's answers stay hidden until you add yours, so everyone shares before anyone scrolls.
- **Quiet seats cool down.** If a friend hasn't checked in for a few days, their seat fades from glowing to cooling to embers. Kindling doesn't guilt the quiet friend. It nudges *everyone else*: "Maya has been quiet for 4 days. No one has reached out yet. Be the first?"
- **Sparks, no reply needed.** One-tap messages like "Saved your seat by the fire" or "Thinking of you. No reply needed." You can watch the spark fly across the fire to their seat. When they come back they see "While you were away, 2 sparks landed by your seat." You can also send it as a text.
- **Heavy days, named needs.** When you log a heavy day, Kindling asks what would help: company, not advice / distract me / I'd like to talk / just letting you know. Your friends see a blanket on your seat and a matching button (🪑 Sit with them, 🎈 Send a distraction, 💬 Offer to talk), so nobody has to guess the right thing to say.
- **A shared streak.** A night counts as kept when half the group checks in. The streak belongs to everyone, so no single person gets blamed for breaking it. Every kept night adds a star to the sky above your fire.

There's a one-click demo fire ("The Lunch Table") with three weeks of history, so judges can try everything without inviting friends. You can even switch seats and see the fire from the quiet friend's side.

## How I built it
- **Next.js 16 + React 19 + TypeScript** for the website and API routes, deployed on **Vercel**.
- **Turso** (hosted SQLite) stores circles, seats, nightly logs and sparks. Locally it uses a SQLite file.
- **The fire** is a canvas particle system I tuned by hand. Hundreds of soft, low-opacity puffs are blended additively, so the overlapping core glows hot and the edges stay orange-red. Puffs get pulled towards the centre as they rise, which makes flame "tongues". Embers drift up, and sparks fly along a curved path to a friend's seat. The fire's size comes from the group's "warmth".
- **The rules of the fire** (seat cooling, warmth, the shared streak, who to nudge) are pure functions with unit tests, so they behave the same on the server, in the browser and in tests.
- **Privacy by design:** there are no accounts or emails. Your seat is a private token stored on your device, and circles are invite-only. Sparks between other people stay private (you only see that someone reached out, not what they said). Tonight's answers are hidden on the server until you add your own, and "Leave this fire" deletes everything you wrote.

## Challenges I ran into
- **Making "you've been quiet" feel kind, not guilty.** My first idea was a personal streak, but that punishes the person who's already struggling. Moving the nudge to the *rest of the group* and making the streak shared changed the whole feel of the app.
- **Making the fire look like fire.** At first it was a white blob, because too many bright particles stacked up. I fixed it by lowering each particle's opacity, adding a red/orange colour fade over its life, and pulling particles towards the middle so they form flame tongues.
- **Time zones.** "Tonight" means different hours for different friends, so each log stores the writer's local day. The demo builds its history in the visitor's own time zone, so "earlier today" never slips into yesterday.
- **A demo that makes sense for any prompt.** The nightly question changes every day, so the demo picks a circle code whose question tonight matches one the demo friends have written answers for.

## Accomplishments I'm proud of
- The "while you were away" moment, when sparks from friends land by your seat. It's a small thing, but it feels warm.
- Heavy-day "named needs". Telling friends *how* to help removes the biggest barrier to helping.
- A completely working, deployed app with a demo anyone can try in one click.

## What I learned
- Design choices are social choices: whether a streak is individual or shared decides whether an app supports people or pressures them.
- How to build a particle system and why additive blending turns into white when particles overlap.
- Building server-side privacy rules (hidden answers, private sparks) instead of just hiding things in the UI.
- Deploying a full-stack Next.js app with a hosted SQLite database.

## What's next for Kindling
- Optional push notifications when a spark lands or a friend has a heavy day.
- "Fire for a cause": school clubs and teams using Kindling to check on members after the season ends.
- Gentle weekly recaps ("Your fire stayed lit 5 nights this week. Leo's seat warmed up again 🔥").
- More languages, and accessibility testing with screen-reader users.

## Who it's for
High school friend groups who are about to drift apart, or already have: friends who moved to different schools, teams after the season ends, cousins in different cities. It works for any small circle that wants to look out for each other.

## Built with
nextjs, react, typescript, turso, sqlite, libsql, vercel, canvas, css, node.js, claude

## Try it out
- Live demo: https://kindling-chi-three.vercel.app
- Source code: https://github.com/shineyrbl-byte/kindling

## AI-use disclosure
I used Claude (Anthropic), through Claude Code, as a coding assistant throughout the project:
- **Brainstorming:** I looked at my past projects with Claude and talked through ideas for the theme. The campfire metaphor, the quiet-seat nudges and the heavy-day "named needs" came out of that discussion.
- **Code:** Claude wrote much of the first version of the code (the API routes, the React components, the canvas fire and the CSS) based on the features and rules I described. I reviewed it, ran it and asked for changes.
- **Testing and debugging:** Claude wrote unit tests for the fire rules and ran automated browser screenshots on desktop and phone sizes. That's how we caught the white-blob fire, a seat hidden behind the flames, and a CSS fade that accidentally hid the front seat. We fixed each one.
- **Writing:** Claude helped draft the README and these submission answers, which I edited.

I can explain how every part works: how warmth is calculated (each friend's check-in fades over about 36 hours, and recent sparks add a little), how the shared streak counts nights (half the circle must log), how seat tokens keep circles private without accounts, and how the particle fire is drawn.

## Team members
[Your name]

---

## Demo video script (about 1:45)

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Landing page, fire flickering | "Friendships rarely end. They drift. You change schools, a season ends, and everyone waits for someone else to text first. This is Kindling." |
| 0:12–0:25 | Click *Try the demo fire*; inbox appears | "Kindling gives your friend group one campfire. When I open it, I see that while I was away, two friends tossed me sparks. No reply needed." |
| 0:25–0:40 | Click *Warm your hands*; sparks fly to my seat; pan over the seats | "Everyone has a seat. Sofia and Priya checked in today, so they're glowing. Maya's been quiet for three days, and Leo's seat is down to embers." |
| 0:40–1:00 | Click Maya → *Thinking of you* → sparks fly; show *Send it as a text too* | "Kindling doesn't guilt the quiet friend. It nudges everyone else. One tap, and a spark flies across the fire to Maya's seat. I can text it to her too." |
| 1:00–1:15 | Arjun's blanket card → *Sit with them* | "Arjun's having a heavy day, and he told us what he needs: company, not advice. So instead of guessing, I can just sit with him." |
| 1:15–1:30 | Log *Okay* + answer → answers unlock; fire grows | "Every night, one tap and a fun question. Everyone's answers unlock once you add yours, and the fire grows." |
| 1:30–1:45 | Streak card, stars; switch seat to Maya | "The streak belongs to the whole group, and every kept night adds a star. Kindling: keep your people close." |

## YouTube
- **Title:** Kindling: a campfire that keeps drifting friends close (CSC Winter Sparkathon)
- **Description:** Friendships rarely end. They drift. Kindling gives your friend group a shared campfire: check in with one tap a night, and when a friend goes quiet, their seat cools and everyone else gets a nudge to toss them a no-reply-needed spark. Try it: https://kindling-chi-three.vercel.app · Code: https://github.com/shineyrbl-byte/kindling
