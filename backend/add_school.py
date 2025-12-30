import requests
import json

BASE_URL = "http://localhost:8001"

# Yeni okul verisi
school_data = {
    "name": "Atatürk Anadolu Lisesi",
    "short_name": "AAL",
    "school_type": "lise",
    "education_type": "normal",
    "is_active": True
}

# Okulu ekle
response = requests.post(
    f"{BASE_URL}/api/v1/schools/",
    json=school_data,
    headers={"Content-Type": "application/json"}
)

if response.status_code == 201:
    result = response.json()
    print("Okul basariyla eklendi!")
    print(f"ID: {result['id']}")
    print(f"Ad: {result['name']}")
    print(f"Kisa Ad: {result['short_name']}")
else:
    print(f"Hata: {response.status_code}")
    print(response.text)
