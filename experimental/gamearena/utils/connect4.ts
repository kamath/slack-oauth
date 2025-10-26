// "use server";

// import { generateObject, LanguageModel } from "ai";
// import type { CoreMessage } from "ai";
// import type { Connect4Instruction } from "../types/connect4";

// async function getPlayerInstructions(
//   player: "yellow" | "red",
//   model: LanguageModel
// ): Promise<Connect4Instruction> {
//   const messages: CoreMessage[] = [
//     {
//       role: "user",
//       content: [
//         {
//           type: "text",
//           text: `You are an assistant helping the ${player} player playing connect 4.
// 		  First, start by describing the current state of the board, especially as it relates to ${player}'s strengths and weaknesses.
// 		  Then, reference the current state of the board to tell the ${player} player what move to make as clearly and concisely as possible.
// 			Column numbers are 1-indexed, so the first column is 1, the second is 2, etc.
// 			Reference the column as "the first column from the left" or "the second column from the right" etc.
// 			You can only make one move, you must also provide 2 alternative moves that you think are good.
// 			`,
//         },
//       ],
//     },
//   ];
//   const startTime = performance.now();
//   const { object: instruction, usage } = await generateObject({
//     model: model,
//     messages: messages,
//     schema: z.object({
//       analysis: z
//         .string()
//         .describe(
//           "A description of the current state of the board, especially as it relates to the ${player}'s strengths and weaknesses."
//         ),
//       bestMove: z
//         .string()
//         .describe("The best move to make, i.e. 'Make a move in column 1'"),
//       alternativeMoves: z
//         .array(z.string())
//         .describe(
//           "2 alternative moves that you think are good, i.e. 'Make a move in column 2' and 'Make a move in column 3'"
//         ),
//     }),
//   });
//   const endTime = performance.now();

//   return {
//     turn: player,
//     analysis: instruction.analysis,
//     bestMove: instruction.bestMove,
//     alternativeMoves: instruction.alternativeMoves,
//     llmTelemetry: {
//       totalInferenceMs: endTime - startTime,
//       promptTokens: usage.promptTokens ?? 0,
//       completionTokens: usage.completionTokens ?? 0,
//       totalTokens: usage.totalTokens ?? 0,
//     },
//   };
// }
