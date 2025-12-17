package services

import (
	"github.com/sergi/go-diff/diffmatchpatch"
)

type DiffService struct{}

func NewDiffService() *DiffService {
	return &DiffService{}
}

// CompareTexts 比较两个文本的差异
func (d *DiffService) CompareTexts(text1, text2 string) DiffResult {
	dmp := diffmatchpatch.New()
	diffs := dmp.DiffMain(text1, text2, false)
	
	var additions, deletions int
	var diffHTML string
	
	for _, diff := range diffs {
		switch diff.Type {
		case diffmatchpatch.DiffInsert:
			additions += len(diff.Text)
			diffHTML += `<span class="diff-added">` + diff.Text + `</span>`
		case diffmatchpatch.DiffDelete:
			deletions += len(diff.Text)
			diffHTML += `<span class="diff-deleted">` + diff.Text + `</span>`
		case diffmatchpatch.DiffEqual:
			diffHTML += diff.Text
		}
	}
	
	total := len(text1) + len(text2)
	changeRate := 0.0
	if total > 0 {
		changeRate = float64(additions+deletions) / float64(total) * 100
	}
	
	return DiffResult{
		Additions:  additions,
		Deletions:  deletions,
		ChangeRate: changeRate,
		DiffHTML:   diffHTML,
	}
}

type DiffResult struct {
	Additions  int     `json:"additions"`
	Deletions  int     `json:"deletions"`
	ChangeRate float64 `json:"change_rate"`
	DiffHTML   string  `json:"diff_html"`
}