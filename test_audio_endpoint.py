import urllib.request
import json
import os

BASE_URL = 'http://127.0.0.1:8000'
audio_file_path = 'temp_input.webm'

if os.path.exists(audio_file_path):
    print('--- Test 5: /chat (Audio STT with Groq Whisper) ---')
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    with open(audio_file_path, 'rb') as f:
        file_bytes = f.read()

    body = (
        (f'--{boundary}\r\n'
         f'Content-Disposition: form-data; name="audio"; filename="recording.webm"\r\n'
         f'Content-Type: audio/webm\r\n\r\n').encode('utf-8')
        + file_bytes
        + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    )

    req = urllib.request.Request(
        f'{BASE_URL}/chat',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print('STT Transcribed Text (you_said):', res.get('you_said'))
        print('AI Reply:', res.get('ai_reply'))
        print('Audio URL:', res.get('audio_url'))
else:
    print('Audio file not found')