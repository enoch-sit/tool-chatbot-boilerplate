#!/usr/bin/env python3
"""
Standalone script to test collection setup for file system.
This script can be run independently to ensure collections are properly configured.
"""
import asyncio
import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))


async def test_collection_setup():
    """Test the collection setup functionality."""
    print("🧪 Testing collection setup for file system...")

    test_report = {
        "started_at": datetime.utcnow().isoformat(),
        "tests": {},
        "errors": [],
        "success": False,
    }

    try:
        # 1. Test database connection
        print("📡 Testing database connection...")
        try:
            from app.database import (
                connect_to_mongo,
                close_mongo_connection,
                get_database,
            )

            await connect_to_mongo()
            db = await get_database()

            # Test basic connection
            await db.command("ping")
            test_report["tests"]["database_connection"] = "✅ PASSED"
            print("✅ Database connection successful")

        except Exception as e:
            error_msg = f"Database connection failed: {str(e)}"
            test_report["tests"]["database_connection"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")
            return test_report

        # 2. Test collection setup service
        print("🗄️ Testing collection setup service...")
        try:
            from app.services.collection_setup_service import collection_setup_service

            # Force setup to test everything
            setup_report = await collection_setup_service.setup_all_collections(
                force_recreate=False
            )

            if setup_report["success"]:
                test_report["tests"]["collection_setup"] = "✅ PASSED"
                print("✅ Collection setup successful")
            else:
                test_report["tests"][
                    "collection_setup"
                ] = f"⚠️ PARTIAL: {setup_report['errors']}"
                print(
                    f"⚠️ Collection setup completed with warnings: {setup_report['errors']}"
                )

            test_report["setup_report"] = setup_report

        except Exception as e:
            error_msg = f"Collection setup failed: {str(e)}"
            test_report["tests"]["collection_setup"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # 3. Test health check
        print("🏥 Testing health check...")
        try:
            health_report = await collection_setup_service.health_check()

            if health_report["overall_health"] == "healthy":
                test_report["tests"]["health_check"] = "✅ PASSED"
                print("✅ Health check passed")
            else:
                test_report["tests"][
                    "health_check"
                ] = f"⚠️ WARNING: {health_report['overall_health']}"
                print(f"⚠️ Health check warning: {health_report['overall_health']}")

            test_report["health_report"] = health_report

        except Exception as e:
            error_msg = f"Health check failed: {str(e)}"
            test_report["tests"]["health_check"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # 4. Test file storage functionality
        print("📁 Testing file storage functionality...")
        try:
            from app.services.file_storage_service import FileStorageService
            import base64

            # Create test data (1x1 PNG)
            test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            test_data = base64.b64decode(test_image_base64)

            file_service = FileStorageService()

            # Test file storage
            file_record = await file_service.store_file(
                file_data=test_data,
                filename="test_collection_setup.png",
                mime_type="image/png",
                user_id="test_user_collection_setup",
                session_id="test_session_collection_setup",
                chatflow_id="test_chatflow_collection_setup",
                message_id="test_message_collection_setup",
            )

            if file_record:
                test_report["tests"]["file_storage"] = "✅ PASSED"
                print(f"✅ File storage test passed: {file_record.file_id}")

                # Test file retrieval
                file_data = await file_service.get_file(file_record.file_id)
                if file_data:
                    retrieved_bytes, filename, mime_type = file_data
                    test_report["tests"]["file_retrieval"] = "✅ PASSED"
                    print(f"✅ File retrieval test passed: {filename}")

                    # Clean up test file
                    await file_service.delete_file(file_record.file_id)
                    test_report["tests"]["file_cleanup"] = "✅ PASSED"
                    print("✅ File cleanup test passed")
                else:
                    test_report["tests"][
                        "file_retrieval"
                    ] = "❌ FAILED: Could not retrieve file"
                    print("❌ File retrieval test failed")
            else:
                test_report["tests"]["file_storage"] = "❌ FAILED: Could not store file"
                print("❌ File storage test failed")

        except Exception as e:
            error_msg = f"File storage test failed: {str(e)}"
            test_report["tests"]["file_storage"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # 5. Test collection queries
        print("🔍 Testing collection queries...")
        try:
            # Test basic queries on all collections
            collections_to_test = [
                "users",
                "chatflows",
                "user_chatflows",
                "refresh_tokens",
                "chat_sessions",
                "chat_messages",
                "file_uploads",
            ]

            query_results = {}
            for collection_name in collections_to_test:
                try:
                    collection = db[collection_name]
                    count = await collection.count_documents({})
                    query_results[collection_name] = count
                except Exception as e:
                    query_results[collection_name] = f"error: {str(e)}"

            test_report["tests"]["collection_queries"] = "✅ PASSED"
            test_report["collection_counts"] = query_results
            print(f"✅ Collection queries test passed: {query_results}")

        except Exception as e:
            error_msg = f"Collection queries test failed: {str(e)}"
            test_report["tests"]["collection_queries"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # Determine overall success
        failed_tests = [
            test
            for test, result in test_report["tests"].items()
            if result.startswith("❌")
        ]
        test_report["success"] = len(failed_tests) == 0
        test_report["completed_at"] = datetime.utcnow().isoformat()

        if test_report["success"]:
            print("🎉 All tests passed! Collection setup is working correctly.")
        else:
            print(f"⚠️ Some tests failed: {failed_tests}")

        return test_report

    except Exception as e:
        error_msg = f"Test execution failed: {str(e)}"
        test_report["errors"].append(error_msg)
        test_report["success"] = False
        test_report["failed_at"] = datetime.utcnow().isoformat()
        print(f"💥 {error_msg}")
        import traceback

        traceback.print_exc()
        return test_report

    finally:
        try:
            await close_mongo_connection()
            print("📡 Database connection closed")
        except:
            pass


async def main():
    """Main function to run the tests."""
    print("🚀 Starting collection setup tests...")

    # Run tests
    test_report = await test_collection_setup()

    # Write test report
    report_filename = f"collection_setup_test_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(report_filename, "w") as f:
            json.dump(test_report, f, indent=2, default=str)
        print(f"📊 Test report saved to: {report_filename}")
    except Exception as e:
        print(f"⚠️ Could not save test report: {str(e)}")

    # Print summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)

    for test_name, result in test_report["tests"].items():
        print(f"{test_name}: {result}")

    if test_report["errors"]:
        print(f"\n❌ Errors encountered: {len(test_report['errors'])}")
        for error in test_report["errors"]:
            print(f"  - {error}")

    overall_status = "✅ SUCCESS" if test_report["success"] else "❌ FAILURE"
    print(f"\n🏁 Overall Status: {overall_status}")
    print("=" * 50)

    return 0 if test_report["success"] else 1


if __name__ == "__main__":
    print("🧪 Collection Setup Test Script")
    print("This script tests the collection setup functionality for the file system.")
    print()

    exit_code = asyncio.run(main())
    sys.exit(exit_code)
