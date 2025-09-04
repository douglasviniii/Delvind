
'use server';
/**
 * @fileOverview A simple chat AI flow.
 *
 * - chat - A function that handles the chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '../genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe('The user\'s message.'),
  isLoggedIn: z.boolean().describe('Whether the user is logged in or not.'),
  userName: z.string().optional().describe('The name of the logged in user.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe("The AI's response."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  prompt: `You are Delvi, a friendly and helpful customer support assistant for Delvind, a digital solutions company.

  Your first goal is to qualify the user. 
  
  - If the user is logged in (isLoggedIn is true), greet them by their name (userName) and ask how you can help them.
  - If the user is NOT logged in (isLoggedIn is false), your first priority is to ask for their name, email, and the subject of the matter before proceeding. Be polite and conversational.
  
  Once you have the necessary information, or if they were already logged in, address their message: {{{message}}}.
  
  Keep your responses concise and helpful. If you determine their issue requires a human, state that you will transfer them to a team member who can better assist.`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
