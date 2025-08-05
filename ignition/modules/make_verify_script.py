from pathlib import Path
import json
from typing import Any

journal_path = Path(__file__).parent.parent / "deployments" / "chain-7000" / "journal.jsonl"
assert journal_path.is_file()

journal = journal_path.read_text(encoding="utf-8")
journal_lines = journal.strip().splitlines()

data: dict[str, Any] = {}

for line in journal_lines:
    json_entry = json.loads(line)
    if json_entry["type"] == "DEPLOYMENT_EXECUTION_STATE_INITIALIZE":
        futureId = json_entry["futureId"]
        data[futureId] = {}
        data[futureId]["initialize"] = json_entry
    if json_entry["type"] == "DEPLOYMENT_EXECUTION_STATE_COMPLETE":
        futureId = json_entry["futureId"]
        data[futureId]["complete"] = json_entry

print(json.dumps(data, indent=2))

output = ""
for future_id, entry in data.items():
    contract_name = entry["initialize"]["contractName"]
    contructor_args = entry["initialize"]["constructorArgs"]
    contructor_args_cmd = f'"{contructor_args}"' if len(contructor_args) > 0 else ""
    assert entry["complete"]["result"]["type"] == "SUCCESS"
    address = entry["complete"]["result"]["address"]
    cmd_line = f'pnpm exec hardhat verify {address} {contructor_args_cmd} --network zetachain --verbose # {future_id} {contract_name}'
    output += f"{cmd_line}\n"

(Path(__file__).parent / "verify.bash").write_text(output, encoding="utf-8", newline="\n")
