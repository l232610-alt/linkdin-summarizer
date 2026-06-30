// LinkedIn Text Preprocessor
// Cleans and normalizes LinkedIn posts for better summarization

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
