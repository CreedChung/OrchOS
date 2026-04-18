FROM docker.io/cloudflare/sandbox:0.8.11

WORKDIR /workspace

ENV GIT_AUTHOR_NAME="Orchos Sandbox" \
    GIT_AUTHOR_EMAIL="sandbox@orchos.local" \
    GIT_COMMITTER_NAME="Orchos Sandbox" \
    GIT_COMMITTER_EMAIL="sandbox@orchos.local"

RUN corepack enable || true
RUN mkdir -p /workspace/projects
