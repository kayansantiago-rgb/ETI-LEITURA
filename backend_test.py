#!/usr/bin/env python3
"""
Backend API Testing for ETI LEITURA Platform
Tests authentication, books, summaries, and stats endpoints
"""
import requests
import sys
from datetime import datetime
import uuid

class EtiLeituraAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_summary_id = None
        self.test_book_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"test_{timestamp}@leitura.viva",
            "password": "TestPass123!",
            "nome": "Test User",
            "turma": "3º Ano A"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data,
            auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token received, User ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login with same credentials"""
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"test_{timestamp}@leitura.viva",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data,
            auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_books(self):
        """Test get all books"""
        success, response = self.run_test(
            "Get All Books",
            "GET",
            "books",
            200
        )
        
        if success and response:
            print(f"   Found {len(response)} books")
            if len(response) > 0:
                self.test_book_id = response[0]['id']
                print(f"   First book ID: {self.test_book_id}")
        return success

    def test_get_single_book(self):
        """Test get single book details"""
        if not self.test_book_id:
            print("❌ No book ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Single Book",
            "GET",
            f"books/{self.test_book_id}",
            200
        )
        
        if success:
            print(f"   Book title: {response.get('titulo', 'N/A')}")
        return success

    def test_create_summary(self):
        """Test create summary for a book"""
        if not self.test_book_id:
            print("❌ No book ID available for creating summary")
            return False
            
        summary_data = {
            "book_id": self.test_book_id,
            "conteudo": "Este é um resumo de teste criado durante os testes automatizados. O livro apresenta uma narrativa interessante que explora temas profundos da literatura brasileira."
        }
        
        success, response = self.run_test(
            "Create Summary",
            "POST",
            "summaries",
            201,
            data=summary_data
        )
        
        if success and 'id' in response:
            self.created_summary_id = response['id']
            print(f"   Summary created with ID: {self.created_summary_id}")
        return success

    def test_get_my_summaries(self):
        """Test get user's summaries"""
        success, response = self.run_test(
            "Get My Summaries",
            "GET",
            "summaries",
            200
        )
        
        if success:
            print(f"   Found {len(response)} summaries")
        return success

    def test_get_single_summary(self):
        """Test get single summary"""
        if not self.created_summary_id:
            print("❌ No summary ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Single Summary",
            "GET",
            f"summaries/{self.created_summary_id}",
            200
        )
        return success

    def test_update_summary(self):
        """Test update summary"""
        if not self.created_summary_id:
            print("❌ No summary ID available for updating")
            return False
            
        update_data = {
            "conteudo": "Este é um resumo atualizado durante os testes automatizados. A obra demonstra maestria na construção de personagens e desenvolvimento de temas relevantes."
        }
        
        success, response = self.run_test(
            "Update Summary",
            "PUT",
            f"summaries/{self.created_summary_id}",
            200,
            data=update_data
        )
        return success

    def test_get_book_summary(self):
        """Test get book summary for current user"""
        if not self.test_book_id:
            print("❌ No book ID available for testing book summary")
            return False
            
        success, response = self.run_test(
            "Get Book Summary",
            "GET",
            f"books/{self.test_book_id}/summary",
            200
        )
        return success

    def test_get_stats(self):
        """Test get user statistics"""
        success, response = self.run_test(
            "Get Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   Total books: {response.get('total_books', 0)}")
            print(f"   My summaries: {response.get('my_summaries', 0)}")
        return success

    def test_delete_summary(self):
        """Test delete summary"""
        if not self.created_summary_id:
            print("❌ No summary ID available for deletion")
            return False
            
        success, response = self.run_test(
            "Delete Summary",
            "DELETE",
            f"summaries/{self.created_summary_id}",
            204
        )
        return success

    def test_invalid_auth(self):
        """Test invalid authentication"""
        # Save current token
        original_token = self.token
        
        # Set invalid token
        self.token = "invalid_token_123"
        
        success, response = self.run_test(
            "Invalid Auth Test",
            "GET",
            "auth/me",
            401
        )
        
        # Restore original token
        self.token = original_token
        return success

def main():
    print("🚀 Starting ETI LEITURA Backend API Tests")
    print("=" * 60)
    
    tester = EtiLeituraAPITester()
    
    # Test authentication flow
    if not tester.test_user_registration():
        print("❌ Registration failed, trying login with different credentials")
        # Try with different timestamp for login test
        if not tester.test_user_login():
            print("❌ Both registration and login failed, stopping tests")
            return 1

    # Test authenticated endpoints
    test_functions = [
        tester.test_get_current_user,
        tester.test_get_books,
        tester.test_get_single_book,
        tester.test_get_stats,
        tester.test_create_summary,
        tester.test_get_my_summaries,
        tester.test_get_single_summary,
        tester.test_get_book_summary,
        tester.test_update_summary,
        tester.test_delete_summary,
        tester.test_invalid_auth
    ]
    
    for test_func in test_functions:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_func.__name__} threw exception: {str(e)}")

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"🎯 Success rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend APIs working correctly!")
        return 0
    else:
        print("⚠️  Some backend APIs have issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())