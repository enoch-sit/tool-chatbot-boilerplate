#!/usr/bin/env python3
"""
Accounting Service Testing Guide

This script helps you test the Accounting Service with the External Authentication Service,
checking JWT secrets consistency and verifying services are properly running.
"""

import os
import sys
import json
import subprocess
import re
import time
import platform
import requests
from datetime import datetime, timedelta

# Console colors for better readability
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(message):
    """Print a formatted header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.ENDC}\n")

def print_step(message):
    """Print a formatted step"""
    print(f"{Colors.BLUE}→ {message}{Colors.ENDC}")

def print_success(message):
    """Print a success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_warning(message):
    """Print a warning message"""
    print(f"{Colors.YELLOW}⚠ {message}{Colors.ENDC}")

def print_error(message):
    """Print an error message"""
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def run_command(command, shell=True):
    """Run a shell command and return the output, handling platform differences"""
    try:
        # Handle command formatting differently on Windows vs Linux
        if platform.system() == "Windows":
            # Ensure quotes are properly escaped for Windows shell
            if shell and '"' in command and not command.startswith('"'):
                # PowerShell and CMD have different escaping rules, try to accommodate both
                command = command.replace('\'', '"')
        
        result = subprocess.run(
            command, 
            shell=shell, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        print_warning(f"Command execution error: {e}")
        return "", str(e), 1

def check_docker_running():
    """Check if Docker is running"""
    print_step("Checking if Docker is running...")
    
    if platform.system() == "Windows":
        stdout, stderr, returncode = run_command("docker info")
    else:
        stdout, stderr, returncode = run_command("docker info")
    
    if returncode != 0:
        print_error("Docker is not running. Please start Docker Desktop and try again.")
        return False
    
    print_success("Docker is running.")
    return True

def list_docker_containers():
    """List all running Docker containers with their ports"""
    print_step("Listing running Docker containers...")
    
    # First get all containers (including non-running ones)
    stdout, stderr, returncode = run_command("docker ps -a --format '{{.Names}}'")
    
    if returncode != 0:
        print_error(f"Failed to list Docker containers: {stderr}")
        return []
    
    containers = []
    for container_name in stdout.strip().split('\n'):
        if container_name:
            # Get additional info for this container
            status_cmd = f"docker inspect --format='{{{{.State.Status}}}}' {container_name}"
            status, status_err, status_code = run_command(status_cmd)
            
            # If status command failed, use a fallback approach
            if status_code != 0 or not status.strip():
                # Alternative way to get status
                ps_cmd = f"docker ps -a --filter name={container_name} --format '{{{{.Status}}}}'"
                ps_status, _, _ = run_command(ps_cmd)
                status = ps_status.strip() or "unknown"
            
            ports_cmd = f"docker port {container_name}"
            ports, _, _ = run_command(ports_cmd)
            
            containers.append((container_name, status or "unknown", ports or "No ports exposed"))
    
    return containers

def find_auth_containers():
    """Find containers that might be authentication services"""
    all_containers = list_docker_containers()
    
    # Look for containers with auth, authentication, or auth-service in their names
    auth_containers = [(name, status, ports) for name, status, ports in all_containers if 'auth' in name.lower()]
    
    if not auth_containers:
        print_warning("No authentication service containers found.")
        return []
    
    print_success(f"Found {len(auth_containers)} potential authentication service containers.")
    return auth_containers

def select_auth_container():
    """Let the user select the authentication service container"""
    auth_containers = find_auth_containers()
    
    if not auth_containers:
        manual_entry = input("No authentication containers found. Would you like to enter a container name manually? (y/n): ").strip().lower()
        if manual_entry == 'y':
            container_name = input("Enter the authentication container name: ").strip()
            port = input("Enter the port the authentication service is running on (default: 3000): ").strip() or "3000"
            return container_name, port
        return None, None
    
    print("\nAvailable authentication containers:")
    for i, (name, status, ports) in enumerate(auth_containers, 1):
        # Extract port mappings for easier reading
        port_info = "No ports exposed"
        if ports:
            # Look for port mappings like 0.0.0.0:3000->3000/tcp
            port_matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:)?(\d+)(?:->(\d+))?', ports)
            if port_matches:
                port_info = ", ".join([f"{host+external if host else external}→{internal if internal else external}" 
                                     for host, external, internal in port_matches])
        
        print(f"{i}. {name} ({status}) - Ports: {port_info}")
    
    selection = input("\nSelect the authentication service container (number or name, leave empty to use the first one): ").strip()
    
    if not selection:
        selected_container, _, ports = auth_containers[0]
        # Extract the port mapping for the first container (default)
        port = "3000"  # Default port
        if ports:
            port_matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:)?(\d+)(?:->(\d+))?', ports)
            if port_matches and port_matches[0][1]:
                port = port_matches[0][1]  # Use the external port
                
        print_success(f"Using the first container: {selected_container} (Port: {port})")
        return selected_container, port
    
    try:
        # If user entered a number
        idx = int(selection) - 1
        if 0 <= idx < len(auth_containers):
            selected_container, _, ports = auth_containers[idx]
            # Extract the port mapping for the selected container
            port = "3000"  # Default port
            if ports:
                port_matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:)?(\d+)(?:->(\d+))?', ports)
                if port_matches and port_matches[0][1]:
                    port = port_matches[0][1]  # Use the external port
                    
            print_success(f"Selected container: {selected_container} (Port: {port})")
            return selected_container, port
        else:
            print_error("Invalid selection number.")
            return select_auth_container()
    except ValueError:
        # If user entered the name
        matching = [(name, status, ports) for name, status, ports in auth_containers if selection.lower() in name.lower()]
        if matching:
            selected_container, _, ports = matching[0]
            # Extract the port mapping for the matching container
            port = "3000"  # Default port
            if ports:
                port_matches = re.findall(r'(\d+\.\d+\.\d+\.\d+:)?(\d+)(?:->(\d+))?', ports)
                if port_matches and port_matches[0][1]:
                    port = port_matches[0][1]  # Use the external port
                    
            print_success(f"Selected container: {selected_container} (Port: {port})")
            return selected_container, port
        else:
            print_error(f"No container matching '{selection}' found.")
            return select_auth_container()

def check_auth_service_running(container_name=None, port=None):
    """Check if the Authentication Service is running in Docker"""
    if not container_name:
        container_name, port = select_auth_container()
        if not container_name:
            print_error("No authentication service container selected.")
            return False, None
    
    print_step(f"Checking if Authentication Service '{container_name}' is running...")
    
    # Platform-specific docker status check approaches
    is_windows = platform.system() == "Windows"
    
    # First attempt: Use docker inspect to check container status
    if is_windows:
        # On Windows, we need to be careful with quote escaping
        status_cmd = f"docker inspect --format=\"{{{{.State.Status}}}}\" {container_name}"
    else:
        status_cmd = f"docker inspect --format='{{{{.State.Status}}}}' {container_name}"
    
    status, stderr, returncode = run_command(status_cmd)
    
    # If the inspect command failed, container might not exist
    if returncode != 0:
        print_warning(f"Container '{container_name}' not found with docker inspect.")
        
        # Get a full list of containers to show the user
        print_step("Listing all Docker containers (including stopped ones):")
        all_containers, _, _ = run_command("docker ps -a --format '{{.Names}}'")
        container_list = all_containers.strip().split('\n')
        
        if not container_list or not container_list[0]:
            print_error("No containers found at all.")
            return False, None
        
        # Try to find similar container names
        similar_containers = []
        for container in container_list:
            if container and (container_name.lower() in container.lower() or 
                container.lower() in container_name.lower() or
                "auth" in container.lower()):
                similar_containers.append(container)
        
        if similar_containers:
            print_warning(f"Found similar containers: {', '.join(similar_containers)}")
            use_container = input(f"Would you like to use '{similar_containers[0]}' instead? (y/n): ").strip().lower()
            if use_container == 'y':
                container_name = similar_containers[0]
                print_success(f"Using container: '{container_name}'")
                
                # Get the status of the new container - try multiple methods
                if is_windows:
                    status_cmd = f"docker inspect --format=\"{{{{.State.Status}}}}\" {container_name}"
                else:
                    status_cmd = f"docker inspect --format='{{{{.State.Status}}}}' {container_name}"
                status, _, _ = run_command(status_cmd)
            else:
                print_error(f"Authentication Service container '{container_name}' not found.")
                return False, None
        else:
            print_error(f"Authentication Service container '{container_name}' not found.")
            print_warning("You may need to start the Authentication Service first.")
            return False, None
    
    # Try multiple approaches to determine if the container is running
    is_running = False
    
    # Method 1: Check the inspect status directly
    if status and status.lower() == "running":
        is_running = True
    else:
        # Method 2: Use docker ps to check if the container is in the running list
        ps_cmd = f"docker ps --filter name={container_name} --format '{{{{.Names}}}}'"
        ps_output, _, ps_code = run_command(ps_cmd)
        
        if ps_code == 0 and ps_output.strip() and container_name in ps_output:
            is_running = True
        else:
            # Method 3: Check detailed status from docker ps -a
            ps_all_cmd = f"docker ps -a --filter name={container_name} --format '{{{{.Status}}}}'"
            ps_status, _, _ = run_command(ps_all_cmd)
            
            if ps_status and ("Up" in ps_status or "running" in ps_status.lower()):
                is_running = True
    
    if not is_running:
        print_error(f"Container '{container_name}' exists but is not running (status: {status or 'unknown'}).")
        print_error("The Authentication Service must be running to continue with testing.")
        
        # Offer to start the container if it exists but is not running
        should_start = input(f"Would you like to start the container '{container_name}' now? (y/n): ").strip().lower()
        if should_start == 'y':
            print_step(f"Starting container '{container_name}'...")
            start_cmd = f"docker start {container_name}"
            start_output, start_error, start_code = run_command(start_cmd)
            
            if start_code == 0:
                print_success(f"Container '{container_name}' started successfully.")
                # Wait a moment for services to initialize
                print_step("Waiting for services to initialize...")
                time.sleep(5)
                is_running = True
            else:
                print_error(f"Failed to start container: {start_error}")
                print_warning("Please start the Authentication Service first using the instructions in the guide.")
                return False, None
        else:
            print_warning("Please start the Authentication Service first using the instructions in the guide.")
            return False, None
    
    print_success(f"Authentication Service container '{container_name}' is running.")
    
    # Determine port - check port mappings if not specified
    if not port:
        # Try multiple approaches to get port
        port_cmd = f"docker port {container_name} 3000"
        port_info, _, port_code = run_command(port_cmd)
        
        if port_code == 0 and port_info.strip():
            # Format is usually like "0.0.0.0:3000"
            port_match = re.search(r':(\d+)', port_info)
            if port_match:
                port = port_match.group(1)
            else:
                port = "3000"  # Default
        else:
            # Alternative approach for getting ports
            inspect_port_cmd = f"docker inspect --format='{{{{json .NetworkSettings.Ports}}}}' {container_name}"
            port_json, _, _ = run_command(inspect_port_cmd)
            
            if port_json and "3000/tcp" in port_json:
                # Try to parse the JSON and extract the port
                try:
                    import json
                    ports_data = json.loads(port_json)
                    if "3000/tcp" in ports_data and ports_data["3000/tcp"]:
                        host_port = ports_data["3000/tcp"][0]["HostPort"]
                        if host_port:
                            port = host_port
                except Exception:
                    port = "3000"  # Default if parsing fails
            else:
                port = "3000"  # Default
    
    global AUTH_CONTAINER, AUTH_PORT
    AUTH_CONTAINER = container_name
    AUTH_PORT = port
    
    print_success(f"Using port {AUTH_PORT} for authentication service.")
    return True, AUTH_PORT

def check_auth_service_health():
    """Check if the Authentication Service API is responding"""
    print_step("Checking Authentication Service health...")
    
    # Use the AUTH_PORT from the selected container
    auth_url = f"http://localhost:{AUTH_PORT}/health"
    print_step(f"Checking health at {auth_url}")
    
    try:
        response = requests.get(auth_url, timeout=5)
        if response.status_code == 200:
            print_success("Authentication Service is healthy.")
            return True
        else:
            print_error(f"Authentication Service returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Authentication Service: {e}")
        return False

def check_accounting_service_running():
    """Check if the Accounting Service is running in Docker"""
    print_step("Checking if Accounting Service is running...")
    
    stdout, stderr, returncode = run_command("docker ps --filter name=accounting-service --format '{{.Names}} {{.Status}}'")
    
    if not stdout:
        print_warning("Accounting Service container is not running.")
        return False
    
    print_success(f"Accounting Service container is running: {stdout}")
    return True

def check_accounting_service_health():
    """Check if the Accounting Service API is responding"""
    print_step("Checking Accounting Service health...")
    
    try:
        response = requests.get("http://localhost:3001/health", timeout=5)
        if response.status_code == 200:
            print_success("Accounting Service is healthy.")
            return True
        else:
            print_error(f"Accounting Service returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_warning(f"Failed to connect to Accounting Service: {e}")
        print("This might be expected if you haven't started the Accounting Service yet.")
        return False

def read_dotenv_file(file_path):
    """Read key-value pairs from a .env file"""
    env_vars = {}
    
    if not os.path.exists(file_path):
        return env_vars
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            key_value = line.split('=', 1)
            if len(key_value) == 2:
                key, value = key_value
                env_vars[key.strip()] = value.strip().strip('"\'')
    
    return env_vars

def check_jwt_secrets():
    """Check if JWT secrets are consistent between services"""
    print_step("Checking JWT secrets consistency...")
    
    # The expected secret from the guide
    expected_secret = "dev_access_secret_key_change_this_in_production"
    
    # Check if .env file exists for accounting service
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        env_vars = read_dotenv_file(env_path)
        accounting_secret = env_vars.get('JWT_ACCESS_SECRET', '')
        
        if accounting_secret:
            print_success(f"Found JWT_ACCESS_SECRET in accounting service .env file: {accounting_secret[:5]}...")
            
            # Get JWT secret from auth container if possible
            if AUTH_CONTAINER:
                print_step(f"Attempting to check JWT secret in '{AUTH_CONTAINER}' container...")
                
                stdout, stderr, returncode = run_command(f"docker exec {AUTH_CONTAINER} printenv JWT_ACCESS_SECRET")
                
                if returncode == 0 and stdout.strip():
                    auth_secret = stdout.strip()
                    print_success(f"Found JWT_ACCESS_SECRET in auth container: {auth_secret[:5]}...")
                    
                    if accounting_secret == auth_secret:
                        print_success("JWT secrets match between services!")
                    else:
                        print_error("JWT secrets do not match between services!")
                        print(f"  Accounting Service: {accounting_secret[:5]}...")
                        print(f"  Auth Service: {auth_secret[:5]}...")
                        print_warning("JWT authentication will fail if these secrets don't match.")
                        return False
                else:
                    print_warning(f"Could not check JWT secret in auth container. This is normal if the container doesn't expose it.")
                    print(f"Using default expected value: {expected_secret[:5]}...")
                    
                    if accounting_secret == expected_secret:
                        print_success("Accounting Service JWT_ACCESS_SECRET matches the expected value.")
                    else:
                        print_warning(f"Accounting Service JWT_ACCESS_SECRET ({accounting_secret[:5]}...) doesn't match expected value ({expected_secret[:5]}...).")
                        print_warning("If this is intentional, make sure both services use the same secret.")
            else:
                if accounting_secret == expected_secret:
                    print_success("Accounting Service JWT_ACCESS_SECRET matches the expected value.")
                else:
                    print_warning(f"Accounting Service JWT_ACCESS_SECRET ({accounting_secret[:5]}...) doesn't match expected value ({expected_secret[:5]}...).")
                    print_warning("If this is intentional, make sure both services use the same secret.")
            
            return True
        else:
            print_warning("JWT_ACCESS_SECRET not found in Accounting Service .env file.")
            print_warning("You may need to create a .env file with the following content:")
            print("""
# Server configuration
PORT=3001
NODE_ENV=development

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accounting_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT configuration (must match Authentication Service)
JWT_ACCESS_SECRET=dev_access_secret_key_change_this_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_key_change_this_in_production

# CORS configuration
CORS_ORIGIN=http://localhost:3000

# Authentication Service URL
AUTH_SERVICE_URL=http://localhost:3000
            """)
            return False
    else:
        print_warning(".env file not found for Accounting Service.")
        print_warning("You need to create a .env file with matching JWT secrets.")
        return False
    
    return True

def create_dotenv_file():
    """Create a .env file for the Accounting Service with the correct JWT secrets"""
    print_step("Creating .env file for Accounting Service...")
    
    env_content = """# Server configuration
PORT=3001
NODE_ENV=development

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accounting_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT configuration (must match Authentication Service)
JWT_ACCESS_SECRET=dev_access_secret_key_change_this_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_key_change_this_in_production

# CORS configuration
CORS_ORIGIN=http://localhost:3000

# Authentication Service URL
AUTH_SERVICE_URL=http://localhost:3000
"""
    
    env_path = os.path.join(os.getcwd(), '.env')
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print_success(f".env file created at {env_path}")
        return True
    except Exception as e:
        print_error(f"Failed to create .env file: {e}")
        return False

def start_accounting_service():
    """Start the Accounting Service using Docker Compose"""
    print_step("Starting Accounting Service with Docker Compose...")
    
    stdout, stderr, returncode = run_command("docker-compose up -d")
    
    if returncode != 0:
        print_error(f"Failed to start Accounting Service: {stderr}")
        return False
    
    print_success("Accounting Service started successfully.")
    print("Waiting for services to fully initialize...")
    time.sleep(5)  # Give services time to initialize
    return True

def create_test_user():
    """Create a test user in the Authentication Service"""
    print_step("Creating a test user in the Authentication Service...")
    
    try:
        response = requests.post(
            f"http://localhost:{AUTH_PORT}/api/auth/signup",
            json={
                "username": "testuser",
                "email": "testuser@example.com",
                "password": "Password123!"
            },
            timeout=10
        )
        
        if response.status_code == 201 or response.status_code == 200:
            print_success("Test user created successfully.")
            print("Please check MailHog at http://localhost:8025 for the verification email.")
            print("You'll need the verification code to continue.")
            return True
        else:
            if "already exists" in response.text:
                print_warning("User already exists. This is okay, we can use this account.")
                return True
            else:
                print_error(f"Failed to create test user: {response.text}")
                return False
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Authentication Service: {e}")
        return False

def verify_user_account():
    """Verify the user account with a verification code"""
    verification_code = input("Enter the verification code from the email (leave empty to skip if already verified): ").strip()
    
    if not verification_code:
        print_warning("Skipping verification step.")
        return True
    
    print_step(f"Verifying user account with code: {verification_code}")
    
    try:
        response = requests.post(
            f"http://localhost:{AUTH_PORT}/api/auth/verify-email",
            json={"token": verification_code},
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("User account verified successfully.")
            return True
        else:
            print_error(f"Failed to verify account: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Authentication Service: {e}")
        return False

def login_and_get_token():
    """Login to the Authentication Service and get a JWT token"""
    print_step("Logging in to get a JWT token...")
    
    try:
        response = requests.post(
            f"http://localhost:{AUTH_PORT}/api/auth/login",
            json={
                "username": "testuser@example.com",  # Using username field but with email value
                "password": "Password123!"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("accessToken", "")
            
            if access_token:
                print_success("Successfully obtained JWT token.")
                return access_token
            else:
                print_error("Access token not found in response.")
                return None
        else:
            print_error(f"Failed to login: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Authentication Service: {e}")
        return None

def test_accounting_service(token):
    """Test the Accounting Service with the JWT token"""
    print_step("Testing Accounting Service with JWT token...")
    
    if not token:
        print_error("No JWT token provided.")
        return False
    
    try:
        response = requests.get(
            "http://localhost:3001/api/credits/balance",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            print_success("Successfully accessed Accounting Service with JWT token.")
            print(f"Credit balance response: {response.json()}")
            return True
        else:
            print_error(f"Failed to access Accounting Service: {response.status_code} - {response.text}")
            
            if response.status_code == 401:
                print_warning("This might be due to JWT secret mismatch or token expiration.")
                print("Check that JWT_ACCESS_SECRET in both services match.")
            
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Accounting Service: {e}")
        return False

def guide_user_through_testing():
    """Main function to guide the user through testing"""
    global AUTH_CONTAINER, AUTH_PORT
    AUTH_CONTAINER = None
    AUTH_PORT = None
    
    print_header("Welcome to the Accounting Service Testing Guide")
    print("This script will guide you through testing the Accounting Service with the External Authentication Service.")
    print("It will check Docker status, service health, JWT secrets, and perform basic authentication flow tests.")
    
    # Check prerequisites
    if not check_docker_running():
        return
    
    # Check Authentication Service
    auth_running, auth_port = check_auth_service_running()
    if auth_running:
        check_auth_service_health()
    else:
        print_error("The Authentication Service must be running to continue with testing.")
        print("Please start the Authentication Service first using the instructions in the guide.")
        return
    
    # Check Accounting Service
    acct_running = check_accounting_service_running()
    acct_health = False
    if acct_running:
        acct_health = check_accounting_service_health()
    
    # Check/create .env file
    jwt_ok = check_jwt_secrets()
    if not jwt_ok:
        create = input("Would you like to create a .env file with the correct JWT secrets? (y/n): ").strip().lower()
        if create == 'y':
            jwt_ok = create_dotenv_file()
    
    # Start Accounting Service if needed
    if not acct_running or not acct_health:
        start = input("Would you like to start the Accounting Service now? (y/n): ").strip().lower()
        if start == 'y':
            if start_accounting_service():
                acct_running = True
                acct_health = check_accounting_service_health()
    
    if not acct_running or not acct_health:
        print_warning("The Accounting Service is not running or not healthy.")
        print("You may need to troubleshoot the service before continuing.")
        continue_anyway = input("Would you like to continue anyway? (y/n): ").strip().lower()
        if continue_anyway != 'y':
            return
    
    # User Authentication Flow
    print_header("User Authentication Flow")
    
    # Create test user
    create_test_user()
    
    # Verify user account
    verify_user_account()
    
    # Login and get token
    token = login_and_get_token()
    
    if token:
        # Test Accounting Service with token
        test_accounting_service(token)
        
        # Provide additional test commands
        print_header("Additional Testing Commands")
        print("You can use the following curl commands for further testing:")
        print("\n1. Initialize a streaming session:")
        print(f"""
curl -X POST http://localhost:3001/api/streaming-sessions/initialize \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {token}" \\
  -d '{{
    "sessionId": "test-session-001",
    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "estimatedTokens": 1000
  }}'
        """)
        
        print("\n2. Finalize the streaming session:")
        print(f"""
curl -X POST http://localhost:3001/api/streaming-sessions/finalize \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {token}" \\
  -d '{{
    "sessionId": "test-session-001",
    "actualTokens": 800,
    "success": true
  }}'
        """)
        
        print("\n3. Check your credit balance again:")
        print(f"""
curl -X GET http://localhost:3001/api/credits/balance \\
  -H "Authorization: Bearer {token}"
        """)
    
    print_header("Testing Complete")
    print("For more detailed testing instructions, refer to the AccountingServiceTestingGuide.md")

if __name__ == "__main__":
    guide_user_through_testing()