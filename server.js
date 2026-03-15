import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import complaintsRoute from "./complaints.js"

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())
app.use(express.static("."))
app.use("/api/complaints", complaintsRoute)
app.get("/api/health", (req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
