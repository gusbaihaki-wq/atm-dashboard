"""
ATM Dashboard API Tests
Tests for:
- Report CRUD operations
- Delete individual report
- Clear all data
- ATM Activation CRUD
- Summary and transaction endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://atm-dashboard.preview.emergentagent.com').rstrip('/')


class TestHealthAndBasicEndpoints:
    """Basic health and root endpoint tests"""
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Root endpoint working: {data}")
    
    def test_reports_list(self):
        """Test get all reports endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        assert "reports" in data
        print(f"✅ Reports list endpoint working, found {len(data['reports'])} reports")


class TestReportSummary:
    """Test report summary endpoints"""
    
    def test_get_summary_default(self):
        """Test get summary without report_id (uses initial data or latest)"""
        response = requests.get(f"{BASE_URL}/api/report/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Validate summary structure
        assert "total_terminals" in data
        assert "total_transaksi_sukses" in data
        assert "total_gagal_sistem_bank" in data
        assert "total_gagal_nasabah" in data
        assert "total_biaya_gross" in data
        assert "total_repay_nominal" in data
        assert "top_terminals" in data
        assert "bottom_terminals" in data
        
        print(f"✅ Summary endpoint working: {data['total_terminals']} terminals, {data['total_transaksi_sukses']} sukses")


class TestTransactionEndpoints:
    """Test transaction detail endpoints"""
    
    def test_get_transactions_detail(self):
        """Test get transaction details with pagination"""
        response = requests.get(f"{BASE_URL}/api/report/transactions-detail?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        if data["data"]:
            # Validate transaction structure
            tx = data["data"][0]
            assert "terminal_id" in tx
            assert "terminal_location" in tx
            assert "status" in tx
            assert "bank" in tx
        
        print(f"✅ Transaction detail endpoint working: {data['total']} total transactions")
    
    def test_get_terminal_summary(self):
        """Test terminal summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/report/terminal-summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        
        if data["data"]:
            terminal = data["data"][0]
            assert "terminal_id" in terminal
            assert "total_transaksi" in terminal
            assert "sukses" in terminal
            assert "success_rate" in terminal
        
        print(f"✅ Terminal summary endpoint working: {data['total']} terminals")


class TestDeleteReportEndpoint:
    """Test DELETE /api/report/{report_id} endpoint"""
    
    def test_delete_nonexistent_report_returns_404(self):
        """Test that deleting a non-existent report returns 404"""
        fake_report_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/report/{fake_report_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print(f"✅ DELETE non-existent report returns 404: {data['detail']}")


class TestClearAllEndpoint:
    """Test DELETE /api/reports/clear-all endpoint"""
    
    def test_clear_all_returns_success(self):
        """Test that clear-all endpoint works and returns success"""
        response = requests.delete(f"{BASE_URL}/api/reports/clear-all")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "deleted_reports" in data
        assert "deleted_transactions" in data
        
        print(f"✅ Clear all endpoint working: deleted {data['deleted_reports']} reports, {data['deleted_transactions']} transactions")
    
    def test_verify_data_cleared(self):
        """Verify that data was actually cleared"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        
        # After clear-all, reports should be empty
        assert len(data["reports"]) == 0
        print(f"✅ Verified: reports list is empty after clear-all")


class TestATMActivationCRUD:
    """Test ATM Activation CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_activation_id = None
    
    def test_get_activations_list(self):
        """Test get ATM activations list"""
        response = requests.get(f"{BASE_URL}/api/atm-activation")
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        print(f"✅ ATM Activation list endpoint working: {data['total']} records")
    
    def test_create_activation(self):
        """Test create ATM activation"""
        payload = {
            "terminal_id_baru": "T0900001",
            "lokasi": "TEST LOCATION",
            "tanggal_aktivasi": "2025-01-01",
            "terminal_id_sebelumnya": "",
            "lokasi_sebelumnya": "",
            "tanggal_terminated": "",
            "mitra_penyedia": "TEST MITRA",
            "mitra_rpl": "",
            "mitra_slm": "",
            "mitra_jarkom": "",
            "mitra_cctv": "",
            "mitra_ups": "",
            "mitra_premises": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/atm-activation", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["terminal_id_baru"] == "T0900001"
        assert data["data"]["lokasi"] == "TEST LOCATION"
        assert data["data"]["bank"] == "BNI"  # T09 prefix = BNI
        
        # Store ID for later tests
        self.__class__.test_activation_id = data["data"]["id"]
        
        print(f"✅ Create ATM activation working: ID={data['data']['id']}")
        return data["data"]["id"]
    
    def test_update_activation(self):
        """Test update ATM activation"""
        # First create one
        create_payload = {
            "terminal_id_baru": "T0800002",
            "lokasi": "UPDATE TEST LOCATION",
            "tanggal_aktivasi": "2025-01-02"
        }
        create_response = requests.post(f"{BASE_URL}/api/atm-activation", json=create_payload)
        assert create_response.status_code == 200
        activation_id = create_response.json()["data"]["id"]
        
        # Now update
        update_payload = {
            "lokasi": "UPDATED LOCATION",
            "mitra_penyedia": "UPDATED MITRA"
        }
        
        response = requests.put(f"{BASE_URL}/api/atm-activation/{activation_id}", json=update_payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["data"]["lokasi"] == "UPDATED LOCATION"
        assert data["data"]["mitra_penyedia"] == "UPDATED MITRA"
        
        print(f"✅ Update ATM activation working")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/atm-activation/{activation_id}")
    
    def test_delete_activation(self):
        """Test delete ATM activation"""
        # First create one
        create_payload = {
            "terminal_id_baru": "T0200003",
            "lokasi": "DELETE TEST LOCATION",
            "tanggal_aktivasi": "2025-01-03"
        }
        create_response = requests.post(f"{BASE_URL}/api/atm-activation", json=create_payload)
        assert create_response.status_code == 200
        activation_id = create_response.json()["data"]["id"]
        
        # Now delete
        response = requests.delete(f"{BASE_URL}/api/atm-activation/{activation_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/atm-activation")
        activations = get_response.json()["data"]
        activation_ids = [a["id"] for a in activations]
        assert activation_id not in activation_ids
        
        print(f"✅ Delete ATM activation working")
    
    def test_delete_nonexistent_activation_returns_404(self):
        """Test that deleting non-existent activation returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/atm-activation/{fake_id}")
        
        assert response.status_code == 404
        print(f"✅ Delete non-existent activation returns 404")


class TestClearAllActivations:
    """Test clear all ATM activations endpoint"""
    
    def test_clear_all_activations(self):
        """Test clear all ATM activations"""
        response = requests.delete(f"{BASE_URL}/api/atm-activation/clear-all")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "deleted_count" in data
        
        print(f"✅ Clear all activations working: deleted {data['deleted_count']} records")


class TestSearchAndFilter:
    """Test search and filter functionality"""
    
    def test_transaction_detail_with_status_filter(self):
        """Test transaction detail with status filter"""
        response = requests.get(f"{BASE_URL}/api/report/transactions-detail?status_filter=Sukses&limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # All returned transactions should have status "Sukses"
        for tx in data["data"]:
            assert tx["status"] == "Sukses"
        
        print(f"✅ Status filter working: {len(data['data'])} Sukses transactions returned")
    
    def test_terminal_summary_with_search(self):
        """Test terminal summary with search"""
        response = requests.get(f"{BASE_URL}/api/report/terminal-summary?search=T08")
        assert response.status_code == 200
        data = response.json()
        
        # All returned terminals should contain T08 in terminal_id
        for terminal in data["data"]:
            assert "T08" in terminal["terminal_id"].upper() or "mandiri" in terminal["bank"].lower()
        
        print(f"✅ Search filter working: {len(data['data'])} terminals matching 'T08'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
