package services

import (
	"fmt"
	"strconv"
	"strings"
)

type VersionService struct{}

func NewVersionService() *VersionService {
	return &VersionService{}
}

// GenerateNextVersion 生成下一个版本号
func (v *VersionService) GenerateNextVersion(currentVersion string, changeType string) string {
	if currentVersion == "" {
		return "1.0.0"
	}

	parts := strings.Split(currentVersion, ".")
	if len(parts) != 3 {
		return "1.0.0"
	}

	major, _ := strconv.Atoi(parts[0])
	minor, _ := strconv.Atoi(parts[1])
	patch, _ := strconv.Atoi(parts[2])

	switch changeType {
	case "major":
		major++
		minor = 0
		patch = 0
	case "minor":
		minor++
		patch = 0
	case "patch":
		patch++
	default:
		patch++
	}

	return fmt.Sprintf("%d.%d.%d", major, minor, patch)
}

// CompareVersions 比较两个版本号
func (v *VersionService) CompareVersions(version1, version2 string) int {
	parts1 := strings.Split(version1, ".")
	parts2 := strings.Split(version2, ".")

	if len(parts1) != 3 || len(parts2) != 3 {
		return 0
	}

	for i := 0; i < 3; i++ {
		num1, _ := strconv.Atoi(parts1[i])
		num2, _ := strconv.Atoi(parts2[i])

		if num1 > num2 {
			return 1
		} else if num1 < num2 {
			return -1
		}
	}

	return 0
}