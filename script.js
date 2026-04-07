/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* ——— Configuration ——— */
// For local development, set API_KEY in secrets.js
// For production, replace this URL with your Cloudflare Worker endpoint
const WORKER_URL = "https://loreal-chatbot.austinch20.workers.dev/"; // e.g. "https://loreal-chatbot.your-subdomain.workers.dev"

const SYSTEM_PROMPT = `You are L'Oréal's official Beauty Advisor chatbot. Your role is to help users discover and understand L'Oréal's extensive range of products across makeup, skincare, haircare, and fragrances. You can also provide personalized beauty routines and product recommendations.

Guidelines:
- Only answer questions related to L'Oréal products, beauty routines, skincare tips, haircare advice, makeup recommendations, and fragrance suggestions.
- If a user asks about something unrelated to L'Oréal or beauty topics, politely let them know you can only help with L'Oréal beauty-related questions, and suggest a beauty topic they could ask about instead.
- Be friendly, knowledgeable, and enthusiastic about beauty.
- When recommending products, mention specific L'Oréal brand names (e.g., L'Oréal Paris, Maybelline, Garnier, Lancôme, Kérastase, YSL Beauty, CeraVe, La Roche-Posay, etc.).
- If the user shares their name, remember it and use it naturally in conversation.
- Keep responses concise - aim for 2-4 short paragraphs max. Use bullet points for product lists.`;

/* ——— Conversation history (extra credit: multi-turn context) ——— */
const conversationHistory = [{ role: "system", content: SYSTEM_PROMPT }];

/* ——— Basic markdown to HTML ——— */
function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<strong>$1</strong>")
    .replace(/^## (.+)$/gm, "<strong>$1</strong>")
    .replace(/^# (.+)$/gm, "<strong>$1</strong>")
    .replace(/^[-•] (.+)$/gm, "&bull; $1")
    .replace(/^\d+\.\s(.+)$/gm, function (_, content) {
      return "&bull; " + content;
    })
    .replace(/\n/g, "<br>");
}

/* ——— Helper: create a message bubble ——— */
function addMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.classList.add("msg", sender);
  if (sender === "ai") {
    bubble.innerHTML = renderMarkdown(text);
  } else {
    bubble.textContent = text;
  }
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

/* ——— Show welcome message ——— */
addMessage(
  "Hello! I'm your L'Oréal Beauty Advisor. Ask me about skincare routines, makeup tips, haircare, fragrances, or any L'Oréal products!",
  "ai",
);

/* ——— Send message to OpenAI ——— */
async function getAIResponse(messages) {
  // Use Cloudflare Worker if configured, otherwise call OpenAI directly
  if (WORKER_URL) {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Direct OpenAI call (for local dev with secrets.js)
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      max_completion_tokens: 500,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

/* ——— Handle form submit ——— */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Display user message bubble
  addMessage(message, "user");

  // Add to conversation history
  conversationHistory.push({ role: "user", content: message });

  // Clear input
  userInput.value = "";

  // Show loading indicator
  const loadingBubble = addMessage("Thinking...", "ai");
  loadingBubble.classList.add("loading");

  try {
    const reply = await getAIResponse(conversationHistory);

    // Remove loading bubble and show real response
    loadingBubble.remove();
    addMessage(reply, "ai");

    // Save assistant reply to history
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    loadingBubble.remove();
    addMessage(
      "Sorry, something went wrong. Please try again in a moment.",
      "ai",
    );
  }
});
