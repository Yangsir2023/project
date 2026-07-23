/**
 * RAG Engine — Retrieval-Augmented Generation
 *
 * 纯前端实现，无需外部向量数据库。
 * 使用 TF-IDF + 余弦相似度实现语义检索。
 *
 * 知识库结构：
 *   - componentLibrary: UI 组件元数据（Ant Design / Material-UI 风格）
 *   - layoutPatterns: 常见网站布局模式
 *   - designTokens: 颜色/字体/间距设计规范
 */

/* ═══════════════════════════════════════════════════════
   内置组件知识库
   ═══════════════════════════════════════════════════════ */

export const COMPONENT_LIBRARY = [
  // ── Navigation ──────────────────────────────────────
  {
    id: 'nav-topbar',
    category: 'navigation',
    name: 'Top Navigation Bar',
    description: 'A horizontal navbar at the top of the page with logo, links, and CTA button. Ideal for landing pages and marketing sites.',
    tags: ['navbar', 'navigation', 'header', 'menu', 'logo', 'topbar'],
    blockType: 'nav',
    examples: ['SaaS landing page navbar', 'E-commerce header', 'Portfolio navigation'],
    cssHints: 'position: sticky; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px);',
    defaultContent: { logo: 'Brand', links: ['Home', 'Features', 'Pricing', 'About'], cta: 'Get Started' },
  },
  {
    id: 'nav-sidebar',
    category: 'navigation',
    name: 'Sidebar Navigation',
    description: 'Vertical sidebar for dashboards and admin panels. Supports icons, nested menus, and collapsible sections.',
    tags: ['sidebar', 'dashboard', 'admin', 'vertical menu', 'navigation'],
    blockType: 'nav',
    examples: ['Admin dashboard', 'Documentation site', 'App sidebar'],
    cssHints: 'width: 240px; height: 100vh; position: fixed; left: 0;',
    defaultContent: { logo: 'Admin', links: ['Dashboard', 'Users', 'Analytics', 'Settings'], cta: 'Logout' },
  },

  // ── Hero Sections ────────────────────────────────────
  {
    id: 'hero-centered',
    category: 'hero',
    name: 'Centered Hero Section',
    description: 'Full-width hero with centered headline, subtitle, and CTA buttons. Best for SaaS and startup landing pages.',
    tags: ['hero', 'banner', 'headline', 'CTA', 'landing page', 'startup'],
    blockType: 'hero',
    examples: ['SaaS homepage hero', 'App launch page', 'Marketing hero'],
    cssHints: 'min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center;',
    defaultContent: { title: 'Build Faster with AI', sub: 'The modern way to create websites', cta: 'Start for Free' },
  },
  {
    id: 'hero-split',
    category: 'hero',
    name: 'Split Hero (Text + Image)',
    description: 'Two-column hero with text on the left and product image/screenshot on the right.',
    tags: ['hero', 'split layout', 'product screenshot', 'two column'],
    blockType: 'hero',
    examples: ['Product showcase', 'App landing page', 'Feature highlight'],
    cssHints: 'display: grid; grid-template-columns: 1fr 1fr; gap: 40px;',
    defaultContent: { title: 'Your Product Name', sub: 'Describe the core value proposition here', cta: 'See Demo' },
  },

  // ── Cards & Content ──────────────────────────────────
  {
    id: 'card-feature',
    category: 'card',
    name: 'Feature Card',
    description: 'Card for showcasing product features with icon, title, and description. Typically used in 3-column grids.',
    tags: ['feature', 'card', 'icon', 'grid', 'benefits', 'showcase'],
    blockType: 'card',
    examples: ['Feature section', 'Benefits overview', 'Why choose us'],
    cssHints: 'border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);',
    defaultContent: { title: '⚡ Fast Performance', body: 'Built with modern tech for lightning-fast load times.', hasImage: false },
  },
  {
    id: 'card-pricing',
    category: 'card',
    name: 'Pricing Card',
    description: 'Pricing tier card with plan name, price, features list, and CTA button. Supports popular/highlighted state.',
    tags: ['pricing', 'plan', 'subscription', 'SaaS', 'payment', 'tier'],
    blockType: 'card',
    examples: ['SaaS pricing page', 'Subscription plans', 'Free vs Pro comparison'],
    cssHints: 'border: 2px solid var(--accent); border-radius: 16px; padding: 32px;',
    defaultContent: { title: 'Pro Plan', body: '$29/month — Unlimited projects, priority support, API access.', hasImage: false },
  },
  {
    id: 'card-testimonial',
    category: 'card',
    name: 'Testimonial Card',
    description: 'Customer testimonial with avatar, name, role, and quote. Great for social proof sections.',
    tags: ['testimonial', 'review', 'social proof', 'customer', 'quote', 'feedback'],
    blockType: 'card',
    examples: ['Customer reviews section', 'Social proof', 'Success stories'],
    cssHints: 'background: #f8fafc; border-left: 4px solid var(--accent); padding: 24px;',
    defaultContent: { title: '"Game changer for our team"', body: '— Sarah Chen, CTO at TechCorp', hasImage: true },
  },
  {
    id: 'card-blog',
    category: 'card',
    name: 'Blog Post Card',
    description: 'Article preview card with cover image, title, excerpt, author, and read more link.',
    tags: ['blog', 'article', 'post', 'news', 'content', 'media'],
    blockType: 'card',
    examples: ['Blog listing page', 'News feed', 'Content hub'],
    cssHints: 'overflow: hidden; border-radius: 12px; transition: transform 0.2s;',
    defaultContent: { title: 'How AI is Changing Web Design', body: 'Explore the latest trends in AI-powered web development...', hasImage: true },
  },

  // ── Forms & CTAs ─────────────────────────────────────
  {
    id: 'button-primary',
    category: 'button',
    name: 'Primary CTA Button',
    description: 'High-emphasis button for primary actions like Sign Up, Get Started, or Buy Now.',
    tags: ['button', 'CTA', 'primary', 'action', 'sign up', 'get started'],
    blockType: 'button',
    examples: ['Homepage CTA', 'Form submit button', 'Pricing CTA'],
    cssHints: 'background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; padding: 12px 28px;',
    defaultContent: { text: 'Get Started Free', variant: 'primary', href: '#signup' },
  },
  {
    id: 'button-ghost',
    category: 'button',
    name: 'Ghost / Outline Button',
    description: 'Low-emphasis outlined button for secondary actions like Learn More or View Demo.',
    tags: ['button', 'ghost', 'outline', 'secondary', 'learn more'],
    blockType: 'button',
    examples: ['Secondary CTA', 'Navigation action', 'Cancel button'],
    cssHints: 'border: 2px solid currentColor; background: transparent; border-radius: 8px;',
    defaultContent: { text: 'View Demo', variant: 'ghost', href: '#demo' },
  },

  // ── Text & Typography ────────────────────────────────
  {
    id: 'heading-h1',
    category: 'heading',
    name: 'Main Page Heading (H1)',
    description: 'The largest heading on the page, typically for page titles or hero headlines.',
    tags: ['heading', 'h1', 'title', 'headline', 'typography'],
    blockType: 'heading',
    examples: ['Page title', 'Hero headline', 'Section main title'],
    cssHints: 'font-size: clamp(2rem, 5vw, 4rem); font-weight: 800; letter-spacing: -0.02em;',
    defaultContent: { text: 'The Future of Web Creation', level: 'h1', align: 'center' },
  },
  {
    id: 'heading-section',
    category: 'heading',
    name: 'Section Heading (H2)',
    description: 'Section-level heading for features, pricing, testimonials, etc.',
    tags: ['heading', 'h2', 'section title', 'typography'],
    blockType: 'heading',
    examples: ['Features section title', 'Pricing header', 'FAQ title'],
    cssHints: 'font-size: clamp(1.5rem, 3vw, 2.5rem); font-weight: 700;',
    defaultContent: { text: 'Why Choose Us', level: 'h2', align: 'center' },
  },
  {
    id: 'text-body',
    category: 'text',
    name: 'Body Text / Paragraph',
    description: 'Standard body copy for descriptions, explanations, and content paragraphs.',
    tags: ['text', 'paragraph', 'body copy', 'content', 'description'],
    blockType: 'text',
    examples: ['Feature description', 'About us section', 'Product description'],
    cssHints: 'font-size: 1rem; line-height: 1.7; color: var(--text-secondary);',
    defaultContent: { text: 'Describe your product or service here. Keep it concise and compelling.', align: 'left' },
  },

  // ── Lists ─────────────────────────────────────────────
  {
    id: 'list-features',
    category: 'list',
    name: 'Feature List with Checkmarks',
    description: 'Bulleted list of features or benefits, often used in pricing cards or comparison sections.',
    tags: ['list', 'features', 'benefits', 'checkmark', 'bullet points'],
    blockType: 'list',
    examples: ['Pricing features', 'Product benefits', 'What\'s included'],
    cssHints: 'list-style: none; padding: 0; li::before { content: "✓"; color: #22c55e; }',
    defaultContent: { items: ['Unlimited projects', 'Priority support', 'API access', 'Custom domains', 'Analytics dashboard'], style: 'bullet' },
  },
  {
    id: 'list-steps',
    category: 'list',
    name: 'Step-by-Step Process List',
    description: 'Numbered list showing a process, workflow, or how-it-works steps.',
    tags: ['list', 'steps', 'process', 'how it works', 'numbered', 'workflow'],
    blockType: 'list',
    examples: ['How it works', 'Onboarding steps', 'Getting started guide'],
    cssHints: 'counter-reset: step; li::before { counter-increment: step; content: counter(step); }',
    defaultContent: { items: ['Sign up for free', 'Describe your website', 'AI generates the design', 'Customize and deploy'], style: 'number' },
  },

  // ── Media & Visual ───────────────────────────────────
  {
    id: 'image-hero',
    category: 'image',
    name: 'Hero Product Image',
    description: 'Full-width or featured image for showcasing product screenshots, mockups, or illustrations.',
    tags: ['image', 'screenshot', 'mockup', 'product', 'visual', 'hero'],
    blockType: 'image',
    examples: ['App screenshot', 'Product mockup', 'Hero illustration'],
    cssHints: 'border-radius: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.15);',
    defaultContent: { src: '', alt: 'Product screenshot', fit: 'contain' },
  },
  {
    id: 'image-avatar',
    category: 'image',
    name: 'Avatar / Profile Image',
    description: 'Circular profile image for team members, authors, or customer testimonials.',
    tags: ['avatar', 'profile', 'team', 'author', 'photo', 'circular'],
    blockType: 'image',
    examples: ['Team section', 'Author bio', 'Testimonial avatar'],
    cssHints: 'border-radius: 50%; width: 80px; height: 80px; object-fit: cover;',
    defaultContent: { src: '', alt: 'Team member', fit: 'cover' },
  },

  // ── Layout & Structure ───────────────────────────────
  {
    id: 'divider-section',
    category: 'divider',
    name: 'Section Divider',
    description: 'Horizontal rule to visually separate page sections.',
    tags: ['divider', 'separator', 'section break', 'horizontal rule'],
    blockType: 'divider',
    examples: ['Between sections', 'Footer separator', 'Content divider'],
    cssHints: 'border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 40px 0;',
    defaultContent: { style: 'line' },
  },
  {
    id: 'badge-status',
    category: 'badge',
    name: 'Status / Label Badge',
    description: 'Small pill badge for labels, tags, status indicators, or new feature announcements.',
    tags: ['badge', 'tag', 'label', 'status', 'chip', 'pill', 'new', 'beta'],
    blockType: 'badge',
    examples: ['New feature badge', 'Category tag', 'Status indicator'],
    cssHints: 'display: inline-flex; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem;',
    defaultContent: { text: '✨ New Feature', color: '#6366f1' },
  },

  // ── E-commerce specific ──────────────────────────────
  {
    id: 'card-product',
    category: 'card',
    name: 'Product Card',
    description: 'E-commerce product card with image, title, price, and add-to-cart button.',
    tags: ['product', 'e-commerce', 'shop', 'price', 'cart', 'buy'],
    blockType: 'card',
    examples: ['Product listing', 'Shop page', 'Featured products'],
    cssHints: 'border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s;',
    defaultContent: { title: 'Product Name — $29.99', body: 'Product description and key features listed here.', hasImage: true },
  },

  // ── Footer ─────────────────────────────────────────
  {
    id: 'footer-simple',
    category: 'footer',
    name: 'Simple Footer',
    description: 'Minimal footer with logo, copyright, and links. Good for landing pages.',
    tags: ['footer', 'bottom', 'copyright', 'links', 'simple'],
    blockType: 'text',
    examples: ['Landing page footer', 'SaaS footer', 'Portfolio footer'],
    cssHints: 'background: #f8fafc; padding: 40px 0; text-align: center;',
    defaultContent: { text: '© 2024 Your Company · Privacy · Terms · Contact', align: 'center' },
  },
  {
    id: 'footer-full',
    category: 'footer',
    name: 'Full Footer with Columns',
    description: 'Multi-column footer with logo, navigation links grouped by category, and social links.',
    tags: ['footer', 'multi-column', 'links', 'social', 'complete'],
    blockType: 'list',
    examples: ['E-commerce footer', 'SaaS full footer', 'Corporate footer'],
    cssHints: 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px;',
    defaultContent: { items: ['Product', 'Company', 'Resources', 'Legal'], style: 'bullet' },
  },

  // ── Contact & Forms ──────────────────────────────────
  {
    id: 'hero-contact',
    category: 'contact',
    name: 'Contact / Newsletter Section',
    description: 'Email capture or contact section with form fields and submit button.',
    tags: ['contact', 'email', 'newsletter', 'form', 'subscribe', 'input'],
    blockType: 'hero',
    examples: ['Newsletter signup', 'Contact form', 'Email capture'],
    cssHints: 'background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 80px 0;',
    defaultContent: { title: 'Stay in the Loop', sub: 'Get the latest updates delivered to your inbox', cta: 'Subscribe Now' },
  },
];

/* ═══════════════════════════════════════════════════════
   常见网站布局模式库
   ═══════════════════════════════════════════════════════ */

export const LAYOUT_PATTERNS = [
  {
    id: 'pattern-saas-landing',
    name: 'SaaS Landing Page',
    description: 'Standard SaaS marketing landing page with navbar, hero, features, pricing, testimonials, and footer.',
    tags: ['SaaS', 'landing page', 'startup', 'marketing', 'subscription'],
    slideStructure: ['nav-topbar', 'hero-centered', 'card-feature', 'card-pricing', 'card-testimonial', 'footer-full'],
    colorScheme: { primary: '#6366f1', bg: '#ffffff', text: '#0f172a' },
  },
  {
    id: 'pattern-portfolio',
    name: 'Personal Portfolio',
    description: 'Minimalist portfolio with hero intro, project grid, skills section, and contact form.',
    tags: ['portfolio', 'personal', 'designer', 'developer', 'freelancer'],
    slideStructure: ['nav-topbar', 'hero-split', 'card-blog', 'list-features', 'hero-contact'],
    colorScheme: { primary: '#0ea5e9', bg: '#0f172a', text: '#e2e8f0' },
  },
  {
    id: 'pattern-ecommerce',
    name: 'E-Commerce Store',
    description: 'Online store with product listing, featured items, promotions, and shopping cart access.',
    tags: ['e-commerce', 'shop', 'store', 'products', 'buy', 'cart'],
    slideStructure: ['nav-topbar', 'hero-centered', 'card-product', 'list-features', 'footer-full'],
    colorScheme: { primary: '#f59e0b', bg: '#ffffff', text: '#1e293b' },
  },
  {
    id: 'pattern-blog',
    name: 'Blog / Content Site',
    description: 'Content-focused blog with featured posts, categories, and newsletter signup.',
    tags: ['blog', 'articles', 'content', 'news', 'magazine', 'writing'],
    slideStructure: ['nav-topbar', 'heading-h1', 'card-blog', 'list-features', 'hero-contact', 'footer-simple'],
    colorScheme: { primary: '#059669', bg: '#f8fafc', text: '#0f172a' },
  },
  {
    id: 'pattern-dashboard',
    name: 'Admin Dashboard',
    description: 'Data dashboard with sidebar navigation, KPI cards, charts, and data tables.',
    tags: ['dashboard', 'admin', 'analytics', 'data', 'charts', 'KPI'],
    slideStructure: ['nav-sidebar', 'card-feature', 'card-feature', 'card-feature'],
    colorScheme: { primary: '#6366f1', bg: '#0f172a', text: '#e2e8f0' },
  },
  {
    id: 'pattern-restaurant',
    name: 'Restaurant / Food Site',
    description: 'Restaurant website with hero banner, menu showcase, reservation form, and location.',
    tags: ['restaurant', 'food', 'menu', 'reservation', 'cafe', 'dining'],
    slideStructure: ['nav-topbar', 'hero-split', 'card-feature', 'list-features', 'hero-contact'],
    colorScheme: { primary: '#dc2626', bg: '#1c0a00', text: '#fef3c7' },
  },
];

/* ═══════════════════════════════════════════════════════
   TF-IDF 向量检索核心
   ═══════════════════════════════════════════════════════ */

/**
 * 将文本分词（简单空格分词 + 小写化）
 */
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * 构建 TF-IDF 矩阵
 * @param {Array} documents - [{id, text}]
 * @returns {Map} docId → {term: tfidf}
 */
function buildTFIDF(documents) {
  const N = documents.length;
  const termDf = new Map(); // term → document frequency

  // 计算 TF
  const docTF = documents.map(doc => {
    const tokens = tokenize(doc.text);
    const tf = new Map();
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    // Normalize TF
    const maxFreq = Math.max(...tf.values(), 1);
    tf.forEach((v, k) => tf.set(k, v / maxFreq));
    // 更新 DF
    new Set(tokens).forEach(t => termDf.set(t, (termDf.get(t) || 0) + 1));
    return { id: doc.id, tf };
  });

  // 计算 TF-IDF
  const tfidfMatrix = new Map();
  docTF.forEach(({ id, tf }) => {
    const vec = new Map();
    tf.forEach((tfVal, term) => {
      const df = termDf.get(term) || 1;
      const idf = Math.log(N / df + 1);
      vec.set(term, tfVal * idf);
    });
    tfidfMatrix.set(id, vec);
  });

  return tfidfMatrix;
}

/**
 * 余弦相似度
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  vecA.forEach((v, k) => {
    dot += v * (vecB.get(k) || 0);
    normA += v * v;
  });
  vecB.forEach(v => normB += v * v);
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ═══════════════════════════════════════════════════════
   RAG 主类
   ═══════════════════════════════════════════════════════ */

class RAGEngine {
  constructor() {
    this._componentIndex = null;
    this._patternIndex = null;
    this._ready = false;
    this._cache = new Map(); // query → results
  }

  /**
   * 初始化索引（懒加载）
   */
  _ensureIndex() {
    if (this._ready) return;

    // 构建组件索引
    const componentDocs = COMPONENT_LIBRARY.map(c => ({
      id: c.id,
      text: `${c.name} ${c.description} ${c.tags.join(' ')} ${c.examples.join(' ')}`,
    }));
    this._componentIndex = buildTFIDF(componentDocs);

    // 构建布局模式索引
    const patternDocs = LAYOUT_PATTERNS.map(p => ({
      id: p.id,
      text: `${p.name} ${p.description} ${p.tags.join(' ')}`,
    }));
    this._patternIndex = buildTFIDF(patternDocs);

    this._ready = true;
    console.log('[RAG] Index built:', componentDocs.length, 'components,', patternDocs.length, 'patterns');
  }

  /**
   * 检索最相关的组件
   * @param {string} query - 用户自然语言查询
   * @param {number} topK - 返回前 K 个结果
   * @param {string} [category] - 可选：按类别过滤
   * @returns {Array} [{component, score}]
   */
  retrieveComponents(query, topK = 5, category = null) {
    this._ensureIndex();

    const cacheKey = `comp:${query}:${topK}:${category}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    const queryTokens = tokenize(query);
    const queryVec = new Map();
    queryTokens.forEach(t => queryVec.set(t, (queryVec.get(t) || 0) + 1));

    let candidates = COMPONENT_LIBRARY;
    if (category) candidates = candidates.filter(c => c.category === category);

    const results = candidates
      .map(component => {
        const docVec = this._componentIndex.get(component.id) || new Map();
        // 构建查询的伪 TF-IDF（用 TF 近似）
        const qVec = new Map();
        queryVec.forEach((v, k) => {
          qVec.set(k, v / Math.max(...queryVec.values(), 1));
        });
        const score = cosineSimilarity(qVec, docVec);
        // 额外：tag 精确匹配加分
        const tagBonus = component.tags.filter(t =>
          query.toLowerCase().includes(t.toLowerCase())
        ).length * 0.15;
        return { component, score: score + tagBonus };
      })
      .filter(r => r.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this._cache.set(cacheKey, results);
    return results;
  }

  /**
   * 检索最匹配的布局模式
   * @param {string} query
   * @param {number} topK
   * @returns {Array} [{pattern, score}]
   */
  retrievePatterns(query, topK = 3) {
    this._ensureIndex();

    const cacheKey = `pat:${query}:${topK}`;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    const queryTokens = tokenize(query);
    const queryVec = new Map();
    queryTokens.forEach(t => queryVec.set(t, (queryVec.get(t) || 0) + 1));

    const results = LAYOUT_PATTERNS
      .map(pattern => {
        const docVec = this._patternIndex.get(pattern.id) || new Map();
        const qVec = new Map();
        queryVec.forEach((v, k) => {
          qVec.set(k, v / Math.max(...queryVec.values(), 1));
        });
        const score = cosineSimilarity(qVec, docVec);
        const tagBonus = pattern.tags.filter(t =>
          query.toLowerCase().includes(t.toLowerCase())
        ).length * 0.2;
        return { pattern, score: score + tagBonus };
      })
      .filter(r => r.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this._cache.set(cacheKey, results);
    return results;
  }

  /**
   * 综合检索 — 同时返回组件和布局建议
   * @param {string} query
   * @returns {{ components: Array, patterns: Array, context: string }}
   */
  retrieve(query, opts = {}) {
    const { topComponents = 6, topPatterns = 2 } = opts;
    const components = this.retrieveComponents(query, topComponents);
    const patterns = this.retrievePatterns(query, topPatterns);

    // 生成供 AI 使用的上下文字符串
    const context = this._buildContext(query, components, patterns);

    return { components, patterns, context };
  }

  /**
   * 构建注入 Prompt 的上下文
   */
  _buildContext(query, components, patterns) {
    const lines = [];

    if (patterns.length > 0) {
      lines.push('=== RECOMMENDED LAYOUT PATTERNS ===');
      patterns.forEach(({ pattern, score }) => {
        lines.push(`• ${pattern.name} (relevance: ${(score * 100).toFixed(0)}%)`);
        lines.push(`  ${pattern.description}`);
        lines.push(`  Suggested slide order: ${pattern.slideStructure.join(' → ')}`);
        lines.push(`  Color scheme: primary=${pattern.colorScheme.primary}, bg=${pattern.colorScheme.bg}`);
      });
      lines.push('');
    }

    if (components.length > 0) {
      lines.push('=== RECOMMENDED COMPONENTS ===');
      components.forEach(({ component, score }) => {
        lines.push(`• [${component.blockType}] ${component.name} (relevance: ${(score * 100).toFixed(0)}%)`);
        lines.push(`  ${component.description}`);
        lines.push(`  CSS hints: ${component.cssHints}`);
        lines.push(`  Default content: ${JSON.stringify(component.defaultContent)}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 清空缓存（用于测试）
   */
  clearCache() {
    this._cache.clear();
  }
}

/* ── 单例导出 ─────────────────────────────────────────── */
export const ragEngine = new RAGEngine();

/**
 * 便捷函数：检索并注入上下文到 Prompt
 * @param {string} userPrompt
 * @returns {string} 增强后的 Prompt
 */
export function augmentPromptWithRAG(userPrompt) {
  const { context } = ragEngine.retrieve(userPrompt);
  if (!context) return userPrompt;

  return `${userPrompt}

--- RETRIEVED CONTEXT (use this to improve generation) ---
${context}
--- END CONTEXT ---`;
}

/**
 * 便捷函数：获取推荐组件列表（用于 UI 展示）
 */
export function getRecommendedComponents(userPrompt, topK = 8) {
  return ragEngine.retrieveComponents(userPrompt, topK);
}

/**
 * 便捷函数：获取推荐布局模式
 */
export function getRecommendedPatterns(userPrompt) {
  return ragEngine.retrievePatterns(userPrompt, 3);
}

/**
 * 将 RAG 知识库序列化为纯文本（用于 Gemini Context Caching）
 * 返回的文本内容会作为 cachedContent 的一部分，避免每次重复上传
 * @returns {string} 知识库文本，约 3000-5000 tokens
 */
export function getRAGKnowledgeText() {
  const components = COMPONENT_LIBRARY.map(c =>
    `Component: ${c.name}\nTags: ${c.tags.join(', ')}\nDescription: ${c.description}\nBlockType: ${c.blockType}\nCSS Hints: ${c.cssHints}\nDefault: ${JSON.stringify(c.defaultContent)}`
  ).join('\n---\n');

  const patterns = LAYOUT_PATTERNS.map(p =>
    `Pattern: ${p.name}\nTags: ${p.tags.join(', ')}\nDescription: ${p.description}\nSlide Structure: ${p.slideStructure.join(' -> ')}\nColor Scheme: primary=${p.colorScheme.primary}, bg=${p.colorScheme.bg}, text=${p.colorScheme.text}`
  ).join('\n---\n');

  return `You are a professional website architect and UI designer. The user describes the website they want, and you need to break it down into multiple "slides" (page sections), each representing a distinct area of the website.\n\nAvailable block types:\n- heading: Title text (content: {text, level: "h1"|"h2"|"h3", align: "left"|"center"|"right"})\n- text: Paragraph text (content: {text, align: "left"|"center"|"right"})\n- image: Image placeholder (content: {src: "", alt, fit: "cover"|"contain"})\n- button: Button (content: {text, variant: "primary"|"secondary"|"ghost"|"danger", href: "#"})\n- card: Card (content: {title, body, hasImage: true|false})\n- list: List (content: {items: ["...","..."], style: "bullet"|"number"})\n- hero: Hero section (content: {title, sub, cta})\n- nav: Navbar (content: {logo, links: ["Home","Features"], cta})\n- badge: Badge/tag (content: {text, color: "#6366f1"})\n- divider: Divider (content: {style: "line"})\n\nImportant rules:\n1. Reasonably distribute positions: x,y,w,h are pixel values, canvas size 1000x600, avoid severe overlap\n2. Each slide has 3-8 blocks, carefully laid out, representing real website areas\n3. Generate 3-6 slides covering the complete website structure\n4. bgColor uses dark colors (e.g., #0f172a, #1e293b) or choose according to style\n5. Text content should be meaningful and match user needs\n\nReturn format (pure JSON, no markdown):\n[\n  {\n    "name": "Navbar + Hero",\n    "bgColor": "#0f172a",\n    "blocks": [\n      {"type": "nav",     "x": 0,    "y": 0,   "w": 1000, "h": 60,  "zIndex": 1, "content": {"logo": "Brand", "links": ["Home","Features","Pricing"], "cta": "Get Started"}},\n      {"type": "hero",    "x": 100,  "y": 100, "w": 800,  "h": 200, "zIndex": 1, "content": {"title": "Big Title", "sub": "Subtitle", "cta": "Try Now"}}\n    ]\n  }\n]\n\n## Component Library\n${components}\n\n## Layout Patterns\n${patterns}`;
}
