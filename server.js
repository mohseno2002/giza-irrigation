import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import path from "path"
import { fileURLToPath } from "url"
import complaintsRoute from "./routes/complaints.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "../frontend")))
app.use("/api/complaints", complaintsRoute)
app.get("/api/health", (req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`✅ السيرفر شغال على http://localhost:${PORT}`))
