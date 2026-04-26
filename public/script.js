/**
 * script.js - Produktif AI: Asisten Produktivitas Pribadi
 */

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const submitButton = chatForm.querySelector('button[type="submit"]');
const suggestionsContainer = document.getElementById("suggestions");

// ============================================================
// PRODUCTIVITY STATE
// ============================================================

let conversationHistory = [];
let tasks = JSON.parse(localStorage.getItem("produktif_tasks")) || [];
let focusGoal = localStorage.getItem("produktif_focus");

if (
  !focusGoal ||
  focusGoal === "null" ||
  focusGoal === "undefined" ||
  focusGoal.trim() === ""
) {
  focusGoal = null;
}

const suggestionPrompts = [
  "Bantu saya prioritaskan tugas-tugas",
  "Apa yang harus saya fokus hari ini?",
  "Berikan tips manajemen waktu",
  "Pecahkan tugas besar saya",
  "Motivasi saya, saya mulai prokrastinasi! 💪",
];

/**
 * Clean markdown from response
 */
function cleanMarkdown(text) {
  if (!text) return "";
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  text = text.replace(/^\s*[*\-+]\s+/gm, "• ");
  text = text.replace(/\n\n+/g, "\n");
  return text.trim();
}

/**
 * Append message to chat
 */
function appendMessage(role, text, isThinking = false) {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = `message ${role}-message`;

  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";
  if (isThinking) messageBubble.classList.add("thinking");

  messageBubble.textContent = text;
  messageWrapper.appendChild(messageBubble);
  chatBox.appendChild(messageWrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  return messageBubble;
}

/**
 * Show suggestions
 */
function showSuggestions() {
  suggestionsContainer.innerHTML = "";
  suggestionPrompts.slice(0, 3).forEach((prompt) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = prompt;
    btn.onclick = () => {
      userInput.value = prompt;
      userInput.focus();
    };
    suggestionsContainer.appendChild(btn);
  });
}

/**
 * Update sidebar UI
 */
function updateUI() {
  document.getElementById("task-count").textContent = tasks.length;
  document.getElementById("focus-goal").textContent = focusGoal
    ? focusGoal.length > 20
      ? focusGoal.substring(0, 20) + "..."
      : focusGoal
    : "-";

  const tasksList = document.getElementById("tasks-list");
  tasksList.innerHTML = "";
  tasks.forEach((task, idx) => {
    const taskEl = document.createElement("div");
    taskEl.className = "task-item";
    taskEl.textContent = `${idx + 1}. ${task.substring(0, 25)}`;
    taskEl.onclick = () => {
      userInput.value = `Bagaimana cara mengerjakan: ${task}?`;
      userInput.focus();
    };
    tasksList.appendChild(taskEl);
  });

  localStorage.setItem("produktif_tasks", JSON.stringify(tasks));
  if (focusGoal) {
    localStorage.setItem("produktif_focus", focusGoal);
  } else {
    localStorage.removeItem("produktif_focus");
  }
}

/**
 * Handle modal actions
 */
function showModal(title, action) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalInput = document.getElementById("modal-input");
  const modalBtn = document.getElementById("modal-confirm");

  modalTitle.textContent = title;
  modalInput.value = "";
  modalInput.placeholder = "Ketik di sini...";
  modal.style.display = "block";

  const newBtn = modalBtn.cloneNode(true);
  modalBtn.parentNode.replaceChild(newBtn, modalBtn);

  newBtn.onclick = () => {
    const value = modalInput.value.trim();
    if (value) {
      if (action === "add-task") {
        tasks.push(value);
        appendMessage(
          "model",
          `✅ Tugas ditambahkan: "${value}"\n\nSekarang kamu punya ${tasks.length} tugas. Butuh bantuan untuk prioritaskan?`,
        );
      } else if (action === "set-focus") {
        focusGoal = value;
        appendMessage(
          "model",
          `🎯 Target fokus diset: "${value}"\n\nAyo kita capai target ini! Butuh tips untuk tetap fokus?`,
        );
      } else if (action === "daily-plan") {
        conversationHistory.push({
          role: "user",
          text: `Buatkan rencana harian. Tugas saya: ${tasks.join(", ")}. Target fokus: ${focusGoal}`,
        });
        sendMessage(
          `Buatkan schedule produktif dengan tugas-tugas: ${tasks.join(", ")}`,
        );
      }
      updateUI();
      modal.style.display = "none";
    }
  };
}

/**
 * Send message to AI
 */
async function sendMessage(text) {
  conversationHistory.push({ role: "user", text });
  const thinkingBubble = appendMessage("model", "⏳ Sedang berpikir...", true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation: conversationHistory }),
    });

    const data = await response.json();
    const aiResponse = data.result || data.response;

    if (aiResponse) {
      const cleaned = cleanMarkdown(aiResponse);
      thinkingBubble.textContent = cleaned;
      thinkingBubble.parentElement.classList.remove("thinking");
      conversationHistory.push({ role: "model", text: cleaned });
    } else {
      thinkingBubble.textContent = "Maaf, koneksi gagal";
      thinkingBubble.parentElement.classList.remove("thinking");
    }
  } catch (error) {
    thinkingBubble.textContent = "Maaf, koneksi gagal";
    thinkingBubble.parentElement.classList.remove("thinking");
  } finally {
    submitButton.disabled = false;
    userInput.focus();
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  submitButton.disabled = true;
  userInput.value = "";

  appendMessage("user", text);
  await sendMessage(text);
  suggestionsContainer.innerHTML = "";
});

document.getElementById("add-task-btn").addEventListener("click", () => {
  showModal("➕ Tambah Tugas Baru", "add-task");
});

document.getElementById("set-focus-btn").addEventListener("click", () => {
  showModal("🎯 Set Target Fokus", "set-focus");
});

document.getElementById("daily-plan-btn").addEventListener("click", () => {
  if (tasks.length === 0) {
    alert("Tambahkan tugas dulu ya!");
    return;
  }
  showModal("📅 Buat Rencana Harian", "daily-plan");
});

document.querySelector(".close").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

window.addEventListener("click", (event) => {
  const modal = document.getElementById("modal");
  if (event.target === modal) modal.style.display = "none";
});

// Initialize
window.addEventListener("load", () => {
  updateUI();
  showSuggestions();
  appendMessage(
    "model",
    "👋 Selamat datang di Produktif AI!\n\nSaya adalah asisten produktivitas pribadi Anda. Mari kita atur tugas dan capai target Anda hari ini!\n\n💡 Tips cepat:\n• Tambah tugas pakai tombol ➕\n• Set target fokus dengan 🎯\n• Tanya tips produktivitas & manajemen waktu ke saya",
  );
});
