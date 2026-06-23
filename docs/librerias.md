# Documentación de Librerías y Dependencias — TrashFlow

Este documento describe detalladamente las librerías de software de terceros y frameworks utilizados tanto en el **Backend (Python)** como en el **Frontend (JavaScript)** del proyecto **TrashFlow**.

---

## 1. Librerías de Python (Backend & Inteligencia Artificial)

### Flask
*   **Versión**: `2.2.x` o superior
*   **Propósito específico en TrashFlow**: Es el framework web microservidor utilizado para estructurar y exponer la API REST del sistema. Recibe peticiones HTTP desde el panel web, maneja la carga de archivos multipart/form-data (fotos de evidencias de alertas), y enruta los endpoints de administración.
*   **Por qué se eligió**: Por su ligereza, versatilidad y facilidad para integrarse de forma nativa con scripts de Inteligencia Artificial (TensorFlow/Keras y OpenCV) sin sobrecargar la memoria del servidor.
*   **Métodos principales utilizados en el proyecto**:
    *   `Flask(__name__)`: Crea la instancia de la aplicación.
    *   `Blueprint()`: Mapea submódulos de rutas independientes (auth, alertas, operadores).
    *   `request.get_json()` / `request.files`: Recupera parámetros JSON y archivos multimedia subidos.
    *   `jsonify()`: Serializa las respuestas a formato JSON estructurado.

### flask-cors
*   **Versión**: `3.0.x` o superior
*   **Propósito específico en TrashFlow**: Habilita el Intercambio de Recursos de Origen Cruzado (CORS) permitiendo al panel frontend conectarse al backend de Flask en caso de que corran en puertos o dominios locales distintos (ej: XAMPP en puerto 80 y Flask en puerto 5000).
*   **Por qué se eligió**: Para mitigar las restricciones de seguridad por defecto de los navegadores web modernos al consumir APIs locales.
*   **Métodos principales utilizados en el proyecto**:
    *   `CORS(app, origins=[...])`: Configura las excepciones CORS de la aplicación Flask para permitir orígenes de desarrollo específicos.

### flask-jwt-extended
*   **Versión**: `4.4.x` o superior
*   **Propósito específico en TrashFlow**: Administra los tokens JSON Web Token (JWT) para la seguridad y control de acceso. Genera los tokens en el inicio de sesión y restringe las rutas privadas a operadores autenticados.
*   **Por qué se eligió**: Provee un estándar robusto y sin almacenamiento de estado en el servidor (stateless), ideal para sistemas web y aplicaciones híbridas/PWA.
*   **Métodos principales utilizados en el proyecto**:
    *   `create_access_token(identity, additional_claims)`: Genera firmas digitales únicas seguras.
    *   `@jwt_required()`: Decorador de protección para denegar el acceso a rutas protegidas sin un token válido.
    *   `get_jwt_identity()`: Recupera el identificador único del usuario del token activo.
    *   `get_jwt()`: Obtiene los metadatos y claims del JWT.

### pymysql
*   **Versión**: `1.0.x` o superior
*   **Propósito específico en TrashFlow**: Es el conector que permite al backend de Python comunicarse e interactuar directamente con la base de datos MariaDB/MySQL de XAMPP mediante consultas SQL nativas.
*   **Por qué se eligió**: Es un driver escrito completamente en Python, sumamente rápido y compatible con las configuraciones por defecto de XAMPP.
*   **Métodos principales utilizados en el proyecto**:
    *   `pymysql.connect()`: Establece la sesión activa con el motor MySQL.
    *   `cursor.execute(query, params)`: Ejecuta sentencias SQL de selección e inserción.
    *   `connection.commit()`: Confirma transacciones de mutación de datos.

### bcrypt
*   **Versión**: `4.0.x` o superior
*   **Propósito específico en TrashFlow**: Cifra y verifica de forma segura las contraseñas de los usuarios (administradores y operadores) en la base de datos mediante algoritmos hash unidireccionales con "sal" dinámica.
*   **Por qué se eligió**: Por ser un estándar industrial en seguridad informática que previene ataques de fuerza bruta o de diccionario en caso de brechas en la base de datos.
*   **Métodos principales utilizados en el proyecto**:
    *   `bcrypt.hashpw(password, salt)`: Genera hashes seguros durante la creación de usuarios.
    *   `bcrypt.checkpw(password, hashed_password)`: Compara la contraseña en texto plano con el hash guardado al hacer login.

### tensorflow / keras
*   **Versión**: `2.10.x` o superior
*   **Propósito específico en TrashFlow**: Es el motor de Inteligencia Artificial que define la arquitectura y entrena el modelo de Red Neuronal Convolucional (CNN). Clasifica las imágenes de la cámara en "bolsa" o "sin_bolsa".
*   **Por qué se eligió**: Es la biblioteca de aprendizaje profundo líder en la industria, ofreciendo alto rendimiento y compatibilidad con aceleración de hardware.
*   **Métodos principales utilizados en el proyecto**:
    *   `keras.Sequential([...])`: Instancia la estructura lineal de capas de la red neuronal.
    *   `keras.layers.Conv2D(...)` / `MaxPooling2D(...)`: Extrae características geométricas de la imagen y reduce dimensiones.
    *   `keras.models.load_model(path)`: Carga el archivo pesado `.keras` para inferencia.
    *   `model.predict(tensor)`: Ejecuta la clasificación de imágenes retornando las probabilidades del Softmax.

### opencv-python (cv2)
*   **Versión**: `4.7.x` o superior
*   **Propósito específico en TrashFlow**: Se encarga de la captura de video en vivo (webcam local) en el detector, la conversión de colores (BGR a escala de grises), el reescalado dinámico de las imágenes para introducirlas al modelo (64x64 píxeles) y la renderización en pantalla del marco informativo.
*   **Por qué se eligió**: Por su velocidad de procesamiento de imágenes en tiempo real y compatibilidad con matrices NumPy.
*   **Métodos principales utilizados en el proyecto**:
    *   `cv2.VideoCapture(0)`: Instancia y abre la cámara de video seleccionada.
    *   `cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)`: Convierte imágenes a escala de grises.
    *   `cv2.resize(image, size)`: Escala matrices de píxeles a la dimensión del input de la CNN.
    *   `cv2.rectangle()` / `cv2.putText()`: Dibuja bordes e inserta textos explicativos en pantalla.

### numpy
*   **Versión**: `1.22.x` o superior
*   **Propósito específico en TrashFlow**: Realiza operaciones algebraicas matriciales rápidas. Convierte las imágenes recolectadas por OpenCV en matrices numéricas normalizadas (valores entre 0.0 y 1.0) para que puedan ser evaluadas por el clasificador.
*   **Por qué se eligió**: Es el estándar matemático en Python para computación científica de alto rendimiento sobre arreglos multidimensionales.
*   **Métodos principales utilizados en el proyecto**:
    *   `np.array(lista)`: Crea un arreglo multidimensional homogéneo.
    *   `np.expand_dims()`: Modifica la forma (shape) de los arreglos de imágenes para agregar la dimensión del lote (batch size).
    *   `np.std()`: Calcula el desvío estándar de las confianzas en el búfer temporal para mitigar predicciones estáticas.

### pillow (PIL)
*   **Versión**: `9.x` o superior
*   **Propósito específico en TrashFlow**: Auxiliar en el guardado de imágenes, lectura de cabeceras de metadatos de archivos y manipulación de fotos antes de su envío a través de las peticiones API HTTP.
*   **Por qué se eligió**: Es la librería estándar en Python para el tratamiento de archivos de imagen tradicionales y flujos de bytes en memoria.
*   **Métodos principales utilizados en el proyecto**:
    *   `Image.open(file_path)`: Carga y manipula archivos gráficos en memoria.

### python-dotenv
*   **Versión**: `0.21.x` o superior
*   **Propósito específico en TrashFlow**: Lee variables de entorno del archivo secreto `.env` y las inyecta en el entorno de ejecución de Python, protegiendo credenciales y direcciones IP del servidor.
*   **Por qué se eligió**: Permite separar la lógica del código de los valores de configuración específicos del servidor (buenas prácticas de desarrollo).
*   **Métodos principales utilizados en el proyecto**:
    *   `load_dotenv(env_path)`: Analiza y expone las variables del archivo `.env` mediante `os.getenv()`.

---

## 2. Librerías de JavaScript (Frontend & Panel Web)

### Leaflet.js
*   **Versión**: `1.9.4` (CDN público)
*   **Propósito específico en TrashFlow**: Renderiza el mapa geográfico interactivo de Vicente López (`mapa.html`), dibuja las marcas geoespaciales (pines) de las cámaras web y las alertas activas, y personaliza colores y popups con información técnica.
*   **Por qué se eligió**: Es una librería para mapas extremadamente ligera, fluida para dispositivos móviles y no requiere tokens de pago ni APIs comerciales (como Google Maps).
*   **Métodos principales utilizados en el proyecto**:
    *   `L.map(id)`: Inicializa el mapa en la etiqueta HTML correspondiente.
    *   `L.tileLayer(url)`: Carga la capa de teselas visuales (OpenStreetMap por defecto).
    *   `L.marker([lat, lng], {icon})`: Dibuja un pin de posición en las coordenadas provistas.
    *   `L.markerClusterGroup()`: Agrupa pines geográficamente cercanos en clústeres interactivos de carga rápida (Leaflet MarkerCluster Plugin).

### Chart.js
*   **Versión**: `4.x` (CDN público)
*   **Propósito específico en TrashFlow**: Renderiza los reportes visuales y estadísticos del panel principal (`dashboard.html`). Dibuja la tendencia semanal de alertas mediante gráficos de líneas y el volumen de basura acumulada en el municipio a través de gráficos de dona (pie chart).
*   **Por qué se eligió**: Por sus animaciones de renderizado premium y su capacidad de adaptarse de forma responsiva al redimensionar la pantalla.
*   **Métodos principales utilizados en el proyecto**:
    *   `new Chart(canvas_ctx, config)`: Inicializa y dibuja el gráfico interactivo sobre un lienzo de HTML5 canvas.
