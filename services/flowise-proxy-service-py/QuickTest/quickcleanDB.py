import pymongo
import os

# Configuration for the test MongoDB instance
# This is based on information from other scripts like quickUserAccessListAndChat.py
MONGO_HOST = "localhost"
MONGO_PORT = "27020"
MONGO_USER = "testuser"
MONGO_PASS = "testpass"
DATABASE_NAME = "flowise_proxy_test"
MONGO_URI = f"mongodb://{MONGO_USER}:{MONGO_PASS}@{MONGO_HOST}:{MONGO_PORT}/{DATABASE_NAME}"


# Collections to be dropped.
# Add or remove collection names as needed based on your application's models.
COLLECTIONS_TO_DROP = [
    "users",
    "chatflows",
    "user_chatflows", # Assuming this is the collection for UserChatflow model
    "refresh_tokens"  # Assuming this is the collection for RefreshToken model
    # Add other collections if necessary, e.g., "api_keys" if you have an ApiKey model
]

def clean_database(mongo_uri, db_name, collections_to_drop):
    """
    Connects to the MongoDB instance and drops specified collections from the database.
    """
    print(f"Attempting to connect to MongoDB: {mongo_uri.replace(MONGO_PASS, '****')}") # Mask password in log
    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        # Ping the database to verify connection and authentication.
        db.command('ping')
        print(f"Successfully connected to MongoDB server and authenticated to database '{db_name}'.")
    except pymongo.errors.OperationFailure as e:
        print(f"❌ Authentication failed or operation denied: {e}")
        print("Please check your credentials and ensure the user has permissions for the database.")
        if "AuthenticationFailed" in str(e):
            print(f"Hint: Ensure the database '{db_name}' is part of your MONGO_URI for authentication.")
        return
    except pymongo.errors.ServerSelectionTimeoutError as err:
        print(f"❌ Failed to connect to MongoDB server: {err}")
        print("Please ensure your test MongoDB container (e.g., 'auth-mongodb' or the one specified in docker-compose.test.yml) is running and accessible.")
        return
    except Exception as e:
        print(f"❌ An unexpected error occurred during MongoDB connection: {e}")
        return

    # db = client[db_name] # db is already defined above
    print(f"Targeting database: '{db_name}'")

    existing_collections = db.list_collection_names()
    print(f"Existing collections in '{db_name}': {existing_collections}")

    collections_actually_dropped = []
    collections_not_found = []

    if not collections_to_drop:
        print("No collections specified to drop.")
        client.close()
        return

    print("\n--- Collections to be dropped ---")
    for collection_name in collections_to_drop:
        print(f"- {collection_name}")

    # Confirmation step
    confirm = input("\n⚠️ Are you sure you want to drop these collections from the TEST database? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Aborted by user. No collections were dropped.")
        client.close()
        return

    print("\n--- Dropping collections ---")
    for collection_name in collections_to_drop:
        if collection_name in existing_collections:
            try:
                db[collection_name].drop()
                print(f"✅ Collection '{collection_name}' dropped successfully.")
                collections_actually_dropped.append(collection_name)
            except Exception as e:
                print(f"❌ Error dropping collection '{collection_name}': {e}")
        else:
            print(f"ℹ️ Collection '{collection_name}' not found, skipping.")
            collections_not_found.append(collection_name)

    print("\n--- Summary ---")
    if collections_actually_dropped:
        print(f"Collections dropped: {', '.join(collections_actually_dropped)}")
    if collections_not_found:
        print(f"Collections not found (and therefore not dropped): {', '.join(collections_not_found)}")
    if not collections_actually_dropped and not collections_not_found and collections_to_drop:
        print("No collections were dropped (either not found or none specified to drop).")
    elif not collections_to_drop:
         print("No collections were specified to be dropped.")


    client.close()
    print("MongoDB connection closed.")

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 MongoDB Test Database Cleanup Script 🚀")
    print("=" * 60)
    print(f"This script will attempt to drop specified collections from the '{DATABASE_NAME}' database.")
    
    clean_database(MONGO_URI, DATABASE_NAME, COLLECTIONS_TO_DROP)
    
    print("\n" + "=" * 60)
    print("✨ Cleanup process finished.")
    print("=" * 60)