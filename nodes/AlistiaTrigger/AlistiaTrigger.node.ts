import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

import { entriesToItems, fetchSnapshot } from '../shared/AlistiaApi';

export class AlistiaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Alistia Trigger',
		name: 'alistiaTrigger',
		icon: 'file:alistia.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when a shared Alistia list changes',
		defaults: { name: 'Alistia Trigger' },
		polling: true,
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'alistiaDataLinkApi', required: true }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'New Entry',
						value: 'newEntry',
						description: 'Emit each entry that newly appears in the shared list',
					},
					{
						name: 'Any Change',
						value: 'anyChange',
						description: 'Emit all entries whenever the shared snapshot changes',
					},
				],
				default: 'newEntry',
			},
			{
				displayName: 'Field Labels as Keys',
				name: 'labelsAsKeys',
				type: 'boolean',
				default: true,
				description:
					'Whether to use human field labels as item keys. When off, items are the raw { id, values } shape keyed by field id.',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event', 'newEntry') as string;
		const labelsAsKeys = this.getNodeParameter('labelsAsKeys', true) as boolean;
		const staticData = this.getWorkflowStaticData('node');
		const manualMode = this.getMode() === 'manual';

		const snapshot = await fetchSnapshot(this);
		const rows = entriesToItems(snapshot, labelsAsKeys);

		if (event === 'newEntry') {
			const ids = (snapshot.entries ?? []).map((entry) => entry.id);

			if (manualMode) {
				return rows.length ? [this.helpers.returnJsonArray(rows)] : null;
			}

			const seen = staticData.seenIds as string[] | undefined;
			staticData.seenIds = ids;
			if (seen === undefined) return null; // Seed on first scheduled run.

			const seenSet = new Set(seen);
			const fresh = rows.filter((row) => !seenSet.has(String((row as IDataObject).id)));
			return fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
		}

		// anyChange
		const share = (snapshot.share ?? {}) as IDataObject;
		const stamp = String(share.sourceUpdatedAt ?? share.generatedAt ?? '');

		if (manualMode) {
			return rows.length ? [this.helpers.returnJsonArray(rows)] : null;
		}

		const last = staticData.lastStamp as string | undefined;
		staticData.lastStamp = stamp;
		if (last === undefined) return null; // Seed on first scheduled run.

		return stamp && stamp !== last ? [this.helpers.returnJsonArray(rows)] : null;
	}
}
