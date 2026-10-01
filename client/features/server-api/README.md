# Server API client boundary

This folder owns browser-to-FastAPI communication. The request helper gets a
Firebase ID token from the signed-in browser identity and sends it directly to
the configured FastAPI origin. It deliberately does not proxy API calls through
Next.js.

FastAPI must still verify the token and authorize every operation. The browser
helper is a transport convenience, not an authorization boundary.
