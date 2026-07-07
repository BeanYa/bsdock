package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type InstallClaims struct {
	NodeID string `json:"node_id"`
	jwt.RegisteredClaims
}

func GenerateInstallToken(secret, nodeID string, expireHours int) (string, error) {
	idBytes := make([]byte, 8)
	if _, err := rand.Read(idBytes); err != nil {
		return "", err
	}

	// Agent tokens are invalidated by rotating the stored token hash, not by
	// wall-clock expiry. expireHours is kept for existing call sites.
	claims := InstallClaims{
		NodeID: nodeID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:       hex.EncodeToString(idBytes),
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseInstallToken(secret, tokenString string) (*InstallClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &InstallClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	}, jwt.WithoutClaimsValidation())
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*InstallClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid install token")
}
