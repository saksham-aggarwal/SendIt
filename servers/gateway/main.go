package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"github.com/go-redis/redis"
	_ "github.com/go-sql-driver/mysql"
	"github.com/matthewputra/SendIt/servers/gateway/models/users"
	"github.com/matthewputra/SendIt/servers/gateway/sessions"

	"github.com/matthewputra/SendIt/servers/gateway/handlers"
)

// Director helps in directoring the request to the appropriate
// microservice
type Director func(r *http.Request)

// SpecificDirector creates the Director function to be passed
// to the ReverseProxy
func SpecificDirector(context *handlers.HandlerContext, targetURLs []*url.URL) Director {
	var count int32
	count = 0

	return func(r *http.Request) {
		currSession := &handlers.SessionState{}
		_, err := sessions.GetState(r, context.SigningKey, context.SessionStore, currSession)

		if err == nil {
			encodedUser, _ := json.Marshal(currSession.User)
			fmt.Println(encodedUser)
			r.Header.Add("X-User", string(encodedUser))
		} else {
			log.Print(err)
		}

		targetURL := targetURLs[count%int32(len(targetURLs))]
		atomic.AddInt32(&count, 1)
		r.Header.Add("X-Forwarded-Host", r.Host)
		r.Host = targetURL.Host
		r.URL.Host = targetURL.Host
		r.URL.Scheme = targetURL.Scheme
	}
}

//main is the main entry point for the server
func main() {
	ADDR := os.Getenv("ADDR")
	if len(ADDR) == 0 {
		ADDR = ":443"
	}

	TLSCERT := os.Getenv("TLSCERT")
	TLSKEY := os.Getenv("TLSKEY")
	if len(TLSCERT) == 0 || len(TLSKEY) == 0 {
		os.Stdout.Write([]byte("No TLS environment variables found\n"))
		os.Exit(1)
	}

	SESSIONKEY := os.Getenv("SESSIONKEY")
	REDISADDR := os.Getenv("REDISADDR")
	DSN := os.Getenv("DSN")
	MICROSERVICEADDR := os.Getenv("MICROSERVICEADDR")

	microserviceAddrSlice := strings.Split(MICROSERVICEADDR, ",")
	var microserviceURLs []*url.URL

	for _, v := range microserviceAddrSlice {
		microserviceURLs = append(microserviceURLs, &url.URL{Scheme: "http", Host: v})
	}

	redisClient := redis.NewClient(&redis.Options{Addr: REDISADDR, Password: "", DB: 0})
	redisStore := sessions.NewRedisStore(redisClient, time.Hour)

	db, err := sql.Open("mysql", DSN)
	if err != nil {
		fmt.Println("cannot open db - " + err.Error())
		os.Exit(1)
	}
	defer db.Close()

	ctx := &handlers.HandlerContext{SigningKey: SESSIONKEY, SessionStore: redisStore, UserStore: users.NewMySQLStore(db)}

	microserviceProxy := &httputil.ReverseProxy{Director: SpecificDirector(ctx, microserviceURLs)}

	mux := http.NewServeMux()

	// Handlers for logging in and signing up new customers/drivers
	mux.HandleFunc("/v1/signup", ctx.UserSignUpHandler)
	mux.HandleFunc("/v1/login", ctx.UserLoginHandler)

	// Handlers for microservice re-direction
	mux.Handle("/v1/customer/", microserviceProxy)
	mux.Handle("/v1/driver/", microserviceProxy)
	mux.Handle("/v1/driver/accept/", microserviceProxy)
	mux.Handle("/v1/driver/complete/", microserviceProxy)
	mux.Handle("/v1/driver/complete", microserviceProxy)
	mux.Handle("/v1/driver/earnings", microserviceProxy)

	wrappedMux := handlers.NewCORS(mux)

	log.Printf("Server is listening at %s...", ADDR)
	log.Fatal(http.ListenAndServeTLS(ADDR, TLSCERT, TLSKEY, wrappedMux))
}
