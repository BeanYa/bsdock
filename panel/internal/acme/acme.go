package acme

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/go-acme/lego/v4/certcrypto"
	"github.com/go-acme/lego/v4/certificate"
	"github.com/go-acme/lego/v4/challenge/http01"
	"github.com/go-acme/lego/v4/lego"
	"github.com/go-acme/lego/v4/registration"
)

const letsEncryptDirectoryURL = "https://acme-v02.api.letsencrypt.org/directory"

type Request struct {
	Domain   string
	Email    string
	HTTPPort string
}

type Result struct {
	Domain   string `json:"domain"`
	CertPath string `json:"tls_cert_path"`
	KeyPath  string `json:"tls_key_path"`
}

type Issuer interface {
	Obtain(context.Context, Request) (*Result, error)
}

type Client struct {
	certDir      string
	httpPort     string
	directoryURL string
}

type Option func(*Client)

func WithCertDir(dir string) Option {
	return func(c *Client) {
		c.certDir = dir
	}
}

func WithHTTPPort(port string) Option {
	return func(c *Client) {
		c.httpPort = port
	}
}

func WithDirectoryURL(url string) Option {
	return func(c *Client) {
		c.directoryURL = url
	}
}

func NewClient(opts ...Option) *Client {
	c := &Client{
		certDir:      "cert",
		httpPort:     "80",
		directoryURL: letsEncryptDirectoryURL,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) Obtain(ctx context.Context, req Request) (*Result, error) {
	req.Domain = strings.TrimSpace(req.Domain)
	req.Email = strings.TrimSpace(req.Email)
	req.HTTPPort = strings.TrimSpace(req.HTTPPort)
	if req.HTTPPort == "" {
		req.HTTPPort = c.httpPort
	}
	if err := validateRequest(req); err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("generate account key: %w", err)
	}
	user := &accountUser{email: req.Email, key: privateKey}
	legoConfig := lego.NewConfig(user)
	legoConfig.CADirURL = c.directoryURL
	legoConfig.Certificate.KeyType = certcrypto.RSA2048

	client, err := lego.NewClient(legoConfig)
	if err != nil {
		return nil, fmt.Errorf("create acme client: %w", err)
	}
	provider := http01.NewProviderServer("", req.HTTPPort)
	if err := client.Challenge.SetHTTP01Provider(provider); err != nil {
		return nil, fmt.Errorf("set http-01 provider: %w", err)
	}

	reg, err := client.Registration.Register(registration.RegisterOptions{TermsOfServiceAgreed: true})
	if err != nil {
		return nil, fmt.Errorf("register acme account: %w", err)
	}
	user.registration = reg

	cert, err := client.Certificate.Obtain(certificate.ObtainRequest{
		Domains: []string{req.Domain},
		Bundle:  true,
	})
	if err != nil {
		return nil, fmt.Errorf("obtain certificate: %w", err)
	}
	certPath, keyPath, err := c.saveCertificate(req.Domain, cert.Certificate, cert.PrivateKey)
	if err != nil {
		return nil, err
	}
	return &Result{Domain: req.Domain, CertPath: certPath, KeyPath: keyPath}, nil
}

func validateRequest(req Request) error {
	if req.Domain == "" {
		return errors.New("domain required")
	}
	if !validDomain(req.Domain) {
		return errors.New("invalid domain")
	}
	if req.Email != "" && !strings.Contains(req.Email, "@") {
		return errors.New("invalid email")
	}
	return nil
}

func validDomain(domain string) bool {
	if len(domain) > 253 || !strings.Contains(domain, ".") || strings.Contains(domain, "*") {
		return false
	}
	labels := strings.Split(domain, ".")
	for _, label := range labels {
		if label == "" || len(label) > 63 || strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return false
		}
		for _, r := range label {
			if r > unicode.MaxASCII || !(unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-') {
				return false
			}
		}
	}
	return true
}

func (c *Client) saveCertificate(domain string, certPEM, keyPEM []byte) (string, string, error) {
	domainDir := filepath.Join(c.certDir, domain)
	if err := os.MkdirAll(domainDir, 0700); err != nil {
		return "", "", fmt.Errorf("create certificate directory: %w", err)
	}
	certPath := filepath.Join(domainDir, "fullchain.pem")
	keyPath := filepath.Join(domainDir, "privkey.pem")
	if err := os.WriteFile(certPath, certPEM, 0644); err != nil {
		return "", "", fmt.Errorf("write certificate: %w", err)
	}
	if err := os.WriteFile(keyPath, keyPEM, 0600); err != nil {
		return "", "", fmt.Errorf("write private key: %w", err)
	}
	return certPath, keyPath, nil
}

type accountUser struct {
	email        string
	registration *registration.Resource
	key          crypto.PrivateKey
}

func (u *accountUser) GetEmail() string {
	return u.email
}

func (u *accountUser) GetRegistration() *registration.Resource {
	return u.registration
}

func (u *accountUser) GetPrivateKey() crypto.PrivateKey {
	return u.key
}
