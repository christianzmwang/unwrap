import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const defaultEndpoint = 'https://unwrap-hackathon-oct-20-resource.cognitiveservices.azure.com/';
const apiVersion = '2024-12-01-preview';
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5-mini';

let cachedClient: AzureOpenAI | null = null;

const getClient = () => {
  const apiKey = process.env.subscription_key;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT ?? defaultEndpoint;

  if (!apiKey) {
    throw new Error('Missing subscription key. Please add subscription_key to the environment.');
  }

  if (!cachedClient) {
    // Reuse the same Azure OpenAI client across requests to avoid unnecessary reinitialisation costs.
    cachedClient = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });
  }

  return cachedClient;
};

export async function POST(request: NextRequest) {
  let payload: { messages?: ChatMessage[] };

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const messages = payload.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages must be a non-empty array.' }, { status: 400 });
  }

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      messages,
      model: deployment,
    });

    const assistantReply = response.choices[0]?.message?.content?.trim();

    if (!assistantReply) {
      return NextResponse.json({ error: 'No response content returned from GPT.' }, { status: 502 });
    }

    return NextResponse.json({ reply: assistantReply });
  } catch (error) {
    console.error('Azure OpenAI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to reach GPT 5 mini. Please try again later.' },
      { status: 500 },
    );
  }
}
