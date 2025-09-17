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
