# n8n-nodes-alistia

n8n community node for [Alistia](https://alistia.app) — read shared lists and
views (public share **Data Links**) as clean JSON.

Alistia users can publish a list as a public share and enable a JSON data link.
This package lets an n8n workflow read that data and react to changes — for
dashboards, Home Assistant, notifications or any automation.

> **Read-only.** This MVP reads shared data. Writing entries back (create /
> update) is planned for a later release, once the Alistia write API ships.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter:

```
n8n-nodes-alistia
```

Self-hosted / manual:

```bash
npm install n8n-nodes-alistia
```

## Credential — Alistia Data Link API

Create an **Alistia Data Link API** credential:

| Field | Description |
| --- | --- |
| **Base URL** | `https://link.alistia.app` (change only for self-hosting). |
| **Share Token** | The token from the Alistia app. |

To get a token: open a list in Alistia → **Öffentliche Webliste** → create a web
list → in its menu enable **JSON-Datenlink aktivieren** → **Daten-URL (JSON)
kopieren**. The token is the last path segment of that URL. One credential maps
to one shared list or view.

The credential test fetches `/v1/views/{token}.json`. A `403 json_disabled`
means the JSON data link still has to be enabled in the app.

## Nodes

### Alistia

Read a shared list on demand.

- **Entry → Get Many** — returns every entry of the shared list as items. With
  *Field Labels as Keys* (default), item keys are the human field labels; turn
  it off for the raw `{ id, values }` shape keyed by field id.
- **Shared View → Get** — returns the full snapshot (list, fields, entries) as a
  single item.

### Alistia Trigger

Polls the shared list on a schedule.

- **New Entry** — emits each entry that newly appears (deduplicated by id).
- **Any Change** — emits all entries whenever the snapshot changes.

On the first scheduled poll the trigger seeds its state and emits nothing;
subsequent polls emit only what changed. A manual test execution returns the
current entries so you can see the shape.

## Example

`Alistia Trigger (New Entry)` → `IF` → `Slack`: post a message whenever a new
item appears in a shared shopping or task list.

## Data shape

Responses follow the Alistia Public Share API. Field ids are stable; labels are
localized. See the full reference and OpenAPI spec at
**[alistia.app/api](https://alistia.app/api/)**.

## Development

```bash
npm install
npm run build   # tsc + copy icons/metadata into dist/
```

## License

[MIT](LICENSE)
