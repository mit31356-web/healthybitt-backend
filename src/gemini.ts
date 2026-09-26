export interface IngredientAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodAnalysisResult {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  healthScore: number;
  ingredients: IngredientAnalysis[];
}

// ─── Mock data (offline / no-API fallback) ──────────────────────────────────

const MOCK_FOODS: Record<string, FoodAnalysisResult> = {
  burger: {
    foodName: "Double Patty Cheeseburger",
    calories: 850, protein: 45, carbs: 48, fats: 42, healthScore: 38,
    ingredients: [
      { name: "Double Beef Patty", calories: 440, protein: 32, carbs: 0, fats: 30 },
      { name: "Cheddar Cheese", calories: 110, protein: 7, carbs: 1, fats: 9 },
      { name: "Brioche Bun", calories: 220, protein: 6, carbs: 40, fats: 3 },
      { name: "Lettuce & Tomato", calories: 15, protein: 0, carbs: 3, fats: 0 },
      { name: "House Sauce", calories: 65, protein: 0, carbs: 4, fats: 0 }
    ]
  },
  salmon: {
    foodName: "Grilled Salmon with Veggies",
    calories: 672, protein: 52, carbs: 18, fats: 44, healthScore: 92,
    ingredients: [
      { name: "Salmon Fillet (200g)", calories: 416, protein: 40, carbs: 0, fats: 28 },
      { name: "Olive Oil (1 tbsp)", calories: 119, protein: 0, carbs: 0, fats: 14 },
      { name: "Mixed Vegetables", calories: 85, protein: 3, carbs: 14, fats: 1 },
      { name: "Lemon Herb Seasoning", calories: 52, protein: 9, carbs: 4, fats: 1 }
    ]
  },
  eggs: {
    foodName: "Avocado Toast & Eggs",
    calories: 422, protein: 20, carbs: 33, fats: 24, healthScore: 85,
    ingredients: [
      { name: "2 Large Eggs", calories: 140, protein: 12, carbs: 1, fats: 10 },
      { name: "Sourdough Bread (1 slice)", calories: 110, protein: 4, carbs: 22, fats: 1 },
      { name: "1/2 Avocado (Mashed)", calories: 160, protein: 2, carbs: 9, fats: 13 },
      { name: "Cherry Tomatoes", calories: 12, protein: 2, carbs: 1, fats: 0 }
    ]
  },
  coffee: {
    foodName: "Black Coffee",
    calories: 2, protein: 0, carbs: 1, fats: 0, healthScore: 98,
    ingredients: [{ name: "Espresso Shot", calories: 2, protein: 0, carbs: 1, fats: 0 }]
  },
  salad: {
    foodName: "Grilled Chicken Caesar Salad",
    calories: 480, protein: 36, carbs: 12, fats: 32, healthScore: 72,
    ingredients: [
      { name: "Chicken Breast (150g)", calories: 198, protein: 30, carbs: 0, fats: 6 },
      { name: "Romaine Lettuce (2 cups)", calories: 16, protein: 1, carbs: 3, fats: 0 },
      { name: "Parmesan Cheese (2 tbsp)", calories: 44, protein: 4, carbs: 0, fats: 3 },
      { name: "Caesar Dressing (2 tbsp)", calories: 170, protein: 1, carbs: 2, fats: 18 },
      { name: "Croutons", calories: 52, protein: 0, carbs: 7, fats: 5 }
    ]
  },
  pizza: {
    foodName: "Pepperoni Pizza Slice",
    calories: 310, protein: 13, carbs: 32, fats: 14, healthScore: 28,
    ingredients: [
      { name: "Pizza Crust", calories: 140, protein: 4, carbs: 26, fats: 2 },
      { name: "Mozzarella Cheese", calories: 85, protein: 6, carbs: 1, fats: 7 },
      { name: "Pepperoni", calories: 65, protein: 3, carbs: 0, fats: 5 },
      { name: "Pizza Sauce", calories: 20, protein: 0, carbs: 5, fats: 0 }
    ]
  }
};

// ─── JSON extraction (robust — handles markdown, trailing commas, etc.) ──────

function extractJson(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Find the outermost { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  // Remove trailing commas before ] or } (common Gemini mistake)
  text = text.replace(/,\s*([}\]])/g, '$1');

  return text;
}

function findMockMatch(query: string): FoodAnalysisResult | null {
  const q = query.toLowerCase();
  if (q.includes('burger') || q.includes('cheeseburger')) return MOCK_FOODS.burger;
  if (q.includes('salmon') || q.includes('fish')) return MOCK_FOODS.salmon;
  if (q.includes('egg') || q.includes('toast') || q.includes('avocado')) return MOCK_FOODS.eggs;
  if (q.includes('coffee') || q.includes('tea')) return MOCK_FOODS.coffee;
  if (q.includes('salad') || q.includes('caesar') || q.includes('lettuce')) return MOCK_FOODS.salad;
  if (q.includes('pizza') || q.includes('pepperoni')) return MOCK_FOODS.pizza;
  return null;
}

function generateRandomMock(query: string): FoodAnalysisResult {
  const calories = Math.floor(Math.random() * 400) + 150;
  const protein = Math.floor(calories * 0.05);
  const carbs = Math.floor(calories * 0.1);
  const fats = Math.floor(calories * 0.03);
  return {
    foodName: query || 'Assorted Meal',
    calories, protein, carbs, fats,
    healthScore: Math.floor(Math.random() * 50) + 45,
    ingredients: [
      { name: query || 'Main Dish', calories: Math.floor(calories * 0.8), protein: Math.floor(protein * 0.8), carbs: Math.floor(carbs * 0.8), fats: Math.floor(fats * 0.8) },
      { name: 'Seasonings & Oils', calories: Math.floor(calories * 0.2), protein: Math.floor(protein * 0.2), carbs: Math.floor(carbs * 0.2), fats: Math.floor(fats * 0.2) }
    ]
  };
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const TEXT_ANALYSIS_PROMPT = `You are an expert dietitian and nutritionist AI.
Analyze the food item described below and return a detailed, highly accurate nutritional breakdown.
Estimate realistic portion sizes (standard restaurant/home serving) if not specified.

Return ONLY a raw JSON object — no markdown, no explanation, no code fences:
{
  "foodName": "Descriptive meal name",
  "calories": <total integer>,
  "protein": <total grams integer>,
  "carbs": <total grams integer>,
  "fats": <total grams integer>,
  "healthScore": <1-100 integer based on nutritional quality>,
  "ingredients": [
    {
      "name": "Ingredient name with estimated quantity (e.g. Chicken Breast 150g)",
      "calories": <integer>,
      "protein": <integer>,
      "carbs": <integer>,
      "fats": <integer>
    }
  ]
}

SPEED REQUIREMENT: Keep JSON compact and process as fast as possible. Keep the foodName short and simple (under 5 words). Do not list more than 5 ingredients.

STRICT ACCURACY RULES:
- CALORIE-MACRO FORMULA: Total calories MUST equal (protein * 4) + (carbs * 4) + (fats * 9) within +/- 5 kcal. Do not violate this formula.
- INGREDIENT CONSISTENCY: Every ingredient's calories must also equal (protein * 4) + (carbs * 4) + (fats * 9) within +/- 5 kcal.
- The sum of ingredient calories/macros must equal the total calories/macros within a 5% margin.
- healthScore: 80-100 = very healthy, 60-79 = decent, 40-59 = moderate, 0-39 = unhealthy.
- List every component as a separate ingredient (include oils, dressings, and side sauces).
- Use standard USDA nutrition values as your reference.`;

const IMAGE_ANALYSIS_PROMPT = `You are an expert dietitian and food recognition AI with advanced computer vision capability.

TASK: Carefully examine the food photo provided and:
1. IDENTIFY every food item and component visible in the image.
2. ESTIMATE portion sizes based on visual cues (plate diameter ~25cm as reference, depth of food, density).
3. CALCULATE accurate macronutrients using standard USDA nutritional data.
4. LIST each component as a separate ingredient with its own breakdown.

Be SPECIFIC — do not give vague answers. If you see rice, estimate "Steamed White Rice (200g)". If you see chicken, identify the cooking method and estimate weight.

Return ONLY a raw JSON object — no markdown, no explanation, no preamble, no code fences. Start your response with { immediately:
{
  "foodName": "Specific descriptive name of what you see (e.g. Butter Chicken with Basmati Rice)",
  "calories": <total integer>,
  "protein": <total grams integer>,
  "carbs": <total grams integer>,
  "fats": <total grams integer>,
  "healthScore": <1-100 integer>,
  "ingredients": [
    {
      "name": "Ingredient with estimated weight/quantity (e.g. Butter Chicken Curry 180g)",
      "calories": <integer>,
      "protein": <integer>,
      "carbs": <integer>,
      "fats": <integer>
    }
  ]
}

SPEED REQUIREMENT: Keep JSON compact and process as fast as possible. Keep the foodName short and simple (under 5 words). Do not list more than 5 ingredients.

STRICT ACCURACY RULES:
- CALORIE-MACRO FORMULA: Total calories MUST equal (protein * 4) + (carbs * 4) + (fats * 9) within +/- 5 kcal. Do not violate this formula.
- INGREDIENT CONSISTENCY: Every ingredient's calories must also equal (protein * 4) + (carbs * 4) + (fats * 9) within +/- 5 kcal.
- The sum of ingredient calories/macros must equal the total calories/macros within a 5% margin.
- Identify cooking method (fried, grilled, steamed, etc.) — it affects calories significantly. Estimate hidden preparation fats (e.g. Butter/Oil used to sauté).
- If the image is blurry, contains partially eaten food, or only has a single ingredient, make your best educated guess.
- If there is NO food item visible in the image (such as if the camera is pointing at a wall, floor, furniture, laptop screen, keyboard, ceiling, person, or the view is blank/blocked), you MUST set "foodName" to "No food detected", and set calories, protein, carbs, fats, and healthScore to 0. Do NOT hallucinate or guess food in this case.
- healthScore: 80-100 = whole foods/very healthy, 60-79 = balanced, 40-59 = moderate, 0-39 = high fat/sugar/processed.
- Always include ALL visible components (sides, sauces, drinks, garnishes).`;

// ─── Supabase endpoint ────────────────────────────────────────────────────────

const PROXY_URL = 'https://oiuvwaoljbrnhcfxsblu.supabase.co/functions/v1/gemini-proxy';

// ─── Text analysis ────────────────────────────────────────────────────────────

export async function analyzeFoodText(text: string, _apiKey?: string): Promise<FoodAnalysisResult> {
  // Mock mode only when explicitly requested (apiKey param kept for backwards compat)
  if (_apiKey === 'MOCK_MODE') {
    await new Promise(r => setTimeout(r, 1000));
    return findMockMatch(text) || generateRandomMock(text);
  }
  // Always call the proxy — Gemini key is stored server-side in hb_secrets

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_text',
        payload: {
          model: 'gemma-4-31b',
          prompt: `${TEXT_ANALYSIS_PROMPT}\n\nFood to analyze: "${text}"`
        }
      })
    });

    const data = await response.json();

    if (response.status === 429 || data?.error === 'QUOTA_EXCEEDED') {
      throw new Error('quota_exceeded');
    }
    if (!response.ok) throw new Error(data?.message || `Proxy error ${response.status}`);
    if (data.error) throw new Error(data.message || data.error);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Empty response from Gemini');

    return JSON.parse(extractJson(raw)) as FoodAnalysisResult;
  } catch (err: any) {
    if (err.message === 'quota_exceeded') throw err; // propagate to UI
    console.warn('[analyzeFoodText] Falling back to mock:', err);
    return findMockMatch(text) || generateRandomMock(text);
  }
}

// ─── Image analysis ───────────────────────────────────────────────────────────

export async function analyzeFoodImage(
  base64Image: string,
  mimeType: string,
  _apiKey?: string
): Promise<FoodAnalysisResult> {
  // Mock mode only when explicitly requested
  if (_apiKey === 'MOCK_MODE') {
    await new Promise(r => setTimeout(r, 1500));
    const pool = [MOCK_FOODS.burger, MOCK_FOODS.salmon, MOCK_FOODS.eggs, MOCK_FOODS.salad];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return { ...picked, foodName: `${picked.foodName} (Scanned)` };
  }
  // Always call the proxy — Gemini Vision key is stored server-side in hb_secrets

  // Strip data URL prefix if present
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  // Detect actual mime type from data URL prefix when possible
  let detectedMime = mimeType;
  if (base64Image.startsWith('data:image/')) {
    detectedMime = base64Image.split(';')[0].replace('data:', '');
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_image',
        payload: {
          model: 'gemini-3.1-flash-lite',
          prompt: IMAGE_ANALYSIS_PROMPT,
          mimeType: detectedMime || 'image/jpeg',
          data: cleanBase64
        }
      })
    });

    const data = await response.json();

    // Handle quota exceeded — propagate so UI shows retry button
    if (response.status === 429 || data?.error === 'QUOTA_EXCEEDED') {
      throw new Error('quota_exceeded');
    }

    if (!response.ok) throw new Error(data?.message || `Proxy error ${response.status}`);
    if (data.error) throw new Error(data.message || data.error);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini returned no text content');

    const parsed = JSON.parse(extractJson(raw)) as FoodAnalysisResult;

    if (!parsed.foodName || typeof parsed.calories !== 'number') {
      throw new Error('Parsed result is incomplete');
    }

    return parsed;
  } catch (err: any) {
    console.error('[analyzeFoodImage] Error:', err.message);
    throw err;
  }
}

// ─── Diet plan generator ──────────────────────────────────────────────────────

export async function generateDietPlanAI(
  goal: string,
  dietType: string,
  targetCalories: number,
  _apiKey?: string
): Promise<any> {
  const prompt = `You are a certified fitness dietitian. Generate a detailed 1-day meal plan.
User goal: ${goal}
Diet type: ${dietType}
Target calories: ${targetCalories} kcal

Return ONLY raw JSON (no markdown, no fences):
{
  "breakfast": { "name": "Meal name", "calories": 500, "protein": 30, "carbs": 50, "fats": 15, "description": "2-sentence description of ingredients and why it fits the goal" },
  "lunch":     { "name": "Meal name", "calories": 600, "protein": 40, "carbs": 60, "fats": 20, "description": "..." },
  "dinner":    { "name": "Meal name", "calories": 600, "protein": 45, "carbs": 55, "fats": 18, "description": "..." },
  "snack":     { "name": "Meal name", "calories": 300, "protein": 15, "carbs": 35, "fats": 12, "description": "..." }
}

The four meals' calories must sum close to ${targetCalories}. Be specific with ingredients.`;

  // Mock mode only when explicitly requested
  if (_apiKey === 'MOCK_MODE') {
    await new Promise(r => setTimeout(r, 1500));
    const share = Math.floor(targetCalories / 4);
    return {
      breakfast: { name: `High Protein ${dietType} Breakfast`, calories: share + 50, protein: 25, carbs: 45, fats: 12, description: 'Oats with nuts and protein source' },
      lunch:     { name: `Balanced ${dietType} Lunch`, calories: share + 100, protein: 35, carbs: 55, fats: 15, description: 'Quinoa bowl with mixed greens and grilled protein' },
      dinner:    { name: `Clean ${dietType} Dinner`, calories: share - 50, protein: 40, carbs: 30, fats: 18, description: 'Stir-fried vegetables and lean protein' },
      snack:     { name: 'Fitness Fuel Snack', calories: share - 100, protein: 12, carbs: 20, fats: 8, description: 'Mixed berries and Greek yogurt or protein shake' }
    };
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_diet', payload: { model: 'gemma-4-31b', prompt } })
    });

    if (!response.ok) throw new Error(`Proxy ${response.status}`);

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(extractJson(raw || ''));
  } catch (err) {
    console.warn('[generateDietPlanAI] Falling back to mock:', err);
    const share = Math.floor(targetCalories / 4);
    return {
      breakfast: { name: 'High Protein Breakfast', calories: share + 50, protein: 25, carbs: 45, fats: 12, description: 'Oats with nuts and protein source' },
      lunch:     { name: 'Healthy Balanced Lunch', calories: share + 100, protein: 35, carbs: 55, fats: 15, description: 'Quinoa bowl with mixed greens and grilled proteins' },
      dinner:    { name: 'Light & Clean Dinner', calories: share - 50, protein: 40, carbs: 30, fats: 18, description: 'Stir-fried vegetables and lean protein' },
      snack:     { name: 'Fitness Fuel Snack', calories: share - 100, protein: 12, carbs: 20, fats: 8, description: 'Mixed berries and yogurt' }
    };
  }
}

// ─── Live food frame analysis ──────────────────────────────────────────────────

export async function analyzeLiveFoodFrame(
  base64Image: string,
  mimeType: string,
  _apiKey?: string
): Promise<FoodAnalysisResult> {
  // Mock mode only when explicitly requested
  if (_apiKey === 'MOCK_MODE') {
    await new Promise(r => setTimeout(r, 1200));
    const pool = [MOCK_FOODS.burger, MOCK_FOODS.salmon, MOCK_FOODS.eggs, MOCK_FOODS.salad];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return { ...picked, foodName: `${picked.foodName} (Live Scan)` };
  }

  // Strip data URL prefix if present
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  // Detect actual mime type from data URL prefix when possible
  let detectedMime = mimeType;
  if (base64Image.startsWith('data:image/')) {
    detectedMime = base64Image.split(';')[0].replace('data:', '');
  }

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_image',
        payload: {
          model: 'gemini-3-flash-live',
          prompt: IMAGE_ANALYSIS_PROMPT,
          mimeType: detectedMime || 'image/jpeg',
          data: cleanBase64
        }
      })
    });

    const data = await response.json();

    // Handle quota exceeded — propagate so UI shows retry button
    if (response.status === 429 || data?.error === 'QUOTA_EXCEEDED') {
      throw new Error('quota_exceeded');
    }

    if (!response.ok) throw new Error(data?.message || `Proxy error ${response.status}`);
    if (data.error) throw new Error(data.message || data.error);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('Gemini returned no text content');

    const parsed = JSON.parse(extractJson(raw)) as FoodAnalysisResult;

    if (!parsed.foodName || typeof parsed.calories !== 'number') {
      throw new Error('Parsed result is incomplete');
    }

    return parsed;
  } catch (err: any) {
    console.error('[analyzeLiveFoodFrame] Error:', err.message);
    throw err;
  }
}
