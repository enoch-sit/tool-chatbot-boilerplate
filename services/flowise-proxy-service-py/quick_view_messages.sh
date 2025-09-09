#!/bin/bash
# Quick Chat Messages Viewer

echo "🔍 CHAT MESSAGES QUICK VIEW"
echo "============================"

# MongoDB connection details
MONGO_CONTAINER="mongodb-test"
MONGO_USER="admin"
MONGO_PASS="password"
MONGO_DB="flowise_proxy_test"

# Check if MongoDB container is running
if ! docker ps | grep -q "$MONGO_CONTAINER"; then
    echo "❌ MongoDB container '$MONGO_CONTAINER' is not running"
    echo "Start it with: docker start $MONGO_CONTAINER"
    exit 1
fi

echo "✅ MongoDB container is running"
echo ""

# Menu
echo "Select what you want to view:"
echo "1. Message count summary"
echo "2. Recent 5 messages"
echo "3. Sessions overview"
echo "4. Metadata events summary"
echo "5. Interactive MongoDB shell"
echo "6. Run Python viewer (comprehensive)"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "📊 MESSAGE COUNT SUMMARY"
        echo "========================"
        docker exec -it $MONGO_CONTAINER mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin $MONGO_DB --eval "
        print('Total messages:', db.chat_messages.countDocuments());
        print('Messages with metadata:', db.chat_messages.countDocuments({metadata: {\$exists: true}}));
        print('User messages:', db.chat_messages.countDocuments({role: 'user'}));
        print('Assistant messages:', db.chat_messages.countDocuments({role: 'assistant'}));
        "
        ;;
    2)
        echo "📝 RECENT 5 MESSAGES"
        echo "===================="
        docker exec -it $MONGO_CONTAINER mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin $MONGO_DB --eval "
        db.chat_messages.find({}, {content: 1, role: 1, created_at: 1, session_id: 1}).sort({created_at: -1}).limit(5).forEach(function(doc) {
            print('Time:', doc.created_at);
            print('Role:', doc.role);
            print('Content:', doc.content.substring(0, 100) + '...');
            print('Session:', doc.session_id);
            print('---');
        });
        "
        ;;
    3)
        echo "📊 SESSIONS OVERVIEW"
        echo "==================="
        docker exec -it $MONGO_CONTAINER mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin $MONGO_DB --eval "
        db.chat_messages.aggregate([
            {\$group: {
                _id: '\$session_id',
                message_count: {\$sum: 1},
                user_id: {\$first: '\$user_id'},
                chatflow_id: {\$first: '\$chatflow_id'},
                last_activity: {\$max: '\$created_at'}
            }},
            {\$sort: {last_activity: -1}},
            {\$limit: 10}
        ]).forEach(function(doc) {
            print('Session:', doc._id);
            print('Messages:', doc.message_count);
            print('User:', doc.user_id);
            print('Chatflow:', doc.chatflow_id);
            print('Last Activity:', doc.last_activity);
            print('---');
        });
        "
        ;;
    4)
        echo "🔍 METADATA EVENTS SUMMARY"
        echo "=========================="
        docker exec -it $MONGO_CONTAINER mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin $MONGO_DB --eval "
        db.chat_messages.aggregate([
            {\$unwind: '\$metadata'},
            {\$group: {
                _id: '\$metadata.event',
                count: {\$sum: 1}
            }},
            {\$sort: {count: -1}}
        ]).forEach(function(doc) {
            print('Event:', doc._id, 'Count:', doc.count);
        });
        "
        ;;
    5)
        echo "🔗 OPENING INTERACTIVE MONGODB SHELL"
        echo "===================================="
        echo "Useful commands:"
        echo "  db.chat_messages.countDocuments()"
        echo "  db.chat_messages.find().limit(5)"
        echo "  db.chat_messages.find({role: 'assistant'}).limit(3)"
        echo "  exit  (to exit shell)"
        echo ""
        docker exec -it $MONGO_CONTAINER mongosh --username $MONGO_USER --password $MONGO_PASS --authenticationDatabase admin $MONGO_DB
        ;;
    6)
        echo "🐍 RUNNING PYTHON VIEWER"
        echo "========================"
        echo "This will run the comprehensive Python viewer..."
        python3 view_chat_messages.py
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        ;;
esac

echo ""
echo "✅ Done! Run this script again to view more data."
