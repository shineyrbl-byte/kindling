// Words used around the fire: sparks you can toss, the ways to ask for support, and nightly prompts.
import type { Mood, Need } from "./fire.ts";

export interface SparkKind {
  kind: string;
  emoji: string;
  label: string;
  text: string;
  custom?: string; // placeholder when the spark takes a short message
}

/** Sparks for a quiet friend. Every one says "no reply needed", out loud or not. */
export const SPARKS: SparkKind[] = [
  { kind: "thinking", emoji: "✨", label: "Thinking of you", text: "Thinking of you. No reply needed." },
  { kind: "seat", emoji: "🪵", label: "Saved your seat", text: "Saved your seat by the fire. It's here whenever you are." },
  { kind: "miss", emoji: "🔥", label: "Miss you", text: "The fire's not the same without you." },
  { kind: "call", emoji: "📞", label: "Call sometime?", text: "Free for a call this week? Zero pressure." },
  { kind: "proud", emoji: "🌟", label: "Proud of you", text: "Proud of you, for whatever you're carrying right now." },
  { kind: "saw", emoji: "👀", label: "Saw this, thought of you", text: "Saw this and thought of you:", custom: "a song, a meme, a link…" },
];

export interface NeedKind {
  need: Need;
  emoji: string;
  label: string; // what the person picks
  ask: string; // what friends see
  offer: SparkKind; // the matching way to help
}

/** When someone has a heavy day they say what kind of support they want, so friends don't have to guess. */
export const NEEDS: NeedKind[] = [
  {
    need: "company",
    emoji: "🪑",
    label: "Company, not advice",
    ask: "wants company, not advice",
    offer: { kind: "sit", emoji: "🪑", label: "Sit with them", text: "I'm sitting with you. No advice, just here." },
  },
  {
    need: "distract",
    emoji: "🎈",
    label: "Distract me",
    ask: "would love a distraction",
    offer: { kind: "distract", emoji: "🎈", label: "Send a distraction", text: "A distraction for you:", custom: "a song, a meme, a weird fact…" },
  },
  {
    need: "talk",
    emoji: "💬",
    label: "I'd like to talk",
    ask: "would like to talk",
    offer: { kind: "talk", emoji: "💬", label: "Offer to talk", text: "I can talk. When works for you?", custom: "tonight? tomorrow after school?" },
  },
  {
    need: "fyi",
    emoji: "🫶",
    label: "Just letting you know",
    ask: "is just letting you know",
    offer: { kind: "heard", emoji: "🫶", label: "Let them know you heard", text: "Heard you. I'm here." },
  },
];

export const MOODS: { mood: Mood; emoji: string; label: string; hint: string }[] = [
  { mood: "bright", emoji: "🌞", label: "Bright", hint: "a good day" },
  { mood: "okay", emoji: "🌤️", label: "Okay", hint: "an ordinary day" },
  { mood: "heavy", emoji: "🌧️", label: "Heavy", hint: "a hard day" },
];

export const COLORS = ["#ff8a5b", "#ffc857", "#7bd389", "#5bc0eb", "#b28dff", "#ff6f91", "#f9f871", "#4ecdc4"];

export const PROMPTS = [
  "What's one small thing that made you smile today?",
  "If today were a song, what would it be?",
  "What snack would you bring to this fire?",
  "What's something you're looking forward to this week?",
  "What's a tiny win from today, no matter how small?",
  "If you could teleport anywhere for one hour, where?",
  "What's the last thing that made you laugh out loud?",
  "What's a skill you'd love to learn from someone here?",
  "What's your comfort show or movie right now?",
  "What would your ideal lazy Sunday look like?",
  "What's something you're proud of that nobody asked about?",
  "Which fictional character would you want at this fire?",
  "What's a weird food combo you secretly love?",
  "What's a memory with this group you think about a lot?",
  "What's something that's been on your mind lately?",
  "Describe your day in three emojis.",
  "What's a song you've had on repeat?",
  "What's the best advice you've ever gotten?",
  "If you opened a tiny shop, what would it sell?",
  "What's a small thing someone did for you that you still remember?",
  "What are you reading, watching or playing right now?",
  "What would you name a pet rock?",
  "What's one thing you'd tell yourself from a year ago?",
  "What's a place that feels like home to you?",
  "What's your go-to order at your favorite food place?",
  "What's something you changed your mind about recently?",
  "What's the best thing you ate this week?",
  "If this group had a theme song, what would it be?",
  "What's a hobby you'd pick up if you had a free month?",
  "What's one thing that would make tomorrow a little better?",
  "What's a compliment you got that stuck with you?",
  "What's your most useless talent?",
  "What's the weather like where you are right now?",
  "What's something you want to do together next time we meet?",
  "What's a question you wish people asked you more?",
  "Which season matches your mood today?",
  "What's an app you couldn't live without, and one you should delete?",
  "What's the cosiest thing you own?",
  "What's a goal you're quietly working towards?",
  "What's one thing you appreciate about someone at this fire?",
];

/** The same prompt for everyone in a circle on a given day. */
export function promptFor(code: string, day: string): string {
  let h = 2166136261;
  for (const ch of code + day) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return PROMPTS[(h >>> 0) % PROMPTS.length];
}

export function needInfo(need: Need | null): NeedKind | undefined {
  return NEEDS.find((n) => n.need === need);
}

/** Every spark (and offer) a friend can send, by kind. */
export function sparkInfo(kind: string): SparkKind | undefined {
  return SPARKS.find((s) => s.kind === kind) ?? NEEDS.map((n) => n.offer).find((o) => o.kind === kind);
}
