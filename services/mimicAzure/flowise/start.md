To launch Flowise (an open-source low-code platform for building LLM applications) using Docker, you have a few options based on the official documentation. The simplest method is to pull and run the pre-built image directly from Docker Hub. For more advanced setups with persistence or queue mode, use Docker Compose. I'll outline both below. Ensure Docker is installed on your system before proceeding.

### Method 1: Run the Pre-Built Docker Image (Simplest for Quick Launch)

This pulls the official `flowiseai/flowise` image and runs it in a container. By default, it uses SQLite for storage, but data won't persist across container restarts without volumes (see notes below).

1. Pull and run the container in detached mode:

   ```
   docker run -d \
     --name flowise \
     -p 3000:3000 \
     flowiseai/flowise
   ```

   - `-d`: Runs the container in the background.
   - `--name flowise`: Names the container for easy management.
   - `-p 3000:3000`: Maps port 3000 on your host to the container's port 3000 (Flowise's default).

2. Verify it's running:

   ```
   docker ps
   ```

   You should see the `flowise` container listed as "Up."

3. Access Flowise:
   Open your browser and go to `http://localhost:3000`. You'll see the Flowise dashboard where you can start building flows.

4. Stop the container when done:

   ```
   docker stop flowise
   ```

   To remove it: `docker rm flowise`.

**Notes on Persistence:** For production or to save your flows/data, add a volume mount to persist the `~/.flowise` directory (used for database, secrets, and storage):

```
docker run -d \
  --name flowise \
  -p 3000:3000 \
  -v ~/.flowise:/root/.flowise \
  flowiseai/flowise
```

This maps your local `~/.flowise` folder to the container's internal path. Create the local directory first if needed: `mkdir -p ~/.flowise`.

You can also set environment variables (e.g., for custom port or database) via `-e` flags, like `-e PORT=8080`. Refer to the `.env.example` in the repo for available options.

### Method 2: Use Docker Compose (Recommended for Development/Production with More Control)

This method clones the official repo and uses the provided `docker-compose.yml` file, which handles the image pull and allows easy configuration via a `.env` file. It's useful if you want to customize settings or scale.

1. Clone the Flowise repository:

   ```
   git clone https://github.com/FlowiseAI/Flowise.git
   cd Flowise
   ```

2. Navigate to the Docker directory:

   ```
   cd docker
   ```

3. Copy the example environment file:

   ```
   cp .env.example .env
   ```

   Edit `.env` if needed (e.g., set `PORT=3000`, database path, or secret keys). For basic use, the defaults work.

4. Start the services in detached mode:

   ```
   docker compose up -d
   ```

5. Verify the services:

   ```
   docker compose ps
   ```

   You should see the Flowise service running.

6. Access Flowise:
   Go to `http://localhost:3000` in your browser.

7. Stop the services:

   ```
   docker compose down
   ```

**Notes:**

- This uses the pre-built `flowiseai/flowise` image under the hood.
- For persistence, the compose file already includes a volume for `/root/.flowise`. You can customize it in `docker-compose.yml`.
- If you need queue mode for scaling (e.g., with Redis for handling multiple predictions), use the specialized `docker-compose-queue-prebuilt.yml` file from the docs and configure the `.env` accordingly (e.g., set `MODE=queue` and Redis URL).

If you encounter issues (e.g., port conflicts or missing dependencies), check the container logs with `docker logs flowise` or `docker compose logs`. For advanced configurations like using PostgreSQL instead of SQLite, modify the compose file to add a database service. Always pull the latest image with `docker pull flowiseai/flowise` before running.

## Mimic Azure

aai02.eduhk.hk/openai/deployments/gpt-4o-mini/chat/completions?Hello=

gpt-4o-mini

2024-12-01