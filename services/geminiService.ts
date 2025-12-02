import { GoogleGenAI, Type } from "@google/genai";

// Ensure we have the API Key
const apiKey = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey });

export const checkVeoKey = async () => {
  // @ts-ignore
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
     // @ts-ignore
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
     }
  }
};

/**
 * Chat with Grounding (Search and Maps)
 */
export const sendChatMessage = async (message: string, history: any[] = []) => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        systemInstruction: "Eres un asistente experto agrícola para Agro Comice Ltda. Respondes en español. Usas herramientas de búsqueda y mapas para dar información precisa sobre clima, plagas, y ubicaciones.",
      },
      history: history
    });

    const response = await chat.sendMessage({ message });
    return {
      text: response.text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

/**
 * Generate Image (Nano Banana Pro)
 */
export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K') => {
  try {
    // Check key for high-value models if strictly required by environment context, 
    // mostly relevant for Veo but good practice for Pro Image if using separate billing.
    await checkVeoKey();

    // Re-init with potentially updated key context if needed, though mostly automatic in this env.
    const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await freshAi.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: "16:9" // Landscape for agricultural views
        }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

/**
 * Edit Image (Nano Banana / Flash Image)
 */
export const editImage = async (base64Image: string, prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/png', // Assuming PNG or standard image
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image returned");
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

/**
 * Generate Video (Veo)
 */
export const generateVideo = async (prompt: string, base64Image?: string) => {
  try {
    // Veo requires explicit key selection in some environments
    await checkVeoKey();
    
    const freshAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contentsParams: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    if (base64Image) {
      contentsParams.image = {
        imageBytes: base64Image,
        mimeType: 'image/png'
      };
    }

    let operation = await freshAi.models.generateVideos(contentsParams);

    // Polling
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await freshAi.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    // Fetch the actual video blob
    const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video Gen Error:", error);
    throw error;
  }
};
