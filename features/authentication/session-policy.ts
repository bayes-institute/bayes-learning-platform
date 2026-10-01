/**
 * The server cookie is deliberately short enough to make an abandoned browser
 * session expire, but long enough that a learner is not asked to sign in every
 * few days. A meaningful browser interaction renews this window at most once
 * per interval in SessionActivityKeeper.
 *
 * Firebase session cookies have a two-week maximum lifetime. Keeping this
 * value below that maximum gives us a rolling inactivity window without
 * inventing a second, less trustworthy clock in localStorage.
 */
export const sessionInactivityWindowMilliseconds = 14 * 24 * 60 * 60 * 1000;

/** Do not send a new signed cookie for every scroll or key press. */
export const sessionRenewalThrottleMilliseconds = 10 * 60 * 1000;

/** A first session must follow an interactive Firebase sign-in very closely. */
export const recentAuthenticationWindowMilliseconds = 5 * 60 * 1000;

export const sessionCookieName = "bayes_session";
