import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"
import {
	decrypt as pasetoDecrypt,
	encrypt as pasetoEncrypt,
} from "paseto-ts/v4"
import { PASETO_SECRET } from "./provider.js"

// Stateless clients store implementation using PASETO tokens
export class StatelessClientStore implements OAuthRegisteredClientsStore {
	registerClient(
		client: OAuthClientInformationFull,
	): OAuthClientInformationFull {
		// Encode client information in a PASETO token as the client_id
		const clientId = pasetoEncrypt(PASETO_SECRET, client)
		// Override the client_id with the PASETO token
		return {
			...client,
			client_id: clientId,
		}
	}

	getClient(clientId: string): OAuthClientInformationFull | undefined {
		try {
			const { payload } = pasetoDecrypt<OAuthClientInformationFull>(
				PASETO_SECRET,
				clientId,
				{ validatePayload: false },
			)

			// Return the client data with the token as client_id
			return {
				...payload,
				client_id: clientId,
			}
		} catch (error) {
			// Invalid client_id token
			return undefined
		}
	}
}
