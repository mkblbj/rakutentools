#!/bin/bash

# UO Rakutentools - 构建所有版本
# 用途：一次性构建 Chrome 和 Firefox 生产版本

echo "🚀 开始构建 UO Rakutentools..."
echo ""

# 1. 清理旧的构建文件
echo "🧹 清理旧构建..."
rm -rf build/

# 2. 构建 Chrome 版本
echo ""
echo "📦 构建 Chrome 版本..."
pnpm run build
if [ $? -eq 0 ]; then
    echo "✅ Chrome 版本构建成功！"
else
    echo "❌ Chrome 版本构建失败！"
    exit 1
fi

# 3. 构建 Firefox 版本
echo ""
echo "🦊 构建 Firefox 版本..."
pnpm run build:firefox
if [ $? -eq 0 ]; then
    echo "✅ Firefox 版本构建成功！"
else
    echo "❌ Firefox 版本构建失败！"
    exit 1
fi

# 4. 打包
echo ""
echo "📦 打包所有版本..."
cd build
if [ -d "chrome-mv3-prod" ]; then
    zip -r chrome-mv3-prod.zip chrome-mv3-prod/
    echo "✅ Chrome 打包完成: build/chrome-mv3-prod.zip"
fi
if [ -d "firefox-mv2-prod" ]; then
    zip -r firefox-mv2-prod.zip firefox-mv2-prod/
    echo "✅ Firefox 打包完成: build/firefox-mv2-prod.zip"
fi
cd ..

# 5. 显示结果
echo ""
echo "🎉 构建完成！"
echo ""
echo "📁 输出文件："
ls -lh build/*.zip 2>/dev/null || echo "  (未生成打包文件)"
echo ""
echo "📂 构建目录："
ls -d build/*-prod/ 2>/dev/null || echo "  (未生成构建目录)"


