# TrashFlow — Detector de Residuos (instalación standalone)

Esta carpeta contiene **únicamente** el componente de detección de TrashFlow:
el script YOLOv8 que escanea una cámara conectada a la PC, detecta bolsas de
basura y envía las alertas a la API central.

**No incluye** el panel web ni el backend Flask — ambos ya están desplegados y
accesibles en [https://trashflow.site](https://trashflow.site).  
Podés correr este detector en cualquier PC con una cámara y conexión a internet,
sin instalar XAMPP, MySQL ni nada más.

---

## Estructura de la carpeta

```
trashflow-detector/
  .env            ← variables de configuración (cámara, token, API)
  modelo/
    detector.py       ← script principal
    guardado_foto.py  ← helper para guardar capturas
    bolsas_yolo.pt    ← pesos del modelo entrenado
```

---

## 1. Requisitos previos

### Miniconda
Descargá e instalá **Miniconda para Windows 64-bit** desde:
👉 [https://docs.conda.io/en/latest/miniconda.html](https://docs.conda.io/en/latest/miniconda.html)

Durante la instalación, tildá ambas opciones:
- ✅ **Add Miniconda3 to my PATH environment variable**
- ✅ **Register Miniconda3 as my default Python**

### Aceptar los términos de uso de conda (primera vez en la PC)
Si es la primera vez que usás conda en esta computadora, abrí **Anaconda Prompt**
(o CMD si ya está en el PATH) y ejecutá:

```cmd
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/msys2
```

---

## 2. Crear y activar el entorno

Creá el entorno con **Python 3.11 exacto** (otras versiones pueden dar problemas
de compatibilidad con `ultralytics` y `torch`):

```cmd
conda create --name basuraia python=3.11 -y
```

Activalo:

```cmd
conda activate basuraia
```

Deberías ver `(basuraia)` al principio de la línea de comandos antes de continuar.

---

## 3. Instalar dependencias

Con el entorno activo, instalá las tres dependencias necesarias:

```cmd
pip install ultralytics requests python-dotenv
```

La descarga de `ultralytics` incluye PyTorch y puede tardar unos minutos según
la conexión.

---

## 4. Verificar el archivo `.env`

En la raíz de esta carpeta debe existir un archivo llamado `.env` con el siguiente
contenido (ya debería estar presente; si lo copiaste de otro lado o clonaste la
carpeta de nuevo, verificá que tenga estos campos con los valores correctos):

```env
CAMARA_ID=1
CAMARA_TOKEN=token_camara_1_aqui
CAMARA_LATITUD=-34.5250000
CAMARA_LONGITUD=-58.4730000
API_URL=https://trashflow.site
```

> **Importante:** `CAMARA_TOKEN` debe coincidir exactamente con el valor de la
> columna `token_api` en la tabla `camaras` de la base de datos.
> Si no lo tenés, pedíselo al administrador del sistema.

---

## 5. Correr el detector

Desde la raíz de `trashflow-detector\`, entrá a la carpeta del modelo y ejecutá:

```cmd
cd modelo
python detector.py
```

Al iniciar, el script va a:
1. Escanear las cámaras conectadas a la PC.
2. Si hay más de una, pedir que elijas cuál usar.
3. Mostrar en consola `Clases del modelo: [...]` — esto confirma que el `.pt`
   se cargó correctamente.
4. Intentar conectarse a `https://trashflow.site` para verificar el token.
   Si la conexión es exitosa, el detector entra en modo activo y comienza a
   analizar frames.

Dejá la terminal abierta mientras el detector esté corriendo.

---

## 6. Solución de problemas frecuentes

### `ModuleNotFoundError: No module named 'ultralytics'` (u otro módulo)
El entorno `basuraia` no está activo en la terminal actual.  
Cerrá la terminal, abrí una nueva y ejecutá `conda activate basuraia` antes de
volver a correr el script.

### El detector arranca pero no conecta con la API
Antes de seguir investigando, abrí [https://trashflow.site](https://trashflow.site)
en el navegador para confirmar que el servidor esté en línea. Si la página no
carga, el problema es externo al detector.

### La API responde con error `401 Unauthorized`
El `CAMARA_TOKEN` en el `.env` no coincide con el registrado en la base de datos.
El token correcto está en la tabla `camaras`, columna `token_api`. Actualizá el
`.env` con el valor exacto (distingue mayúsculas y minúsculas).
