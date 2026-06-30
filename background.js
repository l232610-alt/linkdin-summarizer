// LinkedIn Post Summarizer - Background Service Worker
// Hybrid approach: Local model by default, Ollama if available

const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'llama2';

let ollamaAvailable = false;
let preprocessor = new LinkedInPreprocessor();

// Initialize preprocessor
setTimeout(() => {
  checkOllamaStatus();
}, 100);

// Check Ollama availability
setInterval(checkOllamaStatus, 30000);

async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { method: 'GET' });
    ollamaAvailable = response.ok;
  } catch (error) {
    ollamaAvailable = false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    summarizeText(request.text)
      .then(result => {
        sendResponse({ success: true, summary: result.summary, method: result.method });
      })
      .catch(error => {
        console.error('Summarization error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getStatus') {
    getStatus().then(status => {
      sendResponse(status);
    });
    return true;
  }
});

async function summarizeText(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('No text to summarize');
  }

  const prefs = await chrome.storage.local.get(['preferenceMode', 'ollamaModel']);
  const mode = prefs.preferenceMode || 'auto';
  const ollamaModel = prefs.ollamaModel || DEFAULT_OLLAMA_MODEL;

  const preprocessed = preprocessor.preprocess(text);

  if ((mode === 'ollama' || mode === 'auto') && ollamaAvailable) {
    try {
      const summary = await summarizeWithOllama(preprocessed, ollamaModel);
      return { summary, method: 'ollama' };
    } catch (error) {
      console.warn('Ollama failed, falling back to local:', error);
      if (mode === 'ollama') {
        throw error;
      }
    }
  }

  const summary = await summarizeWithLocal(preprocessed);
  return { summary, method: 'local' };
}

async function summarizeWithOllama(text, model) {
  const maxChars = 2000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  const prompt = `Summarize this LinkedIn post in 1-2 sentences. Be concise and capture the main idea:\n\n"${truncatedText}"\n\nSummary:`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    let summary = data.response.trim();
    summary = summary.replace(/^Summary:?\s*/i, '').trim();
    return summary;
  } catch (error) {
    throw new Error('Ollama unavailable: ' + error.message);
  }
}

async function summarizeWithLocal(text) {
  try {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length === 0) {
      return text.substring(0, 150);
    }

    if (sentences.length <= 2) {
      return sentences.join(' ').trim();
    }

    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = {};
    words.forEach(word => {
      word = word.replace(/[^a-z0-9]/g, '');
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const sentenceScores = sentences.map(sent => {
      let score = 0;
      const sentenceWords = sent.toLowerCase().split(/\s+/);
      sentenceWords.forEach(word => {
        word = word.replace(/[^a-z0-9]/g, '');
        score += wordFreq[word] || 0;
      });
      return { sentence: sent.trim(), score };
    });

    const numSentences = Math.max(1, Math.min(2, Math.ceil(sentences.length * 0.4)));
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
      .map(s => s.sentence)
      .join(' ');

    return topSentences.trim();
  } catch (error) {
    return text.substring(0, 200);
  }
}

async function getStatus() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    if (response.ok) {
      const data = await response.json();
      const models = data.models ? data.models.map(m => m.name) : [];
      return {
        ollamaRunning: true,
        models: models,
        localModelAvailable: true
      };
    }
  } catch (error) {
    // Ollama not available
  }

  return {
    ollamaRunning: false,
    models: [],
    localModelAvailable: true
  };
}
