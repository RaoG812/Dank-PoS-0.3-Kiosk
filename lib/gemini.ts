export async function generateStrainImage(strain: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Generate a beautiful closeup photo of ${strain} cannabis strain plant.`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) throw new Error('Failed to generate image');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
}

export async function generateConsultation(question: string, itemNames: string[]): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const prompt = `Available items: ${itemNames.join(', ')}. Question: ${question}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) throw new Error('Failed to generate answer');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
