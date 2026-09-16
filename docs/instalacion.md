Guía de Instalación — TrashFlow (Panel Web + API)

Cubre la instalación y puesta en marcha del panel web y el backend Flask en un entorno Windows limpio. (La parte del detector con cámara — YOLOv8, selección de dispositivo, etc. — se documenta en una guía aparte más adelante.)

1. Requisitos previos

Instalá esto en orden, antes de tocar el proyecto:

XAMPP — versión 8.2.x exacta. Descargar de apachefriends.org.
No usar 8.3+: trae MariaDB 10.6+ que puede dar incompatibilidades.
Instalar en la ruta default C:\xampp\ — no cambiarla.
Miniconda — instalador Windows 64-bit desde docs.conda.io.
Durante la instalación, tildar "Add Miniconda3 to my PATH environment variable" (aunque diga "not recommended" — lo necesitás para que conda funcione en la terminal de VS Code).
Tildar también "Register Miniconda3 as my default Python".
Python: NO instalar por separado desde python.org. Miniconda lo maneja solo. Si ya tenés una instalación de Python independiente en el sistema, puede generar conflictos.
VS Code — code.visualstudio.com
Extensión de Python para VS Code (la oficial de Microsoft, buscala en la pestaña Extensions).
Git (opcional) — solo si vas a clonar el repo en vez de usar el .zip.
1.1. URLs y accesos de referencia rápida
Componente	URL / Ruta
Panel Web (Frontend)	http://localhost/dashboard/TrashFlow-PRESENTACION/index.html
API Flask (Backend)	http://localhost:5000
phpMyAdmin	http://localhost/phpmyadmin

Login por defecto: admin@trashflow.com / admin

2. Ubicar el proyecto

Descomprimí o copiá la carpeta del proyecto directamente en:

C:\xampp\htdocs\dashboard\TrashFlow-PRESENTACION\

Después, en VS Code: Archivo > Abrir carpeta... y seleccioná esa ruta.

3. Crear el entorno conda
Abrí Anaconda Prompt (buscalo en el menú de inicio de Windows — para este paso, no la terminal de VS Code).
Si es la primera vez que usás conda en esa PC, puede tirarte este error al intentar crear el entorno:
   CondaToSNonInteractiveError: Terms of Service have not been accepted...

Se soluciona corriendo esto una sola vez:

cmd
   conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
   conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r
   conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/msys2
Creá el entorno con Python 3.11 exacto (otras versiones dan problemas de compatibilidad con ultralytics/torch cuando lleguemos a esa parte):
cmd
   conda create --name basuraia python=3.11 -y
Activalo:
cmd
   conda activate basuraia

Deberías ver (basuraia) al principio de la línea de comandos.

4. Dejar conda disponible en la terminal de VS Code

Por default, la terminal integrada de VS Code no reconoce conda aunque ya lo hayas instalado — es una sesión distinta a la de Anaconda Prompt. Si corrés conda create o conda activate ahí y te tira:

"conda" no se reconoce como un comando interno o externo...

Solucionalo una sola vez, desde el Anaconda Prompt:

cmd
conda init cmd.exe

Cerrá VS Code por completo y volvelo a abrir. A partir de ahí, cualquier terminal nueva que abras dentro de VS Code va a reconocer conda sin problema.

Si preferís seguir usando PowerShell en vez de CMD, corré también conda init powershell. Si aun así PowerShell bloquea la activación por política de ejecución, abrilo como administrador y corré: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

5. Seleccionar el intérprete correcto en VS Code

Activar el entorno en la terminal no alcanza: VS Code necesita saber por separado qué intérprete de Python usar para el resaltado de sintaxis, el linter y la ejecución/debug.

Ctrl + Shift + P → escribí Python: Select Interpreter → Enter.
Buscá el que corresponda a basuraia. La ruta debería verse así:
   C:\Users\TU_USUARIO\miniconda3\envs\basuraia\python.exe
Si no aparece en la lista:
Primero, andá a una terminal y corré conda activate basuraia una vez — a veces con que el entorno haya estado activo una vez en una terminal alcanza para que VS Code lo detecte al reabrir el selector.
Si sigue sin aparecer, elegí "Escriba la ruta de acceso del intérprete..." y pegá la ruta manualmente (la de arriba, con tu usuario de Windows).

Importante: si VS Code queda usando el Python global del sistema en vez de basuraia, vas a tener errores de ModuleNotFoundError aunque hayas instalado todo bien — porque técnicamente instalaste las librerías en el entorno equivocado (o en el correcto, pero VS Code está mirando otro).

6. Instalar las dependencias de Python

Con (basuraia) activo en la terminal:

cmd
pip install -r api/requirements.txt

ultralytics tarda varios minutos porque descarga PyTorch y sus componentes (~800MB). Es normal, no lo interrumpas ni pienses que se colgó. No hace falta instalar tensorflow, keras ni numpy a mano — el detector YOLOv8n no los usa y las dependencias se resuelven solas.

Respaldo de versiones (hacer una vez que todo funcione)
cmd
pip freeze > api/requirements_versiones.txt

Esto guarda las versiones exactas que sabemos que funcionan. Si en una instalación nueva algo falla después de pip install -r api/requirements.txt, probá con:

cmd
pip install -r api/requirements_versiones.txt

No reemplaces requirements.txt por este archivo — son cosas distintas. Regenerá requirements_versiones.txt cada vez que instales o actualices una librería.

7. Configurar el archivo .env
En la raíz del proyecto, copiá .env.example y renombralo a .env.
Completalo así:
ini
# --- Claves de seguridad Flask ---
SECRET_KEY=tu_clave_secreta_super_segura
JWT_SECRET_KEY=clave_muy_larga_para_jwt_de_al_menos_32_caracteres

# --- Carpeta donde se guardan las fotos de detecciones ---
# OJO: es una ruta relativa. Se resuelve relativa al directorio desde donde
# corrés "python app.py" (que según el paso 9 de esta guía es la carpeta api/).
# No la cambies salvo que sepas lo que estás haciendo.
UPLOAD_FOLDER=static/fotos/detecciones/

# --- Conexión a MySQL vía XAMPP ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=trashflow

# --- Detector (YOLOv8) — se usan más adelante, cuando conectemos cámara ---
# Por ahora podés dejar estos valores default: no afectan al panel web ni
# a la API. Se documentan en detalle en la guía del detector.
CAMARA_ID=1
CAMARA_TOKEN=token_camara_1_aqui
CAMARA_LATITUD=-34.5250000
CAMARA_LONGITUD=-58.4730000
API_URL=http://localhost:5000
Explicación variable por variable:
SECRET_KEY: clave interna de Flask. Cualquier texto largo sirve.
JWT_SECRET_KEY: firma los tokens de sesión. Tiene que tener mínimo 32 caracteres y ser igual en todas las computadoras donde corra el proyecto. Si cambia, todos los tokens ya emitidos dejan de ser válidos → error 401 Unauthorized al usar el panel.
UPLOAD_FOLDER: dónde Flask guarda físicamente las fotos de evidencia. No la toques a menos que entiendas la ruta relativa explicada arriba.
DB_PASSWORD: en XAMPP por defecto es vacía. Dejá la línea sin nada después del =.
CAMARA_TOKEN: tiene que coincidir exacto (mayúsculas, minúsculas, sin espacios) con la columna token_api de la tabla camaras en MySQL para la cámara id=1. Si no coincide, más adelante el detector va a tirar 401. Por ahora, con el valor default alcanza.
API_URL: dirección base del backend Flask. Si cambiás el puerto de Flask (ver troubleshooting, sección de puerto 5000), actualizala acá también.
8. Configuración de VS Code para leer el .env

Confirmá que exista el archivo .vscode/settings.json en el proyecto con:

json
{
  "python.terminal.useEnvFile": true
}

Si la terminal ya estaba abierta antes de crear el .env o de guardar esta configuración, cerrala (ícono del tacho de basura en el panel de terminal) y abrí una nueva — si no, VS Code no va a inyectar las variables y vas a tener errores raros de configuración faltante.

9. Importar la base de datos
Abrí XAMPP Control Panel.
Iniciá el módulo MySQL (botón Start) y también Apache (para poder usar phpMyAdmin).
Entrá desde el navegador a http://localhost/phpmyadmin.
Creá una base de datos nueva:
Clic en Nueva (barra lateral izquierda).
Nombre: trashflow.
Cotejamiento: utf8mb4_unicode_ci.
Crear.
Con la base seleccionada, andá a la pestaña Importar.
Elegí el archivo base_de_datos/trashflow.sql del proyecto.
Importar / Continuar.
Verificá que se hayan creado las tablas (alertas, camaras, usuarios, roles, etc.).
10. Levantar el proyecto
A. Backend Flask
Terminal de VS Code con (basuraia) activo.
cmd
cd api
python app.py
3. Tiene que mostrar algo como `Running on http://localhost:5000`.

### B. Panel Web
1. Confirmá que **Apache** esté iniciado en XAMPP.
2. Navegador → `http://localhost/dashboard/TrashFlow-PRESENTACION/index.html`
3. Te redirige a `login.html`. Entrá con `admin@trashflow.com` / `admin`.

---

## 11. Errores comunes y soluciones

### Puerto 5000 ocupado (Flask no arranca)
**Causa:** en Windows, el 5000 suele estar tomado por *AirPlay Receiver*, IIS, u otra instancia de Flask colgada.
**Diagnóstico:**
```cmd
netstat -ano | findstr :5000
```
Si devuelve un proceso, está ocupado.
**Solución:** en `api/app.py`, cambiá el `app.run()` final a otro puerto, ej. `app.run(port=5001)`, y actualizá `API_URL=http://localhost:5001` en el `.env`.

### Puerto 80 ocupado (Apache no inicia)
**Causa:** Skype, IIS u otro servidor web local usando el puerto 80.
**Solución A:** cerrar el programa que lo ocupa.
**Solución B:** cambiar el puerto de Apache — XAMPP Control Panel → Apache → **Config > httpd.conf** → cambiar `Listen 80` a `Listen 8080`. El panel pasa a `http://localhost:8080/dashboard/...`.

### Puerto 3306 ocupado (MySQL no inicia)
**Causa:** otra instancia de MySQL/MariaDB corriendo en el sistema.
**Solución:** XAMPP Control Panel → MySQL → **Config > my.ini** → cambiar `port=3306` a `port=3307`. Actualizar `DB_PORT=3307` en el `.env`.

### La terminal de VS Code no activa el entorno conda
**Causa:** PowerShell bloquea `conda activate` por política de ejecución, o falta el `conda init` del paso 4.
**Solución A (recomendada):** cambiar la terminal default a CMD — `Ctrl+Shift+P` → **`Terminal: Select Default Profile`** → **Command Prompt**. Cerrar la terminal vieja y abrir una nueva.
**Solución B:** conservar PowerShell pero habilitar el permiso (ver paso 4).
**Verificación:** siempre confirmá que figure `(basuraia)` al inicio de la línea. Si no está, Flask corre con el Python global y tira errores de importación.

### Error 401 Unauthorized en el login del panel
**Causa 1:** `JWT_SECRET_KEY` cambió y quedó un token viejo guardado en el navegador.
**Solución:** F12 → **Application > Local Storage > http://localhost** → borrar `trashflow_token`, `trashflow_rol`, `trashflow_user` → recargar y volver a loguear.
**Causa 2:** el `.env` no se inyectó en la terminal.
**Solución:** confirmar `.vscode/settings.json` (paso 8) y abrir terminal nueva.

### Error 422 Unprocessable Entity
**Causa:** token JWT corrupto o mal formateado en las cabeceras.
**Solución:** mismo procedimiento que el 401 — limpiar `localStorage` y volver a loguear.

### El panel carga pero no muestra alertas ni datos
**Causa:** la API Flask no está corriendo.
**Diagnóstico:** abrir `http://localhost:5000` directo en el navegador — si no responde, Flask está caído.
**Solución:** terminal con `(basuraia)` activo → `cd api` → `python app.py`.

### `ModuleNotFoundError` al correr Flask
**Causa:** entorno `basuraia` no activo, o VS Code usando el intérprete equivocado.
**Solución:** verificar `(basuraia)` en la terminal (paso 3) y el intérprete seleccionado (paso 5).

### La API no puede conectar con MySQL
**Causa:** MySQL no está corriendo en XAMPP, o las credenciales del `.env` no coinciden.
**Solución:** confirmar que MySQL esté en verde en XAMPP Control Panel, y que `.env` tenga `DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=root`, `DB_PASSWORD=` (vacío si es default de XAMPP).

### `conda activate` no se reconoce (fuera de VS Code)
**Causa:** Miniconda no está inicializado en esa terminal de Windows.
**Solución:** usar **Anaconda Prompt** directamente, o correr `conda init cmd.exe` / `conda init powershell` desde ahí y reiniciar la terminal.

---

## 12. Checklist final antes de mostrar el panel

- [ ] XAMPP: **MySQL** y **Apache** en verde.
- [ ] Base `trashflow` creada e importada en phpMyAdmin.
- [ ] `.env` creado en la raíz con todos los campos completos.
- [ ] `JWT_SECRET_KEY` cambiada del valor default (`"cambiar_esto_en_produccion"`).
- [ ] Entorno `(basuraia)` activo en la terminal de VS Code.
- [ ] Intérprete `basuraia` seleccionado en VS Code (paso 5).
- [ ] `python app.py` corriendo sin errores, mostrando `Running on http://localhost:5000`.
- [ ] Panel web abre en `http://localhost/dashboard/TrashFlow-PRESENTACION/index.html`.
- [ ] Login funciona con `admin@trashflow.com` / `admin`.
