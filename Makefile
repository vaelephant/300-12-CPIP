.PHONY: help test contract e2e front-check db-upgrade seed backup demo

help:
	@echo "make test         # backend pytest"
	@echo "make contract     # OpenAPI + JSON Schema + synthetic case validation"
	@echo "make e2e          # full API E2E against a running backend (:8000)"
	@echo "make front-check  # frontend typecheck + build"
	@echo "make db-upgrade   # alembic upgrade head"
	@echo "make seed         # seed demo data"
	@echo "make backup       # SQLite online backup"

test:
	cd back && python3 -m pytest -q

contract:
	python3 contracts/validate.py

e2e:
	cd back && python3 scripts/demo_e2e.py

front-check:
	cd front && npm run typecheck && npx vite build

db-upgrade:
	cd back && alembic upgrade head

seed:
	cd back && python3 -m app.seed

backup:
	cd back && python3 scripts/backup_sqlite.py
