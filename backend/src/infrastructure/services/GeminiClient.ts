import { GoogleGenerativeAI } from '@google/generative-ai';
import { NewsArticle } from '../../domain/entities/NewsArticle';
import { IGeminiClient, GeminiAnalysisResult } from '../../application/interfaces/IGeminiClient';
import { z } from 'zod';

// Zod Schema to validate Gemini's response
const GeminiResponseSchema = z.object({
  skip: z.boolean().optional(),
  carbonIntensity: z.number().min(0).max(100).optional(),
  co2EquivalentKg: z.number().optional(),
  glacierMeltMm: z.number().optional(),
  forestImpactSqM: z.number().optional(),
  explanation: z.string().optional(),
  category: z.enum(['Energy', 'Transport', 'Industry', 'Agriculture', 'Deforestation', 'General']).optional(),
  simplifiedTitle: z.string().optional(),
  isGlobalEvent: z.boolean().optional(),
}).refine((data) => data.skip === true || (
  data.carbonIntensity !== undefined &&
  data.co2EquivalentKg !== undefined &&
  data.glacierMeltMm !== undefined &&
  data.forestImpactSqM !== undefined &&
  data.explanation !== undefined &&
  data.category !== undefined &&
  data.simplifiedTitle !== undefined &&
  data.isGlobalEvent !== undefined
), {
  message: "Response must contain either skip=true or all standard parameters."
});

export class GeminiClient implements IGeminiClient {
  private ai: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async analyzeArticle(article: NewsArticle): Promise<GeminiAnalysisResult> {
    const model = this.ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
You are an expert environmental data scientist analyzing a climate, energy, or environmental news article.
Analyze the following article details and estimate the ecological impact.

CRITICAL INSTRUCTION: If this article describes positive environmental news, clean energy initiatives, carbon offsets, green breakthroughs, or reforestation (i.e. anything where the carbon footprint is reduced or offset, meaning co2EquivalentKg would be <= 0), you MUST skip the full analysis to save resources. In this case, simply return the JSON object: {"skip": true}.

Otherwise (if it is a carbon-emitting, fossil-fuel dependent, or environmentally destructive event where co2EquivalentKg is > 0), provide a JSON object containing the following keys matching the specifications:
- carbonIntensity: A number between 0 and 100. Use 0 for clean energy and 100 for severe carbon emission disasters.
- co2EquivalentKg: An estimate of the carbon release represented in the news (MUST be a positive number > 0).
- glacierMeltMm: An estimate of equivalent glacier melt (in mm) simulated by this scale of carbon release (MUST be positive).
- forestImpactSqM: An estimate of equivalent forest area impact in square meters (MUST be negative).
- explanation: A clear 2-3 sentence summary of why you gave these scores.
- category: Exactly one of: "Energy", "Transport", "Industry", "Agriculture", "Deforestation", "General".
- simplifiedTitle: A very simple, layperson-friendly title that summarizes the core environmental event or impact described (must be under 15 words).
- isGlobalEvent: A boolean indicating if this article describes a major global or international event, or a national development with significant global implications.

Title: "${article.title}"
Description: "${article.description}"
Content: "${article.content || ''}"

Output JSON format ONLY. Do not write markdown blocks around it.
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsedJson = JSON.parse(text.trim());

      // Validate using Zod schema
      const validated = GeminiResponseSchema.parse(parsedJson);
      return validated;
    } catch (error) {
      console.error('Gemini API analysis failed or output was malformed:', error);
      throw new Error(`Gemini Analysis Error: ${(error as Error).message}`);
    }
  }
}
