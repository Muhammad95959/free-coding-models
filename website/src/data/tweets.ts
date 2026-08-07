/**
 * @file src/data/tweets.ts
 * @description Type layer for the testimonials tweet list.
 *
 *   📖 The raw data lives in `./tweets.json` (a flat array of `{ url }`
 *   objects). This module is intentionally thin: it imports the JSON,
 *   re-exports it under a `Tweet` type, and provides the `extractHandle`
 *   helper used by the masonry skeleton. This split keeps the data easy
 *   to edit / refactor independently of the embed component.
 */
import rawTweets from "./tweets.json";

export type Tweet = {
	/** Full X / Twitter status URL, e.g. https://x.com/<handle>/status/<id>. */
	url: string;
};

export const TWEETS: Tweet[] = rawTweets as Tweet[];

/** 📖 Pull the @handle out of an X / Twitter status URL. Used by the
 *  skeleton loader so the placeholder can say "Loading @handle…". */
export function extractHandle(url: string): string {
	const match = url.match(/(?:x\.com|twitter\.com)\/([^/?#]+)/);
	return match ? `@${match[1]}` : "";
}
