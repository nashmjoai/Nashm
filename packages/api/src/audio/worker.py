import argparse
import json
import os
import sys

import assemblyai as aai


SPEECH_MODELS = ["universal-3-5-pro", "universal-2"]
WEBHOOK_AUTH_HEADER_NAME = "x-webhook-secret"


def build_config(webhook_url, webhook_secret, language_code=None):
    config = {
        "speech_models": SPEECH_MODELS,
        "speaker_labels": True,
        "webhook_url": webhook_url,
        "webhook_auth_header_name": WEBHOOK_AUTH_HEADER_NAME,
        "webhook_auth_header_value": webhook_secret,
    }

    if language_code and language_code != "auto":
        config["language_code"] = language_code
    else:
        config["language_detection"] = True

    return aai.TranscriptionConfig(**config)


def submit_transcript(file_path, api_key, webhook_url, webhook_secret, language_code=None):
    aai.settings.api_key = api_key
    aai.settings.http_timeout = float(os.getenv("ASSEMBLYAI_HTTP_TIMEOUT_SECONDS", "60"))

    config = build_config(webhook_url, webhook_secret, language_code)
    transcript = aai.Transcriber(config=config).submit(file_path)

    try:
        response = transcript.json_response or {}
    except Exception:
        response = {}

    response.update(
        {
            "id": transcript.id,
            "speech_models": SPEECH_MODELS,
        }
    )
    print(json.dumps(response, default=str))


def main():
    parser = argparse.ArgumentParser(description="AssemblyAI transcription worker")
    parser.add_argument("--file", required=True, help="Path to local audio file")
    parser.add_argument("--apiKey", required=True, help="AssemblyAI API Key")
    parser.add_argument("--webhookUrl", required=True, help="Callback Webhook URL")
    parser.add_argument("--webhookSecret", required=True, help="Callback Webhook Authorization Secret")
    parser.add_argument("--languageCode", help="Explicit Language Code")

    args = parser.parse_args()

    if not args.apiKey:
        sys.stderr.write("AssemblyAI API key is missing.\n")
        sys.exit(1)

    if not os.path.exists(args.file):
        sys.stderr.write(f"File not found: {args.file}\n")
        sys.exit(1)

    try:
        submit_transcript(
            args.file,
            args.apiKey,
            args.webhookUrl,
            args.webhookSecret,
            args.languageCode,
        )
    except aai.AssemblyAIError as error:
        sys.stderr.write(f"AssemblyAI error: {str(error)}\n")
        sys.exit(1)
    except Exception as error:
        sys.stderr.write(f"Error submitting transcript: {str(error)}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
