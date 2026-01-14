#!/bin/bash

# 打包脚本 - 将前端和后端打包成单个可执行文件
# 支持 Mac、Windows、Linux 三个平台

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Prompt Manager 打包脚本${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js${NC}"
    exit 1
fi

# 检查 Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}错误: 未找到 Go，请先安装 Go${NC}"
    exit 1
fi

# 步骤 1: 构建前端
echo -e "${YELLOW}[1/3] 构建前端...${NC}"
cd "$(dirname "$0")/frontend"
npm install
npm run build
cd ..

# 检查前端构建是否成功
if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}错误: 前端构建失败，frontend/dist 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}前端构建完成${NC}"
echo ""

# 步骤 2: 复制前端文件到后端
echo -e "${YELLOW}[2/3] 复制前端文件到后端...${NC}"
cp -r frontend/dist backend/
echo -e "${GREEN}前端文件复制完成${NC}"
echo ""

# 步骤 3: 交叉编译后端
echo -e "${YELLOW}[3/3] 交叉编译后端...${NC}"

APP_NAME="prompt-manager"
BUILD_DIR="$(dirname "$0")/build"
BACKEND_DIR="$(dirname "$0")/backend"

# 清理并创建构建目录
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cd "$BACKEND_DIR"

# 定义要编译的平台 (格式: "GOOS|GOARCH|OUTPUT_DIR")
PLATFORMS=(
    "darwin|amd64|macos-amd64"
    "darwin|arm64|macos-arm64"
    "linux|amd64|linux-amd64"
    "linux|arm64|linux-arm64"
    "windows|amd64|windows-amd64"
    "windows|arm64|windows-arm64"
)

for platform in "${PLATFORMS[@]}"; do
    IFS='|' read -r GOOS GOARCH OUTPUT_NAME <<< "$platform"
    OUTPUT_DIR="$BUILD_DIR/$OUTPUT_NAME"
    mkdir -p "$OUTPUT_DIR"

    echo -e "${YELLOW}编译 $GOOS/$GOARCH...${NC}"

    # 设置可执行文件名
    if [ "$GOOS" = "windows" ]; then
        BINARY_NAME="${APP_NAME}.exe"
    else
        BINARY_NAME="$APP_NAME"
    fi

    # 编译
    CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build -buildvcs=false -o "../$OUTPUT_DIR/$BINARY_NAME" -ldflags="-s -w" .

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $GOOS/$GOARCH 编译成功: $OUTPUT_DIR/$BINARY_NAME${NC}"

        # 复制配置文件示例
        if [ -f "../config.yaml.example" ]; then
            cp "../config.yaml.example" "../$OUTPUT_DIR/config.yaml"
            echo -e "${GREEN}  配置文件已复制${NC}"
        fi
    else
        echo -e "${RED}✗ $GOOS/$GOARCH 编译失败${NC}"
    fi
done

cd ..

# 清理前端构建文件
echo ""
echo -e "${YELLOW}清理临时文件...${NC}"
rm -rf frontend/dist
rm -rf backend/dist

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}打包完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}构建输出目录: $BUILD_DIR${NC}"
echo ""
echo "生成的可执行文件:"
ls -lh "$BUILD_DIR"/*/prompt-manager* 2>/dev/null || ls -lh "$BUILD_DIR"/*/
echo ""
echo -e "${YELLOW}使用说明:${NC}"
echo "1. 进入对应平台的目录"
echo "2. (可选) 编辑 config.yaml 修改配置（端口、数据库等）"
echo "3. 运行启动脚本 (start.sh 或 start.bat)"
echo "4. 在浏览器中访问 http://localhost:7788"
echo ""
