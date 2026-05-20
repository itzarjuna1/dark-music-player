import time
import requests
from pyrogram import Client

SUPABASE_URL = "https://ydvaruzgftvizgymwalw.supabase.co/functions/v1/bot-api/clones"
HEADERS = {"X-API-Key": "YOUR_OWNER_KEY"}

running_clients = {}

def fetch_clones():
    r = requests.get(SUPABASE_URL, headers=HEADERS)
    return r.json().get("clones", [])

def start_bot(clone):
    bot_token = clone["bot_token"]
    api_id = clone.get("api_id") or 0
    api_hash = clone.get("api_hash") or ""

    app = Client(
        name=str(clone["id"]),
        api_id=int(api_id),
        api_hash=api_hash,
        bot_token=bot_token
    )

    app.start()
    print("Started bot:", clone["id"])
    return app

while True:
    try:
        clones = fetch_clones()

        for c in clones:
            cid = c["id"]

            if cid not in running_clients:
                running_clients[cid] = start_bot(c)

        time.sleep(10)

    except Exception as e:
        print("Error:", e)
        time.sleep(5)
