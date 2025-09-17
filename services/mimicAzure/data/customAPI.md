endpoint:
https://eduhk-api-ea.azure-api.net/chatgpt/v1/completion

## image example:

Request header:
api-key: Xt7X91234567123456712345672344vT
Content-Type: application/json

Request body:
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
    "stream": true
}

stream response:
data:{"id": "", "choices": [], "created": 0, "model": "", "object": "", "service_tier": null, "system_fingerprint": null, "usage": null, "prompt_filter_results": [{"prompt_index": 0, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}]}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": "", "function_call": null, "refusal": null, "role": "assistant", "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": "This", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": " is", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": " the", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": " logo", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": " of", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": " Apple", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [{"delta": {"content": null, "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": "stop", "index": 0, "logprobs": null, "content_filter_results": {}}], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": {"completion_tokens": 66, "prompt_tokens": 2861, "total_tokens": 2927, "completion_tokens_details": null, "prompt_tokens_details": null}}

data:{"id": "chatcmpl-CDRPVRHMW3d4WIb6exhHpKcfX1pqD", "choices": [], "created": 1757319665, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": {"completion_tokens": 66, "prompt_tokens": 8528, "total_tokens": 8594, "completion_tokens_details": {"accepted_prediction_tokens": 0, "audio_tokens": 0, "reasoning_tokens": 0, "rejected_prediction_tokens": 0}, "prompt_tokens_details": {"audio_tokens": 0, "cached_tokens": 0}}}

data: [DONE]



## non image example:
Request header:
api-key: Xt7X91234567123456712345672344vT
Content-Type: application/json


Request body:

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
                    "text": "Hello"
                }
                
            ]
        }
    ],
    "stream": true
}

### response

data:{"id": "", "choices": [], "created": 0, "model": "", "object": "", "service_tier": null, "system_fingerprint": null, "usage": null, "prompt_filter_results": [{"prompt_index": 0, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}]}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": "", "function_call": null, "refusal": null, "role": "assistant", "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": "Hello", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": "!", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " How", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " can", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " I", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " assist", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " you", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": " today", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": "?", "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": null, "index": 0, "logprobs": null, "content_filter_results": {"hate": {"filtered": false, "severity": "safe"}, "self_harm": {"filtered": false, "severity": "safe"}, "sexual": {"filtered": false, "severity": "safe"}, "violence": {"filtered": false, "severity": "safe"}}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": null}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [{"delta": {"content": null, "function_call": null, "refusal": null, "role": null, "tool_calls": null}, "finish_reason": "stop", "index": 0, "logprobs": null, "content_filter_results": {}}], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": {"completion_tokens": 9, "prompt_tokens": 23, "total_tokens": 32, "completion_tokens_details": null, "prompt_tokens_details": null}}

data:{"id": "chatcmpl-CDRZg1pm6ZIKc2YW9QrusyutKoYGd", "choices": [], "created": 1757320296, "model": "gpt-4o-mini-2024-07-18", "object": "chat.completion.chunk", "service_tier": null, "system_fingerprint": "fp_efad92c60b", "usage": {"completion_tokens": 10, "prompt_tokens": 23, "total_tokens": 33, "completion_tokens_details": {"accepted_prediction_tokens": 0, "audio_tokens": 0, "reasoning_tokens": 0, "rejected_prediction_tokens": 0}, "prompt_tokens_details": {"audio_tokens": 0, "cached_tokens": 0}}}

data: [DONE]

