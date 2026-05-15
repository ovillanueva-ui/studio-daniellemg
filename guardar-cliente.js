const { airtableRequest, json, methodNotAllowed, tableName } = require("../lib/airtable");

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, "POST");
  }

  const { nombre, telefono } = req.body || {};
  if (!nombre || !telefono) {
    return json(res, 400, { ok: false, error: "Faltan nombre o telefono" });
  }

  try {
    const table = tableName("AIRTABLE_TABLE_CLIENTES");
    const params = new URLSearchParams({
      maxRecords: "1",
      filterByFormula: `{Teléfono} = '${escapeFormulaValue(telefono)}'`,
    });
    const existing = await airtableRequest(`${table}?${params.toString()}`);
    const record = existing.records?.[0];
    const fields = {
      Nombre: nombre,
      "Teléfono": telefono,
      "Última cita": todayIso(),
    };

    if (record) {
      await airtableRequest(`${table}/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
    } else {
      await airtableRequest(table, {
        method: "POST",
        body: JSON.stringify({ records: [{ fields }] }),
      });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
};
