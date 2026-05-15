const { airtableRequest, json, methodNotAllowed, tableName } = require("../lib/airtable");

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  const telefono = String(req.query.telefono || "").trim();
  if (telefono.length < 8) {
    return json(res, 200, { encontrado: false });
  }

  try {
    const table = tableName("AIRTABLE_TABLE_CLIENTES");
    const params = new URLSearchParams({
      maxRecords: "1",
      filterByFormula: `{Teléfono} = '${escapeFormulaValue(telefono)}'`,
    });
    const data = await airtableRequest(`${table}?${params.toString()}`);
    const record = data.records?.[0];

    if (!record) {
      return json(res, 200, { encontrado: false });
    }

    return json(res, 200, {
      encontrado: true,
      nombre: record.fields.Nombre || "",
    });
  } catch (error) {
    return json(res, 200, { encontrado: false, error: error.message });
  }
};
