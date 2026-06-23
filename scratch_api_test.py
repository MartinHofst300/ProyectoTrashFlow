import requests

url_login = "http://localhost:5000/api/auth/login"
credentials = {"email": "admin@trashflow.com", "password": "admin123"}
r = requests.post(url_login, json=credentials)
print("Login Status:", r.status_code)
login_data = r.json()
print("Login Data:", login_data)

token = login_data.get("token")
headers = {"Authorization": f"Bearer {token}"}
r_alerts = requests.get("http://localhost:5000/api/alertas?per_page=200", headers=headers)
print("Alerts Status:", r_alerts.status_code)
alerts_data = r_alerts.json()
print("Number of alerts returned:", len(alerts_data.get("alertas", [])))
if alerts_data.get("alertas"):
    print("Keys of first alert:", list(alerts_data["alertas"][0].keys()))
    print("First alert coords:", alerts_data["alertas"][0].get("latitud"), alerts_data["alertas"][0].get("longitud"))
