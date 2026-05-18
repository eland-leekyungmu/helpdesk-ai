"use client";

import { useState } from "react";
import { Button, Input, Card, CardContent, CardHeader, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { Save, RefreshCw, Brain, Database } from "lucide-react";

export default function SettingsPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.65");
  const [maxCategories, setMaxCategories] = useState("10");
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          confidenceThreshold: parseFloat(confidenceThreshold),
          maxCategories: parseInt(maxCategories),
        }),
      });
      if (!res.ok) throw new Error();
      showSuccess("설정이 저장되었습니다.");
    } catch {
      showError("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch("/api/admin/reindex", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error();
      showSuccess("KB 재색인이 트리거되었습니다.");
    } catch {
      showError("재색인 요청에 실패했습니다.");
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
            />
            <Input
              label="최대 카테고리 수"
              type="number"
              min="1"
              max="20"
              value={maxCategories}
              onChange={(e) => setMaxCategories(e.target.value)}
              hint="티켓 1건당 AI가 추천하는 최대 카테고리 수입니다."
            />
            <Button onClick={handleSaveConfig} loading={saving} icon={<Save size={14} />}>
              설정 저장
            </Button>
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
              피드백 데이터와 새로운 학습 데이터를 KB에 반영하려면 재색인을 실행하세요.
              재색인은 수 분이 소요될 수 있습니다.
            </p>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <p className="text-xs text-amber-700 font-medium">⚠️ 재색인 중에는 AI 답변 품질이 일시적으로 저하될 수 있습니다.</p>
            </div>
            <Button
              onClick={handleReindex}
              loading={reindexing}
              variant="secondary"
              icon={<RefreshCw size={14} />}
            >
              KB 재색인 실행
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
