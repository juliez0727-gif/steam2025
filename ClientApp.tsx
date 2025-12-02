'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Gamepad2, Info, RefreshCw, BarChart3, Globe2, CheckCircle2, Cpu } from 'lucide-react';
import { getGameDetails, searchGames, fetchReviews, scanForHighTrafficGames } from '@/services/steamService';
import { analyzeReviewsWithGemini } from '@/services/geminiService';
import { SteamGame, SteamReview, FilterCriteria, AnalysisReport } from '@/types';
import ReviewFilter from './ReviewFilter';
import AnalysisResult from './AnalysisResult';

// Default filters for 2025 mandate
const INITIAL_FILTERS: FilterCriteria = {
  minPlaytimeHours: 0,
  maxPlaytimeHours: 9999,
  startDate: '2025-01-01',
  endDate: new Date().toISOString().split('T')[0]
};

const ClientApp: React.FC = () => {
  const [query, setQuery] = useState('');
  // Scanning State
  const [scannedGames, setScannedGames] = useState<SteamGame[]>([]);
  
  const [searchResults, setSearchResults] = useState<SteamGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<SteamGame | null>(null);
  const [reviews, setReviews] = useState<SteamReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<SteamReview[]>([]);
  const [filters, setFilters] = useState<FilterCriteria>(INITIAL_FILTERS);
  
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SEARCHING' | 'FETCHING_REVIEWS' | 'ANALYZING' | 'DONE'>('IDLE');
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Auto-scan Handler
  const handleAutoScan = async () => {
    setStatus('SCANNING');
    setProgressMsg("正在连接 Steam 服务器...");
    setError(null);
    setSearchResults([]);
    setScannedGames([]);

    try {
        const games = await scanForHighTrafficGames((msg) => setProgressMsg(msg));
        if (games.length === 0) {
            setError("未扫描到符合条件的游戏（2025年发布，>1000评论，且经验证为国产游戏）。提示：如果当前没有2025年的热门国产游戏，请尝试手动搜索。");
        } else {
            setScannedGames(games);
        }
        setStatus('IDLE');
    } catch (e) {
        const msg = e instanceof Error ? e.message : "扫描游戏列表时发生未知错误";
        setError(`扫描失败: ${msg}`);
        setStatus('IDLE');
    }
  };

  // Search handler (Manual fallback)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setStatus('SEARCHING');
    setError(null);
    setSelectedGame(null);
    setReport(null);
    setScannedGames([]); // Clear scan results to focus on search
    
    const results = await searchGames(query);
    setSearchResults(results);
    setStatus('IDLE');
  };

  // Direct ID input handler (for advanced users knowing the ID)
  const handleDirectId = async () => {
    const appId = parseInt(query);
    if (isNaN(appId)) return;
    
    setStatus('SEARCHING');
    const details = await getGameDetails(appId);
    if (details) {
      setSearchResults([details]);
    } else {
      setError("未找到该 App ID 对应的游戏。");
    }
    setStatus('IDLE');
  }

  // Select Game & Fetch Reviews
  const handleSelectGame = async (game: SteamGame) => {
    setSelectedGame(game);
    setSearchResults([]);
    setScannedGames([]); // Clear list
    setQuery('');
    
    setStatus('FETCHING_REVIEWS');
    setError(null);

    try {
      // Fetching a large batch to filter client side
      const fetchedReviews = await fetchReviews(game.appid, 2000); 
      
      if (fetchedReviews.length === 0) {
        setError("未能抓取到任何评论，可能是网络问题或该游戏无公开评论。");
        setStatus('IDLE');
        return;
      }
      
      setReviews(fetchedReviews);
      setStatus('IDLE'); // Ready to filter
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetching failed");
      setStatus('IDLE');
    }
  };

  // Apply filters automatically when reviews or filters change
  useEffect(() => {
    if (reviews.length === 0) {
      setFilteredReviews([]);
      return;
    }

    const startTs = new Date(filters.startDate).getTime() / 1000;
    const endTs = new Date(filters.endDate).getTime() / 1000 + 86400; // End of day

    const filtered = reviews.filter(r => {
      const playtimeHours = r.author.playtime_forever / 60;
      const isPlaytimeMatch = playtimeHours >= filters.minPlaytimeHours && playtimeHours <= filters.maxPlaytimeHours;
      const isDateMatch = r.timestamp_created >= startTs && r.timestamp_created <= endTs;
      
      return isPlaytimeMatch && isDateMatch;
    });

    setFilteredReviews(filtered);
  }, [reviews, filters]);

  // Run AI Analysis
  const handleAnalyze = async () => {
    if (!selectedGame || filteredReviews.length === 0) return;
    
    setStatus('ANALYZING');
    setError(null);

    try {
      // If we have too many reviews, we take a representative sample for the AI to keep latency down
      // Prefer recent, mixed sentiment, high playtime for quality
      const sample = filteredReviews.slice(0, 300); // 300 reviews is a solid chunk for Gemini Flash
      
      const result = await analyzeReviewsWithGemini(selectedGame.name, sample);
      setReport(result);
      setStatus('DONE');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStatus('IDLE');
    }
  };

  // Reset
  const handleReset = () => {
    setSelectedGame(null);
    setReviews([]);
    setReport(null);
    setStatus('IDLE');
    setError(null);
    setScannedGames([]);
  };

  return (
    <div className="min-h-screen pb-20 font-sans text-gray-200">
      {/* Navbar */}
      <nav className="bg-[#171a21] border-b border-gray-800 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <Gamepad2 className="text-steam-accent w-8 h-8" />
            <h1 className="text-xl font-bold tracking-wide text-white">SteamInsight <span className="text-steam-accent">2025</span></h1>
          </div>
          <div className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
            <Globe2 size={14} />
            国产游戏舆情分析专用版
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Intro / Scanner Section */}
        {!selectedGame && (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
                洞察 <span className="text-transparent bg-clip-text bg-gradient-to-r from-steam-accent to-blue-400">2025 国产游戏</span> 真实口碑
                </h2>
                <p className="text-gray-400 max-w-3xl mx-auto text-lg mb-8 leading-relaxed">
                本工具自动抓取 Steam 平台 2025 年及以后发布的国产游戏数据。<br/>
                筛选条件：2025年发布 / 评论数&gt;1000 / 国产开发商或发行商。
                </p>

                {/* Main Action Button */}
                <button 
                    onClick={handleAutoScan}
                    disabled={status === 'SCANNING'}
                    className="relative group bg-steam-accent hover:bg-blue-400 text-white text-xl font-bold py-4 px-10 rounded-full shadow-[0_0_20px_rgba(102,192,244,0.3)] hover:shadow-[0_0_40px_rgba(102,192,244,0.5)] transition-all transform hover:scale-105"
                >
                    {status === 'SCANNING' ? (
                        <span className="flex items-center gap-3">
                            <Loader2 className="animate-spin w-6 h-6" /> 
                            {progressMsg || "正在扫描..."}
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" /> 
                            扫描热门国产游戏列表
                        </span>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="w-full max-w-2xl bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg mb-8 flex items-center gap-3 animate-pulse">
                    <Info className="flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Scanned Games Grid */}
            {scannedGames.length > 0 && (
                <div className="w-full max-w-6xl animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="text-steam-accent" /> 
                            发现 {scannedGames.length} 款符合条件的游戏
                        </h3>
                        <span className="text-sm text-gray-500 bg-[#1b2838] px-3 py-1 rounded border border-gray-700">
                            已按评论数量排序 (2025+)
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scannedGames.map((game) => (
                            <div 
                                key={game.appid}
                                onClick={() => handleSelectGame(game)}
                                className="group bg-[#1b2838] border border-gray-700 hover:border-steam-accent rounded-xl overflow-hidden cursor-pointer transition-all hover:translate-y-[-5px] hover:shadow-2xl flex flex-col h-full"
                            >
                                <div className="aspect-video w-full overflow-hidden relative flex-shrink-0">
                                    <img 
                                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                        alt={game.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = game.logo;
                                        }}
                                    />
                                    {/* Verification Badge */}
                                    <div className="absolute bottom-2 left-2 bg-steam-green/90 text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                         <CheckCircle2 size={12} /> 国产验证
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col flex-grow">
                                    <h4 className="text-lg font-bold text-white mb-2 group-hover:text-steam-accent truncate" title={game.name}>
                                        {game.name}
                                    </h4>
                                    
                                    <div className="space-y-2 text-sm text-gray-400 flex-grow">
                                        <div className="flex justify-between items-start">
                                            <span className="flex-shrink-0">厂商:</span>
                                            <span className="text-gray-200 text-right truncate ml-2" title={game.developer}>
                                                {game.developer}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>发布日期:</span>
                                            <span className="text-gray-200">{game.release_date}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>总评论数:</span>
                                            <span className="text-steam-green font-bold">{game.total_reviews?.toLocaleString()}+</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>总体评价:</span>
                                            <span className="text-steam-accent">{game.review_summary}</span>
                                        </div>
                                    </div>

                                    <button className="mt-4 w-full bg-[#2a475e] group-hover:bg-steam-accent group-hover:text-white py-2 rounded font-bold transition-colors">
                                        开始分析
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Search Fallback */}
            {scannedGames.length === 0 && (
                <div className="mt-16 w-full max-w-xl border-t border-gray-800 pt-8 flex flex-col items-center">
                    <p className="text-sm text-gray-500 mb-4">或者手动查找特定游戏 ID</p>
                    <form onSubmit={handleSearch} className="w-full relative flex gap-2">
                        <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="输入游戏名称或 App ID..."
                        className="flex-1 bg-[#1b2838] border border-gray-600 text-white px-4 py-2 rounded text-sm focus:border-steam-accent outline-none"
                        />
                        <button 
                        type="submit" 
                        disabled={status === 'SEARCHING'}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                        >
                        <Search size={18} />
                        </button>
                        <button 
                            type="button" 
                            onClick={handleDirectId}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors text-sm"
                        >
                            ID直达
                        </button>
                    </form>

                     {/* Manual Search Results */}
                    {searchResults.length > 0 && (
                    <div className="mt-4 w-full bg-[#1b2838] p-2 rounded border border-gray-700 max-h-60 overflow-y-auto">
                        <h3 className="text-xs font-bold text-gray-400 mb-2 px-2">搜索结果:</h3>
                        {searchResults.map((game) => (
                        <button
                            key={game.appid}
                            onClick={() => handleSelectGame(game)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-[#2a475e] rounded transition-colors text-left"
                        >
                            <img src={game.logo} alt={game.name} className="w-12 h-6 object-cover rounded" />
                            <div className="text-sm font-bold text-gray-200 truncate">{game.name}</div>
                        </button>
                        ))}
                    </div>
                    )}
                </div>
            )}
          </div>
        )}

        {/* Analysis Dashboard */}
        {selectedGame && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 bg-[#1b2838] p-6 rounded-xl border border-gray-700">
              <div className="flex items-center gap-6">
                <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${selectedGame.appid}/header.jpg`} alt={selectedGame.name} className="w-48 rounded-lg shadow-lg" />
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">{selectedGame.name}</h2>
                  <div className="flex flex-col gap-1 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">厂商:</span> 
                        <span className="text-gray-200 font-semibold">{selectedGame.developer}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                        <span>AppID: {selectedGame.appid}</span>
                        <span>•</span>
                        <span className="text-steam-green font-bold">已抓取: {reviews.length} 条评论</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleReset}
                className="text-gray-400 hover:text-white underline text-sm"
              >
                返回列表
              </button>
            </div>

            {status === 'FETCHING_REVIEWS' ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-steam-accent animate-spin mb-4" />
                <p className="text-xl text-gray-300">正在抓取 Steam 商店真实评论数据...</p>
                <p className="text-sm text-gray-500 mt-2">API 实时读取中，可能需要几秒钟</p>
              </div>
            ) : (
              <>
                 {/* Filters */}
                 <ReviewFilter 
                    filters={filters} 
                    setFilters={setFilters} 
                    totalReviews={reviews.length}
                    filteredCount={filteredReviews.length}
                 />

                 {/* Action Bar */}
                 <div className="flex justify-end mb-8">
                    <button
                      onClick={handleAnalyze}
                      disabled={filteredReviews.length === 0 || status === 'ANALYZING'}
                      className={`px-8 py-4 rounded-full font-bold text-lg shadow-xl flex items-center gap-3 transition-all ${
                        filteredReviews.length === 0 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-steam-accent to-blue-600 text-white hover:brightness-110 hover:scale-105'
                      }`}
                    >
                      {status === 'ANALYZING' ? (
                        <>
                          <Loader2 className="animate-spin" /> 正在生成分析报告...
                        </>
                      ) : (
                        <>
                           <Cpu /> 开始 AI 智能分析
                        </>
                      )}
                    </button>
                 </div>

                 {/* Error Display */}
                 {error && (
                   <div className="bg-red-900/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
                     <Info className="flex-shrink-0" />
                     {error}
                   </div>
                 )}

                 {/* Report Output */}
                 {report && (
                   <div id="report-section">
                     <AnalysisResult report={report} reviews={filteredReviews} gameName={selectedGame.name} />
                   </div>
                 )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientApp;
