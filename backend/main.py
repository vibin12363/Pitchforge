from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import uuid
import databases
import sqlalchemy
from prompt import generate_prompt, generate_questions_prompt
from datetime import datetime
from typing import Optional
from supabase import create_client
import base64
from fastapi.responses import StreamingResponse

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# MongoDB client
mongo_client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = mongo_client["pitchforge"]
decks_collection = db["decks"]

# PostgreSQL connection
DATABASE_URL = os.getenv("SUPABASE_URL")
database = databases.Database(DATABASE_URL)

# Supabase Storage client
supabase_storage = create_client(
    os.getenv("SUPABASE_PROJECT_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# ── Models ────────────────────────────────────────────────────────────────────

class IdeaRequest(BaseModel):
    idea: str
    tone: str
    deck_type: str
    answers: Optional[dict] = None

class QuestionsRequest(BaseModel):
    idea: str

class SaveDeckRequest(BaseModel):
    user_id: str
    title: str
    idea: str
    tone: str
    deck_type: str
    data: dict
    chat_messages: Optional[list] = []
    chat_questions: Optional[list] = []
    chat_answers: Optional[dict] = {}

class RenameDeckRequest(BaseModel):
    user_id: str
    deck_id: str
    title: str

class UserProfileRequest(BaseModel):
    firebase_uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

class UploadExportRequest(BaseModel):
    user_id: str
    deck_id: str
    title: str
    file_type: str  # "pdf" or "pptx"
    file_data: str  # base64 encoded file

# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/questions")
async def get_questions(request: QuestionsRequest):
    prompt = generate_questions_prompt(request.idea)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```json")[-1].split("```")[0].strip()
    data = json.loads(text)
    if data.get("invalid"):
        raise HTTPException(status_code=400, detail=data.get("message", "Invalid business idea. Please describe a real business idea."))
    return {"questions": data.get("questions", [])}

    # ── REPLACE your existing /generate endpoint in main.py with this ──────────────

REQUIRED_FIELDS = [
    "title", "tagline", "problem", "solution", "target_audience", "market_size",
    "business_model", "competitors", "swot", "financials", "go_to_market",
    "call_to_action", "validation", "improvements", "similar_startups"
]
REQUIRED_SWOT = ["strengths", "weaknesses", "opportunities", "threats"]
REQUIRED_FIN = ["startup_cost", "monthly_revenue", "monthly_expenses", "profit_loss", "break_even"]
REQUIRED_VAL = ["viability_score", "market_readiness", "competition_level", "overall_verdict"]

def verify_deck(result: dict) -> list:
    """Returns a list of missing/invalid fields. Empty list = deck is valid."""
    issues = []
    for f in REQUIRED_FIELDS:
        if f not in result or not result[f]:
            issues.append(f)
    if "swot" in result and isinstance(result["swot"], dict):
        for f in REQUIRED_SWOT:
            if f not in result["swot"] or not result["swot"][f]:
                issues.append(f"swot.{f}")
    if "financials" in result and isinstance(result["financials"], dict):
        for f in REQUIRED_FIN:
            if f not in result["financials"] or not result["financials"][f]:
                issues.append(f"financials.{f}")
    if "validation" in result and isinstance(result["validation"], dict):
        for f in REQUIRED_VAL:
            if f not in result["validation"] or not result["validation"][f]:
                issues.append(f"validation.{f}")
    return issues

@app.post("/generate")
async def generate_pitch(request: IdeaRequest):
    last_issues = []
    # Try up to 2 times to get a complete deck
    for attempt in range(2):
        prompt = generate_prompt(request.idea, request.tone, request.deck_type, request.answers)
        if attempt > 0 and last_issues:
            prompt += f"\n\nIMPORTANT: Your previous attempt was missing these fields: {', '.join(last_issues)}. Include ALL fields this time."
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```json")[-1].split("```")[0].strip()
        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            last_issues = ["invalid_json"]
            continue
        issues = verify_deck(result)
        if not issues:
            result["_verified"] = True
            return result
        last_issues = issues
    # Return best effort with verification flag
    result["_verified"] = False
    result["_missing_fields"] = last_issues
    return result

@app.post("/generate")
async def generate_pitch(request: IdeaRequest):
    prompt = generate_prompt(request.idea, request.tone, request.deck_type, request.answers)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```json")[-1].split("```")[0].strip()
    result = json.loads(text)
    return result

@app.post("/decks/save")
async def save_deck(request: SaveDeckRequest):
    deck = {
        "user_id": request.user_id,
        "title": request.title,
        "idea": request.idea,
        "tone": request.tone,
        "deck_type": request.deck_type,
        "data": request.data,
        "chat_messages": request.chat_messages,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "chat_questions": request.chat_questions,
        "chat_answers": request.chat_answers,
    }
    result = await decks_collection.insert_one(deck)
    return {"deck_id": str(result.inserted_id), "message": "Saved successfully"}

@app.post("/decks/share")
async def share_deck(request: SaveDeckRequest):
    share_id = str(uuid.uuid4())[:8]
    deck = {
        "share_id": share_id,
        "user_id": request.user_id,
        "title": request.title,
        "idea": request.idea,
        "tone": request.tone,
        "deck_type": request.deck_type,
        "data": request.data,
        "created_at": datetime.utcnow(),
        "is_public": True,
    }
    await decks_collection.insert_one(deck)
    return {"share_url": f"http://localhost:5173/deck/{share_id}"}

@app.get("/decks/shared/{share_id}")
async def get_shared_deck(share_id: str):
    deck = await decks_collection.find_one({"share_id": share_id, "is_public": True})
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    deck["_id"] = str(deck["_id"])
    return deck

@app.get("/decks/{user_id}")
async def get_decks(user_id: str):
    decks = []
    async for deck in decks_collection.find({"user_id": user_id}).sort("created_at", -1):
        deck["_id"] = str(deck["_id"])
        decks.append(deck)
    return {"decks": decks}

@app.put("/decks/rename")
async def rename_deck(request: RenameDeckRequest):
    from bson import ObjectId
    await decks_collection.update_one(
        {"_id": ObjectId(request.deck_id), "user_id": request.user_id},
        {"$set": {"title": request.title, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Renamed successfully"}

@app.put("/decks/update/{deck_id}")
async def update_deck(deck_id: str, request: SaveDeckRequest):
    from bson import ObjectId
    await decks_collection.update_one(
        {"_id": ObjectId(deck_id), "user_id": request.user_id},
        {"$set": {
            "title": request.title,
            "data": request.data,
            "tone": request.tone,
            "deck_type": request.deck_type,
            "chat_messages": request.chat_messages,
            "updated_at": datetime.utcnow(),
            "chat_questions": request.chat_questions,
            "chat_answers": request.chat_answers,
        }}
    )
    return {"deck_id": deck_id, "message": "Updated successfully"}

@app.delete("/decks/{user_id}/{deck_id}")
async def delete_deck(user_id: str, deck_id: str):
    from bson import ObjectId
    await decks_collection.delete_one(
        {"_id": ObjectId(deck_id), "user_id": user_id}
    )
    return {"message": "Deleted successfully"}

# ── PostgreSQL User Profile Routes ────────────────────────────────────────────

@app.post("/user/profile")
async def upsert_user_profile(request: UserProfileRequest):
    query = "SELECT * FROM user_profiles WHERE firebase_uid = :uid"
    existing = await database.fetch_one(query=query, values={"uid": request.firebase_uid})

    if existing:
        query = """
            UPDATE user_profiles
            SET last_login = NOW(), display_name = :name, photo_url = :photo
            WHERE firebase_uid = :uid
        """
        await database.execute(query=query, values={
            "uid": request.firebase_uid,
            "name": request.display_name,
            "photo": request.photo_url
        })
        return {"message": "Profile updated", "is_new": False}
    else:
        query = """
            INSERT INTO user_profiles (firebase_uid, email, display_name, photo_url)
            VALUES (:uid, :email, :name, :photo)
        """
        await database.execute(query=query, values={
            "uid": request.firebase_uid,
            "email": request.email,
            "name": request.display_name,
            "photo": request.photo_url
        })
        return {"message": "Profile created", "is_new": True}

@app.get("/user/profile/{firebase_uid}")
async def get_user_profile(firebase_uid: str):
    query = "SELECT * FROM user_profiles WHERE firebase_uid = :uid"
    profile = await database.fetch_one(query=query, values={"uid": firebase_uid})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return dict(profile)

@app.put("/user/profile/increment/{firebase_uid}")
async def increment_decks_count(firebase_uid: str):
    query = """
        UPDATE user_profiles
        SET decks_generated = decks_generated + 1
        WHERE firebase_uid = :uid
    """
    await database.execute(query=query, values={"uid": firebase_uid})
    return {"message": "Count updated"}

@app.put("/user/preferences/{firebase_uid}")
async def update_preferences(firebase_uid: str, preferences: dict):
    query = """
        UPDATE user_profiles
        SET preferences = :prefs
        WHERE firebase_uid = :uid
    """
    await database.execute(query=query, values={
        "uid": firebase_uid,
        "prefs": json.dumps(preferences)
    })
    return {"message": "Preferences updated"}

@app.post("/exports/upload")
async def upload_export(request: UploadExportRequest):
    try:
        file_bytes = base64.b64decode(request.file_data)
        safe_title = "".join(c if c.isalnum() else "_" for c in request.title)[:40]
        file_path = f"{request.user_id}/{safe_title}_{request.deck_id[:8]}.{request.file_type}"
        content_type = "application/pdf" if request.file_type == "pdf" else "application/vnd.openxmlformats-officedocument.presentationml.presentation"

        supabase_storage.storage.from_("exports").upload(
            file_path, file_bytes,
            {"content-type": content_type, "upsert": "true"}
        )
        public_url = supabase_storage.storage.from_("exports").get_public_url(file_path)

        # Save export record in MongoDB
        await db["exports"].update_one(
            {"user_id": request.user_id, "deck_id": request.deck_id, "file_type": request.file_type},
            {"$set": {
                "title": request.title,
                "file_path": file_path,
                "url": public_url,
                "created_at": datetime.utcnow(),
            }},
            upsert=True
        )
        return {"url": public_url, "message": "Uploaded to cloud"}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/exports/{user_id}")
async def get_exports(user_id: str):
    exports = []
    async for exp in db["exports"].find({"user_id": user_id}).sort("created_at", -1):
        exp["_id"] = str(exp["_id"])
        exports.append(exp)
    return {"exports": exports}


@app.post("/generate-stream")
async def generate_pitch_stream(request: IdeaRequest):
    prompt = generate_prompt(request.idea, request.tone, request.deck_type, request.answers)

    def stream():
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    return StreamingResponse(stream(), media_type="text/plain")

@app.on_event("startup")
async def startup():
    try:
        await database.connect()
    except Exception as e:
        print(f"DB connection failed at startup: {e}")

@app.on_event("shutdown")
async def shutdown():
    try:
        await database.disconnect()
    except Exception:
        pass