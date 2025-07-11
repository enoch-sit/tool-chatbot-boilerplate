# Object response structure

## flowise chatflow response structure
```json
{
    "_id": "685b60dfd445d2fa654e6a6a",
    "flowise_id": "e13cbaa3-c909-4570-8c49-78b45115f34a",
    "name": "deepSearchAWS",
    "description": "",
    "deployed": false,
    "is_public": true,
    "category": null,
    "type": "AGENTFLOW",
    "api_key_id": "ef6561b96d808a99582caf56bb21be4d",
    "flow_data": {
        "nodes": [
            {
                "id": "startAgentflow_0",
                "type": "agentFlow",
                "position": {
                    "x": -275.0799323960054,
                    "y": 31.301887150099603
                },
                "data": {
                    "id": "startAgentflow_0",
                    "label": "Start",
                    "version": 1,
                    "name": "startAgentflow",
                    "type": "Start",
                    "color": "#7EE787",
                    "hideInput": true,
                    "baseClasses": [
                        "Start"
                    ],
                    "category": "Agent Flows",
                    "description": "Starting point of the agentflow",
                    "inputParams": [
                        {
                            "label": "Input Type",
                            "name": "startInputType",
                            "type": "options",
                            "options": [
                                {
                                    "label": "Chat Input",
                                    "name": "chatInput",
                                    "description": "Start the conversation with chat input"
                                },
                                {
                                    "label": "Form Input",
                                    "name": "formInput",
                                    "description": "Start the workflow with form inputs"
                                }
                            ],
                            "default": "chatInput",
                            "id": "startAgentflow_0-input-startInputType-options",
                            "display": true
                        },
                        {
                            "label": "Form Title",
                            "name": "formTitle",
                            "type": "string",
                            "placeholder": "Please Fill Out The Form",
                            "show": {
                                "startInputType": "formInput"
                            },
                            "id": "startAgentflow_0-input-formTitle-string",
                            "display": false
                        },
                        {
                            "label": "Form Description",
                            "name": "formDescription",
                            "type": "string",
                            "placeholder": "Complete all fields below to continue",
                            "show": {
                                "startInputType": "formInput"
                            },
                            "id": "startAgentflow_0-input-formDescription-string",
                            "display": false
                        },
                        {
                            "label": "Form Input Types",
                            "name": "formInputTypes",
                            "description": "Specify the type of form input",
                            "type": "array",
                            "show": {
                                "startInputType": "formInput"
                            },
                            "array": [
                                {
                                    "label": "Type",
                                    "name": "type",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "String",
                                            "name": "string"
                                        },
                                        {
                                            "label": "Number",
                                            "name": "number"
                                        },
                                        {
                                            "label": "Boolean",
                                            "name": "boolean"
                                        },
                                        {
                                            "label": "Options",
                                            "name": "options"
                                        }
                                    ],
                                    "default": "string"
                                },
                                {
                                    "label": "Label",
                                    "name": "label",
                                    "type": "string",
                                    "placeholder": "Label for the input"
                                },
                                {
                                    "label": "Variable Name",
                                    "name": "name",
                                    "type": "string",
                                    "placeholder": "Variable name for the input (must be camel case)",
                                    "description": "Variable name must be camel case. For example: firstName, lastName, etc."
                                },
                                {
                                    "label": "Add Options",
                                    "name": "addOptions",
                                    "type": "array",
                                    "show": {
                                        "formInputTypes[$index].type": "options"
                                    },
                                    "array": [
                                        {
                                            "label": "Option",
                                            "name": "option",
                                            "type": "string"
                                        }
                                    ]
                                }
                            ],
                            "id": "startAgentflow_0-input-formInputTypes-array",
                            "display": false
                        },
                        {
                            "label": "Ephemeral Memory",
                            "name": "startEphemeralMemory",
                            "type": "boolean",
                            "description": "Start fresh for every execution without past chat history",
                            "optional": true,
                            "id": "startAgentflow_0-input-startEphemeralMemory-boolean",
                            "display": true
                        },
                        {
                            "label": "Flow State",
                            "name": "startState",
                            "description": "Runtime state during the execution of the workflow",
                            "type": "array",
                            "optional": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "string",
                                    "placeholder": "Foo"
                                },
                                {
                                    "label": "Value",
                                    "name": "value",
                                    "type": "string",
                                    "placeholder": "Bar",
                                    "optional": true
                                }
                            ],
                            "id": "startAgentflow_0-input-startState-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "startInputType": "chatInput",
                        "startEphemeralMemory": true,
                        "startState": ""
                    },
                    "outputAnchors": [
                        {
                            "id": "startAgentflow_0-output-startAgentflow",
                            "label": "Start",
                            "name": "startAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "width": 103,
                "height": 66,
                "selected": false,
                "positionAbsolute": {
                    "x": -275.0799323960054,
                    "y": 31.301887150099603
                },
                "dragging": false
            },
            {
                "id": "llmAgentflow_0",
                "position": {
                    "x": -59.13383952997967,
                    "y": 27.64784975526672
                },
                "data": {
                    "id": "llmAgentflow_0",
                    "label": "Topic Enhancer",
                    "version": 1,
                    "name": "llmAgentflow",
                    "type": "LLM",
                    "color": "#64B5F6",
                    "baseClasses": [
                        "LLM"
                    ],
                    "category": "Agent Flows",
                    "description": "Large language models to analyze user-provided inputs and generate responses",
                    "inputParams": [
                        {
                            "label": "Model",
                            "name": "llmModel",
                            "type": "asyncOptions",
                            "loadMethod": "listModels",
                            "loadConfig": true,
                            "id": "llmAgentflow_0-input-llmModel-asyncOptions",
                            "display": true
                        },
                        {
                            "label": "Messages",
                            "name": "llmMessages",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Role",
                                    "name": "role",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "System",
                                            "name": "system"
                                        },
                                        {
                                            "label": "Assistant",
                                            "name": "assistant"
                                        },
                                        {
                                            "label": "Developer",
                                            "name": "developer"
                                        },
                                        {
                                            "label": "User",
                                            "name": "user"
                                        }
                                    ]
                                },
                                {
                                    "label": "Content",
                                    "name": "content",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "generateInstruction": true,
                                    "rows": 4
                                }
                            ],
                            "id": "llmAgentflow_0-input-llmMessages-array",
                            "display": true
                        },
                        {
                            "label": "Enable Memory",
                            "name": "llmEnableMemory",
                            "type": "boolean",
                            "description": "Enable memory for the conversation thread",
                            "default": true,
                            "optional": true,
                            "id": "llmAgentflow_0-input-llmEnableMemory-boolean",
                            "display": true
                        },
                        {
                            "label": "Memory Type",
                            "name": "llmMemoryType",
                            "type": "options",
                            "options": [
                                {
                                    "label": "All Messages",
                                    "name": "allMessages",
                                    "description": "Retrieve all messages from the conversation"
                                },
                                {
                                    "label": "Window Size",
                                    "name": "windowSize",
                                    "description": "Uses a fixed window size to surface the last N messages"
                                },
                                {
                                    "label": "Conversation Summary",
                                    "name": "conversationSummary",
                                    "description": "Summarizes the whole conversation"
                                },
                                {
                                    "label": "Conversation Summary Buffer",
                                    "name": "conversationSummaryBuffer",
                                    "description": "Summarize conversations once token limit is reached. Default to 2000"
                                }
                            ],
                            "optional": true,
                            "default": "allMessages",
                            "show": {
                                "llmEnableMemory": true
                            },
                            "id": "llmAgentflow_0-input-llmMemoryType-options",
                            "display": false
                        },
                        {
                            "label": "Window Size",
                            "name": "llmMemoryWindowSize",
                            "type": "number",
                            "default": "20",
                            "description": "Uses a fixed window size to surface the last N messages",
                            "show": {
                                "llmMemoryType": "windowSize"
                            },
                            "id": "llmAgentflow_0-input-llmMemoryWindowSize-number",
                            "display": false
                        },
                        {
                            "label": "Max Token Limit",
                            "name": "llmMemoryMaxTokenLimit",
                            "type": "number",
                            "default": "2000",
                            "description": "Summarize conversations once token limit is reached. Default to 2000",
                            "show": {
                                "llmMemoryType": "conversationSummaryBuffer"
                            },
                            "id": "llmAgentflow_0-input-llmMemoryMaxTokenLimit-number",
                            "display": false
                        },
                        {
                            "label": "Input Message",
                            "name": "llmUserMessage",
                            "type": "string",
                            "description": "Add an input message as user message at the end of the conversation",
                            "rows": 4,
                            "optional": true,
                            "acceptVariable": true,
                            "show": {
                                "llmEnableMemory": true
                            },
                            "id": "llmAgentflow_0-input-llmUserMessage-string",
                            "display": false
                        },
                        {
                            "label": "Return Response As",
                            "name": "llmReturnResponseAs",
                            "type": "options",
                            "options": [
                                {
                                    "label": "User Message",
                                    "name": "userMessage"
                                },
                                {
                                    "label": "Assistant Message",
                                    "name": "assistantMessage"
                                }
                            ],
                            "default": "userMessage",
                            "id": "llmAgentflow_0-input-llmReturnResponseAs-options",
                            "display": true
                        },
                        {
                            "label": "JSON Structured Output",
                            "name": "llmStructuredOutput",
                            "description": "Instruct the LLM to give output in a JSON structured schema",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "string"
                                },
                                {
                                    "label": "Type",
                                    "name": "type",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "String",
                                            "name": "string"
                                        },
                                        {
                                            "label": "String Array",
                                            "name": "stringArray"
                                        },
                                        {
                                            "label": "Number",
                                            "name": "number"
                                        },
                                        {
                                            "label": "Boolean",
                                            "name": "boolean"
                                        },
                                        {
                                            "label": "Enum",
                                            "name": "enum"
                                        },
                                        {
                                            "label": "JSON Array",
                                            "name": "jsonArray"
                                        }
                                    ]
                                },
                                {
                                    "label": "Enum Values",
                                    "name": "enumValues",
                                    "type": "string",
                                    "placeholder": "value1, value2, value3",
                                    "description": "Enum values. Separated by comma",
                                    "optional": true,
                                    "show": {
                                        "llmStructuredOutput[$index].type": "enum"
                                    }
                                },
                                {
                                    "label": "JSON Schema",
                                    "name": "jsonSchema",
                                    "type": "code",
                                    "placeholder": "{\n    \"answer\": {\n        \"type\": \"string\",\n        \"description\": \"Value of the answer\"\n    },\n    \"reason\": {\n        \"type\": \"string\",\n        \"description\": \"Reason for the answer\"\n    },\n    \"optional\": {\n        \"type\": \"boolean\"\n    },\n    \"count\": {\n        \"type\": \"number\"\n    },\n    \"children\": {\n        \"type\": \"array\",\n        \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n                \"value\": {\n                    \"type\": \"string\",\n                    \"description\": \"Value of the children's answer\"\n                }\n            }\n        }\n    }\n}",
                                    "description": "JSON schema for the structured output",
                                    "optional": true,
                                    "show": {
                                        "llmStructuredOutput[$index].type": "jsonArray"
                                    }
                                },
                                {
                                    "label": "Description",
                                    "name": "description",
                                    "type": "string",
                                    "placeholder": "Description of the key"
                                }
                            ],
                            "id": "llmAgentflow_0-input-llmStructuredOutput-array",
                            "display": true
                        },
                        {
                            "label": "Update Flow State",
                            "name": "llmUpdateState",
                            "description": "Update runtime state during the execution of the workflow",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "asyncOptions",
                                    "loadMethod": "listRuntimeStateKeys",
                                    "freeSolo": true
                                },
                                {
                                    "label": "Value",
                                    "name": "value",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "acceptNodeOutputAsVariable": true
                                }
                            ],
                            "id": "llmAgentflow_0-input-llmUpdateState-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "llmModel": "awsChatBedrock",
                        "llmMessages": [
                            {
                                "role": "developer",
                                "content": "<p>Your only role is to improve the user query for more clarity. Do not add any meta comments.</p>"
                            }
                        ],
                        "llmEnableMemory": false,
                        "llmReturnResponseAs": "userMessage",
                        "llmStructuredOutput": "",
                        "llmUpdateState": "",
                        "llmModelConfig": {
                            "credential": "",
                            "region": "us-east-1",
                            "model": "",
                            "customModel": "us.amazon.nova-lite-v1:0",
                            "streaming": true,
                            "temperature": 0.7,
                            "max_tokens_to_sample": "10000",
                            "allowImageUploads": "",
                            "llmModel": "awsChatBedrock",
                            "FLOWISE_CREDENTIAL_ID": "36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"
                        }
                    },
                    "outputAnchors": [
                        {
                            "id": "llmAgentflow_0-output-llmAgentflow",
                            "label": "LLM",
                            "name": "llmAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "agentFlow",
                "width": 173,
                "height": 72,
                "selected": false,
                "positionAbsolute": {
                    "x": -59.13383952997967,
                    "y": 27.64784975526672
                },
                "dragging": false
            },
            {
                "id": "agentAgentflow_0",
                "position": {
                    "x": 209.99147630894493,
                    "y": 101.79890732287393
                },
                "data": {
                    "id": "agentAgentflow_0",
                    "label": "Agent 0",
                    "version": 1,
                    "name": "agentAgentflow",
                    "type": "Agent",
                    "color": "#4DD0E1",
                    "baseClasses": [
                        "Agent"
                    ],
                    "category": "Agent Flows",
                    "description": "Dynamically choose and utilize tools during runtime, enabling multi-step reasoning",
                    "inputParams": [
                        {
                            "label": "Model",
                            "name": "agentModel",
                            "type": "asyncOptions",
                            "loadMethod": "listModels",
                            "loadConfig": true,
                            "id": "agentAgentflow_0-input-agentModel-asyncOptions",
                            "display": true
                        },
                        {
                            "label": "Messages",
                            "name": "agentMessages",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Role",
                                    "name": "role",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "System",
                                            "name": "system"
                                        },
                                        {
                                            "label": "Assistant",
                                            "name": "assistant"
                                        },
                                        {
                                            "label": "Developer",
                                            "name": "developer"
                                        },
                                        {
                                            "label": "User",
                                            "name": "user"
                                        }
                                    ]
                                },
                                {
                                    "label": "Content",
                                    "name": "content",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "generateInstruction": true,
                                    "rows": 4
                                }
                            ],
                            "id": "agentAgentflow_0-input-agentMessages-array",
                            "display": true
                        },
                        {
                            "label": "Tools",
                            "name": "agentTools",
                            "type": "array",
                            "optional": true,
                            "array": [
                                {
                                    "label": "Tool",
                                    "name": "agentSelectedTool",
                                    "type": "asyncOptions",
                                    "loadMethod": "listTools",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Require Human Input",
                                    "name": "agentSelectedToolRequiresHumanInput",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "id": "agentAgentflow_0-input-agentTools-array",
                            "display": true
                        },
                        {
                            "label": "Knowledge (Document Stores)",
                            "name": "agentKnowledgeDocumentStores",
                            "type": "array",
                            "description": "Give your agent context about different document sources. Document stores must be upserted in advance.",
                            "array": [
                                {
                                    "label": "Document Store",
                                    "name": "documentStore",
                                    "type": "asyncOptions",
                                    "loadMethod": "listStores"
                                },
                                {
                                    "label": "Describe Knowledge",
                                    "name": "docStoreDescription",
                                    "type": "string",
                                    "generateDocStoreDescription": true,
                                    "placeholder": "Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information",
                                    "rows": 4
                                },
                                {
                                    "label": "Return Source Documents",
                                    "name": "returnSourceDocuments",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "optional": true,
                            "id": "agentAgentflow_0-input-agentKnowledgeDocumentStores-array",
                            "display": true
                        },
                        {
                            "label": "Knowledge (Vector Embeddings)",
                            "name": "agentKnowledgeVSEmbeddings",
                            "type": "array",
                            "description": "Give your agent context about different document sources from existing vector stores and embeddings",
                            "array": [
                                {
                                    "label": "Vector Store",
                                    "name": "vectorStore",
                                    "type": "asyncOptions",
                                    "loadMethod": "listVectorStores",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Embedding Model",
                                    "name": "embeddingModel",
                                    "type": "asyncOptions",
                                    "loadMethod": "listEmbeddings",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Knowledge Name",
                                    "name": "knowledgeName",
                                    "type": "string",
                                    "placeholder": "A short name for the knowledge base, this is useful for the AI to know when and how to search for correct information"
                                },
                                {
                                    "label": "Describe Knowledge",
                                    "name": "knowledgeDescription",
                                    "type": "string",
                                    "placeholder": "Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information",
                                    "rows": 4
                                },
                                {
                                    "label": "Return Source Documents",
                                    "name": "returnSourceDocuments",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "optional": true,
                            "id": "agentAgentflow_0-input-agentKnowledgeVSEmbeddings-array",
                            "display": true
                        },
                        {
                            "label": "Enable Memory",
                            "name": "agentEnableMemory",
                            "type": "boolean",
                            "description": "Enable memory for the conversation thread",
                            "default": true,
                            "optional": true,
                            "id": "agentAgentflow_0-input-agentEnableMemory-boolean",
                            "display": true
                        },
                        {
                            "label": "Memory Type",
                            "name": "agentMemoryType",
                            "type": "options",
                            "options": [
                                {
                                    "label": "All Messages",
                                    "name": "allMessages",
                                    "description": "Retrieve all messages from the conversation"
                                },
                                {
                                    "label": "Window Size",
                                    "name": "windowSize",
                                    "description": "Uses a fixed window size to surface the last N messages"
                                },
                                {
                                    "label": "Conversation Summary",
                                    "name": "conversationSummary",
                                    "description": "Summarizes the whole conversation"
                                },
                                {
                                    "label": "Conversation Summary Buffer",
                                    "name": "conversationSummaryBuffer",
                                    "description": "Summarize conversations once token limit is reached. Default to 2000"
                                }
                            ],
                            "optional": true,
                            "default": "allMessages",
                            "show": {
                                "agentEnableMemory": true
                            },
                            "id": "agentAgentflow_0-input-agentMemoryType-options",
                            "display": true
                        },
                        {
                            "label": "Window Size",
                            "name": "agentMemoryWindowSize",
                            "type": "number",
                            "default": "20",
                            "description": "Uses a fixed window size to surface the last N messages",
                            "show": {
                                "agentMemoryType": "windowSize"
                            },
                            "id": "agentAgentflow_0-input-agentMemoryWindowSize-number",
                            "display": false
                        },
                        {
                            "label": "Max Token Limit",
                            "name": "agentMemoryMaxTokenLimit",
                            "type": "number",
                            "default": "2000",
                            "description": "Summarize conversations once token limit is reached. Default to 2000",
                            "show": {
                                "agentMemoryType": "conversationSummaryBuffer"
                            },
                            "id": "agentAgentflow_0-input-agentMemoryMaxTokenLimit-number",
                            "display": false
                        },
                        {
                            "label": "Input Message",
                            "name": "agentUserMessage",
                            "type": "string",
                            "description": "Add an input message as user message at the end of the conversation",
                            "rows": 4,
                            "optional": true,
                            "acceptVariable": true,
                            "show": {
                                "agentEnableMemory": true
                            },
                            "id": "agentAgentflow_0-input-agentUserMessage-string",
                            "display": true
                        },
                        {
                            "label": "Return Response As",
                            "name": "agentReturnResponseAs",
                            "type": "options",
                            "options": [
                                {
                                    "label": "User Message",
                                    "name": "userMessage"
                                },
                                {
                                    "label": "Assistant Message",
                                    "name": "assistantMessage"
                                }
                            ],
                            "default": "userMessage",
                            "id": "agentAgentflow_0-input-agentReturnResponseAs-options",
                            "display": true
                        },
                        {
                            "label": "Update Flow State",
                            "name": "agentUpdateState",
                            "description": "Update runtime state during the execution of the workflow",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "asyncOptions",
                                    "loadMethod": "listRuntimeStateKeys",
                                    "freeSolo": true
                                },
                                {
                                    "label": "Value",
                                    "name": "value",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "acceptNodeOutputAsVariable": true
                                }
                            ],
                            "id": "agentAgentflow_0-input-agentUpdateState-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "agentModel": "awsChatBedrock",
                        "agentMessages": [
                            {
                                "role": "system",
                                "content": "<p>You are Agent 0. Your goal is to explore any topic provided by the user in depth with Agent 1.</p><ol><li><p>Start: Introduce the topic to Agent 1. Share your initial thoughts and any assumptions you have.</p></li><li><p>Research &amp; Share:</p><ul><li><p>Use <strong>Brave API</strong> to find a range of information and different viewpoints on the topic. Look for URLs that seem promising for more detail.</p></li><li><p>Present what you find to Agent 1, especially any complexities, counter-arguments, or conflicting data.</p></li><li><p>Clearly state your sources:</p><ul><li><p>\"google API found...\"</p></li><li><p>\"After scraping [URL], the content shows...\"</p></li></ul></li></ul></li><li><p>Discuss &amp; Deepen:</p><ul><li><p>Listen to Agent 1. Ask probing questions.</p></li><li><p>If needed, use your tools again (google API to find more, Web Scraper to analyze a specific page) during the conversation to verify points or explore new angles.</p></li></ul></li><li><p>Mindset: Be curious, analytical, and open to different perspectives. Aim for a thorough understanding, not just agreement.</p></li></ol>"
                            }
                        ],
                        "agentTools": [
                            {
                                "agentSelectedTool": "braveSearchAPI",
                                "agentSelectedToolRequiresHumanInput": "",
                                "agentSelectedToolConfig": {
                                    "agentSelectedTool": "braveSearchAPI",
                                    "FLOWISE_CREDENTIAL_ID": "8b68b2fc-db18-4fa8-95b1-547a8986349a"
                                }
                            }
                        ],
                        "agentKnowledgeDocumentStores": [],
                        "agentKnowledgeVSEmbeddings": "",
                        "agentEnableMemory": true,
                        "agentMemoryType": "allMessages",
                        "agentUserMessage": "",
                        "agentReturnResponseAs": "assistantMessage",
                        "agentUpdateState": "",
                        "agentModelConfig": {
                            "credential": "",
                            "region": "us-east-1",
                            "model": "",
                            "customModel": "us.amazon.nova-lite-v1:0",
                            "streaming": true,
                            "temperature": "0",
                            "max_tokens_to_sample": "10000",
                            "allowImageUploads": "",
                            "agentModel": "awsChatBedrock",
                            "FLOWISE_CREDENTIAL_ID": "36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"
                        }
                    },
                    "outputAnchors": [
                        {
                            "id": "agentAgentflow_0-output-agentAgentflow",
                            "label": "Agent",
                            "name": "agentAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "agentFlow",
                "width": 123,
                "height": 104,
                "selected": false,
                "positionAbsolute": {
                    "x": 209.99147630894493,
                    "y": 101.79890732287393
                },
                "dragging": false
            },
            {
                "id": "agentAgentflow_1",
                "position": {
                    "x": 203.50865583557328,
                    "y": -75.13070214403373
                },
                "data": {
                    "id": "agentAgentflow_1",
                    "label": "Agent 1",
                    "version": 1,
                    "name": "agentAgentflow",
                    "type": "Agent",
                    "color": "#4DD0E1",
                    "baseClasses": [
                        "Agent"
                    ],
                    "category": "Agent Flows",
                    "description": "Dynamically choose and utilize tools during runtime, enabling multi-step reasoning",
                    "inputParams": [
                        {
                            "label": "Model",
                            "name": "agentModel",
                            "type": "asyncOptions",
                            "loadMethod": "listModels",
                            "loadConfig": true,
                            "id": "agentAgentflow_1-input-agentModel-asyncOptions",
                            "display": true
                        },
                        {
                            "label": "Messages",
                            "name": "agentMessages",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Role",
                                    "name": "role",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "System",
                                            "name": "system"
                                        },
                                        {
                                            "label": "Assistant",
                                            "name": "assistant"
                                        },
                                        {
                                            "label": "Developer",
                                            "name": "developer"
                                        },
                                        {
                                            "label": "User",
                                            "name": "user"
                                        }
                                    ]
                                },
                                {
                                    "label": "Content",
                                    "name": "content",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "generateInstruction": true,
                                    "rows": 4
                                }
                            ],
                            "id": "agentAgentflow_1-input-agentMessages-array",
                            "display": true
                        },
                        {
                            "label": "Tools",
                            "name": "agentTools",
                            "type": "array",
                            "optional": true,
                            "array": [
                                {
                                    "label": "Tool",
                                    "name": "agentSelectedTool",
                                    "type": "asyncOptions",
                                    "loadMethod": "listTools",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Require Human Input",
                                    "name": "agentSelectedToolRequiresHumanInput",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "id": "agentAgentflow_1-input-agentTools-array",
                            "display": true
                        },
                        {
                            "label": "Knowledge (Document Stores)",
                            "name": "agentKnowledgeDocumentStores",
                            "type": "array",
                            "description": "Give your agent context about different document sources. Document stores must be upserted in advance.",
                            "array": [
                                {
                                    "label": "Document Store",
                                    "name": "documentStore",
                                    "type": "asyncOptions",
                                    "loadMethod": "listStores"
                                },
                                {
                                    "label": "Describe Knowledge",
                                    "name": "docStoreDescription",
                                    "type": "string",
                                    "generateDocStoreDescription": true,
                                    "placeholder": "Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information",
                                    "rows": 4
                                },
                                {
                                    "label": "Return Source Documents",
                                    "name": "returnSourceDocuments",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "optional": true,
                            "id": "agentAgentflow_1-input-agentKnowledgeDocumentStores-array",
                            "display": true
                        },
                        {
                            "label": "Knowledge (Vector Embeddings)",
                            "name": "agentKnowledgeVSEmbeddings",
                            "type": "array",
                            "description": "Give your agent context about different document sources from existing vector stores and embeddings",
                            "array": [
                                {
                                    "label": "Vector Store",
                                    "name": "vectorStore",
                                    "type": "asyncOptions",
                                    "loadMethod": "listVectorStores",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Embedding Model",
                                    "name": "embeddingModel",
                                    "type": "asyncOptions",
                                    "loadMethod": "listEmbeddings",
                                    "loadConfig": true
                                },
                                {
                                    "label": "Knowledge Name",
                                    "name": "knowledgeName",
                                    "type": "string",
                                    "placeholder": "A short name for the knowledge base, this is useful for the AI to know when and how to search for correct information"
                                },
                                {
                                    "label": "Describe Knowledge",
                                    "name": "knowledgeDescription",
                                    "type": "string",
                                    "placeholder": "Describe what the knowledge base is about, this is useful for the AI to know when and how to search for correct information",
                                    "rows": 4
                                },
                                {
                                    "label": "Return Source Documents",
                                    "name": "returnSourceDocuments",
                                    "type": "boolean",
                                    "optional": true
                                }
                            ],
                            "optional": true,
                            "id": "agentAgentflow_1-input-agentKnowledgeVSEmbeddings-array",
                            "display": true
                        },
                        {
                            "label": "Enable Memory",
                            "name": "agentEnableMemory",
                            "type": "boolean",
                            "description": "Enable memory for the conversation thread",
                            "default": true,
                            "optional": true,
                            "id": "agentAgentflow_1-input-agentEnableMemory-boolean",
                            "display": true
                        },
                        {
                            "label": "Memory Type",
                            "name": "agentMemoryType",
                            "type": "options",
                            "options": [
                                {
                                    "label": "All Messages",
                                    "name": "allMessages",
                                    "description": "Retrieve all messages from the conversation"
                                },
                                {
                                    "label": "Window Size",
                                    "name": "windowSize",
                                    "description": "Uses a fixed window size to surface the last N messages"
                                },
                                {
                                    "label": "Conversation Summary",
                                    "name": "conversationSummary",
                                    "description": "Summarizes the whole conversation"
                                },
                                {
                                    "label": "Conversation Summary Buffer",
                                    "name": "conversationSummaryBuffer",
                                    "description": "Summarize conversations once token limit is reached. Default to 2000"
                                }
                            ],
                            "optional": true,
                            "default": "allMessages",
                            "show": {
                                "agentEnableMemory": true
                            },
                            "id": "agentAgentflow_1-input-agentMemoryType-options",
                            "display": true
                        },
                        {
                            "label": "Window Size",
                            "name": "agentMemoryWindowSize",
                            "type": "number",
                            "default": "20",
                            "description": "Uses a fixed window size to surface the last N messages",
                            "show": {
                                "agentMemoryType": "windowSize"
                            },
                            "id": "agentAgentflow_1-input-agentMemoryWindowSize-number",
                            "display": false
                        },
                        {
                            "label": "Max Token Limit",
                            "name": "agentMemoryMaxTokenLimit",
                            "type": "number",
                            "default": "2000",
                            "description": "Summarize conversations once token limit is reached. Default to 2000",
                            "show": {
                                "agentMemoryType": "conversationSummaryBuffer"
                            },
                            "id": "agentAgentflow_1-input-agentMemoryMaxTokenLimit-number",
                            "display": false
                        },
                        {
                            "label": "Input Message",
                            "name": "agentUserMessage",
                            "type": "string",
                            "description": "Add an input message as user message at the end of the conversation",
                            "rows": 4,
                            "optional": true,
                            "acceptVariable": true,
                            "show": {
                                "agentEnableMemory": true
                            },
                            "id": "agentAgentflow_1-input-agentUserMessage-string",
                            "display": true
                        },
                        {
                            "label": "Return Response As",
                            "name": "agentReturnResponseAs",
                            "type": "options",
                            "options": [
                                {
                                    "label": "User Message",
                                    "name": "userMessage"
                                },
                                {
                                    "label": "Assistant Message",
                                    "name": "assistantMessage"
                                }
                            ],
                            "default": "userMessage",
                            "id": "agentAgentflow_1-input-agentReturnResponseAs-options",
                            "display": true
                        },
                        {
                            "label": "Update Flow State",
                            "name": "agentUpdateState",
                            "description": "Update runtime state during the execution of the workflow",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "asyncOptions",
                                    "loadMethod": "listRuntimeStateKeys",
                                    "freeSolo": true
                                },
                                {
                                    "label": "Value",
                                    "name": "value",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "acceptNodeOutputAsVariable": true
                                }
                            ],
                            "id": "agentAgentflow_1-input-agentUpdateState-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "agentModel": "awsChatBedrock",
                        "agentMessages": [
                            {
                                "role": "system",
                                "content": "<p>You are Agent 1. Your goal is to explore a topic in depth with Agent 0.</p><ol><li><p>Respond &amp; Share:</p><ul><li><p>Acknowledge the topic Agent 0 introduces.</p></li><li><p>Share your own thoughts and feelings, building on or respectfully challenging Agent 0's points. Consider your own assumptions.</p></li></ul></li><li><p>Research &amp; Contribute:</p><ul><li><p>Use <strong>Brave API</strong> to research the topic, especially looking for different perspectives, counter-arguments, or aspects Agent 0 might not have covered. Identify URLs that seem promising for more detail.</p></li><li><p>If a URL from Brave API (or one you already know) seems particularly important for your point or for adding nuance, use the <strong>Web Scraper Tool</strong> to get its full content.</p></li><li><p>Present your findings, especially any that introduce new angles, conflicts, or alternative views.</p></li><li><p>Clearly state your sources:</p><ul><li><p>\"My Google API tool found...\"</p></li><li><p>\"After scraping [URL], the content suggests...\"</p></li></ul></li><li><p>If you find conflicting info from different sources, point this out.</p></li></ul></li><li><p>Discuss &amp; Deepen:</p><ul><li><p>Listen carefully to Agent 0. Ask clarifying questions and questions that challenge their reasoning or explore alternatives.</p></li><li><p>If needed, use your tools again (Google API to find more, Web Scraper to analyze a specific page) during the conversation to support your points or investigate Agent 0's claims.</p></li></ul></li><li><p>Mindset: Be respectful, analytical, and open to different viewpoints. Aim for a thorough exploration and constructive disagreement, backed by research.</p></li></ol>"
                            }
                        ],
                        "agentTools": [
                            {
                                "agentSelectedTool": "braveSearchAPI",
                                "agentSelectedToolRequiresHumanInput": "",
                                "agentSelectedToolConfig": {
                                    "agentSelectedTool": "braveSearchAPI",
                                    "FLOWISE_CREDENTIAL_ID": "8b68b2fc-db18-4fa8-95b1-547a8986349a"
                                }
                            }
                        ],
                        "agentKnowledgeDocumentStores": "",
                        "agentKnowledgeVSEmbeddings": "",
                        "agentEnableMemory": true,
                        "agentMemoryType": "allMessages",
                        "agentUserMessage": "",
                        "agentReturnResponseAs": "assistantMessage",
                        "agentUpdateState": "",
                        "agentModelConfig": {
                            "credential": "",
                            "region": "us-east-1",
                            "model": "",
                            "customModel": "us.amazon.nova-lite-v1:0",
                            "streaming": true,
                            "temperature": "0",
                            "max_tokens_to_sample": "10000",
                            "allowImageUploads": "",
                            "agentModel": "awsChatBedrock",
                            "FLOWISE_CREDENTIAL_ID": "36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"
                        }
                    },
                    "outputAnchors": [
                        {
                            "id": "agentAgentflow_1-output-agentAgentflow",
                            "label": "Agent",
                            "name": "agentAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "agentFlow",
                "width": 120,
                "height": 104,
                "selected": false,
                "positionAbsolute": {
                    "x": 203.50865583557328,
                    "y": -75.13070214403373
                },
                "dragging": false
            },
            {
                "id": "conditionAgentflow_0",
                "position": {
                    "x": 497.07879661792845,
                    "y": 28.062842621950765
                },
                "data": {
                    "id": "conditionAgentflow_0",
                    "label": "Condition",
                    "version": 1,
                    "name": "conditionAgentflow",
                    "type": "Condition",
                    "color": "#FFB938",
                    "baseClasses": [
                        "Condition"
                    ],
                    "category": "Agent Flows",
                    "description": "Split flows based on If Else conditions",
                    "inputParams": [
                        {
                            "label": "Conditions",
                            "name": "conditions",
                            "type": "array",
                            "description": "Values to compare",
                            "acceptVariable": true,
                            "default": [
                                {
                                    "type": "number",
                                    "value1": "",
                                    "operation": "equal",
                                    "value2": ""
                                }
                            ],
                            "array": [
                                {
                                    "label": "Type",
                                    "name": "type",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "String",
                                            "name": "string"
                                        },
                                        {
                                            "label": "Number",
                                            "name": "number"
                                        },
                                        {
                                            "label": "Boolean",
                                            "name": "boolean"
                                        }
                                    ],
                                    "default": "string"
                                },
                                {
                                    "label": "Value 1",
                                    "name": "value1",
                                    "type": "string",
                                    "default": "",
                                    "description": "First value to be compared with",
                                    "acceptVariable": true,
                                    "show": {
                                        "conditions[$index].type": "string"
                                    }
                                },
                                {
                                    "label": "Operation",
                                    "name": "operation",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "Contains",
                                            "name": "contains"
                                        },
                                        {
                                            "label": "Ends With",
                                            "name": "endsWith"
                                        },
                                        {
                                            "label": "Equal",
                                            "name": "equal"
                                        },
                                        {
                                            "label": "Not Contains",
                                            "name": "notContains"
                                        },
                                        {
                                            "label": "Not Equal",
                                            "name": "notEqual"
                                        },
                                        {
                                            "label": "Regex",
                                            "name": "regex"
                                        },
                                        {
                                            "label": "Starts With",
                                            "name": "startsWith"
                                        },
                                        {
                                            "label": "Is Empty",
                                            "name": "isEmpty"
                                        },
                                        {
                                            "label": "Not Empty",
                                            "name": "notEmpty"
                                        }
                                    ],
                                    "default": "equal",
                                    "description": "Type of operation",
                                    "show": {
                                        "conditions[$index].type": "string"
                                    }
                                },
                                {
                                    "label": "Value 2",
                                    "name": "value2",
                                    "type": "string",
                                    "default": "",
                                    "description": "Second value to be compared with",
                                    "acceptVariable": true,
                                    "show": {
                                        "conditions[$index].type": "string"
                                    },
                                    "hide": {
                                        "conditions[$index].operation": [
                                            "isEmpty",
                                            "notEmpty"
                                        ]
                                    }
                                },
                                {
                                    "label": "Value 1",
                                    "name": "value1",
                                    "type": "number",
                                    "default": "",
                                    "description": "First value to be compared with",
                                    "acceptVariable": true,
                                    "show": {
                                        "conditions[$index].type": "number"
                                    }
                                },
                                {
                                    "label": "Operation",
                                    "name": "operation",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "Smaller",
                                            "name": "smaller"
                                        },
                                        {
                                            "label": "Smaller Equal",
                                            "name": "smallerEqual"
                                        },
                                        {
                                            "label": "Equal",
                                            "name": "equal"
                                        },
                                        {
                                            "label": "Not Equal",
                                            "name": "notEqual"
                                        },
                                        {
                                            "label": "Larger",
                                            "name": "larger"
                                        },
                                        {
                                            "label": "Larger Equal",
                                            "name": "largerEqual"
                                        },
                                        {
                                            "label": "Is Empty",
                                            "name": "isEmpty"
                                        },
                                        {
                                            "label": "Not Empty",
                                            "name": "notEmpty"
                                        }
                                    ],
                                    "default": "equal",
                                    "description": "Type of operation",
                                    "show": {
                                        "conditions[$index].type": "number"
                                    }
                                },
                                {
                                    "label": "Value 2",
                                    "name": "value2",
                                    "type": "number",
                                    "default": 0,
                                    "description": "Second value to be compared with",
                                    "acceptVariable": true,
                                    "show": {
                                        "conditions[$index].type": "number"
                                    }
                                },
                                {
                                    "label": "Value 1",
                                    "name": "value1",
                                    "type": "boolean",
                                    "default": false,
                                    "description": "First value to be compared with",
                                    "show": {
                                        "conditions[$index].type": "boolean"
                                    }
                                },
                                {
                                    "label": "Operation",
                                    "name": "operation",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "Equal",
                                            "name": "equal"
                                        },
                                        {
                                            "label": "Not Equal",
                                            "name": "notEqual"
                                        }
                                    ],
                                    "default": "equal",
                                    "description": "Type of operation",
                                    "show": {
                                        "conditions[$index].type": "boolean"
                                    }
                                },
                                {
                                    "label": "Value 2",
                                    "name": "value2",
                                    "type": "boolean",
                                    "default": false,
                                    "description": "Second value to be compared with",
                                    "show": {
                                        "conditions[$index].type": "boolean"
                                    }
                                }
                            ],
                            "id": "conditionAgentflow_0-input-conditions-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "conditions": [
                            {
                                "type": "number",
                                "value1": "<p><span class=\"variable\" data-type=\"mention\" data-id=\"runtime_messages_length\" data-label=\"runtime_messages_length\">{{ runtime_messages_length }}</span> </p>",
                                "operation": "smallerEqual",
                                "value2": "<p>2</p>"
                            },
                            {
                                "type": "number",
                                "value1": "<p><span class=\"variable\" data-type=\"mention\" data-id=\"runtime_messages_length\" data-label=\"runtime_messages_length\">{{ runtime_messages_length }}</span> </p>",
                                "operation": "larger",
                                "value2": "<p>2</p>"
                            }
                        ]
                    },
                    "outputAnchors": [
                        {
                            "id": "conditionAgentflow_0-output-0",
                            "label": 0,
                            "name": 0,
                            "description": "Condition 0"
                        },
                        {
                            "id": "conditionAgentflow_0-output-1",
                            "label": 1,
                            "name": 1,
                            "description": "Condition 1"
                        },
                        {
                            "id": "conditionAgentflow_0-output-2",
                            "label": 2,
                            "name": 2,
                            "description": "Else"
                        }
                    ],
                    "outputs": {
                        "conditionAgentflow": ""
                    },
                    "selected": false
                },
                "type": "agentFlow",
                "width": 134,
                "height": 100,
                "selected": false,
                "positionAbsolute": {
                    "x": 497.07879661792845,
                    "y": 28.062842621950765
                },
                "dragging": false
            },
            {
                "id": "loopAgentflow_0",
                "position": {
                    "x": 725.7190931882794,
                    "y": -53.97688097527553
                },
                "data": {
                    "id": "loopAgentflow_0",
                    "label": "Loop",
                    "version": 1,
                    "name": "loopAgentflow",
                    "type": "Loop",
                    "color": "#FFA07A",
                    "hideOutput": true,
                    "baseClasses": [
                        "Loop"
                    ],
                    "category": "Agent Flows",
                    "description": "Loop back to a previous node",
                    "inputParams": [
                        {
                            "label": "Loop Back To",
                            "name": "loopBackToNode",
                            "type": "asyncOptions",
                            "loadMethod": "listPreviousNodes",
                            "freeSolo": true,
                            "id": "loopAgentflow_0-input-loopBackToNode-asyncOptions",
                            "display": true
                        },
                        {
                            "label": "Max Loop Count",
                            "name": "maxLoopCount",
                            "type": "number",
                            "default": 5,
                            "id": "loopAgentflow_0-input-maxLoopCount-number",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "loopBackToNode": "agentAgentflow_0-Agent 0",
                        "maxLoopCount": "2"
                    },
                    "outputAnchors": [],
                    "outputs": {},
                    "selected": false
                },
                "type": "agentFlow",
                "width": 104,
                "height": 66,
                "selected": false,
                "dragging": false,
                "positionAbsolute": {
                    "x": 725.7190931882794,
                    "y": -53.97688097527553
                }
            },
            {
                "id": "llmAgentflow_1",
                "position": {
                    "x": 693.0529196789191,
                    "y": 133.0683091126315
                },
                "data": {
                    "id": "llmAgentflow_1",
                    "label": "Agent 2",
                    "version": 1,
                    "name": "llmAgentflow",
                    "type": "LLM",
                    "color": "#64B5F6",
                    "baseClasses": [
                        "LLM"
                    ],
                    "category": "Agent Flows",
                    "description": "Large language models to analyze user-provided inputs and generate responses",
                    "inputParams": [
                        {
                            "label": "Model",
                            "name": "llmModel",
                            "type": "asyncOptions",
                            "loadMethod": "listModels",
                            "loadConfig": true,
                            "id": "llmAgentflow_1-input-llmModel-asyncOptions",
                            "display": true
                        },
                        {
                            "label": "Messages",
                            "name": "llmMessages",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Role",
                                    "name": "role",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "System",
                                            "name": "system"
                                        },
                                        {
                                            "label": "Assistant",
                                            "name": "assistant"
                                        },
                                        {
                                            "label": "Developer",
                                            "name": "developer"
                                        },
                                        {
                                            "label": "User",
                                            "name": "user"
                                        }
                                    ]
                                },
                                {
                                    "label": "Content",
                                    "name": "content",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "generateInstruction": true,
                                    "rows": 4
                                }
                            ],
                            "id": "llmAgentflow_1-input-llmMessages-array",
                            "display": true
                        },
                        {
                            "label": "Enable Memory",
                            "name": "llmEnableMemory",
                            "type": "boolean",
                            "description": "Enable memory for the conversation thread",
                            "default": true,
                            "optional": true,
                            "id": "llmAgentflow_1-input-llmEnableMemory-boolean",
                            "display": true
                        },
                        {
                            "label": "Memory Type",
                            "name": "llmMemoryType",
                            "type": "options",
                            "options": [
                                {
                                    "label": "All Messages",
                                    "name": "allMessages",
                                    "description": "Retrieve all messages from the conversation"
                                },
                                {
                                    "label": "Window Size",
                                    "name": "windowSize",
                                    "description": "Uses a fixed window size to surface the last N messages"
                                },
                                {
                                    "label": "Conversation Summary",
                                    "name": "conversationSummary",
                                    "description": "Summarizes the whole conversation"
                                },
                                {
                                    "label": "Conversation Summary Buffer",
                                    "name": "conversationSummaryBuffer",
                                    "description": "Summarize conversations once token limit is reached. Default to 2000"
                                }
                            ],
                            "optional": true,
                            "default": "allMessages",
                            "show": {
                                "llmEnableMemory": true
                            },
                            "id": "llmAgentflow_1-input-llmMemoryType-options",
                            "display": false
                        },
                        {
                            "label": "Window Size",
                            "name": "llmMemoryWindowSize",
                            "type": "number",
                            "default": "20",
                            "description": "Uses a fixed window size to surface the last N messages",
                            "show": {
                                "llmMemoryType": "windowSize"
                            },
                            "id": "llmAgentflow_1-input-llmMemoryWindowSize-number",
                            "display": false
                        },
                        {
                            "label": "Max Token Limit",
                            "name": "llmMemoryMaxTokenLimit",
                            "type": "number",
                            "default": "2000",
                            "description": "Summarize conversations once token limit is reached. Default to 2000",
                            "show": {
                                "llmMemoryType": "conversationSummaryBuffer"
                            },
                            "id": "llmAgentflow_1-input-llmMemoryMaxTokenLimit-number",
                            "display": false
                        },
                        {
                            "label": "Input Message",
                            "name": "llmUserMessage",
                            "type": "string",
                            "description": "Add an input message as user message at the end of the conversation",
                            "rows": 4,
                            "optional": true,
                            "acceptVariable": true,
                            "show": {
                                "llmEnableMemory": true
                            },
                            "id": "llmAgentflow_1-input-llmUserMessage-string",
                            "display": false
                        },
                        {
                            "label": "Return Response As",
                            "name": "llmReturnResponseAs",
                            "type": "options",
                            "options": [
                                {
                                    "label": "User Message",
                                    "name": "userMessage"
                                },
                                {
                                    "label": "Assistant Message",
                                    "name": "assistantMessage"
                                }
                            ],
                            "default": "userMessage",
                            "id": "llmAgentflow_1-input-llmReturnResponseAs-options",
                            "display": true
                        },
                        {
                            "label": "JSON Structured Output",
                            "name": "llmStructuredOutput",
                            "description": "Instruct the LLM to give output in a JSON structured schema",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "string"
                                },
                                {
                                    "label": "Type",
                                    "name": "type",
                                    "type": "options",
                                    "options": [
                                        {
                                            "label": "String",
                                            "name": "string"
                                        },
                                        {
                                            "label": "String Array",
                                            "name": "stringArray"
                                        },
                                        {
                                            "label": "Number",
                                            "name": "number"
                                        },
                                        {
                                            "label": "Boolean",
                                            "name": "boolean"
                                        },
                                        {
                                            "label": "Enum",
                                            "name": "enum"
                                        },
                                        {
                                            "label": "JSON Array",
                                            "name": "jsonArray"
                                        }
                                    ]
                                },
                                {
                                    "label": "Enum Values",
                                    "name": "enumValues",
                                    "type": "string",
                                    "placeholder": "value1, value2, value3",
                                    "description": "Enum values. Separated by comma",
                                    "optional": true,
                                    "show": {
                                        "llmStructuredOutput[$index].type": "enum"
                                    }
                                },
                                {
                                    "label": "JSON Schema",
                                    "name": "jsonSchema",
                                    "type": "code",
                                    "placeholder": "{\n    \"answer\": {\n        \"type\": \"string\",\n        \"description\": \"Value of the answer\"\n    },\n    \"reason\": {\n        \"type\": \"string\",\n        \"description\": \"Reason for the answer\"\n    },\n    \"optional\": {\n        \"type\": \"boolean\"\n    },\n    \"count\": {\n        \"type\": \"number\"\n    },\n    \"children\": {\n        \"type\": \"array\",\n        \"items\": {\n            \"type\": \"object\",\n            \"properties\": {\n                \"value\": {\n                    \"type\": \"string\",\n                    \"description\": \"Value of the children's answer\"\n                }\n            }\n        }\n    }\n}",
                                    "description": "JSON schema for the structured output",
                                    "optional": true,
                                    "show": {
                                        "llmStructuredOutput[$index].type": "jsonArray"
                                    }
                                },
                                {
                                    "label": "Description",
                                    "name": "description",
                                    "type": "string",
                                    "placeholder": "Description of the key"
                                }
                            ],
                            "id": "llmAgentflow_1-input-llmStructuredOutput-array",
                            "display": true
                        },
                        {
                            "label": "Update Flow State",
                            "name": "llmUpdateState",
                            "description": "Update runtime state during the execution of the workflow",
                            "type": "array",
                            "optional": true,
                            "acceptVariable": true,
                            "array": [
                                {
                                    "label": "Key",
                                    "name": "key",
                                    "type": "asyncOptions",
                                    "loadMethod": "listRuntimeStateKeys",
                                    "freeSolo": true
                                },
                                {
                                    "label": "Value",
                                    "name": "value",
                                    "type": "string",
                                    "acceptVariable": true,
                                    "acceptNodeOutputAsVariable": true
                                }
                            ],
                            "id": "llmAgentflow_1-input-llmUpdateState-array",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "llmModel": "awsChatBedrock",
                        "llmMessages": [
                            {
                                "role": "system",
                                "content": "<p>You are Agent 2. Your role is to transform the deep conversation between Agent 0 and Agent 1 into a comprehensive and extensive white paper on the subject they discussed.</p><p>Your goal is to produce an authoritative document that not only captures the essence of their dialogue but also expands upon it, providing a thorough exploration of the topic. This white paper should be suitable for an audience seeking a deep understanding of the subject.</p><p>The White paper must be written in Traditional Chinese. The white paper must include, but is not limited to, the following sections and considerations:</p><ol><li><p>Title: A clear, compelling title for the white paper that reflects the core subject.</p></li><li><p>Abstract/Executive Summary: A concise overview (approx. 200-300 words) of the white paper's main arguments, scope, and conclusions, derived from the conversation.</p></li><li><p>A table comparing the viewpoints of Agent 0 and Agent 1.</p></li></ol><p>Style and Tone:</p><ul><li><p>Extensive and In-depth: The paper should be thorough and detailed.</p></li><li><p>Well-Structured: Use clear headings, subheadings, and logical flow.</p></li><li><p>Analytical and Critical: Do not just report; analyze, interpret, and critically engage with the agents' ideas.</p></li><li><p>Objective and Authoritative: While based on the agents' dialogue, the white paper should present a balanced and well-reasoned perspective.</p></li><li><p>Clear Attribution: When discussing specific viewpoints or arguments, clearly attribute them to Agent 0 or Agent 1.</p></li><li><p>Formal and Professional Language: Maintain a tone appropriate for a white paper.</p></li></ul><p>Your primary source material is the conversation between Agent 0 and Agent 1. Your task is to elevate their discourse into a structured, analytical, and extensive white paper.</p>"
                            },
                            {
                                "role": "user",
                                "content": "<p>Here is the full conversation between Agent 0 and Agent 1. Please use this as the primary source material for generating the extensive white paper as per your instructions:<br>--<br><span class=\"variable\" data-type=\"mention\" data-id=\"chat_history\" data-label=\"chat_history\">{{ chat_history }}</span> <br>--</p>"
                            }
                        ],
                        "llmEnableMemory": false,
                        "llmReturnResponseAs": "assistantMessage",
                        "llmStructuredOutput": "",
                        "llmUpdateState": "",
                        "llmModelConfig": {
                            "credential": "",
                            "region": "us-east-1",
                            "model": "",
                            "customModel": "us.amazon.nova-lite-v1:0",
                            "streaming": true,
                            "temperature": 0.7,
                            "max_tokens_to_sample": "10000",
                            "allowImageUploads": "",
                            "llmModel": "awsChatBedrock",
                            "FLOWISE_CREDENTIAL_ID": "36f2f977-b75e-4ccb-8fb0-8c2fe996fc53"
                        }
                    },
                    "outputAnchors": [
                        {
                            "id": "llmAgentflow_1-output-llmAgentflow",
                            "label": "LLM",
                            "name": "llmAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "agentFlow",
                "width": 123,
                "height": 72,
                "selected": false,
                "positionAbsolute": {
                    "x": 693.0529196789191,
                    "y": 133.0683091126315
                },
                "dragging": false
            },
            {
                "id": "stickyNoteAgentflow_0",
                "position": {
                    "x": -320.62033146052283,
                    "y": -110.15285265313359
                },
                "data": {
                    "id": "stickyNoteAgentflow_0",
                    "label": "Sticky Note",
                    "version": 1,
                    "name": "stickyNoteAgentflow",
                    "type": "StickyNote",
                    "color": "#fee440",
                    "baseClasses": [
                        "StickyNote"
                    ],
                    "category": "Agent Flows",
                    "description": "Add notes to the agent flow",
                    "inputParams": [
                        {
                            "label": "",
                            "name": "note",
                            "type": "string",
                            "rows": 1,
                            "placeholder": "Type something here",
                            "optional": true,
                            "id": "stickyNoteAgentflow_0-input-note-string",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "note": "User provides a topic for research, for example: \"Humans in the Era of an ASI\""
                    },
                    "outputAnchors": [
                        {
                            "id": "stickyNoteAgentflow_0-output-stickyNoteAgentflow",
                            "label": "Sticky Note",
                            "name": "stickyNoteAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "stickyNote",
                "width": 203,
                "height": 123,
                "selected": false,
                "positionAbsolute": {
                    "x": -320.62033146052283,
                    "y": -110.15285265313359
                },
                "dragging": false
            },
            {
                "id": "stickyNoteAgentflow_1",
                "position": {
                    "x": 466.8306744858025,
                    "y": -189.9009582021492
                },
                "data": {
                    "id": "stickyNoteAgentflow_1",
                    "label": "Sticky Note (1)",
                    "version": 1,
                    "name": "stickyNoteAgentflow",
                    "type": "StickyNote",
                    "color": "#fee440",
                    "baseClasses": [
                        "StickyNote"
                    ],
                    "category": "Agent Flows",
                    "description": "Add notes to the agent flow",
                    "inputParams": [
                        {
                            "label": "",
                            "name": "note",
                            "type": "string",
                            "rows": 1,
                            "placeholder": "Type something here",
                            "optional": true,
                            "id": "stickyNoteAgentflow_1-input-note-string",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "note": "Determine the number of back-and-forth exchanges between Agent 0 and Agent 1 in a deep conversation about the user's topic.  It is currently set for 5 iterations."
                    },
                    "outputAnchors": [
                        {
                            "id": "stickyNoteAgentflow_1-output-stickyNoteAgentflow",
                            "label": "Sticky Note",
                            "name": "stickyNoteAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "stickyNote",
                "width": 203,
                "height": 203,
                "selected": false,
                "positionAbsolute": {
                    "x": 466.8306744858025,
                    "y": -189.9009582021492
                },
                "dragging": false
            },
            {
                "id": "stickyNoteAgentflow_2",
                "position": {
                    "x": 693.7511120802441,
                    "y": 221.75098356027857
                },
                "data": {
                    "id": "stickyNoteAgentflow_2",
                    "label": "Sticky Note (1) (2)",
                    "version": 1,
                    "name": "stickyNoteAgentflow",
                    "type": "StickyNote",
                    "color": "#fee440",
                    "baseClasses": [
                        "StickyNote"
                    ],
                    "category": "Agent Flows",
                    "description": "Add notes to the agent flow",
                    "inputParams": [
                        {
                            "label": "",
                            "name": "note",
                            "type": "string",
                            "rows": 1,
                            "placeholder": "Type something here",
                            "optional": true,
                            "id": "stickyNoteAgentflow_2-input-note-string",
                            "display": true
                        }
                    ],
                    "inputAnchors": [],
                    "inputs": {
                        "note": "This LLM Node transforms the in-depth conversation between Agent 0 and Agent 1 into a comprehensive white paper. It can be replaced with an Agent Node if you need to use tools such as sending the findings to our email, etc."
                    },
                    "outputAnchors": [
                        {
                            "id": "stickyNoteAgentflow_2-output-stickyNoteAgentflow",
                            "label": "Sticky Note",
                            "name": "stickyNoteAgentflow"
                        }
                    ],
                    "outputs": {},
                    "selected": false
                },
                "type": "stickyNote",
                "width": 203,
                "height": 284,
                "selected": false,
                "positionAbsolute": {
                    "x": 693.7511120802441,
                    "y": 221.75098356027857
                },
                "dragging": false
            }
        ],
        "edges": [
            {
                "source": "startAgentflow_0",
                "sourceHandle": "startAgentflow_0-output-startAgentflow",
                "target": "llmAgentflow_0",
                "targetHandle": "llmAgentflow_0",
                "data": {
                    "sourceColor": "#7EE787",
                    "targetColor": "#64B5F6",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "startAgentflow_0-startAgentflow_0-output-startAgentflow-llmAgentflow_0-llmAgentflow_0"
            },
            {
                "source": "llmAgentflow_0",
                "sourceHandle": "llmAgentflow_0-output-llmAgentflow",
                "target": "agentAgentflow_0",
                "targetHandle": "agentAgentflow_0",
                "data": {
                    "sourceColor": "#64B5F6",
                    "targetColor": "#4DD0E1",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "llmAgentflow_0-llmAgentflow_0-output-llmAgentflow-agentAgentflow_0-agentAgentflow_0"
            },
            {
                "source": "agentAgentflow_0",
                "sourceHandle": "agentAgentflow_0-output-agentAgentflow",
                "target": "agentAgentflow_1",
                "targetHandle": "agentAgentflow_1",
                "data": {
                    "sourceColor": "#4DD0E1",
                    "targetColor": "#4DD0E1",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "agentAgentflow_0-agentAgentflow_0-output-agentAgentflow-agentAgentflow_1-agentAgentflow_1"
            },
            {
                "source": "agentAgentflow_1",
                "sourceHandle": "agentAgentflow_1-output-agentAgentflow",
                "target": "conditionAgentflow_0",
                "targetHandle": "conditionAgentflow_0",
                "data": {
                    "sourceColor": "#4DD0E1",
                    "targetColor": "#FFB938",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "agentAgentflow_1-agentAgentflow_1-output-agentAgentflow-conditionAgentflow_0-conditionAgentflow_0"
            },
            {
                "source": "conditionAgentflow_0",
                "sourceHandle": "conditionAgentflow_0-output-0",
                "target": "loopAgentflow_0",
                "targetHandle": "loopAgentflow_0",
                "data": {
                    "sourceColor": "#FFB938",
                    "targetColor": "#FFA07A",
                    "edgeLabel": "0",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "conditionAgentflow_0-conditionAgentflow_0-output-0-loopAgentflow_0-loopAgentflow_0"
            },
            {
                "source": "conditionAgentflow_0",
                "sourceHandle": "conditionAgentflow_0-output-1",
                "target": "llmAgentflow_1",
                "targetHandle": "llmAgentflow_1",
                "data": {
                    "sourceColor": "#FFB938",
                    "targetColor": "#64B5F6",
                    "edgeLabel": "1",
                    "isHumanInput": false
                },
                "type": "agentFlow",
                "id": "conditionAgentflow_0-conditionAgentflow_0-output-1-llmAgentflow_1-llmAgentflow_1"
            }
        ],
        "viewport": {
            "x": 866.4815691781685,
            "y": 231.66669537080452,
            "zoom": 1.0310798895429278
        }
    },
    "chatbot_config": {
        "botMessage": {
            "showAvatar": false,
            "backgroundColor": "#f7f8ff",
            "textColor": "#303235"
        },
        "userMessage": {
            "showAvatar": false,
            "backgroundColor": "#3B81F6",
            "textColor": "#ffffff"
        },
        "textInput": {
            "backgroundColor": "#ffffff",
            "textColor": "#303235",
            "sendButtonColor": "#3B81F6"
        },
        "titleBackgroundColor": "#3B81F6",
        "titleTextColor": "#ffffff",
        "backgroundColor": "#ffffff",
        "fontSize": 16,
        "poweredByTextColor": "#303235",
        "renderHTML": false,
        "showAgentMessages": true,
        "fullFileUpload": {
            "status": true,
            "allowedUploadFileTypes": "text/css,text/csv,text/html,application/json,text/markdown,application/pdf,application/sql,text/plain,application/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "pdfFile": {
                "usage": "perPage",
                "legacyBuild": true
            }
        }
    },
    "api_config": null,
    "analytic_config": {
        "langSmith": {
            "credentialId": "dc5497d0-c8ce-4b1e-81d4-d48946f0e920",
            "projectName": "agentaai03",
            "status": true
        }
    },
    "speech_to_text_config": null,
    "created_date": "2025-05-28T08:46:05.186000",
    "updated_date": "2025-06-23T09:20:11.134000",
    "synced_at": "2025-06-26T06:52:16.666000",
    "sync_status": "active",
    "sync_error": null
}
```