import { HfInference } from "@huggingface/inference";

/**
 * Hugging Face Inference Client
 *
 * Two models configured:
 * 1. CHAT_MODEL — conversational generation for the chatbots (RAG-powered)
 * 2. ANALYTICS_MODEL — business analytics & insight generation for predictions
 *
 * Both use the HF Inference API so no local GPU needed.
 * Set HF_TOKEN in your .env.local to authenticate.
 */

const HF_TOKEN = process.env.HF_TOKEN ?? "";

// Lazily created singleton client
let _client: HfInference | null = null;
function getClient(): HfInference {
  if (!_client) {
    _client = new HfInference(HF_TOKEN || undefined);
  }
  return _client;
}

// Model identifiers — swap these to upgrade later
export const CHAT_MODEL = "HuggingFaceH4/zephyr-7b-beta";
export const ANALYTICS_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

// Fallback flag: when HF_TOKEN is missing, use local statistical models only
export const isHFAvailable = () => !!HF_TOKEN;

/**
 * Generate a text completion from the chat model.
 * Uses the chatCompletion endpoint for instruction-tuned models.
 */
export async function chatGenerate(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512,
): Promise<string> {
  if (!isHFAvailable()) {
    throw new Error("HF_TOKEN not configured");
  }
  const client = getClient();
  const response = await client.chatCompletion({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    top_p: 0.9,
  });
  return response.choices?.[0]?.message?.content ?? "";
}

/**
 * Generate analytics insights from the analytics model.
 */
export async function analyticsGenerate(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 768,
): Promise<string> {
  if (!isHFAvailable()) {
    throw new Error("HF_TOKEN not configured");
  }
  const client = getClient();
  const response = await client.chatCompletion({
    model: ANALYTICS_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature: 0.4,
    top_p: 0.85,
  });
  return response.choices?.[0]?.message?.content ?? "";
}

export default getClient;
