// LinkedIn Text Preprocessor - Inlined for service worker compatibility
class LinkedInPreprocessor {
  constructor() {
    this.emojiMap = {
      '🚀': 'shipped',
      '📈': 'growth',
      '🔥': 'popular',
      '💡': 'idea',
      '💪': 'strong',
      '✅': 'success',
      '🎯': 'goal',
      '📊': 'data',
      '💼': 'business',
      '🤝': 'partnership',
      '🎉': 'celebration',
      '👏': 'great',
      '💻': 'technology',
      '📱': 'mobile',
      '🌟': 'star',
      '💰': 'money',
      '📚': 'learning',
      '🏆': 'winner',
      '⚡': 'fast',
      '❤️': 'love',
      '😂': '',
      '😍': '',
      '🔔': 'notification',
      '📢': 'announcement',
      '🎓': 'education',
      '🚗': 'car',
      '✈️': 'travel',
      '🏢': 'company'
    };

    this.slangMap = {
      'w/o': 'without',
      'w/': 'with',
      'thx': 'thanks',
      'ppl': 'people',
      'ur': 'your',
      'tbh': 'to be honest',
      'ngl': 'not gonna lie',
      'imo': 'in my opinion',
      'afaik': 'as far as i know',
      'btw': 'by the way',
      'fyi': 'for your information',
      'asap': 'as soon as possible',
      'ld': 'linked',
      'fr fr': 'for real',
      'fr': 'for real'
    };

    this.ctaPatterns = [
      /what[\s\w]*(?:do you think|your thoughts?|your take|your opinion|would you do|say)[\s\w]*\?/gi,
      /let me know[\s\w]*(?:what|thoughts|opinion|comments?)[\s\w]*below/gi,
      /share your[\s\w]*(?:thoughts?|experience|story)[\s\w]*below/gi,
      /drop a comment[\s\w]*(?:below|if|and)/gi,
      /hit me up[\s\w]*(?:below|in comments|if)/gi,
      /follow[\s\w]*(?:for more|and get)/gi,
      /subscribe[\s\w]*(?:for updates|to my)/gi,
      /like and share[\s\w]*(?:if|this)/gi,
      /retweet if[\s\w]*(?:you|agree)/gi,
      /tag someone[\s\w]*(?:who|that)/gi,
      /tag a friend[\s\w]*(?:who|that)/gi,
      /comment below[\s\w]*with/gi,
      /what's your[\s\w]*(?:take|story|thought|experience)[\s\w]*\?/gi
    ];
  }

  preprocess(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let cleaned = text;
    cleaned = this.expandEmojis(cleaned);
    cleaned = this.expandSlang(cleaned);
    cleaned = this.removeCTAs(cleaned);
    cleaned = this.handleHashtags(cleaned);
    cleaned = this.cleanFormatting(cleaned);
    cleaned = this.removeLinksAndMentions(cleaned);
    cleaned = this.normalizeWhitespace(cleaned);
    cleaned = this.removeNoisyLines(cleaned);

    return cleaned.trim();
  }

  expandEmojis(text) {
    let result = text;
    for (const [emoji, meaning] of Object.entries(this.emojiMap)) {
      if (meaning) {
        result = result.replaceAll(emoji, ` ${meaning} `);
      } else {
        result = result.replaceAll(emoji, ' ');
      }
    }
    result = result.replace(/[\p{Emoji}]/gu, ' ');
    return result;
  }

  expandSlang(text) {
    let result = text;
    for (const [slang, expansion] of Object.entries(this.slangMap)) {
      const regex = new RegExp(`\\b${slang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      result = result.replace(regex, expansion);
    }
    return result;
  }

  removeCTAs(text) {
    let result = text;
    for (const pattern of this.ctaPatterns) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  handleHashtags(text) {
    let result = text.replace(/#([\w]+)/g, '$1');
    return result;
  }

  cleanFormatting(text) {
    let result = text;
    result = result.replace(/([!?.]){3,}/g, '$1');
    result = result.replace(/-{3,}/g, '-');
    result = result.replace(/_{3,}/g, '_');
    result = result.replace(/\*{3,}/g, '');
    result = result.replace(/\.{3,}/g, '...');
    result = result.replace(/^[•\-*]\s+/gm, '');
    result = result.replace(/thanks? for (reading|sharing|your time|watching|listening)[.!]?/gi, '');
    return result;
  }

  removeLinksAndMentions(text) {
    let result = text;
    result = result.replace(/https?:\/\/[^\s]+/g, '');
    result = result.replace(/www\.[^\s]+/g, '');
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    result = result.replace(/@([a-zA-Z0-9_]+)/g, '$1');
    return result;
  }

  normalizeWhitespace(text) {
    let result = text;
    result = result.replace(/  +/g, ' ');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/\s+([.,!?])/g, '$1');
    result = result.replace(/([.,!?])([a-zA-Z])/g, '$1 $2');
    return result;
  }

  removeNoisyLines(text) {
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 3 || /^[0-9]+$/.test(trimmed) || /^(yes|no|ok|why|how|what|when|where|who)$/i.test(trimmed);
    });
    return filtered.join('\n');
  }
}

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { 
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
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
