/**
 * DOM 选择器和数据提取工具
 * 用于从楽天 RMS 页面提取评价和问询数据
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

// ============================================
// Inquiry 页面选择器
// ============================================

export const INQUIRY_SELECTORS = {
  // 回复输入框
  REPLY_TEXTAREA: 'textarea.form-control[placeholder*="返信"]',
  
  // AI 按钮（楽天原有）
  RAKUTEN_AI_BUTTON: 'button.rms-btn.btn-green.btn-xs',
  
  // 发送按钮
  SEND_BUTTON: 'button.rms-btn.btn-red.btn-fill',
  
  // 问询列表项
  INQUIRY_LIST_ITEM: 'a[href*="/inquiry/"]',
} as const

// ============================================
// 问询数据接口
// ============================================

export interface InquiryData {
  /** 问询番号 */
  inquiryNumber: string
  
  /** 问询类别 */
  category: string
  
  /** 问询内容（客户的最后一条消息） */
  inquiryContent: string
  
  /** 客户姓名 */
  customerName: string
  
  /** 受付时间 */
  receivedTime: string
  
  /** 订单号（如果有） */
  orderNumber?: string
  
  /** 回复输入框元素 */
  replyTextarea: HTMLTextAreaElement | null
  
  /** 页面容器元素 */
  container: HTMLElement
}

// ============================================
// Inquiry 页面数据提取函数
// ============================================

/**
 * 从当前打开的问询详情页提取数据
 */
export function extractInquiryData(): InquiryData | null {
  try {
    // 1. 提取问询番号（从 URL）
    const urlMatch = window.location.href.match(/inquiry\/(402797-\d{8}-\d{8}[ot])/)
    const inquiryNumber = urlMatch ? urlMatch[1] : ''
    
    // 2. 提取问询类别（精确定位：カテゴリー 行的第二个子元素中的 span）
    let category = ''
    const allElements = Array.from(document.querySelectorAll('*'))
    
    // 查找 "カテゴリー" 标签元素（叶子节点，无子元素）
    const categoryLabelEl = Array.from(document.querySelectorAll('div')).find(el => {
      return el.textContent?.trim() === 'カテゴリー' && el.children.length === 0
    })
    
    if (categoryLabelEl?.parentElement) {
      // 获取 カテゴリー 行（父元素）的第二个子元素
      const categoryRow = categoryLabelEl.parentElement
      const categoryValueContainer = categoryRow.children[1] // 第二个子元素
      
      // 在容器中查找 span 元素
      const categorySpan = categoryValueContainer?.querySelector('span')
      if (categorySpan) {
        category = categorySpan.textContent?.trim() || ''
      }
    }
    
    // 备用方法：直接查找类别文本
    if (!category) {
      const categoryEl = Array.from(document.querySelectorAll('span')).find(el => {
        const text = el.textContent?.trim() || ''
        return (
          text === '送料・商品配送' ||
          text === '商品詳細' ||
          text === '返品・交換・キャンセル' ||
          text === 'その他'
        ) && el.children.length === 0
      })
      category = categoryEl?.textContent?.trim() || ''
    }
    
    // 3. 提取客户姓名（优先从对话区域查找 "姓名 様" 格式）
    let customerName = ''
    
    // 方法1: 从对话区域查找 "姓名 様" 格式的元素
    const dialogNameEl = allElements.find(el => {
      const text = el.textContent?.trim() || ''
      // 查找格式如 "林浩如 様" 的叶子节点
      return /^[\u4e00-\u9fa5]{1,5}[\s\u3000]?[\u4e00-\u9fa5]{0,5}\s*様$/.test(text) &&
             el.children.length === 0 &&
             text.length < 15
    })
    
    if (dialogNameEl) {
      // 提取姓名部分（去掉 "様"）
      customerName = dialogNameEl.textContent?.trim().replace(/\s*様$/, '') || ''
    }
    
    // 备用方法：从包含时间的对话消息中提取
    if (!customerName) {
      const timePattern = /\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2}/
      const messageElements = allElements.filter(el => {
        const text = el.textContent || ''
        return timePattern.test(text) && text.includes('様') && text.length < 200
      })
      
      if (messageElements.length > 0) {
        const text = messageElements[0].textContent || ''
        const nameMatch = text.match(/\d{1,2}:\d{1,2}\s+([^\s様]+)\s*様/)
        if (nameMatch) {
          customerName = nameMatch[1]
        }
      }
    }
    
    // 4. 提取问询内容（从客户消息附近查找，优先对话区域）
    let inquiryContent = ''
    let receivedTime = ''
    
    // 查找包含当前客户姓名的对话消息元素
    const customerElements = allElements.filter(el => {
      const text = el.textContent?.trim() || ''
      return text.includes(customerName) && text.includes('様') && text.length < 50
    })
    
    const inquiryKeywords = ['いつ', '届', '発送', 'キャンセル', '返品', '交換', '確認', '教えて', 'ください', '頃', '注文', '支払']
    
    // 直接在整个页面查找问询内容（使用DOM结构来排除左侧列表）
    // 策略：找到所有对话区域的客户消息，选择最后一条（最新的）
    const dialogInquiries = allElements.filter(el => {
      const text = el.textContent?.trim() || ''
      const className = typeof el.className === 'string' ? el.className : ''
      
      // 排除左侧列表（通过class识别）
      if (className.includes('sc-jffHpj') || className.includes('jjTcTs')) {
        return false
      }
      
      // 排除左侧列表容器
      if (className.includes('card-messe-item') || className.includes('messe-srch-area')) {
        return false
      }
      
      // 必须是对话区域中的Linkify元素（客户消息）
      if (!className.includes('Linkify')) {
        return false
      }
      
      return el.children.length === 0 &&  // 必须是叶子节点
             text.length > 5 &&  // 至少5字符（支持短问询）
             text.length < 500 &&
             inquiryKeywords.some(keyword => text.includes(keyword)) &&
             !text.includes('自動応答') &&
             !text.includes('あいさつ文') &&
             !text.includes('お問い合わせくださり') &&
             !text.includes('について') &&  // 排除类别标题
             !text.includes('システム') &&  // 排除系统提示
             !text.includes('送信をキャンセル')  // 排除警告对话框
    })
    
    // 如果找到多条，选择在DOM中位置最靠后的（最新的消息）
    if (dialogInquiries.length > 0) {
      // 取最后一个（DOM顺序通常反映时间顺序）
      inquiryContent = dialogInquiries[dialogInquiries.length - 1].textContent?.trim() || ''
    }
    
    // 备用方法：如果上述方法失败，使用原有逻辑（从整个页面查找）
    if (!inquiryContent) {
      const inquiryEl = allElements.find(el => {
        const text = el.textContent?.trim() || ''
        return el.children.length === 0 &&
               text.length > 5 && 
               text.length < 300 &&
               inquiryKeywords.some(keyword => text.includes(keyword)) &&
               !text.includes('自動応答') &&
               !text.includes('設定を変更') &&
               !text.includes('お問い合わせくださり') &&
               !text.includes('受付') && // 排除左侧列表
               !text.includes('…') // 排除带省略号的截断内容
      })
      
      if (inquiryEl) {
        inquiryContent = inquiryEl.textContent?.trim() || ''
      }
    }
    
    // 5. 提取受付时间（从对话中第一条客户消息）
    const timePattern = /\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2}/
    const timeMatch = document.body.textContent?.match(timePattern)
    if (timeMatch) {
      receivedTime = timeMatch[0]
    }
    
    // 6. 查找回复输入框
    const textareas = Array.from(document.querySelectorAll('textarea'))
    const replyTextarea = textareas.find(ta => {
      const placeholder = ta.placeholder || ta.getAttribute('placeholder') || ''
      return placeholder.includes('返信') || placeholder.includes('記入')
    }) as HTMLTextAreaElement | null
    
    // 7. 提取订单号（如果有）
    const orderMatch = document.body.textContent?.match(/402797-\d{8}-\d{10}/)
    const orderNumber = orderMatch ? orderMatch[0] : undefined
    
    return {
      inquiryNumber,
      category,
      inquiryContent,
      customerName,
      receivedTime,
      orderNumber,
      replyTextarea,
      container: document.body,
    }
  } catch (error) {
    console.error('提取问询数据失败:', error)
    return null
  }
}

/**
 * 从问询列表页提取所有问询摘要
 */
export function extractAllInquiries(): InquiryData[] {
  const inquiries: InquiryData[] = []
  
  try {
    // 查找所有问询列表项
    const listItems = document.querySelectorAll(INQUIRY_SELECTORS.INQUIRY_LIST_ITEM)
    
    listItems.forEach((item) => {
      const text = item.textContent || ''
      const href = item.getAttribute('href') || ''
      
      // 提取问询番号（从链接）
      const numberMatch = href.match(/inquiry\/(402797-\d{8}-\d{8}[ot])/)
      const inquiryNumber = numberMatch ? numberMatch[1] : ''
      
      // 提取类别、客户名、时间等
      const categoryMatch = text.match(/送料・商品配送|商品詳細|返品・交換・キャンセル|その他/)
      const category = categoryMatch ? categoryMatch[0] : ''
      
      const nameMatch = text.match(/([^\s]+)\s*様/)
      const customerName = nameMatch ? nameMatch[1] : ''
      
      const timeMatch = text.match(/\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2}/)
      const receivedTime = timeMatch ? timeMatch[0] : ''
      
      // 提取问询内容（移除类别、姓名、时间后的剩余文本）
      let inquiryContent = text
        .replace(category, '')
        .replace(customerName + ' 様', '')
        .replace(receivedTime, '')
        .replace('受付', '')
        .trim()
        .substring(0, 100)
      
      if (inquiryNumber) {
        inquiries.push({
          inquiryNumber,
          category,
          inquiryContent,
          customerName,
          receivedTime,
          replyTextarea: null,
          container: item as HTMLElement,
        })
      }
    })
  } catch (error) {
    console.error('提取问询列表失败:', error)
  }
  
  return inquiries
}

/**
 * 为 Inquiry 页面添加 UO AI 按钮
 */
export function injectUOAIButtonForInquiry(
  onClick: (inquiryData: InquiryData) => void
): HTMLButtonElement | null {
  try {
    // 查找 AI 按钮所在的容器
    const rakutenAIButton = document.querySelector(INQUIRY_SELECTORS.RAKUTEN_AI_BUTTON)
    if (!rakutenAIButton?.parentElement) {
      console.warn('未找到楽天 AI 按钮')
      return null
    }
    
    const buttonContainer = rakutenAIButton.parentElement
    
    // 检查是否已经注入过按钮
    if (buttonContainer.querySelector('.uo-ai-button-inquiry')) {
      return null
    }
    
    // 创建 UO AI 按钮
    const button = document.createElement('button')
    button.className = 'uo-ai-button-inquiry rms-btn btn-xs'
    button.type = 'button'
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-left: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
    `
    
    // 添加图标
    const icon = document.createElement('span')
    icon.innerHTML = '✨'
    icon.style.fontSize = '14px'
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
      const inquiryData = extractInquiryData()
      if (inquiryData) {
        onClick(inquiryData)
      }
    })
    
    // 插入按钮
    buttonContainer.appendChild(button)
    
    return button
  } catch (error) {
    console.error('注入 UO AI 按钮失败:', error)
    return null
  }
}

