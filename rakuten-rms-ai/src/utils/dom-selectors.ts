/**
 * DOM 选择器和数据提取工具
 * 用于从楽天 RMS 页面提取评价数据
 */

// ============================================
// Review 页面选择器
// ============================================

export const REVIEW_SELECTORS = {
  // 评价详情容器（主要定位点）
  DETAIL_CONTAINER: 'div[id="search_list_review_detail"]',
  
  // 商品名
  PRODUCT_NAME: 'div[id="search_list_review_item_name"]',
  
  // 评价内容
  REVIEW_CONTENT: 'div[id="search_list_review_detail"]',
  
  // 星级容器
  RATING_CONTAINER: 'div[id="search_list_review_evaluation"]',
  
  // 星级图片
  STAR_IMAGE: 'img[src*="review_star.gif"]',
  
  // 投稿时间
  POST_TIME: 'div[id="search_list_review_reg_time"]',
  
  // 回复输入框（用于填充 AI 生成的回复）
  REPLY_TEXTAREA: 'textarea.reviewCommentTextare',
  
  // 提交按钮
  SUBMIT_BUTTON: 'input.comment_btn.btn-submit',
  
  // 楽天 AI 按钮（避免冲突）
  RAKUTEN_AI_BUTTON: 'button.ai-trigger-btn.aireply_img_btn',
} as const

// ============================================
// 评价数据接口
// ============================================

export interface ReviewData {
  /** 评价类型：商品评价或店铺评价 */
  type: 'product' | 'shop'
  
  /** 商品名（商品评价时有值，店铺评价为 "このショップレビューを開く"） */
  productName: string
  
  /** 评价内容 */
  reviewContent: string
  
  /** 星级（1-5） */
  rating: number
  
  /** 投稿时间 */
  postTime: string
  
  /** 订单号 */
  orderNumber: string
  
  /** 是否有回复输入框 */
  hasReplyBox: boolean
  
  /** 是否已有回复 */
  hasExistingReply: boolean
  
  /** 回复输入框元素（用于后续填充） */
  replyTextarea: HTMLTextAreaElement | null
  
  /** 评价容器元素 */
  container: HTMLElement
}

// ============================================
// Review 页面数据提取函数
// ============================================

/**
 * 从 HTML 内容中移除标签并处理换行
 */
function cleanHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')  // 替换 <br> 为换行
    .replace(/<[^>]+>/g, '')        // 移除所有 HTML 标签
    .trim()
}

/**
 * 提取单条评价的数据
 */
export function extractReviewData(detailDiv: HTMLElement): ReviewData | null {
  try {
    // 向上查找"单个评价"的容器（包含1个textarea和1个detailDiv）
    let container: HTMLElement | null = detailDiv
    for (let i = 0; i < 10; i++) {
      if (!container?.parentElement) break
      container = container.parentElement
      
      // 检查这个容器是否恰好包含1个textarea和1个detailDiv
      const textareas = container.querySelectorAll(REVIEW_SELECTORS.REPLY_TEXTAREA)
      const details = container.querySelectorAll(REVIEW_SELECTORS.DETAIL_CONTAINER)
      
      if (textareas.length === 1 && details.length === 1) {
        // 找到了单个评价的容器
        break
      }
    }
    
    if (!container) return null
    
    // 1. 提取商品名
    const productNameDiv = container.querySelector(REVIEW_SELECTORS.PRODUCT_NAME)
    const productName = productNameDiv?.textContent?.trim() || ''
    
    // 2. 提取评价内容
    const reviewContent = cleanHTML(detailDiv.innerHTML)
    
    // 3. 提取星级
    const evaluationDiv = container.querySelector(REVIEW_SELECTORS.RATING_CONTAINER)
    const stars = evaluationDiv?.querySelectorAll(REVIEW_SELECTORS.STAR_IMAGE) || []
    const rating = stars.length
    
    // 4. 提取投稿时间
    const timeDiv = container.querySelector(REVIEW_SELECTORS.POST_TIME)
    const postTime = timeDiv?.textContent?.replace('投稿時間：', '').trim() || ''
    
    // 5. 提取订单号
    const orderMatch = container.textContent?.match(/注文番号[：:]\s*([\d-]+)/)
    const orderNumber = orderMatch ? orderMatch[1] : ''
    
    // 6. 查找回复输入框
    const replyTextarea = container.querySelector(REVIEW_SELECTORS.REPLY_TEXTAREA) as HTMLTextAreaElement | null
    
    // 7. 检查是否已有回复
    // 策略：查找"お店からのコメント"后面的 <p> 标签是否有实际内容
    const commentParagraphs = container.querySelectorAll('p')
    const paragraphs = Array.from(commentParagraphs)
    
    // 找到"お店からのコメント"的索引
    const commentTitleIndex = paragraphs.findIndex(p => p.textContent?.trim() === 'お店からのコメント')
    
    let hasExistingReply = false
    
    if (commentTitleIndex >= 0 && commentTitleIndex < paragraphs.length - 1) {
      // 检查下一个 <p> 标签是否有实际回复内容（非空，非删除提示）
      const nextP = paragraphs[commentTitleIndex + 1]
      const nextText = nextP?.textContent?.trim() || ''
      
      // 有实际内容且不是删除提示
      hasExistingReply = nextText.length > 0 && 
                         !nextText.includes('削除しました') &&
                         nextText !== 'コメント削除しました。'
    }
    
    // 8. 判断评价类型（商品/店铺）
    const isShopReview = container.textContent?.includes('このショップレビューを開く') || false
    
    return {
      type: isShopReview ? 'shop' : 'product',
      productName,
      reviewContent,
      rating,
      postTime,
      orderNumber,
      hasReplyBox: !!replyTextarea,
      hasExistingReply,
      replyTextarea,
      container,
    }
  } catch (error) {
    console.error('提取评价数据失败:', error)
    return null
  }
}

/**
 * 提取页面上所有评价的数据
 */
export function extractAllReviews(): ReviewData[] {
  const reviews: ReviewData[] = []
  const detailDivs = document.querySelectorAll(REVIEW_SELECTORS.DETAIL_CONTAINER)
  
  detailDivs.forEach((detailDiv) => {
    const reviewData = extractReviewData(detailDiv as HTMLElement)
    if (reviewData) {
      reviews.push(reviewData)
    }
  })
  
  return reviews
}

/**
 * 为评价容器添加 UO AI 按钮
 */
export function injectUOAIButton(
  container: HTMLElement,
  onClick: (reviewData: ReviewData) => void
): HTMLButtonElement | null {
  try {
    // 查找回复输入框所在的提交区域
    const submitArea = container.querySelector('.submit_area') || 
                       container.querySelector('.submit-button-container')
    
    if (!submitArea) {
      console.warn('未找到提交按钮区域')
      return null
    }
    
    // 检查是否已经注入过按钮（避免重复）
    if (container.querySelector('.uo-ai-button')) {
      return null
    }
    
    // 创建 UO AI 按钮
    const button = document.createElement('button')
    button.className = 'uo-ai-button'
    button.type = 'button'
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      margin-left: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
    `
    
    // 添加图标
    const icon = document.createElement('span')
    icon.innerHTML = '✨'
    icon.style.fontSize = '16px'
    button.appendChild(icon)
    
    // 添加文字
    const text = document.createElement('span')
    text.textContent = 'UO AI 生成'
    button.appendChild(text)
    
    // 悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)'
      button.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)'
    })
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)'
      button.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)'
    })
    
    // 点击事件
    button.addEventListener('click', () => {
      const detailDiv = container.querySelector(REVIEW_SELECTORS.DETAIL_CONTAINER) as HTMLElement
      if (!detailDiv) return
      
      const reviewData = extractReviewData(detailDiv)
      if (reviewData) {
        onClick(reviewData)
      }
    })
    
    // 插入按钮（在楽天 AI 按钮之后）
    const rakutenAIBtn = submitArea.querySelector(REVIEW_SELECTORS.RAKUTEN_AI_BUTTON)
    if (rakutenAIBtn?.parentElement) {
      rakutenAIBtn.parentElement.appendChild(button)
    } else {
      submitArea.appendChild(button)
    }
    
    return button
  } catch (error) {
    console.error('注入 UO AI 按钮失败:', error)
    return null
  }
}

