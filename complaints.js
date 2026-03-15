import express from "express"

const router = express.Router()
let complaints = []

// ── Telegram ──
const TG_TOKEN = process.env.TELEGRAM_TOKEN || "8710054739:AAG9Be_m2mDtWfMrC9Fv2Sp693YVP_PFt90"
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID || "1148446271"

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text })
    })
  } catch(e) { console.error("Telegram:", e.message) }
}

// ── AI ──
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ""
const SYSTEM = `أنت مساعد ذكاء اصطناعي للإدارة العامة لري محافظة الجيزة.
رد على شكاوى المزارعين بالعامية المصرية بأسلوب محترم وعملي ومختصر.
أرقام مهمة: غرفة العمليات 01288885171`

async function getAIReply(messages) {
  if (!ANTHROPIC_KEY) return getLocalReply(messages.at(-1)?.content || "")
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, system: SYSTEM, messages })
    })
    const d = await res.json()
    return d.content?.[0]?.text || getLocalReply(messages.at(-1)?.content || "")
  } catch(e) {
    return getLocalReply(messages.at(-1)?.content || "")
  }
}

function getLocalReply(t) {
  if (t.includes("انقطع") || t.includes("انقطاع"))
    return "مشكلة انقطاع المياه بتتحل عن طريق قسم التوزيع.\nمفتش هيجى للمعاينة خلال 24 ساعة.\n📞 01288885171"
  if (t.includes("تطهير") || t.includes("حشائش") || t.includes("مسدود"))
    return "تطهير الترع من مهام قسم الصيانة.\nفريق الصيانة هيجى للمعاينة.\n📞 01288885171"
  if (t.includes("تسريب") || t.includes("كسر"))
    return "⚠️ حالة طارئة! اتصل فوراً:\n📞 01288885171"
  if (t.includes("إهدار") || t.includes("بيسرق"))
    return "إهدار المياه مخالفة قانونية.\nمفتش الري هيجى للمعاينة.\n📞 01288885171"
  return "شكراً لتواصلك 🌊\nسجّل شكواك من النموذج.\n📞 01288885171"
}

function getDept(type) {
  if (!type) return "الإدارة"
  if (type.includes("انقطاع") || type.includes("دور")) return "قسم التوزيع"
  if (type.includes("تطهير") || type.includes("حشائش")) return "قسم الصيانة"
  if (type.includes("تسريب") || type.includes("كسر")) return "فريق الطوارئ"
  if (type.includes("إهدار")) return "مفتش الري"
  if (type.includes("اعتداء")) return "الشرطة + مفتش الري"
  return "الإدارة"
}

function getPriority(type) {
  if (!type) return "عادية"
  if (type.includes("تسريب") || type.includes("كسر") || type.includes("انهيار")) return "عاجلة"
  if (type.includes("انقطاع") || type.includes("اعتداء")) return "عالية"
  return "عادية"
}

function generateTicket() {
  const year = new Date().getFullYear()
  const num = Date.now().toString().slice(-5)
  return `GIZ-${year}-${num}`
}

// Chat history per ticket
const chatHistory = {}

// ── POST / — تسجيل شكوى ──
router.post("/", async (req, res) => {
  const { name, phone, area, canal, type, details } = req.body
  if (!name || !phone || !area || !type)
    return res.status(400).json({ success: false, message: "بيانات ناقصة" })

  const ticket = generateTicket()
  const dept = getDept(type)
  const priority = getPriority(type)

  const complaint = {
    id: Date.now(), ticket,
    name, phone, area, canal: canal || "", type, details: details || "",
    department: dept, priority, status: "جديدة",
    created_at: new Date().toISOString()
  }

  complaints.unshift(complaint)
  chatHistory[ticket] = []

  // Telegram notification
  const icon = priority === "عاجلة" ? "🔴" : priority === "عالية" ? "🟠" : "🟡"
  await sendTelegram(
    `🚨 شكوى جديدة — رى الجيزة\n\n` +
    `🎫 ${ticket}\n${icon} ${priority}\n` +
    `👨‍🌾 ${name}\n📞 ${phone}\n📍 ${area}${canal ? " — " + canal : ""}\n` +
    `⚠️ ${type}\n🏢 ${dept}\n` +
    (details ? `📝 ${details}\n` : "") +
    `\n🕐 ${new Date().toLocaleString("ar-EG")}`
  )

  res.json({ success: true, ticket, complaint })
})

// ── GET / — كل الشكاوى ──
router.get("/", (req, res) => {
  const { status, search } = req.query
  let result = [...complaints]
  if (status) result = result.filter(c => c.status === status)
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(c =>
      c.name.includes(q) || c.ticket.toLowerCase().includes(q) ||
      c.area.includes(q) || c.type.includes(q)
    )
  }
  res.json({ success: true, data: result, total: result.length })
})

// ── GET /stats ──
router.get("/stats", (req, res) => {
  res.json({
    success: true,
    total: complaints.length,
    new: complaints.filter(c => c.status === "جديدة").length,
    inProgress: complaints.filter(c => c.status === "قيد التنفيذ").length,
    resolved: complaints.filter(c => c.status === "محلولة").length,
    urgent: complaints.filter(c => c.priority === "عاجلة").length
  })
})

// ── PATCH /:id — تحديث الحالة ──
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const c = complaints.find(x => x.id === id)
  if (!c) return res.status(404).json({ success: false })
  const old = c.status
  c.status = status
  await sendTelegram(`🔄 تحديث شكوى\n🎫 ${c.ticket}\n👤 ${c.name}\n${old} ← ${status}`)
  res.json({ success: true })
})

// ── POST /:ticket/chat — محادثة AI ──
router.post("/:ticket/chat", async (req, res) => {
  const { ticket } = req.params
  const { message } = req.body
  if (!chatHistory[ticket]) chatHistory[ticket] = []
  chatHistory[ticket].push({ role: "user", content: message })
  const reply = await getAIReply(chatHistory[ticket])
  chatHistory[ticket].push({ role: "assistant", content: reply })
  res.json({ success: true, reply })
})

export default router
