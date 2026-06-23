# Guía de Instalación Completa — TrashFlow

Este documento detalla los requisitos, pasos y configuraciones necesarias para desplegar el proyecto **TrashFlow** (panel web municipal de detección de basura con Inteligencia Artificial) en un entorno de desarrollo con Windows.

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes en tu sistema con sus versiones recomendadas:

*   **Sistema Operativo**: Windows 10 o Windows 11 (64-bit).
*   **Miniconda / Anaconda**: Versión recomendada con soporte para **Python 3.10**.
*   **XAMPP**: Servidor local con **MySQL 10.4 (MariaDB)** y **PHP 8.2** (XAMPP se utiliza únicamente para levantar el motor de base de datos MySQL y opcionalmente servir la web).
*   **Visual Studio Code**: IDE recomendado con la extensión oficial de **Python** (Microsoft) instalada.
*   **Web Browser**: Google Chrome o Mozilla Firefox (con soporte para desarrollo local).

---

## 2. Paso a Paso: Clonar y Descomprimir

1.  Si el proyecto está comprimido en un archivo `.zip`, descomprímelo directamente dentro del directorio de publicación de tu servidor local XAMPP:
    ```text
    C:\xampp\htdocs\dashboard\TrashFlow-PRESENTACION
    ```
2.  Abre Visual Studio Code e importa la carpeta anterior (`TrashFlow-PRESENTACION`) seleccionando la opción **Archivo > Abrir carpeta...**.

---

## 3. Crear y Activar el Entorno Conda

Para evitar conflictos de librerías, utilizaremos un entorno aislado de Anaconda/Miniconda llamado `basuraia`:

1.  Abre la terminal CMD de Windows (Command Prompt) o la terminal integrada de VS Code.
2.  Crea el entorno de Python con la versión exacta **3.10**:
    ```cmd
    conda create --name basuraia python=3.10 -y
    ```
3.  Activa el entorno conda ejecutando:
    ```cmd
    conda activate basuraia
    ```
    *Nota: Si estás usando CMD estándar de Windows y no detecta el comando, puedes activarlo buscando "Anaconda Prompt" desde el menú inicio o bien ejecutando:*
    ```cmd
    C:\Users\TU_USUARIO\miniconda3\Scripts\activate.bat basuraia
    ```
    *(Verifica que al principio de tu terminal figure la etiqueta `(basuraia)`).*

---

## 4. Instalar las Dependencias del Proyecto

El backend de la API y el detector de IA requieren diversas dependencias especificadas en `api/requirements.txt`.
Para instalarlas, ejecuta el siguiente comando desde la raíz del proyecto con el entorno `basuraia` activado:

```cmd
pip install -r api/requirements.txt
```

Si por algún motivo no tienes el archivo `requirements.txt`, puedes instalar las librerías principales manualmente en lote:
```cmd
pip install tensorflow keras numpy opencv-python flask flask-jwt-extended flask-cors pymysql bcrypt requests python-dotenv
```

---

## 5. Configurar el Archivo `.env` (Variables de Entorno)

1.  En el directorio raíz del proyecto (o dentro del directorio `api/`), asegúrate de crear un archivo de texto llamado exactamente `.env`. Puedes duplicar el archivo `.env.example` provisto.
2.  Modifica los valores del archivo según tu entorno local. A continuación, se presenta un **ejemplo completo**:

```ini
# --- Configuración del Servidor Flask (Backend) ---
# Claves secretas de cifrado (usa cadenas largas y complejas en producción)
SECRET_KEY=clave_secreta_local_para_sesion_flask_desarrollo
JWT_SECRET_KEY=clave_secreta_jwt_muy_larga_y_robusta_para_firmar_tokens_12345

# --- Configuración de Base de Datos MySQL (XAMPP por defecto) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=trashflow

# --- Configuración del Detector de IA (modelo/detector.py) ---
# ID y Token secreto para que la cámara sea autenticada por la API Flask
CAMARA_ID=1
CAMARA_TOKEN=token_camara_1_aqui

# Ubicación geográfica de la cámara para ubicarla en el mapa interactivo
CAMARA_LATITUD=-34.5250000
CAMARA_LONGITUD=-58.4730000

# URL absoluta del backend para la transmisión de detecciones e imágenes
API_URL=http://localhost:5000
```

---

## 6. Importar la Base de Datos en phpMyAdmin

1.  Inicia el panel de control de **XAMPP Control Panel**.
2.  Haz clic en el botón **Start** junto al módulo **MySQL**. *(Nota: No es necesario iniciar Apache si usarás el servidor web embebido de Flask o VS Code, pero sí es necesario para entrar a phpMyAdmin).*
3.  Abre tu navegador y accede a: [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
4.  Crea una nueva base de datos llamada exactamente **`trashflow`**:
    *   Haz clic en "Nueva" en el panel izquierdo.
    *   Escribe `trashflow` como nombre.
    *   Selecciona el cotejamiento `utf8mb4_unicode_ci` y presiona **Crear**.
5.  Una vez creada la base de datos `trashflow`, selecciónala en la barra lateral izquierda y haz clic en la pestaña **Importar** (en el menú superior).
6.  Selecciona el archivo SQL ubicado en la ruta:
    ```text
    C:\xampp\htdocs\dashboard\TrashFlow-PRESENTACION\base_de_datos\trashflow.sql
    ```
7.  Desplázate hacia el final de la página y presiona el botón **Importar** o **Continuar**.
8.  Verifica que las tablas (alertas, camaras, usuarios, roles, sesiones, etc.) se hayan creado correctamente.

---

## 7. Ejecución del Proyecto

### Paso A: Levantar la API Flask (Backend) desde VS Code o Terminal
La API actúa como servidor de servicios de datos, seguridad, notificaciones y almacenamiento de fotos.

1.  Abre una terminal integrada en VS Code con el entorno `basuraia` activo.
2.  Navega a la carpeta de la API:
    ```cmd
    cd api
    ```
3.  Corre el servidor Flask:
    ```cmd
    python app.py
    ```
    *El backend estará disponible escuchando peticiones en: [http://localhost:5000](http://localhost:5000).*

### Paso B: Correr el Modelo de IA (Cámara en Vivo)
El script `main.py` permite entrenar el modelo CNN desde cero, mientras que `detector.py` utiliza la webcam para monitorear incidentes.

*   **Para entrenar el modelo** (asegúrate de que haya imágenes de entrenamiento en `modelo/entrenamiento/`):
    ```cmd
    cd modelo
    python main.py
    ```
*   **Para correr el detector en tiempo real**:
    ```cmd
    cd modelo
    python detector.py
    ```
    *(Presiona **Q** para cerrar la ventana del detector de la cámara web).*

### Paso C: Acceder al Panel Web (Frontend) desde XAMPP
Dado que la aplicación está alojada en la carpeta `htdocs` de XAMPP, el acceso local a la interfaz web es sumamente sencillo:

1.  Inicia el módulo **Apache** en tu panel de control de XAMPP.
2.  Abre tu navegador de preferencia.
3.  Ingresa a la siguiente dirección URL:
    ```text
    http://localhost/TrashFlow-PRESENTACION/index.html
    ```
4.  El sistema te redirigirá automáticamente a la pantalla de inicio de sesión (`web/paginas/login.html`).
5.  **Credenciales de Acceso por Defecto**:
    *   **Email**: `admin@trashflow.com`
    *   **Contraseña**: `admin`

---

## 8. Resolución de Problemas y Errores Comunes (Troubleshooting)

### Error 422 (Unprocessable Entity)
*   **Causa**: La API recibió una solicitud que no cumple con el formato correcto o con los encabezados requeridos (por ejemplo, falta el token JWT en las peticiones autorizadas, o la firma del token no coincide con `JWT_SECRET_KEY`).
*   **Solución**:
    1.  Cierra sesión en el panel web y vuelve a iniciarla para refrescar el token local en `localStorage`.
    2.  Verifica que tu archivo `.env` tenga la variable `JWT_SECRET_KEY` configurada correctamente y que coincida en el servidor donde corre `app.py`.
    3.  Asegúrate de que el detector esté enviando el encabezado `X-Camera-Token` con el valor exacto configurado en la base de datos para esa cámara.

### Error de Conexión a Base de Datos (BD no conecta)
*   **Causa**: El servidor Flask no logra entablar conexión con el motor de base de datos MySQL de XAMPP.
*   **Solución**:
    1.  Verifica en el panel de XAMPP que el módulo MySQL tenga el semáforo en **Verde** y no se haya cerrado automáticamente por un conflicto de puertos.
    2.  Asegúrate de que el puerto configurado en el archivo `.env` (`DB_PORT=3306`) coincida con el puerto activo de MySQL en XAMPP.
    3.  Confirma que el usuario (`DB_USER=root`) y contraseña (`DB_PASSWORD=`) coincidan con los accesos locales.

### Token Inválido o Expirado
*   **Causa**: La sesión del administrador ha superado el tiempo de validez de 8 horas configurado en las variables de expiración JWT.
*   **Solución**:
    1.  El sistema te expulsará automáticamente a la pantalla de `login.html`. Vuelve a ingresar tus credenciales.
    2.  Si sigues experimentando el error inmediatamente después de loguearte, borra el historial de navegación / cookies locales de `localhost` para vaciar el `localStorage` remanente.