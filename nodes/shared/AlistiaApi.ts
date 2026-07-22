import type { IExecuteFunctions, IPollFunctions, IDataObject } from 'n8n-workflow';

export interface AlistiaField {
	id: string;
	name: string;
	type: string;
}

export interface AlistiaEntry {
	id: string;
	values: IDataObject;
}

export interface AlistiaSnapshot {
	schemaVersion: number;
	source: string;
	share: IDataObject;
	list: IDataObject;
	view: IDataObject | null;
	fields: AlistiaField[];
	entries: AlistiaEntry[];
	pagination: IDataObject | null;
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

/**
 * Turns snapshot entries into n8n items. With `labelsAsKeys` the field labels
 * become the item keys (nice for mapping); otherwise the raw `{ id, values }`
 * shape (field-id keyed) is returned.
 */
export function entriesToItems(
	snapshot: AlistiaSnapshot,
	labelsAsKeys: boolean,
): IDataObject[] {
	const fields = Array.isArray(snapshot.fields) ? snapshot.fields : [];
	const idToName = new Map<string, string>();
	for (const field of fields) {
		idToName.set(field.id, field.name || field.id);
	}

	const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];
	return entries.map((entry) => {
		if (!labelsAsKeys) {
			return { id: entry.id, values: entry.values ?? {} };
		}
		const mapped: IDataObject = { id: entry.id };
		const values = entry.values ?? {};
		for (const [fieldId, value] of Object.entries(values)) {
			mapped[idToName.get(fieldId) ?? fieldId] = value as IDataObject[string];
		}
		return mapped;
	});
}
