const { json, methodNotAllowed } = require("../lib/airtable");
const { buildOcupados, getActiveServices, getCitasByFecha } = require("../lib/agenda");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  const { fecha } = req.query;
  if (!fecha) {
    return json(res, 400, { ok: false, error: "Falta fecha" });
  }

  try {
    const [citas, servicios] = await Promise.all([
      getCitasByFecha(fecha),
      getActiveServices(),
    ]);
    const ocupados = buildOcupados(citas, servicios);

    return json(res, 200, { ocupados });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
};
