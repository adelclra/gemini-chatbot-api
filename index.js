import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const GEMINI_MODEL = "gemini-2.5-flash";
// const GEMINI_MODEL = 'gemini-2.5-flash-lite';
// const GEMINI_MODEL = 'gemini-2.0-flash';

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.post("/api/chat", async (req, res) => {
  const { conversation } = req.body;
  console.log("📨 Received chat request:", JSON.stringify(conversation));

  try {
    if (!Array.isArray(conversation))
      throw new Error("Conversation must be an array of messages");

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    console.log("🔄 Sending to Gemini API...");
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        top_k: 30,
        systemInstruction:
          "Anda adalah 'Produktif AI', personal productivity assistant yang membantu user mengelola waktu, tugas, dan goals mereka. Gaya: santai-profesional, mendorong, praktis. Bahasa: Indonesia natural. KEAHLIAN: time management, task prioritization, goal setting, motivation, productivity tips, habit building. PENTING: Dengarkan kebutuhan user, berikan action steps konkret, gunakan emoji, ingatkan deadline jika relevan, tawarkan breakdown untuk tugas kompleks, sesekali motivasi dengan power statement singkat.",
      },
    });

    console.log("✅ Got response:", response.text);
    res.json({ result: response.text });
  } catch (e) {
    console.error("❌ Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});
