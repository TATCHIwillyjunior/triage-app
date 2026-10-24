import { GoogleGenAI } from "@google/genai";


export const llm = new GoogleGenAI({
  apiKey: process.env.LLM_API_KEY
}); 

// export const llm = new OpenAI({
//   apiKey: process.env.LLM_API_KEY,
//   baseURL: process.env.LLM_BASE_URL,
// });