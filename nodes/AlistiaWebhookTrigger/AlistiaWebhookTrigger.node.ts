import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'node:crypto';

export class AlistiaWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Alistia Webhook Trigger',
		name: 'alistiaWebhookTrigger',
		icon: 'file:alistia.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow in real time when Alistia sends a webhook',
		defaults: { name: 'Alistia Webhook Trigger' },
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Copy the Production URL above into an Alistia webhook target (list → Webhooks). Events: entry.created / updated / deleted, form submissions.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Signing Secret',
				name: 'secret',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description:
					'Optional. The secret you set on the webhook in Alistia. When set, the x-alistia-signature (HMAC-SHA256) is verified and unsigned/forged requests are rejected.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const body = this.getBodyData() as IDataObject;
		const secret = (this.getNodeParameter('secret', '') as string).trim();

		if (secret) {
			const provided = String(headers['x-alistia-signature'] || '');
			// Prefer the raw body bytes; fall back to a re-serialisation.
			const raw =
				typeof (req as unknown as { rawBody?: Buffer }).rawBody !== 'undefined' &&
				(req as unknown as { rawBody?: Buffer }).rawBody
					? (req as unknown as { rawBody: Buffer }).rawBody.toString('utf8')
					: JSON.stringify(body);
			const expected = 'sha256=' + createHmac('sha256', secret).update(raw, 'utf8').digest('hex');

			const a = Buffer.from(expected);
			const b = Buffer.from(provided);
			const valid = a.length === b.length && timingSafeEqual(a, b);
			if (!valid) {
				const res = this.getResponseObject();
				res.status(401).send('invalid signature');
				return { noWebhookResponse: true };
			}
		}

		const item: IDataObject = { ...body, _event: headers['x-alistia-event'] ?? null };
		return { workflowData: [this.helpers.returnJsonArray([item])] };
	}
}
