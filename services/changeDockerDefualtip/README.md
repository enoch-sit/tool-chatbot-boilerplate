# Docker IP Range Change Automation

This project provides automated scripts to change Docker's default IP range from the standard 172.17.0.0/16 to 10.20.0.0/24, which provides 254 available IP addresses and helps avoid network conflicts.

## 📁 Files Included

- `automate_docker_ip_change.bat` - Windows batch script for remote automation
- `docker_ip_change_script.sh` - Linux shell script that performs the actual Docker configuration
- `README.md` - This documentation file

## 🎯 Purpose

Docker's default IP range (172.17.0.0/16) can sometimes conflict with corporate networks or VPNs. This automation changes Docker to use the 10.20.0.0/24 range instead, providing:

- **254 available IP addresses** (10.20.0.1 to 10.20.0.254)
- **Reduced network conflicts** with corporate/VPN networks
- **Automatic configuration** of Docker daemon settings
- **Verification testing** to ensure changes work correctly

## 🖥️ System Requirements

### Windows (Automation Script)

- **PuTTY tools** (plink.exe, pscp.exe) installed and in PATH
- SSH access to the target Linux server
- Administrative privileges on the remote server

### Linux Server (Target)

- **Ubuntu** with snap-based Docker installation
- **sudo privileges** for the user account
- **Docker** installed via snap package

## 📋 Prerequisites Setup

### 1. Install PuTTY Tools (Windows)

Download and install PuTTY from: <https://www.putty.org/>

Ensure the following executables are in your system PATH:

- `plink.exe` - Command-line SSH client
- `pscp.exe` - Secure copy (SCP) client

To verify installation, open Command Prompt and run:

```cmd
plink
pscp
```

### 2. Configure SSH Access

Ensure you can SSH to your target server:

```cmd
plink -ssh username@hostname
```

## 🚀 Usage Instructions

### Method 1: Using Default Settings (Recommended)

The batch script has default settings for a typical setup:

```cmd
automate_docker_ip_change.bat
```

**Default values:**

- Host: `proj03@project-1-03.eduhk.hk`
- Password: `password:`
- Sudo password: Same as SSH password

### Method 2: Custom Host and Credentials

```cmd
automate_docker_ip_change.bat [hostname] [password] [sudo_password]
```

**Examples:**

```cmd
REM Basic usage with custom host
automate_docker_ip_change.bat user@myserver.com

REM With custom password
automate_docker_ip_change.bat user@myserver.com mypassword

REM With different sudo password
automate_docker_ip_change.bat user@myserver.com sshpass sudopass
```

### Method 3: Manual Execution on Linux Server

If you prefer to run the script directly on the Linux server:

1. Copy `docker_ip_change_script.sh` to your Linux server
2. Make it executable:

   ```bash
   chmod +x docker_ip_change_script.sh
   ```

3. Run with sudo privileges:

   ```bash
   sudo ./docker_ip_change_script.sh
   ```

## 📊 What the Script Does

### Automated Steps

1. **Connection Test** - Verifies SSH connectivity
2. **File Transfer** - Copies the shell script to `/tmp/` on remote server
3. **Permission Setup** - Makes the script executable
4. **Docker Configuration** - Modifies Docker daemon settings:
   - Sets bridge IP to `10.20.0.1/24`
   - Configures default address pool to `10.20.0.0/24`
   - Updates `/var/snap/docker/current/config/daemon.json`
5. **Service Restart** - Stops and starts Docker service
6. **Verification** - Tests that:
   - Docker service is running
   - Bridge IP is correctly set
   - Container IPs are in the new range
7. **Cleanup** - Removes temporary files

## ✅ Success Verification

After successful execution, you should see:

```text
========================================
SUCCESS: Docker IP change completed!
========================================
Docker should now be using 10.20.0.0/24 IP range.
You can verify by running: docker network ls
========================================
```

### Manual Verification Commands

```bash
# Check Docker daemon configuration
sudo cat /var/snap/docker/current/config/daemon.json

# View docker0 bridge IP
ip addr show docker0

# Test with a container
docker run --rm alpine ip route show default

# List Docker networks
docker network ls
docker network inspect bridge
```

## 🔧 Troubleshooting

### Common Issues

#### 1. PuTTY tools not found

```text
ERROR: plink.exe not found in PATH
```

**Solution:** Install PuTTY and add to system PATH

#### 2. SSH connection failed

```text
ERROR: Failed to connect via SSH
```

**Solution:** Verify hostname, username, and password

#### 3. Sudo password incorrect

```text
ERROR: Script execution failed
```

**Solution:** Check sudo password or run manually:

```cmd
ssh user@host "sudo /tmp/docker_ip_change_script.sh"
```

#### 4. Docker service issues

```text
Error: Docker service is not active
```

**Solution:** Check Docker logs:

```bash
snap logs docker
```

### Manual Recovery

If something goes wrong, you can restore Docker's default settings:

```bash
# Remove custom configuration
sudo rm /var/snap/docker/current/config/daemon.json

# Restart Docker
sudo snap restart docker
```

## 🛡️ Security Notes

- **Password Security:** Passwords are passed as command-line arguments (visible in process lists)
- **SSH Keys:** Consider using SSH key authentication instead of passwords
- **Network Security:** Ensure 10.20.0.0/24 range doesn't conflict with your network
- **Firewall:** Update firewall rules if necessary for the new IP range

## 📈 Benefits

✅ **254 container IPs available** (vs. 65,534 in default range)  
✅ **Reduced network conflicts** with corporate networks  
✅ **Automated deployment** across multiple servers  
✅ **Verification testing** ensures reliability  
✅ **Easy rollback** if needed  

## 🆘 Support

If you encounter issues:

1. Check the error messages in the console output
2. Verify all prerequisites are met
3. Test SSH connectivity manually
4. Review Docker logs on the target server
5. Ensure proper sudo privileges

## 📝 Notes

- This script is designed for **snap-based Docker installations** on Ubuntu
- The IP change affects **all new containers** created after the change
- **Existing containers** retain their original IPs until recreated
- **Network conflicts** should be checked before implementation
- **Backup** existing Docker configurations if needed

---

Last updated: September 2025
