import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AlistiaWriteApi implements ICredentialType {
	name = 'alistiaWriteApi';

	displayName = 'Alistia Write API';

	documentationUrl = 'https://alistia.app/api/';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://write.alistia.app',
			description: 'Authenticated write domain of Alistia. Only change this for self-hosting.',
		},
		{
			displayName: 'Write Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'A write token created in the Alistia app (open a list → Write-API). Scoped to one list and to the create/update/delete operations you allowed. Sent as "Authorization: Bearer …".',
		},
	];

	// Reachability check. The token itself is validated on the first write.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '=/ping',
		},
	};
}
