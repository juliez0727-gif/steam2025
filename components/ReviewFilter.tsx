import React from 'react';
import { FilterCriteria } from '../types';
import { Clock, Calendar } from 'lucide-react';

interface Props {
  filters: FilterCriteria;
  setFilters: React.Dispatch<React.SetStateAction<FilterCriteria>>;
  totalReviews: number;
  filteredCount: number;
}

const ReviewFilter: React.FC<Props> = ({ filters, setFilters, totalReviews, filteredCount }) => {
  return (
    <div className="bg-steam-light p-6 rounded-lg border border-gray-700 shadow-xl mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-steam-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          数据筛选配置
        </h3>
        <span className="text-sm text-gray-400">
          选中 {filteredCount} / {totalReviews} 条评论
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Playtime Filter */}
        <div className="space-y-2">
          <label className="text-steam-text text-sm font-semibold flex items-center gap-2">
            <Clock size={16} />
            游戏时长 (小时)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={filters.minPlaytimeHours}
              onChange={(e) => setFilters({ ...filters, minPlaytimeHours: Number(e.target.value) })}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white w-24 focus:border-steam-accent outline-none"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              value={filters.maxPlaytimeHours}
              onChange={(e) => setFilters({ ...filters, maxPlaytimeHours: Number(e.target.value) })}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white w-24 focus:border-steam-accent outline-none"
            />
          </div>
          <p className="text-xs text-gray-500">仅分析在该时长范围内的玩家评论。</p>
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="text-steam-text text-sm font-semibold flex items-center gap-2">
            <Calendar size={16} />
            评论发布时间
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:border-steam-accent outline-none"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:border-steam-accent outline-none"
            />
          </div>
          <p className="text-xs text-gray-500">默认选中 2025 年及以后的评论。</p>
        </div>
      </div>
    </div>
  );
};

export default ReviewFilter;
