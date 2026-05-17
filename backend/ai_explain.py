import json
import os

from google import genai


DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_RESPONSE_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "plain_explanation": {"type": "string"},
            "fix_suggestion": {"type": "string"},
            "severity_reason": {"type": "string"},
        },
        "required": ["plain_explanation", "fix_suggestion", "severity_reason"],
    },
}


def explain_vulnerabilities(scan_results):
    """Ask Gemini for plain-language explanations and merge them into findings."""
    vulnerabilities = scan_results.get("vulnerabilities", [])
    if not vulnerabilities:
        return []

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return [_with_fallback_explanation(vuln) for vuln in vulnerabilities]

    client = genai.Client(api_key=api_key)

    prompt = f"""You are a blockchain security expert.

A smart contract analysis found these vulnerabilities:

{json.dumps(vulnerabilities, indent=2)}

For EACH vulnerability provide:
- plain_explanation
- fix_suggestion
- severity_reason

Return ONLY valid JSON.
No markdown.
No extra text."""

    try:
        response = client.models.generate_content(
            model=get_gemini_model(),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": GEMINI_RESPONSE_SCHEMA,
                "temperature": 0.2,
            },
        )
        explanations = json.loads(_clean_json(response.text))
        if isinstance(explanations, dict):
            explanations = explanations.get("vulnerabilities", [])
        if not isinstance(explanations, list):
            raise ValueError("Gemini response must be a JSON list")
    except Exception:
        return [_with_fallback_explanation(vuln) for vuln in vulnerabilities]

    merged = []
    for index, vulnerability in enumerate(vulnerabilities):
        explanation = explanations[index] if index < len(explanations) and isinstance(explanations[index], dict) else {}
        merged.append(
            {
                **vulnerability,
                "plain_explanation": explanation.get(
                    "plain_explanation",
                    "This finding was detected by Slither and should be reviewed before deployment.",
                ),
                "fix_suggestion": explanation.get(
                    "fix_suggestion",
                    "Review the affected code path and apply the secure Solidity pattern recommended for this issue.",
                ),
                "severity_reason": explanation.get(
                    "severity_reason",
                    f"Slither classified this issue as {vulnerability.get('severity', 'Informational')}.",
                ),
            }
        )

    return merged


def get_gemini_model():
    return os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)


def _clean_json(text):
    cleaned = (text or "").strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _with_fallback_explanation(vulnerability):
    return {
        **vulnerability,
        "plain_explanation": "Slither detected this security concern in the submitted contract.",
        "fix_suggestion": "Inspect the affected lines and update the Solidity logic to follow secure design patterns.",
        "severity_reason": f"The scanner classified this as {vulnerability.get('severity', 'Informational')}.",
    }
