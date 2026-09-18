package logger

import (
	"bufio"
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
	mu      sync.Mutex
	logsDir string
}

func New(logsDir string) *LogStore {
	return &LogStore{logsDir: logsDir}
}

func (s *LogStore) dayFilePath(t time.Time, empresaID int) string {
	return filepath.Join(s.logsDir, fmt.Sprintf("%d_%s.log", empresaID, t.Format("20060102")))
}

func (s *LogStore) Log(entry LogEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.logsDir, 0755); err != nil {
		return
	}

	now := time.Now()
	path := s.dayFilePath(now, entry.EmpresaID)

	b, _ := json.Marshal(entry)
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.Write(b)
	f.WriteString("\n")
}

func (s *LogStore) readDayFile(path string) ([]LogEntry, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var entries []LogEntry
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var e LogEntry
		if json.Unmarshal(line, &e) == nil {
			entries = append(entries, e)
		}
	}
	return entries, nil
}

func (s *LogStore) ReadLog(anoMes, empresaID string) (map[string][]LogEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entries, err := os.ReadDir(s.logsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	data := make(map[string][]LogEntry)
	prefix := ""
	if empresaID != "" {
		prefix = empresaID + "_"
	} else {
		prefix = ""
	}

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".log") {
			continue
		}
		base := strings.TrimSuffix(name, ".log")
		if prefix != "" && !strings.HasPrefix(base, prefix) {
			continue
		}
		datePart := base
		if prefix != "" {
			datePart = base[len(prefix):]
		}
		if len(datePart) != 8 {
			continue
		}
		if !strings.HasPrefix(datePart, anoMes) {
			continue
		}

		path := filepath.Join(s.logsDir, name)
		dayEntries, err := s.readDayFile(path)
		if err != nil {
			continue
		}
		dateKey := datePart[:4] + "-" + datePart[4:6] + "-" + datePart[6:8]
		data[dateKey] = append(dayEntries, data[dateKey]...)
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

	monthSet := make(map[string]bool)
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".log") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".log")
		parts := strings.SplitN(name, "_", 2)
		datePart := parts[len(parts)-1]
		if len(datePart) >= 6 {
			monthSet[datePart[:6]] = true
		}
	}

	var months []string
	for m := range monthSet {
		months = append(months, m)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(months)))
	return months, nil
}

func (s *LogStore) CleanOldLogs() {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().AddDate(-1, 0, 0)
	cutoffStr := cutoff.Format("20060102")

	entries, err := os.ReadDir(s.logsDir)
	if err != nil {
		return
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".log") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".log")
		parts := strings.SplitN(name, "_", 2)
		datePart := parts[len(parts)-1]
		if len(datePart) == 8 && datePart < cutoffStr {
			os.Remove(filepath.Join(s.logsDir, e.Name()))
		}
	}
}
