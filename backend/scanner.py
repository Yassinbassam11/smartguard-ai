import json
import os
import subprocess
from pathlib import Path

import solcx


TEMP_CONTRACT = Path("temp_contract.sol")
SLITHER_OUTPUT = Path("slither_output.json")
MAX_CONTRACT_SIZE = 50 * 1024
SEVERITY_ORDER = {
    "Informational": 0,
    "Low": 1,
    "Medium": 2,
    "High": 3,
}


def scan_contract(solidity_code):
    """Run Slither against Solidity source code and return normalized findings."""
    if not isinstance(solidity_code, str) or "pragma solidity" not in solidity_code:
        raise ValueError('Invalid Solidity input: missing "pragma solidity"')

    if len(solidity_code.encode("utf-8")) > MAX_CONTRACT_SIZE:
        raise ValueError("Invalid Solidity input: contract exceeds 50KB limit")

    try:
        TEMP_CONTRACT.write_text(solidity_code, encoding="utf-8")

        solcx.install_solc("0.8.20")
        solcx.set_solc_version("0.8.20")

        completed = subprocess.run(
            ["slither", str(TEMP_CONTRACT), "--json", str(SLITHER_OUTPUT)],
            timeout=60,
            capture_output=True,
            text=True,
            check=False,
        )

        if not SLITHER_OUTPUT.exists():
            message = completed.stderr or completed.stdout or "Slither did not produce output"
            raise RuntimeError(f"Slither failure: {message.strip()}")

        try:
            raw = json.loads(SLITHER_OUTPUT.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError("Slither returned malformed JSON") from exc

        vulnerabilities = _parse_detectors(raw)

        return {
            "vulnerabilities": vulnerabilities,
            "total": len(vulnerabilities),
            "highest_severity": _highest_severity(vulnerabilities),
        }
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("Slither analysis timed out after 60 seconds") from exc
    finally:
        for temp_file in (TEMP_CONTRACT, SLITHER_OUTPUT):
            try:
                if temp_file.exists():
                    temp_file.unlink()
            except OSError:
                pass


def _parse_detectors(raw):
    detectors = raw.get("results", {}).get("detectors", [])
    vulnerabilities = []

    for detector in detectors:
        severity = _normalize_severity(detector.get("impact", "Informational"))
        lines = _extract_lines(detector.get("elements", []))
        vulnerabilities.append(
            {
                "name": detector.get("check", "Unknown finding"),
                "severity": severity,
                "confidence": detector.get("confidence", "Unknown"),
                "description": detector.get("description", "").strip(),
                "lines": lines,
            }
        )

    return vulnerabilities


def _normalize_severity(value):
    normalized = str(value or "Informational").strip().capitalize()
    if normalized == "Optimization":
        return "Informational"
    return normalized if normalized in SEVERITY_ORDER else "Informational"


def _extract_lines(elements):
    found = set()
    for element in elements:
        source_mapping = element.get("source_mapping", {})
        lines = source_mapping.get("lines", [])
        for line in lines:
            if isinstance(line, int):
                found.add(line)
    return sorted(found)


def _highest_severity(vulnerabilities):
    highest = "Informational"
    for vulnerability in vulnerabilities:
        severity = vulnerability.get("severity", "Informational")
        if SEVERITY_ORDER.get(severity, 0) > SEVERITY_ORDER[highest]:
            highest = severity
    return highest
