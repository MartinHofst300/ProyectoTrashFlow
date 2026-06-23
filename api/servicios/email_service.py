# -*- coding: utf-8 -*-
"""
TrashFlow — Sistema de Monitoreo de Residuos Urbano

Archivo: api/servicios/email_service.py
Descripción: Proporciona utilidades para el envío de notificaciones y alertas por correo electrónico
             utilizando el protocolo SMTP, guardando logs y reintentando en caso de error.
             Servicio dedicado para administradores y operadores del municipio.
"""

import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from api.database import query

def get_email_config():
    """
    Recupera la configuración de email de la tabla 'configuracion' en la BD.
    Retorna un diccionario {clave: valor}.
    """
    try:
        rows = query("SELECT clave, valor FROM configuracion WHERE grupo = 'email'")
        return {r['clave']: r['valor'] for r in rows}
    except Exception as e:
        print(f"[Email Service] Error al obtener config de la BD: {e}")
        return {}

def send_email(destinatario, asunto, cuerpo_html, tipo, usuario_id=None, alerta_id=None):
    """
    Función principal de envío de emails.
    Carga la configuración SMTP, conecta con el servidor, despacha el correo
    y registra el resultado en la tabla 'emails_log'.
    """
    config = get_email_config()
    
    # 1. Verificar que email_activo == 'true' en la config, si no, retornar False
    if not config or config.get("email_activo") != "true":
        print("[Email Service] Envío de emails desactivado en la configuración.")
        return False

    smtp_host = config.get("smtp_host", "smtp.gmail.com")
    try:
        smtp_puerto = int(config.get("smtp_puerto", 587))
    except (ValueError, TypeError):
        smtp_puerto = 587

    smtp_usuario = config.get("smtp_usuario")
    
    # Intentar leer primero del env, si está vacío usar lo de la BD
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_password:
        smtp_password = config.get("smtp_password", "")

    use_tls = config.get("smtp_tls", "true") == "true"
    remitente_nombre = config.get("email_remitente_nombre", "TrashFlow")

    # 2. Crear mensaje MIME multipart con From, To, Subject
    msg = MIMEMultipart('alternative')
    msg['From'] = f"{remitente_nombre} <{smtp_usuario}>"
    msg['To'] = destinatario
    msg['Subject'] = asunto

    # 3. Adjuntar cuerpo_html como text/html
    msg.attach(MIMEText(cuerpo_html, 'html', 'utf-8'))

    try:
        # 4. Conectar con smtplib.SMTP(host, puerto), starttls(), login(usuario, password)
        server = smtplib.SMTP(smtp_host, smtp_puerto, timeout=15)
        if use_tls:
            server.starttls()
        
        if smtp_usuario and smtp_password:
            server.login(smtp_usuario, smtp_password)

        # 5. Enviar y cerrar
        server.sendmail(smtp_usuario, [destinatario], msg.as_string())
        server.quit()

        # 6. Registrar en emails_log con estado='enviado', enviado_en=NOW()
        query(
            """
            INSERT INTO emails_log (usuario_id, alerta_id, destinatario, asunto, tipo, estado, intentos, ultimo_intento, creado_en, enviado_en)
            VALUES (%s, %s, %s, %s, %s, 'enviado', 1, NOW(), NOW(), NOW())
            """,
            (usuario_id, alerta_id, destinatario, asunto, tipo)
        )
        print(f"[Email Service] Email de tipo '{tipo}' enviado a {destinatario}.")
        return True

    except Exception as e:
        # 7. En caso de excepción: registrar en emails_log con estado='fallido', error_detalle=str(e), retornar False
        error_msg = str(e)
        print(f"[Email Service] [ERROR] Falló el envío de email a {destinatario}: {error_msg}")
        try:
            query(
                """
                INSERT INTO emails_log (usuario_id, alerta_id, destinatario, asunto, tipo, estado, intentos, ultimo_intento, error_detalle, creado_en)
                VALUES (%s, %s, %s, %s, %s, 'fallido', 1, NOW(), %s, NOW())
                """,
                (usuario_id, alerta_id, destinatario, asunto, tipo, error_msg)
            )
        except Exception as db_err:
            print(f"[Email Service] [ERROR] No se pudo escribir en emails_log: {db_err}")
        return False

def send_alerta_nueva(alerta):
    """
    Notifica al admin (email_admin de la config) que hay una nueva alerta.
    Asunto: "[TrashFlow] Nueva alerta detectada — {alerta['direccion']}"
    """
    if isinstance(alerta, (int, str)):
        alertas = query("SELECT * FROM vista_alertas_completa WHERE id = %s", (alerta,))
        if not alertas:
            print(f"[Email Service] Alerta {alerta} no encontrada en la base de datos.")
            return False
        alerta = alertas[0]

    config = get_email_config()
    destinatario = config.get("email_admin")
    if not destinatario:
        print("[Email Service] No se pudo enviar notificación de nueva alerta: email_admin no configurado.")
        return False

    direccion = alerta.get("direccion") or alerta.get("camara_ubicacion") or "Ubicación no especificada"
    asunto = f"[TrashFlow] Nueva alerta detectada — {direccion}"
    
    # Formatear campos
    alerta_id = alerta.get("id")
    confianza = int(alerta.get("confianza", 0))
    zona = alerta.get("zona_nombre") or "General"
    
    detectado_en = alerta.get("detectado_en")
    if isinstance(detectado_en, datetime):
        fecha_str = detectado_en.strftime("%d/%m/%Y %H:%M:%S")
    else:
        fecha_str = str(detectado_en)

    anio_actual = datetime.now().year

    cuerpo_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f0f1a; color: #ffffff; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 8px; border: 1px solid #2d2d44; overflow: hidden; }}
    .header {{ background-color: #161625; padding: 25px; text-align: center; border-bottom: 3px solid #00ff88; }}
    .logo {{ color: #00ff88; font-size: 26px; font-weight: bold; letter-spacing: 1px; }}
    .content {{ padding: 30px; }}
    h2 {{ color: #00ff88; margin-top: 0; font-size: 20px; text-align: center; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ padding: 12px 15px; text-align: left; border-bottom: 1px solid #2d2d44; }}
    th {{ background-color: #24243e; color: #00ff88; font-weight: bold; width: 35%; }}
    td {{ color: #e0e0e0; }}
    .footer {{ background-color: #161625; text-align: center; padding: 15px; font-size: 12px; color: #7f7f9f; border-top: 1px solid #2d2d44; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">TrashFlow</span>
    </div>
    <div class="content">
      <h2>Nueva Alerta Registrada</h2>
      <p style="text-align: center; color: #a0a0b0;">Se ha detectado una acumulación de residuos en la vía pública.</p>
      <table>
        <tr>
          <th>ID Alerta</th>
          <td>{alerta_id}</td>
        </tr>
        <tr>
          <th>Dirección</th>
          <td>{direccion}</td>
        </tr>
        <tr>
          <th>Zona</th>
          <td>{zona}</td>
        </tr>
        <tr>
          <th>Fecha</th>
          <td>{fecha_str}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      &copy; {anio_actual} TrashFlow. VFabLab Vicente López.
    </div>
  </div>
</body>
</html>
"""
    return send_email(
        destinatario=destinatario,
        asunto=asunto,
        cuerpo_html=cuerpo_html,
        tipo="nueva_alerta",
        alerta_id=alerta_id
    )

def send_alerta_asignada(alerta, operador):
    """
    Notifica al operador que tiene una alerta asignada.
    Destinatario: operador['email']
    Asunto: "[TrashFlow] Alerta asignada — {alerta['direccion']}"
    """
    if isinstance(alerta, (int, str)):
        alertas = query("SELECT * FROM vista_alertas_completa WHERE id = %s", (alerta,))
        if not alertas:
            print(f"[Email Service] Alerta {alerta} no encontrada en la base de datos.")
            return False
        alerta = alertas[0]

    if isinstance(operador, (int, str)):
        operadores = query("SELECT * FROM usuarios WHERE id = %s AND rol_id = 2", (operador,))
        if not operadores:
            print(f"[Email Service] Operador {operador} no encontrado en la base de datos.")
            return False
        operador = operadores[0]

    destinatario = operador.get("email")
    if not destinatario:
        print("[Email Service] No se pudo enviar notificación: el operador no tiene email registrado.")
        return False

    direccion = alerta.get("direccion") or alerta.get("camara_ubicacion") or "Ubicación no especificada"
    asunto = f"[TrashFlow] Alerta asignada — {direccion}"

    alerta_id = alerta.get("id")
    operador_nombre = f"{operador.get('nombre', '')} {operador.get('apellido', '')}".strip()
    confianza = int(alerta.get("confianza", 0))
    zona = alerta.get("zona_nombre") or "General"
    lat = alerta.get("latitud", 0.0)
    lng = alerta.get("longitud", 0.0)
    
    anio_actual = datetime.now().year

    cuerpo_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; color: #333333; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }}
    .header {{ background-color: #2d3748; padding: 20px; text-align: center; }}
    .logo {{ color: #38b2ac; font-size: 24px; font-weight: bold; }}
    .content {{ padding: 30px; line-height: 1.6; }}
    h2 {{ color: #2d3748; margin-top: 0; font-size: 20px; }}
    .detail-card {{ background-color: #f7fafc; border-left: 4px solid #38b2ac; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0; }}
    .detail-item {{ margin-bottom: 8px; }}
    .detail-label {{ font-weight: bold; color: #4a5568; margin-right: 5px; }}
    .btn {{ display: inline-block; padding: 12px 24px; background-color: #38b2ac; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; text-align: center; }}
    .btn:hover {{ background-color: #319795; }}
    .footer {{ background-color: #edf2f7; text-align: center; padding: 15px; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">TrashFlow</span>
    </div>
    <div class="content">
      <h2>Alerta Asignada</h2>
      <p>Hola <strong>{operador_nombre}</strong>,</p>
      <p>Se te ha asignado una nueva alerta de residuos para su gestión en el panel:</p>
      
      <div class="detail-card">
        <div class="detail-item"><span class="detail-label">Dirección:</span> {direccion}</div>
        <div class="detail-item"><span class="detail-label">Zona:</span> {zona}</div>
      </div>

      <p>Puedes ver la localización exacta en Google Maps haciendo clic en el siguiente botón:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="https://maps.google.com/?q={lat},{lng}" class="btn" target="_blank">Ver en Google Maps</a>
      </div>
      
      <p style="font-size: 14px; color: #718096;">Por favor, dirígete a la zona y actualiza el estado de la alerta en el panel cuando esté solucionado.</p>
    </div>
    <div class="footer">
      &copy; {anio_actual} TrashFlow. VFabLab Vicente López.
    </div>
  </div>
</body>
</html>
"""
    return send_email(
        destinatario=destinatario,
        asunto=asunto,
        cuerpo_html=cuerpo_html,
        tipo="alerta_asignada",
        usuario_id=operador.get("id"),
        alerta_id=alerta_id
    )

def send_credenciales_operador(operador, password_plana):
    """
    Notifica al nuevo operador sus credenciales de acceso.
    Destinatario: operador['email']
    Asunto: "[TrashFlow] Tus credenciales de acceso"
    """
    destinatario = operador.get("email")
    if not destinatario:
        print("[Email Service] No se puede enviar credenciales: email no especificado.")
        return False

    asunto = "[TrashFlow] Tus credenciales de acceso"
    nombre_completo = f"{operador.get('nombre', '')} {operador.get('apellido', '')}".strip()
    
    anio_actual = datetime.now().year

    cuerpo_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; color: #333333; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }}
    .header {{ background-color: #2d3748; padding: 20px; text-align: center; }}
    .logo {{ color: #38b2ac; font-size: 24px; font-weight: bold; }}
    .content {{ padding: 30px; line-height: 1.6; }}
    h2 {{ color: #2d3748; margin-top: 0; font-size: 20px; }}
    .credentials-card {{ background-color: #f7fafc; border: 1px dashed #cbd5e0; padding: 20px; margin: 20px 0; border-radius: 4px; }}
    .credential-item {{ margin-bottom: 10px; font-size: 16px; }}
    .credential-label {{ font-weight: bold; color: #4a5568; margin-right: 5px; }}
    .warning {{ color: #e53e3e; font-weight: bold; font-size: 14px; margin-top: 15px; }}
    .footer {{ background-color: #edf2f7; text-align: center; padding: 15px; font-size: 12px; color: #718096; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">TrashFlow</span>
    </div>
    <div class="content">
      <h2>¡Bienvenido al equipo de TrashFlow!</h2>
      <p>Hola <strong>{nombre_completo}</strong>,</p>
      <p>Tu cuenta como operador de campo ha sido registrada en el sistema. Tus credenciales de acceso son:</p>
      
      <div class="credentials-card">
        <div class="credential-item"><span class="credential-label">Usuario (Email):</span> {destinatario}</div>
        <div class="credential-item"><span class="credential-label">Contraseña temporal:</span> <code>{password_plana}</code></div>
      </div>
      
      <p class="warning">⚠️ Importante: Por motivos de seguridad, deberás cambiar esta contraseña la primera vez que inicies sesión en la aplicación.</p>
    </div>
    <div class="footer">
      &copy; {anio_actual} TrashFlow. VFabLab Vicente López.
    </div>
  </div>
</body>
</html>
"""
    return send_email(
        destinatario=destinatario,
        asunto=asunto,
        cuerpo_html=cuerpo_html,
        tipo="credenciales_operador",
        usuario_id=operador.get("id")
    )
