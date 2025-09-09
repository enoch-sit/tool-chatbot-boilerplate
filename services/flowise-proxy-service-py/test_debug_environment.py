#!/usr/bin/env python3
"""
Test collection setup for VS Code debugging environment.
This script uses the .env.test configuration to setup collections.
"""
import asyncio
import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent / "app"))


async def test_debug_environment_setup():
    """Test the collection setup for VS Code debugging environment."""
    print("🧪 Testing VS Code debug environment collection setup...")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"🔧 Python path: {sys.path[0]}")

    # Load environment from .env.test if not already loaded
    env_test_path = Path(__file__).parent / ".env.test"
    if env_test_path.exists():
        print(f"📄 Loading environment from: {env_test_path}")
        from dotenv import load_dotenv

        load_dotenv(env_test_path)
    else:
        print("⚠️ .env.test file not found, using system environment")

    # Print key environment variables
    print(f"🗄️ MONGODB_URL: {os.getenv('MONGODB_URL', 'NOT_SET')}")
    print(f"🗄️ MONGODB_DATABASE_NAME: {os.getenv('MONGODB_DATABASE_NAME', 'NOT_SET')}")
    print(f"🔧 DEBUG: {os.getenv('DEBUG', 'NOT_SET')}")
    print()

    test_report = {
        "started_at": datetime.utcnow().isoformat(),
        "environment": "vs_code_debug",
        "config_file": ".env.test",
        "tests": {},
        "errors": [],
        "success": False,
    }

    try:
        # 1. Test database connection with .env.test settings
        print("📡 Testing database connection with .env.test settings...")
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
            print(f"✅ Database connection successful to: {db.name}")

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

            # Don't force recreate in debug environment unless specifically requested
            force_recreate = (
                os.getenv("FORCE_COLLECTION_SETUP", "false").lower() == "true"
            )

            setup_report = await collection_setup_service.setup_all_collections(
                force_recreate=force_recreate
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

        # 3. Test debug-specific configurations
        print("🐛 Testing debug environment configurations...")
        try:
            debug_enabled = os.getenv("DEBUG", "false").lower() == "true"
            log_level = os.getenv("LOG_LEVEL", "INFO")

            debug_config = {
                "debug_enabled": debug_enabled,
                "log_level": log_level,
                "force_collection_setup": os.getenv("FORCE_COLLECTION_SETUP", "false"),
                "fail_on_setup_error": os.getenv(
                    "FAIL_ON_COLLECTION_SETUP_ERROR", "false"
                ),
            }

            test_report["debug_config"] = debug_config
            test_report["tests"]["debug_config"] = "✅ PASSED"
            print(f"✅ Debug configuration: {debug_config}")

        except Exception as e:
            error_msg = f"Debug config test failed: {str(e)}"
            test_report["tests"]["debug_config"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # 4. Test API endpoints that debugger will use
        print("🔗 Testing API readiness for debugging...")
        try:
            # Import main app to ensure it loads properly
            from app.main import app
            from app.services.collection_setup_service import collection_setup_service

            # Test that health check can run
            health_report = await collection_setup_service.health_check()

            api_readiness = {
                "app_import": "success",
                "health_check": health_report["overall_health"],
                "collections_ready": health_report["setup_completed"],
            }

            test_report["api_readiness"] = api_readiness
            test_report["tests"]["api_readiness"] = "✅ PASSED"
            print(f"✅ API readiness: {api_readiness}")

        except Exception as e:
            error_msg = f"API readiness test failed: {str(e)}"
            test_report["tests"]["api_readiness"] = f"❌ FAILED: {error_msg}"
            test_report["errors"].append(error_msg)
            print(f"❌ {error_msg}")

        # 5. Test file system functionality in debug environment
        print("📁 Testing file system functionality for debugging...")
        try:
            from app.services.file_storage_service import FileStorageService
            import base64

            # Create test data (1x1 PNG)
            test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            test_data = base64.b64decode(test_image_base64)

            file_service = FileStorageService()

            # Test file storage in debug environment
            file_record = await file_service.store_file(
                file_data=test_data,
                filename="debug_test.png",
                mime_type="image/png",
                user_id="debug_test_user",
                session_id="debug_test_session",
                chatflow_id="debug_test_chatflow",
                message_id="debug_test_message",
            )

            if file_record:
                # Test file retrieval
                file_data = await file_service.get_file(file_record.file_id)
                if file_data:
                    # Clean up test file
                    await file_service.delete_file(file_record.file_id)

                    test_report["tests"]["file_system"] = "✅ PASSED"
                    print("✅ File system test passed for debug environment")
                else:
                    test_report["tests"][
                        "file_system"
                    ] = "❌ FAILED: Could not retrieve file"
                    print("❌ File retrieval test failed")
            else:
                test_report["tests"]["file_system"] = "❌ FAILED: Could not store file"
                print("❌ File storage test failed")

        except Exception as e:
            error_msg = f"File system test failed: {str(e)}"
            test_report["tests"]["file_system"] = f"❌ FAILED: {error_msg}"
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

        print("\n" + "=" * 50)
        print("📋 VS CODE DEBUG ENVIRONMENT TEST SUMMARY")
        print("=" * 50)

        for test_name, result in test_report["tests"].items():
            print(f"{test_name}: {result}")

        if test_report["success"]:
            print("\n🎉 VS Code debug environment is ready!")
            print("🚀 You can now start debugging with your VS Code configuration.")
            print("\n💡 Debug URLs:")
            print("   • API: http://localhost:8000")
            print("   • Health: http://localhost:8000/health")
            print("   • Collections: http://localhost:8000/collections/status")
        else:
            print(f"\n⚠️ Some tests failed: {failed_tests}")
            print("Please fix the issues before starting debug session.")

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
    """Main function to run the debug environment tests."""
    print("🚀 Starting VS Code debug environment collection setup tests...")

    # Check if we have python-dotenv for loading .env.test
    try:
        import dotenv
    except ImportError:
        print("⚠️ python-dotenv not installed. Install with: pip install python-dotenv")
        print("Environment variables will be loaded from system environment only.")

    # Run tests
    test_report = await test_debug_environment_setup()

    # Write test report
    report_filename = f"debug_environment_test_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        with open(report_filename, "w") as f:
            json.dump(test_report, f, indent=2, default=str)
        print(f"\n📊 Test report saved to: {report_filename}")
    except Exception as e:
        print(f"⚠️ Could not save test report: {str(e)}")

    print("=" * 50)

    return 0 if test_report["success"] else 1


if __name__ == "__main__":
    print("🧪 VS Code Debug Environment Collection Setup Test")
    print("This script tests collection setup for VS Code debugging with .env.test")
    print()

    exit_code = asyncio.run(main())
    sys.exit(exit_code)
