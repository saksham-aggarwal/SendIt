package handlers

import (
	"time"

	"github.com/matthewputra/SendIt/servers/gateway/models/users"
)

// SessionState stores the start time and the user information
// for a given session
type SessionState struct {
	StartTime time.Time   `json:"start_time"`
	User      *users.User `json:"user"`
}
