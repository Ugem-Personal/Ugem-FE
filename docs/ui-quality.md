# UI quality checks

## Automated gate

```bash
npm run verify
```

With the frontend running on port 3000 and backend on port 8080:

```bash
npm run smoke:local
```

Override either origin when needed:

```bash
SMOKE_FRONTEND_URL=https://app.example.com \
SMOKE_BACKEND_URL=https://api.example.com npm run smoke:local
```

The smoke check verifies SPA fallback routes, liveness/readiness, the common API
envelope, trace IDs, authorization rejection, and backend security headers. It
does not mutate data.

## Accessibility baseline

- The document language is Vietnamese.
- Every route has a descriptive title.
- Route changes move focus to the new main-content container and are announced
  through a polite live region.
- A keyboard-visible skip link moves directly to main content.
- Global focus-visible and reduced-motion behavior live in `src/index.css`.
- Icon-only controls require a Vietnamese `aria-label`.
- Buttons inside forms must declare `type="button"` unless they submit.
- Form errors and asynchronous results should be exposed through an `aria-live`
  region where the surrounding component does not already provide one.

## Manual browser matrix before release

Test at 360x800, 768x1024, 1440x900 and 200% browser zoom:

1. Register and log in with the keyboard only.
2. Browse merchants, add toppings, and create an order.
3. Advance an order through the merchant lifecycle.
4. Open Admin dashboard, staff management, and audit logs.
5. Generate and scan an offline check-in QR.
6. Confirm there is no horizontal page overflow, clipped dialog, hidden focus,
   or action available only by pointer hover.

