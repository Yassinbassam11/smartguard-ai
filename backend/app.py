import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from ai_explain import explain_vulnerabilities
from ipfs_upload import upload_to_ipfs
from scanner import scan_contract


ROOT_ENV = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ROOT_ENV)

app = Flask(__name__)
CORS(app)
limiter = Limiter(get_remote_address, app=app, default_limits=["30 per minute"])


@app.post("/analyze")
@limiter.limit("5 per minute")
def analyze():
    try:
        payload = request.get_json(silent=True) or {}
        audit_id = payload.get("audit_id")
        code = payload.get("code", "")

        if audit_id is None:
            return jsonify({"success": False, "error": "audit_id is required"}), 400

        scan_results = scan_contract(code)
        vulnerabilities = explain_vulnerabilities(scan_results)

        report = {
            "audit_id": audit_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "vulnerabilities": vulnerabilities,
            "total_issues": scan_results["total"],
            "highest_severity": scan_results["highest_severity"],
        }
        ipfs = upload_to_ipfs(report)

        return jsonify(
            {
                "success": True,
                "audit_id": audit_id,
                "vulnerabilities": vulnerabilities,
                "total_issues": scan_results["total"],
                "highest_severity": scan_results["highest_severity"],
                "ipfs_hash": ipfs["ipfs_hash"],
                "ipfs_url": ipfs["ipfs_url"],
            }
        )
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except TimeoutError as exc:
        return jsonify({"success": False, "error": str(exc)}), 504
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/health")
def health():
    try:
        slither_available = shutil.which("slither") is not None
        gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
        status = "ok" if slither_available and gemini_configured else "degraded"
        return jsonify(
            {
                "status": status,
                "slither": slither_available,
                "gemini": gemini_configured,
            }
        )
    except Exception as exc:
        return jsonify({"status": "error", "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
