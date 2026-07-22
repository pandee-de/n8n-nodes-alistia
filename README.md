# n8n-nodes-alistia

n8n community node for [Alistia](https://alistia.app) — read shared lists and
views (public share **Data Links**) as clean JSON.

Alistia users can publish a list as a public share and enable a JSON data link.
This package lets an n8n workflow **read** that data, **write** entries back, and
react to changes in **real time** — for dashboards, Home Assistant,
notifications or any automation.

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

## Credential — Alistia Write API

For **writing** entries, create an **Alistia Write API** credential:

| Field | Description |
| --- | --- |
| **Base URL** | `https://write.alistia.app` (change only for self-hosting). |
| **Write Token** | A write token from the Alistia app (list → **Write-API**). |

A write token is scoped to one list and to the operations you allow (create /
update / delete). It is sent as `Authorization: Bearer …`.

## Nodes

### Alistia

Read and write a list.

- **Entry → Get Many** (read) — every entry as items. With *Field Labels as
  Keys* (default), keys are the field labels; off gives the raw
  `{ id, values }` shape keyed by field id.
- **Shared View → Get** (read) — the full snapshot (list, fields, entries).
- **Entry → Create** (write) — create an entry from a `{ fieldId: value }` JSON
  map. Runs per input item.
- **Entry → Update** (write) — update fields of an entry by id; optional
  *Revision* for optimistic concurrency (a mismatch returns `409`).
- **Entry → Delete** (write) — soft-delete an entry by id.

Read operations use the *Data Link API* credential; write operations use the
*Write API* credential — the node asks for the right one per operation.

### Alistia Trigger (polling)

Polls the shared list on a schedule.

- **New Entry** — emits each entry that newly appears (deduplicated by id).
- **Any Change** — emits all entries whenever the snapshot changes.

### Alistia Webhook Trigger (real-time)

A webhook receiver. Copy its **Production URL** into an Alistia webhook target
(list → **Webhooks**). Alistia then pushes `entry.created` / `entry.updated` /
`entry.deleted` (and form submissions) as they happen. Set the optional
**Signing Secret** to verify the `x-alistia-signature` HMAC and reject forged
requests. The event name is available on the output as `_event`.

## Example

`Alistia Webhook Trigger` → `IF` → `Slack`: post a message the moment a new
item appears in a shared list. Or `Schedule` → `Alistia (Entry → Create)` to
push rows from a spreadsheet into a list.

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
