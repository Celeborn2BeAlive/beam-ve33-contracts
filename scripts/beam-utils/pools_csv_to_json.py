import pandas as pd
from pathlib import Path
import json

records = pd.read_csv(Path(__file__).parent / "logs_0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603.csv").to_records()
pool_event = "0x91ccaa7a278130b65168c3a0c8d3bcae84cf5e43704342bd3ec0b59e59c036db"
records = filter(lambda record: record["FirstTopic"] == pool_event, records)
pools = ["0x" + record["Data"].split("0x000000000000000000000000")[1] for record in records]

Path(Path(__file__).parent / "pools.json").write_text(json.dumps(pools, indent=2))
