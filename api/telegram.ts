
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret =
    req.headers["x-telegram-bot-api-secret-token"];

  if (
    !secret ||
    typeof receivedSecret !== "string" ||
    receivedSecret !== secret
  ) {
    return res.status(401).json({ ok: false });
  }

  const message = req.body?.message;
  const text =
    typeof message?.text === "string" ? message.text : "";

  if (
    !message?.chat?.id ||
    !/^\/start(?:@\w+)?(?:\s|$)/.test(text)
  ) {
    return res.status(200).json({ ok: true });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    return res.status(500).json({ ok: false });
  }

  try {
    // Сохраняем пользователя для будущих напоминаний
    await redis.sadd(
      "espresso:telegram:chat_ids",
      String(message.chat.id)
    );

    // Отправляем приветствие
    const result = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text:
            "☕ Давай сделаем твой эспрессо лучше.\n\n" +
            "Что-то не так со вкусом или проливом? Разберёмся вместе. " +
            "Укажи дозу и время пролива, а я подскажу, с чего начать.",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "☕ Открыть Espresso Trainer",
                  web_app: {
                    url: "https://espresso-trainer-pi.vercel.app/"
                  }
                }
              ]
            ]
          }
        })
      }
    );

    const data = await result.json();

    if (!result.ok || !data.ok) {
      console.error("Telegram API error:", data);
      return res.status(500).json({ ok: false });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram handler error:", error);
    return res.status(500).json({ ok: false });
  }
}
