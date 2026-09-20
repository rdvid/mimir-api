.PHONY: help setup dev up down logs restart rebuild ps clean migrate shell

ENV_FILE      ?= .local.env
COMPOSE       := docker compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_FLAGS := --remove-orphans

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Create .local.env from .env.default (if missing) and link .env for dotenv
	@test -f $(ENV_FILE) || (cp .env.default $(ENV_FILE) && echo "Created $(ENV_FILE) from .env.default")
	@ln -sf $(ENV_FILE) .env
	@echo "Ready — edit $(ENV_FILE) with your secrets if needed."

dev: setup ## Start dev stack with hot reload (foreground, Ctrl+C to stop)
	$(COMPOSE) up --build $(COMPOSE_FLAGS)

up: setup ## Start dev stack in background
	$(COMPOSE) up --build -d $(COMPOSE_FLAGS)
	@echo "API: http://localhost:$${PORT:-5000}"
	@echo "Logs: make logs"

down: ## Stop dev stack
	$(COMPOSE) down $(COMPOSE_FLAGS)

logs: ## Follow API logs
	$(COMPOSE) logs -f api

restart: ## Restart API container (picks up env changes)
	$(COMPOSE) restart api

rebuild: setup ## Force rebuild and restart dev stack
	$(COMPOSE) up --build -d --force-recreate $(COMPOSE_FLAGS)

ps: ## Show running containers
	$(COMPOSE) ps

clean: down ## Stop stack and remove dev volumes (DB data preserved)
	$(COMPOSE) down -v --remove-orphans
	@echo "Removed dev volumes (api node_modules). Postgres data kept unless you run: make nuke"

nuke: ## Stop everything and wipe ALL volumes including Postgres data (required after schema rewrite)
	$(COMPOSE) down -v --remove-orphans
	@echo "All volumes removed. Run: make up"

migrate: setup ## Run Knex migrations locally (requires Postgres on localhost:5432)
	npm run migrate

shell: ## Open a shell in the running API container
	$(COMPOSE) exec api sh
