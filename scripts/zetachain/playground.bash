# curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://127.0.0.1:8545/

# curl -X POST --data '{
#   "jsonrpc":"2.0",
#   "method":"eth_getBalance",
#   "params":["0x08Dc95e43a27Cf1F42e2fcbbaAdC3BBc06722565", "latest"],
#   "id":1
# }' -H "Content-Type: application/json" http://127.0.0.1:8545/

# curl -X POST --data '{
#   "jsonrpc":"2.0",
#   "method":"eth_getBalance",
#   "params":["0x08Dc95e43a27Cf1F42e2fcbbaAdC3BBc06722565", "latest"],
#   "id":1
# }' -H "Content-Type: application/json" $ZETACHAIN_RPC_URL

# To mine block:
# curl -X POST --data '{
#   "jsonrpc": "2.0",
#   "method": "evm_mine",
#   "params": [],
#   "id": 1
# }' -H "Content-Type: application/json" http://localhost:8545

# To mine 5 blocks (hex value)
# curl -X POST --data '{
#   "jsonrpc": "2.0",
#   "method": "hardhat_mine",
#   "params": ["0x5"],
#   "id": 1
# }' -H "Content-Type: application/json" http://localhost:8545

# To get block timestamp:
# curl -X POST --data '{
#   "jsonrpc": "2.0",
#   "method": "eth_getBlockByNumber",
#   "params": ["latest", false],
#   "id": 1
# }' -H "Content-Type: application/json" http://localhost:8545
