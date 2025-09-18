# Mimic data

## Azure non stream request format example

{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7,
  "stream": false
}

## Azure non stream response format example

{
    "choices": [
        {
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            },
            "finish_reason": "stop",
            "index": 0,
            "logprobs": null,
            "message": {
                "annotations": [],
                "content": "Hello! I'm just a program, so I don't have feelings, but I'm here and ready to help you. How can I assist you today?",
                "refusal": null,
                "role": "assistant"
            }
        }
    ],
    "created": 1758119573,
    "id": "chatcmpl-CGnVFG8AVBjwC9UPyLDLxehmdOSth",
    "model": "gpt-4.1-2025-04-14",
    "object": "chat.completion",
    "prompt_filter_results": [
        {
            "prompt_index": 0,
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "jailbreak": {
                    "filtered": false,
                    "detected": false
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            }
        }
    ],
    "system_fingerprint": "fp_9ab7d013ff",
    "usage": {
        "completion_tokens": 30,
        "completion_tokens_details": {
            "accepted_prediction_tokens": 0,
            "audio_tokens": 0,
            "reasoning_tokens": 0,
            "rejected_prediction_tokens": 0
        },
        "prompt_tokens": 13,
        "prompt_tokens_details": {
            "audio_tokens": 0,
            "cached_tokens": 0
        },
        "total_tokens": 43
    }
}

## eduhk non stream request format example

```json
{
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an AI assistant"
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello"
                },
                {
                    "type": "text",
                    "text": "How are you?"
                }
                
            ]
        }
    ],
    "stream": false
}
```

## eduhk non stream response format example

```json
{
    "id": "chatcmpl-CGnS6k8nsU5vostI5Da6McCKY8wvl",
    "choices": [
        {
            "finish_reason": "stop",
            "index": 0,
            "logprobs": null,
            "message": {
                "content": "Hello! I'm just a computer program, but I'm here and ready to assist you. How can I help you today?",
                "refusal": null,
                "role": "assistant",
                "annotations": [],
                "audio": null,
                "function_call": null,
                "tool_calls": null
            },
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            }
        }
    ],
    "created": 1758119378,
    "model": "gpt-4o-mini-2024-07-18",
    "object": "chat.completion",
    "service_tier": null,
    "system_fingerprint": "fp_efad92c60b",
    "usage": {
        "completion_tokens": 24,
        "prompt_tokens": 21,
        "total_tokens": 45,
        "completion_tokens_details": null,
        "prompt_tokens_details": null
    },
    "_request_id": "a1f81279-a37c-4ed6-9dc7-967f574ae848",
    "prompt_filter_results": [
        {
            "prompt_index": 0,
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            }
        }
    ]
}

```

## EDUHK endpoint image and non streaming request:
{
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": "You are an AI assistant that helps people find information."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hello, What is this?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABJCAYAAABmUZsVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARISURBVHhe7ZtdK21BGIDnnCgf+SwiUSiUG1GEC/6CX+oPUFygXLkhXCAfJUTItzrHs5rRYO9tzaxZx7tO89Rur1lba8969juzZt4Zv/68oSIJv/V75I0owyLKsIgyLKIMiyjDIsqwiDIsogyLwo1ADw8P1enpqTo7O1MzMzOqoaFBf5KdwsjY2NhQ+/v7yXF1dbV6eXlRs7OzqqWlJTkXAvHNhCiYn59PRCCBl6GmpkYfhUG0jN3dXbW2tvZFAlCura3VpTCIlUEkbG5ufpFgCNk8DCJl3N7eJn1EORH0F/39/boUDpEyVlZWyooAmkdHR4cuhUOcjJOTE/Xw8KBLXyEqJiYmdCks4mRsb29XbB7Dw8O59BcgSgYRcXNzo0sfQURXV5caGBjQZ8IjSsb19bU++ogRMT4+rs/kg7jIsEECr5GRkdxFgCgZ3Lj93tvbq+bm5pL3f0GucxPGCxcXF8nN3d/fq7q6OtXY2Fj2sUhkPD4+JsPsz6NLPjs/P1eXl5fq7u4uOVdfX//tNV0ILoNK7+zsqOPj4/dfuBTt7e2qu7tb9fT06DNf4VpHR0dqb2/vQxOynzb2d3BNBmO+YoLKMDPLSgMmG3MjdI68WltbkzICeJknS9rrAdckUqamppznLkFk0ByWl5eTirhU3OZzFPlex8D16HSRnJbMMq6urtTS0lLmyueBq5BMTxPasVQRQL3W19eTHywNmWTQNKSKACLDZfjuLYPEi93DSwMRk5OTTsN3LxlIqJR4+WkQQX7U9RHrJYNxhFQQwfDdZ2brJYMBldSoYIzhO3x3lsGYAvsSoV6jo6O65I6zDOYaUmHEmSXx4yyDyZLUJpJ1suYsQ3ITMXMbX7z6DKlkXXd1lvH6+qqP/j+cZUjm6elJH/nhLKOqqkofyeP5+Vkf+eEsQ+qThHqREsyCs4zQ2wBCwvaFLDjLIAkrFSaQaXMXpXCW0dTUJHasQVPZ2trSJXecZTQ3N+sjmbDXi8VrH5xl5LXoGwqig1SfT+LJWQawPiEZhCwuLjqPlr1ktLW1ie03bBYWFpyeMF4yWAkrAkQIG+TYCZSm2XjJIG9ARqkIIIROdXV1VZ8pj5cMGBoaKkRTMfT19emj8njLYJUK60UhTV7UWwawJlGE6EibIM4sQ3p08GMNDg7qUmUyyQCW76RGB/UiKtJuTcgsgy+T/GRhQSktmWUAG0OkRQf1cd0UF0QGYSituZjdQC4EkQF0ppLmLD5bJYPJgOnp6R/PkRKd/LuWD0FlABX5qeZi+gnf9ZNc9oEyKWIKnQYjjvEKfY/JsZK+sz/7Dv52bGys4lbK78hFBiCEyRHbFz/fjLlJbp45A7PgUmMBrsHaLtsgmWxBqWtxjiaaNfGUmwwDKbiDg4Pkl6Y/IYTJh3R2djqFM2LITSDHJG2Iou821rqQu4wiEbwDLTJRhkWUYRFlWEQZFlHGO0r9Bebv61JYgxciAAAAAElFTkSuQmCC"
                    }
                }
            ]
        }
    ],
    "stream": false
}


## EDUHK image response:
{
    "id": "chatcmpl-CGyFYO2SZlnYdvj0w9ox3t0O6p03a",
    "choices": [
        {
            "finish_reason": "stop",
            "index": 0,
            "logprobs": null,
            "message": {
                "content": "This is the logo of Apple Inc., a technology company known for its consumer electronics, software, and online services. Apple is famous for products like the iPhone, iPad, Mac computers, Apple Watch, and services such as the App Store and Apple Music. The logo features a stylized apple with a bite taken out of it.",
                "refusal": null,
                "role": "assistant",
                "annotations": [],
                "audio": null,
                "function_call": null,
                "tool_calls": null
            },
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            }
        }
    ],
    "created": 1758160884,
    "model": "gpt-4o-mini-2024-07-18",
    "object": "chat.completion",
    "service_tier": null,
    "system_fingerprint": "fp_efad92c60b",
    "usage": {
        "completion_tokens": 68,
        "prompt_tokens": 8528,
        "total_tokens": 8596,
        "completion_tokens_details": null,
        "prompt_tokens_details": null
    },
    "_request_id": "d9cdc515-5572-4a90-b774-9d4d2b8d312e",
    "prompt_filter_results": [
        {
            "prompt_index": 2,
            "content_filter_result": {
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                },
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "custom_blocklists": {
                    "filtered": false,
                    "details": []
                }
            }
        },
        {
            "prompt_index": 0,
            "content_filter_result": {}
        }
    ]
}