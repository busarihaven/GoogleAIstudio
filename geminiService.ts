
import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function enhanceDialogueScript(rawScript: string, scriptType: 'hook' | 'summary'): Promise<string> {
  const isHook = scriptType === 'hook';

  // 150 words is approx 1 minute.
  // Hook Max 2 mins -> Max 300 words (Safe target: 250-280)
  // Summary Min 4 mins -> Target 600-800 words (Approx 4-6 mins)
  
  const typeSpecificInstructions = isHook 
    ? `
    **MODE: HOOK (VIRAL TEASER - MAX 2 MINUTES)**
    - **Objective:** CREATE ANTICIPATION via FACTUAL MYSTERY.
    - **Strategy (The Knowledge Gap):** Do not just make people angry; make them *curious* about a contradiction in the text.
    - **Structure:**
        1. **The Verified Jolt:** Start with the specific statistic or quote from the text that contradicts common narrative. *Must be a direct fact from the input.*
        2. **The Contradiction:** Point out the irony. "They claimed X, but this document says Y."
        3. **The Open Loop:** Tell the listener there is a specific explanation for this discrepancy, but do not give it yet. "I'm going to show you exactly why this happened in the full breakdown."
    - **Constraint:** Final script MUST be under 280 words.
    - **Tone:** Investigative, cynical, truth-seeking.
    - **Ending:** Use a "Bridge" to the full content. "You need to see the rest of these numbers."
    `
    : `
    **MODE: SUMMARY (DEEP DIVE - MINIMUM 4 MINUTES)**
    - **Objective:** SATISFACTION & CLARITY. Provide the context promised in the hook.
    - **Constraint:** Final script MUST be at least 600 words (Target 600-800 words).
    - **Editing:** EXPAND & ANALYZE. You must go deep.
        *   **Elaboration is key:** If the input text is short, you must fill the time by explaining the historical context, the economic implications, defining technical terms, and exploring potential future outcomes.
        *   **Do not fluff:** Every expanded sentence must add value or insight, not just repetition.
    - **Pacing:** Measured, analytical, cynical but authoritative.
    - **Structure:** 
        1.  **The Deep Dive:** Explain the "Why" behind the facts mentioned in the hook in exhaustive detail.
        2.  **Contextual Analysis:** Compare this event to similar historical events.
        3.  **Implications:** What does this mean for the average person?
    `;

  const prompt = `
    You are 'Enceladus', a news host with a **dry, sarcastic, and slightly cynical wit**.
    The input text below contains raw news. Convert this into a spoken **monologue** script.

    ${typeSpecificInstructions}

    **Critical Instructions:**
    1.  **Format:** Return ONLY the spoken text. Do not use "Enceladus:" prefixes or stage directions.
    2.  **Mid-Roll CTA:** You MUST include a Call to Action (Subscribe, Like, Comment, Share) **IN THE MIDDLE** of the script.
        *   *For Hook Mode:* Frame it as joining the investigation. "Subscribe to see what else we found."
    3.  **Strict Adherence to Context (Legal Safety):**
        *   **Do NOT lie.** Do not invent statistics, quotes, or events.
        *   **Do NOT exaggerate** emotions beyond what the facts support. If the news is dry, your cynicism should be about how boring/bureaucratic it is.
        *   **Contextual Riling:** Any "rage" or "emotion" must be derived *directly* from a contradiction explicitly present in the source text.
        *   *Example:* If the text says "Tax revenue up 5%, potholes remaining", the rage comes from that specific gap, not an invented corruption scandal.
    4.  **No Greetings:** Start immediately with the news. No "Hello" or "Welcome back."
    5.  **Strict Length Control:** You must respect the word count limits defined above. Cut content if necessary or expand if required.

    **Original News Input:**
    ${rawScript}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text || rawScript;
  } catch (error) {
    console.warn("Failed to enhance script, falling back to original:", error);
    return rawScript;
  }
}

export async function generateDialogueAudio(
  script: string, 
  voiceName: string, // Kept for signature compatibility
  scriptType: 'hook' | 'summary'
): Promise<{ audioData: string | null; enhancedScript: string }> {
  if (!script) {
    throw new Error("Script cannot be empty.");
  }
  
  // Step 1: Humanize the script into a monologue
  const enhancedScript = await enhanceDialogueScript(script, scriptType);

  // Step 2: Generate Audio using Single Speaker (Enceladus voice)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: enhancedScript }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Enceladus' } // Using 'Enceladus' voice as requested
          }
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      return { audioData: base64Audio, enhancedScript };
    } else {
      console.error("API response did not contain audio data.", response);
      return { audioData: null, enhancedScript };
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
