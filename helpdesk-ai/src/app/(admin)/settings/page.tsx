"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, CardHeader, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { Save, RefreshCw, Brain, Database } from "lucide-react";

interface KBEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  sourceType: string;
  createdAt: string;
  indexedAt: string | null;
}

export default function SettingsPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.5");
  const [maxCategories, setMaxCategories] = useState("10");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const { showSuccess, showError } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;

  // 미색인 KB 엔트리 조회
  const fetchKbEntries = async () => {
    setLoadingEntries(true);
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch("/api/admin/kb-entries?indexed=false", {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const json = await res.json();
      if (json.success) setKbEntries(json.data || []);
    } catch {
      // 에러 무시
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchKbEntries();
    // DB에서 현재 설정값 로드
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    fetch("/api/admin/settings", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setConfidenceThreshold(String(d.data.confidenceThreshold));
          setMaxCategories(String(d.data.maxCategories));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          confidenceThreshold: parseFloat(confidenceThreshold),
          maxCategories: parseInt(maxCategories),
        }),
      });
      if (!res.ok) throw new Error();
      showSuccess("설정이 저장되었습니다.");
      setEditing(false); // 저장 후 편집 모드 종료
    } catch {
      showError("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    if (kbEntries.length === 0) return;
    setReindexing(true);
    try {
      const res = await fetch("/api/admin/reindex", {
        method: "POST",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showSuccess(json.data?.message || "KB 재색인이 시작되었습니다.");
      // 재색인 후 목록 갱신
      await fetchKbEntries();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "재색인 요청에 실패했습니다.");
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="설정" description="시스템 설정 관리" />

      <div className="space-y-6 max-w-2xl">
        {/* AI 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Brain size={16} />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">AI 설정</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="신뢰도 임계값 (0.0 ~ 1.0)"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              hint="이 값 미만이면 1차 처리자에게 에스컬레이션됩니다. 높을수록 더 많은 건이 에스컬레이션됩니다."
              disabled={!editing}
            />
            <Input
              label="최대 카테고리 수"
              type="number"
              min="1"
              max="20"
              value={maxCategories}
              onChange={(e) => setMaxCategories(e.target.value)}
              hint="티켓 1건당 AI가 추천하는 최대 카테고리 수입니다."
              disabled={!editing}
            />
            <div className="flex items-center gap-3">
              {!editing ? (
                <Button
                  variant="secondary"
                  onClick={() => setEditing(true)}
                  icon={<Save size={14} />}
                >
                  편집
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveConfig} loading={saving} icon={<Save size={14} />}>
                    저장
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    취소
                  </Button>
                  <p className="text-xs text-gray-400">저장 후 최대 5분 내 AI에 반영됩니다.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KB 관리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                <Database size={16} />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Knowledge Base 관리</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              👍 피드백을 받은 티켓의 질문-답변이 아래 목록에 쌓입니다.
              재색인을 실행하면 Bedrock KB에 반영됩니다.
            </p>

            {/* 미색인 엔트리 목록 */}
            {loadingEntries ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : kbEntries.length === 0 ? (
              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                <p className="text-xs text-green-700 font-medium">✅ 재색인할 데이터가 없습니다. 모두 반영되었습니다.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-2">미색인 항목 {kbEntries.length}건</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-500">질문</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">카테고리</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">유형</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-500 w-24">등록일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kbEntries.map((entry, i) => (
                        <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-3 py-2 text-gray-700 truncate max-w-xs">
                            {entry.question.slice(0, 60)}{entry.question.length > 60 ? "..." : ""}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{entry.category}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              entry.sourceType === "real_data"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-purple-50 text-purple-600"
                            }`}>
                              {entry.sourceType === "real_data" ? "실데이터" : "합성"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {new Date(entry.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {kbEntries.length > 0 && (
              <>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs text-amber-700 font-medium">⚠️ 재색인 중에는 AI 답변 품질이 일시적으로 저하될 수 있습니다.</p>
                </div>
                <Button
                  onClick={handleReindex}
                  loading={reindexing}
                  variant="secondary"
                  icon={<RefreshCw size={14} />}
                >
                  KB 재색인 실행 ({kbEntries.length}건)
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
