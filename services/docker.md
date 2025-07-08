# Docker network settings

```json
{
  "builder": {
    "features": {
      "buildkit": true
    },
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "default-address-pools": [
    {
      "base": "10.100.0.0/16",
      "size": 24
    },
    {
      "base": "10.110.0.0/16",
      "size": 24
    }
  ],
  "dns": ["8.8.8.8", "1.1.1.1"],
  "experimental": false
}
```
