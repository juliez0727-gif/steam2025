import { SteamGame, SteamReview } from '../types';

// Helper to fetch via proxy with fallback
const fetchWithProxy = async (targetUrl: string): Promise<any> => {
  const errors: string[] = [];
  const timestamp = new Date().getTime();
  // Append timestamp to prevent caching issues from proxies
  const urlWithCacheBuster = targetUrl.includes('?') 
    ? `${targetUrl}&_t=${timestamp}` 
    : `${targetUrl}?_t=${timestamp}`;

  // Strategy 1: api.allorigins.win (Most reliable for GET, handles JSON wrapping)
  try {
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(urlWithCacheBuster)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    
    if (data.status?.http_code && data.status.http_code !== 200) {
       // Ignore 404s for search pages as they might just be empty, but throw for others
       if (data.status.http_code !== 404) {
         throw new Error(`Upstream error: ${data.status.http_code}`);
       }
    }
    if (!data.contents) throw new Error('Empty response content');

    try {
        return JSON.parse(data.contents);
    } catch (e) {
        return data.contents; // Return raw string if likely HTML
    }
  } catch (error) {
     errors.push(`AllOrigins: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Strategy 2: corsproxy.io (Direct streaming, faster but sometimes blocks)
  try {
    const url = `https://corsproxy.io/?${encodeURIComponent(urlWithCacheBuster)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.json();
  } catch (error) {
    errors.push(`CorsProxy: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Strategy 3: codetabs (Last resort fallback)
  try {
     const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlWithCacheBuster)}`;
     const response = await fetch(url);
     if (!response.ok) throw new Error(`Status ${response.status}`);
     return await response.json();
  } catch (error) {
      errors.push(`CodeTabs: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.error("Proxy failures details:", errors);
  throw new Error("网络连接失败：所有代理服务均无响应，请稍后重试。");
};

// Known Chinese Publishers/Developers to help identification when names are in English
const KNOWN_CN_ENTITIES = [
  'bilibili', 'gamera', 'lightning games', 'yooreka', 'thermite', 'raytheon', 
  'chillyroom', 'coconut island', 'martian', 'giant', 'mihoyo', 'netease', 'tencent',
  'game science', 'playism', 'indieark', 'sapling', 'east2west', 'leiting', 'youth',
  'perfect world', 'wanmei', 'x.d. network', 'xd', 'hypergryph', 'manjuu', 'yongshi',
  'sunborn', 'papergames', 'kuro', 'hero entertainment', 'oasis', 'pixmain', '24 entertainment',
  'pathea', 'recreate', 'pixpil', 'leenzee', 'everstone', 'joyone', 'yixian', 'astrolabe', 
  '2p games', 'island', 'duoyi', 'seasun', 'kingsoft', 'century', 'snail', 'loong', 'zlong',
  '505 games', 'microids', 'ce-asia', 'hk', 'taiwan', 'beijing', 'shanghai', 'shenzhen',
  'tanxun', '2P', 'zk', 'zh', 'cn', 'china', 'beijing', 'chengdu', 'hangzhou', 'guangzhou'
];

// Cultural keywords in English titles that strongly suggest Chinese origin
const CULTURAL_KEYWORDS = [
  'wuxia', 'xianxia', 'jianghu', 'three kingdoms', 'dynasty', 'cultivation', 
  'myth', 'wukong', 'wuchang', 'guzheng', 'taoist', 'immortal', 'jade', 
  'shanhai', 'yanyun', 'sixteen tones', 'swordsman', 'emperor', 'shaolin',
  'records of', 'legend of', 'sword and fairy', 'gujian', 'shengshi', 'tianxia',
  'matchless', 'kung fu', 'eastern', 'oriental', 'loong', 'dragon', 'ming', 'song', 'tang', 'han'
];

// Specific App IDs or Name substrings that MUST be included (VIP List)
// "Where Winds Meet" (燕云十六声), "Shengshi Tianxia" (盛世天下), "Wuchang" (明末)
const VIP_WHITELIST = [
    'wuchang', 'fallen feathers', 
    'where winds meet', 'sixteen tones', 'yanyun',
    'shengshi', 'prosperity', 'tianxia', 'marvels'
];

/**
 * Detailed fetching of game info to verify if it is a "Domestic" (Chinese) game.
 */
const verifyDomesticGame = async (game: SteamGame): Promise<SteamGame | null> => {
  try {
    // Use appdetails to get publisher info
    const url = `https://store.steampowered.com/api/appdetails?appids=${game.appid}&l=schinese&cc=CN`;
    const response = await fetchWithProxy(url);
    
    if (!response || !response[game.appid] || !response[game.appid].success) {
      return null;
    }

    const data = response[game.appid].data;
    const developers: string[] = data.developers || [];
    const publishers: string[] = data.publishers || [];
    const supportInfo = data.support_info || {};
    const supportedLangs = data.supported_languages || ""; // HTML string
    const name = data.name || "";
    
    // Normalize strings for check
    const lowerName = name.toLowerCase();
    const lowerDevs = developers.map(d => d.toLowerCase());
    const lowerPubs = publishers.map(p => p.toLowerCase());

    let score = 0;
    
    const hasChineseChars = (str: string) => /[\u4e00-\u9fa5]/.test(str);
    const isKnownEntity = (str: string) => KNOWN_CN_ENTITIES.some(k => str.includes(k));
    const hasCulturalKeyword = (str: string) => CULTURAL_KEYWORDS.some(k => str.includes(k));
    const isVip = VIP_WHITELIST.some(k => lowerName.includes(k));

    // --- VIP PASS ---
    if (isVip) return { ...game, name: data.name, developer: developers.join(', '), publishers: publishers, score: 999 };

    // 1. Title Check
    if (hasChineseChars(name)) score += 15;
    if (hasCulturalKeyword(lowerName)) score += 25;
    
    // 2. Developer/Publisher Name Check (Strongest Indicator)
    const devHasChinese = developers.some(d => hasChineseChars(d));
    const pubHasChinese = publishers.some(p => hasChineseChars(p));
    const devIsKnown = lowerDevs.some(d => isKnownEntity(d));
    const pubIsKnown = lowerPubs.some(p => isKnownEntity(p));
    
    if (devHasChinese) score += 60; // Almost guaranteed
    if (pubHasChinese) score += 40;
    if (devIsKnown) score += 50; 
    if (pubIsKnown) score += 35;

    // 3. Support Info Check
    const email = (supportInfo.email || "").toLowerCase();
    const supportUrl = (supportInfo.url || "").toLowerCase();
    
    if (email.endsWith('.cn') || email.includes('qq.com') || email.includes('163.com') || email.includes('aliyun') || email.includes('netease')) {
      score += 50;
    }
    if (supportUrl.includes('.cn') || supportUrl.includes('weibo') || supportUrl.includes('bilibili')) {
      score += 40;
    }

    // 4. Language/Audio Check
    // Many domestic games have Simplified Chinese Audio.
    // Use regex to parse the HTML string from Steam
    const hasChineseAudio = /Simplified Chinese.*?<strong>Full Audio<\/strong>/i.test(supportedLangs) || 
                            /简体中文.*?<strong>完全音频<\/strong>/i.test(supportedLangs) ||
                            supportedLangs.includes('汉语');

    const hasEnglishAudio = /English.*?<strong>Full Audio<\/strong>/i.test(supportedLangs);
    
    if (hasChineseAudio) {
      score += 25;
      // High confidence if CN audio exists but EN audio does not (typical for domestic-focused titles)
      if (!hasEnglishAudio) score += 25; 
    }

    // 5. Negative Heuristics (Filter out localized AAA)
    const knownForeignGiants = [
        'capcom', 'ubisoft', 'electronic arts', 'sega', 'bandai namco', 'square enix', 
        'microsoft', 'sony', 'bethesda', 'firaxis', 'cd projekt', 'rockstar', 'valve', 
        'paradox', 'fromsoftware', 'larian', 'activision', 'blizzard', '2k', 'thq nordic',
        'focus entertainment', 'nintendo', 'konami', 'take-two', 'warner bros'
    ];
    
    const isDevForeignGiant = lowerDevs.some(d => knownForeignGiants.some(k => d.includes(k)));
    const isPubForeignGiant = lowerPubs.some(p => knownForeignGiants.some(k => p.includes(k)));

    // Strict penalty for foreign giants unless there is overwhelming evidence otherwise (e.g. dev is Chinese)
    if (isDevForeignGiant) {
        score -= 200;
    }
    // Publishers like 505 Games publish both foreign and Chinese games, so we check if the DEV is Chinese before penalizing publisher
    if (isPubForeignGiant && !devHasChinese && !devIsKnown && !email.includes('.cn')) {
        score -= 100;
    }
    
    // Threshold decision
    if (score >= 25) {
      return {
        ...game,
        name: data.name,
        developer: developers.join(', '),
        publishers: publishers,
        score
      };
    }
    
    return null;

  } catch (e) {
    console.warn(`Failed to verify details for ${game.appid}`, e);
    return null;
  }
}

/**
 * Fetch and parse a single search results page
 */
const fetchSearchPage = async (pageIndex: number, batchSize: number): Promise<SteamGame[]> => {
    try {
        const start = pageIndex * batchSize;
        // Added 'category1=998' (Games) to filter out DLC/Soundtracks
        const searchUrl = `https://store.steampowered.com/search/results/?query=&start=${start}&count=${batchSize}&dynamic_data=&sort_by=&filter=topsellers&supportedlang=schinese&category1=998&infinite=1&l=schinese&cc=CN`;
        
        const data = await fetchWithProxy(searchUrl);
        if (!data || !data.results_html) return [];

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.results_html, 'text/html');
        const rows = doc.querySelectorAll('a.search_result_row');
        
        const found: SteamGame[] = [];

        rows.forEach(row => {
            const appidStr = row.getAttribute('data-ds-appid');
            if (!appidStr) return;
            
            // 1. Extract Release Date
            const dateEl = row.querySelector('.search_released');
            const releaseDate = dateEl?.textContent?.trim() || "";
            
            // Robust Date Matching for 2025+
            // Matches: "15 Jan, 2025", "2025", "Q1 2025", "2025 年", "2026", etc.
            const yearMatch = releaseDate.match(/20(2[5-9]|[3-9][0-9])/); // Matches 2025-2099
            if (!yearMatch) return;

            // 2. Extract Review Count
            const reviewSummarySpan = row.querySelector('.search_review_summary');
            let tooltip = "";
            if (reviewSummarySpan) {
                tooltip = reviewSummarySpan.getAttribute('data-tooltip-html') || 
                          reviewSummarySpan.getAttribute('data-store-tooltip') || "";
            } else {
                const reviewDiv = row.querySelector('.search_reviewscore');
                tooltip = reviewDiv?.getAttribute('data-store-tooltip') || "";
            }
            
            // Fix: Some games have reviews but the summary span is hidden or formatted differently
            let reviewCount = 0;
            if (tooltip) {
                const reviewCountMatch = tooltip.match(/([0-9,]+)\s*(?:user reviews|篇用户评测)/);
                if (reviewCountMatch && reviewCountMatch[1]) {
                    reviewCount = parseInt(reviewCountMatch[1].replace(/,/g, ''));
                }
            }

            // Fallback: if scanning is too strict, we might miss recent hits.
            // But the requirement is > 1000.
            if (reviewCount <= 1000) return;

            // 3. Candidate Found
            const titleEl = row.querySelector('.title');
            const name = titleEl?.textContent?.trim() || "Unknown";
            const imgEl = row.querySelector('img');
            const imgSrc = imgEl?.getAttribute('src') || "";
            
            const appIdInt = parseInt(appidStr.split(',')[0]);

            found.push({
                appid: appIdInt, 
                name: name,
                logo: imgSrc,
                release_date: releaseDate,
                total_reviews: reviewCount,
                review_summary: tooltip.split('<br>')[0] || "Unknown"
            });
        });

        return found;
    } catch (e) {
        console.warn(`Page ${pageIndex} scan failed`, e);
        return [];
    }
}

/**
 * Scans Steam for games meeting the criteria:
 * 1. Chinese Language Support
 * 2. Released in 2025 or later
 * 3. > 1000 Reviews
 * 4. STRICTLY Domestic (Chinese) Origin
 */
export const scanForHighTrafficGames = async (onProgress?: (msg: string) => void): Promise<SteamGame[]> => {
  const candidates: SteamGame[] = [];
  const validGames: SteamGame[] = [];
  const BATCH_SIZE = 50;
  const MAX_PAGES = 40; // Top 2000 games
  const PAGE_CONCURRENCY = 3; // Reduced concurrency to prevent 429 errors from proxies
  
  try {
    // Phase 1: Parallel Scan Pages
    for (let page = 0; page < MAX_PAGES; page += PAGE_CONCURRENCY) {
      const endPage = Math.min(page + PAGE_CONCURRENCY, MAX_PAGES);
      if (onProgress) onProgress(`正在高速扫描热销榜 (${page+1} - ${endPage} / ${MAX_PAGES} 页)...`);
      
      const promises = [];
      for (let p = page; p < endPage; p++) {
          promises.push(fetchSearchPage(p, BATCH_SIZE));
      }
      
      const results = await Promise.all(promises);
      results.flat().forEach(g => {
          if (!candidates.some(c => c.appid === g.appid)) {
              candidates.push(g);
          }
      });
      
      // Small delay between batch requests
      await new Promise(r => setTimeout(r, 200));
    }

    // Phase 2: Verify Domestic Origin
    if (onProgress) onProgress(`扫描完成，正在验证 ${candidates.length} 款游戏的国产身份...`);
    
    // Process in chunks
    const CHUNK_SIZE = 8; // Reduce chunk size slightly for verification
    for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
        const chunk = candidates.slice(i, i + CHUNK_SIZE);
        const currentCount = Math.min(i + CHUNK_SIZE, candidates.length);
        if (onProgress) onProgress(`深度验证中: ${currentCount} / ${candidates.length} ...`);
        
        const results = await Promise.all(chunk.map(game => verifyDomesticGame(game)));
        
        results.forEach(res => {
            if (res) validGames.push(res);
        });
        
        // Breather
        await new Promise(r => setTimeout(r, 100));
    }

  } catch (error) {
    console.error("Error scanning games:", error);
    if (validGames.length > 0) return validGames;
    throw error;
  }

  // Sort by reviews descending for the final list
  return validGames.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
};

/**
 * Searches for games manually. 
 */
export const searchGames = async (query: string): Promise<SteamGame[]> => {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=schinese&cc=CN`;
    const data = await fetchWithProxy(url);

    if (data && data.items) {
      return data.items.map((item: any) => ({
        appid: item.id,
        name: item.name,
        logo: item.tiny_image, 
      }));
    }
    return [];
  } catch (error) {
    console.error("Error searching games:", error);
    return [];
  }
};

/**
 * Fetches reviews for a specific App ID.
 */
export const fetchReviews = async (appId: number, limit: number = 500): Promise<SteamReview[]> => {
  let reviews: SteamReview[] = [];
  let cursor = '*';
  const batchSize = 100;
  
  const maxBatches = Math.ceil(limit / batchSize); 

  try {
    for (let i = 0; i < maxBatches; i++) {
      const targetUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&cursor=${encodeURIComponent(cursor)}&language=schinese&day_range=9223372036854775807&num_per_page=${batchSize}&review_type=all&purchase_type=all`;
      
      const data = await fetchWithProxy(targetUrl);
      
      if (!data || data.success !== 1 || !data.reviews || data.reviews.length === 0) {
        break;
      }

      reviews = [...reviews, ...data.reviews];
      cursor = data.cursor;

      if (reviews.length >= limit) break;
    }
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw new Error("无法抓取评论数据，请检查网络或Steam服务状态。");
  }

  return reviews;
};

/**
 * Helper to get basic game details
 */
export const getGameDetails = async (appId: number): Promise<SteamGame | null> => {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=schinese&cc=CN`;
    const data = await fetchWithProxy(url);
    
    if (data && data[appId] && data[appId].success) {
      const details = data[appId].data;
      return {
        appid: details.steam_appid,
        name: details.name,
        logo: details.header_image,
        release_date: details.release_date?.date || "Unknown",
        developer: details.developers?.[0] || "Unknown"
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching game details:", error);
    return null;
  }
}