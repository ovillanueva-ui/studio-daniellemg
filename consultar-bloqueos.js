const { airtableRequest, json, methodNotAllowed, tableName } = require("../lib/airtable");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  const { fecha } = req.query;
  if (!fecha) {
    return json(res, 400, { ok: false, error: "Falta fecha" });
  }

  try {
    const table = tableName("AIRTABLE_TABLE_BLOQUEOS");
    const data = await airtableRequest(table);
    const bloqueos = (data.records || [])
      .filter((record) => record.fields.Fecha === fecha)
      .map((record) => ({
        tipo: record.fields.Tipo || "",
        horaInicio: record.fields["Hora inicio"] || "",
        horaFin: record.fields["Hora fin"] || "",
      }));

    return json(res, 200, { bloqueos });
  } catch (error) {
    return json(res, 200, { bloqueos: [], error: error.message });
  }
};
