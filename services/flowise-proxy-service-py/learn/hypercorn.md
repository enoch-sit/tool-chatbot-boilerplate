# Why We Use Hypercorn for Streaming in Docker

## The Problem: Streaming Worked Locally, But Not in Docker

You might have noticed a confusing issue: when running the application directly in the VS Code debugger, real-time streaming worked perfectly. However, when the same application was run inside a Docker container, the streaming feature would fail.

This is a classic "it works on my machine" problem, and the difference was the web server used in each environment.

- **Local Debugger:** Your `launch.json` was configured to use **Uvicorn**.
- **Docker Container:** The `docker-compose.test.yml` was initially trying to use Uvicorn, but was later switched to **Hypercorn** to fix the issue.

## What are Uvicorn and Hypercorn?

FastAPI, the framework this project is built on, is an **ASGI** (Asynchronous Server Gateway Interface) framework. This means it needs a special kind of server to run. `Uvicorn` and `Hypercorn` are both high-performance ASGI servers that can run FastAPI applications.

Think of them as the engine for your web application. While they both do the same fundamental job, they have different strengths.

## The Solution: Hypercorn for Better Streaming Support

The key reason streaming failed in Docker was that **Hypercorn has more robust support for advanced asynchronous features like streaming and WebSockets, especially within a containerized network environment.**

While Uvicorn is an excellent and popular server, some subtle differences in how it handles network connections can cause issues with long-lived streaming responses when running inside Docker. Hypercorn, in this case, handles it more gracefully.

### How We Fixed It

1.  **Identified the Right Tool:** We recognized that Hypercorn was better suited for our streaming needs in a Docker environment.

2.  **Updated the Docker Command:** We changed the `command` in the `docker-compose.test.yml` file to use `hypercorn` instead of `uvicorn`.

    **Incorrect (Uvicorn-style arguments that failed with Hypercorn):**
    ```yaml
    # This command caused an "unrecognized arguments" error
    command: hypercorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

    **Correct (The fix using Hypercorn's `--bind` argument):**
    ```yaml
    # This is the correct way to run Hypercorn
    command: hypercorn app.main:app --bind 0.0.0.0:8000 --reload
    ```

3.  **Ensured Consistency:** We also made sure the main `Dockerfile` uses `hypercorn` so that our production-like environment is consistent with our test environment.

## Key Takeaway

When you see a difference in behavior between your local machine and a Docker container, the environment is often the cause. In this case, switching from `Uvicorn` to `Hypercorn` provided the stability needed for our streaming feature to work reliably everywhere.
