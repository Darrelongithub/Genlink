# Genlink + ADAPT integration

Genlink and ADAPT are deliberately kept as two UIs in this preparation round:

- **Genlink** is the LMS shell: brand, catalogue, enrolment, course navigation and progress.
- **ADAPT** is the learning engine: learner sign-in, diagnostic/tests, evidence, pacing and check-ins.

The hand-off is explicit rather than a fake shared engine. A learner can open ADAPT from the
**ADAPT Engine** item in every Genlink top bar. If a signed-in learner stays quiet in a Genlink
lesson for a while, Genlink shows an "Everything okay?" prompt; its primary action opens ADAPT,
where the real check-in and tests happen. Genlink does not duplicate or guess ADAPT's scores.
Single sign-on and a shared learner identity are intentionally deferred until the ADAPT account
contract settles. For now the learner signs in in ADAPT, as requested.

The bundled engine is synced from [`Darrelongithub/Adapt`](https://github.com/Darrelongithub/Adapt)
`main` at commit `2450bc89c05b8c1c47476a026777ba9c8aae8df2` (the role-scoped psychology,
education and adaptation API slots). Upstream's binary ZIP bundles and generated screenshot
packs are intentionally not copied into this integration workspace; the source, migrations,
tests and text documentation are included.

## Run on Fedora

From the repository root:

```bash
# Genlink UI (development mode)
npm ci
cp .env.example .env.local
npm run dev                 # http://<this-machine>:8080

# ADAPT UI + API (the recommended hosted/demo mode, in another terminal)
python3 -m venv adapt/.venv
adapt/.venv/bin/python -m pip install -e './adapt/backend[dev]'
npm --prefix adapt/frontend ci
npm run host                # http://<this-machine>:3000
```

`npm run host` is intentionally **ADAPT's** host command. It builds and starts the ADAPT frontend,
starts its Python API, binds the room to `0.0.0.0`, detects the machine's LAN address, and prints the
address to open. It does not start Genlink. Use `npm run dev` separately when you want the Genlink
shell. Stop either process with `Ctrl+C`.

If ADAPT is on another host, put its complete origin in `.env.local`:

```dotenv
VITE_ADAPT_URL=https://adapt.example.test
```

Without that value, Genlink replaces its current port with ADAPT's default port `3000`. That means a
phone or another Fedora machine using the Genlink LAN address is sent to the matching ADAPT LAN
address, not to `localhost`.

## Integration contract

The future shared flow should keep these boundaries:

1. Genlink chooses the curriculum destination and can identify the current learner.
2. ADAPT owns authentication for the engine, test attempts, timing/evidence and adaptation decisions.
3. A later identity bridge can exchange a signed, short-lived hand-off token. Do not pass a Supabase
   access token in a query string or copy learner history into browser storage.
4. ADAPT's check-in response remains the source of truth for pace changes. Genlink should only show
   the hand-off prompt until that contract is implemented.

Useful commands from the root:

```bash
npm run dev          # Genlink
npm run host         # ADAPT room host
npm run adapt:dev    # ADAPT development host
npm run adapt:build  # build ADAPT without starting it
```
