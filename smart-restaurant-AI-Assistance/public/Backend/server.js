import express from "express";
import Dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

Dotenv.config();
const port = 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const publicDir = path.join(projectRoot, "public", "Frontend");
const assetDir = path.join(projectRoot, "public", "asset");

app.use(express.static(publicDir));
app.use('/asset', express.static(assetDir));
app.use(express.json());

const model = new ChatGoogleGenerativeAI({
    model: "models/gemini-2.5-flash",
    maxOutputTokens: 2048,
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
});

// Enhanced tool to support all quick-chips existing in the frontend
const getMenuTool = new DynamicStructuredTool({
    name: "getMenu",
    description: "Returns the final answer for today's menu categories, specials, wine, or dietary options. Use this tool to directly answer the user's menu questions.",
    schema: z.object({
        category: z.string().describe("Type of menu or information requested. Supported options: breakfast, lunch, dinner, wine, specials, dietary"),
    }),
    func: async ({ category }) => {
        const target = category.toLowerCase();
        const menus = {
            breakfast: "Aloo Paratha  ₹120\nPoha ₹100\nMasala Chai ₹60",
            lunch: "Paneer Butter Masala ₹280\nDal Fry ₹180\nJeera Rice ₹140\nRoti ₹40",
            dinner: "Veg Biryani ₹320\nRaita ₹80\nSalad ₹120\nGulab Jamun ₹90",
            wine: "Pinot Noir ₹2200\nChardonnay ₹1800\nProsecco ₹2400",
            specials: "✨ Today's Chef Specials:\n• Veg Biryani paired with Raita ₹320\n• Paneer Butter Masala ₹280",
            dietary: "🌱 Dietary Options:\nOur entire menu is 100% Vegetarian. Vegan-friendly items include Poha, Dal Fry, Jeera Rice, and Salad."
        };
        
        return menus[target] || "No Menu Found for that category. Please choose from breakfast, lunch, dinner, wine, specials, or dietary.";
    },
});

// Updated system prompt to guide the agent to match the frontend quick action clicks
const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a polished restaurant concierge assistant. Use the getMenu tool whenever the user asks about the menu, today's specials, wine pairings, or dietary/vegan options. Map general 'specials' requests to 'specials' and 'vegan' or 'dietary' questions to 'dietary'. Return the tool response directly without extra commentary."],
    ["human", "{input}"],
    ["ai", "{agent_scratchpad}"]
]);

const agent = await createToolCallingAgent({
    llm: model,
    tools: [getMenuTool],
    prompt,
});

const executor = await AgentExecutor.fromAgentAndTools({
    agent,
    tools: [getMenuTool],
    verbose: true,
    maxIterations: 1,
    returnIntermediateSteps: true
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    const userInput = req.body.input;
    console.log("userInput : ", userInput);

    try {
        const response = await executor.invoke({ input: userInput });
        console.log("Agent full Response : ", response);
        
        // FIX: Safely extract intermediate steps to avoid crashing on normal chit-chat phrases (e.g., "Hello")
        const data = response.intermediateSteps && response.intermediateSteps.length > 0
            ? response.intermediateSteps[0].observation
            : null;

        if (response.output && response.output !== 'Agent stopped due to max iterations.') {
            return res.json({ output: response.output });
        } else if (data !== null) {
            return res.json({ output: data });
        }
        
        // Fallback for general conversational responses when no tool is invoked
        res.json({ output: response.output || "I'm here to assist with your dining experience. How may I help you?" });
    } catch (err) {
        console.log("Error during agent execution: ", err);
        res.status(500).json({ output: "Sorry, Something went wrong. Please try again." });
    }
});

app.post('/api/generate-qr', async (req, res) => {
    try {
        const { orderData, name, orderId, sequence } = req.body;
        if (!orderData || !name || !orderId || !sequence) {
            return res.status(400).json({ error: 'Missing order data for QR generation.' });
        }

        const safeName = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'customer';
        const filename = `${safeName}_${orderId}_${sequence}.png`;
        const qrFolder = path.join(assetDir, 'qrcode');
        await fs.mkdir(qrFolder, { recursive: true });

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(orderData)}`;
        const response = await fetch(qrUrl);
        if (!response.ok) {
            throw new Error(`QR service returned ${response.status}`);
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const filePath = path.join(qrFolder, filename);
        await fs.writeFile(filePath, imageBuffer);

        res.json({ filename, url: `/asset/qrcode/${filename}` });
    } catch (error) {
        console.error('Error generating QR:', error);
        res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on local port http://localhost:${port}`);
});