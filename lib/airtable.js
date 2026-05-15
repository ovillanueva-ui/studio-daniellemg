const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function airtableConfig() {
  return {
    token: getEnv("AIRTABLE_TOKEN"),
    baseId: getEnv("AIRTABLE_BASE_ID"),
  };
}

function tableName(envName) {
  return encodeURIComponent(getEnv(envName));
}

async function airtableRequest(path, options = {}) {
  const { token, baseId } = airtableConfig();
  const url = `${AIRTABLE_API_BASE}/${baseId}/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data?.error?.message || data?.error || "Error de Airtable";
    throw new Error(message);
  }

  return data;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed = "GET") {
  res.setHeader("Allow", allowed);
  json(res, 405, { ok: false, error: "Metodo no permitido" });
}

module.exports = {
  airtableRequest,
  json,
  methodNotAllowed,
  tableName,
};
