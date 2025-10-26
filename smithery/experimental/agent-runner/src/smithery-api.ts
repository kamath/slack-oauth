import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ServerInfo } from "./types";
import {
  experimental_createMCPClient as createMCPClient,
} from '@ai-sdk/mcp';

export async function getServersInProfile(profileId: string, apiKey: string) {
  const url = `https://registry.smithery.ai/servers?profile=${profileId}`;
  const options = {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: undefined
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
    return data as ServerInfo[]
  } catch (error) {
    console.error(error);
  }
}

export async function connectToSmitheryServer(qualifiedName: string, apiKey: string, profileId: string) {
  // Construct server URL with authentication
  const url = new URL("https://server.smithery.ai/" + qualifiedName.replace("@", "") + "/mcp")
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("profile_id", profileId)

  const client = await createMCPClient({
    transport: {
      type: 'http',
      url: url.toString(),
    },
  });

  return client
}
