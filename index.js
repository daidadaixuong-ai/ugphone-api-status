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

let messageId = null;

// load message id safely
try {
    if (fs.existsSync(FILE)) {
        const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
        messageId = raw?.id || null;
    }
} catch (e) {
    console.log("⚠️ Lỗi đọc message.json, reset id");
    messageId = null;
}

const startTime = Date.now();
let isChecking = false;

// ⏱ uptime (sửa đúng)
function getUptime() {
    const diff = Date.now() - startTime;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);

    return `${d}d ${h}h ${m}m`;
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

🟢 Còn máy
🔴 Hết máy

⏱ Uptime: ${getUptime()}
📅 ${new Date().toLocaleDateString("vi-VN")}`,
                footer: { text: "Auto Updater" }
            }
        ]
    };
}

// 🔍 CHECK STATUS
async function checkStatus() {
    if (isChecking) return;
    isChecking = true;

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();

        await page.goto(URL, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        await page.waitForSelector("body");
        await page.waitForTimeout(4000);

        const result = await page.evaluate(() => {

            function getStatus(country) {
                const all = Array.from(document.querySelectorAll("*"));

                for (const el of all) {
                    if (!el.innerText) continue;
                    if (!el.innerText.includes(country)) continue;

                    const container = el.closest("div");
                    if (!container) continue;

                    const text = container.innerText;

                    // VI
                    if (text.includes("Có máy")) return true;
                    if (text.includes("Hết máy")) return false;

                    // EN fallback
                    const lower = text.toLowerCase();
                    if (lower.includes("available")) return true;
                    if (lower.includes("unavailable")) return false;
                }

                return false;
            }

            return {
                sg: getStatus("Singapore"),
                hk: getStatus("Hong Kong"),
                jp: getStatus("Japan"),
                de: getStatus("Germany"),
                us: getStatus("America")
            };
        });

        currentStatus = {
            ...result,
            lastUpdate: new Date().toISOString()
        };

        console.log("✔ Status updated:", currentStatus);

    } catch (err) {
        console.log("❌ Check lỗi:", err.message);
    } finally {
        if (browser) await browser.close();
        isChecking = false;
    }
}

// 📤 WEBHOOK
async function sendWebhook() {
    const data = buildEmbed();

    try {
        if (!messageId) {
            const res = await axios.post(WEBHOOK_URL + "?wait=true", data);
            messageId = res.data?.id;

            if (messageId) {
                fs.writeFileSync(FILE, JSON.stringify({ id: messageId }));
            }
        } else {
            await axios.patch(`${WEBHOOK_URL}/messages/${messageId}`, data);
        }
    } catch (err) {
        console.log("❌ Webhook lỗi:", err.message);
    }
}

// 🔁 LOOP
function startLoop() {
    async function run() {
        await checkStatus();
        await sendWebhook();

        setTimeout(run, 120000); // 2 phút
    }
    run();
}

startLoop();

// 🌐 API
app.get("/api/status", (req, res) => {
    res.set("Cache-Control", "public, max-age=5");

    res.json({
        success: true,
        data: currentStatus
    });
});

app.get("/", (req, res) => {
    res.send("API UGPhone đang chạy!");
});

app.listen(PORT, () => {
    console.log("Server chạy port " + PORT);
});
