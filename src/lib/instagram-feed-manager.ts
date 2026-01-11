export interface GridPost {
  element: HTMLElement
  imageUrl: string
  postId: string
}

export type GridPostCallback = (posts: GridPost[]) => void

const GRID_CONTAINER_SELECTORS = [
  "article",
  "[role='tabpanel']",
  "main [style*='flex-direction: column']"
]

const IMAGE_SELECTORS = [
  "img[srcset]",
  "img[src*='instagram']",
  "img:not([alt=''])"
]

export class InstagramFeedManager {
  private observer: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private posts: Map<string, GridPost> = new Map()
  private callbacks: Set<GridPostCallback> = new Set()
  private isProfilePage = false

  constructor() {
    console.log("📷 [FeedManager] Constructor called")
    this.checkIfProfilePage()
  }

  private checkIfProfilePage(): boolean {
    const path = window.location.pathname
    console.log("📷 [FeedManager] Checking if profile page, path:", path)

    // Match profile pages: /username, /username/, /username/reels, etc.
    // Also match feed page: /
    // Exclude specific non-profile paths
    const isProfileOrFeed = (
      path === "/" || // Home feed
      /^\/[a-zA-Z0-9._]+\/?/.test(path) // Profile-like paths
    ) &&
    !path.includes("/p/") &&      // Not a single post
    !path.includes("/reel/") &&   // Not a single reel view
    !path.includes("/stories/") && // Not stories
    !path.includes("/explore/") && // Not explore
    !path.includes("/direct/") &&  // Not DMs
    !path.includes("/accounts/")   // Not settings

    console.log("📷 [FeedManager] isProfileOrFeed:", isProfileOrFeed)
    this.isProfilePage = isProfileOrFeed
    return this.isProfilePage
  }

  private generatePostId(element: HTMLElement, imageUrl: string): string {
    const href = element.querySelector("a")?.getAttribute("href") || ""
    const shortcode = href.match(/\/p\/([^\/]+)/)?.[1]
    if (shortcode) return shortcode

    const urlHash = imageUrl.split("/").pop()?.split("?")[0] || ""
    return `post-${urlHash}-${Date.now()}`
  }

  private findGridPosts(): GridPost[] {
    const posts: GridPost[] = []

    // Multiple selectors to catch both feed posts and profile grid posts
    const selectors = [
      // Feed posts (inside articles)
      'article a[href*="/p/"]',
      'article a[href*="/reel/"]',
      // Profile grid posts (direct links in grid)
      'main a[href*="/p/"]',
      'main a[href*="/reel/"]',
      // Profile grid with different structure
      'section main a[href*="/p/"]',
      // Grid items that contain images
      'a[href*="/p/"] img',
      'a[href*="/reel/"] img',
    ]

    console.log("📷 [FeedManager] findGridPosts called")

    const seenLinks = new Set<string>()
    let totalFound = 0

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      if (elements.length > 0) {
        console.log(`📷 [FeedManager] Selector "${selector}" found ${elements.length} elements`)
        totalFound += elements.length
      }
      elements.forEach((element) => {
        // Find the link element (either the element itself or parent)
        let link: HTMLAnchorElement | null = null
        if (element.tagName === 'A') {
          link = element as HTMLAnchorElement
        } else if (element.tagName === 'IMG') {
          link = element.closest('a[href*="/p/"], a[href*="/reel/"]') as HTMLAnchorElement
        }

        if (!link) return

        // Skip if we've already processed this link
        const href = link.getAttribute('href') || ''
        if (seenLinks.has(href)) return
        seenLinks.add(href)

        // Find the container div that holds the image
        // For profile grids, the link itself often contains the image
        let container = link.closest('div') as HTMLElement
        if (!container) {
          container = link as HTMLElement
        }

        // Try to find image in link first, then in container
        let img = link.querySelector('img') as HTMLImageElement
        if (!img) {
          img = container.querySelector('img') as HTMLImageElement
        }
        if (!img || !img.src) return

        // Skip tiny images (likely icons or avatars)
        const imgRect = img.getBoundingClientRect()
        if (imgRect.width < 100 || imgRect.height < 100) return

        const postId = this.generatePostId(container, img.src)

        if (!this.posts.has(postId)) {
          // Use the link's parent as container if it has appropriate size
          let postContainer = link.parentElement as HTMLElement
          if (!postContainer || postContainer.getBoundingClientRect().width < 100) {
            postContainer = container
          }

          const post: GridPost = {
            element: postContainer,
            imageUrl: img.src,
            postId
          }
          posts.push(post)
          this.posts.set(postId, post)
          console.log(`📷 [FeedManager] Found post: ${postId}`)
        }
      })
    })

    if (totalFound === 0) {
      console.log("📷 [FeedManager] No elements matched any selector! Checking DOM...")
      console.log("📷 [FeedManager] Has articles:", document.querySelectorAll('article').length)
      console.log("📷 [FeedManager] Has main:", document.querySelectorAll('main').length)
      console.log("📷 [FeedManager] Has any images:", document.querySelectorAll('img').length)
      console.log("📷 [FeedManager] Has links with /p/:", document.querySelectorAll('a[href*="/p/"]').length)
    }

    console.log(`📷 [FeedManager] findGridPosts returning ${posts.length} NEW posts (${this.posts.size} total tracked)`)
    return posts
  }

  private handleMutations = (mutations: MutationRecord[]) => {
    let hasNewNodes = false

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        hasNewNodes = true
        break
      }
    }

    if (hasNewNodes) {
      const newPosts = this.findGridPosts()
      if (newPosts.length > 0) {
        this.notifyCallbacks(newPosts)
      }
    }
  }

  private notifyCallbacks(posts: GridPost[]) {
    this.callbacks.forEach((callback) => callback(posts))
  }

  public start() {
    if (this.observer) return

    console.log("[IG-FeedManager] Starting...")
    console.log("[IG-FeedManager] Is profile page:", this.isOnProfilePage())

    const initialPosts = this.findGridPosts()
    console.log("[IG-FeedManager] Initial posts found:", initialPosts.length)

    if (initialPosts.length > 0) {
      this.notifyCallbacks(initialPosts)
    }

    this.observer = new MutationObserver(this.handleMutations)
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    window.addEventListener("scroll", this.handleScroll, { passive: true })
  }

  private handleScroll = () => {
    requestAnimationFrame(() => {
      const newPosts = this.findGridPosts()
      if (newPosts.length > 0) {
        this.notifyCallbacks(newPosts)
      }
    })
  }

  public stop() {
    this.observer?.disconnect()
    this.observer = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    window.removeEventListener("scroll", this.handleScroll)
  }

  public subscribe(callback: GridPostCallback): () => void {
    this.callbacks.add(callback)

    const existingPosts = Array.from(this.posts.values())
    if (existingPosts.length > 0) {
      callback(existingPosts)
    }

    return () => {
      this.callbacks.delete(callback)
    }
  }

  public getPost(postId: string): GridPost | undefined {
    return this.posts.get(postId)
  }

  public getAllPosts(): GridPost[] {
    return Array.from(this.posts.values())
  }

  public isOnProfilePage(): boolean {
    return this.checkIfProfilePage()
  }
}

let managerInstance: InstagramFeedManager | null = null

export function getInstagramFeedManager(): InstagramFeedManager {
  if (!managerInstance) {
    managerInstance = new InstagramFeedManager()
  }
  return managerInstance
}
