const axios = require("axios");
const express = require("express");
const fs = require("fs");

const app = express();

// 🔥 CONFIG
const WEBHOOK_URL = "https://discord.com/api/webhooks/1488493691323809893/aUZGEgko2nD0qp-orAWjWIr8jctoCCuy-K8Ob3aBo2Gi_CIH9GlMX6kOXJ1lZ4xAnxrZ"; // thêm webhook mới
const URL = "https://hanaminikata.com/status_trial_ugphone";
const FILE = "message.json";

const PORT = process.env.PORT || 3000;

// 📊 CACHE STATUS
let currentStatus = {
    sg: false,
    hk: false,
    jp: false,
    de: false,
    us: false,
    lastUpdate: null
};

let isChecking = false; // tránh chạy chồng

// 📥 load messageId
function loadMessageId() {
    if (fs.existsSync(FILE)) {
        return JSON.parse(fs.readFileSync(FILE)).id;
    }
    return null;
}

// 💾 save messageId
function saveMessageId(id) {
    fs.writeFileSync(FILE, JSON.stringify({ id }));
}

let messageId = loadMessageId();
const startTime = Date.now();

// ⏱ uptime giống ảnh
function getUptime() {
    const diff = Date.now() - startTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}:${m.toString().padStart(2, "0")}`;
}

// 🎨 embed
function buildEmbed() {
    const icon = (v) => v ? "🟢" : "🔴";

    return {
        embeds: [
            {
                title: "📱 Trạng thái UGPhone Trial 🏷️",
                color: 0x00bfff,
                description:
`🇸🇬 Singapore - ${icon(currentStatus.sg)}
🇭🇰 Hong Kong - ${icon(currentStatus.hk)}
🇯🇵 Japan - ${icon(currentStatus.jp)}
🇩🇪 Germany - ${icon(currentStatus.de)}
🇺🇸 America - ${icon(currentStatus.us)}

**Chú thích**
🟢 Còn máy
🔴 Hết máy

🕜 Uptime: ${getUptime()} ngày ${new Date().toLocaleDateString("vi-VN")}`,
                footer: { text: "Anya Blox Trái Cây" }
            }
        ]
    };
}

// 🔍 CHECK STATUS (tối ưu)
async function checkStatus() {
    if (isChecking) return; // tránh chạy chồng
    isChecking = true;

    try {
        const res = await axios.get(URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
            },
            timeout: 6000
        });

        const html = res.data;

        currentStatus = {
            sg: html.includes("Singapore") && html.includes("Available"),
            hk: html.includes("Hong Kong") && html.includes("Available"),
            jp: html.includes("Japan") && html.includes("Available"),
            de: html.includes("Germany") && html.includes("Available"),
            us: html.includes("America") && html.includes("Available"),
            lastUpdate: new Date().toISOString()
        };

        console.log("✔ Updated");
    } catch (err) {
        // bỏ spam 403
        if (err.response?.status !== 403) {
            console.log("❌ Lỗi:", err.message);
        } else {
            console.log("⚠️ 403 (bị chặn tạm)");
        }
    }

    isChecking = false;
}

// 📤 WEBHOOK
async function sendWebhook() {
    const data = buildEmbed();

    try {
        if (!messageId) {
            const res = await axios.post(WEBHOOK_URL + "?wait=true", data);
            messageId = res.data.id;
            saveMessageId(messageId);
        } else {
            await axios.patch(`${WEBHOOK_URL}/messages/${messageId}`, data);
        }
    } catch (err) {
        console.log("Webhook lỗi:", err.message);
    }
}

// 🔁 LOOP (random nhẹ để tránh block)
function startLoop() {
    async function run() {
        await checkStatus();
        await sendWebhook();

        // delay random 2 → 3 phút
        const delay = 120000 + Math.random() * 60000;
        setTimeout(run, delay);
    }

    run();
}

startLoop();

// 🌐 API (siêu nhanh)
app.get("/api/status", (req, res) => {
    res.set("Cache-Control", "public, max-age=3"); // cache nhẹ

    res.json({
        success: true,
        data: currentStatus
    });
});

// test
app.get("/", (req, res) => {
    res.send("API UGPhone đang chạy!");
});

app.listen(PORT, () => {
    console.log("Server chạy port " + PORT);
});
