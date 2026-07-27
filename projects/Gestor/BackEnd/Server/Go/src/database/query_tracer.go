package database

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ctxKey string

const ScriptsCtxKey ctxKey = "query_scripts"

type scriptEntry struct {
	Type string
	SQL  string
}

type queryTracer struct{}

func (t *queryTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	scripts, ok := ctx.Value(ScriptsCtxKey).(*[]scriptEntry)
	if ok && scripts != nil {
		sql := strings.TrimSpace(data.SQL)
		if sql != "" {
			upper := strings.ToUpper(sql)
			typ := "other"
			switch {
			case strings.HasPrefix(upper, "SELECT"):
				typ = "select"
			case strings.HasPrefix(upper, "INSERT"):
				typ = "insert"
			case strings.HasPrefix(upper, "UPDATE"):
				typ = "update"
			case strings.HasPrefix(upper, "DELETE"):
				typ = "delete"
			}
			*scripts = append(*scripts, scriptEntry{Type: typ, SQL: sql})
		}
	}
	return ctx
}

func (t *queryTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryEndData) {}

func GetScripts(ctx context.Context) []map[string]string {
	scripts, ok := ctx.Value(ScriptsCtxKey).(*[]scriptEntry)
	if !ok || scripts == nil {
		return nil
	}
	result := make([]map[string]string, len(*scripts))
	for i, s := range *scripts {
		result[i] = map[string]string{s.Type: s.SQL}
	}
	return result
}

func NewPoolWithTracer(dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	cfg.ConnConfig.Tracer = &queryTracer{}
	return pgxpool.NewWithConfig(context.Background(), cfg)
}

func InitScriptsContext(ctx context.Context) context.Context {
	scripts := &[]scriptEntry{}
	return context.WithValue(ctx, ScriptsCtxKey, scripts)
}
