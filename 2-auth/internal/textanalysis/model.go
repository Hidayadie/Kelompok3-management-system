package textanalysis

import "time"

type TextRecord struct {
	ID          string    `json:"id"`
	Source      string    `json:"source"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Quantity    int64     `json:"quantity"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type AnalysisRequest struct {
	Source   string       `json:"source"`
	Clusters int          `json:"clusters"`
	Records  []TextRecord `json:"records"`
}

type ClusterItem struct {
	ID          string    `json:"id"`
	Source      string    `json:"source"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Quantity    int64     `json:"quantity"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type ClusterGroup struct {
	ClusterID         int           `json:"cluster_id"`
	Name              string        `json:"name"`
	Keywords          []string      `json:"keywords"`
	ReportCount       int           `json:"report_count"`
	TotalDamagedUnits int64         `json:"total_damaged_units"`
	Items             []ClusterItem `json:"items"`
}

type AnalysisResponse struct {
	Source            string         `json:"source"`
	TotalReports      int            `json:"total_reports"`
	ClustersRequested int            `json:"clusters_requested"`
	Groups            []ClusterGroup `json:"groups"`
}
