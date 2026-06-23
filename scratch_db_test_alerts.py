import sys
sys.path.append('c:/xampp/htdocs/dashboard/TrashFlow-PRESENTACION')
from api.database import query
from api.rutas.alertas import map_alert

try:
    res = query("SELECT * FROM vista_alertas_completa LIMIT 5")
    print("Number of alerts:", len(res))
    if len(res) > 0:
        mapped = map_alert(res[0])
        print("Mapped first alert:", mapped)
except Exception as e:
    print("Error:", e)
