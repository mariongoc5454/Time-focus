import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Power,
  RefreshCw,
  ExternalLink,
  Copy,
  Info,
  AlertTriangle
} from 'lucide-react';
import { DistractionRule, MonitorStatus } from '../types';
import { api } from '../services/api';
import { normalizeDomain, validateDomain } from '../../electron/services/domainMatcher';

interface WebsiteManagerViewProps {
  onBackToHome?: () => void;
}

export const WebsiteManagerView: React.FC<WebsiteManagerViewProps> = () => {
  const [rules, setRules] = useState<DistractionRule[]>([]);
  const [monitorEnabled, setMonitorEnabled] = useState(true);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>('disconnected');
  const [secretToken, setSecretToken] = useState('focusquest_default_token');
  const [serverPort, setServerPort] = useState(48123);
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all');

  // New rule form
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newIsAllowed, setNewIsAllowed] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit rule state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingDomainText, setEditingDomainText] = useState('');
  const [editingError, setEditingError] = useState<string | null>(null);

  // Copy token feedback
  const [copiedToken, setCopiedToken] = useState(false);

  const loadData = async () => {
    try {
      const [fetchedRules, settings] = await Promise.all([
        api.getDistractionRules(),
        api.getMonitorSettings(),
      ]);
      setRules(fetchedRules);
      setMonitorEnabled(settings.enabled);
      setMonitorStatus(settings.status);
      setSecretToken(settings.secretToken);
      setServerPort(settings.serverPort);
    } catch (err) {
      console.error('Failed to load distraction rules:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll monitor status every 4 seconds to reflect extension live state
    const timer = setInterval(async () => {
      try {
        const settings = await api.getMonitorSettings();
        setMonitorStatus(settings.status);
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMasterMonitor = async () => {
    const nextState = !monitorEnabled;
    setMonitorEnabled(nextState);
    await api.setMonitorEnabled(nextState);
    await loadData();
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const validation = validateDomain(newDomainInput);
    if (!validation.valid) {
      setInputError(validation.error || 'Tên miền không hợp lệ');
      return;
    }

    const normalized = normalizeDomain(newDomainInput);
    const existing = rules.find((r) => r.domain === normalized);
    if (existing) {
      setInputError(`Website "${normalized}" đã tồn tại trong danh sách.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addDistractionRule(normalized, newIsAllowed);
      setNewDomainInput('');
      setInputError(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi thêm website.';
      setInputError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async (id: string, currentEnabled: boolean) => {
    await api.toggleDistractionRule(id, !currentEnabled);
    await loadData();
  };

  const handleDeleteRule = async (id: string, domain: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa "${domain}" khỏi danh sách?`)) {
      await api.deleteDistractionRule(id);
      await loadData();
    }
  };

  const handleStartEdit = (rule: DistractionRule) => {
    setEditingRuleId(rule.id);
    setEditingDomainText(rule.domain);
    setEditingError(null);
  };

  const handleSaveEdit = async (id: string) => {
    const validation = validateDomain(editingDomainText);
    if (!validation.valid) {
      setEditingError(validation.error || 'Tên miền không hợp lệ');
      return;
    }

    const normalized = normalizeDomain(editingDomainText);
    try {
      await api.updateDistractionRule(id, { domain: normalized });
      setEditingRuleId(null);
      setEditingError(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật tên miền';
      setEditingError(msg);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(secretToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const filteredRules = rules.filter((r) => {
    if (filter === 'blocked') return !r.is_allowed;
    if (filter === 'allowed') return r.is_allowed;
    return true;
  });

  const getStatusBadge = () => {
    if (!monitorEnabled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Giám sát: Đã tắt
        </span>
      );
    }
    switch (monitorStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Extension: Đang hoạt động
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Phiên học đang tạm dừng
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            Extension: Mất kết nối
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Top Banner & Master Toggle */}
      <div className="study-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Website Manager & Distraction Shield
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Tự động phát hiện và nhắc nhở khi truy cập website gây xao nhãng trong phiên học.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}

          <button
            onClick={handleToggleMasterMonitor}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              monitorEnabled
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {monitorEnabled ? 'Đang Bật Giám Sát' : 'Bật Giám Sát'}
          </button>
        </div>
      </div>

      {/* Extension Connection Guide Notice if Disconnected */}
      {monitorEnabled && monitorStatus === 'disconnected' && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-300 block mb-0.5">
              Chrome Extension chưa kết nối hoặc chưa nhận được tín hiệu:
            </span>
            Hãy cài đặt thư mục <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">d:\TRACKER\extension</code> vào Chrome qua{' '}
            <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">chrome://extensions</code> (Bật Developer mode &rarr; Tải tiện ích đã giải nén).
            Ứng dụng không giả vờ theo dõi nếu Extension đang ngắt kết nối.
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* Add New Website Form */}
      <div className="study-card p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-violet-400" />
          Thêm Website Vào Danh Sách
        </h3>

        <form onSubmit={handleAddRule} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Ví dụ: youtube.com, facebook.com, hoặc https://tiktok.com"
                value={newDomainInput}
                onChange={(e) => {
                  setNewDomainInput(e.target.value);
                  setInputError(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newIsAllowed ? 'allowed' : 'blocked'}
                onChange={(e) => setNewIsAllowed(e.target.value === 'allowed')}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold"
              >
                <option value="blocked" className="bg-[#121722] text-white">
                  🚫 Gây xao nhãng (Cảnh báo)
                </option>
                <option value="allowed" className="bg-[#121722] text-white">
                  🛡️ Danh sách cho phép (Whitelist)
                </option>
              </select>

              <button
                type="submit"
                disabled={isSubmitting || !newDomainInput.trim()}
                className="glass-button glass-button-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Thêm Website
              </button>
            </div>
          </div>

          {inputError && (
            <p className="text-xs font-medium text-rose-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              {inputError}
            </p>
          )}

          <p className="text-[11px] text-slate-300">
            💡 Tự động chuẩn hóa URL, loại bỏ giao thức (https://), đường dẫn và tự động áp dụng cho tên miền phụ (ví dụ: <code className="text-violet-300">m.youtube.com</code> và <code className="text-violet-300">www.youtube.com</code>).
          </p>
        </form>
      </div>

      {/* Filter Tabs & Website Table */}
      <div className="study-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 mr-1">Lọc:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#162032] text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({rules.length})
            </button>
            <button
              onClick={() => setFilter('blocked')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'blocked'
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#162032] text-slate-400 hover:text-white'
              }`}
            >
              Xao nhãng ({rules.filter((r) => !r.is_allowed).length})
            </button>
            <button
              onClick={() => setFilter('allowed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'allowed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#162032] text-slate-400 hover:text-white'
              }`}
            >
              Cho phép ({rules.filter((r) => r.is_allowed).length})
            </button>
          </div>

          <span className="text-[11px] text-slate-300">
            {filteredRules.length} website đang hiển thị
          </span>
        </div>

        {/* List of Websites */}
        {filteredRules.length === 0 ? (
          <div className="text-center py-8 text-slate-300 text-sm">
            Chưa có website nào trong danh sách này.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map((rule) => {
              const isEditing = editingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                    rule.enabled
                      ? 'bg-[#141c2c] border-[rgba(255,255,255,0.08)]'
                      : 'bg-[#0f1420] border-transparent opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-[200px] flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        rule.is_allowed
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {rule.is_allowed ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingDomainText}
                            onChange={(e) => setEditingDomainText(e.target.value)}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                          />
                          <button
                            onClick={() => handleSaveEdit(rule.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRuleId(null)}
                            className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white tracking-wide">
                            {rule.domain}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rule.is_allowed
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {rule.is_allowed ? 'Cho phép' : 'Xao nhãng'}
                          </span>
                        </div>
                      )}

                      {isEditing && editingError && (
                        <span className="text-[11px] text-rose-400 block mt-1">
                          {editingError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Enabled */}
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        rule.enabled
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rule.enabled ? 'Đang bật' : 'Đã tắt'}
                    </button>

                    {/* Edit */}
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2337]"
                        title="Sửa tên miền"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.domain)}
                      className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40"
                      title="Xóa website"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Integration Info Card */}
      <div className="study-card p-5 bg-[#0f1522] border-[rgba(255,255,255,0.08)]">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
          Thông Tin Kết Nối Chrome Extension
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-300 block mb-1">Local Server Address:</span>
            <div className="px-3 py-2 rounded-xl bg-[#141b2a] border border-[rgba(255,255,255,0.08)] font-mono text-emerald-400 font-semibold">
              http://127.0.0.1:{serverPort}
            </div>
          </div>

          <div>
            <span className="text-slate-300 block mb-1">Secret Authentication Token:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={secretToken}
                className="flex-1 px-3 py-2 rounded-xl bg-[#141b2a] border border-[rgba(255,255,255,0.08)] font-mono text-xs text-slate-300"
              />
              <button
                onClick={handleCopyToken}
                className="px-3 py-2 rounded-xl bg-[#1a2337] hover:bg-[#222e49] text-violet-300 font-bold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedToken ? 'Đã chép' : 'Chép'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 mt-3">
          🔒 <strong>Bảo mật & Quyền riêng tư:</strong> Extension chỉ gửi tên miền qua API nội bộ <code className="text-violet-300">127.0.0.1:{serverPort}</code>. Tuyệt đối không chụp ảnh màn hình, không ghi phím bấm, không đọc mật khẩu hay gửi dữ liệu ra máy chủ bên ngoài.
        </p>
      </div>
    </div>
  );
};
