
include .env
export

CWD=$(shell pwd)

.PHONY: up-native test build setup backend frontend clean

precheck:
	./check-local-configs.sh

envar:
	touch .env
	cp .env.example .env
	
###########################
##### Docker Commands #####
###########################
DOCKER_COMMAND=docker-compose run -w /app --name moonlight --rm --entrypoint="" backend.moonlight.dev
init: install up

build-image:
	docker-compose build

up-db:
	docker-compose up -d db

up-infra:
	docker-compose up -d db redis

up-all-infra:
	docker-compose up -d db opensearch-node opensearch-dashboards redis  

install:
	$(DOCKER_COMMAND) /bin/bash -c "yarn install --frozen-lockfile --network-timeout 600000 && yarn tsc && yarn build"
	cp packages/backend/dist/bundle.tar.gz ./
	tar xzf bundle.tar.gz && rm bundle.tar.gz

up:
	docker-compose up -d

down:
	docker-compose down

###########################
##### Native Commands #####
###########################
init-native: load-envs install-native up-native
load-envs:
	export $(cat .env | xargs)

install-native:
	@yarn install
	@yarn tsc
	@yarn build

build.test: install-native
	@yarn test:all

up-native: precheck
	@yarn dev --config app-config.local.yaml

clean:
	rm -rf node_modules && rm -rf dist-types  && cd packages/app && rm -rf node_modules  && rm -rf dist && cd .. && cd backend && rm -rf node_modules && rm -rf dist
	make clean-plugins
	npx rimraf .//node_modules .//dist ./dist-types

DIRECTORIES = $(sort $(dir $(wildcard plugins/*/.)))
DIST = dist
NODE_MODULES = node_modules
clean-plugins:
	$(foreach dir, $(DIRECTORIES), rm -rf $(dir)$(DIST) && rm -rf $(dir)$(NODE_MODULES))

create-app-gh:
	yarn backstage-cli create-github-app $(org)

update-moonlight:
	yarn backstage-cli versions:bump

check-version:
	yarn backstage-cli versions:check

lint:
	yarn backstage-cli package lint

discovery:
	MOONLIGHT_AUTODISCOVER_WORKER=true \
	MOONLIGHT_AUTODISCOVER_INTERVAL_SECONDS=300 \
	MOONLIGHT_AUTODISCOVER_STRATEGY=CRONJOB \
	MOONLIGHT_BACKEND_PORT=7002 \
	yarn start-backend 
	
app: up-db
	@yarn dev

plugin-backend:
	@yarn new --select backend-plugin

plugin-front:
	@yarn new --select plugin

backend: precheck
	@yarn start-backend --config ../../app-config.local.yaml

backend-pg:
	@yarn start-backend --config ../../app-config.pg.local.yaml  

frontend: precheck
	@open -na Google\ Chrome 'http://localhost:3000' --args --disable-web-security --user-data-dir="/tmp/chrome_dev_test" 
	@yarn start --config ../../app-config.local.yaml

frontend-pg:
	@open -na Google\ Chrome 'http://localhost:3000' --args --disable-web-security --user-data-dir="/tmp/chrome_dev_test" 
	@yarn start --config ../../app-config.pg.local.yaml  

up-plugin:
	@echo "STARTING PKG: $(PWD)/plugins/$(word 2, $(MAKECMDGOALS))"
	@LEGACY_BACKEND_START=true yarn --cwd $(PWD)/plugins/$(word 2, $(MAKECMDGOALS)) start --config ../../app-config.local.yaml

test:
	@yarn install --silent
	@yarn tsc
	@yarn test:all

test-container:
	@docker-compose up --build -d moonlight-test 

build:
	@docker-compose up --build -d moonlight-build

setup:
	brew install asdf
	asdf plugin add nodejs
	asdf plugin add yarn
	asdf install nodejs 20.18.1
	asdf install yarn latest
	export PATH="$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"


check-all:
	npx npm-check-updates --deep -x "*event-tracking"

check:
	npx npm-check-updates

scaffolder:
	@cd plugins/picpay-scaffolder-$(plugin)-backend && LEGACY_BACKEND_START=true yarn start --config ../../app-config.local.yaml

intermediator: 
	@make scaffolder plugin=templates-intermediator	

