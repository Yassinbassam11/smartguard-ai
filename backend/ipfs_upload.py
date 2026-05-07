import json
import os

import requests


PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs"


def upload_to_ipfs(report_data):
    """Upload report JSON to Pinata and return IPFS metadata."""
    jwt = os.getenv("PINATA_JWT")
    if not jwt:
        raise RuntimeError("PINATA_JWT is not configured")

    payload = {
        "pinataMetadata": {"name": f"smartguard-audit-{report_data.get('audit_id', 'report')}"},
        "pinataContent": report_data,
    }
    headers = {
        "Authorization": f"Bearer {jwt}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        PINATA_ENDPOINT,
        headers=headers,
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    ipfs_hash = body.get("IpfsHash")
    if not ipfs_hash:
        raise RuntimeError("Pinata response did not include IpfsHash")

    return {
        "ipfs_hash": ipfs_hash,
        "ipfs_url": f"{PINATA_GATEWAY}/{ipfs_hash}",
    }
