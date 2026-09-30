export interface VerifySignResponse {
  recognized_sign: string;
  meaning: string;
  confidence: number;
  is_valid_sign: boolean;
  agreement: boolean;
  explanation: string;
}

export interface ExplainSignResponse {
  word: string;
  sign_system: string;
  hand_shape: string;
  position: string;
  movement: string;
  tips: string;
  steps: string[];
}

export interface TranslateSentenceResponse {
  raw_sentence: string;
  translated_sentence: string;
  grammar_notes: string;
}

class GeminiService {
  private activeAbortController: AbortController | null = null;

  /**
   * Compresses / resizes image to optimal size before transmission (under 640px)
   */
  public async resizeImageForUpload(dataUrl: string, maxDim = 640): Promise<string> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(dataUrl);

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /**
   * Verify an uncertain local prediction via Gemini Vision
   */
  public async verifyCandidate(
    imageBase64: string,
    candidateSign: string
  ): Promise<VerifySignResponse | null> {
    // Abort previous verification if still in flight
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.activeAbortController = new AbortController();
    const { signal } = this.activeAbortController;

    try {
      const resized = await this.resizeImageForUpload(imageBase64, 512);

      const res = await fetch('/api/verify-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: resized, candidateSign }),
        signal,
      });

      if (!res.ok) {
        console.warn('Verify sign endpoint returned non-200:', res.status);
        return null;
      }

      return await res.json();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Gemini verification error:', err);
      }
      return null;
    } finally {
      this.activeAbortController = null;
    }
  }

  /**
   * Explain sign instructional guide
   */
  public async explainSign(word: string): Promise<ExplainSignResponse> {
    const res = await fetch('/api/explain-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    });

    if (!res.ok) {
      throw new Error(`Failed to explain sign for "${word}"`);
    }

    return await res.json();
  }

  /**
   * Translate sign sequence to polished English
   */
  public async translateSentence(signs: string[]): Promise<TranslateSentenceResponse> {
    const res = await fetch('/api/translate-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signs }),
    });

    if (!res.ok) {
      throw new Error('Failed to translate sentence');
    }

    return await res.json();
  }

  /**
   * Full image recognition fallback
   */
  public async recognizeSign(imageBase64: string): Promise<any> {
    const resized = await this.resizeImageForUpload(imageBase64, 640);
    const res = await fetch('/api/recognize-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: resized }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned ${res.status}`);
    }

    return await res.json();
  }
}

export const geminiService = new GeminiService();
