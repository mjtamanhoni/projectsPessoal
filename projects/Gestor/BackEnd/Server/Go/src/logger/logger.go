package logger

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type LogEntry struct {
	Hora          string              `json:"hora"`
	Metodo        string              `json:"metodo"`
	Rota          string              `json:"rota"`
	Status        int                 `json:"status"`
	Mensagem      string              `json:"mensagem"`
	EmpresaID     int                 `json:"empresa_id"`
	UsuarioID     int                 `json:"usuario_id"`
	DuracaoMs     int64               `json:"duracao_ms"`
	IP            string              `json:"ip,omitempty"`
	JsonRecebido  string              `json:"jsonRecebido,omitempty"`
	JsonRetornado string              `json:"jsonRetornado,omitempty"`
	Scripts       []map[string]string `json:"scripts,omitempty"`
}

type LogStore struct {
	mu       sync.Mutex
	logsDir  string
}

func New(logsDir string) *LogStore {
	return &LogStore{logsDir: logsDir}
}

func monthFileName(t time.Time) string {
	return fmt.Sprintf("%s.json", t.Format("200601"))
}

func (s *LogStore) filePath(t time.Time) string {
	return filepath.Join(s.logsDir, monthFileName(t))
}

func (s *LogStore) empresaFilePath(t time.Time, empresaID int) string {
	return filepath.Join(s.logsDir, fmt.Sprintf("%d_%s", empresaID, monthFileName(t)))
}

func (s *LogStore) Log(entry LogEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	dateKey := now.Format("2006-01-02")
	path := s.filePath(now)
	empresaPath := s.empresaFilePath(now, entry.EmpresaID)

	if err := os.MkdirAll(s.logsDir, 0755); err != nil {
		return
	}

	data := make(map[string][]LogEntry)
	if b, err := os.ReadFile(empresaPath); err == nil && len(b) > 0 {
		json.Unmarshal(b, &data)
	}
	data[dateKey] = append([]LogEntry{entry}, data[dateKey]...)
	b, _ := json.MarshalIndent(data, "", "  ")
	os.WriteFile(empresaPath, b, 0644)

	// Also write to consolidated file
	consolidated := make(map[string][]LogEntry)
	if b, err := os.ReadFile(path); err == nil && len(b) > 0 {
		json.Unmarshal(b, &consolidated)
	}
	consolidated[dateKey] = append([]LogEntry{entry}, consolidated[dateKey]...)
	b, _ = json.MarshalIndent(consolidated, "", "  ")
	os.WriteFile(path, b, 0644)
}

func (s *LogStore) ReadLog(anoMes, empresaID string) (map[string][]LogEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var path string
	if empresaID != "" {
		path = filepath.Join(s.logsDir, empresaID+"_"+anoMes+".json")
	} else {
		path = filepath.Join(s.logsDir, anoMes+".json")
	}

	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var data map[string][]LogEntry
	if err := json.Unmarshal(b, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (s *LogStore) ListMonths() ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(s.logsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var months []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			months = append(months, strings.TrimSuffix(e.Name(), ".json"))
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(months)))
	return months, nil
}

func (s *LogStore) CleanOldLogs() {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().AddDate(-1, 0, 0)
	cutoffStr := cutoff.Format("200601")

	entries, err := os.ReadDir(s.logsDir)
	if err != nil {
		return
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".json")
		if name < cutoffStr {
			os.Remove(filepath.Join(s.logsDir, e.Name()))
		}
	}
}
