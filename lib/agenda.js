const { airtableRequest, tableName } = require("./airtable");

const SLOT_MINUTES = 30;
const ESTATUS_OCUPADOS = new Set(["Recibida", "Confirmada", "Completada"]);

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function slotsForDuration(duration) {
  return Math.max(1, Math.ceil(Number(duration || 0) / SLOT_MINUTES));
}

function escapeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

async function getActiveServices() {
  const table = tableName("AIRTABLE_TABLE_SERVICIOS");
  const params = new URLSearchParams({
    filterByFormula: "{Estatus} = 'Activo'",
  });
  const data = await airtableRequest(`${table}?${params.toString()}`);

  return (data.records || []).map((record) => ({
    id: record.id,
    nombre: record.fields.Nombre || "",
    duracion: Number(record.fields["Duración"] || 0),
  }));
}

async function getServiceByName(nombre) {
  const services = await getActiveServices();
  return services.find((service) => service.nombre === nombre) || null;
}

async function getCitasByFecha(fecha) {
  const table = tableName("AIRTABLE_TABLE_CITAS");
  const params = new URLSearchParams({
    filterByFormula: `{Fecha} = '${escapeFormulaValue(fecha)}'`,
  });
  const data = await airtableRequest(`${table}?${params.toString()}`);

  return (data.records || [])
    .map((record) => ({ id: record.id, ...record.fields }))
    .filter((cita) => ESTATUS_OCUPADOS.has(cita.Estatus));
}

async function getBloqueosByFecha(fecha) {
  const table = tableName("AIRTABLE_TABLE_BLOQUEOS");
  const data = await airtableRequest(table);

  return (data.records || [])
    .filter((record) => record.fields.Fecha === fecha)
    .map((record) => ({
      tipo: record.fields.Tipo || "",
      horaInicio: record.fields["Hora inicio"] || "",
      horaFin: record.fields["Hora fin"] || "",
    }));
}

function buildOcupados(citas, services) {
  const durationByService = new Map(services.map((service) => [service.nombre, service.duracion]));
  const ocupados = {};

  for (const cita of citas) {
    const start = timeToMinutes(cita.Hora);
    const duration = durationByService.get(cita.Servicio) || SLOT_MINUTES;
    const requiredSlots = slotsForDuration(duration);

    for (let index = 0; index < requiredSlots; index += 1) {
      const slot = minutesToTime(start + index * SLOT_MINUTES);
      ocupados[slot] = (ocupados[slot] || 0) + 1;
    }
  }

  return ocupados;
}

function isBlockedByRule(slot, duration, bloqueos) {
  const start = timeToMinutes(slot);
  const end = start + slotsForDuration(duration) * SLOT_MINUTES;

  return bloqueos.some((bloqueo) => {
    if (bloqueo.tipo === "Completo") {
      return true;
    }

    if (bloqueo.tipo !== "Parcial") {
      return false;
    }

    const blockStart = timeToMinutes(bloqueo.horaInicio);
    const blockEnd = timeToMinutes(bloqueo.horaFin);
    return start < blockEnd && end > blockStart;
  });
}

function hasSlotConflict(slot, duration, ocupados, maxPerSlot = 1) {
  const start = timeToMinutes(slot);
  const requiredSlots = slotsForDuration(duration);

  for (let index = 0; index < requiredSlots; index += 1) {
    const key = minutesToTime(start + index * SLOT_MINUTES);
    if ((ocupados[key] || 0) >= maxPerSlot) {
      return true;
    }
  }

  return false;
}

module.exports = {
  buildOcupados,
  getBloqueosByFecha,
  getCitasByFecha,
  getServiceByName,
  getActiveServices,
  hasSlotConflict,
  isBlockedByRule,
  minutesToTime,
  slotsForDuration,
  timeToMinutes,
};
