import express from "express";
import cors from "cors";
import { z } from "zod";
import { db } from "./db.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const waitlistSchema = z
  .object({
    name: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(2, "Nome deve ter no mínimo 2 caracteres.")
    ),
    email: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const normalized = value.trim().toLowerCase();
      return normalized === "" ? undefined : normalized;
    }, z.string().email("E-mail inválido.").optional()),
    phone: z.preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const digits = value.replace(/\D/g, "");
      return digits === "" ? undefined : digits;
    }, z.string().min(8, "Telefone inválido.").optional()),
    website: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string().optional().default("")
    )
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Informe e-mail ou telefone.",
    path: ["contact"]
  });

const insertWaitlistStmt = db.prepare(`
  INSERT INTO waitlist (name, email, phone, created_at, ip, user_agent)
  VALUES (@name, @email, @phone, @created_at, @ip, @user_agent)
`);

app.post("/api/waitlist", (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    const errors = parsed.error.flatten();

    return res.status(400).json({
      ok: false,
      message: "Dados inválidos.",
      fieldErrors: errors.fieldErrors,
      formErrors: errors.formErrors
    });
  }

  const { name, email, phone, website } = parsed.data;

  if (website) {
    return res.status(400).json({
      ok: false,
      message: "Dados inválidos."
    });
  }

  const now = new Date().toISOString();
  const ip = req.ip ?? null;
  const userAgent = req.get("user-agent") ?? null;

  try {
    insertWaitlistStmt.run({
      name,
      email: email ?? null,
      phone: phone ?? null,
      created_at: now,
      ip,
      user_agent: userAgent
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const message = String(error.message ?? "");

      if (message.includes("idx_waitlist_email_unique") || message.includes("waitlist.email")) {
        return res.status(409).json({ ok: false, code: "EMAIL_EXISTS" });
      }

      if (message.includes("idx_waitlist_phone_unique") || message.includes("waitlist.phone")) {
        return res.status(409).json({ ok: false, code: "PHONE_EXISTS" });
      }
    }

    return res.status(500).json({
      ok: false,
      message: "Erro interno do servidor."
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
