const form = document.querySelector("#waitlist-form");
const submitButton = document.querySelector("#submit-button");

const fields = {
  name: document.querySelector("#name"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
  website: document.querySelector("#website")
};

const errors = {
  name: document.querySelector("#name-error"),
  email: document.querySelector("#email-error"),
  phone: document.querySelector("#phone-error"),
  form: document.querySelector("#form-error")
};

const successNode = document.querySelector("#form-success");
const endpoint = (window.DYHOUSE_WAITLIST_ENDPOINT || "").trim();
const MOCK_STORE_KEY = "dyhouse_waitlist_web_preview";

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

function formatPhoneInput(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function clearMessages() {
  errors.name.textContent = "";
  errors.email.textContent = "";
  errors.phone.textContent = "";
  errors.form.textContent = "";
  successNode.textContent = "";

  fields.name.removeAttribute("aria-invalid");
  fields.email.removeAttribute("aria-invalid");
  fields.phone.removeAttribute("aria-invalid");
}

function setFieldError(fieldName, message) {
  errors[fieldName].textContent = message;
  fields[fieldName].setAttribute("aria-invalid", "true");
}

function setSuccessMessage(message) {
  successNode.textContent = message;
}

function setFormLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Enviando..." : "Avise-me";
}

function validatePayload(rawData) {
  const name = String(rawData.name || "").trim();
  const email = normalizeEmail(rawData.email);
  const phone = normalizePhone(rawData.phone);
  const website = String(rawData.website || "").trim();

  let hasError = false;

  if (name.length < 2) {
    setFieldError("name", "Nome deve ter no mínimo 2 caracteres.");
    hasError = true;
  }

  if (String(rawData.email || "").trim() && email === null) {
    setFieldError("email", "E-mail inválido.");
    hasError = true;
  }

  if (String(rawData.phone || "").trim() && phone === null) {
    setFieldError("phone", "Telefone inválido.");
    hasError = true;
  }

  if (!email && !phone) {
    errors.form.textContent = "Informe e-mail ou telefone.";
    hasError = true;
  }

  if (website) {
    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
    hasError = true;
  }

  return {
    hasError,
    payload: {
      name,
      email: email || undefined,
      phone: phone || undefined,
      website
    }
  };
}

function shouldUseMockSubmit() {
  if (!endpoint) return true;
  return endpoint.includes("<project-id>");
}

function getMockStore() {
  try {
    const data = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || "{}");

    return {
      emails: Array.isArray(data.emails) ? data.emails : [],
      phones: Array.isArray(data.phones) ? data.phones : []
    };
  } catch {
    return { emails: [], phones: [] };
  }
}

function setMockStore(data) {
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(data));
}

function mockSubmit(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const store = getMockStore();

      if (payload.email && store.emails.includes(payload.email)) {
        resolve({ ok: false, status: 409, code: "EMAIL_EXISTS" });
        return;
      }

      if (payload.phone && store.phones.includes(payload.phone)) {
        resolve({ ok: false, status: 409, code: "PHONE_EXISTS" });
        return;
      }

      if (payload.email) store.emails.push(payload.email);
      if (payload.phone) store.phones.push(payload.phone);

      setMockStore(store);
      resolve({ ok: true, status: 201, code: null });
    }, 600);
  });
}

async function submitWaitlist(payload) {
  if (shouldUseMockSubmit()) {
    return mockSubmit(payload);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    code: data.code,
    data
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessages();

  const rawData = {
    name: fields.name.value,
    email: fields.email.value,
    phone: fields.phone.value,
    website: fields.website.value
  };

  const { hasError, payload } = validatePayload(rawData);
  if (hasError) return;

  setFormLoading(true);

  try {
    const response = await submitWaitlist(payload);

    if (response.ok && response.status === 201) {
      form.reset();
      setSuccessMessage("Cadastro confirmado! Vamos avisar em primeira mão.");
      return;
    }

    if (response.status === 409 && response.code === "EMAIL_EXISTS") {
      setFieldError("email", "Esse e-mail já está cadastrado.");
      return;
    }

    if (response.status === 409 && response.code === "PHONE_EXISTS") {
      setFieldError("phone", "Esse telefone já está cadastrado.");
      return;
    }

    if (response.status === 400 && response.code === "VALIDATION_ERROR") {
      if (response.data?.errors?.name) setFieldError("name", response.data.errors.name);
      if (response.data?.errors?.email) setFieldError("email", response.data.errors.email);
      if (response.data?.errors?.phone) setFieldError("phone", response.data.errors.phone);
      if (response.data?.errors?.contact) errors.form.textContent = response.data.errors.contact;
      return;
    }

    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
  } catch {
    errors.form.textContent = "Não foi possível cadastrar agora. Tente novamente.";
  } finally {
    setFormLoading(false);
  }
}

fields.name.addEventListener("input", clearMessages);
fields.email.addEventListener("input", clearMessages);
fields.phone.addEventListener("input", () => {
  fields.phone.value = formatPhoneInput(fields.phone.value);
  clearMessages();
});

form.addEventListener("submit", handleSubmit);
