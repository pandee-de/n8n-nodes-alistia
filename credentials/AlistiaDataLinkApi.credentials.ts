import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AlistiaDataLinkApi implements ICredentialType {
	name = 'alistiaDataLinkApi';

	displayName = 'Alistia Data Link API';

	documentationUrl = 'https://alistia.app/api/';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://link.alistia.app',
			description: 'Public data domain of Alistia. Only change this for self-hosting.',
		},
		{
			displayName: 'Share Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'The public share token from the Alistia app (open a list → Public web list → enable the JSON data link). One credential maps to one shared list or view.',
		},
	];

	// Validates the token by fetching the JSON data link. A 403 "json_disabled"
	// here means the JSON data link still has to be enabled in the Alistia app.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '=/v1/views/{{$credentials.token}}.json',
		},
	};
}
