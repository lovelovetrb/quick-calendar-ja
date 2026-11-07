.PHONY: install deps build lint format update-holidays clean

# clone 直後に `make` だけでインストールできるようにする
install: deps
	./scripts/install.sh

deps:
	pnpm install --frozen-lockfile

build: deps
	pnpm build

lint: deps
	pnpm lint

format: deps
	pnpm fix-lint

update-holidays:
	pnpm update-holidays

clean:
	rm -rf node_modules dist
