const state = {
  view: "canchas",
  canchas: [],
  complejos: [],
  editingId: null
};

const $ = (selector) => document.querySelector(selector);

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación");
  return data;
}

async function load() {
  try {
    const [canchas, complejos] = await Promise.all([
      api("/canchas"),
      api("/complejos")
    ]);
    state.canchas = canchas;
    state.complejos = complejos;
    renderComplexFilter();
    render();
  } catch (error) {
    $("#content").innerHTML = `<div class="empty">${error.message}</div>`;
  }
}

function renderComplexFilter() {
  const select = $("#complex-filter");
  const current = select.value;
  select.innerHTML = '<option value="">Todos los complejos</option>' +
    state.complejos.map((item) =>
      `<option value="${item.id}">${escapeHtml(item.nombre)}</option>`
    ).join("");
  select.value = current;
}

function render() {
  if (state.view === "canchas") renderCanchas();
  else renderComplejos();
}

function renderStats(items) {
  const available = items.filter((item) => item.disponible).length;
  const covered = items.filter((item) => item.techada).length;
  const complexCount = state.complejos.length;
  $("#stats").innerHTML = `
    <article class="stat-card"><span>Total de canchas</span><strong>${items.length}</strong></article>
    <article class="stat-card"><span>Disponibles</span><strong>${available}</strong></article>
    <article class="stat-card"><span>Techadas</span><strong>${covered}</strong></article>
    <article class="stat-card"><span>Complejos</span><strong>${complexCount}</strong></article>`;
}

function renderCanchas() {
  const search = $("#search").value.trim().toLowerCase();
  const complexId = $("#complex-filter").value;
  const type = $("#type-filter").value;
  const filtered = state.canchas.filter((item) =>
    (!search || `${item.nombre} ${item.superficie}`.toLowerCase().includes(search)) &&
    (!complexId || String(item.complejo_id) === complexId) &&
    (!type || item.tipo === type)
  );

  renderStats(filtered);
  if (!filtered.length) {
    $("#content").innerHTML = '<div class="empty">No hay canchas que coincidan con los filtros.</div>';
    return;
  }

  $("#content").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Cancha</th><th>Tipo</th><th>Superficie</th><th>Complejo</th><th>Precio por hora</th><th>Estado</th><th></th></tr></thead>
    <tbody>${filtered.map((item) => `
      <tr>
        <td class="name-cell"><strong>${escapeHtml(item.nombre)}</strong><small>#${item.id}</small></td>
        <td><span class="badge">${escapeHtml(item.tipo)}</span></td>
        <td>${escapeHtml(item.superficie)} ${item.techada ? '<span class="badge">Techada</span>' : ""}</td>
        <td>${escapeHtml(item.complejo_nombre || "")}</td>
        <td><strong>$${Number(item.precio_hora).toLocaleString("es-AR")}</strong></td>
        <td><span class="badge ${item.disponible ? "green" : "gray"}">${item.disponible ? "Disponible" : "No disponible"}</span></td>
        <td><div class="actions">
          <button class="icon-button" title="Editar" onclick="openCancha(${item.id})">&#9998;</button>
          <button class="icon-button danger" title="Eliminar" onclick="deleteCancha(${item.id})">&#128465;</button>
        </div></td>
      </tr>`).join("")}</tbody>
  </table></div>`;
}

function renderComplejos() {
  const search = $("#search").value.trim().toLowerCase();
  const filtered = state.complejos.filter((item) =>
    !search || `${item.nombre} ${item.direccion} ${item.telefono || ""}`.toLowerCase().includes(search)
  );
  const courtsByComplex = Object.fromEntries(state.complejos.map((item) => [
    item.id,
    state.canchas.filter((court) => court.complejo_id === item.id).length
  ]));

  $("#stats").innerHTML = `
    <article class="stat-card"><span>Total de complejos</span><strong>${state.complejos.length}</strong></article>
    <article class="stat-card"><span>Canchas registradas</span><strong>${state.canchas.length}</strong></article>
    <article class="stat-card"><span>Disponibles</span><strong>${state.canchas.filter(x => x.disponible).length}</strong></article>
    <article class="stat-card"><span>Complejos activos</span><strong>${state.complejos.length}</strong></article>`;

  if (!filtered.length) {
    $("#content").innerHTML = '<div class="empty">No hay complejos que coincidan con la búsqueda.</div>';
    return;
  }

  $("#content").innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Complejo</th><th>Dirección</th><th>Teléfono</th><th>Canchas</th><th></th></tr></thead>
    <tbody>${filtered.map((item) => `
      <tr>
        <td class="name-cell"><strong>${escapeHtml(item.nombre)}</strong><small>#${item.id}</small></td>
        <td>${escapeHtml(item.direccion)}</td>
        <td>${escapeHtml(item.telefono || "-")}</td>
        <td><span class="badge green">${courtsByComplex[item.id] || 0} cancha${courtsByComplex[item.id] === 1 ? "" : "s"}</span></td>
        <td><div class="actions">
          <button class="icon-button" title="Editar" onclick="openComplejo(${item.id})">&#9998;</button>
          <button class="icon-button danger" title="Eliminar" onclick="deleteComplejo(${item.id})">&#128465;</button>
        </div></td>
      </tr>`).join("")}</tbody>
  </table></div>`;
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((item) =>
    item.classList.toggle("active", item.dataset.view === view)
  );
  $("#page-title").textContent = view === "canchas" ? "Canchas" : "Complejos";
  $("#add-button").innerHTML = view === "canchas" ? "<span>+</span> Nueva cancha" : "<span>+</span> Nuevo complejo";
  $("#search").placeholder = view === "canchas"
    ? "Buscar por nombre o superficie"
    : "Buscar por nombre, dirección o teléfono";
  $("#complex-filter").style.display = view === "canchas" ? "" : "none";
  $("#type-filter").style.display = view === "canchas" ? "" : "none";
  $("#search").value = "";
  render();
}

function openCancha(id = null) {
  const item = id ? state.canchas.find((court) => court.id === id) : null;
  state.editingId = id;
  $("#dialog-title").textContent = item ? "Editar cancha" : "Nueva cancha";
  $("#form-fields").innerHTML = `
    <div class="field"><label for="nombre">Nombre</label><input id="nombre" name="nombre" value="${escapeHtml(item?.nombre || "")}" required></div>
    <div class="field"><label for="tipo">Tipo</label><select id="tipo" name="tipo">${["F5","F7","F11"].map(type => `<option ${item?.tipo === type ? "selected" : ""}>${type}</option>`).join("")}</select></div>
    <div class="field"><label for="superficie">Superficie</label><input id="superficie" name="superficie" value="${escapeHtml(item?.superficie || "")}" required></div>
    <div class="field"><label for="precio_hora">Precio por hora</label><input id="precio_hora" name="precio_hora" type="number" min="1" value="${item?.precio_hora || ""}" required></div>
    <div class="field full"><label for="complejo_id">Complejo</label><select id="complejo_id" name="complejo_id">${state.complejos.map(complex =>
      `<option value="${complex.id}" ${item?.complejo_id === complex.id ? "selected" : ""}>${escapeHtml(complex.nombre)}</option>`
    ).join("")}</select></div>
    <div class="check-row">
      <label><input id="techada" type="checkbox" ${item?.techada ? "checked" : ""}> Techada</label>
      <label><input id="disponible" type="checkbox" ${item ? (item.disponible ? "checked" : "") : "checked"}> Disponible</label>
    </div>`;
  $("#form-error").textContent = "";
  $("#form-dialog").showModal();
}

function openComplejo(id = null) {
  const item = id ? state.complejos.find((complex) => complex.id === id) : null;
  state.editingId = id;
  $("#dialog-title").textContent = item ? "Editar complejo" : "Nuevo complejo";
  $("#form-fields").innerHTML = `
    <div class="field full"><label for="nombre">Nombre</label><input id="nombre" name="nombre" value="${escapeHtml(item?.nombre || "")}" required></div>
    <div class="field full"><label for="direccion">Dirección</label><input id="direccion" name="direccion" value="${escapeHtml(item?.direccion || "")}" required></div>
    <div class="field full"><label for="telefono">Teléfono</label><input id="telefono" name="telefono" value="${escapeHtml(item?.telefono || "")}"></div>`;
  $("#form-error").textContent = "";
  $("#form-dialog").showModal();
}

async function saveRecord(event) {
  event.preventDefault();
  const id = state.editingId;
  let payload;
  if (state.view === "canchas") {
    payload = {
      nombre: $("#nombre").value.trim(),
      tipo: $("#tipo").value,
      superficie: $("#superficie").value.trim(),
      precio_hora: Number($("#precio_hora").value),
      complejo_id: Number($("#complejo_id").value),
      techada: $("#techada").checked,
      disponible: $("#disponible").checked
    };
  } else {
    payload = {
      nombre: $("#nombre").value.trim(),
      direccion: $("#direccion").value.trim(),
      telefono: $("#telefono").value.trim()
    };
  }

  const base = state.view === "canchas" ? "/canchas" : "/complejos";
  const url = id ? `${base}/${id}` : base;
  try {
    await api(url, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    $("#form-dialog").close();
    showToast(id ? "Registro actualizado" : "Registro creado");
    await load();
  } catch (error) {
    $("#form-error").textContent = error.message;
  }
}

async function deleteCancha(id) {
  if (!confirm("¿Eliminar esta cancha?")) return;
  try {
    await api(`/canchas/${id}`, { method: "DELETE" });
    showToast("Cancha eliminada");
    await load();
  } catch (error) { showToast(error.message); }
}

async function deleteComplejo(id) {
  if (!confirm("¿Eliminar este complejo?")) return;
  try {
    await api(`/complejos/${id}`, { method: "DELETE" });
    showToast("Complejo eliminado");
    await load();
  } catch (error) { showToast(error.message); }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.querySelectorAll(".nav-item").forEach((item) =>
  item.addEventListener("click", () => switchView(item.dataset.view))
);
$("#add-button").addEventListener("click", () =>
  state.view === "canchas" ? openCancha() : openComplejo()
);
$("#search").addEventListener("input", render);
$("#complex-filter").addEventListener("change", render);
$("#type-filter").addEventListener("change", render);
$("#record-form").addEventListener("submit", saveRecord);
$("#close-dialog").addEventListener("click", () => $("#form-dialog").close());
$("#cancel-dialog").addEventListener("click", () => $("#form-dialog").close());

load();
