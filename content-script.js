// LinkedIn Post Summarizer - Content Script
// Injects summarize button into LinkedIn posts

const BUTTON_ID = 'linkedin-summarizer-btn';

function addSummarizeButton(postElement) {
  if (postElement.querySelector(`#${BUTTON_ID}`)) {
    return;
  }

  const postText = extractPostText(postElement);
  if (!postText || postText.trim().length < 20) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'linkedin-summarizer-container';

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.className = 'linkedin-summarizer-btn';
  button.textContent = '✨ Summarize';
  button.title = 'Summarize this post with AI';
  button.setAttribute('data-post-text', postText);

  button.addEventListener('click', () => handleSummarizeClick(button, postText));
  buttonContainer.appendChild(button);

  const actionBar = postElement.querySelector('[class*="social-details-social-counts"]')?.parentElement ||
                    postElement.querySelector('[role="toolbar"]') ||
                    postElement.querySelector('footer');

  if (actionBar) {
    actionBar.insertBefore(buttonContainer, actionBar.firstChild);
  } else {
    postElement.appendChild(buttonContainer);
  }
}

function extractPostText(postElement) {
  const contentSelectors = [
    '[data-feed-item-id] [class*="feed-item-text"]',
    '[role="article"] [class*="text-body"]',
    '[class*="feed-item"] p',
    'span[dir="ltr"]'
  ];

  let text = '';
  for (const selector of contentSelectors) {
    const elements = postElement.querySelectorAll(selector);
    if (elements.length > 0) {
      text = Array.from(elements)
        .map(el => el.textContent)
        .join(' ')
        .trim();
      if (text.length > 20) break;
    }
  }

  return text;
}

async function handleSummarizeClick(button, postText) {
  const originalText = button.textContent;
  button.textContent = '⏳ Summarizing...';
  button.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'summarize',
      text: postText
    });

    if (!response) {
      throw new Error('No response from background script');
    }

    if (response.success) {
      showSummaryPopup(response.summary, postText, response.method);
    } else {
      alert('Error: ' + (response.error || 'Failed to summarize'));
    }
  } catch (error) {
    console.error('Summarization error:', error);
    alert('Error: ' + (error.message || 'An error occurred'));
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

function showSummaryPopup(summary, originalText, method) {
  const popup = document.createElement('div');
  popup.className = 'linkedin-summarizer-popup';
  
  const methodBadge = method === 'ollama' ? '🚀 Ollama' : '💻 Local AI';
  
  popup.innerHTML = `
    <div class="popup-header">
      <div class="popup-title">
        <h3>📋 Summary</h3>
        <span class="method-badge">${methodBadge}</span>
      </div>
      <button class="close-btn">✕</button>
    </div>
    <div class="popup-content">
      <div class="summary-text">${escapeHtml(summary)}</div>
      <details class="original-text">
        <summary>📝 Show original post</summary>
        <p>${escapeHtml(originalText)}</p>
      </details>
    </div>
    <div class="popup-footer">
      <button class="copy-btn">📋 Copy Summary</button>
    </div>
  `;

  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
  });

  popup.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(summary).catch(error => {
      console.error('Copy failed:', error);
      alert('Failed to copy summary');
    });
    const btn = popup.querySelector('.copy-btn');
    const originalBtn = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = originalBtn;
    }, 2000);
  });

  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

  document.body.appendChild(popup);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function observeNewPosts() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute('data-feed-item-id') || node.querySelector('[data-feed-item-id]')) {
              const posts = node.getAttribute('data-feed-item-id') ? [node] : node.querySelectorAll('[data-feed-item-id]');
              posts.forEach(post => addSummarizeButton(post));
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const posts = document.querySelectorAll('[data-feed-item-id]');
    posts.forEach(post => addSummarizeButton(post));
    observeNewPosts();
  });
} else {
  const posts = document.querySelectorAll('[data-feed-item-id]');
  posts.forEach(post => addSummarizeButton(post));
  observeNewPosts();
}
