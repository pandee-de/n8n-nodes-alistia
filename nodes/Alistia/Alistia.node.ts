import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { createEntry, deleteEntry, entriesToItems, fetchSnapshot, updateEntry } from '../shared/AlistiaApi';

export class Alistia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Alistia',
		name: 'alistia',
		icon: 'file:alistia.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read shared Alistia lists and views',
		defaults: { name: 'Alistia' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'alistiaDataLinkApi',
				required: true,
				displayOptions: { show: { operation: ['getMany', 'get'] } },
			},
			{
				name: 'alistiaWriteApi',
				required: true,
				displayOptions: { show: { operation: ['create', 'update', 'delete'] } },
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Entry', value: 'entry' },
					{ name: 'Shared View', value: 'view' },
				],
				default: 'entry',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['entry'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many entries',
						description: 'Get all entries of the shared list (read token)',
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create an entry',
						description: 'Create a new entry (write token)',
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update an entry',
						description: 'Update fields of an entry (write token)',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete an entry',
						description: 'Soft-delete an entry (write token)',
					},
				],
				default: 'getMany',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['view'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get the shared view',
						description: 'Get the full snapshot: list, fields and entries',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Field Labels as Keys',
				name: 'labelsAsKeys',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['entry'], operation: ['getMany'] } },
				description:
					'Whether to use human field labels as item keys. When off, items are the raw { id, values } shape keyed by field id.',
			},
			{
				displayName: 'Entry ID',
				name: 'entryId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['entry'], operation: ['update', 'delete'] } },
				description: 'The id of the entry to update or delete',
			},
			{
				displayName: 'Values (JSON)',
				name: 'values',
				type: 'json',
				default: '{}',
				displayOptions: { show: { resource: ['entry'], operation: ['create', 'update'] } },
				description:
					'Field values keyed by field id, e.g. { "field_title": "Book car" }. Field ids come from the read node (Get Many with labels off, or Shared View → Get).',
			},
			{
				displayName: 'Revision',
				name: 'revision',
				type: 'number',
				default: 0,
				displayOptions: { show: { resource: ['entry'], operation: ['update', 'delete'] } },
				description: 'Optional optimistic-concurrency check. 0 = skip. A mismatch returns 409.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Read operations: one shared list/view, read once.
		if (operation === 'getMany' || operation === 'get') {
			const snapshot = await fetchSnapshot(this);
			if (resource === 'view' && operation === 'get') {
				return [this.helpers.returnJsonArray([snapshot as unknown as IDataObject])];
			}
			const labelsAsKeys = this.getNodeParameter('labelsAsKeys', 0, true) as boolean;
			return [this.helpers.returnJsonArray(entriesToItems(snapshot, labelsAsKeys))];
		}

		// Write operations: run per input item so expressions work per item.
		const items = this.getInputData();
		const runs = Math.max(items.length, 1);
		const out: INodeExecutionData[] = [];

		const parseValues = (i: number): IDataObject => {
			let raw = this.getNodeParameter('values', i, {}) as unknown;
			if (typeof raw === 'string') {
				try {
					raw = JSON.parse(raw);
				} catch (_) {
					raw = {};
				}
			}
			return (raw && typeof raw === 'object' ? raw : {}) as IDataObject;
		};

		for (let i = 0; i < runs; i++) {
			let result: IDataObject;
			if (operation === 'create') {
				result = await createEntry(this, parseValues(i));
			} else if (operation === 'update') {
				const entryId = this.getNodeParameter('entryId', i) as string;
				const revision = this.getNodeParameter('revision', i, 0) as number;
				result = await updateEntry(this, entryId, parseValues(i), revision > 0 ? revision : undefined);
			} else {
				const entryId = this.getNodeParameter('entryId', i) as string;
				const revision = this.getNodeParameter('revision', i, 0) as number;
				result = await deleteEntry(this, entryId, revision > 0 ? revision : undefined);
			}
			out.push({ json: result, pairedItem: { item: i } });
		}
		return [out];
	}
}
