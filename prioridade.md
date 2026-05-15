terminar de fazer frontend e backend ate as fuçoes basica (cardapio ,caixa,estoque,pedidos)


#token
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUxMzkzLCJleHAiOjE3Nzg1Mzc3OTN9.hLO9RYakQ-Cg1HeGCzKU2mCkBG76vqxlmM2wA4ImgkA"

curl -i http://localhost:3006/api/produtos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUxMzkzLCJleHAiOjE3Nzg1Mzc3OTN9.hLO9RYakQ-Cg1HeGCzKU2mCkBG76vqxlmM2wA4ImgkA"


  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM"

  curl -i -X PUT http://localhost:3006/api/produtos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "nome": "Produto Editado",
    "categoria": "",
    "tipo": "simples",
    "preco": 20.00,
    "custo": 10.00,
    "quantidade_estoque": 5,
    "unidade": "un",
    "ativo": true
  }'
  curl -i -X PUT http://localhost:3006/api/produtos/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "nome": "Produto Editado",
    "categoria": "",
    "tipo": "simples",
    "preco": 20.00,
    "custo": 10.00,
    "quantidade_estoque": 5,
    "unidade": "un",
    "ativo": true
  }'

curl -i -X POST http://localhost:3006/api/estoque/movimentar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NDUyMjM4LCJleHAiOjE3Nzg1Mzg2Mzh9.qUMOkkd9tUGcp6VdPBG07HlDdwTY23mSFylzhBwBTiM" \
  -d '{
    "produto_id": 1,
    "tipo": "entrada",
    "quantidade": 5,
    "motivo": "Reposição manual"
  }'







  mkdir backend/src/modules/inventory/inventory.routes.js inventory.controller.js inventory.service.js inventory.repository.js




  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU


  curl -i http://localhost:3006/api/caixa/aberto \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU"

  curl -i -X POST http://localhost:3006/api/caixa/abrir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "valor_inicial": 100,
    "observacao": "Abertura inicial"
  }'

  curl -i -X POST http://localhost:3006/api/caixa/fechar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "valor_final": 150,
    "observacao": "Fechamento manual"
  }'


  curl -i -X POST http://localhost:3006/api/caixa/movimento \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU" \
  -d '{
    "tipo": "sangria",
    "valor": 20,
    "motivo": "Retirada manual"
  }'

  curl -i http://localhost:3006/api/caixa/movimentos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlc3RvcXVlLmNvbSIsIm5pdmVsX2FjZXNzbyI6ImFkbWluIiwiaWF0IjoxNzc4NzEwOTgzLCJleHAiOjE3Nzg3OTczODN9.bF0yiq_hDR3DkZi7nDP1sx819ULscXwsAwCpAitQhaU"