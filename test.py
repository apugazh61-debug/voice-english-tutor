from groq import Groq
from dotenv import load_dotenv
import os
import asyncio
import edge_tts
from faster_whisper import WhisperModel

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# STEP 1: Speech to Text
print("Loading Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")

segments, info = model.transcribe("test_audio.wav")
user_text = " ".join([segment.text for segment in segments])
print("You said:", user_text)

# STEP 2: LLM Response
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "system", "content": "You are an English tutor for Tamil speakers. Reply only in clear simple English, no Tamil script."},
        {"role": "user", "content": user_text}
    ]
)

ai_reply = response.choices[0].message.content
print("AI Reply:", ai_reply)

# STEP 3: Text to Speech
async def speak(text):
    voice = "en-IN-NeerjaNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save("reply.mp3")
    print("Voice saved as reply.mp3")

asyncio.run(speak(ai_reply))
