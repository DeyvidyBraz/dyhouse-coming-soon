import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { encryptValue, sha256 } from "./crypto.js";

initializeApp();

const db = getFirestore();
const WAITLIST_COLLECTION = "waitlist";
const UNIQUE_COLLECTION = "waitlist_uniques";

const configuredOrigins = (process.env.WAITLIST_ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const allowedCorsOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/[a-z0-9-]+\.github\.io$/,
  ...configuredOrigins
];

function normalizeEmail(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(value) ? value : null;
}

function normalizePhone(raw) {
  const value = String(raw || "").replace(/\D/g, "");
  if (!value) return "";
  return value.length >= 8 ? value : null;
}

function validatePayload(body) {
  const name = String(body?.name || "").trim();
  const email = normalizeEmail(body?.email);
  const phone = normalizePhone(body?.phone);
  const website = String(body?.website || "").trim();

  const errors = {};

  if (name.length < 2) {
    errors.name = "Nome deve ter no mínimo 2 caracteres.";
  }

  if (String(body?.email || "").trim() && email === null) {
    errors.email = "E-mail inválido.";
  }

  if (String(body?.phone || "").trim() && phone === null) {
    errors.phone = "Telefone inválido.";
  }

  if (!email && !phone) {
    errors.contact = "Informe e-mail ou telefone.";
  }

  if (website) {
    errors.contact = "Informe e-mail ou telefone.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    payload: {
      name,
      email,
      phone,
      website
    }
  };
}

function getClientIp(req) {
  const forwardedFor = req.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || null;
}

class ConflictError extends Error {
  constructor(code) {
    super(code);
    this.name = "ConflictError";
    this.code = code;
  }
}

export const submitWaitlist = onRequest({ cors: allowedCorsOrigins, region: "us-central1" }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
    return;
  }

  let validated;

  try {
    validated = validatePayload(req.body || {});
  } catch {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR" });
    return;
  }

  if (!validated.isValid) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", errors: validated.errors });
    return;
  }

  const { name, email, phone } = validated.payload;

  const emailHash = email ? sha256(email) : null;
  const phoneHash = phone ? sha256(phone) : null;

  const nowIso = new Date().toISOString();
  const ip = getClientIp(req);
  const userAgent = req.get("user-agent") || null;

  const waitlistRef = db.collection(WAITLIST_COLLECTION).doc();

  try {
    await db.runTransaction(async (tx) => {
      let emailUniqueRef;
      let phoneUniqueRef;

      if (emailHash) {
        emailUniqueRef = db.collection(UNIQUE_COLLECTION).doc(`email_${emailHash}`);
        const emailUniqueSnap = await tx.get(emailUniqueRef);

        if (emailUniqueSnap.exists) {
          throw new ConflictError("EMAIL_EXISTS");
        }
      }

      if (phoneHash) {
        phoneUniqueRef = db.collection(UNIQUE_COLLECTION).doc(`phone_${phoneHash}`);
        const phoneUniqueSnap = await tx.get(phoneUniqueRef);

        if (phoneUniqueSnap.exists) {
          throw new ConflictError("PHONE_EXISTS");
        }
      }

      const waitlistData = {
        created_at: nowIso,
        ip,
        user_agent: userAgent,
        email_hash: emailHash,
        phone_hash: phoneHash,
        name_enc: encryptValue(name),
        email_enc: email ? encryptValue(email) : null,
        phone_enc: phone ? encryptValue(phone) : null
      };

      tx.set(waitlistRef, waitlistData);

      if (emailHash && emailUniqueRef) {
        tx.set(emailUniqueRef, {
          type: "email",
          hash: emailHash,
          waitlist_ref: waitlistRef.id,
          created_at: nowIso
        });
      }

      if (phoneHash && phoneUniqueRef) {
        tx.set(phoneUniqueRef, {
          type: "phone",
          hash: phoneHash,
          waitlist_ref: waitlistRef.id,
          created_at: nowIso
        });
      }
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    if (error instanceof ConflictError) {
      res.status(409).json({ ok: false, code: error.code });
      return;
    }

    console.error("submitWaitlist error", error);
    res.status(500).json({ ok: false, code: "INTERNAL_ERROR" });
  }
});
