const { airtableRequest, json, methodNotAllowed, tableName } = require("../lib/airtable");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  try {
    const table = tableName("AIRTABLE_TABLE_SERVICIOS");
    const params = new URLSearchParams({
      filterByFormula: "{Estatus} = 'Activo'",
    });
    params.append("sort[0][field]", "Orden");
    params.append("sort[0][direction]", "asc");

    const data = await airtableRequest(`${table}?${params.toString()}`);
    const servicios = (data.records || []).map((record) => ({
      id: record.id,
      nombre: record.fields.Nombre || "",
      descripcion: record.fields["Descripción"] || "",
      duracion: Number(record.fields["Duración"] || 0),
      precio: Number(record.fields.Precio || 0),
    }));

    return json(res, 200, { servicios });
  } catch (error) {
    return json(res, 200, { servicios: [], error: error.message });
  }
};
