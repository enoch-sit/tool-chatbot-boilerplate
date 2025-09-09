#!/usr/bin/env python3
"""
Deployment Status Checker
Quickly check the current deployment status of image rendering functionality.
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import json
import subprocess
import requests
from typing import Dict, Any, Optional

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.database import get_database
    from app.models.chat_message import ChatMessage
    from app.models.chat_session import ChatSession
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie
    import gridfs
    from PIL import Image
    database_available = True
except ImportError as e:
    print(f"⚠️  Warning: Could not import database modules: {e}")
    database_available = False

class DeploymentStatusChecker:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.results = {}
        
    def print_header(self, title: str):
        """Print a formatted header"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
        
    def print_status(self, item: str, status: str, details: str = ""):
        """Print a status line with consistent formatting"""
        status_icon = "✅" if status == "OK" else "❌" if status == "ERROR" else "⚠️"
        print(f"{status_icon} {item:<30} {status}")
        if details:
            print(f"   └─ {details}")
            
    def check_dependencies(self) -> Dict[str, Any]:
        """Check Python dependencies"""
        self.print_header("Checking Dependencies")
        
        dependencies = {
            'PIL': 'Pillow',
            'motor': 'motor',
            'beanie': 'beanie',
            'gridfs': 'pymongo',
            'fastapi': 'fastapi',
            'uvicorn': 'uvicorn'
        }
        
        results = {}
        
        for module, package in dependencies.items():
            try:
                __import__(module)
                results[module] = {"status": "OK", "version": self.get_package_version(package)}
                self.print_status(f"{module} ({package})", "OK", f"Version: {results[module]['version']}")
            except ImportError:
                results[module] = {"status": "ERROR", "error": f"Module {module} not found"}
                self.print_status(f"{module} ({package})", "ERROR", f"Not installed")
                
        return results
        
    def get_package_version(self, package: str) -> str:
        """Get version of installed package"""
        try:
            result = subprocess.run(['pip', 'show', package], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.startswith('Version:'):
                        return line.split(':', 1)[1].strip()
            return "unknown"
        except Exception:
            return "unknown"
            
    def check_file_structure(self) -> Dict[str, Any]:
        """Check if required files exist"""
        self.print_header("Checking File Structure")
        
        required_files = {
            'main.py': 'app/main.py',
            'chat.py': 'app/api/chat.py',
            'database.py': 'app/database.py',
            'migration': 'migrations/add_image_rendering_support.py',
            'deployment': 'deploy_image_rendering.py',
            'test_script': 'test_image_rendering.py'
        }
        
        results = {}
        
        for name, file_path in required_files.items():
            if os.path.exists(file_path):
                results[name] = {"status": "OK", "path": file_path}
                self.print_status(name, "OK", file_path)
            else:
                results[name] = {"status": "ERROR", "path": file_path}
                self.print_status(name, "ERROR", f"Missing: {file_path}")
                
        return results
        
    async def check_database_schema(self) -> Dict[str, Any]:
        """Check database schema and indexes"""
        self.print_header("Checking Database Schema")
        
        if not database_available:
            self.print_status("Database Connection", "ERROR", "Database modules not available")
            return {"status": "ERROR", "error": "Database modules not available"}
            
        try:
            # Get database connection
            db = await get_database()
            
            # Check collections
            collections = await db.list_collection_names()
            required_collections = ['chat_sessions', 'chat_messages', 'fs.files', 'fs.chunks']
            
            results = {"collections": {}, "indexes": {}}
            
            for collection in required_collections:
                if collection in collections:
                    results["collections"][collection] = {"status": "OK"}
                    self.print_status(f"Collection: {collection}", "OK")
                else:
                    results["collections"][collection] = {"status": "ERROR"}
                    self.print_status(f"Collection: {collection}", "ERROR", "Missing")
                    
            # Check indexes
            if 'chat_sessions' in collections:
                indexes = await db.chat_sessions.list_indexes().to_list(None)
                index_names = [idx['name'] for idx in indexes]
                
                required_indexes = ['session_id_1', 'user_id_1', 'created_at_1', 'has_files_1']
                
                for index in required_indexes:
                    if index in index_names:
                        results["indexes"][index] = {"status": "OK"}
                        self.print_status(f"Index: {index}", "OK")
                    else:
                        results["indexes"][index] = {"status": "MISSING"}
                        self.print_status(f"Index: {index}", "WARNING", "Missing (may affect performance)")
                        
            return results
            
        except Exception as e:
            self.print_status("Database Connection", "ERROR", str(e))
            return {"status": "ERROR", "error": str(e)}
            
    def check_api_endpoints(self) -> Dict[str, Any]:
        """Check API endpoints"""
        self.print_header("Checking API Endpoints")
        
        endpoints = {
            'health': '/health',
            'chat_history': '/api/v1/chat/sessions/test-session/history',
            'file_serve': '/api/v1/chat/files/test-file-id',
            'thumbnail': '/api/v1/chat/files/test-file-id/thumbnail'
        }
        
        results = {}
        
        for name, endpoint in endpoints.items():
            url = f"{self.base_url}{endpoint}"
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    results[name] = {"status": "OK", "code": response.status_code}
                    self.print_status(f"Endpoint: {name}", "OK", f"Status: {response.status_code}")
                elif response.status_code == 404 and name != 'health':
                    # 404 is expected for test endpoints
                    results[name] = {"status": "OK", "code": response.status_code}
                    self.print_status(f"Endpoint: {name}", "OK", f"Status: {response.status_code} (expected)")
                else:
                    results[name] = {"status": "WARNING", "code": response.status_code}
                    self.print_status(f"Endpoint: {name}", "WARNING", f"Status: {response.status_code}")
                    
            except requests.exceptions.ConnectionError:
                results[name] = {"status": "ERROR", "error": "Connection refused"}
                self.print_status(f"Endpoint: {name}", "ERROR", "Server not running")
            except Exception as e:
                results[name] = {"status": "ERROR", "error": str(e)}
                self.print_status(f"Endpoint: {name}", "ERROR", str(e))
                
        return results
        
    def check_image_processing(self) -> Dict[str, Any]:
        """Check image processing capabilities"""
        self.print_header("Checking Image Processing")
        
        results = {}
        
        # Check PIL formats
        try:
            from PIL import Image
            supported_formats = Image.registered_extensions()
            results["supported_formats"] = len(supported_formats)
            self.print_status("PIL Image Support", "OK", f"{len(supported_formats)} formats supported")
            
            # Test basic image operations
            test_image = Image.new('RGB', (100, 100), color='red')
            test_image.thumbnail((50, 50), Image.Resampling.LANCZOS)
            results["thumbnail_generation"] = {"status": "OK"}
            self.print_status("Thumbnail Generation", "OK", "Basic operations working")
            
        except Exception as e:
            results["image_processing"] = {"status": "ERROR", "error": str(e)}
            self.print_status("Image Processing", "ERROR", str(e))
            
        return results
        
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive status report"""
        self.print_header("Deployment Status Summary")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "checks": {}
        }
        
        # Count results
        total_checks = 0
        passed_checks = 0
        
        for category, results in self.results.items():
            if isinstance(results, dict):
                if "status" in results:
                    total_checks += 1
                    if results["status"] == "OK":
                        passed_checks += 1
                else:
                    for item, result in results.items():
                        if isinstance(result, dict) and "status" in result:
                            total_checks += 1
                            if result["status"] == "OK":
                                passed_checks += 1
                                
        report["summary"] = {
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "success_rate": (passed_checks / total_checks * 100) if total_checks > 0 else 0
        }
        
        # Overall status
        if passed_checks == total_checks:
            status = "✅ READY"
            message = "All checks passed. Image rendering is ready for use!"
        elif passed_checks > total_checks * 0.7:
            status = "⚠️  PARTIAL"
            message = "Most checks passed. Some issues may affect functionality."
        else:
            status = "❌ FAILED"
            message = "Multiple issues detected. Migration may be needed."
            
        print(f"\n{'='*60}")
        print(f"  DEPLOYMENT STATUS: {status}")
        print(f"  {message}")
        print(f"  Success Rate: {report['summary']['success_rate']:.1f}% ({passed_checks}/{total_checks})")
        print(f"{'='*60}")
        
        return report
        
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all deployment checks"""
        print(f"🔍 Checking Image Rendering Deployment Status")
        print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Base URL: {self.base_url}")
        
        # Run all checks
        self.results["dependencies"] = self.check_dependencies()
        self.results["file_structure"] = self.check_file_structure()
        self.results["database_schema"] = await self.check_database_schema()
        self.results["api_endpoints"] = self.check_api_endpoints()
        self.results["image_processing"] = self.check_image_processing()
        
        # Generate report
        report = self.generate_report()
        report["checks"] = self.results
        
        return report

async def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Check deployment status of image rendering functionality')
    parser.add_argument('--base-url', default='http://localhost:8000', 
                       help='Base URL of the API server')
    parser.add_argument('--output', help='Output file for JSON report')
    parser.add_argument('--quiet', action='store_true', help='Reduce output verbosity')
    
    args = parser.parse_args()
    
    # Create checker
    checker = DeploymentStatusChecker(args.base_url)
    
    # Run checks
    report = await checker.run_all_checks()
    
    # Save report if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved to: {args.output}")
        
    # Exit with appropriate code
    success_rate = report["summary"]["success_rate"]
    if success_rate == 100:
        sys.exit(0)
    elif success_rate > 70:
        sys.exit(1)
    else:
        sys.exit(2)

if __name__ == "__main__":
    asyncio.run(main())
