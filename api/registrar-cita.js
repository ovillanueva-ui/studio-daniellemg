const { airtableRequest, json, methodNotAllowed, tableName } = require("../lib/airtable");
const {
  buildOcupados,
  endTimeForDuration,
  getActiveServices,
  getBloqueosByFecha,
  getCitasByFecha,
  getServiceByName,
  hasSlotConflict,
  isBlockedByRule,
} = require("../lib/agenda");

function clean(value) {
  return String(value || "").trim();
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function generarFolio() {
  return `Cita-${Math.floor(10000 + Math.random() * 90000)}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, "POST");
  }

  const body = req.body || {};
  const folio = clean(body.folio) || generarFolio();
  const nombre = clean(body.nombre);
  const telefono = clean(body.telefono);
  const servicio = clean(body.servicio);
  const fecha = clean(body.fecha);
  const hora = clean(body.hora);
  const notas = clean(body.notas);

  if (!nombre || !telefono || !servicio || !isValidDate(fecha) || !isValidTime(hora)) {
    return json(res, 400, { ok: false, error: "Datos incompletos o invalidos" });
  }

  try {
    const selectedService = await getServiceByName(servicio);
    if (!selectedService) {
      return json(res, 400, { ok: false, error: "Servicio no disponible" });
    }

    const [citas, servicios, bloqueos] = await Promise.all([
      getCitasByFecha(fecha),
      getActiveServices(),
      getBloqueosByFecha(fecha),
    ]);
    const ocupados = buildOcupados(citas, servicios);
    const blocked = isBlockedByRule(hora, selectedService.duracion, bloqueos);
    const conflicted = hasSlotConflict(hora, selectedService.duracion, ocupados);
    const horaFin = endTimeForDuration(hora, selectedService.duracion);

    if (blocked || conflicted) {
      return json(res, 409, {
        ok: false,
        error: "Ese horario ya no esta disponible. Elige otro horario.",
      });
    }

    const table = tableName("AIRTABLE_TABLE_CITAS");
    const fields = {
      Folio: folio,
      Nombre: nombre,
      "Teléfono": telefono,
      Servicio: servicio,
      Fecha: fecha,
      Hora: hora,
      "Hora fin": horaFin,
      Estatus: "Recibida",
    };

    if (notas) {
      fields.Notas = notas;
    }

    const created = await airtableRequest(table, {
      method: "POST",
      body: JSON.stringify({ records: [{ fields }] }),
    });

    return json(res, 200, {
      ok: true,
      id: created.records?.[0]?.id,
      folio,
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
};
