import { Redis } from "@upstash/redis";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method Not Allowed");
  }

  const secret = process.env.REMINDER_SECRET;

  if (
    !secret ||
    req.headers.authorization !== `Bearer ${secret}`
  ) {
    return res.status(401).json({ ok: false });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ ok: false });
  }

  try {
    const redis = Redis.fromEnv();
    const chatIds = await redis.smembers("espresso:telegram:chat_ids");

    let sent = 0;
    let failed = 0;

    for (const chatId of chatIds) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "☕ Самое время проверить помол и пролив!"
            })
          }
        );

        const result = await response.json();

        if (response.ok && result.ok) {
          sent++;
        } else {
          failed++;
          console.error("Telegram send failed:", result);
        }
      } catch (error) {
        failed++;
        console.error("Send failed:", error);
      }
    }

    return res.status(200).json({
      ok: true,
      total: chatIds.length,
      sent,
      failed
    });
  } catch (error) {
    console.error("Reminder error:", error);
    return res.status(500).json({ ok: false });
  }
}