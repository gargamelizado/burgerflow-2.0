# BurgerFlow Java Backend

Este diretório contém a base inicial de um backend Java com Spring Boot para o BurgerFlow.

## Como executar

1. Altere a senha do banco de dados em `src/main/resources/application.properties`.
2. Execute com Maven:

```bash
cd backend/java
mvn spring-boot:run
```

## Endpoints de exemplo

- `GET /api/health`

## Observação

O projeto atual do BurgerFlow usa MySQL, então o Spring Boot está configurado para conectar no banco `burger_flow_2_0`.
