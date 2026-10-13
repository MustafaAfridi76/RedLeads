import { getAI, getGenerativeModel, GoogleAIBackend, type GenerationConfig, type GenerateContentRequest, type Part } from "firebase/ai";
import { app } from "./firebase";
import { requestWithModelFallback } from "./aiRetry";

const ai = getAI(app, { backend: new GoogleAIBackend() });
const primaryModel = import.meta.env.VITE_FIREBASE_AI_MODEL || "gemini-3.8-flash";
const modelNames = [...new Set([primaryModel, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"])];
let healthyModel: { name: string; until: number } | undefined;

export async function generateAIContent(
  request: GenerateContentRequest | string | Array<string | Part>,
  options: { generationConfig?: GenerationConfig; timeoutMs?: number; signal?: AbortSignal } = {},
) {
  const models = healthyModel && healthyModel.until > Date.now()
    ? [healthyModel.name, ...modelNames]
    : modelNames;
  const { result, model } = await requestWithModelFallback(models, (name, signal) => {
    const sdkModel = getGenerativeModel(ai, { model: name, generationConfig: options.generationConfig });
    return sdkModel.generateContent(request, { signal, timeout: options.timeoutMs || 25000 });
  }, { timeoutMs: options.timeoutMs || 25000, signal: options.signal });
  healthyModel = { name: model, until: Date.now() + 5 * 60 * 1000 };
  return result;
}
