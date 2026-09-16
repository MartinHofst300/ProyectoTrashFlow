/**
 * TrashFlow — Sistema de Monitoreo de Residuos Urbano
 * 
 * Archivo: configuracion.js
 * Descripción: Manejo de preferencias de accesibilidad, tamaño de fuente global,
 *              modos de tema (Dark, OLED, Light), colores de acento personalizados,
 *              identidad municipal, avisos de guardia y notificaciones.
 * 
 * Regla: Los cambios se preparan en pantalla y SOLO se aplican y guardan globalmente
 *        al presionar el botón "Guardar Configuración".
 */

const DEFAULT_SETTINGS = {
  fontSize: 14,
  density: 'normal',
  themeMode: 'dark',
  accentColor: '#60B7BA',
  borderRadius: 'round',
  highContrast: false,
  soundAlert: true,
  browserNotif: false,
  refreshRate: '30',
  defaultZone: 'todas'
};

const DEFAULT_MUNICIPALITY_NAME = 'Municipalidad de Vicente López';

// Estado temporal en formulario (staging)
let stagedSettings = { ...DEFAULT_SETTINGS };
let stagedMunicipalityName = DEFAULT_MUNICIPALITY_NAME;

document.addEventListener('DOMContentLoaded', () => {
  // Asegurar limpieza de claves de logo custom anteriores
  localStorage.removeItem('trashflow_custom_logo');

  loadConfigurationState();
  initUserInfo();
  initMunicipalityCustomizer();
  initThemeModes();
  initColorPickers();
  initBorderRadiusSelector();
  initFontSizePicker();
  initDensityPicker();
  initHighContrastToggle();
  initNotificationToggles();
  initActionButtons();
});

/**
 * Carga las configuraciones guardadas en localStorage al formulario
 */
function loadConfigurationState() {
  // 1. Configuración general
  try {
    const rawSettings = localStorage.getItem('trashflow_settings');
    if (rawSettings) {
      stagedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
    } else {
      stagedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch (e) {
    console.warn('Error leyendo configuraciones:', e);
    stagedSettings = { ...DEFAULT_SETTINGS };
  }

  // 2. Nombre del municipio
  const savedMuni = localStorage.getItem('trashflow_municipality_name');
  stagedMunicipalityName = savedMuni || DEFAULT_MUNICIPALITY_NAME;

  // Reflejar en la UI
  renderSettingsToForm();
}

/**
 * Renderiza el estado actual de staging en los controles del formulario
 */
function renderSettingsToForm() {
  // 1. Nombre Municipal
  const muniInput = document.getElementById('input-municipality-name');
  if (muniInput) muniInput.value = stagedMunicipalityName;

  // 2. Modos de Tema (Dark, OLED, Light)
  document.querySelectorAll('.theme-mode-card').forEach(card => {
    const theme = card.dataset.theme;
    const radio = card.querySelector('input[type="radio"]');
    if (theme === stagedSettings.themeMode) {
      card.classList.add('active');
      if (radio) radio.checked = true;
    } else {
      card.classList.remove('active');
      if (radio) radio.checked = false;
    }
  });

  // 3. Paleta de Color y Picker Personalizado
  document.querySelectorAll('.swatch-btn').forEach(btn => {
    if (btn.dataset.color.toLowerCase() === (stagedSettings.accentColor || '').toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  const colorPicker = document.getElementById('custom-color-picker');
  if (colorPicker) colorPicker.value = stagedSettings.accentColor || '#60B7BA';

  // 4. Estilo de Bordes
  const borderSelect = document.getElementById('select-border-radius');
  if (borderSelect) borderSelect.value = stagedSettings.borderRadius || 'round';

  // 5. Tamaño de Fuente
  document.querySelectorAll('.font-size-opt').forEach(btn => {
    const size = parseInt(btn.dataset.size);
    if (size === stagedSettings.fontSize) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateFontPreview(stagedSettings.fontSize);

  // 6. Densidad
  const densityRadio = document.querySelector(`input[name="density"][value="${stagedSettings.density}"]`);
  if (densityRadio) densityRadio.checked = true;

  // 7. Alto contraste
  const contrastCheck = document.getElementById('check-high-contrast');
  if (contrastCheck) contrastCheck.checked = !!stagedSettings.highContrast;

  // 8. Notificaciones y Guardia
  const soundCheck = document.getElementById('check-sound-alert');
  if (soundCheck) soundCheck.checked = !!stagedSettings.soundAlert;

  const notifCheck = document.getElementById('check-browser-notif');
  if (notifCheck) notifCheck.checked = !!stagedSettings.browserNotif;

  const refreshSelect = document.getElementById('select-refresh-rate');
  if (refreshSelect) refreshSelect.value = stagedSettings.refreshRate || '30';

  const zoneSelect = document.getElementById('select-default-zone');
  if (zoneSelect) zoneSelect.value = stagedSettings.defaultZone || 'todas';
}

/**
 * Personalizador de Identidad Municipal
 */
function initMunicipalityCustomizer() {
  const muniInput = document.getElementById('input-municipality-name');
  if (muniInput) {
    muniInput.addEventListener('input', (e) => {
      stagedMunicipalityName = e.target.value.trim() || DEFAULT_MUNICIPALITY_NAME;
    });
  }
}

/**
 * Modos de Tema Visual (Dark, OLED Midnight, Light)
 */
function initThemeModes() {
  const cards = document.querySelectorAll('.theme-mode-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      stagedSettings.themeMode = card.dataset.theme;
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });
}

/**
 * Paleta de Colores de Acento y Selector HEX libre
 */
function initColorPickers() {
  const swatches = document.querySelectorAll('.swatch-btn');
  const colorPicker = document.getElementById('custom-color-picker');

  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      swatches.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      stagedSettings.accentColor = btn.dataset.color;
      if (colorPicker) colorPicker.value = btn.dataset.color;
    });
  });

  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      stagedSettings.accentColor = e.target.value;
      swatches.forEach(btn => {
        if (btn.dataset.color.toLowerCase() === e.target.value.toLowerCase()) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });
  }
}

/**
 * Selector de estilo de radio de bordes
 */
function initBorderRadiusSelector() {
  const select = document.getElementById('select-border-radius');
  if (select) {
    select.addEventListener('change', (e) => {
      stagedSettings.borderRadius = e.target.value;
    });
  }
}

/**
 * Selector de tamaño de fuente
 */
function initFontSizePicker() {
  const buttons = document.querySelectorAll('.font-size-opt');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const size = parseInt(btn.dataset.size);
      stagedSettings.fontSize = size;
      updateFontPreview(size);
    });
  });
}

function updateFontPreview(size) {
  const preview = document.getElementById('font-preview-box');
  if (preview) {
    preview.style.fontSize = `${size}px`;
  }
}

/**
 * Selector de densidad
 */
function initDensityPicker() {
  const radios = document.querySelectorAll('input[name="density"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        stagedSettings.density = radio.value;
      }
    });
  });
}

/**
 * Toggle de alto contraste
 */
function initHighContrastToggle() {
  const check = document.getElementById('check-high-contrast');
  if (check) {
    check.addEventListener('change', () => {
      stagedSettings.highContrast = check.checked;
    });
  }
}

/**
 * Toggles de avisos sonoros y notificaciones de escritorio
 */
function initNotificationToggles() {
  const soundCheck = document.getElementById('check-sound-alert');
  if (soundCheck) {
    soundCheck.addEventListener('change', () => {
      stagedSettings.soundAlert = soundCheck.checked;
      if (soundCheck.checked) {
        playTestBeep();
      }
    });
  }

  const notifCheck = document.getElementById('check-browser-notif');
  if (notifCheck) {
    notifCheck.addEventListener('change', async () => {
      if (notifCheck.checked) {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification('TrashFlow — Notificaciones Activas', {
              body: 'Recibirá alertas de acumulación de residuos en tiempo real.',
              icon: '../assets/isotipo.png'
            });
            stagedSettings.browserNotif = true;
          } else {
            alert('El permiso para notificaciones fue denegado en el navegador.');
            notifCheck.checked = false;
          }
        } else {
          alert('Este navegador no soporta notificaciones de escritorio.');
          notifCheck.checked = false;
        }
      } else {
        stagedSettings.browserNotif = false;
      }
    });
  }

  const refreshSelect = document.getElementById('select-refresh-rate');
  if (refreshSelect) {
    refreshSelect.addEventListener('change', () => {
      stagedSettings.refreshRate = refreshSelect.value;
    });
  }

  const zoneSelect = document.getElementById('select-default-zone');
  if (zoneSelect) {
    zoneSelect.addEventListener('change', () => {
      stagedSettings.defaultZone = zoneSelect.value;
    });
  }
}

/**
 * Muestra información del operador / admin conectado
 */
function initUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem('trashflow_user') || '{}');
    const nameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-display-email');

    if (nameEl && user.nombre) nameEl.textContent = user.nombre;
    if (emailEl && user.email) emailEl.textContent = user.email;
  } catch (e) {
    console.warn('Error leyendo usuario:', e);
  }
}

/**
 * Emite un beep sintético suave para prueba sonora
 */
function playTestBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    console.warn('AudioContext no soportado:', e);
  }
}

/**
 * Botones de Guardar y Restablecer
 */
function initActionButtons() {
  const btnSave = document.getElementById('btn-save-settings');
  const btnReset = document.getElementById('btn-reset-settings');

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      // 1. Guardar configuraciones generales
      localStorage.setItem('trashflow_settings', JSON.stringify(stagedSettings));

      // 2. Guardar nombre institucional del municipio
      const muniInput = document.getElementById('input-municipality-name');
      const finalMuniName = muniInput ? muniInput.value.trim() || DEFAULT_MUNICIPALITY_NAME : stagedMunicipalityName;
      localStorage.setItem('trashflow_municipality_name', finalMuniName);

      // Limpiar logo custom por si existía previamente
      localStorage.removeItem('trashflow_custom_logo');

      // 3. Aplicar los cambios en el documento actual y actualizar barras comunes
      if (typeof applySavedSettings === 'function') {
        applySavedSettings();
      }
      if (typeof initSidebar === 'function') {
        initSidebar();
      }
      if (typeof initTopbar === 'function') {
        initTopbar();
      }

      showToast('Configuraciones y preferencias guardadas con éxito.', 'success');
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('¿Desea restablecer todas las preferencias a sus valores predeterminados?')) {
        stagedSettings = { ...DEFAULT_SETTINGS };
        stagedMunicipalityName = DEFAULT_MUNICIPALITY_NAME;

        localStorage.setItem('trashflow_settings', JSON.stringify(DEFAULT_SETTINGS));
        localStorage.setItem('trashflow_municipality_name', DEFAULT_MUNICIPALITY_NAME);
        localStorage.removeItem('trashflow_custom_logo');

        renderSettingsToForm();

        if (typeof applySavedSettings === 'function') {
          applySavedSettings();
        }
        if (typeof initSidebar === 'function') {
          initSidebar();
        }
        if (typeof initTopbar === 'function') {
          initTopbar();
        }

        showToast('Preferencias restablecidas por defecto.', 'info');
      }
    });
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
