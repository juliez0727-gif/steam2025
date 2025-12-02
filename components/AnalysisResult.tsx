import React from 'react';
import { AnalysisReport, SteamReview } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Cpu, Download } from 'lucide-react';

interface Props {
  report: AnalysisReport;
  reviews: SteamReview[];
  gameName: string;
}

const AnalysisResult: React.FC<Props> = ({ report, reviews, gameName }) => {
  // Process data for charts
  const positiveCount = reviews.filter(r => r.voted_up).length;
  const negativeCount = reviews.filter(r => !r.voted_up).length;
  
  const pieData = [
    { name: '好评', value: positiveCount },
    { name: '差评', value: negativeCount },
  ];

  const COLORS = ['#66c0f4', '#c24229'];

  const handleDownload = () => {
    const dateStr = new Date().toLocaleString();
    const filename = `${gameName}_舆情分析报告_${new Date().toISOString().split('T')[0]}.txt`;
    
    const content = `
==================================================
《${gameName}》Steam舆情分析报告
生成时间: ${dateStr}
==================================================

【AI 综合情感评分】: ${report.sentimentScore}/100
【购买建议/最终评价】: ${report.verdict}

--------------------------------------------------
【舆情总结】
${report.summary}

--------------------------------------------------
【核心优点 (Pros)】
${report.positivePoints.map(p => `+ ${p}`).join('\n')}

--------------------------------------------------
【主要槽点 (Cons)】
${report.negativePoints.map(p => `- ${p}`).join('\n')}

--------------------------------------------------
【技术问题/Bug反馈】
${report.technicalIssues.map(p => `! ${p}`).join('\n')}

--------------------------------------------------
数据来源: Steam 真实用户评测
分析工具: SteamInsight 2025
`.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Summary */}
      <div className="bg-gradient-to-r from-steam-light to-[#2a475e] p-8 rounded-xl shadow-2xl border border-gray-700 relative">
        <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-steam-accent" /> AI 深度分析报告
            </h2>
            <button 
                onClick={handleDownload}
                className="flex items-center gap-2 bg-steam-light hover:bg-steam-accent border border-gray-600 text-gray-200 hover:text-white px-4 py-2 rounded transition-colors text-sm font-bold shadow-lg"
                title="导出为TXT文件"
            >
                <Download size={16} />
                下载报告
            </button>
        </div>
        
        <div className="bg-black/30 p-6 rounded-lg text-lg text-gray-200 leading-relaxed border-l-4 border-steam-accent">
          {report.summary}
        </div>
        <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <span className="text-gray-400">AI 综合情感评分:</span>
                <div className="text-4xl font-black text-steam-green">{report.sentimentScore}<span className="text-xl text-gray-500">/100</span></div>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded text-white font-bold border border-white/20">
                {report.verdict}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pros */}
        <div className="bg-steam-light p-6 rounded-xl border border-green-900/50 shadow-lg">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle /> 核心优点
          </h3>
          <ul className="space-y-3">
            {report.positivePoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="bg-steam-light p-6 rounded-xl border border-red-900/50 shadow-lg">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <XCircle /> 主要槽点
          </h3>
          <ul className="space-y-3">
            {report.negativePoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Technical */}
        <div className="bg-steam-light p-6 rounded-xl border border-yellow-900/50 shadow-lg">
          <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <AlertTriangle /> 技术问题
          </h3>
          <ul className="space-y-3">
            {report.technicalIssues.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Visualization Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sentiment Chart */}
        <div className="bg-steam-light p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-4 w-full text-left">好评/差评 比例 (筛选后)</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1b2838', borderColor: '#66c0f4', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#66c0f4] rounded-full"></div>
                    <span className="text-gray-300">好评 ({positiveCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#c24229] rounded-full"></div>
                    <span className="text-gray-300">差评 ({negativeCount})</span>
                </div>
            </div>
        </div>

        {/* Example Distribution of Hours (Simplified binning) */}
        <div className="bg-steam-light p-6 rounded-xl border border-gray-700 shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4">评论者游玩时长分布 (小时)</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={[
                            { range: '0-2h', count: reviews.filter(r => r.author.playtime_forever/60 < 2).length },
                            { range: '2-10h', count: reviews.filter(r => r.author.playtime_forever/60 >= 2 && r.author.playtime_forever/60 < 10).length },
                            { range: '10-50h', count: reviews.filter(r => r.author.playtime_forever/60 >= 10 && r.author.playtime_forever/60 < 50).length },
                            { range: '50h+', count: reviews.filter(r => r.author.playtime_forever/60 >= 50).length },
                        ]}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" />
                        <XAxis dataKey="range" stroke="#8b9bb4" />
                        <YAxis stroke="#8b9bb4" />
                        <RechartsTooltip cursor={{fill: '#2a475e'}} contentStyle={{ backgroundColor: '#171a21', borderColor: '#66c0f4', color: '#fff' }} />
                        <Bar dataKey="count" fill="#66c0f4" />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;