import type { IExecuteFunctions, IPollFunctions, IDataObject } from 'n8n-workflow';

export interface AlistiaField {
	key: string;
	name: string;
	type: string;
}

export interface AlistiaEntry {
	id: string;
	values: IDataObject;
	group?: string;
}

export interface AlistiaSnapshot {
	list: IDataObject;
	generatedAt?: string;
	fields: AlistiaField[];
	entries: AlistiaEntry[];
}

type Ctx = IExecuteFunctions | IPollFunctions;

/** Fetches the cleaned JSON snapshot for the credential's share token. */
export async function fetchSnapshot(ctx: Ctx): Promise<AlistiaSnapshot> {
	const credentials = await ctx.getCredentials('alistiaDataLinkApi');
	const baseUrl = String(credentials.baseUrl || 'https://link.alistia.app').replace(/\/+$/, '');
	const token = String(credentials.token || '').trim();

	const snapshot = (await ctx.helpers.httpRequest({
		method: 'GET',
		url: `${baseUrl}/v1/views/${encodeURIComponent(token)}.json`,
		headers: { accept: 'application/json' },
		json: true,
	})) as AlistiaSnapshot;

	return snapshot;
}

async function writeRequest(
	ctx: IExecuteFunctions,
	method: 'POST' | 'PATCH' | 'DELETE',
	path: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await ctx.getCredentials('alistiaWriteApi');
	const baseUrl = String(credentials.baseUrl || 'https://write.alistia.app').replace(/\/+$/, '');
	const token = String(credentials.token || '').trim();

	return (await ctx.helpers.httpRequest({
		method,
		url: `${baseUrl}${path}`,
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json',
			accept: 'application/json',
		},
		body,
		json: true,
	})) as IDataObject;
}

/** Create one entry from a `{ fieldKey: value }` map (natural values; the API coerces). */
export function createEntry(ctx: IExecuteFunctions, values: IDataObject): Promise<IDataObject> {
	return writeRequest(ctx, 'POST', '/v1/entries', { values });
}

/** Update the given fields of an entry (optional revision for concurrency). */
export function updateEntry(
	ctx: IExecuteFunctions,
	entryId: string,
	values: IDataObject,
	revision?: number,
): Promise<IDataObject> {
	const body: IDataObject = { values };
	if (revision !== undefined && revision !== null) body.revision = revision;
	return writeRequest(ctx, 'PATCH', `/v1/entries/${encodeURIComponent(entryId)}`, body);
}

/** Soft-delete an entry (optional revision for concurrency). */
export function deleteEntry(
	ctx: IExecuteFunctions,
	entryId: string,
	revision?: number,
): Promise<IDataObject> {
	const q = revision !== undefined && revision !== null ? `?revision=${revision}` : '';
	return writeRequest(ctx, 'DELETE', `/v1/entries/${encodeURIComponent(entryId)}${q}`);
}

/**
 * Turns snapshot entries into n8n items. With `labelsAsKeys` the field labels
 * become the item keys (nice for mapping); otherwise the `{ id, values }`
 * shape (field-key keyed) is returned.
 */
export function entriesToItems(
	snapshot: AlistiaSnapshot,
	labelsAsKeys: boolean,
): IDataObject[] {
	const fields = Array.isArray(snapshot.fields) ? snapshot.fields : [];
	const keyToName = new Map<string, string>();
	for (const field of fields) {
		keyToName.set(field.key, field.name || field.key);
	}

	const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];
	return entries.map((entry) => {
		if (!labelsAsKeys) {
			return { id: entry.id, values: entry.values ?? {} };
		}
		const mapped: IDataObject = { id: entry.id };
		const values = entry.values ?? {};
		for (const [fieldKey, value] of Object.entries(values)) {
			mapped[keyToName.get(fieldKey) ?? fieldKey] = value as IDataObject[string];
		}
		return mapped;
	});
}
