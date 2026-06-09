import requests
import hashlib
from datetime import datetime
from pymongo import MongoClient


# ------------------- CONFIG -------------------
PAYU_KEY="Y3vLqG"
PAYU_SALT="6HhDKF6HhOoTogOEyXRqj2icBveXx3wo"
PAYU_API_URL = "https://info.payu.in/merchant/postservice?form=2"
# ----------------------------------------------
MONGO_URI = "mongodb+srv://coladco:rpTtIwZuT6gbJrCR@cluster0.2a1icyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
# MONGO_URI = "mongodb+srv://waadi_cab:waadi_cab@cluster0.4i2etxy.mongodb.net/waadi_cab?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "test"
COLLECTION_NAME = "bookings"

# Connect to MongoDB
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)  # 5 sec timeout
    client.server_info()  # Forces connection on a request
    print("✅ MongoDB connection successful!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    exit(1)
db = client[DB_NAME]
bookings = db[COLLECTION_NAME]

def generate_hash(command: str, var1: str) -> str:
    """
    Generate SHA-512 hash: sha512(key|command|var1|salt)
    Required by PayU's 'postservice' API.
    """
    raw = f"{PAYU_KEY}|{command}|{var1}|{PAYU_SALT}"
    return hashlib.sha512(raw.encode("utf-8")).hexdigest()

def get_today_date() -> str:
    """Return today's date string in YYYY-MM-DD (IST assumed)."""
    return datetime.now().strftime("%Y-%m-%d")

def fetch_transactions(date_from: str, date_to: str):
    """
    Fetch transactions for a date range from PayU's production API.
    """
    command = "get_Transaction_Details"
    hash_value = generate_hash(command, date_from)

    payload = {
        "key": PAYU_KEY,
        "command": command,
        "hash": hash_value,
        "var1": date_from,
        "var2": date_to
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }

    response = requests.post(PAYU_API_URL, data=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def filter_successful(txn_response: dict):
    """
    Extract only successful transactions (status='success' or 'captured').
    """
    txns = txn_response.get("Transaction_details") or []
    success_txns = []
    for txn in txns:
        # print(txn)
        status = txn.get("status", "").lower()
        if status in ("success", "captured"):
            success_txns.append(txn.get("udf2"))
    return success_txns

def fetch_booking_by_id(booking_collection, success_txns: list):
    """Fetch a booking document by bookingId."""
    # print("sdfdsf",booking_id)
    result = bookings.update_many(
        {"status": "pending", "bookingId": {"$in": success_txns}},
        {"$set": {"status": "paid"}}
    )
    print(f"✅ Updated {result.modified_count} bookings.")
    return True


def main():
    today = get_today_date()
    print(f"Fetching transactions for {today} ...")
    try:
        data = fetch_transactions(today, today)
        if data.get("status") == 0:
            print("API Error:", data.get("msg", data.get("error")))
            return
        # print(data)
        success_txns = filter_successful(data)
        print(f"\n✅ Found {len(success_txns)} successful transactions:\n")
        bookings_to_update = fetch_booking_by_id(bookings, success_txns)

    except requests.RequestException as e:
        print("❌ Network/API error:", e)
    except Exception as e:
        print("❌ Unexpected error:", e)

if __name__ == "__main__":
    main()

# i wanted to use this script in cron job for every minute for getting bookings which are paid but not shown up

# but with this logic it will going to check for every booking and transaction
# how to optimize it