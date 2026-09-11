"""Portal-specific session cookie helpers.

The corporate and admin frontends are served on different ports, but browser
cookies are scoped to a host rather than a port.  A distinct cookie per portal
keeps a login in one portal from replacing the other.
"""

from flask import current_app, request

PORTAL_HEADER = "X-Upay-Portal"
CORPORATE_PORTAL = "corporate"
ADMIN_PORTAL = "admin"


def current_portal():
    """Return a supported portal identifier; unknown/missing values are corporate."""
    portal = request.headers.get(PORTAL_HEADER, CORPORATE_PORTAL).strip().lower()
    return ADMIN_PORTAL if portal == ADMIN_PORTAL else CORPORATE_PORTAL


def auth_cookie_name(portal=None):
    """Return the cookie name for a portal, retaining legacy test configuration."""
    if (portal or current_portal()) == ADMIN_PORTAL:
        return current_app.config.get("ADMIN_AUTH_COOKIE_NAME", "upay_admin_session")
    return current_app.config.get(
        "CORPORATE_AUTH_COOKIE_NAME",
        current_app.config.get("AUTH_COOKIE_NAME", "upay_corporate_session"),
    )
