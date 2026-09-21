import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();
    
    const requestedModel = model || "gemini-3.6-flash";
    const modelsToTry = [requestedModel];
    if (requestedModel !== "gemini-3.1-flash-lite") {
      modelsToTry.push("gemini-3.1-flash-lite");
    }
    
    let lastError: any = null;
    let response = null;
    
    for (const targetModel of modelsToTry) {
      // Try 1 time for the first model, and 2 times for the fallback model
      const attempts = targetModel === "gemini-3.1-flash-lite" ? 2 : 1;
      
      for (let i = 0; i < attempts; i++) {
        try {
          console.log(`Attempting content generation with model: ${targetModel} (attempt ${i + 1}/${attempts})`);
          response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
          });
          if (response && response.text) {
            console.log(`Successfully generated content with model: ${targetModel}`);
            return NextResponse.json({ text: response.text });
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Gemini attempt ${i + 1} with model ${targetModel} failed:`, err);
          
          const errStatus = err.status || (err.error?.code) || 0;
          const errMsg = err.message || "";
          
          // If it's a model not found error (404), do not retry the same model
          if (errStatus === 404 || errMsg.includes("not found") || errMsg.includes("NOT_FOUND")) {
            break;
          }
          
          if (i < attempts - 1) {
            await delay(1000 * (i + 1)); // Delay before retry
          }
        }
      }
    }
    
    throw lastError || new Error("Failed to generate content with any model");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content: " + error.message },
      { status: 503 }
    );
  }
}

