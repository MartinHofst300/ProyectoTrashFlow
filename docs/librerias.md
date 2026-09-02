# Documentación de Librerías y Dependencias — TrashFlow

Este documento describe de forma detallada las librerías de terceros, frameworks y componentes de software utilizados en el **Backend (Python)**, la **Inteligencia Artificial (YOLOv8)** y el **Frontend (JavaScript)** del proyecto **TrashFlow**.

---

## 1. Librerías de Python (Backend & Inteligencia Artificial)

### Flask
*   **Versión**: `2.2.x` o superior
*   **Propósito en TrashFlow**: Micro-framework web utilizado para construir y exponer la API REST de la aplicación. Recibe las peticiones HTTP del panel web, gestiona las cargas multipart/form-data (subida de imágenes de evidencia) y provee los endpoints del panel de control.
*   **Por qué se eligió**: Por su ligereza, versatilidad y facilidad para integrarse de forma nativa con scripts de visión artificial (OpenCV y PyTorch/YOLOv8) sin sobrecargar los recursos del sistema.
*   **Métodos principales utilizados**:
    *   `Flask(__name__)`: Crea la instancia principal de la aplicación.
    *   `Blueprint()`: Moduliza las rutas de la API en archivos separados (`alertas.py`, `auth.py`, `camaras.py`, etc.).
    *   `request.get_json()` / `request.files`: Recupera parámetros JSON y archivos de imagen cargados en las peticiones.
    *   `jsonify()`: Serializa las respuestas en formato JSON estructurado.

### Flask-CORS
*   **Versión**: `3.0.x` o superior
*   **Propósito en TrashFlow**: Habilita el Intercambio de Recursos de Origen Cruzado (CORS), permitiendo al panel frontend vanilla conectarse al backend de Flask en caso de que corran en puertos o dominios locales distintos (ej: XAMPP en puerto 80 y Flask en puerto 5000).
*   **Por qué se eligió**: Evita las restricciones de seguridad impuestas por la política del mismo origen (Same-Origin Policy) en navegadores web modernos durante el desarrollo local.
*   **Métodos principales utilizados**:
    *   `CORS(app, origins=[...])`: Modifica los encabezados de respuesta para autorizar el acceso del frontend.

### Flask-JWT-Extended
*   **Versión**: `4.4.x` o superior
*   **Propósito en TrashFlow**: Administra la autenticación sin estado en la API mediante JSON Web Tokens (JWT). Proteje los endpoints sensibles y asegura que solo operadores registrados con un token válido puedan registrar incidentes o realizar modificaciones.
*   **Por qué se eligió**: Provee un mecanismo robusto, seguro y escalable para la sesión de usuarios sin necesidad de guardar estados de sesión en la base de datos (stateless).
*   **Métodos principales utilizados**:
    *   `create_access_token(identity, additional_claims)`: Genera firmas digitales únicas para los usuarios tras loguearse correctamente.
    *   `@jwt_required()`: Decorador de Flask que protege endpoints, validando la firma del token enviado en las cabeceras.
    *   `get_jwt_identity()`: Extrae el identificador del usuario autenticado que realiza la petición.

### PyMySQL
*   **Versión**: `1.0.x` o superior
*   **Propósito en TrashFlow**: Driver/Conector que permite a Python comunicarse con la base de datos MariaDB/MySQL de XAMPP mediante sentencias SQL estándar.
*   **Por qué se eligió**: Es una biblioteca escrita puramente en Python que no requiere dependencias pesadas de compilación en el sistema y es compatible con el motor de base de datos de XAMPP de forma nativa.
*   **Métodos principales utilizados**:
    *   `pymysql.connect()`: Establece la conexión física con la base de datos.
    *   `cursor.execute(query, params)`: Envía consultas parametrizadas de lectura y escritura al motor de base de datos.
    *   `connection.commit()` / `connection.rollback()`: Confirma transacciones de escritura o revierte los cambios ante errores de SQL.

### bcrypt
*   **Versión**: `4.0.x` o superior
*   **Propósito en TrashFlow**: Realiza el hashing y salting de contraseñas para los usuarios de la aplicación antes de guardarlas en la base de datos.
*   **Por qué se eligió**: Es el estándar de seguridad industrial para proteger credenciales. Al utilizar funciones hash de una sola vía robustas ante ataques de fuerza bruta, previene que se vulneren los accesos incluso si ocurre una filtración de la base de datos.
*   **Métodos principales utilizados**:
    *   `bcrypt.hashpw(password, salt)`: Hashea las contraseñas para su almacenamiento seguro.
    *   `bcrypt.checkpw(password, hashed_password)`: Valida la contraseña ingresada en texto plano comparándola con el hash almacenado al momento del inicio de sesión.

### python-dotenv
*   **Versión**: `0.21.x` o superior
*   **Propósito en TrashFlow**: Lee variables de configuración y credenciales del archivo local `.env` ubicado en la raíz del proyecto para exponerlas en el entorno de ejecución de Python.
*   **Por qué se eligió**: Facilita la aplicación del principio de desarrollo Twelve-Factor App, separando la configuración del código fuente para no exponer claves secretas en repositorios de código.
*   **Métodos principales utilizados**:
    *   `load_dotenv(env_path)`: Carga y mapea las variables de entorno en el script.

### requests
*   **Versión**: `2.28.x` o superior
*   **Propósito en TrashFlow**: Gestor de peticiones HTTP en el script cliente del detector para comunicarse de manera remota con el backend Flask.
*   **Por qué se eligió**: Posee una sintaxis simple y limpia para realizar llamadas de red de forma asíncrona o sincrónica en scripts de segundo plano.
*   **Métodos principales utilizados**:
    *   `requests.get(url, timeout)`: Comprueba la disponibilidad de la API REST.
    *   `requests.post(url, headers, data, files, timeout)`: Envía peticiones multipart/form-data subiendo el reporte del incidente y la foto de evidencia tomada por la cámara web al servidor.

### ultralytics (YOLOv8) — *NUEVA*
*   **Versión**: `8.4.x` o superior
*   **Propósito en TrashFlow**: Es el motor principal de Inteligencia Artificial y Visión Computarizada. Se encarga de procesar los frames de la cámara y realizar la detección de objetos (localización y clasificación de bolsas de basura).
*   **Por qué se eligió**: YOLOv8n (Nano) es un modelo de última generación extremadamente liviano y optimizado. A diferencia de las redes neuronales convolucionales (CNN) binarias clásicas, YOLOv8n es capaz de procesar múltiples detecciones concurrentes en tiempo real directamente sobre la CPU del dispositivo, entregando las bounding boxes de cada objeto detectado de manera eficiente.
*   **Instalación automatizada**: Al instalar `ultralytics`, se instalan automáticamente sus dependencias críticas:
    *   `torch` y `torchvision` (PyTorch - Framework de Deep Learning subyacente).
    *   `numpy` (Operaciones numéricas matriciales).
    *   `opencv-python` (Procesamiento de imágenes y transmisión de video).
*   **Métodos principales utilizados**:
    *   `YOLO(model_path)`: Carga los pesos del modelo entrenado (`bolsas_yolo.pt`).
    *   `model.predict(frame, verbose=False)`: Realiza la inferencia del modelo directamente sobre la matriz de imagen capturada por OpenCV.
    *   `results[0].boxes`: Contiene la información espacial de las predicciones del frame.
    *   `box.xyxy[0]`: Coordenadas del rectángulo de detección `[x_min, y_min, x_max, y_max]`.
    *   `box.conf[0]`: Valor de confianza decimal de la predicción (ej: `0.85`).

### opencv-python (cv2)
*   **Versión**: `4.7.x` o superior (instalado por ultralytics)
*   **Propósito en TrashFlow**: Controla la entrada y salida de datos del flujo de video. Captura los frames desde la webcam, dibuja las anotaciones de las cajas delimitadoras de YOLOv8n en pantalla y expone la ventana visual de monitoreo en el daemon.
*   **Actualización del comportamiento**: A diferencia de la versión anterior que requería redimensionar los frames a escala de grises y convertirlos a 64x64 píxeles para la CNN clásica, el nuevo pipeline de YOLOv8n recibe los frames directamente a color en formato BGR.
*   **Métodos principales utilizados**:
    *   `cv2.VideoCapture(0)`: Inicia y controla la captura de la webcam predeterminada.
    *   `cv2.rectangle(img, pt1, pt2, color, thickness)`: Dibuja las cajas delimitadoras (bounding boxes) sobre los objetos detectados con confianza $\ge 0.60$.
    *   `cv2.putText(img, text, org, fontFace, fontScale, color, thickness)`: Escribe los porcentajes de confianza encima de cada caja y el estado de monitoreo/alertas en el panel de OpenCV.
    *   `cv2.imshow(winname, mat)`: Renderiza de manera interactiva la ventana del reproductor de video de la cámara web.
    *   `cv2.imwrite(filename, img)`: Almacena los frames anotados en formato JPEG para guardarlos como evidencia de la alerta.

---

## 2. Librerías de JavaScript (Frontend & Panel Web)

### Leaflet.js
*   **Versión**: `1.9.4` (Importado vía CDN en el frontend)
*   **Propósito en TrashFlow**: Renderiza el mapa geográfico interactivo de Vicente López (`mapa.html`), dibuja las marcas de posicionamiento GPS (pines) de las cámaras activas y las alertas detectadas de forma interactiva.
*   **Por qué se eligió**: Es la biblioteca de código abierto para mapas más ligera y rápida. No requiere de tokens comerciales ni pasarelas de pago de terceros, facilitando un despliegue sin costos asociados.
*   **Métodos principales utilizados**:
    *   `L.map(id)`: Inicializa el canvas del mapa en el contenedor HTML definido.
    *   `L.tileLayer(url)`: Carga las teselas del mapa de OpenStreetMap.
    *   `L.marker([lat, lng], {icon})`: Inserta pines georreferenciados dinámicamente según la respuesta JSON de la API.
    *   `L.markerClusterGroup()`: Agrupa pines muy cercanos en un solo clúster para no ralentizar el navegador cuando existen múltiples alertas concurrentes.

### Chart.js
*   **Versión**: `4.x` (Importado vía CDN en el frontend)
*   **Propósito en TrashFlow**: Renderiza los reportes estadísticos visuales en el panel principal (`dashboard.html`), dibujando gráficos interactivos de líneas (evolución de alertas en la semana) y gráficos de dona/pastel (alertas por zonas y estados de resolución).
*   **Por qué se eligió**: Permite generar gráficos adaptables (responsivos), interactivos y altamente personalizables con animaciones fluidas y bajo impacto en el rendimiento de la CPU del cliente.
*   **Métodos principales utilizados**:
    *   `new Chart(canvas_ctx, config)`: Construye e inicializa el gráfico correspondiente asociándolo a un lienzo HTML5 Canvas.
