package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientCORS(t *testing.T) {
	router := setupEngine(nil, []byte("test-secret"))
	for _, origin := range []string{"http://localhost:8081", "http://127.0.0.1:8081", "https://example.com"} {
		for _, method := range []string{http.MethodOptions, http.MethodGet} {
			request := httptest.NewRequest(method, "/health", nil)
			request.Header.Set("Origin", origin)
			request.Header.Set("Access-Control-Request-Method", "POST")
			request.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			want := origin
			if origin != "http://localhost:8081" {
				want = ""
			}
			if got := response.Header().Get("Access-Control-Allow-Origin"); got != want {
				t.Fatalf("%s %s: origin = %q, want %q", method, origin, got, want)
			}
			if want != "" && method == http.MethodOptions && response.Code != http.StatusNoContent {
				t.Fatalf("preflight status = %d", response.Code)
			}
			if want != "" && method == http.MethodOptions && response.Header().Get("Access-Control-Allow-Headers") != "Origin,Content-Type,Authorization" {
				t.Fatal("header autentikasi dan JSON harus diizinkan")
			}
		}
	}
}

func TestCookieLogoutWithoutOrigin(t *testing.T) {
	router := setupEngine(nil, []byte("test-secret"))
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: "test-token"})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("Logout tanpa Origin: status %d, ingin %d", w.Code, http.StatusOK)
	}
	cookies := w.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "access_token" || cookies[0].MaxAge != -1 {
		t.Fatal("Logout harus menghapus cookie")
	}
}
