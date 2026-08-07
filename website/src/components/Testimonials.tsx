/**
 * @file src/components/Testimonials.tsx
 * @description Homepage "What the community says" section — a masonry grid of
 *   real X / Twitter embeds (loaded via `widgets.js`).
 *
 *   Layout: a CSS-columns masonry (1 / 2 / 3 columns responsive) so the wall
 *   packs tightly regardless of each tweet's height. Items flow top-to-bottom
 *   within each column (Pinterest-style).
 *
 *   Performance: each embed is wrapped in a `LazyTweetEmbed` that only mounts
 *   the real `widgets.js` iframe when it scrolls into view (IntersectionObserver
 *   with a `200px` rootMargin so it loads slightly before entering). Until then
 *   a dark skeleton card with the X logo and "Loading @handle…" placeholder
 *   fills the slot to avoid layout shift.
 *
 *   Theming: every embed sits in a `.testimonials-embed` rounded dark card
 *   (see `styles.css`) that clips the iframe to a rounded shape and hides the
 *   white corners of X's embed frame.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TWEETS, extractHandle } from "~/data/tweets";

declare global {
	interface Window {
		twttr?: {
			widgets: {
				load: (element?: HTMLElement) => void;
			};
		};
	}
}

/** 📖 Minimal HTML escaper — tweet URLs can technically contain `&` or quotes. */
function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			case "'":
				return "&#39;";
			default:
				return char;
		}
	});
}

/** 📖 Official X logo as an inline SVG — accurate, dependency-free. */
function XLogo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

/** 📖 The real X embed. Renders ONLY the inner content (the blockquote that
 *  `widgets.js` will swap for an iframe). The rounded card chrome lives on
 *  the outer `LazyTweetEmbed` wrapper so the skeleton and the real embed
 *  share the exact same shape. */
function TweetEmbed({ url }: { url: string }) {
	const innerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const inner = innerRef.current;
		if (!inner) return;

		const safeUrl = escapeHtml(url);
		inner.innerHTML =
			`<blockquote class="twitter-tweet" data-theme="dark" data-dnt="true">` +
			`<a href="${safeUrl}">${safeUrl}</a>` +
			`</blockquote>`;

		const loadIntoInner = () => {
			window.twttr?.widgets?.load(inner);
		};

		if (window.twttr?.widgets) {
			loadIntoInner();
			return;
		}

		const existing = document.querySelector<HTMLScriptElement>(
			'script[src*="platform.twitter.com/widgets.js"]',
		);
		if (existing) {
			const onload = () => loadIntoInner();
			existing.addEventListener("load", onload, { once: true });
			return () => existing.removeEventListener("load", onload);
		}

		const script = document.createElement("script");
		script.src = "https://platform.twitter.com/widgets.js";
		script.async = true;
		script.charset = "utf-8";
		script.onload = loadIntoInner;
		document.body.appendChild(script);
		return undefined;
	}, [url]);

	return <div ref={innerRef} className="w-full" />;
}

/** 📖 Skeleton shown until the embed scrolls into view. Same rounded-card
 *  shape as the real embed (via the shared `.testimonials-embed` class) so
 *  the swap is seamless and the masonry doesn't jump. */
function TweetSkeleton({ handle }: { handle: string }) {
	return (
		<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
			<XLogo className="h-5 w-5 text-fg-muted" />
			<p className="font-mono text-[11px] text-fg-faint animate-pulse">
				Loading {handle || "tweet"}…
			</p>
		</div>
	);
}

/** 📖 Lazy wrapper. Observes the card; once it nears the viewport, swaps the
 *  skeleton for the real `TweetEmbed` (which inserts the blockquote + loads
 *  `widgets.js`). Disconnects after the first hit so each embed only loads once. */
function LazyTweetEmbed({ url, handle }: { url: string; handle: string }) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(false);

	useEffect(() => {
		const card = cardRef.current;
		if (!card) return;

		// 📖 rootMargin: 200px → start loading slightly before the card scrolls
		// 📖 in, so the swap feels instant when it actually enters view.
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActive(true);
						observer.disconnect();
						break;
					}
				}
			},
			{ rootMargin: "200px 0px" },
		);
		observer.observe(card);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={cardRef} className="testimonials-embed">
			{active ? <TweetEmbed url={url} /> : <TweetSkeleton handle={handle} />}
		</div>
	);
}

export function Testimonials() {
	return (
		<section className="border-b border-border py-20 sm:py-28">
			{/* 📖 Widened from max-w-3xl to max-w-6xl so a 3-column masonry of
			   responsive embeds has room to breathe (each column ~370px). */}
			<div className="mx-auto max-w-6xl px-5 sm:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
					viewport={{ once: true }}
					className="mx-auto flex max-w-xl flex-col items-center text-center"
				>
					<span className="font-mono text-xs font-medium uppercase tracking-wider text-fg-faint">
						05 — Loved by developers
					</span>
					<h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
						What the community says
					</h2>
					<p className="mt-4 text-base leading-relaxed text-fg-muted sm:text-lg">
						Real posts from people shipping with free-coding-models every day.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
					viewport={{ once: true }}
					className="mt-12"
				>
					{/* 📖 CSS-columns masonry. `break-inside-avoid` + `mb-6` on each
					   item keep tweets whole and add vertical rhythm within a column. */}
					<div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [column-fill:_balance]">
						{TWEETS.map((tweet) => {
							const handle = extractHandle(tweet.url);
							return (
								<div key={tweet.url} className="mb-6 break-inside-avoid">
									<LazyTweetEmbed url={tweet.url} handle={handle} />
								</div>
							);
						})}
					</div>
				</motion.div>
			</div>
		</section>
	);
}
