/**
 * DOM 选择器测试工具
 * 用于在浏览器控制台中测试选择器是否正确
 */

import { extractAllReviews, extractReviewData, REVIEW_SELECTORS } from './dom-selectors'

/**
 * 测试 Review 页面的数据提取
 * 在浏览器控制台中运行：window.testReviewExtraction()
 */
export function testReviewExtraction() {
  console.log('🧪 开始测试 Review 数据提取...')
  console.log('─'.repeat(60))
  
  // 1. 测试选择器
  console.log('📍 测试选择器:')
  const detailDivs = document.querySelectorAll(REVIEW_SELECTORS.DETAIL_CONTAINER)
  console.log(`  ✓ 找到 ${detailDivs.length} 个评价详情容器`)
  
  if (detailDivs.length === 0) {
    console.error('  ✗ 未找到评价容器！请确认在正确的页面。')
    return
  }
  
  // 2. 测试第一条评价数据提取
  console.log('\n📝 测试第一条评价数据提取:')
  const firstDiv = detailDivs[0] as HTMLElement
  const firstReview = extractReviewData(firstDiv)
  
  if (firstReview) {
    console.log('  ✓ 提取成功！')
    console.log('  类型:', firstReview.type)
    console.log('  商品名:', firstReview.productName.substring(0, 50) + '...')
    console.log('  评价内容:', firstReview.reviewContent.substring(0, 80) + '...')
    console.log('  星级:', '⭐'.repeat(firstReview.rating))
    console.log('  投稿时间:', firstReview.postTime)
    console.log('  订单号:', firstReview.orderNumber || '(无)')
    console.log('  有回复框:', firstReview.hasReplyBox ? '是' : '否')
    console.log('  已有回复:', firstReview.hasExistingReply ? '是' : '否')
  } else {
    console.error('  ✗ 提取失败！')
  }
  
  // 3. 测试提取所有评价
  console.log('\n📋 测试提取所有评价:')
  const allReviews = extractAllReviews()
  console.log(`  ✓ 成功提取 ${allReviews.length} 条评价`)
  
  // 统计信息
  const productReviews = allReviews.filter(r => r.type === 'product')
  const shopReviews = allReviews.filter(r => r.type === 'shop')
  const withReply = allReviews.filter(r => r.hasExistingReply)
  const noReply = allReviews.filter(r => !r.hasExistingReply)
  
  console.log(`  - 商品评价: ${productReviews.length} 条`)
  console.log(`  - 店铺评价: ${shopReviews.length} 条`)
  console.log(`  - 已回复: ${withReply.length} 条`)
  console.log(`  - 未回复: ${noReply.length} 条`)
  
  // 星级分布
  const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
    star,
    count: allReviews.filter(r => r.rating === star).length
  }))
  
  console.log('\n⭐ 星级分布:')
  ratingDistribution.forEach(({ star, count }) => {
    if (count > 0) {
      console.log(`  ${'⭐'.repeat(star)} : ${count} 条`)
    }
  })
  
  // 4. 显示前3条评价摘要
  console.log('\n📄 前3条评价摘要:')
  allReviews.slice(0, 3).forEach((review, index) => {
    console.log(`\n  【${index + 1}】 ${review.type === 'product' ? '商品' : '店铺'}评价 (${'⭐'.repeat(review.rating)})`)
    if (review.type === 'product') {
      console.log(`      商品: ${review.productName.substring(0, 40)}...`)
    }
    console.log(`      内容: ${review.reviewContent.substring(0, 60)}...`)
    console.log(`      时间: ${review.postTime}`)
    console.log(`      状态: ${review.hasExistingReply ? '✓ 已回复' : '✗ 未回复'}`)
  })
  
  console.log('\n' + '─'.repeat(60))
  console.log('✅ 测试完成！')
  
  return {
    total: allReviews.length,
    reviews: allReviews,
    summary: {
      productReviews: productReviews.length,
      shopReviews: shopReviews.length,
      withReply: withReply.length,
      noReply: noReply.length,
      ratingDistribution
    }
  }
}

/**
 * 测试按钮注入
 */
export function testButtonInjection() {
  console.log('🧪 测试評価返信AI按钮注入...')
  
  const reviews = extractAllReviews()
  if (reviews.length === 0) {
    console.error('✗ 未找到评价，无法测试按钮注入')
    return
  }
  
  // 为第一条评价注入按钮
  const firstReview = reviews[0]
  const { injectUOAIButton } = require('./dom-selectors')
  
  const button = injectUOAIButton(firstReview.container, (reviewData) => {
    console.log('🎯 評価返信AI按钮被点击！')
    console.log('评价数据:', reviewData)
    alert(`評価返信AI按钮点击测试成功！\n\n评价内容：${reviewData.reviewContent.substring(0, 100)}...`)
  })
  
  if (button) {
    console.log('✅ 按钮注入成功！请在页面上查看第一条评价。')
  } else {
    console.error('✗ 按钮注入失败！')
  }
}

// 导出到全局供浏览器控制台使用
if (typeof window !== 'undefined') {
  (window as any).testReviewExtraction = testReviewExtraction
  (window as any).testButtonInjection = testButtonInjection
}

