from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from groq import Groq
from dotenv import load_dotenv
import os

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional dependency
    genai = None
import sqlite3
import edge_tts
import shutil
import json
import uuid
import asyncio
import mimetypes
import subprocess
import tempfile
from pathlib import Path

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
app.add_middleware(GZipMiddleware, minimum_size=500)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.0-flash")

if GEMINI_API_KEY and genai is not None:
    genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are Waheeda, an expert English tutor for a Tamil speaker who wants to master English.

CORE RULES:
- No matter what language the user speaks (Tamil, Thanglish, or English), ALWAYS reply in clear, simple English only. Never use Tamil script.
- If they speak in Tamil, first understand their full meaning, then respond naturally in English as part of the conversation.

TEACHING STYLE - Be a REAL teacher, not just a translator:
1. When explaining a word or phrase, always give:
   - The simple meaning
   - One clear example sentence using it
   - When to use it (casual/formal context) if relevant

2. When the user tries to speak English and makes a mistake:
   - Gently point out the correction
   - Show the correct version
   - Briefly explain WHY (one short reason, not a grammar lecture)
   Example: "Almost! We say 'I went to the market' not 'I go to market yesterday' — because it happened in the past, so we use 'went'."

3. When they say "puriyala" or seem confused:
   - Break down the idea into the simplest possible words
   - Use a relatable everyday example
   - Ask a simple follow-up question to check they understood

4. Keep responses SHORT and conversational (2-4 sentences) — like a real spoken conversation, never a long lecture.

5. Be encouraging. Notice progress and mention it naturally ("You're using past tense correctly now!").

6. Occasionally introduce ONE new useful word or phrase naturally in conversation, and explain it briefly — like a real tutor building vocabulary over time.

Your name is Waheeda. If asked your name, say "I'm Waheeda, your English tutor."
"""

DB_PATH = "chat_history.db"
CONTEXT_MESSAGES = 12
TTS_VOICE = os.getenv("TTS_VOICE", "en-IN-NeerjaNeural")
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
VISION_MODEL_CANDIDATES = [
    "qwen/qwen3.6-27b",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]

try:
    AVAILABLE_MODEL_IDS = {model.id for model in client.models.list().data}
except Exception:
    AVAILABLE_MODEL_IDS = set()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id         TEXT PRIMARY KEY,
            title      TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL DEFAULT '',
            role       TEXT NOT NULL,
            content    TEXT NOT NULL,
            timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);")
    conn.commit()
    conn.close()


def ensure_default_session() -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    row = cursor.execute("SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1").fetchone()
    if row:
        session_id = row[0]
    else:
        session_id = str(uuid.uuid4())
        cursor.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, "New Chat"))
        conn.commit()
    conn.close()
    return session_id


def debug_user_text(source: str, session_id: str, user_text: str):
    print(f"DEBUG - {source} session_id={session_id or '<empty>'} user_text={user_text}")


def debug_request(route: str, session_id: str, payload: str):
    print(f"DEBUG - {route} session_id={session_id or '<empty>'} payload={payload}")


def validate_upload_size(file_bytes: bytes):
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large, max 15MB")


def guess_image_data_url(upload: UploadFile) -> str:
    content_type = upload.content_type or ""
    if content_type.startswith("image/"):
        return content_type
    guessed_type, _ = mimetypes.guess_type(upload.filename or "")
    if guessed_type and guessed_type.startswith("image/"):
        return guessed_type
    return "image/jpeg"


def resolve_ffmpeg_path() -> str | None:
    env_path = os.getenv("FFMPEG_PATH")
    if env_path and Path(env_path).exists():
        return env_path

    detected = shutil.which("ffmpeg")
    if detected:
        return detected

    win_get_candidate = Path(
        os.getenv("LOCALAPPDATA", ""),
        "Microsoft",
        "WinGet",
        "Packages",
        "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
        "ffmpeg-8.1.2-full_build",
        "bin",
        "ffmpeg.exe",
    )
    if win_get_candidate.exists():
        return str(win_get_candidate)

    return None


async def get_ai_reply(session_id: str, user_text: str, source: str = "chat", save_text: str | None = None) -> str:
    debug_user_text(source, session_id, user_text)
    save_message(session_id, "user", save_text or user_text)
    recent = load_recent_messages(session_id, CONTEXT_MESSAGES)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + recent
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3
    )
    ai_reply = response.choices[0].message.content
    save_message(session_id, "assistant", ai_reply)
    await make_voice(ai_reply)
    return ai_reply


def save_message(session_id: str, role: str, content: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)", (session_id, role, content))
    
    if role == "user":
        title_row = cursor.execute("SELECT title FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if title_row and title_row[0] in ("New Chat", "Untitled"):
            new_title = content[:30] + ("..." if len(content) > 30 else "")
            cursor.execute("UPDATE sessions SET title = ? WHERE id = ?", (new_title, session_id))
            
    conn.commit()
    conn.close()


def load_recent_messages(session_id: str, n: int = CONTEXT_MESSAGES):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT role, content FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?", (session_id, n)
    ).fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]


def load_all_session_messages(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT id, role, content, timestamp FROM conversations WHERE session_id = ? ORDER BY id ASC", (session_id,)
    ).fetchall()
    conn.close()
    return [{"id": r[0], "role": r[1], "content": r[2], "timestamp": r[3]} for r in rows]


init_db()


async def make_voice(text: str):
    communicate = edge_tts.Communicate(text, TTS_VOICE)
    await communicate.save("reply.mp3")


@app.post("/analyze-image")
async def analyze_image(image: UploadFile = File(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()

    contents = await image.read()
    validate_upload_size(contents)

    ai_reply = ""
    if GEMINI_API_KEY and genai is not None and not GEMINI_API_KEY.startswith("your_key"):
        try:
            image_model = genai.GenerativeModel(GEMINI_IMAGE_MODEL)
            response = image_model.generate_content(
                [
                    {
                        "role": "user",
                        "parts": [
                            "Describe this image in simple English for someone learning English. Keep the answer short, clear, and useful.",
                            {
                                "mime_type": image.content_type or guess_image_data_url(image),
                                "data": contents,
                            },
                        ],
                    }
                ]
            )
            ai_reply = (getattr(response, "text", "") or "").strip()
        except Exception as exc:
            print("Gemini image error:", exc)

    if not ai_reply:
        try:
            import base64
            mime = image.content_type or guess_image_data_url(image)
            b64_str = base64.b64encode(contents).decode("utf-8")
            data_url = f"data:{mime};base64,{b64_str}"
            response = client.chat.completions.create(
                model="qwen/qwen3.6-27b",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Describe this image in simple English for someone learning English. Keep the answer short, clear, and useful (2-3 sentences)."},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0.3,
            )
            ai_reply = response.choices[0].message.content.strip()
        except Exception as exc:
            print("Groq vision error:", exc)
            raise HTTPException(status_code=500, detail=f"Image analysis failed: {exc}")

    if not ai_reply:
        raise HTTPException(status_code=500, detail="Returned an empty image response.")

    user_text = f"[Uploaded image: {image.filename or 'image'}]"
    save_message(session_id, "user", user_text)
    save_message(session_id, "assistant", ai_reply)
    await make_voice(ai_reply)

    return JSONResponse(content={"user_text": user_text, "ai_reply": ai_reply, "audio_url": "/audio"})


@app.post("/analyze-audio")
async def analyze_audio(audio: UploadFile = File(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()

    contents = await audio.read()
    validate_upload_size(contents)

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_audio:
        tmp_audio.write(contents)
        temp_path = tmp_audio.name

    try:
        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                prompt="Bilingual conversation in Tamil and English (Thanglish). The speaker may switch between Tamil words, English words, or mix both in the same sentence. Transcribe accurately preserving what was actually said."
            )
        transcript = transcription.text.strip()
        ai_reply = await get_ai_reply(
            session_id,
            f"[User shared an audio file. Transcript]: {transcript}. Explain or respond to this in simple English.",
            source="analyze_audio",
            save_text=f"[Uploaded audio: {audio.filename or 'audio'}]"
        )
        return JSONResponse(content={"transcript": transcript, "ai_reply": ai_reply, "audio_url": "/audio"})
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


@app.post("/analyze-video")
async def analyze_video(video: UploadFile = File(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()

    ffmpeg_path = resolve_ffmpeg_path()
    if not ffmpeg_path:
        raise HTTPException(status_code=400, detail="ffmpeg is not installed on the server. Video analysis needs ffmpeg to extract audio.")

    contents = await video.read()
    validate_upload_size(contents)

    video_suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=video_suffix) as tmp_video:
        tmp_video.write(contents)
        temp_video_path = tmp_video.name

    audio_path = temp_video_path + ".mp3"

    try:
        subprocess.run([
            ffmpeg_path,
            "-y",
            "-i",
            temp_video_path,
            "-vn",
            "-acodec",
            "libmp3lame",
            audio_path,
        ], check=True, capture_output=True)

        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                prompt="Bilingual conversation in Tamil and English (Thanglish). The speaker may switch between Tamil words, English words, or mix both in the same sentence. Transcribe accurately preserving what was actually said."
            )

        transcript = transcription.text.strip()
        ai_reply = await get_ai_reply(
            session_id,
            f"[User shared a video. Transcript from the audio track]: {transcript}. Respond in simple English.",
            source="analyze_video",
            save_text=f"[Uploaded video: {video.filename or 'video'}]"
        )
        return JSONResponse(content={"transcript": transcript, "ai_reply": ai_reply, "audio_url": "/audio"})
    finally:
        for path in (temp_video_path, audio_path):
            try:
                os.remove(path)
            except OSError:
                pass


@app.get("/sessions")
async def get_sessions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rows = cursor.execute("SELECT id, title, created_at FROM sessions ORDER BY created_at DESC").fetchall()
    conn.close()
    if not rows:
        def_id = ensure_default_session()
        return JSONResponse(content={"sessions": [{"id": def_id, "title": "New Chat", "created_at": ""}]})
    return JSONResponse(content={"sessions": [{"id": r[0], "title": r[1], "created_at": r[2]} for r in rows]})


@app.get("/all-sessions")
async def get_all_sessions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rows = cursor.execute("SELECT id, title, created_at FROM sessions ORDER BY created_at DESC").fetchall()
    conn.close()
    return JSONResponse(content={"sessions": [{"id": r[0], "title": r[1], "created_at": r[2]} for r in rows]})


@app.post("/sessions")
async def create_session(title: str = Form(default="New Chat")):
    session_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, title))
    conn.commit()
    conn.close()
    return JSONResponse(content={"id": session_id, "title": title})


@app.post("/new-chat")
async def new_chat():
    session_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, "New Chat"))
    conn.commit()
    conn.close()
    return JSONResponse(content={"session_id": session_id, "title": "New Chat"})


@app.get("/sessions/{session_id}")
async def get_session_messages(session_id: str):
    messages = load_all_session_messages(session_id)
    return JSONResponse(content={"session_id": session_id, "messages": messages})


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return JSONResponse(content={"status": "deleted", "session_id": session_id})


@app.post("/chat-text-stream")
async def chat_text_stream(message: str = Form(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()

    debug_request("/chat-text-stream", session_id, message)
    save_message(session_id, "user", message)
    recent = load_recent_messages(session_id, CONTEXT_MESSAGES)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + recent

    async def event_generator():
        try:
            response_stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                stream=True,
                temperature=0.3
            )
            full_reply = ""
            for chunk in response_stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text_chunk = chunk.choices[0].delta.content
                    full_reply += text_chunk
                    data_json = json.dumps({"chunk": text_chunk})
                    yield f"data: {data_json}\n\n"
                    await asyncio.sleep(0.01)

            save_message(session_id, "assistant", full_reply)
            try:
                await make_voice(full_reply)
            except Exception as e:
                print("TTS error:", e)
                
            yield f"data: {json.dumps({'done': True, 'full_reply': full_reply, 'audio_url': '/audio'})}\n\n"
        except Exception as err:
            print("Streaming API error:", err)
            yield f"data: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/chat")
async def chat_voice(audio: UploadFile = File(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()

    temp_path = os.path.join(tempfile.gettempdir(), f"temp_input_{uuid.uuid4().hex}.webm")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        with open(temp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                prompt="Bilingual conversation in Tamil and English (Thanglish). The speaker may switch between Tamil words, English words, or mix both in the same sentence. Transcribe accurately preserving what was actually said."
            )
        user_text = transcription.text.strip()
        debug_request("/chat", session_id, user_text or "<empty>")
    except Exception as e:
        print("STT Error:", e)
        user_text = ""

    if not user_text:
        return {"you_said": "", "ai_reply": "I could not hear anything clearly, please try again.", "audio_url": "/audio"}

    debug_user_text("chat_voice", session_id, user_text)
    save_message(session_id, "user", user_text)
    recent = load_recent_messages(session_id, CONTEXT_MESSAGES)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + recent
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3
    )
    ai_reply = response.choices[0].message.content
    save_message(session_id, "assistant", ai_reply)
    await make_voice(ai_reply)

    return {"you_said": user_text, "ai_reply": ai_reply, "audio_url": "/audio"}


@app.post("/chat-text")
async def chat_text(message: str = Form(...), session_id: str = Form(default="")):
    if not session_id:
        session_id = ensure_default_session()
    debug_request("/chat-text", session_id, message)
    save_message(session_id, "user", message)
    recent = load_recent_messages(session_id, CONTEXT_MESSAGES)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + recent
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3
    )
    ai_reply = response.choices[0].message.content
    save_message(session_id, "assistant", ai_reply)
    await make_voice(ai_reply)
    return {"you_said": message, "ai_reply": ai_reply, "audio_url": "/audio"}


@app.get("/history")
async def get_history(session_id: str = ""):
    if not session_id:
        session_id = ensure_default_session()
    messages = load_all_session_messages(session_id)
    return JSONResponse(content={"session_id": session_id, "messages": messages})


@app.post("/reset")
async def reset_chat(session_id: str = Form(default="")):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if session_id:
        cursor.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
    else:
        cursor.execute("DELETE FROM conversations")
        cursor.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
    return {"status": "reset"}


@app.post("/delete-all-history")
async def delete_all_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM conversations")
    cursor.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
    return {"status": "all history deleted"}


@app.get("/audio")
async def get_audio():
    return FileResponse("reply.mp3", media_type="audio/mpeg")


BASE_DIR = Path(__file__).resolve().parent
frontend_dist = BASE_DIR / "frontend" / "dist"
assets_dir = frontend_dist / "assets"
static_dir = BASE_DIR / "static"

if frontend_dist.exists():
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
elif static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)