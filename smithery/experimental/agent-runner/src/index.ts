import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { connectToSmitheryServer, getServersInProfile } from "./smithery-api"
import dotenv from "dotenv"
import { generateText, stepCountIs } from "ai"

dotenv.config()

// Optional: If you have user-level config, define it here
export const configSchema = z.object({
  profileId: z.string().default(process.env.SMITHERY_PROFILE_ID || ""),
  apiKey: z.string().default(process.env.SMITHERY_API_KEY || "")
})

export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema> // your server configuration
}) {
  const server = new McpServer({
    name: "Agent Runner",
    version: "1.0.0",
  })

  // Add a tool
  server.registerTool(
    "get_tools",
    {
      title: "Get Tools",
      description: "List the tools in the Smithery profile",
      inputSchema: {},
    },
    async () => {
      const servers = await getServersInProfile(config.profileId, config.apiKey)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(servers, null, 2),
          }
        ],
      }
    },
  )

  server.registerTool(
    "run_prompt",
    {
      title: "Run Prompt",
      description: "Run an agent with the specified MCP servers in the user's profile",
      inputSchema: {
        prompt: z.string().describe("The prompt that the user wants to execute"),
        qualifiedNames: z.string().array().describe("An array of qualified names from the servers available to the user. Include the relevant servers here. To get the servers available, call the get_tools tool")
      }
    },
    async ({ qualifiedNames, prompt }) => {
      const clients = await Promise.all(qualifiedNames.map(async qualifiedName => {
        const client = await connectToSmitheryServer(qualifiedName, config.apiKey, config.profileId)
        return client
      }))
      const toolSets = await Promise.all(clients.map(async client => client.tools()))
      const tools = toolSets.reduce((acc, toolSet) => ({ ...acc, ...toolSet }), {})
      const answer = await generateText({
        model: "anthropic/claude-haiku-4.5",
        prompt,
        tools,
        stopWhen: stepCountIs(100),
      })
      return {
        content: [
          {
            type: "text",
            text: answer.text
          }
        ]
      }
    }
  )

  return server.server
}
