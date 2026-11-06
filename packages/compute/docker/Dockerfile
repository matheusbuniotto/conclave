FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    py3-pip \
    sqlite \
    sqlite-dev \
    curl \
    bash \
    git

WORKDIR /workspace

# Install a simple static file server utility
RUN npm install -g serve

EXPOSE 3000

CMD ["tail", "-f", "/dev/null"]
