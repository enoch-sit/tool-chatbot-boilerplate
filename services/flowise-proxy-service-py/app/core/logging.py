import logging
import sys
import os

# Get log level from environment variable, default to INFO
log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
log_level_mapping = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL
}
log_level = log_level_mapping.get(log_level_str, logging.INFO)

# Configure logger
logger = logging.getLogger("flowise_proxy")
logger.setLevel(log_level)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(log_level)

# Enhanced log format with more details for debugging
if log_level == logging.DEBUG:
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s() - %(message)s'
    )
else:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

console_handler.setFormatter(formatter)

# Add handler
logger.addHandler(console_handler)

# Log the current configuration
logger.info(f"Logging configured with level: {log_level_str} ({log_level})")
