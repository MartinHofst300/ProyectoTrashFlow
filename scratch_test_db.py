import sys
sys.path.append('c:/xampp/htdocs/dashboard/TrashFlow-PRESENTACION')
from api.database import query
try:
    res = query("SELECT * FROM vista_alertas_completa LIMIT 5")
    print("vista_alertas_completa count:", len(res))
    if len(res) > 0:
        print("First alert:", res[0])
except Exception as e:
    print("Error:", e)
