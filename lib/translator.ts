/**
 * Free English to Kannada auto-translator utility
 * Uses free translation endpoints (MyMemory API) with clean fallback
 */
export async function translateToKannada(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  try {
    const encoded = encodeURIComponent(text.trim());
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|kn`
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        const result = data.responseData.translatedText;
        // Verify response is not an error quota message
        if (!result.includes('MYMEMORY WARNING')) {
          return result;
        }
      }
    }
  } catch (e) {
    console.warn('MyMemory translation error, trying fallback:', e);
  }

  // Secondary fallback: Free Google Translate single-shot endpoint
  try {
    const encoded = encodeURIComponent(text.trim());
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=kn&dt=t&q=${encoded}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((item: any) => item[0]).join('');
      }
    }
  } catch (err) {
    console.warn('Google Translate fallback error:', err);
  }

  return '';
}
