import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js"
import {
	InvalidTokenError,
	ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js"
import type { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import type {
	OAuthClientInformationFull,
	OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js"
import type { OAuthProvider } from "@smithery/sdk/server/auth/oauth.js"
import type { Response } from "express"
import crypto from "node:crypto"
import { PasetoInvalid } from "paseto-ts/lib/errors"
import {
	decrypt as pasetoDecrypt,
	encrypt as pasetoEncrypt,
} from "paseto-ts/v4"
import { StatelessClientStore } from "./client.js"

interface SessionData {
	innerState?: string
	innerRedirectUri: string
	codeChallenge: string
	redirectUri: string
}

interface TokenPayload {
	slackToken: string
	clientId: string
}
interface AuthCodePayload {
	code: string
	sessionData: {
		codeChallenge: string
		redirectUri: string
	}
}
const TARGET_SCOPES = [
	"app_mentions:read",
	"channels:read",
	"channels:history",
	"groups:read",
	"groups:history",
	"im:read",
	"im:history",
	"mpim:read",
	"mpim:history",
	"chat:write",
	"chat:write.public",
	"reactions:write",
	"users:read",
	"users.profile:read",
]

if (!process.env.PASETO_SECRET) {
	throw new Error("PASETO_SECRET is not set")
}
if (!process.env.SLACK_CLIENT_ID) {
	throw new Error("SLACK_CLIENT_ID is not set")
}
if (!process.env.SLACK_CLIENT_SECRET) {
	throw new Error("SLACK_CLIENT_SECRET is not set")
}
export const PASETO_SECRET = process.env.PASETO_SECRET!
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!

export class SlackServerAuthProvider implements OAuthProvider {
	callbackPath = "/callback"

	private _clientsStore: OAuthRegisteredClientsStore =
		new StatelessClientStore()

	// Temporary session store to map state to session data
	private _sessionStore = new Map<string, SessionData>()

	get clientsStore(): OAuthRegisteredClientsStore {
		return this._clientsStore
	}

	async authorize(
		client: OAuthClientInformationFull,
		params: AuthorizationParams,
		res: Response,
	): Promise<void> {
		// Outer state
		const state = crypto.randomBytes(32).toString("hex")

		const host = res.req.get("host") || "localhost:8081"
		const protocol = host.startsWith("localhost") ? "http" : "https"
		const redirectUri = `${protocol}://${host}${this.callbackPath}`

		const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize")
		const authParams = new URLSearchParams({
			client_id: SLACK_CLIENT_ID,
			scope: TARGET_SCOPES.join(","),
			redirect_uri: redirectUri,
			state,
		})
		// Store session data
		this._sessionStore.set(state, {
			innerState: params.state,
			redirectUri: redirectUri,
			codeChallenge: params.codeChallenge,
			innerRedirectUri: params.redirectUri,
		})

		res.redirect(`${slackAuthUrl}?${authParams}`)
	}

	async challengeForAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
	): Promise<string> {
		// Look up pending entry for this auth code
		const {
			payload: { sessionData },
		} = pasetoDecrypt<AuthCodePayload>(PASETO_SECRET, authorizationCode, {
			validatePayload: false,
		})
		if (!sessionData) {
			throw new Error("Invalid authorization code")
		}

		if (!sessionData.codeChallenge)
			throw new Error("Invalid authorization code")
		return sessionData.codeChallenge
	}

	async exchangeAuthorizationCode(
		client: OAuthClientInformationFull,
		authorizationCode: string,
	): Promise<OAuthTokens> {
		const {
			payload: { code, sessionData },
		} = pasetoDecrypt<AuthCodePayload>(PASETO_SECRET, authorizationCode)

		const formData = new FormData()
		formData.append("code", code)
		formData.append("client_id", process.env.SLACK_CLIENT_ID!)
		formData.append("client_secret", process.env.SLACK_CLIENT_SECRET!)
		formData.append("redirect_uri", sessionData.redirectUri)

		const response = await fetch("https://slack.com/api/oauth.v2.access", {
			method: "POST",
			body: formData,
		})

		const data = await response.json()
		if (!data.ok) {
			console.error("Failed to exchange code with slack", data)
			throw new Error("Failed to exchange code")
		}

		// Build token payload
		const payload: TokenPayload = {
			slackToken: data.access_token,
			clientId: client.client_id,
		}

		// Encrypt with PASETO v4.local (adds iat & exp by default 1h)
		const mcpAccessToken = pasetoEncrypt(PASETO_SECRET, payload, {
			addExp: true,
		})

		if (!mcpAccessToken) {
			throw new Error("Invalid authorization code")
		}

		return {
			access_token: mcpAccessToken,
			token_type: "Bearer",
		}
	}

	/**
	 * Verifies that the MCP access token is genuine and belongs to the server.
	 * @param token
	 * @returns
	 */
	async verifyAccessToken(token: string): Promise<AuthInfo> {
		try {
			console.log("Verifying access token")
			const {
				payload: { slackToken, clientId, exp },
			} = pasetoDecrypt<TokenPayload>(PASETO_SECRET, token, {
				validatePayload: false,
			})

			console.log("Access token verified")

			return {
				token,
				clientId,
				scopes: TARGET_SCOPES,
				expiresAt: exp ? new Date(exp).getTime() : undefined,
				extra: { slackToken },
			}
		} catch (err) {
			if (err instanceof PasetoInvalid) {
				throw new InvalidTokenError("Invalid token")
			}
			console.error("Uncaught server error", err)
			throw err
		}
	}

	async exchangeRefreshToken(): Promise<OAuthTokens> {
		throw new ServerError("Refresh token exchange not implemented")
	}

	async handleOAuthCallback(code: string, state?: string) {
		if (!state) throw new Error("Invalid state parameter")

		const sessionData = this._sessionStore.get(state)
		if (!sessionData) {
			throw new Error("Invalid state parameter")
		}

		// Generate MCP auth code
		const mcpAuthCode = pasetoEncrypt(
			PASETO_SECRET,
			{
				code,
				sessionData: {
					codeChallenge: sessionData.codeChallenge,
					redirectUri: sessionData.redirectUri,
				},
			} satisfies AuthCodePayload,
			{ addExp: true },
		)

		// Clean up session data
		this._sessionStore.delete(state)

		// Append the state parameter to the redirect URL to preserve it
		const redirectUrl = new URL(sessionData.innerRedirectUri)
		if (sessionData.innerState)
			redirectUrl.searchParams.set("state", sessionData.innerState)
		redirectUrl.searchParams.set("code", mcpAuthCode)
		return redirectUrl
	}
}
