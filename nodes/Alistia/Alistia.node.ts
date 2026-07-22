import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { entriesToItems, fetchSnapshot } from '../shared/AlistiaApi';

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
		credentials: [{ name: 'alistiaDataLinkApi', required: true }],
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
						description: 'Get all entries of the shared list',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// One credential = one shared list/view, so we read once regardless of
		// how many input items arrive.
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const snapshot = await fetchSnapshot(this);

		if (resource === 'view' && operation === 'get') {
			return [this.helpers.returnJsonArray([snapshot as unknown as IDataObject])];
		}

		const labelsAsKeys = this.getNodeParameter('labelsAsKeys', 0, true) as boolean;
		return [this.helpers.returnJsonArray(entriesToItems(snapshot, labelsAsKeys))];
	}
}
