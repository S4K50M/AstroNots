import httpx
from typing import Dict, Any
import os

# We'll use the DEMOKEY from the docs for now, but you should move this to .env later
METEOBLUE_API_KEY = os.environ.get("METEO_API_KEY")

async def fetch_local_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches hyper-local weather from Meteoblue.
    We request the 'basic-1h' (temps/precip) and 'clouds-1h' (cloud cover percentages) packages.
    """
    url = os.environ.get("METEO_API_URL")
    
    params = {
        "lat": lat,
        "lon": lon,
        "apikey": METEOBLUE_API_KEY,
        "format": "json",
        "timeformat": "iso8601",  # Easier to parse in Python/JS
        "tz": "utc"               # Keep everything in UTC to match NOAA
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Extract the current hour's data (index 0)
            # The API returns arrays of hourly data, we just want the immediate forecast
            current_cloud_cover = data["data_1h"]["totalcloudcover"][0]
            current_temp = data["data_1h"]["temperature"][0]
            
            return {
                "ok": True,
                "cloud_cover_percent": current_cloud_cover,
                "temperature_c": current_temp,
                "raw_data": data
            }
    except Exception as e:
        import logging
        logging.error(f"Meteoblue API Error: {str(e)}")
        return {
            "ok": False,
            "cloud_cover_percent": 100, # Assume worst case on failure
            "temperature_c": None,
            "error": str(e)
        }