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
  loadOperadores();         // Realiza la carga de la tabla de operarios
  initOperadoresModals();   // Inicializa los listeners de los modales de creación y edición
  initPasswordToggles();    // Habilita mostrar/ocultar contraseñas en los campos correspondientes
});

/**
 * Consulta a la API el listado de operadores de campo y los dibuja en la tabla.
 * Muestra el número de alertas actualmente asignadas a cada operario y su rendimiento diario.
 */
async function loadOperadores() {
  const tableBody = document.querySelector('#operadores-table tbody');
  if (!tableBody) return;

  try {
    const data = await requestAPI('/api/operadores');
    tableBody.innerHTML = '';

    // Maneja listado vacío
    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--color-text-secondary); padding: var(--spacing-xl) 0;">
            No se encontraron operadores de campo registrados.
          </td>
        </tr>
      `;
      return;
    }

    // Dibuja cada operario en filas de la tabla
    data.forEach(op => {
      const row = document.createElement('tr');
      const nombreCompleto = `${op.nombre} ${op.apellido}`;
      const telefono = op.telefono ? op.telefono : '<span style="color: var(--color-text-secondary); font-style: italic;">Sin registro</span>';
      
      // Estilos CSS para el badge de estado activo/inactivo
      const badgeClass = op.activo ? 'badge-activo' : 'badge-inactivo';
      const badgeText = op.activo ? 'Activo' : 'Inactivo';

      // Acciones rápidas según el estado actual
      const toggleEmoji = op.activo ? '🔴' : '🟢';
      const toggleTitle = op.activo ? 'Desactivar' : 'Activar';
      const nuevoEstado = op.activo ? 0 : 1;

      row.innerHTML = `
        <td style="font-weight: 600;">${escapeHTML(nombreCompleto)}</td>
        <td>${escapeHTML(op.email)}</td>
        <td>${telefono}</td>
        <td style="text-align: center;">
          <span class="badge-alertas-activas">${op.alertas_activas || 0}</span>
        </td>
        <td style="text-align: center; font-weight: 500;">${op.resueltas_hoy || 0}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>
          <div class="acciones-flex">
            <button class="btn btn-secondary btn-edit-op" onclick="openEditModal(${op.id})" title="Editar Operario">✏️</button>
            <button class="btn btn-secondary btn-toggle-op" onclick="toggleEstadoOperador(${op.id}, ${nuevoEstado})" title="${toggleTitle}">${toggleEmoji}</button>
            <button class="btn btn-secondary btn-delete-op" onclick="confirmDeleteOperador(${op.id}, '${escapeHTML(nombreCompleto)}')" title="Dar de baja">🗑️</button>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error al cargar operadores:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--color-danger); padding: var(--spacing-xl) 0;">
          ⚠️ Error al cargar operadores: ${escapeHTML(error.message || 'No se pudo conectar al servidor')}
        </td>
      </tr>
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
    
    document.getElementById('edit-op-id').value = op.id;
    document.getElementById('edit-op-nombre').value = op.nombre;
    document.getElementById('edit-op-apellido').value = op.apellido;
    document.getElementById('edit-op-email').value = op.email;
    document.getElementById('edit-op-telefono').value = op.telefono || '';
    document.getElementById('edit-op-password').value = ''; // Por seguridad la contraseña se deja en blanco

    modal.classList.add('active'); // Muestra el modal
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

  // Abre modal de alta de operario
  if (btnNuevo && modalCrear) {
    btnNuevo.addEventListener('click', () => {
      formCrear.reset();
      errorMsgCrear.style.display = 'none';
      modalCrear.classList.add('active');
    });
  }

  if (btnCancelarCrear) btnCancelarCrear.addEventListener('click', cerrarCrear);
  if (btnCloseCrear) btnCloseCrear.addEventListener('click', cerrarCrear);
  modalCrear.addEventListener('click', (e) => { if (e.target === modalCrear) cerrarCrear(); });

  // Maneja el guardado del nuevo operador (POST)
  formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsgCrear.style.display = 'none';

    const nombre = document.getElementById('op-nombre').value.trim();
    const apellido = document.getElementById('op-apellido').value.trim();
    const email = document.getElementById('op-email').value.trim();
    const telefono = document.getElementById('op-telefono').value.trim();
    const password = document.getElementById('op-password').value;

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
          email,
          telefono: telefono || null,
          password
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

    const id = document.getElementById('edit-op-id').value;
    const nombre = document.getElementById('edit-op-nombre').value.trim();
    const apellido = document.getElementById('edit-op-apellido').value.trim();
    const email = document.getElementById('edit-op-email').value.trim();
    const telefono = document.getElementById('edit-op-telefono').value.trim();
    const password = document.getElementById('edit-op-password').value;

    const btnGuardar = document.getElementById('btn-edit-guardar');
    const originalText = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const bodyData = {
      nombre,
      apellido,
      email,
      telefono: telefono || null
    };

    // Solo añade la contraseña al cuerpo del PATCH si el administrador escribió una nueva clave
    if (password && password.trim() !== '') {
      bodyData.password = password;
    }

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

/**
 * Controla la visualización interactiva de la contraseña en los formularios (mostrar/ocultar).
 */
function initPasswordToggles() {
  const setupToggle = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    if (btn && input) {
      btn.addEventListener('click', () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        const eyeIcon = btn.querySelector('svg');
        if (eyeIcon) {
          if (type === 'text') {
            eyeIcon.innerHTML = `
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            `;
          } else {
            eyeIcon.innerHTML = `
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
          }
        }
      });
    }
  };

  setupToggle('toggle-op-password', 'op-password');
  setupToggle('toggle-edit-op-password', 'edit-op-password');
}

// Mitigación de inyecciones XSS en nombres o datos cargados por teclado
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
