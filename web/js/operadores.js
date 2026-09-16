/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: operadores.js
 * Descripción: Administra la lógica del módulo de gestión de operadores de campo (operadores.html).
 *              Permite listar los operarios encargados de la limpieza urbana, registrar nuevos
 *              usuarios (POST), editar información (PATCH), cambiar el estado operacional de activo/inactivo
 *              y darlos de baja definitivamente del sistema.
 * 
 * Dependencias:
 *   - config.js (Usa requestAPI)
 * 
 * Expone:
 *   - loadOperadores(): Consulta a la API y dibuja la tabla del personal.
 *   - toggleEstadoOperador(): Modifica estado de actividad (Activo/Inactivo).
 *   - confirmDeleteOperador(): Ejecuta la baja lógica del operador.
 *   - openEditModal(): Precarga información para edición.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadOperadores();       // Realiza la carga de la tabla de operarios
  initOperadoresModals(); // Inicializa los listeners de los modales de creación y edición
});

// Paleta de colores para avatares (basada en el índice del operario)
const AVATAR_COLORS = [
  ['#3D5843', '#244039'],
  ['#2a6496', '#1a4a7a'],
  ['#7B3F7F', '#5a2d5e'],
  ['#8B6914', '#6a4f10'],
  ['#2e7d6b', '#1a5a4e'],
  ['#7d3c3c', '#5c2a2a'],
  ['#365d7e', '#254560'],
];

/**
 * Genera las iniciales de un operario a partir de nombre y apellido.
 */
function getInitials(nombre, apellido) {
  const n = (nombre || '').trim()[0] || '';
  const a = (apellido || '').trim()[0] || '';
  return (n + a).toUpperCase();
}

/**
 * Consulta la API y renderiza las tarjetas de operadores.
 */
async function loadOperadores() {
  const grid = document.getElementById('operadores-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state"><p>Cargando operadores...</p></div>';

  try {
    const data = await requestAPI('/api/operadores');

    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No hay operadores registrados aún.</p></div>';
      return;
    }

    grid.innerHTML = '';

    data.forEach((op, idx) => {
      const nombreCompleto = `${op.nombre} ${op.apellido}`;
      const iniciales = getInitials(op.nombre, op.apellido);
      const [colorA, colorB] = AVATAR_COLORS[idx % AVATAR_COLORS.length];

      const badgeClass  = op.activo ? 'badge-activo'    : 'badge-inactivo';
      const badgeText   = op.activo ? 'Activo'          : 'Inactivo';
      const cardClass   = op.activo ? 'operador-card'   : 'operador-card inactivo';

      const toggleLabel = op.activo ? 'Desactivar' : 'Activar';
      const toggleClass = op.activo ? 'btn-action btn-toggle-off' : 'btn-action btn-toggle-on';
      const toggleIcon  = op.activo
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
      const nuevoEstado = op.activo ? 0 : 1;

      const zonaBadge = op.zona_nombre
        ? `<span class="zona-badge">📍 ${escapeHTML(op.zona_nombre)}</span>`
        : `<span class="zona-badge-empty">Sin zona asignada</span>`;

      const telefono = op.telefono || '<span style="font-style:italic;opacity:0.5">Sin registro</span>';

      const alertasActivas = op.alertas_activas || 0;
      const resueltas      = op.resueltas_hoy   || 0;

      const card = document.createElement('div');
      card.className = cardClass;
      // Mostrar DNI y/o zona como subtítulo de la tarjeta
      const subtituloMeta = op.dni
        ? `<div class="operador-email">DNI: ${escapeHTML(op.dni)}</div>`
        : `<div class="operador-email" style="opacity:0.4;font-style:italic">Sin DNI registrado</div>`;

      card.innerHTML = `
        <div class="card-header-row">
          <div class="operador-avatar"
               style="background: linear-gradient(135deg, ${colorA}, ${colorB})">
            ${iniciales}
          </div>
          <div class="operador-meta">
            <div class="operador-nombre">${escapeHTML(nombreCompleto)}</div>
            ${subtituloMeta}
          </div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="card-details">
          <div class="card-detail-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.07 5.18 2 2 0 0 1 5.05 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18z"/></svg>
            ${telefono}
          </div>
          <div class="card-detail-item">
            ${zonaBadge}
          </div>
        </div>

        <div class="card-stats">
          <div class="stat-block">
            <div class="stat-value ${alertasActivas > 0 ? 'active' : ''}">${alertasActivas}</div>
            <div class="stat-label">Alertas activas</div>
          </div>
          <div class="stat-block">
            <div class="stat-value">${resueltas}</div>
            <div class="stat-label">Resueltas hoy</div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-action btn-edit"
                  onclick="openEditModal(${op.id})"
                  title="Editar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="${toggleClass}"
                  onclick="toggleEstadoOperador(${op.id}, ${nuevoEstado})"
                  title="${toggleLabel}">
            ${toggleIcon}
            ${toggleLabel}
          </button>
          <button class="btn-action btn-delete"
                  onclick="confirmDeleteOperador(${op.id}, '${escapeHTML(nombreCompleto)}')"
                  title="Dar de baja">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Baja
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (error) {
    console.error('Error al cargar operadores:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--color-danger);">
          ⚠️ Error al cargar operadores: ${escapeHTML(error.message || 'No se pudo conectar al servidor')}
        </p>
      </div>
    `;
  }
}

/**
 * Modifica el estado activo/inactivo de un operario (PATCH /api/operadores/<id>/estado).
 * Esto permite suspender temporalmente a un usuario sin eliminar su historial.
 */
async function toggleEstadoOperador(id, nuevoEstado) {
  try {
    await requestAPI(`/api/operadores/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: nuevoEstado })
    });
    loadOperadores(); // Recarga la tabla
  } catch (error) {
    console.error('Error al cambiar estado de operador:', error);
    alert(`No se pudo cambiar el estado del operador: ${error.message}`);
  }
}

/**
 * Ejecuta la eliminación lógica del operador en la base de datos (DELETE /api/operadores/<id>).
 * Si el operador posee alertas asignadas activas, el backend retornará un error 409 para proteger la consistencia de datos.
 */
async function confirmDeleteOperador(id, name) {
  const confirmacion = confirm(`¿Confirmar baja de ${name}? Esta acción no puede deshacerse.`);
  if (!confirmacion) return;

  try {
    const res = await requestAPI(`/api/operadores/${id}`, {
      method: 'DELETE'
    });
    alert(res.mensaje || 'Operador dado de baja correctamente.');
    loadOperadores();
  } catch (error) {
    console.error('Error al dar de baja operador:', error);
    alert(error.message || 'Error al eliminar el operador.');
  }
}

/**
 * Obtiene los detalles de un operador de la API y los precarga en el formulario del modal de edición.
 */
async function openEditModal(id) {
  const modal = document.getElementById('editar-operador-modal');
  const form = document.getElementById('editar-operador-form');
  const errorMsg = document.getElementById('edit-form-error-msg');

  if (!modal || !form) return;

  errorMsg.style.display = 'none';
  form.reset();

  try {
    const op = await requestAPI(`/api/operadores/${id}`);

    document.getElementById('edit-op-id').value             = op.id;
    document.getElementById('edit-op-nombre').value          = op.nombre;
    document.getElementById('edit-op-apellido').value        = op.apellido;
    document.getElementById('edit-op-dni').value             = op.dni || '';
    document.getElementById('edit-op-fecha-nacimiento').value = op.fecha_nacimiento || '';
    document.getElementById('edit-op-telefono').value        = op.telefono || '';

    // Pre-seleccionar la zona actual del operario
    const zonaSelect = document.getElementById('edit-op-zona');
    if (zonaSelect) zonaSelect.value = op.zona_id || '';

    modal.classList.add('active');
  } catch (error) {
    console.error('Error al cargar datos del operador:', error);
    alert(`No se pudieron cargar los datos del operador: ${error.message}`);
  }
}

/**
 * Inicializa y configura los formularios de los modales de creación y edición.
 */
function initOperadoresModals() {
  const modalCrear = document.getElementById('operador-modal');
  const btnNuevo = document.getElementById('btn-nuevo-operador');
  const btnCancelarCrear = document.getElementById('btn-cancelar');
  const btnCloseCrear = document.getElementById('modal-close-btn');
  const formCrear = document.getElementById('operador-form');
  const errorMsgCrear = document.getElementById('form-error-msg');

  const modalEditar = document.getElementById('editar-operador-modal');
  const btnCancelarEditar = document.getElementById('btn-edit-cancelar');
  const btnCloseEditar = document.getElementById('edit-modal-close-btn');
  const formEditar = document.getElementById('editar-operador-form');
  const errorMsgEditar = document.getElementById('edit-form-error-msg');

  // Helpers locales para remover clase active (ocultar)
  const cerrarCrear = () => { modalCrear.classList.remove('active'); };
  const cerrarEditar = () => { modalEditar.classList.remove('active'); };

  // Abre modal de alta de operario e inicializa el prefijo de teléfono
  if (btnNuevo && modalCrear) {
    btnNuevo.addEventListener('click', () => {
      formCrear.reset();
      errorMsgCrear.style.display = 'none';
      modalCrear.classList.add('active');

      const telInput = document.getElementById('op-telefono');
      if (telInput) {
        telInput.value = '+54 ';
        setTimeout(() => {
          telInput.focus();
          const len = telInput.value.length;
          telInput.setSelectionRange(len, len);
        }, 50);
      }
    });
  }

  // Lógica de máscara y formato automático del teléfono (+54 6digitos-4digitos)
  const telInput = document.getElementById('op-telefono');
  if (telInput) {
    // Bloquear letras, símbolos y caracteres inválidos al tipear
    telInput.addEventListener('keypress', (e) => {
      // Permitir sólo números, signo + y guion
      if (e.key !== 'Enter' && !/[0-9+\-]/.test(e.key)) {
        e.preventDefault();
      }
    });

    telInput.addEventListener('input', () => {
      let val = telInput.value;

      // Si empieza con "+54 ", aplicamos la lógica de formateo con guion
      if (val.startsWith('+54 ')) {
        const prefix = '+54 ';
        const rest = val.substring(4);
        
        // Limpiar para dejar solo dígitos en la parte del usuario
        const digits = rest.replace(/\D/g, '');
        
        let formatted = '';
        if (digits.length > 6) {
          formatted = digits.substring(0, 6) + '-' + digits.substring(6, 10);
        } else {
          formatted = digits;
        }
        telInput.value = prefix + formatted;
      } else if (val.startsWith('+54')) {
        // Permitir borrar hasta "+54" o "+5" o "+" sin forzar
        // No forzamos, solo limpiamos caracteres no válidos
        telInput.value = val.replace(/[^\d+-]/g, '');
      } else {
        // Si borró el prefijo o escribe otro código de país
        // Permitimos que escriba libremente pero limpiamos letras y caracteres no numéricos (excepto + y -)
        telInput.value = val.replace(/[^\d+-]/g, '');
      }
    });
  }

  if (btnCancelarCrear) btnCancelarCrear.addEventListener('click', cerrarCrear);
  if (btnCloseCrear) btnCloseCrear.addEventListener('click', cerrarCrear);
  modalCrear.addEventListener('click', (e) => { if (e.target === modalCrear) cerrarCrear(); });

  // Maneja el guardado del nuevo operador (POST)
  formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsgCrear.style.display = 'none';

    const nombre          = document.getElementById('op-nombre').value.trim();
    const apellido        = document.getElementById('op-apellido').value.trim();
    const dni             = document.getElementById('op-dni').value.trim();
    const fechaNacimiento = document.getElementById('op-fecha-nacimiento').value;
    const telefono        = document.getElementById('op-telefono').value.trim();
    const zonaId          = document.getElementById('op-zona').value;

    const btnGuardar = document.getElementById('btn-guardar');
    const originalText = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
      await requestAPI('/api/operadores', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          apellido,
          dni:              dni || null,
          fecha_nacimiento: fechaNacimiento || null,
          telefono:         telefono || null,
          zona_id:          zonaId ? parseInt(zonaId) : null
        })
      });

      cerrarCrear();
      loadOperadores();
    } catch (err) {
      console.error(err);
      errorMsgCrear.textContent = `⚠️ ${err.message || 'Error al guardar el operador'}`;
      errorMsgCrear.style.display = 'block';
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = originalText;
    }
  });

  // Cierres de modal edición
  if (btnCancelarEditar) btnCancelarEditar.addEventListener('click', cerrarEditar);
  if (btnCloseEditar) btnCloseEditar.addEventListener('click', cerrarEditar);
  modalEditar.addEventListener('click', (e) => { if (e.target === modalEditar) cerrarEditar(); });

  // Maneja el guardado de modificaciones (PATCH)
  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsgEditar.style.display = 'none';

    const id              = document.getElementById('edit-op-id').value;
    const nombre          = document.getElementById('edit-op-nombre').value.trim();
    const apellido        = document.getElementById('edit-op-apellido').value.trim();
    const dni             = document.getElementById('edit-op-dni').value.trim();
    const fechaNacimiento = document.getElementById('edit-op-fecha-nacimiento').value;
    const telefono        = document.getElementById('edit-op-telefono').value.trim();
    const zonaId          = document.getElementById('edit-op-zona').value;

    const btnGuardar = document.getElementById('btn-edit-guardar');
    const originalText = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const bodyData = {
      nombre,
      apellido,
      dni:              dni || null,
      fecha_nacimiento: fechaNacimiento || null,
      telefono:         telefono || null,
      zona_id:          zonaId ? parseInt(zonaId) : null
    };

    try {
      await requestAPI(`/api/operadores/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(bodyData)
      });

      cerrarEditar();
      loadOperadores();
    } catch (err) {
      console.error(err);
      errorMsgEditar.textContent = `⚠️ ${err.message || 'Error al modificar el operador'}`;
      errorMsgEditar.style.display = 'block';
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = originalText;
    }
  });
}



// Mitigación de inyecciones XSS en nombres o datos cargados por teclado
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
