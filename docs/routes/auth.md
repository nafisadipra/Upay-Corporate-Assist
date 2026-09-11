# `backend/app/routes/auth.py` — beginner line guide

**Job:** This file lets a user log in, ask “who am I?”, restore a browser session, and log out. Its base URL is `/api/auth`.

## Lines 1–11: tools and route group

- **1–2:** Import JWT and date tools. JWT is the signed login token; dates decide when it expires.
- **3:** Imports Flask request/response helpers, app settings, and `g`, the temporary place where a logged-in user is stored for one request.
- **4:** Imports password-hash checking. The real password is never compared or stored as plain text.
- **5–6:** Bring in the database and `User` database table.
- **7:** Imports `require_auth`, used below to block guests.
- **8–9:** Imports portal helpers. They choose different login cookies for the corporate and admin portals.
- **10:** Imports the rate limiter.
- **11:** Creates the `auth_bp` blueprint. Every URL below starts with `/api/auth`.

## `POST /login` — lines 14–74

- **14:** Connects `POST /api/auth/login` to `login`.
- **15:** Limits this URL to five tries a minute. This slows password guessing.
- **16:** Starts the function.
- **17–19:** Reads JSON safely, takes `email` and `password`, removes extra spaces, and makes email lowercase.
- **21–22:** Stops early with HTTP `400` if either value is missing.
- **25–27:** Looks up a `User` row by email. If no row exists, returns `401` without revealing whether the email is known.
- **29–33:** Refuses suspended or inactive users with `403`.
- **36–41:** Checks the submitted password against `user.password_hash`. A bad or damaged hash is treated as invalid; the broad `except` prevents internal error details leaking out.
- **43–44:** Returns the same `401` response for a wrong password.
- **46–50:** Checks which portal is being used. Admin users must use the admin portal, and non-admin users must use the corporate portal.
- **52–59:** Builds the token contents: user/company IDs, display data, role, and expiry time. Later routes read these values after token verification.
- **61:** Signs those contents with `JWT_SECRET_KEY` using HS256, producing the JWT token.
- **63:** Creates the JSON response. It gives the frontend the token and a JSON version of the user record.
- **64–72:** Also stores the token in an HTTP-only cookie. JavaScript cannot read this cookie; `secure`, `samesite`, and `path` control where the browser may send it.
- **73–74:** Sends the response with `200 OK`.

## `GET /me` — lines 76–80

- **76:** Maps the URL.
- **77:** Requires a valid login token before the function runs. It sets `g.current_user`.
- **78:** Starts the function.
- **79:** Sends the logged-in user’s data to the caller. This is a small “who is signed in?” endpoint.

## `GET /session` — lines 82–115

- **82–83:** Creates a session-check URL that deliberately does not treat a signed-out browser as an error.
- **84–88:** Reads an `Authorization: Bearer ...` header and extracts its token only when the header uses that format.
- **89–91:** Gets the matching portal cookie and chooses the header token first, otherwise the cookie token.
- **93–94:** If there is no token, says `authenticated: false` with `200`. This lets the frontend show its login screen normally.
- **96–100:** Decodes the signed token, reads its `user_id`, and gets that `User` row from the database. An expired, altered, or malformed token becomes `user = None`.
- **102–112:** Also rejects a missing, inactive, or suspended user. If the bad token came from a cookie, it deletes that cookie. The response still says “not authenticated,” not an internal error.
- **114:** A valid active user gets `authenticated: true` and their JSON data.

## `POST /logout` — lines 117–126

- **117–118:** Maps the logout URL and starts its function.
- **119:** Builds a success message.
- **120–125:** Deletes the current portal’s cookie using the same security settings used when it was created.
- **126:** Returns success. The browser has no cookie session afterwards.

## Connections

`frontend/src/context/AuthContext.tsx` and login UI files call these URLs. This route reads `User` from `app.models`, writes no user data, and gives the token/cookie that all protected route files use.
