"""Private FES2022 tide prediction sidecar for Ocean Rover Marina.

Requires separately licensed FES2022 NetCDF model and pyfes+numpy.
Returns LLW heights only with an explicitly provided, surveyed MSL->LLW offset.
Expose behind TLS and authentication, never open directly on the internet.
"""
import json
import math
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone

_TOKEN = os.environ.get("ORM_TIDE_FES_TOKEN")
_CONFIG = os.environ.get("FES_CONFIG_PATH")
_OFFSET = os.environ.get("FES_MSL_TO_LLW_M")
_LAT = os.environ.get("ORM_TIDE_LATITUDE")
_LON = os.environ.get("ORM_TIDE_LONGITUDE")
_model = None

def predict(payload):
    global _model
    if not all([_TOKEN, _CONFIG, _OFFSET, _LAT, _LON]):
        raise ValueError("FES configuration, site coordinates, secret and surveyed LLW offset required")
    dates = payload.get("times")
    lat, lon = float(payload["latitude"]), float(payload["longitude"])
    if not math.isfinite(lat) or not math.isfinite(lon):
        raise ValueError("Invalid coordinates")
    if abs(lat-float(_LAT)) > 0.00001 or abs(lon-float(_LON)) > 0.00001:
        raise ValueError("Requested coordinates differ from configured surveyed site")
    if not isinstance(dates,list) or not 1 <= len(dates) <= 4464:
        raise ValueError("times must contain 1..4464 UTC timestamps")
    import numpy as np
    import pyfes
    if _model is None:
        _model=pyfes.config.load(_CONFIG,bbox=(lon-0.5,lat-0.5,lon+0.5,lat+0.5))
    utc=[datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(timezone.utc)
         .replace(tzinfo=None) for s in dates]
    numpy_dates=np.array(utc,dtype="datetime64[ns]")
    lon_arr=np.full(len(dates),lon,dtype="float64")
    lat_arr=np.full(len(dates),lat,dtype="float64")
    tide,lp,flags=pyfes.evaluate_tide(_model.models["tide"],numpy_dates,lon_arr,lat_arr,settings=_model.settings)
    if np.any(~np.isfinite(tide)) or np.any(~np.isfinite(lp)) or np.any(np.asarray(flags)<=0):
        raise ValueError("FES output invalid or extrapolated; reject unsafe samples")
    llw=(np.asarray(tide)+np.asarray(lp))/100.0+float(_OFFSET)
    return {"model":"FES2022","datum":"LLW","heights_m":[float(v) for v in llw]}

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/predict":
            self.send_error(404)
            return
        if not _TOKEN or self.headers.get("Authorization") != "Bearer " + _TOKEN:
            self.send_error(401)
            return
        try:
            length=int(self.headers.get("Content-Length","0"))
            if length<=0 or length>400000:self.send_error(413);return
            result=predict(json.loads(self.rfile.read(length)))
            content=json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.send_header("Content-Length",str(len(content)))
            self.end_headers();self.wfile.write(content)
        except (ValueError,KeyError,TypeError) as err:
            content=json.dumps({"error":str(err)}).encode()
            self.send_response(422);self.send_header("Content-Type","application/json")
            self.send_header("Content-Length",str(len(content)));self.end_headers();self.wfile.write(content)
        except Exception:
            self.send_error(503,"Prediction model unavailable")
if __name__ == "__main__":
    if not (_TOKEN and _CONFIG and _OFFSET and _LAT and _LON):
        raise SystemExit("Set ORM_TIDE_FES_TOKEN, FES_CONFIG_PATH, FES_MSL_TO_LLW_M, ORM_TIDE_LATITUDE, ORM_TIDE_LONGITUDE")
    ThreadingHTTPServer(("127.0.0.1",int(os.environ.get("FES_PORT","8031"))),Handler).serve_forever()
