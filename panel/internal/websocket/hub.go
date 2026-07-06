package websocket

import (
	"encoding/json"
	"sync/atomic"
)

type Hub struct {
	clients       map[string]map[chan []byte]bool
	register      chan subscription
	unregister    chan subscription
	broadcast     chan broadcastMsg
	sentBytes     atomic.Int64
	receivedBytes atomic.Int64
}

type subscription struct {
	nodeID string
	ch     chan []byte
}

type broadcastMsg struct {
	nodeID string
	data   []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[chan []byte]bool),
		register:   make(chan subscription),
		unregister: make(chan subscription),
		broadcast:  make(chan broadcastMsg),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case s := <-h.register:
			if h.clients[s.nodeID] == nil {
				h.clients[s.nodeID] = make(map[chan []byte]bool)
			}
			h.clients[s.nodeID][s.ch] = true
		case s := <-h.unregister:
			if _, ok := h.clients[s.nodeID]; ok {
				delete(h.clients[s.nodeID], s.ch)
				close(s.ch)
				if len(h.clients[s.nodeID]) == 0 {
					delete(h.clients, s.nodeID)
				}
			}
		case b := <-h.broadcast:
			h.sentBytes.Add(int64(len(b.data)))
			for ch := range h.clients[b.nodeID] {
				select {
				case ch <- b.data:
				default:
				}
			}
			for ch := range h.clients["*"] {
				select {
				case ch <- b.data:
				default:
				}
			}
		}
	}
}

// SentBytes returns the total number of bytes broadcast by the hub.
func (h *Hub) SentBytes() int64 {
	return h.sentBytes.Load()
}

// ReceivedBytes returns the total number of bytes received from clients.
func (h *Hub) ReceivedBytes() int64 {
	return h.receivedBytes.Load()
}

// AddReceivedBytes increments the received bytes counter.
func (h *Hub) AddReceivedBytes(n int64) {
	h.receivedBytes.Add(n)
}

func (h *Hub) Subscribe(nodeID string, ch chan []byte) {
	h.register <- subscription{nodeID: nodeID, ch: ch}
}

func (h *Hub) Unsubscribe(nodeID string, ch chan []byte) {
	h.unregister <- subscription{nodeID: nodeID, ch: ch}
}

func (h *Hub) Broadcast(nodeID string, v interface{}) {
	data, _ := json.Marshal(v)
	h.broadcast <- broadcastMsg{nodeID: nodeID, data: data}
}
