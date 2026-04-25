const axios = require("axios");
const express = require("express");
const fs = require("fs");

const app = express();

// 🔥 CONFIG
const WEBHOOK_URL = "https://discord.com/api/webhooks/1488493691323809893/aUZGEgko2nD0qp-orAWjWIr8jctoCCuy-K8Ob3aBo2Gi_CIH9GlMX6kOXJ1lZ4xAnxrZ"; // ❗ ĐỪNG để webhook lộ như vừa rồi
const URL = "https://hanaminikata.com/status_trial_ugphone";
const FILE = "message.json";

const PORT = process.env.PORT || 3000;

// 📊 STATUS
let currentStatus = {
    sg: false,
    hk: false,
    jp: false,
    de: false,
    us: false,
    lastUpdate: null
};

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

// ⏱ uptime
function getUptime() {
    const diff = Date.now() - startTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
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
`🇸🇬 Singapore ${icon(currentStatus.sg)}
🇭🇰 Hong Kong ${icon(currentStatus.hk)}
🇯🇵 Japan ${icon(currentStatus.jp)}
🇩🇪 Germany ${icon(currentStatus.de)}
🇺🇸 America ${icon(currentStatus.us)}

**Chú thích**
🟢 Còn máy
🔴 Hết máy

🕜 Uptime: ${getUptime()}
📅 ${new Date().toLocaleDateString("vi-VN")}`,
                footer: { text: "Auto Up" }
            }
        ]
    };
}

// 🔍 CHECK STATUS (KHÔNG puppeteer)
async function checkStatus() {
    try {
        const res = await axios.get(URL, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            },
            timeout: 10000
        });

        const html = res.data;

        // ⚠️ logic đơn giản (có thể chỉnh sau)
        currentStatus = {
            sg: html.includes("Singapore"),
            hk: html.includes("Hong Kong"),
            jp: html.includes("Japan"),
            de: html.includes("Germany"),
            us: html.includes("America"),
            lastUpdate: new Date().toISOString()
        };

        console.log("Đã cập nhật status");
    } catch (err) {
        console.log("Lỗi check:", err.message);
    }
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

// 🔁 LOOP
async function loop() {
    await checkStatus();
    await sendWebhook();
}

// chạy mỗi 60s
setInterval(loop, 60000);
loop();

// 🌐 API
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        data: currentStatus
    });
});

// test route
app.get("/", (req, res) => {
    res.send("API UGPhone đang chạy!");
});

app.listen(PORT, () => {
    console.log("Server chạy port " + PORT);
});
