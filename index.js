const puppeteer = require("puppeteer");
const axios = require("axios");
const express = require("express");
const fs = require("fs");

const app = express();

// 🔥 CONFIG
const WEBHOOK_URL = "https://discord.com/api/webhooks/1488493691323809893/aUZGEgko2nD0qp-orAWjWIr8jctoCCuy-K8Ob3aBo2Gi_CIH9GlMX6kOXJ1lZ4xAnxrZ";
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

let messageId = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE)).id
    : null;

const startTime = Date.now();

// ⏱ uptime
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
                footer: { text: "Auto Up" }
            }
        ]
    };
}

// 🔍 CHECK STATUS THẬT
async function checkStatus() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 5000));

        const text = await page.evaluate(() => document.body.innerText);

        currentStatus = {
            sg: text.includes("Singapore") && text.includes("Available"),
            hk: text.includes("Hong Kong") && text.includes("Available"),
            jp: text.includes("Japan") && text.includes("Available"),
            de: text.includes("Germany") && text.includes("Available"),
            us: text.includes("America") && text.includes("Available"),
            lastUpdate: new Date().toISOString()
        };

        console.log("✔ Updated REAL status");
    } catch (err) {
        console.log("❌ Puppeteer lỗi:", err.message);
    }

    await browser.close();
}

// 📤 WEBHOOK
async function sendWebhook() {
    const data = buildEmbed();

    try {
        if (!messageId) {
            const res = await axios.post(WEBHOOK_URL + "?wait=true", data);
            messageId = res.data.id;
            fs.writeFileSync(FILE, JSON.stringify({ id: messageId }));
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

setInterval(loop, 120000);
loop();

// 🌐 API
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        data: currentStatus
    });
});

app.listen(PORT, () => {
    console.log("Server chạy port " + PORT);
});
