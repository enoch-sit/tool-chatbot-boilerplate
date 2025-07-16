# MongoDB Queries to Explore Non-Token Event Metadata

Here are useful MongoDB queries to explore the non-token event metadata stored in your ChatMessage collection:

## Basic Connection Commands

```bash
# Connect to MongoDB container
docker exec -it mongodb-test mongosh --username admin --password password --authenticationDatabase admin flowise_proxy_test

# Show collections
show collections

# Show database stats
db.stats()
```

## Exploring ChatMessage Metadata

### 1. Count Messages with Metadata
```javascript
// Count total chat messages
db.chat_messages.countDocuments()

// Count messages with metadata field
db.chat_messages.countDocuments({metadata: {$exists: true}})

// Count assistant messages with metadata
db.chat_messages.countDocuments({role: "assistant", metadata: {$exists: true}})
```

### 2. View Metadata Structure
```javascript
// Get a sample of metadata structure
db.chat_messages.findOne({role: "assistant", metadata: {$exists: true}}, {metadata: 1, _id: 0})

// Get all unique event types in metadata
db.chat_messages.distinct("metadata.event")

// Find messages with specific event types
db.chat_messages.find({"metadata.event": "agentFlowExecutedData"})
```

### 3. Agent Flow Analysis
```javascript
// Find messages with agent flow data
db.chat_messages.find({"metadata.event": "agentFlowExecutedData"}, {
  session_id: 1, 
  created_at: 1, 
  "metadata.data.nodeId": 1,
  "metadata.data.nodeLabel": 1,
  "metadata.data.status": 1
})

// Get usage metadata for token consumption analysis
db.chat_messages.find({"metadata.event": "usageMetadata"}, {
  session_id: 1,
  created_at: 1,
  "metadata.data": 1
})

// Find messages with specific agent nodes
db.chat_messages.find({"metadata.data.nodeId": "llmAgentflow_0"})
```

### 4. Performance Analysis
```javascript
// Find messages with timing metadata
db.chat_messages.find({"metadata.data.timeMetadata": {$exists: true}}, {
  session_id: 1,
  created_at: 1,
  "metadata.event": 1,
  "metadata.data.timeMetadata.delta": 1
})

// Average response time by event type
db.chat_messages.aggregate([
  {$unwind: "$metadata"},
  {$match: {"metadata.data.timeMetadata.delta": {$exists: true}}},
  {$group: {
    _id: "$metadata.event",
    avgResponseTime: {$avg: "$metadata.data.timeMetadata.delta"},
    count: {$sum: 1}
  }}
])
```

### 5. Session Analysis
```javascript
// Find all sessions with metadata
db.chat_messages.find({metadata: {$exists: true}}, {
  session_id: 1,
  user_id: 1,
  chatflow_id: 1,
  created_at: 1,
  role: 1
}).sort({created_at: -1})

// Group by session and count events
db.chat_messages.aggregate([
  {$match: {metadata: {$exists: true}}},
  {$group: {
    _id: "$session_id",
    totalEvents: {$sum: {$size: "$metadata"}},
    messages: {$sum: 1},
    user_id: {$first: "$user_id"},
    chatflow_id: {$first: "$chatflow_id"}
  }}
])
```

### 6. Event Type Analysis
```javascript
// Count each event type across all messages
db.chat_messages.aggregate([
  {$unwind: "$metadata"},
  {$group: {
    _id: "$metadata.event",
    count: {$sum: 1}
  }},
  {$sort: {count: -1}}
])

// Find specific event types
db.chat_messages.find({"metadata.event": "start"})
db.chat_messages.find({"metadata.event": "end"})
db.chat_messages.find({"metadata.event": "nextAgentFlow"})
```

### 7. Content Analysis
```javascript
// Find messages with specific content patterns
db.chat_messages.find({
  role: "assistant",
  content: {$regex: "water resource", $options: "i"}
}, {
  content: 1,
  metadata: 1,
  created_at: 1
})

// Messages with agent flow execution data
db.chat_messages.find({
  "metadata.event": "agentFlowExecutedData"
}, {
  session_id: 1,
  "metadata.data.nodeId": 1,
  "metadata.data.nodeLabel": 1,
  "metadata.data.status": 1
}).pretty()
```

### 8. Error Analysis
```javascript
// Find messages with failed statuses
db.chat_messages.find({
  "metadata.data.status": "FAILED"
})

// Find messages with error events
db.chat_messages.find({
  "metadata.event": {$regex: "error", $options: "i"}
})
```

### 9. Token and Usage Analysis
```javascript
// Find usage metadata for cost analysis
db.chat_messages.find({
  "metadata.event": "usageMetadata"
}, {
  session_id: 1,
  created_at: 1,
  "metadata.data.input_tokens": 1,
  "metadata.data.output_tokens": 1,
  "metadata.data.total_tokens": 1
})

// Calculate total token usage
db.chat_messages.aggregate([
  {$unwind: "$metadata"},
  {$match: {"metadata.event": "usageMetadata"}},
  {$group: {
    _id: null,
    totalInputTokens: {$sum: "$metadata.data.input_tokens"},
    totalOutputTokens: {$sum: "$metadata.data.output_tokens"},
    totalTokens: {$sum: "$metadata.data.total_tokens"}
  }}
])
```

### 10. Recent Activity
```javascript
// Get recent messages with metadata
db.chat_messages.find({
  metadata: {$exists: true}
}).sort({created_at: -1}).limit(5)

// Recent agent flow executions
db.chat_messages.find({
  "metadata.event": "agentFlowExecutedData"
}).sort({created_at: -1}).limit(3).pretty()
```

## Exit MongoDB Shell
```javascript
exit
```

## Alternative: External MongoDB Connection

If you prefer to use an external MongoDB client:

```bash
# Connection string for external tools (like MongoDB Compass)
mongodb://admin:password@localhost:27020/flowise_proxy_test?authSource=admin
```

## What the Metadata Contains

From your data, the metadata includes:
- **Agent Flow Data**: Complete execution trace of agent workflows
- **Timing Information**: Response times for each step
- **Usage Metrics**: Token consumption data
- **Session Information**: Chat session and message IDs
- **Node Execution**: Details about each agent node execution
- **Status Tracking**: Success/failure status of each step

This rich metadata enables powerful analytics for:
- Performance monitoring
- Cost tracking
- Debugging agent flows
- User behavior analysis
- System optimization
