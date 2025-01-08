# 
# Release Builder
# 
FROM 289208114389.dkr.ecr.us-east-1.amazonaws.com/moonlight-images/moonlight-build:20.13.1-bbf42821ad1b0f6f5f25e14f172d107bb4cd380e AS builder
ARG GITHUB_TOKEN_MOONLIGHT
ARG MOONLIGHT_ENV
RUN echo "@picpay:registry=https://npm.pkg.github.com" > ~/.npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN_MOONLIGHT" >> ~/.npmrc
COPY . .

RUN yarn install --frozen-lockfile --network-timeout 600000 && \
    rm -rf "$(yarn cache dir)" && \
    yarn tsc && \
    yarn build 
# 
# Release Backend Clean
# 
FROM 289208114389.dkr.ecr.us-east-1.amazonaws.com/moonlight-images/moonlight-release:20.13.1-fec96b2e5c4ca80df03da7696b5d99109d6abe8b AS backend
WORKDIR /app
ENV NODE_OPTIONS=--no-node-snapshot
COPY --from=builder /packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz
COPY --from=builder /node_modules/ /app/node_modules/
COPY --from=builder /packages/backend/node_modules/ /app/packages/backend/node_modules/
COPY app-config.* .
COPY github-apps* .
COPY backstage.json .

# Copy the docker-entrypoint.sh script
COPY docker-entrypoint.sh /usr/local/bin/

# Ensure the entrypoint script is executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set the entrypoint to the script
ENTRYPOINT ["docker-entrypoint.sh"]


CMD ["node", "packages/backend", "--config", "app-config.yaml"]
